"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Activity, 
  Wallet, 
  LogOut, 
  LayoutDashboard, 
  Clock, 
  Bell, 
  Settings, 
  QrCode 
} from "lucide-react";

interface NavbarProps {
    connected: boolean;
    address: string | null;
    balance: string | null;
    role: "Manufacturer" | "Distributor" | "Pharmacy";
    loading: boolean;
    onConnect: (type: "freighter" | "albedo" | "mock-manufacturer" | "mock-distributor" | "mock-pharmacy") => void;
    onDisconnect: () => void;
    onRoleChange: (role: "Manufacturer" | "Distributor" | "Pharmacy") => void;
}

export default function Navbar({
    connected,
    address,
    balance,
    role,
    loading,
    onConnect,
    onDisconnect,
    onRoleChange,
}: NavbarProps) {
    const pathname = usePathname();
    const [showModal, setShowModal] = useState(false);
    
    const truncateAddress = (addr: string) => {
        if (!addr) return "";
        return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
    };

    return (
        <>
            {/* Top Navbar */}
            <nav className="navbar">
                <div className="app-container navbar-inner">
                    <Link href="/" className="navbar-brand">
                        <Activity className="brand-icon" style={{ stroke: "#10b981", width: 28, height: 28 }} />
                        <span>MedChain</span>
                    </Link>

                    <div className="navbar-right">
                        {connected && (
                            <div className="flex-gap">
                                <span className="form-label" style={{ margin: 0, fontSize: "0.75rem" }}>Demo Role:</span>
                                <select
                                    className="form-control"
                                    style={{ width: 150, padding: "6px 12px", fontSize: "0.85rem", background: "var(--bg-tertiary)" }}
                                    value={role}
                                    onChange={(e) => onRoleChange(e.target.value as any)}
                                >
                                    <option value="Manufacturer">Manufacturer</option>
                                    <option value="Distributor">Distributor</option>
                                    <option value="Pharmacy">Pharmacy</option>
                                </select>
                            </div>
                        )}

                        {connected ? (
                            <div className="flex-gap">
                                <div className="wallet-badge">
                                    <Wallet style={{ width: 16, height: 16, stroke: "#3b82f6" }} />
                                    <span>{truncateAddress(address!)}</span>
                                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>|</span>
                                    <span style={{ fontWeight: 600, color: "#fff" }}>{balance} XLM</span>
                                    <div className="wallet-dot" />
                                </div>

                                <button onClick={onDisconnect} className="btn btn-secondary" style={{ padding: "8px 12px" }} title="Disconnect Wallet">
                                    <LogOut style={{ width: 16, height: 16 }} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowModal(true)}
                                disabled={loading}
                                className="btn btn-primary"
                                style={{ padding: "8px 20px" }}
                            >
                                <Wallet style={{ width: 16, height: 16 }} />
                                <span>{loading ? "Connecting..." : "Connect Wallet"}</span>
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Desktop Left Sidebar */}
            <aside className="desktop-sidebar">
                <Link href="/" className={`nav-tab-item ${pathname === "/" ? "active" : ""}`} title="Dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                </Link>
                <Link href="/verify" className={`nav-tab-item ${pathname === "/verify" ? "active" : ""}`} title="Timeline">
                    <Clock />
                    <span>Timeline</span>
                </Link>
                <Link href="/scan" className={`nav-tab-item ${pathname === "/scan" ? "active" : ""}`} title="Scan QR">
                    <QrCode />
                    <span>Scan</span>
                </Link>
                <Link href="/alerts" className={`nav-tab-item ${pathname === "/alerts" ? "active" : ""}`} title="Alerts">
                    <Bell />
                    <span>Alerts</span>
                </Link>
                <Link href="/settings" className={`nav-tab-item ${pathname === "/settings" ? "active" : ""}`} title="Settings">
                    <Settings />
                    <span>Settings</span>
                </Link>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="mobile-bottom-nav">
                <Link href="/" className={`nav-tab-item ${pathname === "/" ? "active" : ""}`}>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                </Link>
                <Link href="/verify" className={`nav-tab-item ${pathname === "/verify" ? "active" : ""}`}>
                    <Clock />
                    <span>Timeline</span>
                </Link>
                <Link href="/scan" className="nav-tab-item active-center" title="Scan QR">
                    <QrCode style={{ strokeWidth: 2.5 }} />
                </Link>
                <Link href="/alerts" className={`nav-tab-item ${pathname === "/alerts" ? "active" : ""}`}>
                    <Bell />
                    <span>Alerts</span>
                </Link>
                <Link href="/settings" className={`nav-tab-item ${pathname === "/settings" ? "active" : ""}`}>
                    <Settings />
                    <span>Settings</span>
                </Link>
            </nav>

            {/* Choose Wallet Modal Selector */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
                    <div className="glass-card" style={{ width: "100%", maxWidth: "440px", padding: 28 }}>
                        <div className="flex-between" style={{ marginBottom: 20 }}>
                            <h3 style={{ fontSize: "1.25rem", color: "#fff", fontWeight: 700 }}>Choose Stellar Wallet</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.5rem", fontWeight: 700, lineHeight: 1 }}>×</button>
                        </div>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 24 }}>
                            Select your preferred wallet extension or use simulated on-chain testing roles.
                        </p>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {/* Freighter */}
                            <button 
                                onClick={() => {
                                    onConnect("freighter");
                                    setShowModal(false);
                                }}
                                className="flex-between"
                                style={{
                                    padding: "14px 18px",
                                    borderRadius: "8px",
                                    background: "rgba(255,255,255,0.03)",
                                    border: "1px solid var(--border-glass)",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    width: "100%",
                                    alignItems: "center"
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: 8, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Wallet style={{ width: 18, height: 18, stroke: "#3b82f6" }} />
                                    </div>
                                    <div>
                                        <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.9rem" }}>Freighter Wallet</div>
                                        <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Browser Extension (Official)</div>
                                    </div>
                                </div>
                                <span style={{ color: "var(--color-primary)", fontSize: "0.85rem" }}>→</span>
                            </button>

                            {/* Albedo */}
                            <button 
                                onClick={() => {
                                    onConnect("albedo");
                                    setShowModal(false);
                                }}
                                className="flex-between"
                                style={{
                                    padding: "14px 18px",
                                    borderRadius: "8px",
                                    background: "rgba(255,255,255,0.03)",
                                    border: "1px solid var(--border-glass)",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    width: "100%",
                                    alignItems: "center"
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: 8, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Wallet style={{ width: 18, height: 18, stroke: "#10b981" }} />
                                    </div>
                                    <div>
                                        <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.9rem" }}>Albedo Wallet</div>
                                        <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Web-based Signer Interface</div>
                                    </div>
                                </div>
                                <span style={{ color: "var(--color-primary)", fontSize: "0.85rem" }}>→</span>
                            </button>

                            <div style={{ margin: "16px 0 8px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
                                <span className="form-label" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>SIMULATED LEDGER ACCOUNTS</span>
                            </div>

                            {/* Simulated Manufacturer */}
                            <button 
                                onClick={() => {
                                    onConnect("mock-manufacturer");
                                    setShowModal(false);
                                }}
                                className="flex-between"
                                style={{
                                    padding: "12px 16px",
                                    borderRadius: "8px",
                                    background: "rgba(255,255,255,0.02)",
                                    border: "1px solid rgba(255,255,255,0.05)",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    width: "100%",
                                    alignItems: "center"
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)" }} />
                                    <div>
                                        <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.85rem" }}>Manufacturer Role</div>
                                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Real-time packaging & contract deployment</div>
                                    </div>
                                </div>
                                <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Connect</span>
                            </button>

                            {/* Simulated Distributor */}
                            <button 
                                onClick={() => {
                                    onConnect("mock-distributor");
                                    setShowModal(false);
                                }}
                                className="flex-between"
                                style={{
                                    padding: "12px 16px",
                                    borderRadius: "8px",
                                    background: "rgba(255,255,255,0.02)",
                                    border: "1px solid rgba(255,255,255,0.05)",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    width: "100%",
                                    alignItems: "center"
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                                    <div>
                                        <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.85rem" }}>Distributor Role</div>
                                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Cold-chain tracking & transit verification</div>
                                    </div>
                                </div>
                                <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Connect</span>
                            </button>

                            {/* Simulated Pharmacy */}
                            <button 
                                onClick={() => {
                                    onConnect("mock-pharmacy");
                                    setShowModal(false);
                                }}
                                className="flex-between"
                                style={{
                                    padding: "12px 16px",
                                    borderRadius: "8px",
                                    background: "rgba(255,255,255,0.02)",
                                    border: "1px solid rgba(255,255,255,0.05)",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    width: "100%",
                                    alignItems: "center"
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                                    <div>
                                        <div style={{ color: "#fff", fontWeight: 600, fontSize: "0.85rem" }}>Pharmacy Role</div>
                                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Point-of-Care authentications & dispatches</div>
                                    </div>
                                </div>
                                <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Connect</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
