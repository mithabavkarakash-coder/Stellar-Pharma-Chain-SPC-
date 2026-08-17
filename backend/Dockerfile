# ==============================================================================
# Stellar Pharma Chain - Rust Backend Dockerfile
# ==============================================================================
FROM rust:1.80-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy cargo manifest and workspace files
COPY Cargo.toml Cargo.lock ./
COPY contracts/pharma-types ./contracts/pharma-types
COPY contracts/batch-registry ./contracts/batch-registry
COPY contracts/custody-chain ./contracts/custody-chain
COPY backend ./backend
COPY infra/deploy-cli ./infra/deploy-cli

# Build release binary for backend
RUN cargo build --release --package pharma-backend

# Runtime image
FROM debian:bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates sqlite3 libssl3 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/pharma-backend /usr/local/bin/pharma-backend

EXPOSE 8080

ENV RUST_LOG=info
ENV PORT=8080

CMD ["pharma-backend"]
