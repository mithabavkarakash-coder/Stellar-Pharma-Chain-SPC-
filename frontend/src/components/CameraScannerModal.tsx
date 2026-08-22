"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Camera, AlertCircle } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface CameraScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (decodedText: string) => void;
}

export default function CameraScannerModal({ isOpen, onClose, onScanSuccess }: CameraScannerModalProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [scannerError, setScannerError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const regionId = "camera-reader-region";
            const html5QrcodeScanner = new Html5Qrcode(regionId);
            scannerRef.current = html5QrcodeScanner;

            const config = { fps: 10, qrbox: { width: 240, height: 240 } };

            html5QrcodeScanner.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    console.log("QR Code scanned:", decodedText);
                    // Stop scanning on success
                    html5QrcodeScanner.stop().then(() => {
                        onScanSuccess(decodedText);
                        onClose();
                    }).catch((e) => console.error("Error stopping scanner:", e));
                },
                (_errorMessage) => {
                    // Ignore transient frame scan errors
                }
            ).then(() => {
                setScannerError(null);
            }).catch((err) => {
                console.warn("Camera access failed or unavailable:", err);
                setScannerError("Camera unavailable or permission denied. Please enter Batch ID manually or check browser camera permissions.");
            });

            return () => {
                if (scannerRef.current && scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch((e) => console.error(e));
                }
            };
        }
    }, [isOpen, onClose, onScanSuccess]);

    const extractBatchId = (text: string): string => {
        if (!text) return "";
        const clean = text.trim();
        // Check if full URL
        try {
            if (clean.startsWith("http://") || clean.startsWith("https://")) {
                const url = new URL(clean);
                const queryId = url.searchParams.get("id") || url.searchParams.get("lot");
                if (queryId) return queryId;
            }
        } catch (_e) {}

        // Check if GS1 Element String with (10) Lot / Batch
        const gs1LotMatch = clean.match(/\(10\)([A-Z0-9_-]+)/i);
        if (gs1LotMatch) return gs1LotMatch[1];

        return clean;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const html5Qrcode = new Html5Qrcode("camera-reader-region");
            const decodedText = await html5Qrcode.scanFile(file, true);
            const batchId = extractBatchId(decodedText);
            onScanSuccess(batchId);
            onClose();
        } catch (_err: any) {
            setScannerError("Could not decode QR code from uploaded image. Please try another clear image or enter Batch ID.");
        }
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
                maxWidth: 480,
                width: "100%",
                background: "#0f172a",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 16,
                padding: 24,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ padding: 8, borderRadius: 8, background: "rgba(59, 130, 246, 0.2)", color: "#3b82f6" }}>
                            <Camera size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#fff" }}>Live Camera & Image QR Scanner</h3>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Scan Packaging QR or Upload Image File</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Camera Region Element */}
                <div style={{
                    minHeight: 280,
                    background: "#020617",
                    borderRadius: 12,
                    border: "2px dashed rgba(255,255,255,0.2)",
                    overflow: "hidden",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    <div id="camera-reader-region" style={{ width: "100%", height: "100%" }} />

                    {scannerError && (
                        <div style={{ padding: 20, textAlign: "center", color: "#f87171" }}>
                            <AlertCircle size={32} style={{ margin: "0 auto 8px" }} />
                            <p style={{ fontSize: "0.85rem", margin: 0 }}>{scannerError}</p>
                        </div>
                    )}
                </div>

                {/* File Upload Option & Actions */}
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    <label className="btn btn-secondary flex-gap" style={{ width: "100%", justifyContent: "center", padding: "10px 0", cursor: "pointer", margin: 0 }}>
                        <span>📁 Upload QR Image File</span>
                        <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
                    </label>

                    <button
                        onClick={onClose}
                        className="btn btn-primary"
                        style={{ width: "100%", padding: "10px 0", fontSize: "0.9rem" }}
                    >
                        Close Scanner
                    </button>
                </div>
            </div>
        </div>
    );
}
