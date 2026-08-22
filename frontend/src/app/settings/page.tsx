"use client";

import { useState } from "react";
import Navbar from "../../components/Navbar";
import { useWallet } from "../../context/WalletContext";
import { useRouter } from "next/navigation";
import { 
  User, 
  TrendingUp, 
  ShieldCheck, 
  Lock, 
  LogOut, 
  CheckCircle,
  EyeOff
} from "lucide-react";

export default function ProfileSettings() {
  const wallet = useWallet();
  const router = useRouter();

  const [tfaEnabled, setTfaEnabled] = useState(true);

  const handlePasswordChange = () => {
    alert("Password change request initiated. An authorization link has been dispatched to your corporate email.");
  };

  const handleSignOut = () => {
    if (wallet.connected) {
      wallet.disconnect();
    }
    router.push("/");
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

      <main className="main-content-offset" style={{ padding: "80px 20px 96px", maxWidth: "680px", margin: "0 auto" }}>
        
        {/* Profile Header section */}
        <section style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0", textAlign: "center" }}>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <div style={{ width: 96, height: 96, borderRadius: "50%", overflow: "hidden", border: "2px solid var(--border-glass)", padding: 4 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCeyLXWDQXSD_n4yqPuGC93Rsft8qM0lf9bCXk0KV3CZDeDgGbgOdDBJUKAiTKCwLoZo0WqyrnkJDpTNp_RcgJLlbSXH4UFaEIHPlvIut_LW24AG_5Z37yVrs1YPhDSoq9ac58I4ExnCwdA75nR9QNl58snSXAsbbGTIYADpBmjD0YrpsVnQUSkdirCBwVqStZjjGs7FfZ8b1frUftQb9Rhjbmhpho3ZYrvhgAHQwwHuHqEj9bGQOr-b-w0r7DelYN3sZm1nQo1768" 
                alt="Sarah Chen avatar" 
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
              />
            </div>
            <div style={{ position: "absolute", bottom: 0, right: 0, background: "var(--color-primary)", color: "#fff", padding: 6, borderRadius: "50%", border: "2px solid var(--bg-primary)", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User style={{ width: 12, height: 12 }} />
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: "1.5rem", color: "#fff", fontWeight: 700 }}>Dr. Sarah Chen</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>Global Logistics & Compliance Manager</p>
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* Personal Details Card */}
          <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", background: "rgba(255,255,255,0.01)", borderBottom: "1px solid var(--border-glass)" }}>
              <h3 className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>PERSONAL DETAILS</h3>
            </div>
            <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr sm:1fr 1fr", gap: 16 }}>
                <div>
                  <span className="form-label" style={{ fontSize: "0.65rem" }}>EMAIL ADDRESS</span>
                  <p style={{ fontWeight: 600, color: "#fff", fontSize: "0.95rem" }}>sarah.chen@pharmatrust.io</p>
                </div>
                <div>
                  <span className="form-label" style={{ fontSize: "0.65rem" }}>EMPLOYEE ID</span>
                  <div style={{ marginTop: 2 }}>
                    <code style={{ background: "rgba(59,130,246,0.1)", color: "#93c5fd", padding: "4px 8px", borderRadius: 4, fontSize: "0.8rem", border: "1px solid rgba(59,130,246,0.2)" }}>
                      PT-882-901-X
                    </code>
                  </div>
                </div>
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.02)", paddingTop: 16 }}>
                <span className="form-label" style={{ fontSize: "0.65rem" }}>DEPARTMENT REPRESENTED</span>
                <p style={{ fontWeight: 600, color: "#fff", fontSize: "0.95rem" }}>Global Logistics & Regulatory Compliance</p>
              </div>
            </div>
          </div>

          {/* Verification Statistics Card */}
          <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", background: "rgba(255,255,255,0.01)", borderBottom: "1px solid var(--border-glass)" }} className="flex-between">
              <h3 className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>VERIFICATION AUDIT HISTORY</h3>
              <CheckCircle style={{ width: 16, height: 16, stroke: "var(--color-success)" }} />
            </div>
            <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ borderRight: "1px solid var(--border-glass)", paddingRight: 20 }}>
                <span className="form-label" style={{ fontSize: "0.65rem" }}>TOTAL LEDGER SCANS</span>
                <span style={{ fontSize: "1.75rem", fontWeight: 700, color: "#fff", display: "block", marginTop: 4 }}>142</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-primary)", marginTop: 6, fontSize: "0.75rem" }}>
                  <TrendingUp style={{ width: 14, height: 14 }} />
                  <span>+12% vs last month</span>
                </div>
              </div>
              <div style={{ paddingLeft: 20 }}>
                <span className="form-label" style={{ fontSize: "0.65rem" }}>COMPLIANCE SUCCESS RATE</span>
                <span style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-success)", display: "block", marginTop: 4 }}>100%</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-success)", marginTop: 6, fontSize: "0.75rem" }}>
                  <ShieldCheck style={{ width: 14, height: 14 }} />
                  <span>Absolute Integrity</span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Config Card */}
          <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", background: "rgba(255,255,255,0.01)", borderBottom: "1px solid var(--border-glass)" }}>
              <h3 className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>SECURITY SETTINGS</h3>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* Password update row */}
              <div className="flex-between">
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ background: "rgba(255,255,255,0.04)", padding: 8, borderRadius: 8 }}>
                    <Lock style={{ width: 18, height: 18, stroke: "var(--text-muted)" }} />
                  </div>
                  <div>
                    <h4 style={{ color: "#fff", fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>Update Password</h4>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Last updated 4 months ago</span>
                  </div>
                </div>
                <button onClick={handlePasswordChange} className="btn btn-secondary" style={{ padding: "6px 16px", fontSize: "0.8rem" }}>
                  CHANGE
                </button>
              </div>

              {/* 2FA switch row */}
              <div className="flex-between" style={{ borderTop: "1px solid rgba(255,255,255,0.02)", paddingTop: 16 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ background: "rgba(255,255,255,0.04)", padding: 8, borderRadius: 8 }}>
                    <EyeOff style={{ width: 18, height: 18, stroke: "var(--text-muted)" }} />
                  </div>
                  <div>
                    <h4 style={{ color: "#fff", fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>Two-Factor Authentication</h4>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Secure account with hardware keys</span>
                  </div>
                </div>
                
                {/* Switch slider */}
                <label className="toggle-switch-container">
                  <input 
                    type="checkbox" 
                    checked={tfaEnabled} 
                    onChange={(e) => setTfaEnabled(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

            </div>
          </div>

          {/* Disconnect Wallet and Sign Out */}
          <button 
            onClick={handleSignOut} 
            className="btn btn-secondary flex-gap" 
            style={{ 
              justifyContent: "center", 
              padding: "14px", 
              color: "var(--color-danger)", 
              border: "1px solid rgba(239, 68, 68, 0.15)",
              background: "rgba(239, 68, 68, 0.02)",
              fontSize: "1rem",
              fontWeight: 600
            }}
          >
            <LogOut style={{ width: 18, height: 18 }} />
            <span>Sign Out & Disconnect</span>
          </button>

        </div>

      </main>
    </div>
  );
}
