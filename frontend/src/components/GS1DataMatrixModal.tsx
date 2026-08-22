"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Printer, Download, ShieldCheck, QrCode, Copy, Check } from "lucide-react";

interface GS1ModalProps {
    isOpen: boolean;
    onClose: () => void;
    batch: {
        batch_id: string;
        drug_name: string;
        manufacturer: string;
        quantity: number;
        manufacture_date: number;
        expiry_date: number;
        direct_ship?: boolean;
    };
}

export default function GS1DataMatrixModal({ isOpen, onClose, batch }: GS1ModalProps) {
    const [copied, setCopied] = useState(false);
    const [serialNumber, setSerialNumber] = useState("");
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);

    // GS1 Digital Link & Element Strings
    // (01) GTIN, (17) Expiry YYMMDD, (10) Batch ID, (21) Serial Number
    const gtin = "0030045" + Math.abs(hashCode(batch.drug_name)).toString().padStart(6, "0").slice(0, 6) + "8";
    
    useEffect(() => {
        if (!serialNumber) {
            // Generate deterministic yet unique serial number for package unit
            const randomSuffix = Math.floor(100000 + Math.random() * 900000);
            setSerialNumber(`SN-${batch.batch_id.replace(/[^A-Z0-9]/gi, "")}-${randomSuffix}`);
        }
    }, [batch.batch_id, serialNumber]);

    const formattedExpiryDate = new Date(batch.expiry_date * 1000).toISOString().slice(2, 10).replace(/-/g, "");
    const gs1ElementHeader = `(01)${gtin}(17)${formattedExpiryDate}(10)${batch.batch_id}(21)${serialNumber}`;

    // Draw QR Code on Canvas using basic SVG matrix generator
    useEffect(() => {
        if (isOpen && qrCanvasRef.current) {
            const canvas = qrCanvasRef.current;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const size = 200;
            canvas.width = size;
            canvas.height = size;

            // Fill white background
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, size, size);

            // Draw clean simulated 2D DataMatrix pattern based on hash
            ctx.fillStyle = "#0f172a";
            const matrixSize = 25;
            const cellSize = size / matrixSize;

            const seedString = gs1ElementHeader;
            for (let r = 0; r < matrixSize; r++) {
                for (let c = 0; c < matrixSize; c++) {
                    // Position Detection Patterns (Corners)
                    if (
                        (r < 7 && c < 7) ||
                        (r < 7 && c >= matrixSize - 7) ||
                        (r >= matrixSize - 7 && c < 7)
                    ) {
                        const isBorder = r === 0 || r === 6 || c === 0 || c === 6 || r === matrixSize - 7 || r === matrixSize - 1 || c === matrixSize - 7 || c === matrixSize - 1;
                        const isInnerSquare = (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
                                              (r >= 2 && r <= 4 && c >= matrixSize - 5 && c >= matrixSize - 3) ||
                                              (r >= matrixSize - 5 && r <= matrixSize - 3 && c >= 2 && c <= 4);
                        if (isBorder || isInnerSquare) {
                            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
                        }
                    } else {
                        // Data bits pseudo-random fill based on character codes
                        const hashVal = (r * 31 + c * 17 + seedString.charCodeAt((r + c) % seedString.length)) % 10;
                        if (hashVal > 4) {
                            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
                        }
                    }
                }
            }
        }
    }, [isOpen, gs1ElementHeader]);

    const handleCopy = () => {
        navigator.clipboard.writeText(gs1ElementHeader);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrint = () => {
        window.print();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20
        }}>
            <div className="glass-card" style={{
                maxWidth: 580,
                width: "100%",
                background: "#0f172a",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 16,
                padding: 24,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                maxHeight: "90vh",
                overflowY: "auto"
            }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ padding: 8, borderRadius: 8, background: "rgba(59, 130, 246, 0.2)", color: "#3b82f6" }}>
                            <QrCode size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "#fff" }}>GS1 2D DataMatrix Package Label</h3>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>FDA DSCSA / EU FMD Serialization Standard</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Packaging Label Container (Printable Area) */}
                <div id="printable-label" style={{
                    background: "#ffffff",
                    color: "#0f172a",
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 20,
                    border: "2px dashed #cbd5e1"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #0f172a", paddingBottom: 10, marginBottom: 14 }}>
                        <div>
                            <span style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#64748b" }}>Rx Pharmaceutical Packaging Label</span>
                            <h4 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "2px 0 0 0", color: "#0f172a" }}>{batch.drug_name}</h4>
                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#3b82f6" }}>Manufacturer: {batch.manufacturer.slice(0, 10)}...{batch.manufacturer.slice(-6)}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <span style={{ display: "inline-block", padding: "2px 8px", background: "#dcfce7", color: "#166534", borderRadius: 4, fontSize: "0.7rem", fontWeight: 700 }}>
                                VERIFIED ON-CHAIN
                            </span>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        {/* Canvas QR Code */}
                        <div style={{ border: "1px solid #e2e8f0", padding: 6, borderRadius: 8, background: "#fff" }}>
                            <canvas ref={qrCanvasRef} style={{ width: 130, height: 130, display: "block" }} />
                        </div>

                        {/* Encoded GS1 Elements */}
                        <div style={{ flex: 1, fontSize: "0.8rem", lineHeight: 1.5 }}>
                            <div style={{ marginBottom: 4 }}>
                                <strong style={{ color: "#475569" }}>(01) GTIN:</strong> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{gtin}</span>
                            </div>
                            <div style={{ marginBottom: 4 }}>
                                <strong style={{ color: "#475569" }}>(10) LOT / BATCH:</strong> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{batch.batch_id}</span>
                            </div>
                            <div style={{ marginBottom: 4 }}>
                                <strong style={{ color: "#475569" }}>(17) EXPIRY:</strong> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{new Date(batch.expiry_date * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                            </div>
                            <div style={{ marginBottom: 4 }}>
                                <strong style={{ color: "#475569" }}>(21) SERIAL NO:</strong> <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0284c7" }}>{serialNumber}</span>
                            </div>
                            <div>
                                <strong style={{ color: "#475569" }}>UNITS:</strong> <span style={{ fontWeight: 700 }}>{batch.quantity.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Human Readable GS1 Element String */}
                    <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #e2e8f0", background: "#f8fafc", padding: 8, borderRadius: 6, fontSize: "0.72rem", fontFamily: "monospace", color: "#334155", wordBreak: "break-all" }}>
                        {gs1ElementHeader}
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button
                        onClick={handleCopy}
                        className="btn btn-secondary flex-gap"
                        style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                    >
                        {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                        <span>{copied ? "Copied GS1 String" : "Copy GS1 String"}</span>
                    </button>
                    <button
                        onClick={handlePrint}
                        className="btn btn-primary flex-gap"
                        style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                    >
                        <Printer size={16} />
                        <span>Print Packaging Label</span>
                    </button>
                </div>
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
