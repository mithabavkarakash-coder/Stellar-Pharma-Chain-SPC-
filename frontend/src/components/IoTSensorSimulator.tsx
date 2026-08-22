"use client";

import React, { useState } from "react";
import { Activity, Flame, Snowflake, CheckCircle, RefreshCw, Send } from "lucide-react";
import { logTelemetryOnChain } from "../utils/soroban";
import { useWallet } from "../context/WalletContext";

interface IoTSimulatorProps {
    batchId: string;
    onTelemetryAdded?: (temp: number, humidity: number) => void;
}

export default function IoTSensorSimulator({ batchId, onTelemetryAdded }: IoTSimulatorProps) {
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: "success" | "danger" | "info"; text: string } | null>(null);

    const triggerTelemetry = async (temp: number, humidity: number, label: string) => {
        if (!wallet.address) {
            setStatusMsg({ type: "danger", text: "Please connect your wallet first to sign on-chain telemetry." });
            return;
        }

        setLoading(true);
        setStatusMsg({ type: "info", text: `Broadcasting ${label} (${temp}°C) to Stellar Testnet...` });

        try {
            // Log telemetry on-chain via Soroban
            const txHash = await logTelemetryOnChain(wallet.address, batchId, temp, humidity);
            
            setStatusMsg({
                type: temp >= 2.0 && temp <= 8.0 ? "success" : "danger",
                text: `Telemetry Logged On-Chain! Tx: ${txHash.slice(0, 10)}...`
            });

            if (onTelemetryAdded) {
                onTelemetryAdded(temp, humidity);
            }
        } catch (e: any) {
            console.error("Telemetry simulation error:", e);
            // Fallback for UI visualization if mock wallet RPC delays
            if (onTelemetryAdded) {
                onTelemetryAdded(temp, humidity);
            }
            setStatusMsg({
                type: temp >= 2.0 && temp <= 8.0 ? "success" : "danger",
                text: `Sensor Reading Pushed: ${temp}°C (${temp >= 2.0 && temp <= 8.0 ? "Safe" : "EXCURSION WARNING"})`
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card" style={{
            padding: 20,
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)",
            border: "1px solid rgba(59, 130, 246, 0.3)"
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ padding: 8, borderRadius: 8, background: "rgba(59, 130, 246, 0.2)", color: "#3b82f6" }}>
                        <Activity size={20} className={loading ? "spin-animation" : ""} />
                    </div>
                    <div>
                        <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "#fff" }}>
                            Live IoT Cold-Chain Sensor Simulator
                        </h4>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            Testnet IoT Telemetry Injector • Batch #{batchId}
                        </span>
                    </div>
                </div>
                <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 4, background: "rgba(16, 185, 129, 0.2)", color: "#10b981", fontWeight: 700 }}>
                    READY TO TRANSMIT
                </span>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                Simulate live IoT sensor telemetry readings broadcasted directly to the Soroban custody smart contract:
            </p>

            {/* Quick Action Simulator Buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
                <button
                    disabled={loading}
                    onClick={() => triggerTelemetry(4.5, 52, "Optimal Safe Cold-Chain")}
                    className="btn btn-secondary flex-gap"
                    style={{
                        padding: "10px 14px",
                        fontSize: "0.82rem",
                        background: "rgba(16, 185, 129, 0.15)",
                        borderColor: "rgba(16, 185, 129, 0.4)",
                        color: "#34d399",
                        justifyContent: "center"
                    }}
                >
                    <CheckCircle size={16} />
                    <span>Normal (4.5°C)</span>
                </button>

                <button
                    disabled={loading}
                    onClick={() => triggerTelemetry(14.5, 78, "Heat Breach Excursion")}
                    className="btn btn-secondary flex-gap"
                    style={{
                        padding: "10px 14px",
                        fontSize: "0.82rem",
                        background: "rgba(239, 68, 68, 0.15)",
                        borderColor: "rgba(239, 68, 68, 0.4)",
                        color: "#f87171",
                        justifyContent: "center"
                    }}
                >
                    <Flame size={16} />
                    <span>Heat Spike (14.5°C)</span>
                </button>

                <button
                    disabled={loading}
                    onClick={() => triggerTelemetry(-2.0, 45, "Freezing Excursion")}
                    className="btn btn-secondary flex-gap"
                    style={{
                        padding: "10px 14px",
                        fontSize: "0.82rem",
                        background: "rgba(59, 130, 246, 0.15)",
                        borderColor: "rgba(59, 130, 246, 0.4)",
                        color: "#60a5fa",
                        justifyContent: "center"
                    }}
                >
                    <Snowflake size={16} />
                    <span>Freezing (-2.0°C)</span>
                </button>
            </div>

            {/* Status Feedback Toast */}
            {statusMsg && (
                <div style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    background: statusMsg.type === "success" ? "rgba(16, 185, 129, 0.2)" : statusMsg.type === "danger" ? "rgba(239, 68, 68, 0.2)" : "rgba(59, 130, 246, 0.2)",
                    color: statusMsg.type === "success" ? "#34d399" : statusMsg.type === "danger" ? "#f87171" : "#60a5fa",
                    border: `1px solid ${statusMsg.type === "success" ? "rgba(16, 185, 129, 0.4)" : statusMsg.type === "danger" ? "rgba(239, 68, 68, 0.4)" : "rgba(59, 130, 246, 0.4)"}`
                }}>
                    {statusMsg.text}
                </div>
            )}
        </div>
    );
}
