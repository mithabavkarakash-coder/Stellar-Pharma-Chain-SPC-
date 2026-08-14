"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "../../context/WalletContext";
import Navbar from "../../components/Navbar";
import { invokeContract, getCustodyContractId } from "../../utils/soroban";
import { xdr } from "@stellar/stellar-sdk";
import { Truck, ShieldAlert, CheckCircle, RefreshCw, ArrowRightLeft } from "lucide-react";

export default function DistributorPortal() {
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form States
    const [batchId, setBatchId] = useState("");
    const [pharmacyAddress, setPharmacyAddress] = useState("");
    const [quantity, setQuantity] = useState("500");

    // Batches Received History
    const [receivedHandoffs, setReceivedHandoffs] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const fetchHandoffHistory = useCallback(async () => {
        if (!wallet.address) return;
        setHistoryLoading(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
            // Get all batches to find handoffs
            const res = await fetch(`${backendUrl}/api/batches`);
            if (res.ok) {
                const batches = await res.json();
                
                // For each batch, fetch details to extract handoffs to this distributor
                const handoffsList: any[] = [];
                for (const b of batches) {
                    const detailRes = await fetch(`${backendUrl}/api/batches/${b.batch_id}`);
                    if (detailRes.ok) {
                        const details = await detailRes.json();
                        const myHandoffs = details.handoffs.filter(
                            (h: any) => h.to_address.toLowerCase() === wallet.address!.toLowerCase()
                        );
                        myHandoffs.forEach((h: any) => {
                            handoffsList.push({
                                ...h,
                                drug_name: b.drug_name,
                                is_recalled: b.is_recalled === 1,
                            });
                        });
                    }
                }
                setReceivedHandoffs(handoffsList);
            }
        } catch (e) {
            console.error("Failed to load distributor handoffs:", e);
        } finally {
            setHistoryLoading(false);
        }
    }, [wallet.address]);

    useEffect(() => {
        if (wallet.address) {
            fetchHandoffHistory();
        }
    }, [wallet.address, fetchHandoffHistory]);

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet.address) {
            setError("Please connect your wallet first.");
            return;
        }
        if (!batchId || !pharmacyAddress || !quantity) {
            setError("All fields are required.");
            return;
        }

        setLoading(true);
        setError(null);
        setTxHash(null);

        try {
            const qty = parseInt(quantity);
            const custodyContractId = getCustodyContractId();

            // Encode the Role::Pharmacy enum as a simple symbol ScVal
            const pharmacyRoleSymbol = xdr.ScVal.scvSymbol("Pharmacy");

            // Invoke transfer_custody on Custody Chain Contract
            const hash = await invokeContract({
                sourceAddress: wallet.address,
                contractId: custodyContractId,
                functionName: "transfer_custody",
                args: [
                    batchId,
                    wallet.address,
                    pharmacyAddress,
                    qty,
                    pharmacyRoleSymbol
                ]
            });

            setTxHash(hash);
            setBatchId("");
            setPharmacyAddress("");
            setQuantity("500");
            
            // Refresh list
            setTimeout(fetchHandoffHistory, 3000);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to transfer custody on-chain.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Navbar
                connected={wallet.connected}
                address={wallet.address}
                balance={wallet.balance}
                role={wallet.role}
                loading={wallet.loading}
                onConnect={wallet.connect}
                onDisconnect={wallet.disconnect}
                onRoleChange={wallet.setRole}
            />

            <main className="app-container" style={{ padding: "40px 20px 80px" }}>
                <h1 style={{ fontSize: "2rem", marginBottom: 8 }}>Distributor Control Panel</h1>
                <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
                    Accept batches from manufacturers and record outgoing shipments to pharmacies.
                </p>

                {!wallet.connected ? (
                    <div className="glass-card" style={{ textAlign: "center", padding: "60px 20px" }}>
                        <ShieldAlert style={{ width: 48, height: 48, stroke: "#fbbf24", margin: "0 auto 16px" }} />
                        <h3>Freighter Wallet Disconnected</h3>
                        <p style={{ color: "var(--text-muted)", margin: "8px 0 24px", fontSize: "0.95rem" }}>
                            Please connect your Freighter wallet using the header button to view and manage inventory.
                        </p>
                        <button onClick={() => wallet.connect("mock-distributor")} className="btn btn-primary">Connect Wallet</button>
                    </div>
                ) : (
                    <div className="dashboard-grid">
                        {/* Handoff Form */}
                        <div className="glass-card">
                            <h2 style={{ fontSize: "1.25rem", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                                <ArrowRightLeft style={{ stroke: "#f59e0b" }} />
                                <span>Forward Custody to Pharmacy</span>
                            </h2>

                            {error && <div className="alert alert-danger">{error}</div>}
                            {txHash && (
                                <div className="alert alert-success" style={{ display: "block" }}>
                                    <p style={{ fontWeight: 600 }}>Custody Transferred Successfully!</p>
                                    <p style={{ fontSize: "0.8rem", marginTop: 4, wordBreak: "break-all" }}>
                                        Tx Hash: <a href={`https://explorer.stellar.org/testnet/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash}</a>
                                    </p>
                                </div>
                            )}

                            <form onSubmit={handleTransfer}>
                                <div className="form-group">
                                    <label className="form-label">Batch ID (Symbol)</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g. BATCH100"
                                        value={batchId}
                                        onChange={(e) => setBatchId(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Pharmacy Public Address (Stellar G...)</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g. GD37... or GB9X..."
                                        value={pharmacyAddress}
                                        onChange={(e) => setPharmacyAddress(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Quantity to Forward</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="form-control"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        required
                                    />
                                </div>

                                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", marginTop: 12 }}>
                                    {loading ? (
                                        <>
                                            <div className="spinner" style={{ width: 16, height: 16 }} />
                                            <span>Submitting Handoff to Soroban...</span>
                                        </>
                                    ) : (
                                        <span>Authorize Custody Handoff</span>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Cold-Chain Telemetry Logger Card */}
                        <div className="glass-card">
                            <h2 style={{ fontSize: "1.25rem", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                                <Truck style={{ stroke: "#10b981" }} />
                                <span>Log Cold-Chain Telemetry</span>
                            </h2>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (!wallet.address || !batchId) return;
                                try {
                                    setLoading(true);
                                    const { logTelemetryOnChain } = await import("../../utils/soroban");
                                    const hash = await logTelemetryOnChain(wallet.address, batchId, 4.5, 55);
                                    setTxHash(hash);
                                } catch (err: any) {
                                    setError(err.message || "Failed to log telemetry");
                                } finally {
                                    setLoading(false);
                                }
                            }}>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                                    Record real-time IoT probe readings (Temperature & Humidity) to trigger automated cold-chain compliance events.
                                </p>
                                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary" 
                                        style={{ flex: 1, fontSize: "0.8rem", padding: "8px" }}
                                        onClick={async () => {
                                            if (!wallet.address || !batchId) return;
                                            try {
                                                setLoading(true);
                                                const { logTelemetryOnChain } = await import("../../utils/soroban");
                                                const hash = await logTelemetryOnChain(wallet.address, batchId, 4.5, 52);
                                                setTxHash(hash);
                                            } catch (err: any) {
                                                setError(err.message || "Failed to log telemetry");
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                    >
                                        🌡️ 4.5°C (Compliant)
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn btn-danger" 
                                        style={{ flex: 1, fontSize: "0.8rem", padding: "8px" }}
                                        onClick={async () => {
                                            if (!wallet.address || !batchId) return;
                                            try {
                                                setLoading(true);
                                                const { logTelemetryOnChain } = await import("../../utils/soroban");
                                                const hash = await logTelemetryOnChain(wallet.address, batchId, 9.8, 78);
                                                setTxHash(hash);
                                            } catch (err: any) {
                                                setError(err.message || "Failed to log telemetry");
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                    >
                                        🚨 9.8°C (Excursion)
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Received Batches Inventory */}
                        <div className="glass-card">
                            <div className="flex-between" style={{ marginBottom: 20 }}>
                                <h2 style={{ fontSize: "1.25rem", display: "flex", alignItems: "center", gap: 8 }}>
                                    <Truck style={{ stroke: "#60a5fa" }} />
                                    <span>Received Inventory</span>
                                </h2>
                                <button 
                                    onClick={fetchHandoffHistory} 
                                    className="btn btn-secondary" 
                                    style={{ padding: 6 }} 
                                    title="Refresh Inventory"
                                    disabled={historyLoading}
                                >
                                    <RefreshCw style={{ width: 14, height: 14 }} className={historyLoading ? "spin" : ""} />
                                </button>
                            </div>

                            {historyLoading ? (
                                <div style={{ textAlign: "center", padding: "40px 0" }}>
                                    <div className="spinner" />
                                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 12 }}>Loading inventory...</p>
                                </div>
                            ) : receivedHandoffs.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                                    <p style={{ fontSize: "0.9rem" }}>No received handoffs found for this address.</p>
                                    <p style={{ fontSize: "0.75rem", marginTop: 4 }}>Verify that a manufacturer has transferred a batch to you.</p>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "400px", overflowY: "auto" }}>
                                    {receivedHandoffs.map((h, i) => (
                                        <div 
                                            key={i} 
                                            className="glass-card" 
                                            style={{ 
                                                padding: 16, 
                                                background: "rgba(255, 255, 255, 0.01)",
                                                borderLeft: h.is_recalled ? "4px solid var(--color-danger)" : "4px solid var(--color-success)"
                                            }}
                                        >
                                            <div className="flex-between" style={{ marginBottom: 6 }}>
                                                <span style={{ fontWeight: 700 }}>{h.drug_name}</span>
                                                <span className="badge badge-blue">Qty: {h.quantity}</span>
                                            </div>
                                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                                <div>Batch ID: <strong>{h.batch_id}</strong></div>
                                                <div>From: {h.from_address.substring(0, 10)}...</div>
                                                {h.is_recalled && (
                                                    <div style={{ color: "var(--color-danger)", fontWeight: 600, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                                                        <ShieldAlert style={{ width: 14, height: 14 }} />
                                                        <span>RECALLED</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
