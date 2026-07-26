use axum::{
    extract::{Path, State, WebSocketUpgrade, ws::{WebSocket, Message}, ConnectInfo},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde_json::json;
use std::{sync::Arc, collections::HashMap, time::{Instant, Duration}, net::SocketAddr};
use tokio::sync::{broadcast, Mutex};
use sqlx::sqlite::SqlitePool;
use tower_http::cors::CorsLayer;

use crate::db;

pub struct AppState {
    pub pool: SqlitePool,
    pub ws_tx: broadcast::Sender<String>,
    pub rate_limiter: RateLimiter,
}

pub struct RateLimiter {
    ips: Mutex<HashMap<String, (u32, Instant)>>,
    limit: u32,
    window: Duration,
}

impl RateLimiter {
    pub fn new(limit: u32, window: Duration) -> Self {
        Self {
            ips: Mutex::new(HashMap::new()),
            limit,
            window,
        }
    }

    pub async fn check(&self, ip: String) -> bool {
        let mut ips = self.ips.lock().await;
        let now = Instant::now();

        let entry = ips.entry(ip).or_insert((0, now));
        if now.duration_since(entry.1) > self.window {
            entry.0 = 1;
            entry.1 = now;
            true
        } else if entry.0 >= self.limit {
            false
        } else {
            entry.0 += 1;
            true
        }
    }
}

pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/api/batches", get(list_batches))
        .route("/api/batches/:id", get(get_batch_details))
        .route("/api/batches/:id/verify", get(verify_batch))
        .route("/ws", get(ws_handler))
        .layer(CorsLayer::permissive())
        .with_state(state)
}

// Handler to list all batches
async fn list_batches(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match db::get_batches(&state.pool).await {
        Ok(list) => (hyper::StatusCode::OK, Json(list)).into_response(),
        Err(e) => (
            hyper::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ).into_response(),
    }
}

// Handler to get batch details, handoffs and dispense history
async fn get_batch_details(
    State(state): State<Arc<AppState>>,
    Path(batch_id): Path<String>,
) -> impl IntoResponse {
    match db::get_batch(&state.pool, &batch_id).await {
        Ok(Some(batch)) => {
            let handoffs = db::get_handoffs(&state.pool, &batch_id).await.unwrap_or_default();
            let dispenses = db::get_dispenses(&state.pool, &batch_id).await.unwrap_or_default();
            (
                hyper::StatusCode::OK,
                Json(json!({
                    "batch": batch,
                    "handoffs": handoffs,
                    "dispenses": dispenses
                })),
            ).into_response()
        }
        Ok(None) => (
            hyper::StatusCode::NOT_FOUND,
            Json(json!({ "error": "Batch not found" })),
        ).into_response(),
        Err(e) => (
            hyper::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ).into_response(),
    }
}

// Handler to verify a batch (Public QR Verification) with rate limiting
async fn verify_batch(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Path(batch_id): Path<String>,
) -> impl IntoResponse {
    // 1. Check rate limit (max 10 lookups per 60 seconds per IP)
    let ip = addr.ip().to_string();
    if !state.rate_limiter.check(ip).await {
        return (
            hyper::StatusCode::TOO_MANY_REQUESTS,
            Json(json!({ "error": "Too many requests. Please try again later." })),
        ).into_response();
    }

    // 2. Fetch batch
    match db::get_batch(&state.pool, &batch_id).await {
        Ok(Some(batch)) => {
            let handoffs = db::get_handoffs(&state.pool, &batch_id).await.unwrap_or_default();
            let dispenses = db::get_dispenses(&state.pool, &batch_id).await.unwrap_or_default();
            
            let now = chrono::Utc::now().timestamp();
            let is_expired = now > batch.expiry_date;
            
            // Build custody progression timeline and detect anomalies
            let mut anomalies = Vec::new();
            
            // Check expiry
            if is_expired {
                anomalies.push("Batch has expired".to_string());
            }
            
            // Check recall
            if batch.is_recalled {
                anomalies.push(format!("Batch recalled by {}", batch.recalled_by.clone().unwrap_or_default()));
            }

            // Verify custody chain transitions
            let mut current_custodian = batch.manufacturer.clone();
            let mut current_role = "Manufacturer";
            
            for handoff in &handoffs {
                // Verify handoff starts from current custodian
                if handoff.from_address != current_custodian {
                    anomalies.push(format!(
                        "Custody gap detected: handoff from {} does not match previous custodian {}",
                        handoff.from_address, current_custodian
                    ));
                }
                
                // Enforce transition rules
                if current_role == "Manufacturer" {
                    if handoff.new_role == "Pharmacy" && !batch.direct_ship {
                        anomalies.push("Invalid skip: Batch direct-shipped to Pharmacy without a Distributor".to_string());
                    }
                } else if current_role == "Pharmacy" {
                    anomalies.push(format!("Invalid transfer: Pharmacy {} transferred to {}", current_custodian, handoff.to_address));
                }
                
                current_custodian = handoff.to_address.clone();
                current_role = &handoff.new_role;
            }

            // Verify dispenses occurred from pharmacies
            for dispense in &dispenses {
                // Was this dispensed from a verified pharmacy custodian?
                let dispensed_from_holder = handoffs.iter().any(|h| h.to_address == dispense.pharmacy && h.new_role == "Pharmacy");
                if !dispensed_from_holder && dispense.pharmacy != batch.manufacturer {
                    anomalies.push(format!(
                        "Dispense anomaly: units dispensed from {} which never held Pharmacy custody",
                        dispense.pharmacy
                    ));
                }
            }

            (
                hyper::StatusCode::OK,
                Json(json!({
                    "is_genuine": true,
                    "is_recalled": batch.is_recalled,
                    "is_expired": is_expired,
                    "batch": batch,
                    "handoffs": handoffs,
                    "dispenses": dispenses,
                    "anomalies": anomalies,
                    "status": if !anomalies.is_empty() { "WARNING" } else { "AUTHENTIC" }
                })),
            ).into_response()
        }
        Ok(None) => (
            hyper::StatusCode::OK, // Return 200 with is_genuine: false to avoid showing server errors
            Json(json!({
                "is_genuine": false,
                "is_recalled": false,
                "is_expired": false,
                "anomalies": vec!["Batch is NOT registered on-chain (possible counterfeit)"],
                "status": "COUNTERFEIT"
            })),
        ).into_response(),
        Err(e) => (
            hyper::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ).into_response(),
    }
}

// WebSocket handler for real-time indexing alerts and recall messages
async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    let mut ws_rx = state.ws_tx.subscribe();
    println!("New client connected to WebSocket.");

    // Send historical connection confirm
    let confirm = json!({ "status": "CONNECTED", "msg": "Real-time updates active." });
    if socket.send(Message::Text(confirm.to_string())).await.is_err() {
        return;
    }

    loop {
        tokio::select! {
            // Receive messages broadcasted from our Indexer
            Ok(msg) = ws_rx.recv() => {
                if socket.send(Message::Text(msg)).await.is_err() {
                    break; // Connection closed
                }
            }
            // Optional: read keepalives or close messages from the client
            client_msg = socket.recv() => {
                match client_msg {
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
        }
    }
    println!("Client disconnected from WebSocket.");
}
