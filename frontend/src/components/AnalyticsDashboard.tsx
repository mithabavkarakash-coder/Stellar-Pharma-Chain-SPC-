import React from "react";
import { BarChart3, Activity } from "lucide-react";

interface AnalyticsProps {
    totalProduced?: number;
    totalSold?: number;
    activeBatches?: number;
    expiredCount?: number;
    counterfeitAttempts?: number;
}

export default function AnalyticsDashboard({
    totalProduced = 48500,
    totalSold = 31200,
    activeBatches = 142,
    expiredCount = 3,
    counterfeitAttempts = 7
}: AnalyticsProps) {
    // Analytics monthly bar data
    const monthlyData = [
        { month: "Jan", produced: 3200, sold: 2100 },
        { month: "Feb", produced: 4100, sold: 2800 },
        { month: "Mar", produced: 3800, sold: 3000 },
        { month: "Apr", produced: 5200, sold: 4100 },
        { month: "May", produced: 6100, sold: 4900 },
        { month: "Jun", produced: 7400, sold: 5800 },
        { month: "Jul", produced: 8900, sold: 6500 },
        { month: "Aug", produced: 9800, sold: 7200 }
    ];

    const maxProduced = Math.max(...monthlyData.map(d => d.produced));

    return (
        <div className="glass-card" style={{ padding: 24, borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ padding: 8, borderRadius: 8, background: "rgba(59, 130, 246, 0.2)", color: "#3b82f6" }}>
                        <BarChart3 size={22} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "#fff" }}>
                            Supply-Chain & Security Analytics Dashboard
                        </h3>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            On-Chain Ledger Activity • Production vs Dispense Metrics • Threat Telemetry
                        </span>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--color-success)", fontWeight: 700 }}>
                    <Activity size={14} className="status-pulse" />
                    <span>LIVE LEDGER AUDIT</span>
                </div>
            </div>

            {/* Top Metric Cards (6 Cards) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
                <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: 14, borderRadius: 10, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700 }}>MEDICINES PRODUCED</span>
                    <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#3b82f6", marginTop: 4 }}>{totalProduced.toLocaleString()}</div>
                    <span style={{ fontSize: "0.68rem", color: "#34d399" }}>↑ +14% this month</span>
                </div>

                <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: 14, borderRadius: 10, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700 }}>MEDICINES DISPENSED</span>
                    <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#10b981", marginTop: 4 }}>{totalSold.toLocaleString()}</div>
                    <span style={{ fontSize: "0.68rem", color: "#34d399" }}>64.3% fulfillment</span>
                </div>

                <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: 14, borderRadius: 10, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700 }}>ACTIVE BATCHES</span>
                    <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#c084fc", marginTop: 4 }}>{activeBatches}</div>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>In custody transit</span>
                </div>

                <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: 14, borderRadius: 10, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700 }}>EXPIRED BATCHES</span>
                    <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#f59e0b", marginTop: 4 }}>{expiredCount}</div>
                    <span style={{ fontSize: "0.68rem", color: "#f59e0b" }}>Quarantined hold</span>
                </div>

                <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: 14, borderRadius: 10, border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                    <span style={{ fontSize: "0.7rem", color: "#f87171", fontWeight: 700 }}>COUNTERFEIT ATTEMPTS</span>
                    <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#ef4444", marginTop: 4 }}>{counterfeitAttempts}</div>
                    <span style={{ fontSize: "0.68rem", color: "#ef4444" }}>Blocked on-chain</span>
                </div>

                <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: 14, borderRadius: 10, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700 }}>SYSTEM HEALTH</span>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#34d399", marginTop: 4 }}>99.98%</div>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Stellar Testnet node</span>
                </div>
            </div>

            {/* Monthly Production vs Dispense Bar Chart */}
            <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: 18, borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "#fff" }}>
                        Monthly Production & Dispense Volume (2026)
                    </h4>
                    <div style={{ display: "flex", gap: 16, fontSize: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: "#3b82f6" }} />
                            <span>Produced</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: "#10b981" }} />
                            <span>Dispensed to Patients</span>
                        </div>
                    </div>
                </div>

                {/* SVG Bar Chart */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 140, paddingTop: 10, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    {monthlyData.map((d, i) => {
                        const hProd = (d.produced / maxProduced) * 110;
                        const hSold = (d.sold / maxProduced) * 110;
                        return (
                            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                                <div style={{ display: "flex", gap: 3, alignItems: "flex-end", width: "100%", justifyContent: "center" }}>
                                    <div style={{ width: "40%", height: `${hProd}px`, background: "#3b82f6", borderRadius: "3px 3px 0 0" }} title={`Produced: ${d.produced}`} />
                                    <div style={{ width: "40%", height: `${hSold}px`, background: "#10b981", borderRadius: "3px 3px 0 0" }} title={`Sold: ${d.sold}`} />
                                </div>
                                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 6 }}>{d.month}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
