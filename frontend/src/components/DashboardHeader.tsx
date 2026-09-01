"use client";

import React, { useState, useEffect } from "react";
import { 
  Activity, 
  Clock, 
  RefreshCw, 
  ShieldCheck, 
  Wallet, 
  LogOut, 
  UserCheck, 
  Calendar,
  Sparkles,
  Cpu,
  Thermometer,
  FileCheck,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { Role } from "../types/pharma";
import InvigilatorDiagnosticModal from "./InvigilatorDiagnosticModal";

interface DashboardHeaderProps {
  connected: boolean;
  address: string | null;
  balance: string | null;
  role: Role;
  loading: boolean;
  onConnect: (type: "freighter" | "albedo" | "mock-manufacturer" | "mock-distributor" | "mock-pharmacy" | "mock-admin" | "mock-customer") => void;
  onDisconnect: () => void;
  onRoleChange: (role: Role) => void;
  onRefresh?: () => void;
  lastUpdated?: Date;
}

export default function DashboardHeader({
  connected,
  address,
  balance,
  role,
  loading,
  onConnect,
  onDisconnect,
  onRoleChange,
  onRefresh,
  lastUpdated: initialLastUpdated,
}: DashboardHeaderProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date>(initialLastUpdated || new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [demoAlertMessage, setDemoAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const truncateAddress = (addr: string | null) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setLastUpdatedTime(new Date());
    if (onRefresh) {
      onRefresh();
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const triggerDemoTempSpike = () => {
    setDemoAlertMessage("CRITICAL TELEMETRY WARNING: Cold-chain Sensor S-108 reported 9.4°C (Limit 8.0°C) for Batch #PH-2024-001");
    setTimeout(() => {
      setDemoAlertMessage(null);
    }, 6000);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <>
      <header className="dashboard-header-card glass-card" style={{ margin: "20px 0 32px", padding: "28px" }}>
        
        {/* Live Demo Toast Alert Banner */}
        {demoAlertMessage && (
          <div style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: 12,
            padding: "12px 18px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#fca5a5",
            animation: "pulse 2s infinite"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AlertTriangle style={{ width: 18, height: 18, stroke: "#ef4444" }} />
              <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>{demoAlertMessage}</span>
            </div>
            <button
              onClick={() => setDemoAlertMessage(null)}
              style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontWeight: 700 }}
            >
              ×
            </button>
          </div>
        )}

        {/* Top Utility & Branding Bar */}
        <div className="flex-between flex-responsive-row" style={{ gap: 16, marginBottom: 20, alignItems: "center" }}>
          
          {/* Stellar Pharma Chain Branding Pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div className="branding-pill" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: "20px",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#34d399"
            }}>
              <Activity style={{ width: 16, height: 16, stroke: "#10b981" }} />
              <span>Stellar Pharma Chain</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Soroban Testnet</span>
              <span className="wallet-dot status-pulse" style={{ width: 7, height: 7, background: "#10b981", display: "inline-block", marginLeft: 2 }} />
            </div>

            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.03)", padding: "4px 10px", borderRadius: "12px", border: "1px solid var(--border-glass)" }}>
              <ShieldCheck style={{ width: 14, height: 14, stroke: "#3b82f6" }} />
              <span>Immutable Ledger</span>
            </div>
          </div>

          {/* Live Date/Time & Last Updated Indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "rgba(0, 0, 0, 0.25)",
              padding: "6px 14px",
              borderRadius: "10px",
              border: "1px solid var(--border-glass)",
              fontSize: "0.82rem",
              color: "var(--text-secondary)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar style={{ width: 14, height: 14, stroke: "#60a5fa" }} />
                <span>{currentTime ? formatDate(currentTime) : "Loading date..."}</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Clock style={{ width: 14, height: 14, stroke: "#34d399" }} />
                <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#fff" }}>
                  {currentTime ? `${formatTime(currentTime)} UTC` : "--:--:--"}
                </span>
              </div>
            </div>

            {/* Last Updated Status Indicator */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255, 255, 255, 0.04)",
              padding: "6px 12px",
              borderRadius: "10px",
              border: "1px solid var(--border-glass)",
              fontSize: "0.8rem"
            }}>
              <span style={{ color: "var(--text-muted)" }}>Last updated:</span>
              <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#e0f2fe" }}>
                {formatTime(lastUpdatedTime)}
              </span>
              <button
                onClick={handleManualRefresh}
                className="btn btn-secondary"
                style={{
                  padding: "4px 8px",
                  fontSize: "0.75rem",
                  borderRadius: "6px",
                  background: "rgba(59, 130, 246, 0.15)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  color: "#60a5fa",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4
                }}
                title="Refresh Dashboard Data"
              >
                <RefreshCw style={{ width: 12, height: 12, transform: isRefreshing ? "rotate(360deg)" : "none", transition: "transform 0.5s ease" }} />
                <span>Sync</span>
              </button>
            </div>
          </div>

        </div>

        {/* Main Title & Subtitle Row */}
        <div className="flex-between flex-responsive-row" style={{ gap: 24, alignItems: "flex-start", marginBottom: 20 }}>
          
          <div style={{ flex: 1, maxWidth: "780px" }}>
            <h1 style={{ fontSize: "2.3rem", fontWeight: 800, color: "#fff", marginBottom: 10, lineHeight: 1.25, letterSpacing: "-0.02em" }}>
              Pharmaceutical Supply Chain Dashboard
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", lineHeight: 1.55 }}>
              Monitors medicines, medicine batches, cryptographic verification, cold-chain telemetry, and real-time end-to-end supply-chain activity across all network participants.
            </p>
          </div>

          {/* User / Profile / Logout Functionality Header Card */}
          <div className="user-profile-header-card" style={{
            background: "rgba(18, 24, 41, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "16px 20px",
            minWidth: "290px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)"
          }}>
            {connected ? (
              <>
                <div className="flex-between" style={{ alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #3b82f6 0%, #10b981 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff"
                    }}>
                      <UserCheck style={{ width: 18, height: 18 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Connected Profile</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>
                        {truncateAddress(address)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={onDisconnect}
                    className="btn btn-secondary"
                    style={{
                      padding: "6px 10px",
                      fontSize: "0.75rem",
                      color: "#f87171",
                      borderColor: "rgba(239, 68, 68, 0.3)",
                      background: "rgba(239, 68, 68, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}
                    title="Logout / Disconnect Account"
                  >
                    <LogOut style={{ width: 14, height: 14 }} />
                    <span>Logout</span>
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid rgba(255, 255, 255, 0.05)", fontSize: "0.8rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Role:</span>
                    <select
                      className="form-control"
                      style={{
                        width: "auto",
                        padding: "4px 8px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        background: "rgba(0,0,0,0.3)",
                        color: "#60a5fa",
                        borderColor: "rgba(59, 130, 246, 0.3)",
                        borderRadius: "6px"
                      }}
                      value={role}
                      onChange={(e) => onRoleChange(e.target.value as Role)}
                    >
                      <option value="Manufacturer">Manufacturer</option>
                      <option value="Distributor">Distributor</option>
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Customer">Customer</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Wallet style={{ width: 14, height: 14, stroke: "#3b82f6" }} />
                    <span style={{ fontWeight: 700, color: "#10b981", fontFamily: "monospace" }}>{balance || "0"} XLM</span>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)"
                  }}>
                    <Wallet style={{ width: 18, height: 18 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>Session Disconnected</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Connect Stellar wallet to perform actions</div>
                  </div>
                </div>

                <button
                  onClick={() => onConnect("freighter")}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "8px 16px", fontSize: "0.85rem", justifyContent: "center" }}
                >
                  <Wallet style={{ width: 15, height: 15 }} />
                  <span>{loading ? "Connecting..." : "Connect Wallet"}</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Invigilator Demo Quick Action Ribbon */}
        <div style={{
          paddingTop: 16,
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles style={{ width: 15, height: 15, stroke: "#fbbf24" }} />
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Invigilator Quick Demo Suite:
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => setShowDiagnosticModal(true)}
              className="btn btn-secondary flex-gap"
              style={{
                padding: "6px 14px",
                fontSize: "0.8rem",
                background: "rgba(59, 130, 246, 0.12)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                color: "#93c5fd"
              }}
            >
              <Cpu style={{ width: 14, height: 14 }} />
              <span>Run On-Chain System Audit</span>
            </button>

            <button
              onClick={triggerDemoTempSpike}
              className="btn btn-secondary flex-gap"
              style={{
                padding: "6px 14px",
                fontSize: "0.8rem",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "#fcd34d"
              }}
            >
              <Thermometer style={{ width: 14, height: 14 }} />
              <span>Simulate Cold-Chain Alert</span>
            </button>

            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.75rem",
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              padding: "5px 10px",
              borderRadius: "8px",
              color: "#34d399"
            }}>
              <CheckCircle2 style={{ width: 13, height: 13 }} />
              <span>FDA DSCSA Title II Compliant</span>
            </div>
          </div>
        </div>

      </header>

      {/* Invigilator Diagnostic Modal */}
      <InvigilatorDiagnosticModal
        isOpen={showDiagnosticModal}
        onClose={() => setShowDiagnosticModal(false)}
      />
    </>
  );
}
