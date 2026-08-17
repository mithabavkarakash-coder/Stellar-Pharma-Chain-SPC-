#!/usr/bin/env bash

# ==============================================================================
# Stellar Pharma Chain (SPC) Automated Smart Contract Deployment Script
# ==============================================================================
# Prerequisites:
# 1. Rust and wasm32-unknown-unknown target installed:
#    rustup target add wasm32-unknown-unknown
# 2. Stellar CLI installed:
#    cargo install --locked stellar-cli --features opt
# 3. Environment variable ADMIN_SECRET set with a funded Stellar Testnet secret key.
# ==============================================================================

set -e

echo "🚀 Starting Stellar Pharma Chain Smart Contract Build & Deployment..."

NETWORK=${STELLAR_NETWORK:-testnet}
RPC_URL=${SOROBAN_RPC_URL:-"https://soroban-testnet.stellar.org"}
NETWORK_PASSPHRASE=${NETWORK_PASSPHRASE:-"Test SDF Network ; September 2015"}

echo "📦 1. Compiling Soroban WASM Binaries..."
cargo build --target wasm32-unknown-unknown --release --package batch-registry --package custody-chain

BATCH_REGISTRY_WASM="target/wasm32-unknown-unknown/release/batch_registry.wasm"
CUSTODY_CHAIN_WASM="target/wasm32-unknown-unknown/release/custody_chain.wasm"

if [ ! -f "$BATCH_REGISTRY_WASM" ] || [ ! -f "$CUSTODY_CHAIN_WASM" ]; then
    echo "❌ WASM compilation failed. Output files not found."
    exit 1
fi

echo "✅ WASM compilation completed successfully."

echo "🔑 2. Initializing deployment account..."
if [ -z "$ADMIN_SECRET" ]; then
    echo "⚠️ ADMIN_SECRET environment variable not set. Generating a temporary testnet identity..."
    stellar keys generate deployer-admin --network "$NETWORK" || true
    ADMIN_ADDRESS=$(stellar keys address deployer-admin)
    echo "Generated Admin Address: $ADMIN_ADDRESS"
    stellar keys fund deployer-admin --network "$NETWORK" || true
    SOURCE_KEY="deployer-admin"
else
    SOURCE_KEY="$ADMIN_SECRET"
    ADMIN_ADDRESS=$(stellar keys address "$SOURCE_KEY" 2>/dev/null || echo "$ADMIN_SECRET")
fi

echo "🚀 3. Deploying Batch Registry Contract..."
BATCH_REGISTRY_ID=$(stellar contract deploy \
    --wasm "$BATCH_REGISTRY_WASM" \
    --source "$SOURCE_KEY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$NETWORK_PASSPHRASE")

echo "✅ Batch Registry Deployed ID: $BATCH_REGISTRY_ID"

echo "🚀 4. Deploying Custody Chain Contract..."
CUSTODY_CHAIN_ID=$(stellar contract deploy \
    --wasm "$CUSTODY_CHAIN_WASM" \
    --source "$SOURCE_KEY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$NETWORK_PASSPHRASE")

echo "✅ Custody Chain Deployed ID: $CUSTODY_CHAIN_ID"

echo "⚙️ 5. Initializing Batch Registry Contract..."
stellar contract invoke \
    --id "$BATCH_REGISTRY_ID" \
    --source "$SOURCE_KEY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$NETWORK_PASSPHRASE" \
    -- initialize \
    --admin "$ADMIN_ADDRESS"

echo "⚙️ 6. Initializing Custody Chain Contract..."
stellar contract invoke \
    --id "$CUSTODY_CHAIN_ID" \
    --source "$SOURCE_KEY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$NETWORK_PASSPHRASE" \
    -- initialize \
    --registry "$BATCH_REGISTRY_ID"

echo "📝 7. Saving Contract Addresses to Environment Files..."

cat <<EOF > frontend/.env.local
NEXT_PUBLIC_SOROBAN_RPC_URL="$RPC_URL"
NEXT_PUBLIC_HORIZON_URL="https://horizon-testnet.stellar.org"
NEXT_PUBLIC_NETWORK_PASSPHRASE="$NETWORK_PASSPHRASE"
NEXT_PUBLIC_BATCH_REGISTRY_CONTRACT_ID="$BATCH_REGISTRY_ID"
NEXT_PUBLIC_CUSTODY_CHAIN_CONTRACT_ID="$CUSTODY_CHAIN_ID"
NEXT_PUBLIC_BACKEND_API_URL="http://localhost:8080"
NEXT_PUBLIC_BACKEND_WS_URL="ws://localhost:8080/ws"
EOF

cat <<EOF > backend/.env
BATCH_REGISTRY_CONTRACT_ID="$BATCH_REGISTRY_ID"
CUSTODY_CHAIN_CONTRACT_ID="$CUSTODY_CHAIN_ID"
SOROBAN_RPC_URL="$RPC_URL"
NETWORK_PASSPHRASE="$NETWORK_PASSPHRASE"
DATABASE_URL="sqlite://pharma_indexer.db"
EOF

echo "🎉 Deployment complete!"
echo "Batch Registry Contract ID: $BATCH_REGISTRY_ID"
echo "Custody Chain Contract ID: $CUSTODY_CHAIN_ID"
