import React from "react";
import { CheckCircle, AlertTriangle, AlertOctagon, ShieldAlert, ShieldCheck, Clock } from "lucide-react";

export type StatusVariant = 
    | "AUTHENTIC" 
    | "VERIFIED" 
    | "WARNING" 
    | "COUNTERFEIT" 
    | "RECALLED" 
    | "EXPIRED" 
    | "QUARANTINED" 
    | "DIRECT_SHIP";

interface StatusBadgeProps {
    status: StatusVariant | string;
    label?: string;
    size?: "sm" | "md" | "lg";
    showIcon?: boolean;
    className?: string;
}

export default function StatusBadge({ 
    status, 
    label, 
    size = "md", 
    showIcon = true,
    className = ""
}: StatusBadgeProps) {
    const normalizedStatus = status.toUpperCase().replace(/\s+/g, "_");

    let bgColor = "rgba(100, 116, 139, 0.15)";
    let textColor = "#94a3b8";
    let borderColor = "rgba(100, 116, 139, 0.3)";
    let Icon = CheckCircle;

    switch (normalizedStatus) {
        case "AUTHENTIC":
        case "VERIFIED":
            bgColor = "rgba(16, 185, 129, 0.15)";
            textColor = "#34d399";
            borderColor = "rgba(16, 185, 129, 0.4)";
            Icon = ShieldCheck;
            break;
        case "WARNING":
            bgColor = "rgba(245, 158, 11, 0.15)";
            textColor = "#fbbf24";
            borderColor = "rgba(245, 158, 11, 0.4)";
            Icon = AlertTriangle;
            break;
        case "COUNTERFEIT":
        case "RECALLED":
            bgColor = "rgba(239, 68, 68, 0.15)";
            textColor = "#f87171";
            borderColor = "rgba(239, 68, 68, 0.4)";
            Icon = ShieldAlert;
            break;
        case "EXPIRED":
            bgColor = "rgba(249, 115, 22, 0.15)";
            textColor = "#fb923c";
            borderColor = "rgba(249, 115, 22, 0.4)";
            Icon = Clock;
            break;
        case "QUARANTINED":
            bgColor = "rgba(168, 85, 247, 0.15)";
            textColor = "#c084fc";
            borderColor = "rgba(168, 85, 247, 0.4)";
            Icon = AlertOctagon;
            break;
        case "DIRECT_SHIP":
            bgColor = "rgba(59, 130, 246, 0.15)";
            textColor = "#60a5fa";
            borderColor = "rgba(59, 130, 246, 0.4)";
            Icon = CheckCircle;
            break;
    }

    const padding = size === "sm" ? "2px 8px" : size === "lg" ? "6px 16px" : "4px 12px";
    const fontSize = size === "sm" ? "0.7rem" : size === "lg" ? "0.9rem" : "0.78rem";
    const iconSize = size === "sm" ? 12 : size === "lg" ? 16 : 14;

    const displayLabel = label || status.replace(/_/g, " ");

    return (
        <span
            className={`status-badge inline-flex items-center gap-1.5 font-bold rounded-full transition-all ${className}`}
            style={{
                padding,
                fontSize,
                backgroundColor: bgColor,
                color: textColor,
                border: `1px solid ${borderColor}`,
                letterSpacing: "0.02em"
            }}
        >
            {showIcon && <Icon size={iconSize} style={{ flexShrink: 0 }} />}
            {displayLabel}
        </span>
    );
}
