"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "../context/WalletContext";
import Navbar from "../components/Navbar";
import { 
  Building, 
  Truck, 
  PlusCircle, 
  Search, 
  QrCode, 
  Package,
  ArrowRight,
  ShieldAlert,
  Globe
} from "lucide-react";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import MedicineTrackingTable, { MedicineRecord } from "../components/MedicineTrackingTable";
import GS1DataMatrixModal from "../components/GS1DataMatrixModal";
import { getSuppliers } from "../utils/supplierUtils";
import { Supplier } from "../types/pharma";

export default function Home() {
  const wallet = useWallet();
  const router = useRouter();
  const [selectedGS1Batch, setSelectedGS1Batch] = useState<MedicineRecord | null>(null);
  const [isGS1Open, setIsGS1Open] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [_wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Live Application Suppliers
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);

  // Registered Medicine Batches List
  const [batchesList, setBatchesList] = useState<MedicineRecord[]>([
    {
      batch_id: "AX-7729-001",
      drug_name: "Amoxicillin Trihydrate 500mg",
      manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
      quantity: 5000,
      manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 30,
      expiry_date: Math.floor(Date.now() / 1000) + 86400 * 365,
      direct_ship: false,
      is_recalled: false,
      current_role: "Distributor"
    },
    {
      batch_id: "MT-2023-F9",
      drug_name: "Metformin XL 500mg Extended Release",
      manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
      quantity: 850, // Low stock demo
      manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 120,
      expiry_date: Math.floor(Date.now() / 1000) + 86400 * 45, // Expiring soon
      direct_ship: false,
      is_recalled: false,
      current_role: "Pharmacy"
    },
    {
      batch_id: "PH-2024-001",
      drug_name: "Insulin Glargine Cold-Chain",
      manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
      quantity: 2500,
      manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 200,
      expiry_date: Math.floor(Date.now() / 1000) - 86400 * 10, // Expired
      direct_ship: true,
      is_recalled: true,
      current_role: "Manufacturer"
    }
  ]);

  useEffect(() => {
    // Load suppliers
    const supps = getSuppliers();
    setSuppliersList(supps);

    const fetchBatches = async () => {
      setLoading(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
        const res = await fetch(`${backendUrl}/api/batches`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            setBatchesList(list);
          }
        }
      } catch (_e) {
        // Fallback to sample data
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, []);

  // Recently Verified logs
  const [verifiedLogs, setVerifiedLogs] = useState([
    { name: "Metformin XL 500mg", id: "MT-2023-F9", time: "14:22:10 UTC", status: "VERIFIED" },
    { name: "Lisinopril BP 10mg", id: "LS-9912-A1", time: "13:45:55 UTC", status: "VERIFIED" },
    { name: "Atorvastatin Calcium", id: "AT-0045-G5", time: "12:30:12 UTC", status: "RE-SCAN REQ." }
  ]);

  // Security Alerts List
  const [alertsList, setAlertsList] = useState([
    { id: "SEC-882-X", type: "CRITICAL", title: "Suspicious Batch ID Detected", description: "Anomalous blockchain signature identified in Batch #PH-2024-001. Multiple verification attempts from unauthorized nodes detected in regional warehouse B-12.", time: "2m ago" },
    { id: "LOG-441-T", type: "WARNING", title: "Temperature Excursion in Transit", description: "Cold-chain sensor S-102 reported 8.4°C (Limit: 8.0°C) during transatlantic transport. Quality assurance protocols must be initiated upon arrival.", time: "14m ago" }
  ]);

  // WebSocket Connection for Real-Time Event Indexing & Recall Alerts
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:8080/ws";
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWs = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
        console.log("WebSocket connected.");
      };

      ws.onclose = () => {
        setWsConnected(false);
        console.log("WebSocket disconnected. Retrying in 5s...");
        reconnectTimeout = setTimeout(connectWs, 5000);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type) {
            setLiveEvents((prev) => [payload, ...prev].slice(0, 8));

            // Dynamically add to verified logs if it's a register event
            if (payload.type === "BATCH_REGISTERED") {
              setVerifiedLogs(prev => [
                { 
                  name: payload.data.drug_name || "Registered Batch", 
                  id: payload.data.batch_id, 
                  time: new Date().toLocaleTimeString("en-US", { hour12: false }) + " UTC", 
                  status: "VERIFIED" 
                },
                ...prev
              ].slice(0, 5));
            }

            // Dynamically insert recall warnings into alerts
            if (payload.type === "BATCH_RECALLED") {
              setAlertsList(prev => [
                {
                  id: `REC-${payload.data.batch_id}`,
                  type: "CRITICAL",
                  title: "Emergency Recall Triggered",
                  description: `Manufacturer issued an on-chain recall for batch ID: ${payload.data.batch_id}. Seal verification flagged.`,
                  time: "Just now"
                },
                ...prev
              ].slice(0, 5));
            }
          }
        } catch (e) {
          console.error("Failed to parse WS payload:", e);
        }
      };
    };

    connectWs();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      router.push(`/verify?id=${encodeURIComponent(searchId.trim())}`);
    }
  };

  const getAlertBorderClass = (type: string) => {
    if (type === "CRITICAL") return "alert-side-border-danger";
    if (type === "WARNING") return "alert-side-border-warning";
    return "alert-side-border-success";
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
        
        {/* Header Hero Section */}
        <section style={{ margin: "20px 0 32px" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: 8, lineHeight: 1.2 }}>
            Trustless Pharma <span style={{ background: "linear-gradient(135deg, #3b82f6 0%, #10b981 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Control Center</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", maxWidth: 800 }}>
            Real-time pharmaceutical custody tracking, cold-chain temperature telemetry, and cryptographic verification on Stellar.
          </p>
        </section>

        {/* 1. System Health Metrics (Bento Style) */}
        <section className="dashboard-metrics-grid">
          <div className="glass-card metric-card" style={{ borderLeft: "4px solid var(--color-danger)" }}>
            <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>Active Threat Index</span>
            <div className="metric-card-val" style={{ color: "var(--color-danger)" }}>
              {alertsList.filter(a => a.type === "CRITICAL").length.toString().padStart(2, "0")}
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>Critical batch recalls flagged</p>
          </div>
          <div className="glass-card metric-card" style={{ borderLeft: "4px solid var(--color-primary)" }}>
            <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>Ledger Verifications (24h)</span>
            <div className="metric-card-val" style={{ color: "var(--color-primary)" }}>
              {(1248 + liveEvents.length).toLocaleString()}
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>Cryptographic checks verified</p>
          </div>
          <div className="glass-card metric-card" style={{ borderLeft: "4px solid var(--color-success)" }}>
            <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>System Integrity Status</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
              <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff" }}>Stable</span>
              <div className="wallet-dot status-pulse" style={{ background: "var(--color-success)", position: "relative", top: 0, left: 0 }} />
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 12 }}>Stellar Testnet node online</p>
          </div>
        </section>

        {/* Feature 7: Dynamic Analytics Dashboard */}
        <section style={{ marginBottom: 32 }}>
          <AnalyticsDashboard
            batches={batchesList}
            suppliers={suppliersList}
            loading={loading}
          />
        </section>

        {/* Feature 1 & 6: Medicine Tracking Dashboard & Expiry Alerts */}
        <section style={{ marginBottom: 32 }}>
          <MedicineTrackingTable
            batches={batchesList}
            onViewGS1={(batch) => {
              setSelectedGS1Batch(batch);
              setIsGS1Open(true);
            }}
          />
        </section>

        {/* Empty State Banner if no batches registered */}
        {!loading && batchesList.length === 0 && (
          <section className="glass-card" style={{ marginBottom: 32, textAlign: "center", padding: 36, border: "1px dashed var(--border-focus)" }}>
            <Package style={{ width: 48, height: 48, stroke: "var(--color-primary)", margin: "0 auto 12px" }} />
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", marginBottom: 6 }}>No Batches Registered in Ledger</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: 500, margin: "0 auto 20px" }}>
              Mint and record pharmaceutical batches on-chain to enable custody tracking, telemetry logging, and authenticity verification.
            </p>
            <Link href="/inventory" className="btn btn-primary flex-gap" style={{ display: "inline-flex" }}>
              <PlusCircle style={{ width: 16, height: 16 }} />
              <span>Register First Batch</span>
            </Link>
          </section>
        )}

        {/* 2. Main Content Grid */}
        <div className="dashboard-grid">
          
          {/* Left Column: Active Batches & Quick Scan & Recently Verified */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Quick Scan CTA Card */}
            <div className="glass-card" style={{ background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)", borderColor: "rgba(59, 130, 246, 0.25)" }}>
              <div className="flex-responsive-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8, color: "#fff" }}>Ready to Verify Packaging?</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 550, marginBottom: 16 }}>
                    Instantly authenticate prescription products using on-chain smart ledger scanning. Connect your camera or input tracking codes directly.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8, flex: 1, minWidth: "260px" }}>
                      <input
                        type="text"
                        placeholder="Enter Batch ID (e.g. AX-7729-001)..."
                        className="form-control"
                        style={{ background: "rgba(0, 0, 0, 0.3)", borderColor: "rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.85rem" }}
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                      />
                      <button type="submit" className="btn btn-primary" style={{ padding: "8px 16px" }}>
                        <Search style={{ width: 16, height: 16 }} />
                      </button>
                    </form>
                    <Link href="/scan" className="btn btn-secondary flex-gap" style={{ background: "rgba(59, 130, 246, 0.2)", border: "1px solid rgba(59, 130, 246, 0.3)", padding: "10px 20px" }}>
                      <QrCode style={{ width: 16, height: 16 }} />
                      <span>Start Quick Scan</span>
                    </Link>
                    <Link href="/inventory" className="btn btn-primary flex-gap" style={{ padding: "10px 20px" }}>
                      <Package style={{ width: 16, height: 16 }} />
                      <span>Inventory Portal</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Batches in Transit */}
            <div>
              <div className="flex-between" style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: "1.3rem" }}>Active Shipments in Transit</h2>
                <span className="form-label" style={{ margin: 0, fontSize: "0.75rem" }}>02 Active Routes</span>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                
                {/* Batch Card 1 */}
                <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="flex-between">
                    <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: 8, borderRadius: 8 }}>
                      <Truck style={{ width: 20, height: 20, stroke: "var(--color-primary)" }} />
                    </div>
                    <span className="badge badge-green">TEMP STABLE</span>
                  </div>
                  <div>
                    <span className="form-label" style={{ fontSize: "0.7rem", margin: 0 }}>BATCH ID</span>
                    <code style={{ background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: 4, fontSize: "0.75rem", display: "inline-block", marginTop: 2, color: "#93c5fd" }}>AX-7729-001</code>
                    <h4 style={{ fontSize: "1.1rem", marginTop: 8, color: "#fff" }}>Amoxicillin CL-V</h4>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-glass)", paddingTop: 12, fontSize: "0.85rem" }}>
                    <div>
                      <span className="form-label" style={{ fontSize: "0.65rem", margin: 0 }}>Destination</span>
                      <span style={{ fontWeight: 600 }}>New York, USA</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="form-label" style={{ fontSize: "0.65rem", margin: 0 }}>Temp Range</span>
                      <span style={{ color: "var(--color-success)" }}>4.2°C Stable</span>
                    </div>
                  </div>
                </div>

                {/* Batch Card 2 */}
                <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="flex-between">
                    <div style={{ background: "rgba(245, 158, 11, 0.1)", padding: 8, borderRadius: 8 }}>
                      <Truck style={{ width: 20, height: 20, stroke: "var(--color-warning)" }} />
                    </div>
                    <span className="badge badge-warning">DELAYED</span>
                  </div>
                  <div>
                    <span className="form-label" style={{ fontSize: "0.7rem", margin: 0 }}>BATCH ID</span>
                    <code style={{ background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: 4, fontSize: "0.75rem", display: "inline-block", marginTop: 2, color: "#fde047" }}>IP-9901-B22</code>
                    <h4 style={{ fontSize: "1.1rem", marginTop: 8, color: "#fff" }}>Ibuprofen Pro 400</h4>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-glass)", paddingTop: 12, fontSize: "0.85rem" }}>
                    <div>
                      <span className="form-label" style={{ fontSize: "0.65rem", margin: 0 }}>Destination</span>
                      <span style={{ fontWeight: 600 }}>Berlin, DE</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="form-label" style={{ fontSize: "0.65rem", margin: 0 }}>Handoffs</span>
                      <span style={{ color: "var(--color-warning)" }}>1 Handoff</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Recently Verified Logs Table */}
            <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.01)", borderBottom: "1px solid var(--border-glass)" }} className="flex-between">
                <h3 style={{ fontSize: "1rem", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>RECENTLY VERIFIED BATCHES</h3>
                <span className="form-label" style={{ fontSize: "0.75rem", margin: 0, color: "var(--color-primary)" }}>LEDGER VERIFIED</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-glass)", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      <th style={{ padding: "12px 20px" }}>PRODUCT NAME</th>
                      <th style={{ padding: "12px 20px" }}>BATCH ID</th>
                      <th style={{ padding: "12px 20px" }}>TIMESTAMP</th>
                      <th style={{ padding: "12px 20px", textAlign: "right" }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verifiedLogs.map((log, index) => (
                      <tr 
                        key={index} 
                        style={{ borderBottom: index < verifiedLogs.length - 1 ? "1px solid rgba(255,255,255,0.02)" : "none", cursor: "pointer" }}
                        className="hover-row"
                        onClick={() => router.push(`/verify?id=${log.id}`)}
                      >
                        <td style={{ padding: "14px 20px", fontWeight: 500, color: "#fff" }}>{log.name}</td>
                        <td style={{ padding: "14px 20px" }}>
                          <code style={{ color: "var(--color-primary)" }}>{log.id}</code>
                        </td>
                        <td style={{ padding: "14px 20px", color: "var(--text-muted)" }}>{log.time}</td>
                        <td style={{ padding: "14px 20px", textAlign: "right" }}>
                          <span className={`badge ${log.status === "VERIFIED" ? "badge-green" : "badge-warning"}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Portal Navigation Cards */}
            <div>
              <h2 style={{ fontSize: "1.3rem", marginBottom: 16 }}>Supply Chain Portals</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                
                {/* Manufacturer Card */}
                <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ padding: 10, background: "rgba(59, 130, 246, 0.08)", borderRadius: 8 }}>
                      <PlusCircle style={{ width: 22, height: 22, stroke: "var(--color-primary)" }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff" }}>Manufacturer Portal</h3>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: 0 }}>Register drug batches and handle recalls</p>
                    </div>
                  </div>
                  <Link href="/manufacturer" onClick={(e) => {
                    if (!wallet.connected) {
                      e.preventDefault();
                      wallet.connect("mock-manufacturer").then(() => {
                        router.push("/manufacturer");
                      });
                    }
                  }} className="btn btn-secondary flex-gap" style={{ padding: "8px 16px" }}>
                    <span>Enter</span>
                    <ArrowRight style={{ width: 14, height: 14 }} />
                  </Link>
                </div>

                {/* Distributor Card */}
                <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ padding: 10, background: "rgba(245, 158, 11, 0.08)", borderRadius: 8 }}>
                      <Truck style={{ width: 22, height: 22, stroke: "var(--color-warning)" }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff" }}>Distributor Portal</h3>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: 0 }}>Record batch handoffs and split volumes</p>
                    </div>
                  </div>
                  <Link href="/distributor" onClick={(e) => {
                    if (!wallet.connected) {
                      e.preventDefault();
                      wallet.connect("mock-distributor").then(() => {
                        router.push("/distributor");
                      });
                    }
                  }} className="btn btn-secondary flex-gap" style={{ padding: "8px 16px" }}>
                    <span>Enter</span>
                    <ArrowRight style={{ width: 14, height: 14 }} />
                  </Link>
                </div>

                {/* Pharmacy Card */}
                <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ padding: 10, background: "rgba(16, 185, 129, 0.08)", borderRadius: 8 }}>
                      <Building style={{ width: 22, height: 22, stroke: "var(--color-success)" }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#fff" }}>Pharmacy Portal</h3>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: 0 }}>Manage dispense events and recall feeds</p>
                    </div>
                  </div>
                  <Link href="/pharmacy" onClick={(e) => {
                    if (!wallet.connected) {
                      e.preventDefault();
                      wallet.connect("mock-pharmacy").then(() => {
                        router.push("/pharmacy");
                      });
                    }
                  }} className="btn btn-secondary flex-gap" style={{ padding: "8px 16px" }}>
                    <span>Enter</span>
                    <ArrowRight style={{ width: 14, height: 14 }} />
                  </Link>
                </div>

              </div>
            </div>

          </div>

          {/* Right Column: Security Alerts & GPS Map */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Live Alerts Side Card */}
            <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", background: "rgba(239, 68, 68, 0.15)", borderBottom: "1px solid rgba(239,68,68,0.2)" }} className="flex-between">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ShieldAlert style={{ width: 18, height: 18, stroke: "var(--color-danger)" }} />
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.05em", color: "#fca5a5" }}>SECURITY ALERTS</span>
                </div>
                <span className="badge badge-danger status-pulse">LIVE</span>
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                {alertsList.map((alert, idx) => (
                  <div 
                    key={idx} 
                    className={`glass-card ${getAlertBorderClass(alert.type)}`} 
                    style={{ padding: 12, background: "rgba(255, 255, 255, 0.01)", borderRadius: "0 8px 8px 0" }}
                  >
                    <div className="flex-between">
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: alert.type === "CRITICAL" ? "var(--color-danger)" : "var(--color-warning)" }}>
                        {alert.type} WARNING
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{alert.time}</span>
                    </div>
                    <h5 style={{ color: "#fff", fontSize: "0.85rem", marginTop: 4, marginBottom: 4 }}>{alert.title}</h5>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
                      {alert.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Map Visual Card */}
            <div className="glass-card">
              <div className="flex-between" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <Globe style={{ width: 18, height: 18, stroke: "var(--color-primary)" }} />
                  <span>Global Relay Network</span>
                </h3>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Node Map</span>
              </div>
              <div className="verification-map-container">
                <div 
                  className="verification-map-bg" 
                  style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCl8QPc38fEOCCjIUDf54s9VpYE-ZrfvX-U9Nr5B1L7416rRUaYFUec6pEKVvRggD7h56q3k9v7JyWtV7auue_KVM_z7KDMcabHuJq0IleZUEC_32XlgfobZ05PSTCZ5DTWxcfCxYqrV2eR_9aY6f6y9prxJg40UG6HoYp8GW-nL-2z1-yNAoD-B8PQ3OgG5NQkb8EBkmTbSnk6EawlPBlGgGajJk2ECrIWC6HpUnflv7xxPYoph44LmrnR-uIVQ-N9XYsLYCmnY4I')` }}
                />
                <div className="absolute inset-0" style={{ background: "rgba(59, 130, 246, 0.05)" }} />
                
                {/* Visual Blinking Nodes representing transit routes */}
                <div className="map-node active-node" style={{ top: "35%", left: "25%" }} title="US Transit hub" />
                <div className="map-node ping-node" style={{ top: "50%", left: "30%" }} />
                <div className="map-node active-node" style={{ top: "42%", left: "48%" }} title="Frankfurt hub" />
                <div className="map-node active-node" style={{ top: "60%", left: "75%" }} title="APAC terminal" />
                <div className="map-node ping-node" style={{ top: "40%", left: "55%" }} />
              </div>
            </div>

          </div>

        </div>

      </main>

      {selectedGS1Batch && (
        <GS1DataMatrixModal
          isOpen={isGS1Open}
          onClose={() => setIsGS1Open(false)}
          batch={selectedGS1Batch}
        />
      )}
      
      <style jsx global>{`
        .hover-row:hover {
          background: rgba(255, 255, 255, 0.03) !important;
        }
      `}</style>
    </div>
  );
}

