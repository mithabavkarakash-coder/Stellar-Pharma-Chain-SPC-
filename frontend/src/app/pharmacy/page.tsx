"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "../../context/WalletContext";
import Navbar from "../../components/Navbar";
import { invokeContract, getCustodyContractId } from "../../utils/soroban";
import { Building, ShieldAlert, RefreshCw, ShoppingBag } from "lucide-react";

export default function PharmacyPortal() {
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form States
    const [batchId, setBatchId] = useState("");
    const [quantity, setQuantity] = useState("10");

    // Inventory and Dispenses States
    const [inventory, setInventory] = useState<any[]>([]);
    const [dispenses, setDispenses] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const fetchPharmacyData = useCallback(async () => {
        if (!wallet.address) return;
        setHistoryLoading(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
            
            // 1. Fetch active batches
            const res = await fetch(`${backendUrl}/api/batches`);
            if (res.ok) {
                const batches = await res.json();
                
                const inventoryList: any[] = [];
                const localDispensesList: any[] = [];

                for (const b of batches) {
                    const detailRes = await fetch(`${backendUrl}/api/batches/${b.batch_id}`);
                    if (detailRes.ok) {
                        const details = await detailRes.json();
                        
                        // Handoffs to this pharmacy
                        const myHandoffs = details.handoffs.filter(
                            (h: any) => h.to_address.toLowerCase() === wallet.address!.toLowerCase()
                        );
                        myHandoffs.forEach((h: any) => {
                            inventoryList.push({
                                ...h,
                                drug_name: b.drug_name,
                                is_recalled: b.is_recalled === 1,
                            });
                        });

                        // Dispenses from this pharmacy
                        const myDispenses = details.dispenses.filter(
                            (d: any) => d.pharmacy.toLowerCase() === wallet.address!.toLowerCase()
                        );
                        myDispenses.forEach((d: any) => {
                            localDispensesList.push({
                                ...d,
                                drug_name: b.drug_name,
                            });
                        });
                    }
                }
                setInventory(inventoryList);
                setDispenses(localDispensesList);
            }
        } catch (e) {
            console.error("Failed to load pharmacy data:", e);
        } finally {
            setHistoryLoading(false);
        }
    }, [wallet.address]);

    useEffect(() => {
        if (wallet.address) {
            void fetchPharmacyData();
        }
    }, [wallet.address, fetchPharmacyData]);

    const handleDispense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet.address) {
            setError("Please connect your wallet first.");
            return;
        }
        if (!batchId || !quantity) {
            setError("All fields are required.");
            return;
        }

        setLoading(true);
        setError(null);
        setTxHash(null);

        try {
            const qty = parseInt(quantity);
            const custodyContractId = getCustodyContractId();

            // Invoke dispense_units on Custody Chain Contract
            const hash = await invokeContract({
                sourceAddress: wallet.address,
                contractId: custodyContractId,
                functionName: "dispense_units",
                args: [
                    batchId,
                    wallet.address,
                    qty
                ]
            });

            setTxHash(hash);
            setBatchId("");
            setQuantity("10");

            // Refresh data after dispense
            setTimeout(fetchPharmacyData, 3000);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to record dispense event on-chain.");
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
                <h1 style={{ fontSize: "2rem", marginBottom: 8 }}>Pharmacy Control Panel</h1>
                <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
                    Accept drug shipments from distributors (or manufacturers) and record on-chain patient dispenses.
                </p>

                {!wallet.connected ? (
                    <div className="glass-card" style={{ textAlign: "center", padding: "60px 20px" }}>
                        <ShieldAlert style={{ width: 48, height: 48, stroke: "#fbbf24", margin: "0 auto 16px" }} />
                        <h3>Freighter Wallet Disconnected</h3>
                        <p style={{ color: "var(--text-muted)", margin: "8px 0 24px", fontSize: "0.95rem" }}>
                            Please connect your Freighter wallet using the header button to manage inventory.
                        </p>
                        <button onClick={() => wallet.connect("mock-pharmacy")} className="btn btn-primary">Connect Wallet</button>
                    </div>
                ) : (
                    <div className="dashboard-grid">
                        {/* Dispense Form */}
                        <div className="glass-card">
                            <h2 style={{ fontSize: "1.25rem", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                                <ShoppingBag style={{ stroke: "#10b981" }} />
                                <span>Record Dispense to Patient</span>
                            </h2>

                            {error && <div className="alert alert-danger">{error}</div>}
                            {txHash && (
                                <div className="alert alert-success" style={{ display: "block" }}>
                                    <p style={{ fontWeight: 600 }}>Dispense Recorded Successfully!</p>
                                    <p style={{ fontSize: "0.8rem", marginTop: 4, wordBreak: "break-all" }}>
                                        Tx Hash: <a href={`https://explorer.stellar.org/testnet/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash}</a>
                                    </p>
                                </div>
                            )}

                            <form onSubmit={handleDispense}>
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
                                    <label className="form-label">Dispense Quantity</label>
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
                                            <span>Submitting Dispense to Soroban...</span>
                                        </>
                                    ) : (
                                        <span>Record Patient Dispense</span>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Received Inventory and Dispenses Lists */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                            {/* Inventory */}
                            <div className="glass-card">
                                <div className="flex-between" style={{ marginBottom: 16 }}>
                                    <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
                                        <Building style={{ stroke: "#60a5fa", width: 18, height: 18 }} />
                                        <span>Pharmacy Inventory</span>
                                    </h3>
                                    <button onClick={fetchPharmacyData} className="btn btn-secondary" style={{ padding: 6 }} disabled={historyLoading}>
                                        <RefreshCw style={{ width: 12, height: 12 }} className={historyLoading ? "spin" : ""} />
                                    </button>
                                </div>

                                {historyLoading ? (
                                    <div style={{ textAlign: "center", padding: "20px 0" }}>
                                        <div className="spinner" style={{ width: 20, height: 20 }} />
                                    </div>
                                ) : inventory.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                        No inventory found.
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 200, overflowY: "auto" }}>
                                        {inventory.map((item, index) => (
                                            <div key={index} className="glass-card" style={{ padding: 12, background: "rgba(255, 255, 255, 0.01)" }}>
                                                <div className="flex-between" style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                                                    <span>{item.drug_name}</span>
                                                    <span className="badge badge-green">Units: {item.quantity}</span>
                                                </div>
                                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                                                    Batch: {item.batch_id} {item.is_recalled && <strong style={{ color: "var(--color-danger)" }}>(RECALLED)</strong>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Dispensed History */}
                            <div className="glass-card">
                                <h3 style={{ fontSize: "1.1rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                                    <ShoppingBag style={{ stroke: "#10b981", width: 18, height: 18 }} />
                                    <span>Dispensed History</span>
                                </h3>

                                {historyLoading ? (
                                    <div style={{ textAlign: "center", padding: "20px 0" }}>
                                        <div className="spinner" style={{ width: 20, height: 20 }} />
                                    </div>
                                ) : dispenses.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                        No dispensed records.
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 200, overflowY: "auto" }}>
                                        {dispenses.map((disp, index) => (
                                            <div key={index} className="glass-card" style={{ padding: 12, background: "rgba(255, 255, 255, 0.01)" }}>
                                                <div className="flex-between" style={{ fontSize: "0.85rem" }}>
                                                    <span style={{ fontWeight: 600 }}>{disp.drug_name}</span>
                                                    <span className="badge badge-blue">Dispensed: {disp.quantity}</span>
                                                </div>
                                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                                                    Batch: {disp.batch_id}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
