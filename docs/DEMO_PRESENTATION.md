# 🎤 Stellar Pharma Chain (SPC) — Live Demo & Hackathon Presentation Guide

Welcome to the **Stellar Pharma Chain (SPC)** presentation guide. This document contains a step-by-step demonstration walkthrough, key value propositions, slide-deck script, role personas, test vectors, and live verification commands.

---

## 🌟 Executive Summary & Pitch (1-Minute Elevator Pitch)

> *"Counterfeit pharmaceutical products and cold-chain breakdowns kill hundreds of thousands of patients annually while costing global healthcare over $200 Billion. Current tracking systems rely on siloed, centralized databases vulnerable to fraud and data manipulation.*
> 
> **Stellar Pharma Chain (SPC)** solves this by enforcing an immutable, trustless custody chain on the **Stellar / Soroban blockchain**. With smart-contract level role verification, automated cold-chain telemetry excursions, instant circuit-breaker recalls, and high-performance WebSocket event indexers, SPC ensures that every pill from factory to pharmacy is authentic and safe."*

---

## 🎭 Live Interactive Demo Script (Role Walkthrough)

### 1. Control Center & Real-Time Sync (Dashboard View)
* **Goal**: Show live blockchain sync, connected network nodes, and active WebSocket event stream.
* **Action**: Open `http://localhost:3000` or `https://stellar-pharma-chain-spc-rhfo.vercel.app/`.
* **Key Point**: Highlight the **WebSocket status indicator** (`Live Connected`) streaming live ledger activity without refreshing.

### 2. Persona 1: Drug Manufacturer Portal (`/manufacturer`)
* **Goal**: Register an authentic drug batch on Soroban smart contract.
* **Action**: 
  1. Select **Manufacturer Role** in the top navigation bar.
  2. Input Batch ID: `BATCH_COVID_2026`, Drug Name: `mRNA Vaccine v2`, Quantity: `5000`, Expiry Date: `2027-12-31`.
  3. Toggle `Direct Ship` option to OFF (requiring distributor handover).
  4. Click **Mint Batch on Soroban**.
* **On-Chain Effect**: Invokes `batch-registry::register_batch`, which cross-contract calls `custody-chain::initialize_custody`. Generates a cryptographic QR code.

### 3. Persona 2: Logistics & Cold-Chain Transit (`/distributor`)
* **Goal**: Accept custody and log IoT cold-chain temperature telemetry.
* **Action**:
  1. Switch role to **Distributor**.
  2. Perform custody transfer of `2500` units of `BATCH_COVID_2026` from Manufacturer to Distributor.
  3. Simulate IoT sensor log: Temperature `4.5°C`, Humidity `48%` (Normal).
  4. Simulate Cold Excursion log: Temperature `14.2°C` (Excursion!).
* **On-Chain Effect**: Contract emits an `excursion_alert` event. The live WebSocket immediately broadcasts an alert notification to all connected clients!

### 4. Persona 3: Point-of-Care Pharmacist (`/pharmacy`)
* **Goal**: Confirm origin, inspect cold-chain history, and dispense to patients.
* **Action**:
  1. Switch role to **Pharmacy**.
  2. Receive custody handover of `1000` units from Distributor.
  3. Click **Dispense Units to Patient** (`50` units).
* **On-Chain Effect**: Decrements pharmacy balance on-chain and updates dispensed ledger records.

### 5. Persona 4: Public QR Authentication Scanner (`/scan`)
* **Goal**: Instant verification by retail inspectors or end-point patients.
* **Action**:
  1. Open `/scan` on a mobile device or desktop browser.
  2. Scan or enter Batch ID `BATCH_COVID_2026`.
  3. View total lifecycle trace, cold-chain graph, temperature alerts, and recall status.

---

## 🧪 Verification & Test Commands

To run the complete automated test suite locally:

```bash
# 1. Test Smart Contracts (Rust / Soroban)
cargo test --package pharma-types --package batch-registry --package custody-chain

# 2. Test Backend Indexer & REST API
cargo test --package pharma-backend

# 3. Test Frontend Next.js Components & Utilities
cd frontend && npm test
```

---

## 🏗️ Architecture Stack Overview

* **Smart Contracts**: Rust & Soroban SDK (`no_std`), inter-contract calls, 2-step admin transfer, emergency pause circuit breaker.
* **Backend Indexer**: Rust Axum, Tokio async execution, SQLx SQLite caching, broadcast WebSocket engine.
* **Frontend Portal**: Next.js 15 App Router, TypeScript, Vanilla CSS design tokens, Lucide icons, `@stellar/freighter-api`.
* **CI/CD & Containers**: GitHub Actions workflow (`ci-cd.yml`), multi-stage Dockerfiles, `docker-compose.yml`.
