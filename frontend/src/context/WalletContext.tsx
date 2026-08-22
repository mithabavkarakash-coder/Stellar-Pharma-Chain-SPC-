"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { isConnected, getAddress, signTransaction, requestAccess } from "@stellar/freighter-api";
import { Horizon, Networks, TransactionBuilder, Asset, Keypair, Operation } from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";

export interface WalletState {
    connected: boolean;
    address: string | null;
    balance: string | null;
    role: "Manufacturer" | "Distributor" | "Pharmacy" | "Customer" | "Admin";
    walletType: "freighter" | "albedo" | "mock-manufacturer" | "mock-distributor" | "mock-pharmacy" | "mock-admin" | "mock-customer" | null;
    error: string | null;
    loading: boolean;
}

interface WalletContextType extends WalletState {
    connect: (type: "freighter" | "albedo" | "mock-manufacturer" | "mock-distributor" | "mock-pharmacy" | "mock-admin" | "mock-customer") => Promise<void>;
    disconnect: () => void;
    setRole: (role: "Manufacturer" | "Distributor" | "Pharmacy" | "Customer" | "Admin") => void;
    sendTestPayment: (amount: string, destination: string) => Promise<string>;
    refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<WalletState>({
        connected: false,
        address: null,
        balance: null,
        role: "Manufacturer",
        walletType: null,
        error: null,
        loading: false,
    });

    const fetchBalance = useCallback(async (address: string) => {
        try {
            const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
            if (!res.ok) {
                if (res.status === 404) return "0.0000";
                throw new Error("Failed to load account info");
            }
            const data = await res.json();
            const nativeBalance = data.balances.find((b: any) => b.asset_type === "native");
            return nativeBalance ? parseFloat(nativeBalance.balance).toFixed(4) : "0.0000";
        } catch (e) {
            console.error("Error fetching balance:", e);
            return "0.0000";
        }
    }, []);

    // Get or create dynamic mock keypair for a role, ensuring it is funded
    const getOrCreateMockKeypair = async (roleType: string) => {
        if (typeof window === "undefined") return null;
        
        // Check for custom manufacturer dev key in environment variable if present, else generate dynamic keypair
        if (roleType === "mock-manufacturer" && process.env.NEXT_PUBLIC_MANUFACTURER_SECRET_KEY) {
            try {
                return Keypair.fromSecret(process.env.NEXT_PUBLIC_MANUFACTURER_SECRET_KEY);
            } catch (_e) {}
        }

        const secret = localStorage.getItem(`mock_secret_${roleType}`);
        let keypair: Keypair;
        if (secret) {
            try {
                keypair = Keypair.fromSecret(secret);
            } catch (_e) {
                keypair = Keypair.random();
                localStorage.setItem(`mock_secret_${roleType}`, keypair.secret());
            }
        } else {
            keypair = Keypair.random();
            localStorage.setItem(`mock_secret_${roleType}`, keypair.secret());
        }

        // Asynchronously check and fund via Friendbot if unfunded
        try {
            const addr = keypair.publicKey();
            const res = await fetch(`${HORIZON_URL}/accounts/${addr}`);
            if (res.status === 404) {
                console.log(`Funding simulated ${roleType} address via Friendbot...`);
                await fetch(`https://friendbot.stellar.org?addr=${addr}`);
            }
        } catch (e) {
            console.error("Friendbot funding error:", e);
        }
        return keypair;
    };

    const connect = async (type: "freighter" | "albedo" | "mock-manufacturer" | "mock-distributor" | "mock-pharmacy" | "mock-admin" | "mock-customer") => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            if (type.startsWith("mock-") || type === "albedo") {
                // Determine mock role
                let mappedRole: "Manufacturer" | "Distributor" | "Pharmacy" | "Customer" | "Admin" = "Manufacturer";
                if (type === "mock-distributor") mappedRole = "Distributor";
                if (type === "mock-pharmacy") mappedRole = "Pharmacy";
                if (type === "mock-admin") mappedRole = "Admin";
                if (type === "mock-customer") mappedRole = "Customer";
                if (type === "albedo") mappedRole = "Distributor";

                const keypair = await getOrCreateMockKeypair(type);
                if (!keypair) throw new Error("Failed to initialize mock keys.");

                const mockAddr = keypair.publicKey();
                
                if (typeof window !== "undefined") {
                    localStorage.setItem("mock_wallet_type", type);
                    localStorage.setItem("mock_wallet_secret", keypair.secret());
                }

                const balance = await fetchBalance(mockAddr);
                setState({
                    connected: true,
                    address: mockAddr,
                    balance,
                    role: mappedRole,
                    walletType: type,
                    error: null,
                    loading: false,
                });
                return;
            }

