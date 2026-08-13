# 💻 Stellar Pharma Chain - Frontend Portal

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://stellar-pharma-chain-spc-rhfo.vercel.app/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

This is the Next.js 15 frontend application for **Stellar Pharma Chain (SPC)**. It provides a real-time web portal that integrates with Stellar Freighter wallet extensions, testnet Soroban smart contracts, and the custom Rust indexer backend.

> [!TIP]
> **🚀 Live Web Application**: Access the deployed platform at **[stellar-pharma-chain-spc-rhfo.vercel.app](https://stellar-pharma-chain-spc-rhfo.vercel.app/)**

---

## 🎨 Interface Showcase
For a complete gallery of user interface views, screenshots, and architecture diagrams, please refer to the main project [README.md](../README.md).

---

## 🛠️ Architecture & Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Stellar Wallet Integration**: `@stellar/freighter-api` & `@stellar/stellar-sdk` with React Context (`WalletContext.tsx`)
- **QR Code Scanning & Generation**: `html5-qrcode` & HTML canvas QR utilities
- **Styling**: Modern dark-mode glassmorphic design system built with custom CSS tokens (`globals.css`)
- **Iconography**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18.0 or higher
- Running Rust Backend API (`http://localhost:8080`) or configured remote API endpoint

### Installation & Execution

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env.local` and set required RPC / API endpoints:
   ```bash
   cp .env.example .env.local
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Access Portal**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables Reference

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | Soroban testnet RPC endpoint | `https://soroban-testnet.stellar.org` |
| `NEXT_PUBLIC_HORIZON_URL` | Stellar Horizon testnet endpoint | `https://horizon-testnet.stellar.org` |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | Stellar Network Passphrase | `Test SDF Network ; September 2015` |
| `NEXT_PUBLIC_BATCH_REGISTRY_CONTRACT_ID` | Soroban Batch Registry contract ID | Deployed ID |
| `NEXT_PUBLIC_CUSTODY_CHAIN_CONTRACT_ID` | Soroban Custody Chain contract ID | Deployed ID |
| `NEXT_PUBLIC_BACKEND_API_URL` | Rust Axum HTTP API base URL | `http://localhost:8080` |
| `NEXT_PUBLIC_BACKEND_WS_URL` | Rust Axum WebSocket URL | `ws://localhost:8080/ws` |

---

## 🌐 Production Deployment

The frontend is configured for instant deployment on **Vercel**. Set `frontend` as the root directory and ensure all environment variables are populated in the Vercel project dashboard.
