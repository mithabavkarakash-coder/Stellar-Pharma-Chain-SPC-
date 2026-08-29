"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { useWallet } from "../../context/WalletContext";
import { Supplier, SupplierType, ComplianceStatus, Batch } from "../../types/pharma";
import { 
  getSuppliers, 
  saveSupplier, 
  updateSupplier, 
  deleteSupplier, 
  validateSupplierForm,
  getLinkedBatchesForSupplier 
} from "../../utils/supplierUtils";
import { formatSupplierAddress, formatSafeDate } from "../../utils/batchUtils";
import { 
  Building2, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  Star, 
  Package, 
  Truck, 
  Factory, 
  Building,
  Grid,
  List,
  Filter,
  CheckCircle2
} from "lucide-react";

export function SuppliersPortalContent() {
  const wallet = useWallet();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals state
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    type: "Manufacturer" as SupplierType,
    license_number: "",
    contact_email: "",
    contact_phone: "",
    location: "",
    compliance_status: "VERIFIED" as ComplianceStatus,
    notes: ""
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load suppliers and inventory batches
  const loadData = () => {
    setLoading(true);
    const suppList = getSuppliers();
    setSuppliers(suppList);

    // Fetch live inventory batches to link relationships
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
    fetch(`${backendUrl}/api/batches`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setBatches(data);
      })
      .catch(() => {
        // Fallback default batches
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
            batch_id: "EXP-2024-99",
            drug_name: "Paracetamol 650mg Systemic",
            manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
            quantity: 1200,
            manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 400,
            expiry_date: Math.floor(Date.now() / 1000) - 86400 * 30,
            direct_ship: true,
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
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const total = suppliers.length;
    const mfgCount = suppliers.filter((s) => s.type === "Manufacturer").length;
    const distCount = suppliers.filter((s) => s.type === "Distributor").length;
    const pharmCount = suppliers.filter((s) => s.type === "Pharmacy").length;
    const avgRating = total > 0 
      ? (suppliers.reduce((acc, s) => acc + (s.quality_rating || 4.5), 0) / total).toFixed(1)
      : "5.0";

    return { total, mfgCount, distCount, pharmCount, avgRating };
  }, [suppliers]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.license_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = selectedType === "ALL" || s.type === selectedType;
      const matchesStatus = selectedStatus === "ALL" || s.compliance_status === selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [suppliers, searchQuery, selectedType, selectedStatus]);

  // Open Form Modal for Create or Edit
  const openCreateModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: "",
      address: wallet.address || "",
      type: "Manufacturer",
      license_number: `FDA-DSCSA-${Math.floor(10000 + Math.random() * 90000)}`,
      contact_email: "",
      contact_phone: "",
      location: "",
      compliance_status: "VERIFIED",
      notes: ""
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      address: supplier.address,
      type: supplier.type,
      license_number: supplier.license_number,
      contact_email: supplier.contact_email || "",
      contact_phone: supplier.contact_phone || "",
      location: supplier.location || "",
      compliance_status: supplier.compliance_status,
      notes: supplier.notes || ""
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSupplierForm(formData);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, formData);
      triggerToast(`Updated profile for ${formData.name}`);
    } else {
      saveSupplier({
        ...formData,
        quality_rating: 4.8,
        total_batches_handled: 1,
        active_shipments: 1
      });
      triggerToast(`Successfully registered new supplier ${formData.name}`);
    }

    setIsFormModalOpen(false);
    loadData();
  };

  const handleDelete = (supplier: Supplier) => {
    if (confirm(`Are you sure you want to remove supplier record for "${supplier.name}"?`)) {
      deleteSupplier(supplier.id);
      triggerToast(`Removed supplier ${supplier.name}`);
      loadData();
    }
  };

  const openDetailModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
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
          
          {/* Page Header */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 28 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <Building2 style={{ width: 28, height: 28, stroke: "var(--color-primary)" }} />
                <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#fff", margin: 0 }}>
                  Supplier Management Module
                </h1>
              </div>
              <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.9rem" }}>
                Manage verified pharmaceutical manufacturers, logistics distributors, and retail pharmacy partners.
              </p>
            </div>

            <button onClick={openCreateModal} className="btn btn-primary flex-gap" style={{ padding: "10px 20px" }}>
              <Plus style={{ width: 18, height: 18 }} />
              <span>Register New Supplier</span>
            </button>
          </div>

          {/* Metric Overview Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
            <div className="glass-card" style={{ padding: 18 }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>TOTAL REGISTERED</span>
                <Building2 style={{ width: 18, height: 18, stroke: "var(--color-primary)" }} />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff" }}>{metrics.total}</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Active network nodes</span>
            </div>

            <div className="glass-card" style={{ padding: 18 }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>MANUFACTURERS</span>
                <Factory style={{ width: 18, height: 18, stroke: "#3b82f6" }} />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#60a5fa" }}>{metrics.mfgCount}</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Licensed drug synthesizers</span>
            </div>

            <div className="glass-card" style={{ padding: 18 }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>DISTRIBUTORS</span>
                <Truck style={{ width: 18, height: 18, stroke: "#c084fc" }} />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#c084fc" }}>{metrics.distCount}</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Cold-chain logistics hubs</span>
            </div>

            <div className="glass-card" style={{ padding: 18 }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>PHARMACIES</span>
                <Building style={{ width: 18, height: 18, stroke: "#34d399" }} />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#34d399" }}>{metrics.pharmCount}</div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Dispensing partner endpoints</span>
            </div>

            <div className="glass-card" style={{ padding: 18 }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span className="form-label" style={{ fontSize: "0.75rem", margin: 0 }}>AVG QUALITY SCORE</span>
                <Star style={{ width: 18, height: 18, stroke: "#f59e0b", fill: "#f59e0b" }} />
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fbbf24" }}>{metrics.avgRating} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>/ 5.0</span></div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Compliance audit rating</span>
            </div>
          </div>

          {/* Search, Filter & View Controls */}
          <div className="glass-card" style={{ padding: 16, marginBottom: 24, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            {/* Search Input */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
              <Search style={{ width: 18, height: 18, stroke: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search suppliers by name, Stellar address, license, or location..."
                className="form-control"
                style={{ border: "none", background: "transparent", padding: 0 }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters & View Toggles */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Filter style={{ width: 14, height: 14, stroke: "var(--text-muted)" }} />
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Type:</span>
                <select
                  className="form-control"
                  style={{ width: 140, padding: "4px 8px", fontSize: "0.8rem" }}
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="ALL">All Types</option>
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Pharmacy">Pharmacy</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Status:</span>
                <select
                  className="form-control"
                  style={{ width: 140, padding: "4px 8px", fontSize: "0.8rem" }}
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="PENDING_AUDIT">Pending Audit</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              {/* Grid / Table Toggle */}
              <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 2 }}>
                <button
                  onClick={() => setViewMode("grid")}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "none",
                    background: viewMode === "grid" ? "var(--color-primary)" : "transparent",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center"
                  }}
                  title="Grid View"
                >
                  <Grid style={{ width: 14, height: 14 }} />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "none",
                    background: viewMode === "table" ? "var(--color-primary)" : "transparent",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center"
                  }}
                  title="Table View"
                >
                  <List style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="glass-card" style={{ marginBottom: 20, padding: "12px 18px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle2 style={{ width: 18, height: 18, color: "#34d399" }} />
              <span style={{ color: "#34d399", fontSize: "0.88rem", fontWeight: 600 }}>{toastMessage}</span>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div style={{ maxWidth: 800, margin: "40px auto", textAlign: "center" }}>
              <p style={{ color: "var(--text-muted)" }}>Loading Supplier Module Records...</p>
            </div>
          )}

          {/* Supplier Grid View */}
          {!loading && viewMode === "grid" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
              {filteredSuppliers.map((supplier) => {
                const linked = getLinkedBatchesForSupplier(supplier.address, batches);
                const totalLinked = linked.originated.length + linked.handled.length;

                return (
                  <div key={supplier.id} className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      {/* Top Header Card */}
                      <div className="flex-between" style={{ marginBottom: 12 }}>
                        <span className={`badge ${supplier.type === "Manufacturer" ? "badge-blue" : supplier.type === "Distributor" ? "badge-purple" : "badge-green"}`}>
                          {supplier.type}
                        </span>
                        {supplier.compliance_status === "VERIFIED" ? (
                          <span className="badge badge-green" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <ShieldCheck style={{ width: 12, height: 12 }} />
                            VERIFIED
                          </span>
                        ) : supplier.compliance_status === "PENDING_AUDIT" ? (
                          <span className="badge badge-warning" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <AlertTriangle style={{ width: 12, height: 12 }} />
                            PENDING AUDIT
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <XCircle style={{ width: 12, height: 12 }} />
                            SUSPENDED
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", marginBottom: 4 }}>
                        {supplier.name}
                      </h3>

                      {/* Stellar Address with Copy */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                        <code style={{ fontSize: "0.75rem", color: "var(--color-primary)", background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: 4 }}>
                          {formatSupplierAddress(supplier.address)}
                        </code>
                        <button
                          onClick={() => handleCopyAddress(supplier.address)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: copiedAddr === supplier.address ? "#10b981" : "var(--text-muted)" }}
                          title="Copy Full Address"
                        >
                          {copiedAddr === supplier.address ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
                        </button>
                      </div>

                      {/* Details Grid */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                        <div><strong>License:</strong> <code>{supplier.license_number}</code></div>
                        <div><strong>Location:</strong> {supplier.location || "N/A"}</div>
                        <div><strong>Contact:</strong> {supplier.contact_email || "N/A"}</div>
                      </div>
                    </div>

                    {/* Footer Actions & Stats */}
                    <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Star style={{ width: 14, height: 14, fill: "#f59e0b", stroke: "#f59e0b" }} />
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>{supplier.quality_rating}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>• {totalLinked} Batches</span>
                      </div>

                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEditModal(supplier)} className="btn btn-secondary" style={{ padding: "4px 8px" }} title="Edit Supplier">
                          <Edit3 style={{ width: 14, height: 14 }} />
                        </button>
                        <button onClick={() => handleDelete(supplier)} className="btn btn-secondary" style={{ padding: "4px 8px", color: "#f87171" }} title="Delete Supplier">
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                        <button onClick={() => openDetailModal(supplier)} className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "0.78rem" }}>
                          Profile & Batches
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Supplier Table View */}
          {!loading && viewMode === "table" && (
            <div className="glass-card" style={{ padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-glass)", background: "rgba(255,255,255,0.02)" }}>
                    <th style={{ padding: "14px 18px", color: "var(--text-muted)" }}>Company Name</th>
                    <th style={{ padding: "14px 18px", color: "var(--text-muted)" }}>Type</th>
                    <th style={{ padding: "14px 18px", color: "var(--text-muted)" }}>Stellar Address</th>
                    <th style={{ padding: "14px 18px", color: "var(--text-muted)" }}>License Number</th>
                    <th style={{ padding: "14px 18px", color: "var(--text-muted)" }}>Status</th>
                    <th style={{ padding: "14px 18px", color: "var(--text-muted)" }}>Rating</th>
                    <th style={{ padding: "14px 18px", color: "var(--text-muted)", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <td style={{ padding: "14px 18px", fontWeight: 700, color: "#fff" }}>{supplier.name}</td>
                      <td style={{ padding: "14px 18px" }}>
                        <span className={`badge ${supplier.type === "Manufacturer" ? "badge-blue" : supplier.type === "Distributor" ? "badge-purple" : "badge-green"}`}>
                          {supplier.type}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <code>{formatSupplierAddress(supplier.address)}</code>
                      </td>
                      <td style={{ padding: "14px 18px" }}><code>{supplier.license_number}</code></td>
                      <td style={{ padding: "14px 18px" }}>
                        <span className={`badge ${supplier.compliance_status === "VERIFIED" ? "badge-green" : supplier.compliance_status === "PENDING_AUDIT" ? "badge-warning" : "badge-danger"}`}>
                          {supplier.compliance_status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px", fontWeight: 700, color: "#fbbf24" }}>⭐ {supplier.quality_rating}</td>
                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button onClick={() => openDetailModal(supplier)} className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>
                            Batches
                          </button>
                          <button onClick={() => openEditModal(supplier)} className="btn btn-secondary" style={{ padding: "4px 8px" }}>
                            <Edit3 style={{ width: 14, height: 14 }} />
                          </button>
                          <button onClick={() => handleDelete(supplier)} className="btn btn-secondary" style={{ padding: "4px 8px", color: "#f87171" }}>
                            <Trash2 style={{ width: 14, height: 14 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Supplier Details Modal */}
          {isDetailModalOpen && selectedSupplier && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
              <div className="glass-card" style={{ width: "100%", maxWidth: "720px", maxHeight: "90vh", overflowY: "auto", padding: 28 }}>
                <div className="flex-between" style={{ marginBottom: 20, borderBottom: "1px solid var(--border-glass)", paddingBottom: 12 }}>
                  <div>
                    <span className="form-label" style={{ fontSize: "0.7rem", margin: 0 }}>SUPPLIER PROFILE & BATCH RELATIONSHIPS</span>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff" }}>{selectedSupplier.name}</h2>
                  </div>
                  <button onClick={() => setIsDetailModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.5rem" }}>
                    <XCircle style={{ width: 24, height: 24 }} />
                  </button>
                </div>

                {/* Profile Overview */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24, background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 12 }}>
                  <div><span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Type:</span> <br /><strong>{selectedSupplier.type}</strong></div>
                  <div><span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>License Number:</span> <br /><code>{selectedSupplier.license_number}</code></div>
                  <div><span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Quality Score:</span> <br /><strong style={{ color: "#fbbf24" }}>⭐ {selectedSupplier.quality_rating} / 5.0</strong></div>
                  <div><span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Location:</span> <br /><strong>{selectedSupplier.location || "N/A"}</strong></div>
                  <div><span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Stellar Address:</span> <br /><code style={{ fontSize: "0.72rem" }}>{selectedSupplier.address}</code></div>
                  <div><span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Contact:</span> <br /><strong>{selectedSupplier.contact_email || "N/A"}</strong></div>
                </div>

                {/* Linked Medicine Batches Section */}
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <Package style={{ width: 18, height: 18, stroke: "var(--color-primary)" }} />
                  <span>Linked Medicine Batches ({getLinkedBatchesForSupplier(selectedSupplier.address, batches).originated.length})</span>
                </h3>

                {getLinkedBatchesForSupplier(selectedSupplier.address, batches).originated.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic", marginBottom: 24 }}>
                    No active batches originated by this supplier in local inventory cache.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                    {getLinkedBatchesForSupplier(selectedSupplier.address, batches).originated.map((b) => (
                      <div key={b.batch_id} className="flex-between" style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8, border: "1px solid var(--border-glass)" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.9rem" }}>{b.drug_name}</div>
                          <code style={{ fontSize: "0.75rem", color: "var(--color-primary)" }}>#{b.batch_id}</code>
                          <span style={{ marginLeft: 12, fontSize: "0.75rem", color: "var(--text-muted)" }}>Qty: {b.quantity} units</span>
                        </div>
                        <Link href={`/verify?id=${encodeURIComponent(b.batch_id)}`} className="btn btn-secondary flex-gap" style={{ padding: "4px 10px", fontSize: "0.78rem" }}>
                          <span>Trace Timeline</span>
                          <ExternalLink style={{ width: 12, height: 12 }} />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => setIsDetailModalOpen(false)} className="btn btn-secondary">
                    Close Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create / Edit Supplier Modal */}
          {isFormModalOpen && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
              <div className="glass-card" style={{ width: "100%", maxWidth: "560px", padding: 28 }}>
                <div className="flex-between" style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff" }}>
                    {editingSupplier ? "Edit Supplier Profile" : "Register New Supplier"}
                  </h3>
                  <button onClick={() => setIsFormModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                    <XCircle style={{ width: 22, height: 22 }} />
                  </button>
                </div>

                <form onSubmit={handleFormSubmit}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    
                    <div>
                      <label className="form-label">Company Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Apex BioPharma Labs"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                      {formErrors.name && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{formErrors.name}</span>}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label className="form-label">Supplier Type *</label>
                        <select
                          className="form-control"
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value as SupplierType })}
                        >
                          <option value="Manufacturer">Manufacturer</option>
                          <option value="Distributor">Distributor</option>
                          <option value="Pharmacy">Pharmacy</option>
                        </select>
                      </div>

                      <div>
                        <label className="form-label">Compliance Status</label>
                        <select
                          className="form-control"
                          value={formData.compliance_status}
                          onChange={(e) => setFormData({ ...formData, compliance_status: e.target.value as ComplianceStatus })}
                        >
                          <option value="VERIFIED">Verified</option>
                          <option value="PENDING_AUDIT">Pending Audit</option>
                          <option value="SUSPENDED">Suspended</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Stellar Public Address / Key *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="G..."
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                      {formErrors.address && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{formErrors.address}</span>}
                    </div>

                    <div>
                      <label className="form-label">Pharmaceutical License Number *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. FDA-DSCSA-89102"
                        value={formData.license_number}
                        onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                      />
                      {formErrors.license_number && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{formErrors.license_number}</span>}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label className="form-label">Contact Email</label>
                        <input
                          type="email"
                          className="form-control"
                          placeholder="compliance@company.com"
                          value={formData.contact_email}
                          onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        />
                        {formErrors.contact_email && <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>{formErrors.contact_email}</span>}
                      </div>

                      <div>
                        <label className="form-label">Location / Hub</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="City, Country"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                      <button type="button" onClick={() => setIsFormModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                        {editingSupplier ? "Save Changes" : "Register Supplier"}
                      </button>
                    </div>

                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default function SuppliersPortal() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--bg-dark)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-bright)" }}>
        <p>Loading Supplier Management Portal...</p>
      </div>
    }>
      <SuppliersPortalContent />
    </Suspense>
  );
}
