"use client";

import { useState } from "react";
import { useWallet } from "../../context/WalletContext";
import Navbar from "../../components/Navbar";
import { invokeContract, getRegistryContractId, getCustodyContractId } from "../../utils/soroban";
import { PlusCircle, ShieldAlert, CheckCircle, HelpCircle } from "lucide-react";

export default function ManufacturerPortal() {
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form States - Batch Registration
    const [batchId, setBatchId] = useState("");
    const [drugName, setDrugName] = useState("");
    const [quantity, setQuantity] = useState("1000");
    const [manufactureDate, setManufactureDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [directShip, setDirectShip] = useState(false);

    // Form States - Batch Recall
    const [recallBatchId, setRecallBatchId] = useState("");
    const [recallLoading, setRecallLoading] = useState(false);
    const [recallHash, setRecallHash] = useState<string | null>(null);
    const [recallError, setRecallError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet.address) {
            setError("Please connect your wallet first.");
            return;
        }
        if (!batchId || !drugName || !quantity || !manufactureDate || !expiryDate) {
            setError("All fields are required.");
            return;
        }

        setLoading(true);
        setError(null);
        setTxHash(null);

        try {
            // Convert dates to UNIX timestamp (seconds)
            const mDate = Math.floor(new Date(manufactureDate).getTime() / 1000);
            const eDate = Math.floor(new Date(expiryDate).getTime() / 1000);
            const qty = parseInt(quantity);

            if (mDate >= eDate) {
                throw new Error("Expiry date must be after manufacture date.");
            }

            const registryContractId = getRegistryContractId();
            const custodyContractId = getCustodyContractId();

            // Invoke register_batch on Registry Contract
            const hash = await invokeContract({
                sourceAddress: wallet.address,
                contractId: registryContractId,
                functionName: "register_batch",
                args: [
                    batchId,
                    drugName,
                    wallet.address,
                    qty,
                    mDate,
                    eDate,
                    directShip,
                    custodyContractId
                ]
            });

            setTxHash(hash);
            // Reset form
            setBatchId("");
            setDrugName("");
            setQuantity("1000");
            setManufactureDate("");
            setExpiryDate("");
            setDirectShip(false);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to register batch on-chain.");
        } finally {
            setLoading(false);
        }
    };

    const handleRecall = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet.address) {
            setRecallError("Please connect your wallet first.");
            return;
        }
        if (!recallBatchId) {
            setRecallError("Batch ID is required.");
            return;
        }

        setRecallLoading(true);
        setRecallError(null);
        setRecallHash(null);

        try {
            const registryContractId = getRegistryContractId();

            // Invoke flag_recalled on Registry Contract
            const hash = await invokeContract({
                sourceAddress: wallet.address,
                contractId: registryContractId,
                functionName: "flag_recalled",
                args: [
                    recallBatchId,
                    wallet.address
                ]
            });

            setRecallHash(hash);
            setRecallBatchId("");
        } catch (err: any) {
            console.error(err);
            setRecallError(err.message || "Failed to flag batch as recalled.");
        } finally {
            setRecallLoading(false);
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
                <h1 style={{ fontSize: "2rem", marginBottom: 8 }}>Manufacturer Control Panel</h1>
                <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
                    Register new pharmaceutical batches, specify parameters, and record product recalls.
                </p>

                {!wallet.connected ? (
                    <div className="glass-card" style={{ textAlign: "center", padding: "60px 20px" }}>
                        <ShieldAlert style={{ width: 48, height: 48, stroke: "#fbbf24", margin: "0 auto 16px" }} />
                        <h3>Freighter Wallet Disconnected</h3>
                        <p style={{ color: "var(--text-muted)", margin: "8px 0 24px", fontSize: "0.95rem" }}>
                            Please connect your Freighter wallet using the header button to perform manufacturing actions.
                        </p>
                        <button onClick={() => wallet.connect("mock-manufacturer")} className="btn btn-primary">Connect Wallet</button>
                    </div>
                ) : (
                    <div className="dashboard-grid">
                        {/* Registration Form */}
                        <div className="glass-card">
                            <h2 style={{ fontSize: "1.25rem", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                                <PlusCircle style={{ stroke: "#3b82f6" }} />
                                <span>Register Drug Batch</span>
                            </h2>

                            {error && <div className="alert alert-danger">{error}</div>}
                            {txHash && (
                                <div className="alert alert-success" style={{ display: "block" }}>
                                    <p style={{ fontWeight: 600 }}>Batch Registered Successfully!</p>
                                    <p style={{ fontSize: "0.8rem", marginTop: 4, wordBreak: "break-all" }}>
                                        Tx Hash: <a href={`https://explorer.stellar.org/testnet/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash}</a>
                                    </p>
                                </div>
                            )}

                            <form onSubmit={handleRegister}>
                                <div className="form-row">
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
                                        <label className="form-label">Drug Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="e.g. Paracetamol 500mg"
                                            value={drugName}
                                            onChange={(e) => setDrugName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="form-control"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-group" style={{ justifyContent: "center", paddingLeft: 8 }}>
                                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 24 }}>
                                            <input
                                                type="checkbox"
                                                checked={directShip}
                                                onChange={(e) => setDirectShip(e.target.checked)}
                                                style={{ width: 18, height: 18, cursor: "pointer" }}
                                            />
                                            <span>Direct Ship (Skip Distributor)</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Manufacture Date</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={manufactureDate}
                                            onChange={(e) => setManufactureDate(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Expiry Date</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={expiryDate}
                                            onChange={(e) => setExpiryDate(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", marginTop: 12 }}>
                                    {loading ? (
                                        <>
                                            <div className="spinner" style={{ width: 16, height: 16 }} />
                                            <span>Submitting to Soroban...</span>
                                        </>
                                    ) : (
                                        <span>Register Batch on Stellar</span>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Recalls & Help Area */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                            {/* Recall Form */}
                            <div className="glass-card">
                                <h2 style={{ fontSize: "1.25rem", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                                    <ShieldAlert style={{ stroke: "#ef4444" }} />
                                    <span>Trigger Batch Recall</span>
                                </h2>

                                {recallError && <div className="alert alert-danger">{recallError}</div>}
                                {recallHash && (
                                    <div className="alert alert-success" style={{ display: "block" }}>
                                        <p style={{ fontWeight: 600 }}>Recall Flagged Successfully!</p>
                                        <p style={{ fontSize: "0.8rem", marginTop: 4, wordBreak: "break-all" }}>
                                            Tx Hash: <a href={`https://explorer.stellar.org/testnet/tx/${recallHash}`} target="_blank" rel="noopener noreferrer">{recallHash}</a>
                                        </p>
                                    </div>
                                )}

                                <form onSubmit={handleRecall}>
                                    <div className="form-group">
                                        <label className="form-label">Batch ID to Recall</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="e.g. BATCH100"
                                            value={recallBatchId}
                                            onChange={(e) => setRecallBatchId(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <button type="submit" disabled={recallLoading} className="btn btn-danger" style={{ width: "100%" }}>
                                        {recallLoading ? (
                                            <>
                                                <div className="spinner" style={{ width: 16, height: 16 }} />
                                                <span>Submitting Recall...</span>
                                            </>
                                        ) : (
                                            <span>Recall Batch Immutably</span>
                                        )}
                                    </button>
                                </form>
                            </div>

                            {/* Help Info Card */}
                            <div className="glass-card">
                                <h3 style={{ fontSize: "1.1rem", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                                    <HelpCircle style={{ stroke: "#9ca3af", width: 18, height: 18 }} />
                                    <span>Rules & Guidelines</span>
                                </h3>
                                <ul style={{ fontSize: "0.85rem", color: "var(--text-secondary)", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                                    <li>Registration initializes the manufacturer custody state inside the <strong>Custody Chain</strong> contract automatically.</li>
                                    <li>If <strong>Direct Ship</strong> is checked, the batch can bypass the distributor and be shipped directly to a pharmacy.</li>
                                    <li>Recalls can only be flagged by the registered batch manufacturer or the authorized admin regulator address.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
