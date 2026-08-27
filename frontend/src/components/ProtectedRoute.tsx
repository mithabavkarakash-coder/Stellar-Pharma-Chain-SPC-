"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, Lock, ArrowLeft, Wallet } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { Role } from "../types/pharma";
import Navbar from "./Navbar";
import SkeletonLoader from "./SkeletonLoader";

interface ProtectedRouteProps {
    allowedRoles: Role[];
    children: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
    const wallet = useWallet();

    const navbarProps = {
        connected: wallet.connected,
        address: wallet.address,
        balance: wallet.balance,
        role: wallet.role,
        loading: wallet.loading,
        onConnect: wallet.connect,
        onDisconnect: wallet.disconnect,
        onRoleChange: wallet.setRole,
    };

    // 1. Loading State
    if (wallet.loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white">
                <Navbar {...navbarProps} />
                <div className="container mx-auto px-4 py-12 max-w-5xl">
                    <SkeletonLoader count={3} />
                </div>
            </div>
        );
    }

    // Check permission
    const isAuthorized = wallet.hasPermission(allowedRoles);

    // 2. Unauthenticated (Wallet Not Connected)
    if (!wallet.connected) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col">
                <Navbar {...navbarProps} />
                <main className="flex-1 flex items-center justify-center p-6">
                    <div 
                        className="glass-card max-w-lg w-full text-center"
                        style={{
                            padding: 36,
                            borderRadius: 20,
                            background: "rgba(15, 23, 42, 0.95)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)"
                        }}
                    >
                        <div 
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: "50%",
                                background: "rgba(239, 68, 68, 0.15)",
                                color: "#ef4444",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 20px auto",
                                border: "1px solid rgba(239, 68, 68, 0.3)"
                            }}
                        >
                            <Lock size={32} />
                        </div>

                        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 10px 0", color: "#fff" }}>
                            Authentication Required
                        </h2>

                        <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: "0 0 24px 0", lineHeight: 1.6 }}>
                            This portal requires an active Stellar wallet connection. Connect your wallet extension or simulated keypair to proceed.
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <button
                                onClick={() => {
                                    // Trigger wallet connect via Navbar modal or default freighter
                                    wallet.connect("freighter").catch(() => {});
                                }}
                                className="btn btn-primary"
                                style={{
                                    width: "100%",
                                    padding: "12px 20px",
                                    fontSize: "0.95rem",
                                    fontWeight: 700,
                                    justifyContent: "center",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8
                                }}
                            >
                                <Wallet size={18} />
                                Connect Wallet to Access Portal
                            </button>

                            <Link
                                href="/"
                                className="btn btn-secondary"
                                style={{
                                    width: "100%",
                                    padding: "10px 20px",
                                    fontSize: "0.85rem",
                                    justifyContent: "center",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6
                                }}
                            >
                                <ArrowLeft size={16} />
                                Return to Public Verification Home
                            </Link>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // 3. Unauthorized (Connected, but Role Mismatch)
    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col">
                <Navbar {...navbarProps} />
                <main className="flex-1 flex items-center justify-center p-6">
                    <div 
                        className="glass-card max-w-lg w-full text-center"
                        style={{
                            padding: 36,
                            borderRadius: 20,
                            background: "rgba(24, 15, 20, 0.95)",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.7)"
                        }}
                    >
                        <div 
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: "50%",
                                background: "rgba(239, 68, 68, 0.2)",
                                color: "#ef4444",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 20px auto",
                                border: "1px solid rgba(239, 68, 68, 0.4)"
                            }}
                        >
                            <ShieldAlert size={32} />
                        </div>

                        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 10px 0", color: "#f87171" }}>
                            Access Denied (403 Forbidden)
                        </h2>

                        <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", margin: "0 0 20px 0", lineHeight: 1.6 }}>
                            Your wallet address <code style={{ color: "#60a5fa", fontSize: "0.8rem" }}>{wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}</code> holds the role <strong style={{ color: "#fbbf24" }}>{wallet.role}</strong>.
                        </p>

                        <div 
                            style={{
                                padding: "12px 16px",
                                borderRadius: 12,
                                background: "rgba(30, 41, 59, 0.6)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                marginBottom: 24,
                                fontSize: "0.82rem",
                                color: "#cbd5e1",
                                textAlign: "left"
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: 4, color: "#fff" }}>Required Authorization:</div>
                            Allowed Roles: {allowedRoles.map(r => <span key={r} className="badge badge-blue" style={{ marginLeft: 6 }}>{r}</span>)}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <button
                                onClick={() => {
                                    // Set role to first allowed role if mock wallet
                                    if (allowedRoles.length > 0) {
                                        wallet.setRole(allowedRoles[0]);
                                    }
                                }}
                                className="btn btn-primary"
                                style={{
                                    width: "100%",
                                    padding: "10px 20px",
                                    fontSize: "0.88rem",
                                    fontWeight: 700,
                                    justifyContent: "center",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6
                                }}
                            >
                                Switch Role to {allowedRoles[0]}
                            </button>

                            <Link
                                href="/"
                                className="btn btn-secondary"
                                style={{
                                    width: "100%",
                                    padding: "10px 20px",
                                    fontSize: "0.85rem",
                                    justifyContent: "center",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6
                                }}
                            >
                                <ArrowLeft size={16} />
                                Return to Public Verification Home
                            </Link>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Authorized Access Granted
    return <>{children}</>;
}
