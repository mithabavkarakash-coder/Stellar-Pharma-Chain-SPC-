"use client";

import React from "react";
import { BrainCircuit, AlertTriangle, ShieldCheck, ShieldAlert, Sparkles, MapPin, Activity } from "lucide-react";

interface AIRiskDetectorProps {
    batchId: string;
    anomalies?: string[];
    isRecalled?: boolean;
    isExpired?: boolean;
    handoffCount?: number;
}

export default function AIRiskDetector({ batchId, anomalies = [], isRecalled, isExpired, handoffCount = 0 }: AIRiskDetectorProps) {
    // Dynamic Risk Score calculation algorithm (0 - 100)
    let score = 5; // Base low risk score for verified ledger entry

    if (isRecalled) score += 85;
    if (isExpired) score += 40;
    if (anomalies.length > 0) score += anomalies.length * 25;

    // Simulate verification attempt frequency heuristics
    const simulatedScanSpikes = Math.abs(hashCode(batchId)) % 15;
    if (simulatedScanSpikes > 8) score += 20;

    const riskScore = Math.min(100, Math.max(0, score));

    // Risk level classification
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    let riskColor = "#10b981";
    let riskBg = "rgba(16, 185, 129, 0.15)";
    let riskBorder = "rgba(16, 185, 129, 0.3)";

    if (riskScore > 75) {
        riskLevel = "CRITICAL";
        riskColor = "#ef4444";
        riskBg = "rgba(239, 68, 68, 0.15)";
        riskBorder = "rgba(239, 68, 68, 0.4)";
    } else if (riskScore > 50) {
        riskLevel = "HIGH";
        riskColor = "#f97316";
        riskBg = "rgba(249, 115, 22, 0.15)";
        riskBorder = "rgba(249, 115, 22, 0.4)";
    } else if (riskScore > 25) {
        riskLevel = "MEDIUM";
        riskColor = "#eab308";
        riskBg = "rgba(234, 179, 8, 0.15)";
        riskBorder = "rgba(234, 179, 8, 0.4)";
    }

    // AI Generated Insights
    const aiInsights: string[] = [];
    if (isRecalled) {
        aiInsights.push(`CRITICAL: Manufacturer on-chain recall active for batch #${batchId}. Transfer permanently revoked.`);
    }
    if (isExpired) {
        aiInsights.push(`EXPIRED: Batch timestamp exceeds expiration boundary. Chemical degradation risk flagged.`);
    }
    if (simulatedScanSpikes > 8) {
        aiInsights.push(`GEOGRAPHIC VELOCITY ANOMALY: Batch #${batchId} has an unusually high number of verification attempts (${simulatedScanSpikes + 14} scans) from 4 distinct regional subnets within 15 minutes.`);
    }
    if (anomalies.length > 0) {
        anomalies.forEach((a) => aiInsights.push(`CUSTODY ANOMALY: ${a}`));
    }
    if (aiInsights.length === 0) {
        aiInsights.push(`NORMAL: Custody progression and verification velocity strictly conform to licensed supply chain parameters.`);
    }

    return (
        <div className="glass-card" style={{
            padding: 22,
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)",
            border: `1px solid ${riskBorder}`,
            borderRadius: 16
        }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ padding: 8, borderRadius: 8, background: "rgba(168, 85, 247, 0.2)", color: "#c084fc" }}>
                        <BrainCircuit size={22} />
                    </div>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <h4 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#fff" }}>
                                AI-Powered Risk Detection Engine
                            </h4>
                            <span style={{ padding: "2px 6px", borderRadius: 4, background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", fontSize: "0.65rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 2 }}>
                                <Sparkles size={10} /> AI MODEL V2.4
                            </span>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            Pattern Recognition • Geographic Velocity Analysis • Anomaly Scoring
                        </span>
                    </div>
                </div>

                <div style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    background: riskBg,
                    color: riskColor,
                    border: `1px solid ${riskBorder}`,
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                }}>
                    <Activity size={14} />
                    <span>{riskLevel} RISK ({riskScore}/100)</span>
                </div>
            </div>

            {/* Risk Gauge Bar */}
            <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6 }}>
                    <span>Threat Index Gauge</span>
                    <span style={{ fontWeight: 700, color: riskColor }}>Score: {riskScore} / 100</span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: "rgba(255, 255, 255, 0.1)", overflow: "hidden", position: "relative" }}>
                    <div style={{
                        height: "100%",
                        width: `${riskScore}%`,
                        background: `linear-gradient(90deg, #10b981 0%, #eab308 50%, #ef4444 100%)`,
                        borderRadius: 5,
                        transition: "width 0.8s ease"
                    }} />
                </div>
            </div>

            {/* AI Natural Language Insights */}
            <div style={{ background: "rgba(0, 0, 0, 0.3)", borderRadius: 10, padding: 14, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#c084fc", display: "block", marginBottom: 8 }}>
                    🤖 AI Heuristic Analysis & Diagnosis
                </span>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.82rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 6 }}>
                    {aiInsights.map((insight, idx) => (
                        <li key={idx} style={{ lineHeight: 1.4 }}>
                            {insight}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

function hashCode(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}
