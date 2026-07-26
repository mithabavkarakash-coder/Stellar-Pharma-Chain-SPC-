import { useState, useEffect, useCallback } from "react";
import { isConnected, getAddress, signTransaction } from "@stellar/freighter-api";
import { Horizon, Networks, TransactionBuilder, Asset, Keypair, Operation } from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";

export interface WalletState {
    connected: boolean;
    address: string | null;
    balance: string | null;
    role: "Manufacturer" | "Distributor" | "Pharmacy";
    error: string | null;
    loading: boolean;
}

export const useFreighter = () => {
    const [state, setState] = useState<WalletState>({
        connected: false,
        address: null,
        balance: null,
        role: "Manufacturer", // Default role
        error: null,
        loading: false,
    });

    // Fetch XLM balance from Stellar Horizon
    const fetchBalance = useCallback(async (address: string) => {
        try {
            const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
            if (!res.ok) {
                if (res.status === 404) {
                    return "0.0000"; // Unfunded account
                }
                throw new Error("Failed to load account information");
            }
            const data = await res.json();
            const nativeBalance = data.balances.find((b: any) => b.asset_type === "native");
            return nativeBalance ? parseFloat(nativeBalance.balance).toFixed(4) : "0.0000";
        } catch (e: any) {
            console.error("Error fetching balance:", e);
            return null;
        }
    }, []);

    // Load wallet state on mount or change
    const checkConnection = useCallback(async () => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            // Check if mock wallet mode is active in local storage
            if (typeof window !== "undefined" && localStorage.getItem("mock_wallet") === "true") {
                const mockAddress = "GAT2RNTH7ILIPWUPTNCEPLPW7I7TDOUPDD4FL63J77S4ITHGNHCNCO5V";
                const balance = await fetchBalance(mockAddress);
                setState((s) => ({
                    ...s,
                    connected: true,
                    address: mockAddress,
                    balance,
                    loading: false,
                    error: null,
                }));
                return;
            }

            const connected = await isConnected();
            if (connected) {
                const addressInfo = await getAddress();
                if (addressInfo && addressInfo.address) {
                    const balance = await fetchBalance(addressInfo.address);
                    setState((s) => ({
                        ...s,
                        connected: true,
                        address: addressInfo.address,
                        balance,
                        loading: false,
                        error: null,
                    }));
                    return;
                }
            }
            setState((s) => ({
                ...s,
                connected: false,
                address: null,
                balance: null,
                loading: false,
            }));
        } catch (err: any) {
            setState((s) => ({
                ...s,
                connected: false,
                address: null,
                balance: null,
                loading: false,
                error: err.message || "Failed to connect to Freighter",
            }));
        }
    }, [fetchBalance]);

    // Connect wallet
    const connect = async () => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const connected = await isConnected();
            if (!connected) {
                console.log("Freighter not detected. Activating simulated developer account...");
                if (typeof window !== "undefined") {
                    localStorage.setItem("mock_wallet", "true");
                }
                const mockAddress = "GAT2RNTH7ILIPWUPTNCEPLPW7I7TDOUPDD4FL63J77S4ITHGNHCNCO5V";
                const balance = await fetchBalance(mockAddress);
                setState((s) => ({
                    ...s,
                    connected: true,
                    address: mockAddress,
                    balance,
                    loading: false,
                    error: null,
                }));
                return;
            }
            const addressInfo = await getAddress();
            if (!addressInfo || addressInfo.error || !addressInfo.address) {
                throw new Error(addressInfo?.error || "Connection rejected by user.");
            }
            if (typeof window !== "undefined") {
                localStorage.removeItem("mock_wallet");
            }
            const balance = await fetchBalance(addressInfo.address);
            setState((s) => ({
                ...s,
                connected: true,
                address: addressInfo.address,
                balance,
                loading: false,
                error: null,
            }));
        } catch (err: any) {
            setState((s) => ({
                ...s,
                connected: false,
                address: null,
                balance: null,
                loading: false,
                error: err.message || "Connection failed.",
            }));
        }
    };

    // Disconnect wallet
    const disconnect = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("mock_wallet");
        }
        setState((s) => ({
            ...s,
            connected: false,
            address: null,
            balance: null,
            error: null,
        }));
    };

    // Toggle demo role
    const setRole = (role: "Manufacturer" | "Distributor" | "Pharmacy") => {
        setState((s) => ({ ...s, role }));
    };

    // Send a test payment (simulate batch fee)
    const sendTestPayment = async (amount: string, destination: string): Promise<string> => {
        if (!state.address) {
            throw new Error("Wallet not connected.");
        }
        
        try {
            // 1. Fetch source account from Horizon
            const server = new Horizon.Server(HORIZON_URL);
            const sourceAccount = await server.loadAccount(state.address);

            // 2. Build Transaction
            const tx = new TransactionBuilder(sourceAccount, {
                fee: "1000", // Standard fee
                networkPassphrase: Networks.TESTNET,
            })
                .addOperation(
                    Operation.payment({
                        destination,
                        asset: Asset.native(),
                        amount,
                    })
                )
                .setTimeout(60)
                .build();

            // 3. Request signature (or sign locally if using simulated developer wallet)
            const txXdr = tx.toXDR();
            let signedResult: { signedTxXdr?: string; error?: string };
            if (typeof window !== "undefined" && localStorage.getItem("mock_wallet") === "true") {
                try {
                    const txToSign = TransactionBuilder.fromXDR(txXdr, Networks.TESTNET);
                    const keypair = Keypair.fromSecret("SAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663HQBRNCLU7UIUKH44ZTZJ");
                    txToSign.sign(keypair);
                    signedResult = { signedTxXdr: txToSign.toXDR() };
                } catch (e: any) {
                    signedResult = { error: e.message || "Mock signing failed" };
                }
            } else {
                signedResult = await signTransaction(txXdr, {
                    networkPassphrase: Networks.TESTNET,
                });
            }
            if (signedResult.error || !signedResult.signedTxXdr) {
                throw new Error(signedResult.error || "Signing rejected by user.");
            }

            // 4. Submit to Horizon
            const result = await server.submitTransaction(
                TransactionBuilder.fromXDR(signedResult.signedTxXdr, Networks.TESTNET)
            );
            
            // Refresh balance
            const balance = await fetchBalance(state.address);
            setState((s) => ({ ...s, balance }));

            return result.hash;
        } catch (err: any) {
            console.error("Payment failed:", err);
            throw new Error(err.message || "Transaction signature or submission failed.");
        }
    };

    // Auto check on mount
    useEffect(() => {
        checkConnection();
    }, [checkConnection]);

    return {
        ...state,
        connect,
        disconnect,
        setRole,
        refreshBalance: async () => {
            if (state.address) {
                const balance = await fetchBalance(state.address);
                setState((s) => ({ ...s, balance }));
            }
        },
        sendTestPayment,
    };
};
