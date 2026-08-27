"use client";

import React from "react";

export function SkeletonCard() {
    return (
        <div className="glass-card" style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
            <div style={{ height: 20, width: "40%", background: "var(--bg-tertiary)", borderRadius: 4, marginBottom: 12 }} />
            <div style={{ height: 32, width: "70%", background: "var(--bg-tertiary)", borderRadius: 4, marginBottom: 16 }} />
            <div style={{ height: 16, width: "90%", background: "var(--bg-tertiary)", borderRadius: 4 }} />
        </div>
    );
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
    return (
        <div className="glass-card table-responsive" style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
            <div style={{ height: 24, width: "30%", background: "var(--bg-tertiary)", borderRadius: 4, marginBottom: 20 }} />
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 16, padding: "12px 0", borderBottom: "1px solid var(--border-glass)" }}>
                    <div style={{ height: 16, flex: 1, background: "var(--bg-tertiary)", borderRadius: 4 }} />
                    <div style={{ height: 16, flex: 2, background: "var(--bg-tertiary)", borderRadius: 4 }} />
                    <div style={{ height: 16, flex: 1, background: "var(--bg-tertiary)", borderRadius: 4 }} />
                </div>
            ))}
        </div>
    );
}

export function Spinner({ size = 20 }: { size?: number }) {
    return (
        <div
            style={{
                width: size,
                height: size,
                border: "2px solid rgba(255, 255, 255, 0.2)",
                borderTopColor: "var(--color-primary)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                display: "inline-block",
            }}
        />
    );
}

export default function SkeletonLoader({ count = 3 }: { count?: number }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}
