import React from "react";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import StatusBadge from "./ui/StatusBadge";

interface CounterfeitDetectorProps {
    batchId: string;
    isGenuine?: boolean;
    isRecalled?: boolean;
    isExpired?: boolean;
    anomalies?: string[];
    manufacturer?: string;
}

export default function CounterfeitDetector({ batchId, isGenuine = true, isRecalled = false, isExpired = false, anomalies = [], manufacturer: _manufacturer }: CounterfeitDetectorProps) {
    // 6 Counterfeit Verification Checks
    const checks = [
        {
            id: "id_valid",
            title: "On-Chain Medicine ID Registration",
            desc: "Validates batch identifier against Soroban ledger registry",
            passed: isGenuine && !!batchId,
            failMsg: "Invalid or Unregistered Medicine ID (Possible Counterfeit)"
        },
        {
            id: "duplicate_qr",
            title: "Duplicate QR Code Replay Prevention",
            desc: "Checks for cloned QR code scan anomalies across multiple locations",
            passed: !anomalies.some(a => a.toLowerCase().includes("duplicate") || a.toLowerCase().includes("suspicious")),
            failMsg: "Duplicate QR Code Replay Attack Detected"
        },
        {
            id: "hash_integrity",
            title: "Cryptographic Batch Info Hash Integrity",
            desc: "Verifies batch parameters match on-chain manufacturer signature",
            passed: isGenuine && !anomalies.some(a => a.toLowerCase().includes("altered") || a.toLowerCase().includes("hash")),
            failMsg: "Altered Batch Parameters / Signature Hash Mismatch"
        },
        {
            id: "expiry_check",
            title: "Shelf-Life Expiry Date Verification",
            desc: "Inspects ledger timestamp against drug expiration date",
            passed: !isExpired,
            failMsg: "Medicine Past Expiration Date (Safety Hazard)"
        },
        {
            id: "custody_gap",
            title: "Supply-Chain Transaction Lineage Check",
            desc: "Verifies continuous custodian handoffs from factory to pharmacy",
            passed: !anomalies.some(a => a.toLowerCase().includes("gap") || a.toLowerCase().includes("skip")),
            failMsg: "Suspicious Custody Gap / Invalid Handover Transition"
        },
        {
            id: "authorized_seller",
            title: "Licensed Seller & Custodian Authorization",
            desc: "Verifies selling node holds licensed pharmaceutical credentials",
            passed: !anomalies.some(a => a.toLowerCase().includes("unauthorized") || a.toLowerCase().includes("seller")),
            failMsg: "Unauthorized / Unlicensed Seller Node Flagged"
        }
    ];

    const passedCount = checks.filter(c => c.passed).length;
    const isFullyGenuine = passedCount === checks.length && !isRecalled;

    return (
        <div className="glass-card" style={{
            padding: 22,
            background: isFullyGenuine ? "rgba(15, 23, 42, 0.95)" : "rgba(24, 15, 20, 0.95)",
            border: `1px solid ${isFullyGenuine ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.4)"}`,
            borderRadius: 16
        }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ padding: 8, borderRadius: 8, background: isFullyGenuine ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)", color: isFullyGenuine ? "#10b981" : "#ef4444" }}>
                        {isFullyGenuine ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
                    </div>
                    <div>
                        <h4 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#fff" }}>
                            Counterfeit Medicine Security Verification Matrix
                        </h4>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            6 Automated On-Chain Security Checks • Batch #{batchId}
                        </span>
                    </div>
                </div>

                <StatusBadge 
                    status={isFullyGenuine ? "AUTHENTIC" : "COUNTERFEIT"} 
                    label={isFullyGenuine ? "AUTHENTIC & VERIFIED" : `COUNTERFEIT THREAT (${passedCount}/6 PASSED)`}
                    size="lg"
                />
            </div>

            {/* 6 Threat Checks Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                {checks.map((check) => (
                    <div key={check.id} style={{
                        padding: 12,
                        borderRadius: 10,
                        background: check.passed ? "rgba(30, 41, 59, 0.5)" : "rgba(69, 10, 10, 0.4)",
                        border: `1px solid ${check.passed ? "rgba(255, 255, 255, 0.08)" : "rgba(239, 68, 68, 0.4)"}`,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10
                    }}>
                        <div style={{ marginTop: 2, flexShrink: 0 }}>
                            {check.passed ? (
                                <CheckCircle2 size={18} color="#10b981" />
                            ) : (
                                <XCircle size={18} color="#ef4444" />
                            )}
                        </div>
                        <div>
                            <h5 style={{ fontSize: "0.85rem", fontWeight: 700, margin: "0 0 2px 0", color: check.passed ? "#fff" : "#f87171" }}>
                                {check.title}
                            </h5>
                            <p style={{ fontSize: "0.73rem", color: check.passed ? "var(--text-muted)" : "#fca5a5", margin: 0 }}>
                                {check.passed ? check.desc : check.failMsg}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
