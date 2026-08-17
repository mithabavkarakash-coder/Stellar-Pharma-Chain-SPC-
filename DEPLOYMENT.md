# 🚀 Stellar Pharma Chain (SPC) Deployment Guide

This guide explains how to deploy the Stellar Pharma Chain application to production. Since the project contains both a frontend (Next.js) and a backend (Rust indexer + API), they must be deployed to appropriate hosting providers.

---

## 💻 Frontend Deployment (Vercel)

Vercel is the recommended platform for hosting Next.js 15 applications. Follow these steps to deploy the frontend:

### 1. Import Project to Vercel
1. Go to the [Vercel Dashboard](https://vercel.com) and click **Add New** ➡️ **Project**.
2. Connect your GitHub account and select your `Stellar-Pharma-Chain-SPC-` repository.

### 2. Configure Monorepo Settings
Because the Next.js application resides in the `frontend` subdirectory:
- **Framework Preset**: Select `Next.js`.
- **Root Directory**: Set this to `frontend`.
- **Build Command**: `next build` (Default).
- **Output Directory**: `.next` (Default).
- **Install Command**: `npm install` (Default).

### 3. Add Environment Variables
Vercel requires the environment variables defined in [frontend/.env.example](file:///frontend/.env.example). Under **Environment Variables**, add the following keys:

| Key | Value / Purpose |
| :--- | :--- |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | Stellar Soroban RPC node URL (e.g., `https://soroban-testnet.stellar.org`) |
| `NEXT_PUBLIC_HORIZON_URL` | Stellar Horizon URL (e.g., `https://horizon-testnet.stellar.org`) |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | Stellar network passphrase (e.g., `"Test SDF Network ; September 2015"`) |
| `NEXT_PUBLIC_BATCH_REGISTRY_CONTRACT_ID` | Deployed `batch-registry` contract ID |
| `NEXT_PUBLIC_CUSTODY_CHAIN_CONTRACT_ID` | Deployed `custody-chain` contract ID |
| `NEXT_PUBLIC_BACKEND_API_URL` | Your production Rust backend URL (e.g., `https://your-backend.fly.dev`) |
| `NEXT_PUBLIC_BACKEND_WS_URL` | Your production WebSocket URL (e.g., `wss://your-backend.fly.dev/ws`) |

Click **Deploy**! Vercel will automatically build the site and deploy it.

---

## ⚙️ Backend & Indexer Deployment (Fly.io / Render / AWS)

The Rust backend runs an Axum web server and a background indexer daemon that writes to a local SQLite database. Because of the long-lived WebSockets and the background task, standard serverless hosts like Vercel cannot run the Rust backend. Instead, deploy to a container or VPS provider like **Fly.io**, **Render**, or **Railway**.

### Setup Requirements
1. **Persistent Volume**: Since SQLite is used, ensure your hosting provider mounts a persistent volume at the path of your database file (or change it to PostgreSQL if you prefer a managed database).
2. **Environment Variables**: Make sure the backend has access to the environment variables listed in [.env.example](file:///.env.example):
   - `BATCH_REGISTRY_CONTRACT_ID`
   - `CUSTODY_CHAIN_CONTRACT_ID`
   - `SOROBAN_RPC_URL`
   - `NETWORK_PASSPHRASE`
   - `DATABASE_URL` (if overriding local SQLite filepath)

### Docker Deployment Example
You can deploy using the following standard Rust multi-stage `Dockerfile` (create one in the `backend` folder if needed):

```dockerfile
FROM rust:1.80-slim AS builder
WORKDIR /app
COPY . .
RUN cargo build --release --package pharma-backend

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/pharma-backend /usr/local/bin/pharma-backend
EXPOSE 8080
CMD ["pharma-backend"]
```
