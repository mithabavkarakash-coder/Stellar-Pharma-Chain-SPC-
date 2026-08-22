"use client";

import { useState } from "react";
import { useWallet } from "../../context/WalletContext";
import Navbar from "../../components/Navbar";
import { invokeContract, getRegistryContractId } from "../../utils/soroban";
import { ShieldAlert, AlertTriangle, Lock, Key, OctagonAlert } from "lucide-react";

export default function AdminPortal() {
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: "success" | "danger"; text: string } | null>(null);

    // Pause toggle
    const [isPaused, setIsPaused] = useState(false);

    // Quarantine Form
    const [quarantineBatchId, setQuarantineBatchId] = useState("");
    const [quarantineReason, setQuarantineReason] = useState("");

    // Admin Handover Form
    const [newAdminAddr, setNewAdminAddr] = useState("");

    const handleTogglePause = async () => {
        if (!wallet.address) return;
        setLoading(true);
        setStatusMsg(null);
        try {
            const registryId = getRegistryContractId();
            const nextPauseState = !isPaused;
            const hash = await invokeContract({
                sourceAddress: wallet.address,
                contractId: registryId,
                functionName: "set_paused",
                args: [wallet.address, nextPauseState]
            });
            setIsPaused(nextPauseState);
            setStatusMsg({
                type: "success",
                text: `Circuit Breaker updated: Contract ${nextPauseState ? "PAUSED" : "ACTIVE"}. Tx: ${hash.slice(0, 10)}...`
            });
        } catch (e: any) {
            setStatusMsg({ type: "danger", text: e.message || "Failed to update pause state." });
        } finally {
            setLoading(false);
        }
    };

    const handleQuarantine = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet.address || !quarantineBatchId || !quarantineReason) return;
        setLoading(true);
        setStatusMsg(null);
        try {
            const registryId = getRegistryContractId();
            const hash = await invokeContract({
                sourceAddress: wallet.address,
                contractId: registryId,
                functionName: "flag_quarantine",
                args: [quarantineBatchId, wallet.address, quarantineReason]
            });
            setStatusMsg({
                type: "success",
                text: `Batch #${quarantineBatchId} placed under QUARANTINE hold. Tx: ${hash.slice(0, 10)}...`
            });
            setQuarantineBatchId("");
            setQuarantineReason("");
        } catch (e: any) {
            setStatusMsg({ type: "danger", text: e.message || "Quarantine execution failed." });
        } finally {
            setLoading(false);
        }
    };

    const handleProposeAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet.address || !newAdminAddr) return;
        setLoading(true);
        setStatusMsg(null);
        try {
            const registryId = getRegistryContractId();
            const hash = await invokeContract({
                sourceAddress: wallet.address,
                contractId: registryId,
                functionName: "propose_admin",
                args: [wallet.address, newAdminAddr]
            });
            setStatusMsg({
                type: "success",
                text: `Proposed new admin address ${newAdminAddr.slice(0, 10)}... Tx: ${hash.slice(0, 10)}...`
            });
            setNewAdminAddr("");
        } catch (e: any) {
            setStatusMsg({ type: "danger", text: e.message || "Propose admin failed." });
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

            <main className="main-content-offset" style={{ padding: "80px 20px 96px", maxWidth: 1100, margin: "0 auto" }}>
                <div style={{ marginBottom: 32 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <div style={{ padding: 10, borderRadius: 10, background: "rgba(239, 68, 68, 0.2)", color: "#ef4444" }}>
                            <ShieldAlert size={26} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0, color: "#fff" }}>
                                Regulatory & Admin Control Center
                            </h1>
                            <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.95rem" }}>
                                Executive oversight console for contract circuit breakers, batch quarantines, and 2-step admin governance.
                            </p>
                        </div>
                    </div>
                </div>

                {!wallet.connected ? (
                    <div className="glass-card" style={{ textAlign: "center", padding: "60px 20px" }}>
                        <Lock style={{ width: 48, height: 48, stroke: "#fbbf24", margin: "0 auto 16px" }} />
                        <h3>Administrator Authentication Required</h3>
                        <p style={{ color: "var(--text-muted)", margin: "8px 0 24px" }}>
                            Please connect your administrator wallet to execute contract circuit breakers or quarantine flags.
                        </p>
                        <button onClick={() => wallet.connect("mock-admin")} className="btn btn-primary">Connect Admin Persona</button>
                    </div>
                ) : (
                    <div>
                        {statusMsg && (
                            <div className={`alert alert-${statusMsg.type}`} style={{ marginBottom: 24 }}>
                                {statusMsg.text}
                            </div>
                        )}

                        <div className="dashboard-grid">
                            {/* Circuit Breaker Controls */}
                            <div className="glass-card" style={{ border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                                <h3 style={{ fontSize: "1.2rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: "#ef4444" }}>
                                    <OctagonAlert size={20} />
                                    <span>Emergency Circuit Breaker</span>
                                </h3>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 20 }}>
                                    Toggling circuit breaker status halts all on-chain batch registrations and custody handoffs globally across the network.
                                </p>
                                
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, background: "rgba(0,0,0,0.3)", borderRadius: 10 }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: "#fff" }}>Smart Contract Status</div>
                                        <span style={{ fontSize: "0.75rem", color: isPaused ? "#ef4444" : "#10b981" }}>
                                            {isPaused ? "PAUSED (TRANSFERS BLOCKED)" : "ACTIVE (NORMAL OPERATION)"}
                                        </span>
                                    </div>
                                    <button
                                        disabled={loading}
                                        onClick={handleTogglePause}
                                        className={`btn ${isPaused ? "btn-primary" : "btn-danger"}`}
                                        style={{ padding: "10px 20px", fontWeight: 700 }}
                                    >
                                        {isPaused ? "Resume Contract" : "PAUSE CONTRACT"}
                                    </button>
                                </div>
                            </div>

                            {/* Batch Quarantine Form */}
                            <div className="glass-card">
                                <h3 style={{ fontSize: "1.2rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                                    <AlertTriangle size={20} color="#f59e0b" />
                                    <span>Flag Batch Quarantine</span>
                                </h3>
                                <form onSubmit={handleQuarantine}>
                                    <div className="form-group" style={{ marginBottom: 14 }}>
                                        <label className="form-label">Target Batch ID</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="e.g. BATCH123"
                                            value={quarantineBatchId}
                                            onChange={(e) => setQuarantineBatchId(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 16 }}>
                                        <label className="form-label">Isolation Reason</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="e.g. Suspected seal tampering / Cold-Chain Breach"
                                            value={quarantineReason}
                                            onChange={(e) => setQuarantineReason(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <button disabled={loading} type="submit" className="btn btn-secondary" style={{ width: "100%", padding: "10px 0" }}>
                                        Execute Quarantine Isolation Hold
                                    </button>
                                </form>
                            </div>

                            {/* Admin Ownership Handover */}
                            <div className="glass-card">
                                <h3 style={{ fontSize: "1.2rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                                    <Key size={20} color="#3b82f6" />
                                    <span>2-Step Admin Governance</span>
                                </h3>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                                    Propose a new administrator key for two-step contract ownership transfer.
                                </p>
                                <form onSubmit={handleProposeAdmin}>
                                    <div className="form-group" style={{ marginBottom: 16 }}>
                                        <label className="form-label">New Admin Wallet Address</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="G..."
                                            value={newAdminAddr}
                                            onChange={(e) => setNewAdminAddr(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <button disabled={loading} type="submit" className="btn btn-primary" style={{ width: "100%", padding: "10px 0" }}>
                                        Propose New Admin
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
