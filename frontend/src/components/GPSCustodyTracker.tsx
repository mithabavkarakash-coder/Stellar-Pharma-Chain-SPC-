"use client";

import React from "react";
import { Building, Truck, Store, CheckCircle, Clock, ShieldAlert, Navigation } from "lucide-react";

interface HandoffStep {
    from?: string;
    to?: string;
    from_address?: string;
    to_address?: string;
    role?: string;
    new_role?: string;
    timestamp: number;
    locationName?: string;
}

interface GPSCustodyTrackerProps {
    manufacturer: string;
    handoffs: HandoffStep[];
    directShip?: boolean;
    isRecalled?: boolean;
}

export default function GPSCustodyTracker({ manufacturer, handoffs, directShip, isRecalled }: GPSCustodyTrackerProps) {
    // Generate milestone checkpoints along supply route
    const nodes = [
        {
            id: "mfg",
            title: "Manufacturing Plant",
            subtitle: "Origin • Factory Batch Minting",
            role: "Manufacturer",
            icon: Building,
            completed: true,
            address: manufacturer,
            location: "Basel, Switzerland (Plant #04)",
            timestamp: handoffs.length > 0 ? handoffs[0].timestamp - 3600 : Date.now() / 1000 - 86400
        },
        {
            id: "dist",
            title: directShip ? "Direct Ship Transit (Bypassed Hub)" : "Cold-Chain Logistics Hub",
            subtitle: directShip ? "Direct Shipment to Pharmacy" : "Air & Ground Freight Logistics",
            role: "Distributor",
            icon: Truck,
            completed: handoffs.length > 0 || !!directShip,
            address: handoffs.length > 0 ? (handoffs[0].to_address || handoffs[0].to || "Logistics Hub Node") : "Logistics Hub Node",
            location: "Frankfurt Hub (Cold-Chain Warehouse B-12)",
            timestamp: handoffs.length > 0 ? handoffs[0].timestamp : null
        },
        {
            id: "pharm",
            title: "Destination Pharmacy",
            subtitle: "Dispense Endpoint • Patient Custody",
            role: "Pharmacy",
            icon: Store,
            completed: handoffs.some(h => h.role === "Pharmacy" || h.new_role === "Pharmacy"),
            address: handoffs.find(h => h.role === "Pharmacy" || h.new_role === "Pharmacy")?.to_address || "Awaiting Delivery Receipt",
            location: "Regional Medical Center Pharmacy",
            timestamp: handoffs.find(h => h.role === "Pharmacy" || h.new_role === "Pharmacy")?.timestamp || null
        }
    ];

    return (
        <div className="glass-card" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ padding: 8, borderRadius: 8, background: "rgba(59, 130, 246, 0.2)", color: "#3b82f6" }}>
                        <Navigation size={20} />
                    </div>
                    <div>
                        <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#fff" }}>
                            Interactive GPS Custody & Transit Lineage
                        </h4>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            Real-time Geographical Checkpoints & Custody Handover Progress
                        </span>
                    </div>
                </div>

                {isRecalled ? (
                    <span style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", fontSize: "0.75rem", fontWeight: 800 }}>
                        CUSTODY FROZEN (RECALLED)
                    </span>
                ) : (
                    <span style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(16, 185, 129, 0.2)", color: "#10b981", fontSize: "0.75rem", fontWeight: 800 }}>
                        {handoffs.some(h => h.role === "Pharmacy") ? "DELIVERED TO PHARMACY" : "IN TRANSIT"}
                    </span>
                )}
            </div>

            {/* Simulated Geographic Route Canvas Bar */}
            <div style={{
                height: 80,
                borderRadius: 12,
                background: "radial-gradient(ellipse at center, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 1) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                position: "relative",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 40px"
            }}>
                {/* Connecting Line */}
                <div style={{
                    position: "absolute",
                    top: "50%",
                    left: 60,
                    right: 60,
                    height: 4,
                    background: "rgba(255, 255, 255, 0.1)",
                    transform: "translateY(-50%)",
                    zIndex: 1
                }}>
                    <div style={{
                        height: "100%",
                        width: handoffs.some(h => h.role === "Pharmacy") ? "100%" : handoffs.length > 0 ? "50%" : "15%",
                        background: isRecalled ? "#ef4444" : "linear-gradient(90deg, #3b82f6, #10b981)",
                        borderRadius: 2,
                        transition: "width 0.8s ease"
                    }} />
                </div>

                {/* Node Icons */}
                {nodes.map((node, i) => {
                    const IconComp = node.icon;
                    const active = node.completed;

                    return (
                        <div key={node.id} style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
                            <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                background: active ? (isRecalled ? "#ef4444" : "#10b981") : "#1e293b",
                                border: `3px solid ${active ? (isRecalled ? "#fca5a5" : "#6ee7b7") : "rgba(255,255,255,0.2)"}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: active ? "#ffffff" : "var(--text-muted)",
                                margin: "0 auto",
                                boxShadow: active ? "0 0 16px rgba(16, 185, 129, 0.4)" : "none",
                                transition: "all 0.3s ease"
                            }}>
                                <IconComp size={20} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Detailed Node Step Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                {nodes.map((node, idx) => {
                    const IconComp = node.icon;
                    return (
                        <div key={node.id} style={{
                            padding: 14,
                            borderRadius: 10,
                            background: node.completed ? "rgba(30, 41, 59, 0.6)" : "rgba(15, 23, 42, 0.4)",
                            border: `1px solid ${node.completed ? "rgba(59, 130, 246, 0.3)" : "rgba(255,255,255,0.06)"}`
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <IconComp size={16} color={node.completed ? "#3b82f6" : "var(--text-muted)"} />
                                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: node.completed ? "#fff" : "var(--text-muted)" }}>
                                    {node.title}
                                </span>
                            </div>
                            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 8px 0" }}>
                                {node.location}
                            </p>
                            <div style={{ fontSize: "0.7rem", fontFamily: "monospace", color: "#94a3b8", wordBreak: "break-all" }}>
                                {typeof node.address === "string" && node.address.length > 16
                                    ? `${node.address.slice(0, 8)}...${node.address.slice(-6)}`
                                    : node.address}
                            </div>
                            {node.timestamp && (
                                <div style={{ fontSize: "0.68rem", color: "#10b981", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                                    <Clock size={12} />
                                    <span>{new Date(node.timestamp * 1000).toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
