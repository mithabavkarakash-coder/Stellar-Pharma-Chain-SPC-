use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::broadcast;
use sqlx::sqlite::SqlitePoolOptions;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod db;
mod indexer;
mod api;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 1. Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // 2. Load environment variables
    let _ = dotenvy::dotenv();

    let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://pharma.db".to_string());
    let rpc_url = std::env::var("SOROBAN_RPC_URL").unwrap_or_else(|_| "https://soroban-testnet.stellar.org".to_string());
    
    // Contract addresses from deployment state
    let batch_registry_id = std::env::var("BATCH_REGISTRY_CONTRACT_ID").unwrap_or_default();
    let custody_chain_id = std::env::var("CUSTODY_CHAIN_CONTRACT_ID").unwrap_or_default();

    println!("=======================================================");
    println!("             Pharma Supply Chain Backend               ");
    println!("=======================================================");
    println!("Database URL:        {}", db_url);
    println!("Soroban RPC URL:     {}", rpc_url);
    println!("Batch Registry ID:   {}", batch_registry_id);
    println!("Custody Chain ID:    {}", custody_chain_id);
    println!("=======================================================");

    if batch_registry_id.is_empty() || custody_chain_id.is_empty() {
        println!("WARNING: Smart contract IDs are missing! Indexer will idle.");
        println!("Ensure you run the deployment script (cargo run -p deploy-cli) first.");
    }

    // 3. Connect to Database (auto-creates SQLite file if not exists)
    // SQLx SQLite connection string requires 'sqlite:' prefix and will create file automatically
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    // 4. Run migrations/initializations
    db::init_db(&pool).await?;
    println!("Database tables initialized successfully.");

    // 5. Setup WebSocket broadcast channel
    let (ws_tx, _) = broadcast::channel(100);

    // 6. Spawn indexing worker if contract IDs are present
    if !batch_registry_id.is_empty() && !custody_chain_id.is_empty() {
        let indexer = indexer::Indexer::new(
            pool.clone(),
            rpc_url,
            batch_registry_id,
            custody_chain_id,
            ws_tx.clone(),
        );
        tokio::spawn(async move {
            if let Err(e) = indexer.run().await {
                eprintln!("Fatal error in indexer background task: {}", e);
            }
        });
    }

    // 7. Setup Axum app and state
    let rate_limiter = api::RateLimiter::new(10, std::time::Duration::from_secs(60));
    let state = Arc::new(api::AppState {
        pool,
        ws_tx,
        rate_limiter,
    });

    let app = api::create_router(state);
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string()).parse::<u16>().unwrap_or(8080);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    println!("Backend API listening on http://localhost:{}", port);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_database_initialization_and_operations() {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .expect("Failed to create in-memory SQLite pool");

        db::init_db(&pool).await.expect("Failed to init DB");

        let batch = db::BatchModel {
            batch_id: "BATCH-TEST-001".to_string(),
            drug_name: "Amoxicillin".to_string(),
            manufacturer: "G0000000000000000000000000000000000000000000000000000001".to_string(),
            quantity: 500,
            manufacture_date: 1700000000,
            expiry_date: 1800000000,
            direct_ship: false,
            is_recalled: false,
            recalled_by: None,
            created_at: 1700000050,
        };

        db::save_batch(&pool, &batch).await.expect("Failed to save batch");

        let fetched = db::get_batch(&pool, "BATCH-TEST-001")
            .await
            .expect("Failed to get batch");
        assert!(fetched.is_some());
        assert_eq!(fetched.unwrap().drug_name, "Amoxicillin");

        let batches = db::get_batches(&pool).await.expect("Failed to get batches");
        assert_eq!(batches.len(), 1);

        db::recall_batch(&pool, "BATCH-TEST-001", "FDA_OFFICIAL")
            .await
            .expect("Failed to recall batch");
        let recalled = db::get_batch(&pool, "BATCH-TEST-001")
            .await
            .unwrap()
            .unwrap();
        assert!(recalled.is_recalled);
        assert_eq!(recalled.recalled_by, Some("FDA_OFFICIAL".to_string()));
    }
}
