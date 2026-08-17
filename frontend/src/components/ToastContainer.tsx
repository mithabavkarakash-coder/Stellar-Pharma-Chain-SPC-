"use client";

import React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, X } from "lucide-react";

export interface ToastMessage {
    id: string;
    type: "success" | "error" | "warning" | "info";
    title: string;
    description?: string;
}

interface Props {
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: Props) {
    if (toasts.length === 0) return null;

    return (
        <div
            style={{
                position: "fixed",
                bottom: 24,
                right: 24,
                zIndex: 99999,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                maxWidth: 380,
                width: "100%",
            }}
        >
            {toasts.map((toast) => {
                const isSuccess = toast.type === "success";
                const isError = toast.type === "error";
                const isWarning = toast.type === "warning";

                const borderColor = isSuccess ? "var(--color-success)" : isError ? "var(--color-danger)" : isWarning ? "var(--color-warning)" : "var(--color-primary)";
                const Icon = isSuccess ? CheckCircle2 : isError ? AlertCircle : AlertTriangle;

                return (
                    <div
                        key={toast.id}
                        className="glass-card"
                        style={{
                            padding: "14px 16px",
                            borderLeft: `4px solid ${borderColor}`,
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 12,
                            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                            animation: "slideIn 0.3s ease-out",
                        }}
                    >
                        <Icon style={{ width: 20, height: 20, stroke: borderColor, flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>{toast.title}</div>
                            {toast.description && (
                                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>{toast.description}</div>
                            )}
                        </div>
                        <button
                            onClick={() => onDismiss(toast.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}
                        >
                            <X style={{ width: 14, height: 14 }} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
