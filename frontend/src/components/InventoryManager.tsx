"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useWallet } from "../context/WalletContext";
import { Role, Batch } from "../types/pharma";
import StatusBadge from "./ui/StatusBadge";
import SkeletonLoader from "./SkeletonLoader";
import GS1DataMatrixModal from "./GS1DataMatrixModal";
import { invokeContract, getRegistryContractId, getCustodyContractId, flagQuarantineOnChain, releaseQuarantineOnChain } from "../utils/soroban";
import { validateBatchId, validateQuantity, validateDateRange, validateStellarAddress } from "../utils/validation";
import { calculateBatchExpiryStatus, formatSafeDate, formatSupplierAddress } from "../utils/batchUtils";
import { getSupplierByAddress } from "../utils/supplierUtils";
import { xdr } from "@stellar/stellar-sdk";
import {
    Package,
    PlusCircle,
    Search,
    QrCode,
    ArrowRight,
    AlertTriangle,
    ShieldAlert,
    AlertOctagon,
    RefreshCw,
    Truck,
    ShoppingBag,
    ArrowUpDown,
    CheckCircle2,
    XCircle,
    Archive,
    Building,
    Activity
} from "lucide-react";

export interface InventoryItem extends Batch {
    current_custodian: string;
    current_role: Role | string;
    remaining_quantity: number;
    suppliers: string[];
}

interface InventoryManagerProps {
    userRole?: Role;
    initialBatches?: Batch[];
}

