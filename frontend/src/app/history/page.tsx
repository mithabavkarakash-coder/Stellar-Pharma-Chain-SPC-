"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import { useWallet } from "../../context/WalletContext";
import { Batch, Supplier, Handoff } from "../../types/pharma";
import { getSuppliers } from "../../utils/supplierUtils";
import { 
  getAuditHistoryLogs, 
  getAuditMetrics, 
  formatSafeTxHash, 
  AuditLogItem, 
  AuditActionType 
} from "../../utils/auditUtils";
import { 
  History, 
  Search, 
  Filter, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  FileText, 
  Factory, 
  Truck, 
  Building, 
  AlertTriangle, 
  XCircle, 
  Package, 
  Download,
  CheckCircle2,
  Lock
} from "lucide-react";

export function AuditHistoryContent() {
  const wallet = useWallet();
  const router = useRouter();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");

  // Modal & Toast state
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch batches & handoffs
  const loadAuditData = () => {
    setLoading(true);
    const loadedSupps = getSuppliers();
    setSuppliers(loadedSupps);

    // Initial default demo handoffs
    const defaultHandoffs: Handoff[] = [
      {
        batch_id: "AX-7729-001",
        from_address: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
        to_address: "GDISTRIB7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN8888",
        new_role: "Distributor",
        quantity: 5000,
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 45,
        transaction_hash: "5fb9930f8b898127000000000000000000000000000000000000000000000001"
      },
      {
        batch_id: "AX-7729-001",
        from_address: "GDISTRIB7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN8888",
        to_address: "GPHARMACYUIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN9999",
        new_role: "Pharmacy",
        quantity: 2500,
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 15,
        transaction_hash: "5fb9930f8b898127000000000000000000000000000000000000000000000002"
      },
      {
        batch_id: "MT-2023-F9",
        from_address: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
        to_address: "GDISTRIB7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN8888",
        new_role: "Distributor",
        quantity: 12000,
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 60,
        transaction_hash: "5fb9930f8b898127000000000000000000000000000000000000000000000004"
      }
    ];
    setHandoffs(defaultHandoffs);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
    fetch(`${backendUrl}/api/batches`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBatches(data);
        } else {
          setBatches([
            {
              batch_id: "AX-7729-001",
              drug_name: "Amoxicillin Trihydrate 500mg",
              manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
              quantity: 5000,
              manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 60,
              expiry_date: Math.floor(Date.now() / 1000) + 86400 * 300,
              direct_ship: false,
              is_recalled: false
            },
            {
              batch_id: "MT-2023-F9",
              drug_name: "Metformin XL 500mg Extended Release",
              manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
              quantity: 12000,
              manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 120,
              expiry_date: Math.floor(Date.now() / 1000) + 86400 * 45,
              direct_ship: false,
              is_recalled: false
            },
            {
              batch_id: "REC-9921-00",
              drug_name: "Valganciclovir 450mg Film Coated",
              manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
              quantity: 800,
              manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 90,
              expiry_date: Math.floor(Date.now() / 1000) + 86400 * 200,
              direct_ship: false,
              is_recalled: true,
              recalled_by: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663"
            }
          ]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAuditData();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyTxHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(id);
    triggerToast("Copied Soroban Transaction Hash to clipboard");
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Compile all audit logs dynamically
  const allLogs = useMemo(() => {
    return getAuditHistoryLogs(batches, handoffs, suppliers);
  }, [batches, handoffs, suppliers]);

  // Compute Metrics
  const metrics = useMemo(() => {
    return getAuditMetrics(allLogs);
  }, [allLogs]);

  // Filtered Logs List
  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      const matchesSearch = 
        log.batch_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.drug_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actor_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.transaction_hash.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAction = selectedAction === "ALL" || log.action === selectedAction;
      const matchesRole = selectedRole === "ALL" || log.actor_role === selectedRole;

      return matchesSearch && matchesAction && matchesRole;
    });
  }, [allLogs, searchQuery, selectedAction, selectedRole]);

  // Export Manifest Handler
  const handleExportCSV = () => {
    const csvHeader = "Log ID,Action,Batch ID,Drug Name,Actor,Actor Address,Quantity,Timestamp,Status,Tx Hash\n";
    const csvRows = filteredLogs.map(l => 
      `"${l.id}","${l.action}","${l.batch_id}","${l.drug_name}","${l.actor_name}","${l.actor_address}","${l.quantity || 0}","${l.timestampFormatted}","${l.status}","${l.transaction_hash}"`
    ).join("\n");

    const blob = new Blob([csvHeader + csvRows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spc_audit_manifest_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast("Exported Audit Manifest CSV");
  };

  const openDetailModal = (log: AuditLogItem) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
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
                <History style={{ width: 28, height: 28, stroke: "var(--color-primary)" }} />
                <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#fff", margin: 0 }}>
                  Ledger Transaction & Audit History
                </h1>
              </div>
              <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.9rem" }}>
                Immutable, cryptographic audit log of all pharmaceutical batch registrations, custody handoffs, dispenses, and recalls on Soroban.
              </p>
            </div>

            <button onClick={handleExportCSV} className="btn btn-secondary flex-gap" style={{ padding: "10px 18px" }}>
              <Download style={{ width: 16, height: 16 }} />
              <span>Export Audit Manifest</span>
            </button>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="glass-card" style={{ marginBottom: 20, padding: "12px 18px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle2 style={{ width: 18, height: 18, color: "#34d399" }} />
              <span style={{ color: "#34d399", fontSize: "0.88rem", fontWeight: 600 }}>{toastMessage}</span>
            </div>
          )}

          {/* Top Metric Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
            <div className="glass-card" style={{ padding: 18 }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>TOTAL AUDIT LOGS</span>
                <FileText style={{ width: 18, height: 18, stroke: "var(--color-primary)" }} />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff" }}>{metrics.totalLogs}</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>On-chain recorded actions</span>
            </div>

            <div className="glass-card" style={{ padding: 18 }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>BATCH REGISTRATIONS</span>
                <Factory style={{ width: 18, height: 18, stroke: "#3b82f6" }} />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#60a5fa" }}>{metrics.registrationsCount}</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Manufacturer mints</span>
            </div>

            <div className="glass-card" style={{ padding: 18 }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>CUSTODY HANDOFFS</span>
                <Truck style={{ width: 18, height: 18, stroke: "#c084fc" }} />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#c084fc" }}>{metrics.handoffsCount}</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Supply-chain custody transfers</span>
            </div>

            <div className="glass-card" style={{ padding: 18 }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>SAFETY AUDIT FLAGS</span>
                <AlertTriangle style={{ width: 18, height: 18, stroke: "#ef4444" }} />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f87171" }}>{metrics.recallsCount}</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Quarantine & recall logs</span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="glass-card" style={{ padding: 16, marginBottom: 24, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            {/* Search Input */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
              <Search style={{ width: 18, height: 18, stroke: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search history by batch ID, drug name, actor address, or transaction hash..."
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
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Action:</span>
                <select
                  className="form-control"
                  style={{ width: 160, padding: "4px 8px", fontSize: "0.8rem" }}
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                >
                  <option value="ALL">All Actions</option>
                  <option value="BATCH_REGISTERED">Batch Registered</option>
                  <option value="CUSTODY_HANDOFF">Custody Handoff</option>
                  <option value="PATIENT_DISPENSED">Patient Dispensed</option>
                  <option value="QUARANTINE_FLAGGED">Quarantine Flagged</option>
                  <option value="BATCH_RECALLED">Batch Recalled</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Actor Role:</span>
                <select
                  className="form-control"
                  style={{ width: 140, padding: "4px 8px", fontSize: "0.8rem" }}
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="ALL">All Roles</option>
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Auditor">Auditor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              <p>Loading Soroban On-Chain Audit Records...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredLogs.length === 0 && (
            <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
              <History style={{ width: 44, height: 44, stroke: "var(--color-primary)", margin: "0 auto 12px" }} />
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", marginBottom: 6 }}>No Audit Logs Match Criteria</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", maxWidth: 450, margin: "0 auto" }}>
                Try clearing search terms or selecting a different action filter.
              </p>
            </div>
          )}

          {/* Audit History Table */}
          {!loading && filteredLogs.length > 0 && (
            <div className="glass-card" style={{ padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-glass)", background: "rgba(255,255,255,0.02)" }}>
                    <th style={{ padding: "14px 18px", color: "var(--text-muted)" }}>Action Type</th>
                    <th style={{ padding: "14px 18px", color: "var(--text-muted)" }}>Medicine / Batch ID</th>
                    <th style={{ padding: "14px 18px", color: "var(--text-muted)" }}>Actor Node & Role</th>
                    <th style={{ padding: "14px 18px", color: "var(--text-muted)" }}>Volume</th>
                    <th style={{ padding: "14px 18px", color: "var(--text-muted)" }}>Timestamp</th>
                    <th style={{ padding: "14px 18px", color: "var(--text-muted)" }}>Soroban Tx Hash</th>
                    <th style={{ padding: "14px 18px", color: "var(--text-muted)", textAlign: "right" }}>Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const actionBadge = 
                      log.action === "BATCH_REGISTERED" ? "badge-blue" :
                      log.action === "CUSTODY_HANDOFF" ? "badge-purple" :
                      log.action === "PATIENT_DISPENSED" ? "badge-green" :
                      log.action === "QUARANTINE_FLAGGED" ? "badge-warning" : "badge-danger";

                    return (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--border-glass)" }}>
                        
                        {/* Action Badge */}
                        <td style={{ padding: "14px 18px" }}>
                          <span className={`badge ${actionBadge}`} style={{ fontSize: "0.72rem" }}>
                            {log.action.replace("_", " ")}
                          </span>
                        </td>

                        {/* Drug Name & Batch ID */}
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ fontWeight: 700, color: "#fff" }}>{log.drug_name}</div>
                          <Link href={`/verify?id=${encodeURIComponent(log.batch_id)}`} style={{ fontSize: "0.75rem", color: "var(--color-primary)", textDecoration: "none" }}>
                            #{log.batch_id}
                          </Link>
                        </td>

                        {/* Actor Company & Role */}
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ color: "#fff", fontWeight: 600 }}>{log.actor_name}</div>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            {log.actor_role} ({log.actor_address.substring(0, 6)}...{log.actor_address.substring(log.actor_address.length - 4)})
                          </span>
                        </td>

                        {/* Volume */}
                        <td style={{ padding: "14px 18px", fontWeight: 600, color: "#e2e8f0" }}>
                          {log.quantity ? `${log.quantity.toLocaleString()} units` : "N/A"}
                        </td>

                        {/* Timestamp */}
                        <td style={{ padding: "14px 18px", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                          {log.timestampFormatted}
                        </td>

                        {/* Tx Hash */}
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <code style={{ fontSize: "0.75rem", color: "#93c5fd", background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: 4 }}>
                              {formatSafeTxHash(log.transaction_hash)}
                            </code>
                            <button
                              onClick={() => handleCopyTxHash(log.transaction_hash, log.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: copiedHash === log.id ? "#10b981" : "var(--text-muted)" }}
                              title="Copy Hash"
                            >
                              {copiedHash === log.id ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "14px 18px", textAlign: "right" }}>
                          <button
                            onClick={() => openDetailModal(log)}
                            className="btn btn-secondary"
                            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                          >
                            Inspect Proof
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Audit Detail Modal */}
          {isDetailModalOpen && selectedLog && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
              <div className="glass-card" style={{ width: "100%", maxWidth: "640px", padding: 28 }}>
                <div className="flex-between" style={{ marginBottom: 20, borderBottom: "1px solid var(--border-glass)", paddingBottom: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Lock style={{ width: 16, height: 16, stroke: "var(--color-primary)" }} />
                      <span className="form-label" style={{ fontSize: "0.7rem", margin: 0, color: "var(--color-primary)" }}>IMMUTABLE SOROBAN LEDGER PROOF</span>
                    </div>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff" }}>{selectedLog.action.replace("_", " ")}</h2>
                  </div>
                  <button onClick={() => setIsDetailModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.5rem" }}>
                    <XCircle style={{ width: 24, height: 24 }} />
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                  <div style={{ background: "rgba(0,0,0,0.3)", padding: 14, borderRadius: 8 }}>
                    <strong>Medicine / Drug Name:</strong> <span style={{ color: "#fff" }}>{selectedLog.drug_name}</span> <br />
                    <strong>Batch Identifier:</strong> <code>#{selectedLog.batch_id}</code>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Actor Company:</span> <br />
                      <strong style={{ color: "#fff" }}>{selectedLog.actor_name}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Actor Role:</span> <br />
                      <strong>{selectedLog.actor_role}</strong>
                    </div>
                  </div>

                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Actor Public Key Address:</span> <br />
                    <code style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{selectedLog.actor_address}</code>
                  </div>

                  {selectedLog.recipient_address && (
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Recipient Node:</span> <br />
                      <strong style={{ color: "#fff" }}>{selectedLog.recipient_name}</strong> <br />
                      <code style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{selectedLog.recipient_address}</code>
                    </div>
                  )}

                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Soroban Transaction Hash:</span> <br />
                    <code style={{ fontSize: "0.75rem", color: "#93c5fd", wordBreak: "break-all" }}>{selectedLog.transaction_hash}</code>
                  </div>

                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Event Description:</span> <br />
                    <p style={{ margin: "4px 0 0", color: "#e2e8f0" }}>{selectedLog.details}</p>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border-glass)" }}>
                  <Link href={`/verify?id=${encodeURIComponent(selectedLog.batch_id)}`} className="btn btn-primary flex-gap" style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                    <span>Verify Batch Timeline</span>
                    <ExternalLink style={{ width: 14, height: 14 }} />
                  </Link>

                  <button onClick={() => setIsDetailModalOpen(false)} className="btn btn-secondary" style={{ padding: "6px 14px" }}>
                    Close Proof
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default function AuditHistoryPortal() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--bg-dark)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-bright)" }}>
        <p>Loading Audit History Portal...</p>
      </div>
    }>
      <AuditHistoryContent />
    </Suspense>
  );
}
