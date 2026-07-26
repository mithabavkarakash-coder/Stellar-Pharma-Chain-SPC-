use std::time::Duration;
use reqwest::Client;
use serde_json::json;
use stellar_xdr::curr::{ScVal, ScAddress, AccountId, PublicKey, Uint256};
use stellar_strkey::{Strkey, PublicKeyEd25519, Contract};
use tokio::sync::broadcast;
use sqlx::sqlite::SqlitePool;

use crate::db::{self, BatchModel};

pub struct Indexer {
    pool: SqlitePool,
    rpc_url: String,
    batch_registry_id: String,
    custody_chain_id: String,
    ws_tx: broadcast::Sender<String>,
    client: Client,
}

impl Indexer {
    pub fn new(
        pool: SqlitePool,
        rpc_url: String,
        batch_registry_id: String,
        custody_chain_id: String,
        ws_tx: broadcast::Sender<String>,
    ) -> Self {
        Self {
            pool,
            rpc_url,
            batch_registry_id,
            custody_chain_id,
            ws_tx,
            client: Client::new(),
        }
    }

    pub async fn run(self) -> anyhow::Result<()> {
        println!("Starting event indexer...");
        
        let mut last_ledger = match db::get_last_ledger(&self.pool).await {
            Ok(ledger) => ledger,
            Err(e) => {
                eprintln!("Failed to get last ledger from DB: {}", e);
                0
            }
        };

        if last_ledger == 0 {
            // Fetch the latest ledger sequence from RPC as starting point if DB is empty
            if let Ok(latest) = self.get_latest_ledger_from_rpc().await {
                // Start indexing from 1000 ledgers back to ensure we don't miss recent events
                last_ledger = latest.saturating_sub(1000);
                println!("No indexer state found in DB. Starting from ledger: {}", last_ledger);
                let _ = db::set_last_ledger(&self.pool, last_ledger).await;
            } else {
                last_ledger = 1; // Fallback
                println!("Failed to query latest ledger from RPC. Starting from ledger: 1");
            }
        } else {
            println!("Resuming indexing from ledger: {}", last_ledger);
        }

        loop {
            tokio::time::sleep(Duration::from_secs(3)).await;

            let latest_ledger = match self.get_latest_ledger_from_rpc().await {
                Ok(l) => l,
                Err(e) => {
                    eprintln!("Error getting latest ledger: {}", e);
                    continue;
                }
            };

            if last_ledger >= latest_ledger {
                continue; // Up to date
            }

            let end_ledger = (last_ledger + 100).min(latest_ledger);
            // println!("Scanning ledgers: {} - {}", last_ledger, end_ledger);

            match self.fetch_and_process_events(last_ledger, end_ledger).await {
                Ok(count) => {
                    if count > 0 {
                        println!("Processed {} pharma events up to ledger {}", count, end_ledger);
                    }
                    last_ledger = end_ledger;
                    let _ = db::set_last_ledger(&self.pool, last_ledger).await;
                }
                Err(e) => {
                    eprintln!("Error indexing events from ledger {} to {}: {}", last_ledger, end_ledger, e);
                }
            }
        }
    }

