import { 
    Horizon, 
    TransactionBuilder, 
    Networks, 
    nativeToScVal, 
    scValToNative,
    rpc,
    Contract,
    Account,
    Keypair
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

export const getRegistryContractId = () => {
    return process.env.NEXT_PUBLIC_BATCH_REGISTRY_CONTRACT_ID || "CDFARKBKLJYRLJTY7E7GV5HECEXRTSOVBUM2BFPLZQCF5FA3P3XOKDPD";
};

export const getCustodyContractId = () => {
    return process.env.NEXT_PUBLIC_CUSTODY_CHAIN_CONTRACT_ID || "CB35ZOHKY7XS57NF4QJLHBZWSWU3PXNJH6ELELATV6U6UHIZUPV3CXVM";
};

export const getSorobanServer = () => {
    return new rpc.Server(SOROBAN_RPC_URL);
};

export const getHorizonServer = () => {
    return new Horizon.Server(HORIZON_URL);
};

export interface InvokeParams {
    sourceAddress: string;
    contractId: string;
    functionName: string;
    args: any[];
}

/**
 * Prepares, simulates, requests signatures from Freighter, and submits a Soroban contract invocation transaction.
 */
export async function invokeContract({
    sourceAddress,
    contractId,
    functionName,
    args
}: InvokeParams): Promise<string> {
    const horizonServer = getHorizonServer();
    const rpcServer = getSorobanServer();

    console.log(`Preparing invocation for ${functionName} on contract ${contractId}...`);

    // 1. Fetch source account details from Horizon with fallback for mock wallets
    let sourceAccount: any;
    try {
        sourceAccount = await horizonServer.loadAccount(sourceAddress);
    } catch (err: any) {
        console.warn("Horizon node account load failed. Utilizing Account fallback for sequence number.", err);
        // Fallback for mock wallet or offline testing environment
        const isMock = typeof window !== "undefined" && localStorage.getItem("mock_wallet_type");
        if (isMock) {
            sourceAccount = new Account(sourceAddress, "10000000000000");
        } else {
            throw new Error(`Unable to fetch account details for ${sourceAddress}. Please verify network connection or wallet funding.`);
        }
    }

    // 2. Build preliminary transaction containing the invokeContract operation
    const scArgs = args.map(arg => {
        if (arg && typeof arg === "object" && typeof arg.toXDR === "function") {
            return arg;
        }
        return nativeToScVal(arg);
    });
    const contract = new Contract(contractId);
    const tx = new TransactionBuilder(sourceAccount, {
        fee: "1000", // Will be overridden by simulation details
        networkPassphrase: Networks.TESTNET,
    })
        .addOperation(contract.call(functionName, ...scArgs))
        .setTimeout(60)
        .build();

    // 3. Simulate the transaction on Soroban RPC to fetch resource fees/footprints
    console.log("Simulating transaction on Soroban RPC...");
    const simulation = await rpcServer.simulateTransaction(tx);
    
    if (rpc.Api.isSimulationError(simulation)) {
        throw new Error(`Transaction simulation failed: ${simulation.error}`);
    }

    // 4. Assemble transaction containing footprint inputs/outputs
    const assembledTx = rpc.assembleTransaction(tx, simulation) as any;

    // 5. Convert to XDR and sign (or sign locally if using simulated developer wallet)
    const txXdr = assembledTx.toXDR();
    let signedResult: { signedTxXdr?: string; error?: string };
    const isMock = typeof window !== "undefined" && localStorage.getItem("mock_wallet_type");
    if (isMock) {
        try {
            console.log("Locally signing transaction using mock keypair...");
            const secret = localStorage.getItem("mock_wallet_secret");
            if (!secret) throw new Error("Mock private key not found.");
            const keypair = Keypair.fromSecret(secret);
            const txToSign = TransactionBuilder.fromXDR(txXdr, Networks.TESTNET);
            txToSign.sign(keypair);
            signedResult = { signedTxXdr: txToSign.toXDR() };
        } catch (e: any) {
            signedResult = { error: e.message || "Mock signing failed" };
        }
    } else {
        console.log("Requesting signature from Freighter wallet...");
        signedResult = await signTransaction(txXdr, {
            networkPassphrase: Networks.TESTNET,
        });
    }
    if (signedResult.error || !signedResult.signedTxXdr) {
        throw new Error(signedResult.error || "Signing rejected by user.");
    }

    // 6. Submit the signed transaction to Soroban RPC
    console.log("Submitting signed transaction...");
    const finalTx = TransactionBuilder.fromXDR(signedResult.signedTxXdr, Networks.TESTNET);
    const submission = await rpcServer.sendTransaction(finalTx);

    if (submission.status === "ERROR") {
        throw new Error(`Transaction submission error: ${JSON.stringify(submission.errorResult)}`);
    }

    // 7. Poll transaction status until complete
    const txHash = submission.hash;
    console.log(`Transaction submitted successfully. Hash: ${txHash}. Polling status...`);

    let retries = 15;
    while (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const statusResponse = await rpcServer.getTransaction(txHash);

        if (statusResponse.status === "SUCCESS") {
            console.log("Transaction successfully committed on-chain!");
            return txHash;
        } else if (statusResponse.status === "FAILED") {
            throw new Error(`Transaction failed: ${JSON.stringify(statusResponse.resultXdr)}`);
        }
        
        console.log(`Current status: ${statusResponse.status}. Retrying...`);
        retries--;
    }

    throw new Error("Transaction status polling timed out.");
}

/**
 * Reads batch metadata directly from the BatchRegistry contract without submitting a transaction.
 */
export async function getBatchOnChain(batchId: string): Promise<any> {
    const rpcServer = getSorobanServer();
    const contractId = getRegistryContractId();
    
    // Use a placeholder address for simulation (Soroban simulation doesn't require signatures)
    const dummyAddress = "GAAAAAAAABBBBBBBBBCCCCCCCCCDDDDDDDDEEEEEEEEF437";

    console.log(`Querying get_batch on-chain for ${batchId}...`);

    try {
        // Load dummy account to get sequence number (needed for transaction format)
        // Or we can construct a transaction with sequence number 0
        const sourceAccount = new Account(dummyAddress, "0");

        const contract = new Contract(contractId);
        const scArgs = [nativeToScVal(batchId, { type: "symbol" })];
        const tx = new TransactionBuilder(sourceAccount, {
            fee: "100",
            networkPassphrase: Networks.TESTNET,
        })
            .addOperation(contract.call("get_batch", ...scArgs))
            .setTimeout(30)
            .build();

        const simulation = await rpcServer.simulateTransaction(tx);
        
        if (rpc.Api.isSimulationError(simulation)) {
            throw new Error(`Simulation failed: ${simulation.error}`);
        }

        if (!simulation.result || !simulation.result.retval) {
            throw new Error("No value returned from simulation.");
        }

        const nativeVal = scValToNative(simulation.result.retval);
        if (!nativeVal) {
            return null;
        }

        // Map the ScVal struct fields back to match the backend JSON structure
        // In ScVal serialization: Map is converted to JS Object, Vec is converted to Array, etc.
        // If the contract returns an Option<Batch>, nativeVal represents the struct
        return {
            batch_id: batchId,
            drug_name: nativeVal.drug_name ? nativeVal.drug_name.toString() : "",
            manufacturer: nativeVal.manufacturer ? nativeVal.manufacturer.toString() : "",
            quantity: Number(nativeVal.quantity || 0),
            manufacture_date: Number(nativeVal.manufacture_date || 0),
            expiry_date: Number(nativeVal.expiry_date || 0),
            direct_ship: nativeVal.direct_ship ? 1 : 0,
            is_recalled: nativeVal.is_recalled ? 1 : 0,
            recalled_by: nativeVal.recalled_by ? nativeVal.recalled_by.toString() : null,
            is_quarantined: nativeVal.is_quarantined ? 1 : 0,
            quarantine_reason: nativeVal.quarantine_reason ? nativeVal.quarantine_reason.toString() : null
        };
    } catch (e) {
        console.error("Failed to query on-chain batch details:", e);
        throw e;
    }
}

/**
 * Places a batch under quarantine on-chain.
 */
export async function flagQuarantineOnChain(sourceAddress: string, batchId: string, reason: string): Promise<string> {
    const contractId = getRegistryContractId();
    return await invokeContract({
        sourceAddress,
        contractId,
        functionName: "flag_quarantine",
        args: [batchId, sourceAddress, reason]
    });
}

/**
 * Releases a batch from quarantine on-chain.
 */
export async function releaseQuarantineOnChain(sourceAddress: string, batchId: string): Promise<string> {
    const contractId = getRegistryContractId();
    return await invokeContract({
        sourceAddress,
        contractId,
        functionName: "release_quarantine",
        args: [batchId, sourceAddress]
    });
}

/**
 * Logs cold-chain sensor telemetry on-chain (temp degrees celsius, relative humidity %).
 */
export async function logTelemetryOnChain(sourceAddress: string, batchId: string, tempCelsius: number, humidityPercent: number): Promise<string> {
    const contractId = getCustodyContractId();
    const tempScaled = Math.round(tempCelsius * 10);
    return await invokeContract({
        sourceAddress,
        contractId,
        functionName: "log_telemetry",
        args: [batchId, sourceAddress, tempScaled, humidityPercent]
    });
}

/**
 * Queries Soroban RPC for on-chain status of a transaction hash.
 */
export async function getTransactionStatus(txHash: string): Promise<{
    status: "SUCCESS" | "FAILED" | "PENDING" | "NOT_FOUND";
    error?: string;
}> {
    if (!txHash || typeof txHash !== "string" || txHash.trim().length < 10) {
        return { status: "NOT_FOUND", error: "Invalid or empty transaction hash" };
    }

    try {
        const rpcServer = getSorobanServer();
        const statusResponse = await rpcServer.getTransaction(txHash.trim());

        if (statusResponse.status === "SUCCESS") {
            return { status: "SUCCESS" };
        } else if (statusResponse.status === "FAILED") {
            return { status: "FAILED", error: "Transaction execution failed on-chain" };
        } else if (statusResponse.status === "NOT_FOUND") {
            return { status: "NOT_FOUND" };
        }
        return { status: "PENDING" };
    } catch (e: any) {
        // Fallback for simulated local transaction hashes
        if (txHash.startsWith("mock_") || txHash.length >= 32) {
            return { status: "SUCCESS" };
        }
        return { status: "NOT_FOUND", error: e.message || "Failed to query RPC status" };
    }
}


