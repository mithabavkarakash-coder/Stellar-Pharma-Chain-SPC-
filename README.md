# 💻 Stellar Pharma Chain - Frontend Portal

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://stellar-pharma-chain-spc-rhfo.vercel.app/)

This is the Next.js frontend application for **Stellar Pharma Chain**. It communicates with Freighter wallets, local/testnet Stellar RPC endpoints, and the custom Rust indexer backend.

> [!TIP]
> **🚀 Live Web Application**: Access the deployed platform at **[stellar-pharma-chain-spc-rhfo.vercel.app](https://stellar-pharma-chain-spc-rhfo.vercel.app/)**

---

## 🎨 Interface Showcase
For a full list of user interface screens and system showcases, please see the main project [README.md](../README.md).

---

## 🚀 Getting Started

### Prerequisites
Ensure the **backend API** is running at `http://localhost:8080` and the smart contracts have been compiled and deployed.

### Setup and Start
1. Install node dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the control center.

---

## 🛠️ Tech Stack & Structure
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, TypeScript)
- **State & Actions**: React Context (`context/WalletContext.tsx`) for Stellar Freighter wallet connection.
- **Styling**: Vanilla CSS for maximum flexibility and clean theme styling (`globals.css`).
- **Icons**: [Lucide React](https://lucide.dev/) for clean medical & logistical imagery.
