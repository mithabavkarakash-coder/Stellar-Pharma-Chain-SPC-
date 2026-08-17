"use client";

import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import { useWallet } from "../../context/WalletContext";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";

export default function SecurityCenter() {
  const wallet = useWallet();
  const router = useRouter();
  const [_wsConnected, setWsConnected] = useState(false);

  // Alerts state populated from mockup
  const [alerts, setAlerts] = useState([
    {
      id: "SEC-882-X",
      type: "CRITICAL",
      title: "Suspicious Batch ID Detected",
      description: "Anomalous blockchain signature identified in Batch #PH-2024-001. Multiple verification attempts from unauthorized nodes detected in regional warehouse B-12.",
      time: "2m ago",
      targetId: "PH-2024-001"
    },
    {
      id: "LOG-441-T",
      type: "WARNING",
      title: "Temperature Excursion in Transit",
      description: "Cold-chain sensor S-102 reported 8.4°C (Limit: 8.0°C) during transatlantic transport. Quality assurance protocols must be initiated upon arrival.",
      time: "14m ago",
      targetId: "IP-9901-B22"
    },
    {
      id: "VRF-001-S",
      type: "INFO",
      title: "Verification Successful",
      description: "Unit #9928-C has been successfully authenticated at Point-of-Care. Certificate of Authenticity generated and pushed to digital ledger.",
      time: "45m ago",
      targetId: "AX-7729-001"
    }
  ]);

  // WebSocket for real-time compliance alerts
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:8080/ws";
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWs = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onclose = () => {
        setWsConnected(false);
        reconnectTimeout = setTimeout(connectWs, 5000);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "BATCH_RECALLED") {
            // Prepend new critical alert item
            setAlerts((prev) => [
              {
                id: `REC-${payload.data.batch_id}`,
                type: "CRITICAL",
                title: "On-Chain Recall Warning",
                description: `Emergency recall flag registered by manufacturer for batch ID: ${payload.data.batch_id}. Cease distribution immediately.`,
                time: "Just now",
                targetId: payload.data.batch_id
              },
              ...prev
            ]);
          }
        } catch (e) {
          console.error("Failed to parse compliance message:", e);
        }
      };
    };

    connectWs();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const handleReportIssue = (alertId: string) => {
    alert(`Reporting protocol initiated for issue ${alertId}. Secure link established with QA supervisor.`);
  };

  const handleMarkAllRead = () => {
    alert("Priority alerts marked as read.");
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

      <main className="main-content-offset" style={{ padding: "80px 20px 96px" }}>
        
        {/* Header Title */}
        <section style={{ margin: "20px 0 24px" }} className="flex-between">
          <div>
            <h2 style={{ fontSize: "2rem", color: "#fff", fontWeight: 800 }}>Security Center</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Real-time supply chain integrity compliance monitoring</p>
          </div>
          <span className="form-label" style={{ fontSize: "0.75rem", margin: 0, color: "var(--text-muted)" }}>Last Sync: Active</span>
        </section>

        {/* Global Bento Status Cards */}
        <section className="dashboard-metrics-grid" style={{ marginBottom: 32 }}>
          <div className="glass-card metric-card">
            <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>Active Threats</span>
            <div className="metric-card-val" style={{ color: "var(--color-danger)" }}>
              {alerts.filter((a) => a.type === "CRITICAL").length.toString().padStart(2, "0")}
            </div>
          </div>
          <div className="glass-card metric-card">
            <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>Verifications (24h)</span>
            <div className="metric-card-val" style={{ color: "var(--color-primary)" }}>1,248</div>
          </div>
          <div className="glass-card metric-card">
            <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>System Integrity</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
              <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff" }}>Secure</span>
              <div className="wallet-dot status-pulse" style={{ background: "var(--color-success)", position: "relative", top: 0, left: 0 }} />
            </div>
          </div>
        </section>

        {/* Alerts Feed Section */}
        <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="flex-between">
            <h3 className="form-label" style={{ fontSize: "0.85rem", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>PRIORITY COMPLIANCE ALERTS</h3>
            <button onClick={handleMarkAllRead} className="flex-gap" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", fontSize: "0.8rem", fontWeight: 600 }}>
              <CheckCheck style={{ width: 16, height: 16 }} />
              <span>Mark All Read</span>
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {alerts.map((a, index) => {
              const borderClass = a.type === "CRITICAL" ? "alert-side-border-danger" : a.type === "WARNING" ? "alert-side-border-warning" : "alert-side-border-success";
              const badgeClass = a.type === "CRITICAL" ? "badge-danger" : a.type === "WARNING" ? "badge-warning" : "badge-green";

              return (
                <div key={index} className={`glass-card ${borderClass}`} style={{ padding: 20, borderRadius: "0 12px 12px 0", background: "rgba(255,255,255,0.01)" }}>
                  <div className="flex-between" style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className={`badge ${badgeClass}`}>{a.type}</span>
                      <code style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ID: {a.id}</code>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{a.time}</span>
                  </div>

                  <h4 style={{ color: "#fff", fontSize: "1.1rem", marginBottom: 8 }}>{a.title}</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 16, lineHeight: 1.5 }}>{a.description}</p>

                  <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={() => handleReportIssue(a.id)} className="btn btn-primary" style={{ padding: "8px 16px", fontSize: "0.8rem" }}>
                      Report Issue
                    </button>
                    <button onClick={() => router.push(`/verify?id=${a.targetId}`)} className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "0.8rem" }}>
                      {a.type === "INFO" ? "Details" : "Audit Trail"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Visual Infrastructure Banner Card */}
        <section style={{ marginTop: 32 }}>
          <div className="glass-card" style={{ height: "220px", position: "relative", overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
            <div 
              style={{ 
                position: "absolute", inset: 0,
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCn61KFJmwzU2DeoJz7J3sDi03tCbsnuk_qUuVRvnGeErIgnl2nl-QHLyVZNu4ib7_GdOG8MO6Q0xIW4b9RTxAoKFhvM4sd9lE1AnFkFm4aAwE5Nf5htc3yjiz9Lxz8OO2KbJ6ZWzvA9ptl5MsUBn6i9GF52dQbrfNlasK07jZVPD8pyYufmNGcptOZDYUV3iI0SDoxQ4ouWzR_-NQPGgnCuwyq_qLIdMNGEdtTO_lAJVCzvhg6zNp90Wn85Ga1UMcyaY9iyxTT5CE')`,
                backgroundSize: "cover", backgroundPosition: "center",
                opacity: 0.15, zIndex: 1
              }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,14,26,0.9), transparent)", zIndex: 2 }} />
            <div style={{ position: "relative", zIndex: 3, padding: 8 }}>
              <h3 style={{ color: "#fff", fontSize: "1.2rem", marginBottom: 4 }}>Encrypted Infrastructure Active</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: 0 }}>End-to-end Soroban contract authentication is operational for all logistics legs.</p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
