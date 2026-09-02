import React, { useState } from "react";
import Link from "next/link";
import { Search, QrCode, ArrowRight } from "lucide-react";
import { Batch } from "@/types/pharma";
import StatusBadge from "./ui/StatusBadge";
import { calculateBatchExpiryStatus, formatSafeDate, formatSupplierAddress } from "../utils/batchUtils";

export type MedicineRecord = Batch & {
    current_custodian?: string;
    current_role?: string;
};

interface MedicineTrackingTableProps {
    batches: MedicineRecord[];
    onViewGS1?: (batch: MedicineRecord) => void;
}

export default function MedicineTrackingTable({ batches, onViewGS1 }: MedicineTrackingTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "SAFE" | "EXPIRING" | "EXPIRED" | "RECALLED">("ALL");

    // Filter logic using safe batch calculation
    const filteredBatches = batches.filter((b) => {
        const drugName = b.drug_name || "";
        const batchId = b.batch_id || "";
        const mfg = b.manufacturer || "";
        const matchesSearch = drugName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              batchId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              mfg.toLowerCase().includes(searchTerm.toLowerCase());
        
        const calc = calculateBatchExpiryStatus(b);

        if (statusFilter === "EXPIRED") return matchesSearch && calc.isExpired;
        if (statusFilter === "EXPIRING") return matchesSearch && calc.isExpiringSoon;
        if (statusFilter === "SAFE") return matchesSearch && calc.status === "ACTIVE";
        if (statusFilter === "RECALLED") return matchesSearch && b.is_recalled;

        return matchesSearch;
    });

    const getExpiryBadge = (batch: MedicineRecord) => {
        const calc = calculateBatchExpiryStatus(batch);
        return <StatusBadge status={calc.badgeStatus} label={calc.label} size="sm" />;
    };

    return (
        <div className="glass-card" style={{ padding: 24, borderRadius: 16 }}>
            {/* Header & Filter Controls */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "#fff" }}>
                            Medicine Tracking & Expiry Alerts Dashboard
                        </h3>
                        <span className="badge badge-blue" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>
                            🛡️ Soroban Ledger Verified
                        </span>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Real-time Medicine Inventory • Custody Handoffs • Expiry Status
                    </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, flex: 1, justifyContent: "flex-end", maxWidth: 600 }}>
                    {/* Search Input */}
                    <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                        <input
                            type="text"
                            placeholder="Search Medicine ID / Name / Mfg..."
                            className="form-control"
                            style={{ paddingLeft: 36, fontSize: "0.85rem" }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    </div>

                    {/* Expiry Filter Pills */}
                    <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.3)", padding: 4, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
                        {(["ALL", "SAFE", "EXPIRING", "EXPIRED", "RECALLED"] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setStatusFilter(filter)}
                                style={{
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    border: "none",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    background: statusFilter === filter ? "var(--color-primary)" : "transparent",
                                    color: statusFilter === filter ? "#fff" : "var(--text-muted)"
                                }}
                            >
                                {filter === "ALL" && "All"}
                                {filter === "SAFE" && "🟢 Active / Safe"}
                                {filter === "EXPIRING" && "🟡 Expiring"}
                                {filter === "EXPIRED" && "🔴 Expired"}
                                {filter === "RECALLED" && "🚨 Recalled"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Medicine Tracking Table */}
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                        <tr style={{ background: "rgba(30, 41, 59, 0.6)", color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.5px", textAlign: "left" }}>
                            <th style={{ padding: "12px 14px", borderRadius: "8px 0 0 8px" }}>Medicine Name & ID</th>
                            <th style={{ padding: "12px 14px" }}>Manufacturer / Supplier</th>
                            <th style={{ padding: "12px 14px" }}>Mfg Date</th>
                            <th style={{ padding: "12px 14px" }}>Expiry Date</th>
                            <th style={{ padding: "12px 14px" }}>Current Custodian</th>
                            <th style={{ padding: "12px 14px" }}>Batch Status</th>
                            <th style={{ padding: "12px 14px", textAnchor: "end", borderRadius: "0 8px 8px 0" }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBatches.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                                    No medicines match the selected filter criteria.
                                </td>
                            </tr>
                        ) : (
                            filteredBatches.map((b) => (
                                <tr key={b.batch_id || Math.random().toString()} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)", transition: "background 0.2s" }} className="hover:bg-slate-800/40">
                                    <td style={{ padding: "12px 14px" }}>
                                        <div style={{ fontWeight: 700, color: "#fff" }}>{b.drug_name || "Unnamed Medicine"}</div>
                                        <code style={{ fontSize: "0.72rem", color: "#3b82f6" }}>#{b.batch_id || "N/A"}</code>
                                    </td>
                                    <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: "0.78rem" }}>
                                        {formatSupplierAddress(b.manufacturer)}
                                    </td>
                                    <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>
                                        {formatSafeDate(b.manufacture_date)}
                                    </td>
                                    <td style={{ padding: "12px 14px" }}>
                                        {formatSafeDate(b.expiry_date)}
                                    </td>
                                    <td style={{ padding: "12px 14px" }}>
                                        <span className="badge badge-blue" style={{ fontSize: "0.7rem" }}>
                                            {b.current_role || "Manufacturer"}
                                        </span>
                                    </td>
                                    <td style={{ padding: "12px 14px" }}>
                                        {getExpiryBadge(b)}
                                    </td>
                                    <td style={{ padding: "12px 14px" }}>
                                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                            {onViewGS1 && (
                                                <button
                                                    onClick={() => onViewGS1(b)}
                                                    className="btn btn-secondary"
                                                    style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                                                    title="View GS1 2D DataMatrix Label"
                                                >
                                                    <QrCode size={14} />
                                                </button>
                                            )}
                                            <Link
                                                href={`/verify?id=${encodeURIComponent(b.batch_id || "")}`}
                                                className="btn btn-primary flex-gap"
                                                style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                                            >
                                                <span>Trace</span>
                                                <ArrowRight size={12} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
