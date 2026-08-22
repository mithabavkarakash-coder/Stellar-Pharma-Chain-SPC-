use sqlx::{sqlite::SqlitePool, Row};
use serde::{Serialize, Deserialize};

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct BatchModel {
    pub batch_id: String,
    pub drug_name: String,
    pub manufacturer: String,
    pub quantity: i64,
    pub manufacture_date: i64,
    pub expiry_date: i64,
    pub direct_ship: bool,
    pub is_recalled: bool,
    pub recalled_by: Option<String>,
    pub created_at: i64,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct HandoffModel {
    pub id: i64,
    pub batch_id: String,
    pub from_address: String,
    pub to_address: String,
    pub quantity: i64,
    pub new_role: String,
    pub transaction_hash: String,
    pub timestamp: i64,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct DispenseModel {
    pub id: i64,
    pub batch_id: String,
    pub pharmacy: String,
    pub quantity: i64,
    pub remaining_quantity: i64,
    pub transaction_hash: String,
    pub timestamp: i64,
}

pub async fn init_db(pool: &SqlitePool) -> anyhow::Result<()> {
    // Enable WAL mode for high concurrency
    sqlx::query("PRAGMA journal_mode = WAL;").execute(pool).await?;

    // Create batches table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS batches (
            batch_id TEXT PRIMARY KEY,
            drug_name TEXT NOT NULL,
            manufacturer TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            manufacture_date INTEGER NOT NULL,
            expiry_date INTEGER NOT NULL,
            direct_ship INTEGER NOT NULL,
            is_recalled INTEGER NOT NULL DEFAULT 0,
            recalled_by TEXT,
            created_at INTEGER NOT NULL
        );"
    )
    .execute(pool)
    .await?;

    // Create custody handoffs table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS custody_handoffs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id TEXT NOT NULL,
            from_address TEXT NOT NULL,
            to_address TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            new_role TEXT NOT NULL,
            transaction_hash TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        );"
    )
    .execute(pool)
    .await?;

    // Create dispense events table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS dispense_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id TEXT NOT NULL,
            pharmacy TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            remaining_quantity INTEGER NOT NULL,
            transaction_hash TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        );"
    )
    .execute(pool)
    .await?;

    // Create indexer state table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS indexer_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );"
    )
    .execute(pool)
    .await?;

    // Create database performance indices
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_handoffs_batch ON custody_handoffs(batch_id, timestamp);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_dispenses_batch ON dispense_events(batch_id, timestamp);")
        .execute(pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_batches_mfg ON batches(manufacturer);")
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn save_batch(pool: &SqlitePool, batch: &BatchModel) -> anyhow::Result<()> {
    sqlx::query(
        "INSERT OR REPLACE INTO batches (
            batch_id, drug_name, manufacturer, quantity, manufacture_date, expiry_date, direct_ship, is_recalled, recalled_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);"
    )
    .bind(&batch.batch_id)
    .bind(&batch.drug_name)
    .bind(&batch.manufacturer)
    .bind(batch.quantity)
    .bind(batch.manufacture_date)
    .bind(batch.expiry_date)
    .bind(if batch.direct_ship { 1 } else { 0 })
    .bind(if batch.is_recalled { 1 } else { 0 })
    .bind(&batch.recalled_by)
    .bind(batch.created_at)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn recall_batch(pool: &SqlitePool, batch_id: &str, recalled_by: &str) -> anyhow::Result<()> {
    sqlx::query(
        "UPDATE batches SET is_recalled = 1, recalled_by = ? WHERE batch_id = ?;"
    )
    .bind(recalled_by)
    .bind(batch_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn save_handoff(
    pool: &SqlitePool,
    batch_id: &str,
    from: &str,
    to: &str,
    quantity: i64,
    new_role: &str,
    tx_hash: &str,
    timestamp: i64,
) -> anyhow::Result<()> {
    sqlx::query(
        "INSERT INTO custody_handoffs (
            batch_id, from_address, to_address, quantity, new_role, transaction_hash, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?);"
    )
    .bind(batch_id)
    .bind(from)
    .bind(to)
    .bind(quantity)
    .bind(new_role)
    .bind(tx_hash)
    .bind(timestamp)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn save_dispense(
    pool: &SqlitePool,
    batch_id: &str,
    pharmacy: &str,
    quantity: i64,
    remaining: i64,
    tx_hash: &str,
    timestamp: i64,
) -> anyhow::Result<()> {
    sqlx::query(
        "INSERT INTO dispense_events (
            batch_id, pharmacy, quantity, remaining_quantity, transaction_hash, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?);"
    )
    .bind(batch_id)
    .bind(pharmacy)
    .bind(quantity)
    .bind(remaining)
    .bind(tx_hash)
    .bind(timestamp)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_batches(pool: &SqlitePool) -> anyhow::Result<Vec<BatchModel>> {
    let rows = sqlx::query("SELECT * FROM batches ORDER BY created_at DESC;")
        .fetch_all(pool)
        .await?;

    let mut list = Vec::new();
    for row in rows {
        list.push(BatchModel {
            batch_id: row.get("batch_id"),
            drug_name: row.get("drug_name"),
            manufacturer: row.get("manufacturer"),
            quantity: row.get("quantity"),
            manufacture_date: row.get("manufacture_date"),
            expiry_date: row.get("expiry_date"),
            direct_ship: row.get::<i32, _>("direct_ship") != 0,
            is_recalled: row.get::<i32, _>("is_recalled") != 0,
            recalled_by: row.get("recalled_by"),
            created_at: row.get("created_at"),
        });
    }
    Ok(list)
}

pub async fn get_batch(pool: &SqlitePool, batch_id: &str) -> anyhow::Result<Option<BatchModel>> {
    let row_opt = sqlx::query("SELECT * FROM batches WHERE batch_id = ?;")
        .bind(batch_id)
        .fetch_optional(pool)
        .await?;

    if let Some(row) = row_opt {
        Ok(Some(BatchModel {
            batch_id: row.get("batch_id"),
            drug_name: row.get("drug_name"),
            manufacturer: row.get("manufacturer"),
            quantity: row.get("quantity"),
            manufacture_date: row.get("manufacture_date"),
            expiry_date: row.get("expiry_date"),
            direct_ship: row.get::<i32, _>("direct_ship") != 0,
            is_recalled: row.get::<i32, _>("is_recalled") != 0,
            recalled_by: row.get("recalled_by"),
            created_at: row.get("created_at"),
        }))
    } else {
        Ok(None)
    }
}

pub async fn get_handoffs(pool: &SqlitePool, batch_id: &str) -> anyhow::Result<Vec<HandoffModel>> {
    let rows = sqlx::query("SELECT * FROM custody_handoffs WHERE batch_id = ? ORDER BY timestamp ASC;")
        .bind(batch_id)
        .fetch_all(pool)
        .await?;

    let mut list = Vec::new();
    for row in rows {
        list.push(HandoffModel {
            id: row.get("id"),
            batch_id: row.get("batch_id"),
            from_address: row.get("from_address"),
            to_address: row.get("to_address"),
            quantity: row.get("quantity"),
            new_role: row.get("new_role"),
            transaction_hash: row.get("transaction_hash"),
            timestamp: row.get("timestamp"),
        });
    }
    Ok(list)
}

pub async fn get_dispenses(pool: &SqlitePool, batch_id: &str) -> anyhow::Result<Vec<DispenseModel>> {
    let rows = sqlx::query("SELECT * FROM dispense_events WHERE batch_id = ? ORDER BY timestamp ASC;")
        .bind(batch_id)
        .fetch_all(pool)
        .await?;

    let mut list = Vec::new();
    for row in rows {
        list.push(DispenseModel {
            id: row.get("id"),
            batch_id: row.get("batch_id"),
            pharmacy: row.get("pharmacy"),
            quantity: row.get("quantity"),
            remaining_quantity: row.get("remaining_quantity"),
            transaction_hash: row.get("transaction_hash"),
            timestamp: row.get("timestamp"),
        });
    }
    Ok(list)
}

pub async fn get_last_ledger(pool: &SqlitePool) -> anyhow::Result<u32> {
    let row_opt = sqlx::query("SELECT value FROM indexer_state WHERE key = 'last_ledger';")
        .fetch_optional(pool)
        .await?;

    if let Some(row) = row_opt {
        let val: String = row.get("value");
        Ok(val.parse::<u32>().unwrap_or(0))
    } else {
        Ok(0)
    }
}

pub async fn set_last_ledger(pool: &SqlitePool, ledger: u32) -> anyhow::Result<()> {
    sqlx::query(
        "INSERT OR REPLACE INTO indexer_state (key, value) VALUES ('last_ledger', ?);"
    )
    .bind(ledger.to_string())
    .execute(pool)
    .await?;
    Ok(())
}
