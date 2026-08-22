"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import { useWallet } from "../../context/WalletContext";
import { Search, ShieldCheck, QrCode, ArrowRight, UserCheck, HeartHandshake } from "lucide-react";

export default function CustomerPortal() {
    const wallet = useWallet();
    const router = useRouter();
    const [searchId, setSearchId] = useState("");

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchId.trim()) {
            router.push(`/verify?id=${encodeURIComponent(searchId.trim())}`);
        }
    };

    return (
        <div>
            <Navbar
                connected={wallet.connected}
                address={wallet.address}
                balance={wallet.balance}
                role={wallet.role}
                loading={wallet.loading}
                onConnect={wallet.connect}
                onDisconnect={wallet.disconnect}
                onRoleChange={wallet.setRole}
            />

            <main className="main-content-offset" style={{ padding: "80px 20px 96px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
                <div style={{ marginBottom: 32 }}>
                    <div style={{ display: "inline-flex", padding: 12, borderRadius: "50%", background: "rgba(16, 185, 129, 0.2)", color: "#10b981", marginBottom: 16 }}>
                        <HeartHandshake size={36} />
                    </div>
                    <h1 style={{ fontSize: "2.2rem", fontWeight: 800, margin: "0 0 10px 0", color: "#fff" }}>
                        Patient & Customer Medicine Authenticator
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", maxWidth: 650, margin: "0 auto" }}>
                        Instant zero-account verification for patients. Scan the QR code on your medicine box to verify authenticity and check for safety recalls.
                    </p>
                </div>

                {/* Quick Search Card */}
                <div className="glass-card" style={{ padding: 32, marginBottom: 36, background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                    <form onSubmit={handleSearch} style={{ display: "flex", flexWrap: "wrap", gap: 12, maxWidth: 600, margin: "0 auto" }}>
                        <input
                            type="text"
                            placeholder="Enter Batch ID / Lot Number on packaging (e.g. AX-7729-001)..."
                            className="form-control"
                            style={{ flex: 1, minWidth: 240, padding: 14, fontSize: "0.95rem" }}
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value)}
                            required
                        />
                        <button type="submit" className="btn btn-primary flex-gap" style={{ padding: "14px 24px", fontSize: "0.95rem" }}>
                            <Search size={18} />
                            <span>Verify Medicine</span>
                        </button>
                    </form>

                    <div style={{ marginTop: 20, display: "flex", gap: 16, justifyContent: "center" }}>
                        <Link href="/scan" className="btn btn-secondary flex-gap" style={{ padding: "10px 20px" }}>
                            <QrCode size={16} />
                            <span>Use Camera QR Scanner</span>
                        </Link>
                    </div>
                </div>

                {/* 4-Stage Patient Verification Guide */}
                <div style={{ textAlign: "left", marginBottom: 32 }}>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", marginBottom: 16, textAlign: "center" }}>
                        What You Get When You Scan Your Medicine Packaging
                    </h3>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                        <div className="glass-card" style={{ padding: 18 }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#3b82f6", marginBottom: 6 }}>STAGE 1</div>
                            <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 6px 0", color: "#fff" }}>Licensed Manufacturer</h4>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                                Verified factory minting, manufacturing date, and expiry parameters recorded on Stellar blockchain.
                            </p>
                        </div>

                        <div className="glass-card" style={{ padding: 18 }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#3b82f6", marginBottom: 6 }}>STAGE 2</div>
                            <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 6px 0", color: "#fff" }}>Logistics Distributor</h4>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                                Cold-chain sensor temperature logs (2°C to 8°C) and shipment transit checkpoints.
                            </p>
                        </div>

                        <div className="glass-card" style={{ padding: 18 }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#3b82f6", marginBottom: 6 }}>STAGE 3</div>
                            <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 6px 0", color: "#fff" }}>Retail Pharmacy</h4>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                                Verification that your dispensing pharmacy held authorized cryptographic custody.
                            </p>
                        </div>

                        <div className="glass-card" style={{ padding: 18 }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#10b981", marginBottom: 6 }}>STAGE 4</div>
                            <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 6px 0", color: "#fff" }}>Patient Delivery</h4>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                                Final unit dispense timestamp and instant safety recall alert check.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