            // Freighter Connection
            const freighterConnected = await isConnected();
            if (!freighterConnected) {
                throw new Error("Freighter wallet is not installed or enabled in your browser.");
            }

            let walletAddr = "";
            try {
                // requestAccess prompts the user via Freighter modal
                const accessInfo = await requestAccess();
                if (accessInfo && accessInfo.address) {
                    walletAddr = accessInfo.address;
                } else if (accessInfo && (accessInfo as any).error) {
                    throw new Error((accessInfo as any).error);
                }
            } catch (accessErr: any) {
                // Fallback to getAddress if requestAccess fails/is rejected
                console.warn("requestAccess failed, trying fallback getAddress...", accessErr);
                const addressInfo = await getAddress();
                if (addressInfo && addressInfo.address) {
                    walletAddr = addressInfo.address;
                } else {
                    throw new Error(accessErr.message || addressInfo?.error || "Connection rejected by user.");
                }
            }

            if (!walletAddr) {
                throw new Error("No address returned from Freighter wallet. Please unlock the extension.");
            }

            if (typeof window !== "undefined") {
                localStorage.removeItem("mock_wallet_type");
                localStorage.removeItem("mock_wallet_secret");
            }

            const balance = await fetchBalance(walletAddr);
            setState({
                connected: true,
                address: walletAddr,
                balance,
                role: "Manufacturer",
                walletType: "freighter",
                error: null,
                loading: false,
            });
        } catch (err: any) {
            console.error("Connection failed:", err);
            setState((s) => ({
                ...s,
                connected: false,
                address: null,
                balance: null,
                walletType: null,
                loading: false,
                error: err.message || "Connection failed.",
            }));
        }
    };

    const disconnect = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("mock_wallet_type");
            localStorage.removeItem("mock_wallet_secret");
        }
        setState({
            connected: false,
            address: null,
            balance: null,
            role: "Manufacturer",
            walletType: null,
            error: null,
            loading: false,
        });
    };

    const setRole = (role: "Manufacturer" | "Distributor" | "Pharmacy" | "Customer" | "Admin") => {
        setState((s) => ({ ...s, role }));
    };

    const sendTestPayment = async (amount: string, destination: string): Promise<string> => {
        if (!state.address) throw new Error("Wallet not connected.");
        
        try {
            const server = new Horizon.Server(HORIZON_URL);
            const sourceAccount = await server.loadAccount(state.address);

            const tx = new TransactionBuilder(sourceAccount, {
                fee: "1000",
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

            const txXdr = tx.toXDR();
            let signedResult: { signedTxXdr?: string; error?: string };

            const isMock = typeof window !== "undefined" && localStorage.getItem("mock_wallet_type");
            if (isMock) {
                const secret = localStorage.getItem("mock_wallet_secret");
                if (!secret) throw new Error("Mock private key not found.");
                const keypair = Keypair.fromSecret(secret);
                const txToSign = TransactionBuilder.fromXDR(txXdr, Networks.TESTNET);
                txToSign.sign(keypair);
                signedResult = { signedTxXdr: txToSign.toXDR() };
            } else {
                signedResult = await signTransaction(txXdr, {
                    networkPassphrase: Networks.TESTNET,
                });
            }

            if (signedResult.error || !signedResult.signedTxXdr) {
                throw new Error(signedResult.error || "Signing rejected.");
            }

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

    const refreshBalance = useCallback(async () => {
        if (state.address) {
            const balance = await fetchBalance(state.address);
            setState((s) => ({ ...s, balance }));
        }
    }, [state.address, fetchBalance]);

    // Auto-reconnect on mount if previously connected
    useEffect(() => {
        const autoConnect = async () => {
            if (typeof window === "undefined") return;
            const savedType = localStorage.getItem("mock_wallet_type") as any;
            if (savedType) {
                await connect(savedType);
            } else {
                // Check if Freighter was active
                try {
                    const freighterConnected = await isConnected();
                    if (freighterConnected) {
                        const addressInfo = await getAddress();
                        if (addressInfo && addressInfo.address) {
                            const balance = await fetchBalance(addressInfo.address);
                            setState({
                                connected: true,
                                address: addressInfo.address,
                                balance,
                                role: "Manufacturer",
                                walletType: "freighter",
                                error: null,
                                loading: false,
                            });
                        }
                    }
                } catch (_e) {}
            }
        };

        autoConnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchBalance]);

    return (
        <WalletContext.Provider
            value={{
                ...state,
                connect,
                disconnect,
                setRole,
                sendTestPayment,
                refreshBalance,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error("useWallet must be used within a WalletProvider");
    }
    return context;
};