export default function InventoryManager({ userRole, initialBatches }: InventoryManagerProps) {
    const wallet = useWallet();
    const activeRole = userRole || wallet.role || "Customer";

    // Data States
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Filters & Search States
    const [searchTerm, setSearchTerm] = useState("");
    const [scopeFilter, setScopeFilter] = useState<"ALL" | "MY_CUSTODY">("ALL");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "IN_STOCK" | "LOW_STOCK" | "EXPIRING" | "EXPIRED" | "QUARANTINED" | "RECALLED">("ALL");
    const [sortBy, setSortBy] = useState<"expiry_asc" | "quantity_asc" | "quantity_desc" | "name_asc">("expiry_asc");

    // Modal States
    const [selectedGS1Batch, setSelectedGS1Batch] = useState<Batch | null>(null);
    const [isGS1Open, setIsGS1Open] = useState(false);
    const [activeModal, setActiveModal] = useState<"REGISTER" | "HANDOFF" | "DISPENSE" | "QUARANTINE" | "RECALL" | "ARCHIVE" | null>(null);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

    // Form States
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Register Form
    const [regBatchId, setRegBatchId] = useState("");
    const [regDrugName, setRegDrugName] = useState("");
    const [regQuantity, setRegQuantity] = useState("1000");
    const [regMfgDate, setRegMfgDate] = useState("");
    const [regExpDate, setRegExpDate] = useState("");
    const [regDirectShip, setRegDirectShip] = useState(false);

    // Handoff Form
    const [handoffRecipient, setHandoffRecipient] = useState("");
    const [handoffQuantity, setHandoffQuantity] = useState("100");
    const [handoffTargetRole, setHandoffTargetRole] = useState<"Distributor" | "Pharmacy">("Distributor");

    // Dispense Form
    const [dispenseQty, setDispenseQty] = useState("10");

    // Quarantine Form
    const [quarantineReason, setQuarantineReason] = useState("");

    // Fetch Inventory Data from Backend API or On-chain fallback
    const fetchInventory = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
            const res = await fetch(`${backendUrl}/api/batches`);
            
            let rawBatches: Batch[] = [];
            if (res.ok) {
                rawBatches = await res.json();
            } else if (initialBatches && initialBatches.length > 0) {
                rawBatches = initialBatches;
            } else {
                // Default rich sample data if backend isn't actively reachable
                rawBatches = [
                    {
                        batch_id: "AX-7729-001",
                        drug_name: "Amoxicillin Trihydrate 500mg",
                        manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
                        quantity: 5000,
                        manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 30,
                        expiry_date: Math.floor(Date.now() / 1000) + 86400 * 365,
                        direct_ship: false,
                        is_recalled: false,
                        is_quarantined: false
                    },
                    {
                        batch_id: "MT-2023-F9",
                        drug_name: "Metformin XL 500mg Extended Release",
                        manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
                        quantity: 12000,
                        manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 120,
                        expiry_date: Math.floor(Date.now() / 1000) + 86400 * 45, // Expiring soon
                        direct_ship: false,
                        is_recalled: false,
                        is_quarantined: false
                    },
                    {
                        batch_id: "PH-2024-001",
                        drug_name: "Insulin Glargine Cold-Chain 100IU/ml",
                        manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
                        quantity: 250, // Low stock
                        manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 200,
                        expiry_date: Math.floor(Date.now() / 1000) - 86400 * 10, // Expired
                        direct_ship: true,
                        is_recalled: true,
                        recalled_by: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
                        is_quarantined: false
                    },
                    {
                        batch_id: "LP-9011-C2",
                        drug_name: "Lisinopril BP 10mg Tablets",
                        manufacturer: "GCSUPPLIER9999999999999999999999999999999999999999999999",
                        quantity: 320,
                        manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 60,
                        expiry_date: Math.floor(Date.now() / 1000) + 86400 * 180,
                        direct_ship: false,
                        is_recalled: false,
                        is_quarantined: true,
                        quarantine_reason: "Temperature excursion during transit (9.2°C)"
                    }
                ];
            }

            // Fetch details for each batch to determine remaining quantity & current custodian
            const items: InventoryItem[] = await Promise.all(
                rawBatches.map(async (b) => {
                    let currentCustodian = b.manufacturer;
                    let currentRole = "Manufacturer";
                    let remainingQty = b.quantity;
                    const suppliersSet = new Set<string>([b.manufacturer]);

                    try {
                        const detailRes = await fetch(`${backendUrl}/api/batches/${b.batch_id}`);
                        if (detailRes.ok) {
                            const details = await detailRes.json();
                            const handoffs = details.handoffs || [];
                            const dispenses = details.dispenses || [];

                            if (handoffs.length > 0) {
                                const lastHandoff = handoffs[handoffs.length - 1];
                                currentCustodian = lastHandoff.to_address;
                                currentRole = lastHandoff.new_role;
                                handoffs.forEach((h: any) => {
                                    suppliersSet.add(h.from_address);
                                    suppliersSet.add(h.to_address);
                                });
                            }

                            if (dispenses.length > 0) {
                                const totalDispensed = dispenses.reduce((acc: number, d: any) => acc + (d.quantity || 0), 0);
                                remainingQty = Math.max(0, b.quantity - totalDispensed);
                            }
                        }
                    } catch (_err) {
                        // Fallback to default calculation
                    }

                    return {
                        ...b,
                        current_custodian: currentCustodian,
                        current_role: currentRole,
                        remaining_quantity: remainingQty,
                        suppliers: Array.from(suppliersSet)
                    };
                })
            );

            setInventory(items);
        } catch (e: any) {
            console.error("Failed to load inventory:", e);
            setError(e.message || "Failed to load medicine inventory.");
        } finally {
            setLoading(false);
        }
    }, [initialBatches]);

    useEffect(() => {
        void fetchInventory();
    }, [fetchInventory]);

    // Helpers
    const LOW_STOCK_THRESHOLD = 500;

    const getItemStatus = (item: InventoryItem) => {
        const calc = calculateBatchExpiryStatus(item);
        if (item.is_recalled) return "RECALLED";
        if (item.is_quarantined) return "QUARANTINED";
        if (calc.isExpired) return "EXPIRED";
        if (calc.isExpiringSoon) return "EXPIRING";
        if (item.remaining_quantity < LOW_STOCK_THRESHOLD) return "LOW_STOCK";
        return "IN_STOCK";
    };

    // Filter Logic
    const filteredInventory = inventory.filter((item) => {
        // Scope Filter (My Custody vs All)
        if (scopeFilter === "MY_CUSTODY" && wallet.address) {
            const currentCust = (item.current_custodian || "").toLowerCase();
            const mfgAddr = (item.manufacturer || "").toLowerCase();
            const myAddr = wallet.address.toLowerCase();
            const isMyCustody = currentCust === myAddr || mfgAddr === myAddr;
            if (!isMyCustody) return false;
        }

        // Search Filter
        const query = searchTerm.toLowerCase().trim();
        if (query) {
            const drugName = (item.drug_name || "").toLowerCase();
            const batchId = (item.batch_id || "").toLowerCase();
            const mfg = (item.manufacturer || "").toLowerCase();
            const cust = (item.current_custodian || "").toLowerCase();
            const matchName = drugName.includes(query);
            const matchId = batchId.includes(query);
            const matchMfg = mfg.includes(query);
            const matchCust = cust.includes(query);
            if (!matchName && !matchId && !matchMfg && !matchCust) return false;
        }

        // Status Filter
        const status = getItemStatus(item);
        if (statusFilter === "IN_STOCK" && status !== "IN_STOCK") return false;
        if (statusFilter === "LOW_STOCK" && status !== "LOW_STOCK") return false;
        if (statusFilter === "EXPIRING" && status !== "EXPIRING") return false;
        if (statusFilter === "EXPIRED" && status !== "EXPIRED") return false;
        if (statusFilter === "QUARANTINED" && status !== "QUARANTINED") return false;
        if (statusFilter === "RECALLED" && status !== "RECALLED") return false;

        return true;
    }).sort((a, b) => {
        if (sortBy === "expiry_asc") return (a.expiry_date || 0) - (b.expiry_date || 0);
        if (sortBy === "quantity_asc") return (a.remaining_quantity || 0) - (b.remaining_quantity || 0);
        if (sortBy === "quantity_desc") return (b.remaining_quantity || 0) - (a.remaining_quantity || 0);
        if (sortBy === "name_asc") return (a.drug_name || "").localeCompare(b.drug_name || "");
        return 0;
    });

    // Summary Metrics
    const totalBatches = inventory.length;
    const totalUnits = inventory.reduce((acc, item) => acc + (item.remaining_quantity || 0), 0);
    const lowStockCount = inventory.filter((item) => (item.remaining_quantity || 0) < LOW_STOCK_THRESHOLD && !item.is_recalled).length;
    const alertCount = inventory.filter((item) => {
        const calc = calculateBatchExpiryStatus(item);
        return item.is_recalled || item.is_quarantined || calc.isExpired;
    }).length;

    // --- FORM ACTION HANDLERS ---

    // 1. Register Batch (Manufacturer/Admin)
    const handleRegisterBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!wallet.address) {
            setFormError("Please connect your wallet first.");
            return;
        }

        const vBatch = validateBatchId(regBatchId);
        if (!vBatch.valid) return setFormError(vBatch.error!);

        const vQty = validateQuantity(regQuantity);
        if (!vQty.valid) return setFormError(vQty.error!);

        const vDates = validateDateRange(regMfgDate, regExpDate);
        if (!vDates.valid) return setFormError(vDates.error!);

        if (!regDrugName.trim()) return setFormError("Medicine name is required.");

        setFormLoading(true);
        try {
            const mDate = Math.floor(new Date(regMfgDate).getTime() / 1000);
            const eDate = Math.floor(new Date(regExpDate).getTime() / 1000);
            const qty = parseInt(regQuantity);

            const registryContractId = getRegistryContractId();
            const custodyContractId = getCustodyContractId();

            await invokeContract({
                sourceAddress: wallet.address,
                contractId: registryContractId,
                functionName: "register_batch",
                args: [regBatchId, regDrugName, wallet.address, qty, mDate, eDate, regDirectShip, custodyContractId]
            });

            setSuccessMessage(`Successfully registered batch #${regBatchId} on-chain!`);
            setActiveModal(null);
            // Reset form
            setRegBatchId("");
            setRegDrugName("");
            setRegQuantity("1000");
            setRegMfgDate("");
            setRegExpDate("");
            setRegDirectShip(false);
            void fetchInventory();
        } catch (err: any) {
            setFormError(err.message || "Failed to register batch.");
        } finally {
            setFormLoading(false);
        }
    };

    // 2. Transfer Custody (Handoff)
    const handleHandoff = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!wallet.address) return setFormError("Wallet required.");
        if (!selectedItem) return setFormError("No item selected.");

        const vAddr = validateStellarAddress(handoffRecipient);
        if (!vAddr.valid) return setFormError(vAddr.error!);

        const vQty = validateQuantity(handoffQuantity);
        if (!vQty.valid) return setFormError(vQty.error!);

        const qty = parseInt(handoffQuantity);
        if (qty > selectedItem.remaining_quantity) {
            return setFormError(`Transfer quantity cannot exceed remaining stock (${selectedItem.remaining_quantity}).`);
        }

        setFormLoading(true);
        try {
            const custodyContractId = getCustodyContractId();
            const roleSymbol = xdr.ScVal.scvSymbol(handoffTargetRole);

            await invokeContract({
                sourceAddress: wallet.address,
                contractId: custodyContractId,
                functionName: "transfer_custody",
                args: [selectedItem.batch_id, wallet.address, handoffRecipient, qty, roleSymbol]
            });

            setSuccessMessage(`Transferred ${qty} units of batch #${selectedItem.batch_id} to ${handoffRecipient.slice(0, 8)}...`);
            setActiveModal(null);
            setHandoffRecipient("");
            setHandoffQuantity("100");
            void fetchInventory();
        } catch (err: any) {
            setFormError(err.message || "Failed to transfer custody.");
        } finally {
            setFormLoading(false);
        }
    };

    // 3. Dispense Units (Pharmacy)
    const handleDispense = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!wallet.address) return setFormError("Wallet required.");
        if (!selectedItem) return setFormError("No item selected.");

        const vQty = validateQuantity(dispenseQty);
        if (!vQty.valid) return setFormError(vQty.error!);

        const qty = parseInt(dispenseQty);
        if (qty > selectedItem.remaining_quantity) {
            return setFormError(`Dispense quantity cannot exceed available stock (${selectedItem.remaining_quantity}).`);
        }

        setFormLoading(true);
        try {
            const custodyContractId = getCustodyContractId();

            await invokeContract({
                sourceAddress: wallet.address,
                contractId: custodyContractId,
                functionName: "dispense_units",
                args: [selectedItem.batch_id, wallet.address, qty]
            });

            setSuccessMessage(`Dispensed ${qty} units of batch #${selectedItem.batch_id}.`);
            setActiveModal(null);
            setDispenseQty("10");
            void fetchInventory();
        } catch (err: any) {
            setFormError(err.message || "Failed to dispense units.");
        } finally {
            setFormLoading(false);
        }
    };

    // 4. Quarantine / Release Toggle
    const handleToggleQuarantine = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!wallet.address) return setFormError("Wallet required.");
        if (!selectedItem) return setFormError("No item selected.");

        setFormLoading(true);
        try {
            if (selectedItem.is_quarantined) {
                await releaseQuarantineOnChain(wallet.address, selectedItem.batch_id);
                setSuccessMessage(`Released batch #${selectedItem.batch_id} from quarantine.`);
            } else {
                if (!quarantineReason.trim()) {
                    setFormLoading(false);
                    return setFormError("Quarantine reason is required.");
                }
                await flagQuarantineOnChain(wallet.address, selectedItem.batch_id, quarantineReason);
                setSuccessMessage(`Batch #${selectedItem.batch_id} placed in quarantine.`);
            }

            setActiveModal(null);
            setQuarantineReason("");
            void fetchInventory();
        } catch (err: any) {
            setFormError(err.message || "Failed to update quarantine status.");
        } finally {
            setFormLoading(false);
        }
    };

    // 5. Recall Batch
    const handleRecall = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!wallet.address) return setFormError("Wallet required.");
        if (!selectedItem) return setFormError("No item selected.");

        setFormLoading(true);
        try {
            const registryContractId = getRegistryContractId();
            await invokeContract({
                sourceAddress: wallet.address,
                contractId: registryContractId,
                functionName: "flag_recalled",
                args: [selectedItem.batch_id, wallet.address]
            });

            setSuccessMessage(`Emergency recall issued for batch #${selectedItem.batch_id}!`);
            setActiveModal(null);
            void fetchInventory();
        } catch (err: any) {
            setFormError(err.message || "Failed to issue recall.");
        } finally {
            setFormLoading(false);
        }
    };

    // 6. Archive / Delete Simulation
    const handleArchive = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;
        setInventory(prev => prev.filter(i => i.batch_id !== selectedItem.batch_id));
        setSuccessMessage(`Archived batch #${selectedItem.batch_id} from active view.`);
        setActiveModal(null);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 1280, margin: "0 auto" }}>
            
            {/* Top Bar Header & Role Indicator */}
            <div className="glass-card" style={{ padding: 24, borderRadius: 16, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: 10, borderRadius: 12 }}>
                            <Package size={26} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, color: "#fff" }}>
                                Medicine Inventory Management
                            </h1>
                            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
                                Track drug stock levels, suppliers, expiry dates, & custody status across the Stellar supply chain.
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                        onClick={() => void fetchInventory()}
                        className="btn btn-secondary"
                        disabled={loading}
                        style={{ padding: "8px 14px", fontSize: "0.82rem" }}
                        title="Refresh Inventory"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        <span>Refresh</span>
                    </button>

                    {(activeRole === "Manufacturer" || activeRole === "Admin") && (
                        <button
                            onClick={() => {
                                setFormError(null);
                                setActiveModal("REGISTER");
                            }}
                            className="btn btn-primary"
                            style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                        >
                            <PlusCircle size={16} />
                            <span>Register Medicine</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Global Error Banner */}
            {error && (
                <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#f87171" }}>
                        <ShieldAlert size={20} />
                        <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>
                        <XCircle size={18} />
                    </button>
                </div>
            )}

            {/* Global Success Banner */}
            {successMessage && (
                <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#34d399" }}>
                        <CheckCircle2 size={20} />
                        <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} style={{ background: "none", border: "none", color: "#34d399", cursor: "pointer" }}>
                        <XCircle size={18} />
                    </button>
                </div>
            )}

            {/* Metrics Dashboard Overview */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                <div className="glass-card" style={{ padding: 18, borderRadius: 14, display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", padding: 12, borderRadius: 10 }}>
                        <Package size={22} />
                    </div>
                    <div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Total Medicine Batches</span>
                        <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff" }}>{totalBatches}</div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 18, borderRadius: 14, display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: 12, borderRadius: 10 }}>
                        <Activity size={22} />
                    </div>
                    <div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Total Available Units</span>
                        <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff" }}>{totalUnits.toLocaleString()}</div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 18, borderRadius: 14, display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", padding: 12, borderRadius: 10 }}>
                        <AlertTriangle size={22} />
                    </div>
                    <div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Low Stock Warning</span>
                        <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fbbf24" }}>{lowStockCount}</div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 18, borderRadius: 14, display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", padding: 12, borderRadius: 10 }}>
                        <ShieldAlert size={22} />
                    </div>
                    <div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Alerts / Recalled / Expired</span>
                        <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f87171" }}>{alertCount}</div>
                    </div>
                </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="glass-card" style={{ padding: 20, borderRadius: 16, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, flex: 1, minWidth: 280 }}>
                    {/* Search Field */}
                    <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                        <input
                            type="text"
                            placeholder="Search by drug name, batch ID, mfg, supplier..."
                            className="form-control"
                            style={{ paddingLeft: 36, fontSize: "0.85rem" }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    </div>

                    {/* Scope Filter */}
                    <select
                        className="form-control"
                        style={{ width: 140, padding: "8px 12px", fontSize: "0.82rem", background: "var(--bg-tertiary)" }}
                        value={scopeFilter}
                        onChange={(e) => setScopeFilter(e.target.value as any)}
                    >
                        <option value="ALL">All Batches</option>
                        <option value="MY_CUSTODY">My Custody</option>
                    </select>

                    {/* Sort Selector */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <ArrowUpDown size={14} style={{ color: "var(--text-muted)" }} />
                        <select
                            className="form-control"
                            style={{ width: 150, padding: "8px 12px", fontSize: "0.82rem", background: "var(--bg-tertiary)" }}
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                        >
                            <option value="expiry_asc">Expiry (Earliest)</option>
                            <option value="quantity_desc">Stock (Highest)</option>
                            <option value="quantity_asc">Stock (Lowest)</option>
                            <option value="name_asc">Name (A-Z)</option>
                        </select>
                    </div>
                </div>

                {/* Status Filter Pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, background: "rgba(0,0,0,0.3)", padding: 4, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
                    {(["ALL", "IN_STOCK", "LOW_STOCK", "EXPIRING", "EXPIRED", "QUARANTINED", "RECALLED"] as const).map((st) => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "none",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                background: statusFilter === st ? "var(--color-primary)" : "transparent",
                                color: statusFilter === st ? "#fff" : "var(--text-muted)"
                            }}
                        >
                            {st === "ALL" && "All"}
                            {st === "IN_STOCK" && "🟢 In Stock"}
                            {st === "LOW_STOCK" && "🟡 Low Stock"}
                            {st === "EXPIRING" && "⏳ Expiring"}
                            {st === "EXPIRED" && "🔴 Expired"}
                            {st === "QUARANTINED" && "⛔ Quarantined"}
                            {st === "RECALLED" && "🚨 Recalled"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Inventory Table Container */}
            <div className="glass-card" style={{ padding: 24, borderRadius: 16, overflow: "hidden" }}>
                {loading ? (
                    <div style={{ padding: 24 }}>
                        <SkeletonLoader count={6} />
                    </div>
                ) : filteredInventory.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 24px" }}>
                        <div style={{ background: "rgba(255,255,255,0.04)", width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto", color: "var(--text-muted)" }}>
                            <Package size={32} />
                        </div>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                            No Medicine Items Found
                        </h3>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: 420, margin: "0 auto 16px auto" }}>
                            {searchTerm || statusFilter !== "ALL" || scopeFilter !== "ALL"
                                ? "No inventory records match your search query or selected filter criteria."
                                : "There are currently no registered medicine batches in the inventory."}
                        </p>
                        {(searchTerm || statusFilter !== "ALL" || scopeFilter !== "ALL") && (
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setStatusFilter("ALL");
                                    setScopeFilter("ALL");
                                }}
                                className="btn btn-secondary"
                                style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                            <thead>
                                <tr style={{ background: "rgba(30, 41, 59, 0.6)", color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.5px", textAlign: "left" }}>
                                    <th style={{ padding: "12px 14px", borderRadius: "8px 0 0 8px" }}>Medicine Name & ID</th>
                                    <th style={{ padding: "12px 14px" }}>Manufacturer / Supplier</th>
                                    <th style={{ padding: "12px 14px" }}>Current Custodian</th>
                                    <th style={{ padding: "12px 14px" }}>Remaining / Total Stock</th>
                                    <th style={{ padding: "12px 14px" }}>Expiry Date</th>
                                    <th style={{ padding: "12px 14px" }}>Status</th>
                                    <th style={{ padding: "12px 14px", textAlign: "right", borderRadius: "0 8px 8px 0" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInventory.map((item) => {
                                    const status = getItemStatus(item);
                                    const calc = calculateBatchExpiryStatus(item);
                                    const mfgDateStr = formatSafeDate(item.manufacture_date);
                                    const expDateStr = formatSafeDate(item.expiry_date);

                                    return (
                                        <tr key={item.batch_id || Math.random().toString()} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)", transition: "background 0.2s" }} className="hover:bg-slate-800/40">
                                            
                                            {/* Medicine Name & Batch ID */}
                                            <td style={{ padding: "14px" }}>
                                                <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.9rem" }}>
                                                    {item.drug_name || "Unnamed Medicine"}
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                                                    <code style={{ fontSize: "0.74rem", color: "#3b82f6" }}>#{item.batch_id || "N/A"}</code>
                                                    {item.direct_ship && (
                                                        <span className="badge badge-blue" style={{ fontSize: "0.65rem" }}>Direct Ship</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Manufacturer / Supplier */}
                                            <td style={{ padding: "14px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "#cbd5e1" }}>
                                                    <Building size={14} style={{ color: "#94a3b8" }} />
                                                    <span title={item.manufacturer || ""}>
                                                        {getSupplierByAddress(item.manufacturer)?.name ? (
                                                            <strong style={{ color: "#fff" }}>{getSupplierByAddress(item.manufacturer)!.name}</strong>
                                                        ) : (
                                                            formatSupplierAddress(item.manufacturer)
                                                        )}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                                                    {formatSupplierAddress(item.manufacturer)} • Mfg: {mfgDateStr}
                                                </div>
                                            </td>

                                            {/* Custodian */}
                                            <td style={{ padding: "14px" }}>
                                                <span className="badge badge-blue" style={{ fontSize: "0.7rem", marginBottom: 4, display: "inline-block" }}>
                                                    {item.current_role || "Manufacturer"}
                                                </span>
                                                <div style={{ fontSize: "0.76rem", color: "#e2e8f0" }} title={item.current_custodian || ""}>
                                                    {getSupplierByAddress(item.current_custodian)?.name || formatSupplierAddress(item.current_custodian)}
                                                </div>
                                            </td>

                                            {/* Quantity & Stock Level */}
                                            <td style={{ padding: "14px" }}>
                                                <div style={{ fontWeight: 800, color: item.remaining_quantity < LOW_STOCK_THRESHOLD ? "#fbbf24" : "#fff", fontSize: "0.95rem" }}>
                                                    {item.remaining_quantity.toLocaleString()} <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--text-muted)" }}>/ {item.quantity.toLocaleString()} units</span>
                                                </div>
                                                {/* Mini progress bar */}
                                                <div style={{ width: 100, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                                                    <div
                                                        style={{
                                                            width: `${Math.min(100, Math.max(0, (item.remaining_quantity / item.quantity) * 100))}%`,
                                                            height: "100%",
                                                            background: item.remaining_quantity < LOW_STOCK_THRESHOLD ? "#f59e0b" : "#10b981"
                                                        }}
                                                    />
                                                </div>
                                            </td>

                                            {/* Expiry Date */}
                                            <td style={{ padding: "14px", color: calc.isExpired ? "#f87171" : "#e2e8f0" }}>
                                                <div style={{ fontWeight: 600 }}>{expDateStr}</div>
                                                {calc.isExpired && <span style={{ fontSize: "0.7rem", color: "#f87171" }}>Expired</span>}
                                            </td>

                                            {/* Status Badge */}
                                            <td style={{ padding: "14px" }}>
                                                <StatusBadge status={status} size="sm" />
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: "14px", textAlign: "right" }}>
                                                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                                    
                                                    {/* GS1 Barcode View */}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedGS1Batch(item);
                                                            setIsGS1Open(true);
                                                        }}
                                                        className="btn btn-secondary"
                                                        style={{ padding: "6px 8px", fontSize: "0.75rem" }}
                                                        title="View GS1 2D DataMatrix Label"
                                                    >
                                                        <QrCode size={14} />
                                                    </button>

                                                    {/* Trace Timeline Link */}
                                                    <Link
                                                        href={`/verify?id=${encodeURIComponent(item.batch_id)}`}
                                                        className="btn btn-secondary"
                                                        style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                                                        title="Trace Custody History"
                                                    >
                                                        <ArrowRight size={14} />
                                                    </Link>

                                                    {/* Role Actions: Handoff / Transfer */}
                                                    {(activeRole === "Manufacturer" || activeRole === "Distributor" || activeRole === "Supplier" || activeRole === "Admin") && !item.is_recalled && !item.is_quarantined && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedItem(item);
                                                                setHandoffRecipient("");
                                                                setHandoffQuantity(String(Math.min(100, item.remaining_quantity)));
                                                                setFormError(null);
                                                                setActiveModal("HANDOFF");
                                                            }}
                                                            className="btn btn-primary"
                                                            style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                                                            title="Transfer Custody / Handoff Stock"
                                                        >
                                                            <Truck size={14} />
                                                        </button>
                                                    )}

                                                    {/* Role Actions: Dispense (Pharmacy) */}
                                                    {(activeRole === "Pharmacy" || activeRole === "Admin") && !item.is_recalled && !item.is_quarantined && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedItem(item);
                                                                setDispenseQty(String(Math.min(10, item.remaining_quantity)));
                                                                setFormError(null);
                                                                setActiveModal("DISPENSE");
                                                            }}
                                                            className="btn btn-primary"
                                                            style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                                                            title="Dispense Medicine Units"
                                                        >
                                                            <ShoppingBag size={14} />
                                                        </button>
                                                    )}

                                                    {/* Quarantine Action */}
                                                    {(activeRole === "Manufacturer" || activeRole === "Admin") && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedItem(item);
                                                                setQuarantineReason(item.quarantine_reason || "");
                                                                setFormError(null);
                                                                setActiveModal("QUARANTINE");
                                                            }}
                                                            className="btn btn-secondary"
                                                            style={{ padding: "6px 8px", fontSize: "0.75rem", color: item.is_quarantined ? "#34d399" : "#c084fc" }}
                                                            title={item.is_quarantined ? "Release Quarantine" : "Place in Quarantine"}
                                                        >
                                                            <AlertOctagon size={14} />
                                                        </button>
                                                    )}

                                                    {/* Emergency Recall */}
                                                    {(activeRole === "Manufacturer" || activeRole === "Admin") && !item.is_recalled && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedItem(item);
                                                                setFormError(null);
                                                                setActiveModal("RECALL");
                                                            }}
                                                            className="btn btn-secondary"
                                                            style={{ padding: "6px 8px", fontSize: "0.75rem", color: "#f87171" }}
                                                            title="Issue On-Chain Recall"
                                                        >
                                                            <ShieldAlert size={14} />
                                                        </button>
                                                    )}

                                                    {/* Archive / Delete Action */}
                                                    {activeRole === "Admin" && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedItem(item);
                                                                setActiveModal("ARCHIVE");
                                                            }}
                                                            className="btn btn-secondary"
                                                            style={{ padding: "6px 8px", fontSize: "0.75rem", color: "#94a3b8" }}
                                                            title="Archive Batch"
                                                        >
                                                            <Archive size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* GS1 DataMatrix Modal Component Reuse */}
            {selectedGS1Batch && (
                <GS1DataMatrixModal
                    batch={selectedGS1Batch}
                    isOpen={isGS1Open}
                    onClose={() => {
                        setIsGS1Open(false);
                        setSelectedGS1Batch(null);
                    }}
                />
            )}

            {/* --- MODALS FOR INVENTORY MANAGEMENT CREATION & UPDATES --- */}

            {/* 1. Register Batch Modal (Create) */}
            {activeModal === "REGISTER" && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
                    <div className="glass-card" style={{ width: "100%", maxWidth: 520, padding: 24, borderRadius: 16, border: "1px solid rgba(255,255,255,0.15)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                                <PlusCircle size={20} style={{ color: "var(--color-primary)" }} />
                                Register New Medicine Batch
                            </h3>
                            <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                                <XCircle size={20} />
                            </button>
                        </div>

                        {formError && (
                            <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: 12, color: "#f87171", fontSize: "0.82rem", marginBottom: 16 }}>
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleRegisterBatch} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <div>
                                <label className="form-label">Batch ID *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. AX-7729-001"
                                    value={regBatchId}
                                    onChange={(e) => setRegBatchId(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="form-label">Medicine Drug Name *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. Amoxicillin Trihydrate 500mg"
                                    value={regDrugName}
                                    onChange={(e) => setRegDrugName(e.target.value)}
                                    required
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                <div>
                                    <label className="form-label">Manufacture Quantity *</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={regQuantity}
                                        onChange={(e) => setRegQuantity(e.target.value)}
                                        required
                                        min="1"
                                    />
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 24 }}>
                                    <input
                                        type="checkbox"
                                        id="directShip"
                                        checked={regDirectShip}
                                        onChange={(e) => setRegDirectShip(e.target.checked)}
                                        style={{ width: 18, height: 18, accentColor: "var(--color-primary)" }}
                                    />
                                    <label htmlFor="directShip" style={{ fontSize: "0.82rem", color: "#fff", cursor: "pointer" }}>Direct-ship to Pharmacy</label>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                <div>
                                    <label className="form-label">Manufacture Date *</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={regMfgDate}
                                        onChange={(e) => setRegMfgDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Expiry Date *</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={regExpDate}
                                        onChange={(e) => setRegExpDate(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                                <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" disabled={formLoading} className="btn btn-primary">
                                    {formLoading ? "Registering on Soroban..." : "Confirm & Register"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. Transfer Custody / Handoff Modal (Update) */}
            {activeModal === "HANDOFF" && selectedItem && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
                    <div className="glass-card" style={{ width: "100%", maxWidth: 480, padding: 24, borderRadius: 16, border: "1px solid rgba(255,255,255,0.15)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                <Truck size={18} style={{ color: "#3b82f6" }} />
                                Transfer Custody for #{selectedItem.batch_id}
                            </h3>
                            <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                                <XCircle size={18} />
                            </button>
                        </div>

                        {formError && (
                            <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: 10, color: "#f87171", fontSize: "0.82rem", marginBottom: 12 }}>
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleHandoff} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <div>
                                <label className="form-label">Recipient Target Role *</label>
                                <select
                                    className="form-control"
                                    value={handoffTargetRole}
                                    onChange={(e) => setHandoffTargetRole(e.target.value as any)}
                                >
                                    <option value="Distributor">Distributor</option>
                                    <option value="Pharmacy">Pharmacy</option>
                                </select>
                            </div>

                            <div>
                                <label className="form-label">Recipient Public Key Address (G...) *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="G..."
                                    value={handoffRecipient}
                                    onChange={(e) => setHandoffRecipient(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="form-label">Quantity to Transfer (Max: {selectedItem.remaining_quantity}) *</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={handoffQuantity}
                                    onChange={(e) => setHandoffQuantity(e.target.value)}
                                    max={selectedItem.remaining_quantity}
                                    min="1"
                                    required
                                />
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                                <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" disabled={formLoading} className="btn btn-primary">
                                    {formLoading ? "Executing Handoff..." : "Transfer Stock"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 3. Dispense Modal (Pharmacy Update) */}
            {activeModal === "DISPENSE" && selectedItem && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
                    <div className="glass-card" style={{ width: "100%", maxWidth: 440, padding: 24, borderRadius: 16, border: "1px solid rgba(255,255,255,0.15)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                <ShoppingBag size={18} style={{ color: "#10b981" }} />
                                Dispense Units - #{selectedItem.batch_id}
                            </h3>
                            <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                                <XCircle size={18} />
                            </button>
                        </div>

                        {formError && (
                            <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: 10, color: "#f87171", fontSize: "0.82rem", marginBottom: 12 }}>
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleDispense} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <div>
                                <label className="form-label">Units to Dispense to Patient (Max: {selectedItem.remaining_quantity}) *</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={dispenseQty}
                                    onChange={(e) => setDispenseQty(e.target.value)}
                                    max={selectedItem.remaining_quantity}
                                    min="1"
                                    required
                                />
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                                <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" disabled={formLoading} className="btn btn-primary">
                                    {formLoading ? "Recording Dispense..." : "Dispense Units"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 4. Quarantine / Release Modal */}
            {activeModal === "QUARANTINE" && selectedItem && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
                    <div className="glass-card" style={{ width: "100%", maxWidth: 460, padding: 24, borderRadius: 16, border: "1px solid rgba(255,255,255,0.15)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                <AlertOctagon size={18} style={{ color: "#c084fc" }} />
                                {selectedItem.is_quarantined ? "Release Batch from Quarantine" : "Quarantine Batch"}
                            </h3>
                            <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                                <XCircle size={18} />
                            </button>
                        </div>

                        {formError && (
                            <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: 10, color: "#f87171", fontSize: "0.82rem", marginBottom: 12 }}>
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleToggleQuarantine} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {!selectedItem.is_quarantined ? (
                                <div>
                                    <label className="form-label">Quarantine Reason / Anomaly Details *</label>
                                    <textarea
                                        className="form-control"
                                        rows={3}
                                        placeholder="e.g. Temperature excursion detected during transport..."
                                        value={quarantineReason}
                                        onChange={(e) => setQuarantineReason(e.target.value)}
                                        required
                                    />
                                </div>
                            ) : (
                                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                    Are you sure you want to release batch <strong>#{selectedItem.batch_id}</strong> from quarantine status?
                                </p>
                            )}

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                                <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" disabled={formLoading} className="btn btn-primary" style={{ background: selectedItem.is_quarantined ? "#10b981" : "#9333ea" }}>
                                    {formLoading ? "Processing..." : selectedItem.is_quarantined ? "Release Quarantine" : "Apply Quarantine"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 5. Recall Modal */}
            {activeModal === "RECALL" && selectedItem && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
                    <div className="glass-card" style={{ width: "100%", maxWidth: 460, padding: 24, borderRadius: 16, border: "1px solid rgba(239,68,68,0.4)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f87171", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                <ShieldAlert size={20} />
                                Issue Emergency Recall
                            </h3>
                            <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                                <XCircle size={18} />
                            </button>
                        </div>

                        {formError && (
                            <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: 10, color: "#f87171", fontSize: "0.82rem", marginBottom: 12 }}>
                                {formError}
                            </div>
                        )}

                        <p style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                            Warning: Flagging <strong>#{selectedItem.batch_id} ({selectedItem.drug_name})</strong> as recalled will record an immutable recall event on the Soroban blockchain and block future handoffs.
                        </p>

                        <form onSubmit={handleRecall} style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                            <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" disabled={formLoading} className="btn btn-primary" style={{ background: "#ef4444" }}>
                                {formLoading ? "Submitting Recall..." : "Confirm Emergency Recall"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 6. Archive Modal */}
            {activeModal === "ARCHIVE" && selectedItem && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
                    <div className="glass-card" style={{ width: "100%", maxWidth: 440, padding: 24, borderRadius: 16, border: "1px solid rgba(255,255,255,0.15)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                                <Archive size={18} style={{ color: "#94a3b8" }} />
                                Archive Inventory Record
                            </h3>
                            <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                                <XCircle size={18} />
                            </button>
                        </div>

                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                            Are you sure you want to archive batch <strong>#{selectedItem.batch_id}</strong>? It will be hidden from the active inventory dashboard view.
                        </p>

                        <form onSubmit={handleArchive} style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                            <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" style={{ background: "#64748b" }}>
                                Archive Record
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
