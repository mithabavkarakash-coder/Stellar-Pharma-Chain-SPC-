import { rpc, TransactionBuilder, Networks, Keypair, Operation, Address, BASE_FEE, Contract, nativeToScVal } from '@stellar/stellar-sdk';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";

const server = new rpc.Server(RPC_URL);

async function pollTx(hash) {
  let status = "PENDING";
  let response;
  for (let i = 0; i < 30; i++) {
    response = await server.getTransaction(hash);
    status = response.status;
    if (status === "SUCCESS" || status === "FAILED") {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (status !== "SUCCESS") {
    console.error("\n[TX FAILED DETAILS]:", JSON.stringify(response, null, 2));
    throw new Error(`Transaction ${hash} failed with status: ${status}`);
  }
  return response;
}

async function uploadWasm(wasmPath, keypair) {
  console.log(`Reading WASM: ${wasmPath}`);
  const wasmBytes = fs.readFileSync(wasmPath);
  const publicKey = keypair.publicKey();
  
  const account = await server.getAccount(publicKey);
  const uploadOp = Operation.uploadContractWasm({ wasm: wasmBytes });
  
  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(uploadOp)
    .setTimeout(30)
    .build();

  console.log("Simulating upload transaction...");
  tx = await server.prepareTransaction(tx);
  tx.sign(keypair);
  
  console.log("Submitting upload transaction...");
  const response = await server.sendTransaction(tx);
  console.log(`Transaction submitted. Hash: ${response.hash}. Waiting for confirmation...`);
  
  const result = await pollTx(response.hash);
  if (result.status !== "SUCCESS") {
    throw new Error(`Upload failed: ${result.errorResultXdr || "unknown error"}`);
  }
  
  const wasmHash = result.returnValue.bytes().toString("hex");
  console.log(`WASM uploaded successfully! Hash: ${wasmHash}`);
  return wasmHash;
}

async function deployInstance(wasmHash, keypair) {
  const publicKey = keypair.publicKey();
  const account = await server.getAccount(publicKey);
  
  // We generate a random salt to get a unique contract ID
  const salt = crypto.randomBytes(32);
  
  const createOp = Operation.createCustomContract({
    address: Address.fromString(publicKey),
    wasmHash: Buffer.from(wasmHash, "hex"),
    salt: salt,
  });
  
  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(createOp)
    .setTimeout(30)
    .build();

  console.log("Simulating contract creation...");
  tx = await server.prepareTransaction(tx);
  tx.sign(keypair);
  
  console.log("Submitting contract creation...");
  const response = await server.sendTransaction(tx);
  console.log(`Transaction submitted. Hash: ${response.hash}. Waiting for confirmation...`);
  
  const result = await pollTx(response.hash);
  if (result.status !== "SUCCESS") {
    throw new Error(`Contract instantiation failed: ${result.errorResultXdr || "unknown error"}`);
  }
  
  const contractId = Address.fromScVal(result.returnValue).toString();
  console.log(`Contract deployed successfully! Address: ${contractId}`);
  return contractId;
}

async function main() {
  try {
    let keypair;
    if (process.env.DEPLOYER_SECRET_KEY) {
      keypair = Keypair.fromSecret(process.env.DEPLOYER_SECRET_KEY);
      console.log(`Using deployer account: ${keypair.publicKey()}`);
    } else {
      keypair = Keypair.random();
      console.log(`Generated deployer account: ${keypair.publicKey()}`);
      console.log("Funding deployer account via Friendbot...");
      const res = await fetch(`https://friendbot.stellar.org/?addr=${keypair.publicKey()}`);
      if (!res.ok) {
        throw new Error("Friendbot funding failed");
      }
      console.log("Deployer account successfully funded!");
    }

    const registryWasmPath = path.resolve("./target/wasm32v1-none/release/batch_registry.wasm");
    const custodyWasmPath = path.resolve("./target/wasm32v1-none/release/custody_chain.wasm");

    console.log("\n--- Deploying Batch Registry Contract ---");
    const registryWasmHash = await uploadWasm(registryWasmPath, keypair);
    const registryContractId = await deployInstance(registryWasmHash, keypair);

    console.log("\n--- Deploying Custody Chain Contract ---");
    const custodyWasmHash = await uploadWasm(custodyWasmPath, keypair);
    const custodyContractId = await deployInstance(custodyWasmHash, keypair);

    console.log("\n--- Linking and Initializing Contracts ---");
    // 1. Initialize Batch Registry with Admin (deployer)
    const registryAccount = await server.getAccount(keypair.publicKey());
    const registryContract = new Contract(registryContractId);
    let initRegistryTx = new TransactionBuilder(registryAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(registryContract.call("initialize", nativeToScVal(Address.fromString(keypair.publicKey()))))
      .setTimeout(30)
      .build();

    console.log("Simulating registry initialization...");
    initRegistryTx = await server.prepareTransaction(initRegistryTx);
    initRegistryTx.sign(keypair);
    const registryInitRes = await server.sendTransaction(initRegistryTx);
    await pollTx(registryInitRes.hash);
    console.log("Batch Registry initialized.");

    // 2. Initialize Custody Chain with Registry Address
    const custodyAccount = await server.getAccount(keypair.publicKey());
    const custodyContract = new Contract(custodyContractId);
    let initCustodyTx = new TransactionBuilder(custodyAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(custodyContract.call("initialize", nativeToScVal(Address.fromString(registryContractId))))
      .setTimeout(30)
      .build();

    console.log("Simulating custody initialization...");
    initCustodyTx = await server.prepareTransaction(initCustodyTx);
    initCustodyTx.sign(keypair);
    const custodyInitRes = await server.sendTransaction(initCustodyTx);
    await pollTx(custodyInitRes.hash);
    console.log("Custody Chain initialized.");

    // Output .env files
    const envContent = `
# Deployed Contract Addresses
BATCH_REGISTRY_CONTRACT_ID=${registryContractId}
CUSTODY_CHAIN_CONTRACT_ID=${custodyContractId}
DEPLOYER_SECRET_KEY=${keypair.secret()}
SOROBAN_RPC_URL=${RPC_URL}
NETWORK_PASSPHRASE="${NETWORK_PASSPHRASE}"
`;

    console.log("\n--- Writing Env Configs ---");
    // Write to root, backend and frontend
    fs.writeFileSync("./.env", envContent.trim());
    fs.writeFileSync("./backend/.env", envContent.trim());
    
    const frontendEnvContent = `
NEXT_PUBLIC_SOROBAN_RPC_URL=${RPC_URL}
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE="${NETWORK_PASSPHRASE}"
NEXT_PUBLIC_BATCH_REGISTRY_CONTRACT_ID=${registryContractId}
NEXT_PUBLIC_CUSTODY_CHAIN_CONTRACT_ID=${custodyContractId}
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8080
NEXT_PUBLIC_BACKEND_WS_URL=ws://localhost:8080/ws
`;
    fs.writeFileSync("./frontend/.env.local", frontendEnvContent.trim());
    console.log("Environment configuration files generated successfully!");

  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

main();
