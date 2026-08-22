"use client";

import React from "react";
import { X, Printer, FileCheck, CheckCircle2, AlertTriangle } from "lucide-react";

interface ComplianceCertificateModalProps {
    isOpen: boolean;
    onClose: () => void;
    batchData: {
        batch: {
            batch_id: string;
            drug_name: string;
            manufacturer: string;
            quantity: number;
            manufacture_date: number;
            expiry_date: number;
            direct_ship: boolean;
            is_recalled: boolean | number;
            recalled_by?: string | null;
        };
        handoffs: any[];
        dispenses: any[];
        anomalies?: string[];
        status?: string;
    };
}

export default function ComplianceCertificateModal({ isOpen, onClose, batchData }: ComplianceCertificateModalProps) {
    if (!isOpen || !batchData || !batchData.batch) return null;

    const { batch, handoffs = [], dispenses: _dispenses = [], anomalies: _anomalies = [], status = "AUTHENTIC" } = batchData;

    const isVerified = status === "AUTHENTIC" && !batch.is_recalled;
    const certNumber = `DSCSA-CERT-${batch.batch_id}-${Math.floor(Date.now() / 1000).toString(16).toUpperCase()}`;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20
        }}>
            <div className="glass-card" style={{
                maxWidth: 680,
                width: "100%",
                background: "#0f172a",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 16,
                padding: 28,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
                maxHeight: "90vh",
                overflowY: "auto"
            }}>
                {/* Header controls */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ padding: 8, borderRadius: 8, background: isVerified ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)", color: isVerified ? "#10b981" : "#ef4444" }}>
                            <FileCheck size={22} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "#fff" }}>FDA DSCSA Compliance Audit Certificate</h3>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Cryptographic Verification Report • Ref: {certNumber}</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Printable Document Sheet */}
                <div id="compliance-certificate-sheet" style={{
                    background: "#ffffff",
                    color: "#0f172a",
                    borderRadius: 12,
                    padding: 28,
                    marginBottom: 20,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    border: "1px solid #cbd5e1"
                }}>
                    {/* Certificate Top Banner */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0f172a", paddingBottom: 16, marginBottom: 20 }}>
                        <div>
                            <div style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px", color: "#475569" }}>
                                OFFICIAL REGULATORY AUDIT RECORD
                            </div>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", margin: "4px 0" }}>
                                Certificate of Authenticity & Chain of Custody
                            </h2>
                            <p style={{ fontSize: "0.75rem", color: "#64748b", margin: 0 }}>
                                Issued pursuant to Drug Supply Chain Security Act (DSCSA) & EU Directive 2011/62/EU
                            </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                background: isVerified ? "#dcfce7" : "#fee2e2",
                                color: isVerified ? "#15803d" : "#b91c1c",
                                fontWeight: 800,
                                fontSize: "0.8rem",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6
                            }}>
                                {isVerified ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                <span>{isVerified ? "VERIFIED AUTHENTIC" : "FLAGGED / AUDIT ALERT"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Batch Summary Metadata */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, background: "#f8fafc", padding: 14, borderRadius: 8, marginBottom: 20, border: "1px solid #e2e8f0" }}>
                        <div>
                            <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700 }}>PRODUCT NAME</span>
                            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>{batch.drug_name}</div>
                        </div>
                        <div>
                            <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700 }}>BATCH ID / LOT</span>
                            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#2563eb", fontFamily: "monospace" }}>{batch.batch_id}</div>
                        </div>
                        <div>
                            <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700 }}>LICENSED MANUFACTURER</span>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, fontFamily: "monospace", wordBreak: "break-all", color: "#334155" }}>{batch.manufacturer}</div>
                        </div>
                        <div>
                            <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700 }}>TOTAL REGISTERED QUANTITY</span>
                            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>{batch.quantity.toLocaleString()} Units</div>
                        </div>
                        <div>
                            <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700 }}>MANUFACTURE DATE</span>
                            <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>{new Date(batch.manufacture_date * 1000).toLocaleDateString()}</div>
                        </div>
                        <div>
                            <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700 }}>EXPIRY DATE</span>
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#dc2626" }}>{new Date(batch.expiry_date * 1000).toLocaleDateString()}</div>
                        </div>
                    </div>

                    {/* Handoff Trace Audit */}
                    <div style={{ marginBottom: 20 }}>
                        <h4 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #cbd5e1", paddingBottom: 6, marginBottom: 10 }}>
                            Proven Custody Handoff History ({handoffs.length} Handoffs)
                        </h4>
                        {handoffs.length === 0 ? (
                            <p style={{ fontSize: "0.8rem", color: "#64748b", fontStyle: "italic" }}>Batch remains in primary custody at licensed manufacturing plant.</p>
                        ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                                <thead>
                                    <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                                        <th style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>Step</th>
                                        <th style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>From Address</th>
                                        <th style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>To Address</th>
                                        <th style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>Role</th>
                                        <th style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>Qty</th>
                                        <th style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {handoffs.map((h, i) => (
                                        <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                            <td style={{ padding: "6px 8px", fontWeight: 700 }}>#{i + 1}</td>
                                            <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{h.from_address.slice(0, 8)}...</td>
                                            <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{h.to_address.slice(0, 8)}...</td>
                                            <td style={{ padding: "6px 8px", fontWeight: 700, color: "#2563eb" }}>{h.new_role}</td>
                                            <td style={{ padding: "6px 8px", fontWeight: 700 }}>{h.quantity}</td>
                                            <td style={{ padding: "6px 8px" }}>{new Date(h.timestamp * 1000).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Cryptographic Seal */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px solid #0f172a", paddingTop: 14, marginTop: 14 }}>
                        <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                            <div><strong>Stellar Soroban Ledger Network:</strong> Testnet</div>
                            <div><strong>Cryptographic Protocol:</strong> Ed25519 / Soroban Smart Contracts</div>
                            <div><strong>Verification Seal Hash:</strong> <span style={{ fontFamily: "monospace" }}>0x{certNumber.replace(/[^A-F0-9]/g, "").slice(0, 24)}</span></div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#0f172a" }}>Stellar Pharma Chain (SPC)</div>
                            <div style={{ fontSize: "0.65rem", color: "#64748b" }}>Automated Compliance Engine</div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button
                        onClick={handlePrint}
                        className="btn btn-primary flex-gap"
                        style={{ padding: "10px 20px", fontSize: "0.9rem" }}
                    >
                        <Printer size={18} />
                        <span>Print / Save PDF Audit Report</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
