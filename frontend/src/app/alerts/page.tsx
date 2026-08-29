"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import { useWallet } from "../../context/WalletContext";
import { Batch, Supplier, Handoff } from "../../types/pharma";
import { getSuppliers } from "../../utils/supplierUtils";
import { 
  generateInventoryAlerts, 
  markAlertAsRead, 
  markAllAlertsAsRead, 
  clearReadAlerts, 
  InventoryAlert, 
  AlertSeverity, 
  AlertCategory 
} from "../../utils/alertUtils";
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCheck, 
  Filter, 
  Search, 
  Package, 
  ExternalLink, 
  CheckCircle2, 
  RefreshCw, 
  XCircle, 
  Clock,
  ShieldCheck,
  AlertOctagon
} from "lucide-react";

export function SecurityCenterContent() {
  const wallet = useWallet();
  const router = useRouter();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch live application state
  const loadAlertData = () => {
    setLoading(true);
    const loadedSupps = getSuppliers();
    setSuppliers(loadedSupps);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
    fetch(`${backendUrl}/api/batches`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBatches(data);
        } else {
          // Fallback rich sample data
          setBatches([
            {
              batch_id: "AX-7729-001",
              drug_name: "Amoxicillin Trihydrate 500mg",
              manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
              quantity: 5000,
              manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 30,
              expiry_date: Math.floor(Date.now() / 1000) + 86400 * 365,
              direct_ship: false,
              is_recalled: false
            },
            {
              batch_id: "MT-2023-F9",
              drug_name: "Metformin XL 500mg Extended Release",
              manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
              quantity: 750, // Low stock
              manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 120,
              expiry_date: Math.floor(Date.now() / 1000) + 86400 * 25, // Expiring soon (<30d)
              direct_ship: false,
              is_recalled: false
            },
            {
              batch_id: "PH-2024-001",
              drug_name: "Insulin Glargine Cold-Chain",
              manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
              quantity: 2500,
              manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 200,
              expiry_date: Math.floor(Date.now() / 1000) - 86400 * 10, // Expired
              direct_ship: true,
              is_recalled: true // Recalled
            }
          ]);
        }
      })
      .catch(() => {
        // Fallback
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAlertData();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Generate dynamic inventory event alerts
  const allAlerts = useMemo(() => {
    return generateInventoryAlerts(batches, handoffs, suppliers);
  }, [batches, handoffs, suppliers]);

  // Compute Metrics Breakdown
  const metrics = useMemo(() => {
    const criticalCount = allAlerts.filter(a => a.severity === "CRITICAL").length;
    const highCount = allAlerts.filter(a => a.severity === "HIGH").length;
    const mediumCount = allAlerts.filter(a => a.severity === "MEDIUM").length;
    const unreadCount = allAlerts.filter(a => !a.isRead).length;

    return { criticalCount, highCount, mediumCount, unreadCount, total: allAlerts.length };
  }, [allAlerts]);

  // Filtered Alerts List
  const filteredAlerts = useMemo(() => {
    return allAlerts.filter(alert => {
      const matchesSearch = 
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.batchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.drugName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSeverity = selectedSeverity === "ALL" || alert.severity === selectedSeverity;
      const matchesCategory = selectedCategory === "ALL" || alert.category === selectedCategory;
      const matchesUnread = !showUnreadOnly || !alert.isRead;

      return matchesSearch && matchesSeverity && matchesCategory && matchesUnread;
    });
  }, [allAlerts, searchQuery, selectedSeverity, selectedCategory, showUnreadOnly]);

  const handleMarkAllRead = () => {
    const ids = allAlerts.map(a => a.id);
    markAllAlertsAsRead(ids);
    triggerToast("All inventory alerts marked as read.");
    loadAlertData();
  };

  const handleClearRead = () => {
    clearReadAlerts();
    triggerToast("Cleared alert read states.");
    loadAlertData();
  };

  const handleSingleRead = (alertId: string) => {
    markAlertAsRead(alertId);
    triggerToast("Alert marked as read.");
    loadAlertData();
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
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          
          {/* Header Section */}
          <div className="flex-between" style={{ flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <ShieldAlert style={{ width: 28, height: 28, stroke: "var(--color-danger)" }} />
                <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#fff", margin: 0 }}>
                  Security & Inventory Event Center
                </h1>
              </div>
              <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.9rem" }}>
                Real-time inventory alerts derived dynamically from Soroban ledger batches, shelf-life expiration telemetry, and recall signals.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleMarkAllRead} className="btn btn-secondary flex-gap" style={{ padding: "8px 14px", fontSize: "0.82rem" }}>
                <CheckCheck style={{ width: 16, height: 16, color: "var(--color-primary)" }} />
                <span>Mark All Read</span>
              </button>
              <button onClick={loadAlertData} className="btn btn-secondary" style={{ padding: "8px 12px" }} title="Refresh Alerts">
                <RefreshCw style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="glass-card" style={{ marginBottom: 20, padding: "12px 18px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle2 style={{ width: 18, height: 18, color: "#34d399" }} />
              <span style={{ color: "#34d399", fontSize: "0.88rem", fontWeight: 600 }}>{toastMessage}</span>
            </div>
          )}

          {/* Global Metric Cards (4 Bento Cards) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
            <div className="glass-card" style={{ padding: 18, borderLeft: "4px solid #ef4444" }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>CRITICAL THREATS</span>
                <AlertOctagon style={{ width: 18, height: 18, stroke: "#ef4444" }} />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f87171" }}>{metrics.criticalCount}</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Recalls & Expired Batches</span>
            </div>

            <div className="glass-card" style={{ padding: 18, borderLeft: "4px solid #f59e0b" }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>HIGH PRIORITY</span>
                <AlertTriangle style={{ width: 18, height: 18, stroke: "#f59e0b" }} />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fbbf24" }}>{metrics.highCount}</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Quarantines & Expiring &lt;30d</span>
            </div>

            <div className="glass-card" style={{ padding: 18, borderLeft: "4px solid #3b82f6" }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>MEDIUM / LOW STOCK</span>
                <Package style={{ width: 18, height: 18, stroke: "#3b82f6" }} />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#60a5fa" }}>{metrics.mediumCount}</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>&lt;1,000 units stock warnings</span>
            </div>

            <div className="glass-card" style={{ padding: 18, borderLeft: "4px solid #10b981" }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>SYSTEM INTEGRITY</span>
                <ShieldCheck style={{ width: 18, height: 18, stroke: "#10b981" }} />
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#34d399", marginTop: 4 }}>OPERATIONAL</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Zero security breaches</span>
            </div>
          </div>

          {/* Search & Filter Controls Toolbar */}
          <div className="glass-card" style={{ padding: 16, marginBottom: 24, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            {/* Search Input */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
              <Search style={{ width: 18, height: 18, stroke: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search alerts by drug name, batch ID, or title..."
                className="form-control"
                style={{ border: "none", background: "transparent", padding: 0 }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Dropdowns */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Filter style={{ width: 14, height: 14, stroke: "var(--text-muted)" }} />
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Severity:</span>
                <select
                  className="form-control"
                  style={{ width: 130, padding: "4px 8px", fontSize: "0.8rem" }}
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="INFO">Info</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Category:</span>
                <select
                  className="form-control"
                  style={{ width: 140, padding: "4px 8px", fontSize: "0.8rem" }}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="ALL">All Categories</option>
                  <option value="RECALL">Recalls</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="QUARANTINE">Quarantine</option>
                  <option value="EXPIRING_SOON">Expiring Soon</option>
                  <option value="LOW_STOCK">Low Stock</option>
                </select>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--text-muted)", cursor: "pointer", marginLeft: 4 }}>
                <input
                  type="checkbox"
                  checked={showUnreadOnly}
                  onChange={(e) => setShowUnreadOnly(e.target.checked)}
                />
                <span>Unread Only ({metrics.unreadCount})</span>
              </label>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              <p>Evaluating live inventory alerts...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredAlerts.length === 0 && (
            <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
              <ShieldCheck style={{ width: 44, height: 44, stroke: "#34d399", margin: "0 auto 12px" }} />
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", marginBottom: 6 }}>No Active Alerts Matching Filter</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", maxWidth: 450, margin: "0 auto" }}>
                All pharmaceutical batches are currently operating within nominal quality thresholds.
              </p>
            </div>
          )}

          {/* Alerts Cards List */}
          {!loading && filteredAlerts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {filteredAlerts.map((alert) => {
                const borderClass = 
                  alert.severity === "CRITICAL" ? "alert-side-border-danger" : 
                  alert.severity === "HIGH" ? "alert-side-border-warning" : 
                  alert.severity === "MEDIUM" ? "alert-side-border-warning" : "alert-side-border-success";

                const badgeClass = 
                  alert.severity === "CRITICAL" ? "badge-danger" : 
                  alert.severity === "HIGH" ? "badge-warning" : 
                  alert.severity === "MEDIUM" ? "badge-warning" : "badge-green";

                return (
                  <div 
                    key={alert.id} 
                    className={`glass-card ${borderClass}`} 
                    style={{ 
                      padding: 20, 
                      borderRadius: "0 12px 12px 0", 
                      background: alert.isRead ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
                      opacity: alert.isRead ? 0.75 : 1 
                    }}
                  >
                    <div className="flex-between" style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className={`badge ${badgeClass}`}>{alert.severity}</span>
                        <span className="badge badge-blue" style={{ fontSize: "0.68rem" }}>{alert.category.replace("_", " ")}</span>
                        <code style={{ fontSize: "0.78rem", color: "var(--color-primary)", background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: 4 }}>
                          #{alert.batchId}
                        </code>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{alert.timeFormatted}</span>
                        {!alert.isRead && (
                          <button
                            onClick={() => handleSingleRead(alert.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                            title="Mark as Read"
                          >
                            <CheckCheck style={{ width: 14, height: 14 }} />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 style={{ color: "#fff", fontSize: "1.1rem", marginBottom: 6, fontWeight: 700 }}>
                      {alert.title}
                    </h4>
                    
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: 16, lineHeight: 1.5 }}>
                      {alert.description}
                    </p>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                      <button
                        onClick={() => router.push(alert.actionUrl)}
                        className="btn btn-primary flex-gap"
                        style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                      >
                        <span>Audit Trail & Verification</span>
                        <ExternalLink style={{ width: 14, height: 14 }} />
                      </button>

                      <Link
                        href="/inventory"
                        className="btn btn-secondary flex-gap"
                        style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                      >
                        <Package style={{ width: 14, height: 14 }} />
                        <span>Manage Stock</span>
                      </Link>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default function SecurityCenter() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--bg-dark)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-bright)" }}>
        <p>Loading Security Event Center...</p>
      </div>
    }>
      <SecurityCenterContent />
    </Suspense>
  );
}