    async fn get_latest_ledger_from_rpc(&self) -> anyhow::Result<u32> {
        let req_body = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getLatestLedger",
            "params": {}
        });

        let res = self.client.post(&self.rpc_url)
            .json(&req_body)
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        if let Some(err) = res.get("error") {
            anyhow::bail!("RPC error: {}", err);
        }

        let sequence = res.get("result")
            .and_then(|r| r.get("sequence"))
            .and_then(|s| s.as_u64())
            .ok_or_else(|| anyhow::anyhow!("Invalid sequence response"))? as u32;

        Ok(sequence)
    }

    async fn fetch_and_process_events(&self, start_ledger: u32, end_ledger: u32) -> anyhow::Result<usize> {
        let req_body = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getEvents",
            "params": {
                "startLedger": start_ledger,
                "endLedger": end_ledger,
                "filters": [
                    {
                        "contractIds": [self.batch_registry_id, self.custody_chain_id],
                        "topics": [["*"]]
                    }
                ],
                "pagination": {
                    "limit": 100
                }
            }
        });

        let res = self.client.post(&self.rpc_url)
            .json(&req_body)
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        if let Some(err) = res.get("error") {
            anyhow::bail!("RPC error in getEvents: {}", err);
        }

        let events_val = res.get("result")
            .and_then(|r| r.get("events"))
            .and_then(|e| e.as_array())
            .ok_or_else(|| anyhow::anyhow!("Invalid events response structure"))?;

        let mut processed_count = 0;

        for event_val in events_val {
            let in_successful_ledger = event_val.get("inSuccessfulLedger")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            if !in_successful_ledger {
                continue; // Ignore failed transaction events
            }

            let tx_hash = event_val.get("txHash")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let ledger_close_at = event_val.get("ledgerClosedAt")
                .and_then(|v| v.as_str())
                .unwrap_or("");

            // Parse timestamp from string or fallback
            let timestamp = if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(ledger_close_at) {
                dt.timestamp()
            } else {
                chrono::Utc::now().timestamp()
            };

            let topic_array = event_val.get("topic")
                .and_then(|v| v.as_array())
                .ok_or_else(|| anyhow::anyhow!("Missing topics in event"))?;

            let value_base64 = event_val.get("value")
                .and_then(|v| v.get("xdr"))
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("Missing value in event"))?;

            let value_val = match ScVal::from_xdr_base64(value_base64) {
                Ok(v) => v,
                Err(e) => {
                    eprintln!("Failed to parse value XDR base64: {}", e);
                    continue;
                }
            };

            let mut topics = Vec::new();
            for t_val in topic_array {
                if let Some(t_str) = t_val.as_str() {
                    if let Ok(parsed_topic) = ScVal::from_xdr_base64(t_str) {
                        topics.push(parsed_topic);
                    }
                }
            }

            if topics.is_empty() {
                continue;
            }

            // Topic 0 is event name, Topic 1 is batch_id
            let event_name = match scval_to_string(&topics[0]) {
                Some(name) => name,
                None => continue,
            };

            let batch_id = match topics.get(1).and_then(scval_to_string) {
                Some(id) => id,
                None => continue,
            };

            // Process based on event name
            match event_name.as_str() {
                "batch_registered" => {
                    if let ScVal::Vec(Some(sc_vec)) = value_val {
                        if sc_vec.0.len() >= 6 {
                            let drug_name = scval_to_string(&sc_vec.0[0]).unwrap_or_default();
                            let manufacturer = scval_to_string(&sc_vec.0[1]).unwrap_or_default();
                            let quantity = scval_to_i64(&sc_vec.0[2]).unwrap_or(0);
                            let manufacture_date = scval_to_i64(&sc_vec.0[3]).unwrap_or(0);
                            let expiry_date = scval_to_i64(&sc_vec.0[4]).unwrap_or(0);
                            let direct_ship = scval_to_bool(&sc_vec.0[5]).unwrap_or(false);

                            let batch = BatchModel {
                                batch_id: batch_id.clone(),
                                drug_name,
                                manufacturer,
                                quantity,
                                manufacture_date,
                                expiry_date,
                                direct_ship,
                                is_recalled: false,
                                recalled_by: None,
                                created_at: timestamp,
                            };

                            if let Err(e) = db::save_batch(&self.pool, &batch).await {
                                eprintln!("Error saving batch to DB: {}", e);
                            } else {
                                processed_count += 1;
                                let msg = json!({
                                    "type": "BATCH_REGISTERED",
                                    "data": batch
                                });
                                let _ = self.ws_tx.send(msg.to_string());
                            }
                        }
                    }
                }
                "batch_recalled" => {
                    if let ScVal::Vec(Some(sc_vec)) = value_val {
                        if let Some(recalled_by) = sc_vec.0.get(0).and_then(scval_to_string) {
                            if let Err(e) = db::recall_batch(&self.pool, &batch_id, &recalled_by).await {
                                eprintln!("Error marking batch as recalled in DB: {}", e);
                            } else {
                                processed_count += 1;
                                
                                // Fetch all participants of this batch (manufacturer + all transfer addresses)
                                let mut participants = Vec::new();
                                if let Ok(batch_info) = db::get_batch(&self.pool, &batch_id).await {
                                    if let Some(b) = batch_info {
                                        participants.push(b.manufacturer);
                                    }
                                }
                                if let Ok(handoffs) = db::get_handoffs(&self.pool, &batch_id).await {
                                    for h in handoffs {
                                        if !participants.contains(&h.from_address) {
                                            participants.push(h.from_address);
                                        }
                                        if !participants.contains(&h.to_address) {
                                            participants.push(h.to_address);
                                        }
                                    }
                                }

                                let msg = json!({
                                    "type": "BATCH_RECALLED",
                                    "data": {
                                        "batch_id": batch_id,
                                        "recalled_by": recalled_by,
                                        "participants": participants
                                    }
                                });
                                let _ = self.ws_tx.send(msg.to_string());
                            }
                        }
                    }
                }
                "custody_handoff" => {
                    if let ScVal::Vec(Some(sc_vec)) = value_val {
                        if sc_vec.0.len() >= 4 {
                            let from = scval_to_string(&sc_vec.0[0]).unwrap_or_default();
                            let to = scval_to_string(&sc_vec.0[1]).unwrap_or_default();
                            let quantity = scval_to_i64(&sc_vec.0[2]).unwrap_or(0);
                            let role_num = scval_to_i64(&sc_vec.0[3]).unwrap_or(0);
                            
                            let role_str = match role_num {
                                1 => "Manufacturer",
                                2 => "Distributor",
                                3 => "Pharmacy",
                                _ => "Unknown",
                            };

                            if let Err(e) = db::save_handoff(&self.pool, &batch_id, &from, &to, quantity, role_str, &tx_hash, timestamp).await {
                                eprintln!("Error saving handoff to DB: {}", e);
                            } else {
                                processed_count += 1;
                                let msg = json!({
                                    "type": "CUSTODY_HANDOFF",
                                    "data": {
                                        "batch_id": batch_id,
                                        "from_address": from,
                                        "to_address": to,
                                        "quantity": quantity,
                                        "new_role": role_str,
                                        "transaction_hash": tx_hash,
                                        "timestamp": timestamp
                                    }
                                });
                                let _ = self.ws_tx.send(msg.to_string());
                            }
                        }
                    }
                }
                "units_dispensed" => {
                    if let ScVal::Vec(Some(sc_vec)) = value_val {
                        if sc_vec.0.len() >= 3 {
                            let pharmacy = scval_to_string(&sc_vec.0[0]).unwrap_or_default();
                            let quantity = scval_to_i64(&sc_vec.0[1]).unwrap_or(0);
                            let remaining = scval_to_i64(&sc_vec.0[2]).unwrap_or(0);

                            if let Err(e) = db::save_dispense(&self.pool, &batch_id, &pharmacy, quantity, remaining, &tx_hash, timestamp).await {
                                eprintln!("Error saving dispense to DB: {}", e);
                            } else {
                                processed_count += 1;
                                let msg = json!({
                                    "type": "UNITS_DISPENSED",
                                    "data": {
                                        "batch_id": batch_id,
                                        "pharmacy": pharmacy,
                                        "quantity": quantity,
                                        "remaining_quantity": remaining,
                                        "transaction_hash": tx_hash,
                                        "timestamp": timestamp
                                    }
                                });
                                let _ = self.ws_tx.send(msg.to_string());
                            }
                        }
                    }
                }
                _ => {}
            }
        }

        Ok(processed_count)
    }
}

// Extraction Helpers
fn scval_to_string(val: &ScVal) -> Option<String> {
    match val {
        ScVal::Symbol(s) => Some(s.to_string()),
        ScVal::String(s) => Some(s.to_string()),
        ScVal::Address(addr) => {
            match addr {
                ScAddress::Account(account_id) => {
                    let AccountId::PublicKeyTypeEd25519(Uint256(bytes)) = account_id;
                    let pubkey = Strkey::PublicKeyEd25519(PublicKeyEd25519(*bytes));
                    Some(pubkey.to_string())
                }
                ScAddress::Contract(hash) => {
                    let contract = Strkey::Contract(Contract(hash.0));
                    Some(contract.to_string())
                }
            }
        }
        _ => None
    }
}

fn scval_to_i64(val: &ScVal) -> Option<i64> {
    match val {
        ScVal::U32(n) => Some(*n as i64),
        ScVal::I32(n) => Some(*n as i64),
        ScVal::U64(n) => Some(*n as i64),
        ScVal::I64(n) => Some(*n),
        _ => None
    }
}

fn scval_to_bool(val: &ScVal) -> Option<bool> {
    match val {
        ScVal::Bool(b) => Some(*b),
        _ => None
    }
}
