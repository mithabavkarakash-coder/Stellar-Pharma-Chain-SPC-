import React, { useMemo } from "react";
import { BarChart3, Activity, ShieldAlert, Package, Building2, Truck, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Batch, Supplier, Handoff } from "../types/pharma";
import { calculateBatchExpiryStatus } from "../utils/batchUtils";

interface AnalyticsProps {
    batches?: Batch[];
    suppliers?: Supplier[];
    handoffs?: Handoff[];
    loading?: boolean;
}

export default function AnalyticsDashboard({
    batches = [],
    suppliers = [],
    handoffs = [],
    loading = false
}: AnalyticsProps) {

    // Dynamic metrics calculation derived from real application data
    const metrics = useMemo(() => {
        const totalBatches = batches.length;
        if (totalBatches === 0) {
            return {
                uniqueMedicines: 0,
                totalUnits: 0,
                activeCount: 0,
                lowStockCount: 0,
                expiringCount: 0,
                expiredCount: 0,
                quarantinedCount: 0,
                recalledCount: 0,
                supplierCount: suppliers.length,
                mfgCount: suppliers.filter(s => s.type === "Manufacturer").length,
                distCount: suppliers.filter(s => s.type === "Distributor").length,
                pharmCount: suppliers.filter(s => s.type === "Pharmacy").length,
                txCount: handoffs.length,
                activePct: 0,
                expiringPct: 0,
                expiredPct: 0,
                quarantinedPct: 0,
                recalledPct: 0
            };
        }

        const uniqueMedicinesSet = new Set(batches.map(b => b.drug_name.trim().toLowerCase()));
        const uniqueMedicines = uniqueMedicinesSet.size;

        const totalUnits = batches.reduce((sum, b) => sum + (b.quantity || 0), 0);

        let activeCount = 0;
        let lowStockCount = 0;
        let expiringCount = 0;
        let expiredCount = 0;
        let quarantinedCount = 0;
        let recalledCount = 0;

        batches.forEach(b => {
            const expCalc = calculateBatchExpiryStatus(b);

            if (b.quantity < 1000 && !b.is_recalled) {
                lowStockCount++;
            }

            if (b.is_recalled) {
                recalledCount++;
            } else if (b.is_quarantined) {
                quarantinedCount++;
            } else if (expCalc.isExpired) {
                expiredCount++;
            } else if (expCalc.isExpiringSoon) {
                expiringCount++;
                activeCount++;
            } else {
                activeCount++;
            }
        });

        const activePct = Math.round((activeCount / totalBatches) * 100);
        const expiringPct = Math.round((expiringCount / totalBatches) * 100);
        const expiredPct = Math.round((expiredCount / totalBatches) * 100);
        const quarantinedPct = Math.round((quarantinedCount / totalBatches) * 100);
        const recalledPct = Math.round((recalledCount / totalBatches) * 100);

        const mfgCount = suppliers.filter(s => s.type === "Manufacturer").length;
        const distCount = suppliers.filter(s => s.type === "Distributor").length;
        const pharmCount = suppliers.filter(s => s.type === "Pharmacy").length;

        const txCount = handoffs.length;

        return {
            uniqueMedicines,
            totalUnits,
            activeCount,
            lowStockCount,
            expiringCount,
            expiredCount,
            quarantinedCount,
            recalledCount,
            supplierCount: suppliers.length,
            mfgCount,
            distCount,
            pharmCount,
            txCount,
            activePct,
            expiringPct,
            expiredPct,
            quarantinedPct,
            recalledPct
        };
    }, [batches, suppliers, handoffs]);

    if (loading) {
        return (
            <div className="glass-card" style={{ padding: 24, borderRadius: 16, textAlign: "center" }}>
                <Activity size={24} className="status-pulse" style={{ stroke: "var(--color-primary)", margin: "0 auto 8px" }} />
                <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.9rem" }}>Loading Supply-Chain Analytics...</p>
            </div>
        );
    }

    return (
        <div className="glass-card" style={{ padding: 24, borderRadius: 16 }}>
            {/* Title Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ padding: 8, borderRadius: 8, background: "rgba(59, 130, 246, 0.2)", color: "#3b82f6" }}>
                        <BarChart3 size={22} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "#fff" }}>
                            Supply-Chain & Ledger Analytics Dashboard
                        </h3>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            Real-Time Application Metrics • {batches.length} Registered Batches • {metrics.supplierCount} Verified Suppliers
                        </span>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--color-success)", fontWeight: 700 }}>
                    <Activity size={14} className="status-pulse" />
                    <span>SOROBAN LEDGER AUDITED</span>
                </div>
            </div>

            {/* Top Metric Cards Grid (6 Metric Cards) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
                <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: 14, borderRadius: 10, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700 }}>UNIQUE MEDICINES</span>
                    <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#60a5fa", marginTop: 4 }}>{metrics.uniqueMedicines}</div>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Active catalog formulations</span>
                </div>

                <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: 14, borderRadius: 10, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700 }}>ACTIVE BATCHES</span>
                    <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#34d399", marginTop: 4 }}>{metrics.activeCount}</div>
                    <span style={{ fontSize: "0.68rem", color: "#34d399" }}>Valid & in transit</span>
                </div>

                <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: 14, borderRadius: 10, border: `1px solid ${metrics.lowStockCount > 0 ? "rgba(245, 158, 11, 0.4)" : "rgba(255, 255, 255, 0.08)"}` }}>
                    <span style={{ fontSize: "0.7rem", color: metrics.lowStockCount > 0 ? "#fbbf24" : "var(--text-muted)", fontWeight: 700 }}>LOW-STOCK ITEMS</span>
                    <div style={{ fontSize: "1.4rem", fontWeight: 900, color: metrics.lowStockCount > 0 ? "#fbbf24" : "#fff", marginTop: 4 }}>{metrics.lowStockCount}</div>
                    <span style={{ fontSize: "0.68rem", color: metrics.lowStockCount > 0 ? "#fbbf24" : "var(--text-muted)" }}>&lt; 1,000 unit threshold</span>
                </div>

                <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: 14, borderRadius: 10, border: `1px solid ${metrics.expiringCount > 0 ? "rgba(245, 158, 11, 0.4)" : "rgba(255, 255, 255, 0.08)"}` }}>
                    <span style={{ fontSize: "0.7rem", color: metrics.expiringCount > 0 ? "#fbbf24" : "var(--text-muted)", fontWeight: 700 }}>EXPIRING (&lt; 90 DAYS)</span>
                    <div style={{ fontSize: "1.4rem", fontWeight: 900, color: metrics.expiringCount > 0 ? "#fbbf24" : "#fff", marginTop: 4 }}>{metrics.expiringCount}</div>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Requires priority dispatch</span>
                </div>

                <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: 14, borderRadius: 10, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700 }}>REGISTERED SUPPLIERS</span>
                    <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#c084fc", marginTop: 4 }}>{metrics.supplierCount}</div>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{metrics.mfgCount} Mfg • {metrics.distCount} Dist • {metrics.pharmCount} Rx</span>
                </div>

                <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: 14, borderRadius: 10, border: `1px solid ${metrics.recalledCount + metrics.quarantinedCount > 0 ? "rgba(239, 68, 68, 0.4)" : "rgba(255, 255, 255, 0.08)"}` }}>
                    <span style={{ fontSize: "0.7rem", color: metrics.recalledCount + metrics.quarantinedCount > 0 ? "#f87171" : "var(--text-muted)", fontWeight: 700 }}>QUARANTINE & RECALLS</span>
                    <div style={{ fontSize: "1.4rem", fontWeight: 900, color: metrics.recalledCount + metrics.quarantinedCount > 0 ? "#ef4444" : "#34d399", marginTop: 4 }}>{metrics.quarantinedCount + metrics.recalledCount}</div>
                    <span style={{ fontSize: "0.68rem", color: metrics.recalledCount + metrics.quarantinedCount > 0 ? "#f87171" : "#34d399" }}>
                        {metrics.recalledCount > 0 ? `${metrics.recalledCount} Recalled` : "Zero safety alerts"}
                    </span>
                </div>
            </div>

            {/* Dynamic Charts Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
                
                {/* Chart 1: Batch Health Status Distribution */}
                <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: 18, borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div className="flex-between" style={{ marginBottom: 12 }}>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "#fff" }}>
                            Batch Health Status Breakdown
                        </h4>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total: {batches.length}</span>
                    </div>

                    {/* Multi-Segment Health Progress Bar */}
                    <div style={{ height: 12, background: "rgba(255,255,255,0.06)", borderRadius: 6, display: "flex", overflow: "hidden", marginBottom: 14 }}>
                        <div style={{ width: `${metrics.activePct}%`, background: "#10b981" }} title={`Active: ${metrics.activeCount} (${metrics.activePct}%)`} />
                        <div style={{ width: `${metrics.expiringPct}%`, background: "#f59e0b" }} title={`Expiring Soon: ${metrics.expiringCount} (${metrics.expiringPct}%)`} />
                        <div style={{ width: `${metrics.expiredPct}%`, background: "#ef4444" }} title={`Expired: ${metrics.expiredCount} (${metrics.expiredPct}%)`} />
                        <div style={{ width: `${metrics.quarantinedPct}%`, background: "#c084fc" }} title={`Quarantined: ${metrics.quarantinedCount} (${metrics.quarantinedPct}%)`} />
                        <div style={{ width: `${metrics.recalledPct}%`, background: "#b91c1c" }} title={`Recalled: ${metrics.recalledCount} (${metrics.recalledPct}%)`} />
                    </div>

                    {/* Breakdown Badges */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                            <span>Active: <strong>{metrics.activeCount}</strong></span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                            <span>Expiring Soon: <strong>{metrics.expiringCount}</strong></span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                            <span>Expired: <strong>{metrics.expiredCount}</strong></span>
                        </div>
                        {metrics.quarantinedCount > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c084fc" }} />
                                <span>Quarantined: <strong>{metrics.quarantinedCount}</strong></span>
                            </div>
                        )}
                        {metrics.recalledCount > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#b91c1c" }} />
                                <span>Recalled: <strong>{metrics.recalledCount}</strong></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chart 2: Supplier Network Node Distribution */}
                <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: 18, borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div className="flex-between" style={{ marginBottom: 12 }}>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "#fff" }}>
                            Registered Network Custodian Nodes
                        </h4>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total: {metrics.supplierCount} Nodes</span>
                    </div>

                    {/* Progress Segment */}
                    <div style={{ height: 12, background: "rgba(255,255,255,0.06)", borderRadius: 6, display: "flex", overflow: "hidden", marginBottom: 14 }}>
                        <div style={{ width: `${metrics.supplierCount > 0 ? (metrics.mfgCount / metrics.supplierCount) * 100 : 0}%`, background: "#3b82f6" }} />
                        <div style={{ width: `${metrics.supplierCount > 0 ? (metrics.distCount / metrics.supplierCount) * 100 : 0}%`, background: "#c084fc" }} />
                        <div style={{ width: `${metrics.supplierCount > 0 ? (metrics.pharmCount / metrics.supplierCount) * 100 : 0}%`, background: "#10b981" }} />
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
                            <span>Manufacturers: <strong>{metrics.mfgCount}</strong></span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c084fc" }} />
                            <span>Distributors: <strong>{metrics.distCount}</strong></span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                            <span>Pharmacies: <strong>{metrics.pharmCount}</strong></span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

