"use client";

import React from "react";
import { Thermometer, Droplets } from "lucide-react";

export interface TelemetryPoint {
    time: string;
    temp: number; // in Celsius
    humidity: number; // in percentage
    isExcursion?: boolean;
}

interface TelemetryChartProps {
    data: TelemetryPoint[];
    batchId?: string;
}

export default function LiveTelemetryChart({ data, batchId }: TelemetryChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="glass-card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
                <Thermometer style={{ margin: "0 auto 8px", opacity: 0.5 }} size={32} />
                <p style={{ margin: 0, fontSize: "0.9rem" }}>No telemetry logs recorded yet for this shipment.</p>
            </div>
        );
    }

    // Chart dimensions
    const width = 600;
    const height = 180;
    const padding = { top: 20, right: 30, bottom: 30, left: 40 };

    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    // Temperature bounds for chart rendering (-5°C to +20°C range)
    const minTemp = -5;
    const maxTemp = 20;

    // Y coordinate mapping function (0°C at bottom, 20°C at top)
    const getY = (temp: number) => {
        const clamped = Math.max(minTemp, Math.min(maxTemp, temp));
        const ratio = (clamped - minTemp) / (maxTemp - minTemp);
        return innerHeight - ratio * innerHeight + padding.top;
    };

    // X coordinate mapping function
    const getX = (index: number) => {
        if (data.length <= 1) return padding.left + innerWidth / 2;
        return padding.left + (index / (data.length - 1)) * innerWidth;
    };

    // Y coordinates for safe cold-chain boundary band (2°C to 8°C)
    const ySafeHigh = getY(8.0);
    const ySafeLow = getY(2.0);

    // Build polyline SVG path for temperature
    const points = data.map((d, i) => `${getX(i)},${getY(d.temp)}`).join(" ");

    const latest = data[data.length - 1];
    const isLatestExcursion = latest.temp < 2.0 || latest.temp > 8.0;

    return (
        <div className="glass-card" style={{ padding: 20, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ padding: 8, borderRadius: 8, background: isLatestExcursion ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)", color: isLatestExcursion ? "#ef4444" : "#10b981" }}>
                        <Thermometer size={20} />
                    </div>
                    <div>
                        <h4 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "#fff" }}>
                            Cold-Chain Telemetry Stream {batchId ? `(#${batchId})` : ""}
                        </h4>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            Safe Range: 2.0°C to 8.0°C • Sampling Rate: IoT Live Sensor
                        </span>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}>
                        <span style={{ color: "var(--text-muted)" }}>Temp:</span>
                        <strong style={{ color: isLatestExcursion ? "var(--color-danger)" : "var(--color-success)", fontSize: "1.1rem" }}>
                            {latest.temp.toFixed(1)}°C
                        </strong>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}>
                        <Droplets size={14} color="#3b82f6" />
                        <span style={{ color: "var(--text-muted)" }}>Humidity:</span>
                        <strong style={{ color: "#3b82f6", fontSize: "1rem" }}>
                            {latest.humidity}%
                        </strong>
                    </div>
                </div>
            </div>

            {/* SVG Chart Container */}
            <div style={{ width: "100%", overflowX: "auto" }}>
                <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
                    {/* Background Grid Lines */}
                    {[-5, 0, 2, 8, 15, 20].map((t) => (
                        <g key={t}>
                            <line
                                x1={padding.left}
                                y1={getY(t)}
                                x2={width - padding.right}
                                y2={getY(t)}
                                stroke="rgba(255, 255, 255, 0.07)"
                                strokeDasharray={t === 2 || t === 8 ? "0" : "3 3"}
                            />
                            <text
                                x={padding.left - 8}
                                y={getY(t) + 3}
                                fill="var(--text-muted)"
                                fontSize="9"
                                textAnchor="end"
                            >
                                {t}°C
                            </text>
                        </g>
                    ))}

                    {/* Safe Cold-Chain Range Band (2°C - 8°C highlighted in translucent green) */}
                    <rect
                        x={padding.left}
                        y={ySafeHigh}
                        width={innerWidth}
                        height={ySafeLow - ySafeHigh}
                        fill="rgba(16, 185, 129, 0.12)"
                        stroke="rgba(16, 185, 129, 0.3)"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                    />
                    <text
                        x={width - padding.right - 8}
                        y={ySafeHigh + 12}
                        fill="#10b981"
                        fontSize="9"
                        fontWeight="700"
                        textAnchor="end"
                    >
                        SAFE ZONE (2°C - 8°C)
                    </text>

                    {/* Temperature Polyline */}
                    <polyline
                        fill="none"
                        stroke="url(#tempGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                    />

                    {/* Data Points */}
                    {data.map((d, i) => {
                        const cx = getX(i);
                        const cy = getY(d.temp);
                        const isEx = d.temp < 2.0 || d.temp > 8.0;
                        return (
                            <g key={i}>
                                <circle
                                    cx={cx}
                                    cy={cy}
                                    r={isEx ? "6" : "4"}
                                    fill={isEx ? "#ef4444" : "#10b981"}
                                    stroke="#0f172a"
                                    strokeWidth="2"
                                />
                                {isEx && (
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r="10"
                                        fill="none"
                                        stroke="#ef4444"
                                        strokeWidth="1.5"
                                        opacity="0.7"
                                        className="status-pulse"
                                    />
                                )}
                            </g>
                        );
                    })}

                    {/* Gradient Definition */}
                    <defs>
                        <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="40%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        </div>
    );
}
