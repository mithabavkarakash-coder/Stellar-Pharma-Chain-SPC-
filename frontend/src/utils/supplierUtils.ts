import { Supplier, Batch, Handoff } from "../types/pharma";
import { validateStellarAddress } from "./validation";

const STORAGE_KEY = "spc_suppliers";

export const INITIAL_SUPPLIERS: Supplier[] = [
    {
        id: "SUP-101",
        name: "Apex BioPharma Labs",
        address: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
        type: "Manufacturer",
        license_number: "FDA-DSCSA-89102",
        contact_email: "compliance@apexbio.com",
        contact_phone: "+1 (800) 555-0192",
        location: "Boston, MA, USA",
        compliance_status: "VERIFIED",
        quality_rating: 4.9,
        total_batches_handled: 142,
        active_shipments: 8,
        notes: "Primary manufacturer of antibiotic & antiviral formulations.",
        created_at: 1700000000
    },
    {
        id: "SUP-102",
        name: "TransCold Logistics Corp",
        address: "GDISTRIB7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN8888",
        type: "Distributor",
        license_number: "EU-GDP-77391",
        contact_email: "dispatch@transcoldlogistics.com",
        contact_phone: "+49 69 9000 4421",
        location: "Frankfurt, Germany",
        compliance_status: "VERIFIED",
        quality_rating: 4.8,
        total_batches_handled: 285,
        active_shipments: 14,
        notes: "Certified cold-chain refrigerated logistics partner (2°C - 8°C).",
        created_at: 1701000000
    },
    {
        id: "SUP-103",
        name: "MediCare Express Pharmacy",
        address: "GPHARMACYUIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN9999",
        type: "Pharmacy",
        license_number: "NABP-552019",
        contact_email: "rx@medicareexpress.org",
        contact_phone: "+1 (888) 312-9900",
        location: "New York, NY, USA",
        compliance_status: "VERIFIED",
        quality_rating: 4.7,
        total_batches_handled: 94,
        active_shipments: 3,
        notes: "Licensed retail & institutional hospital pharmacy node.",
        created_at: 1702000000
    },
    {
        id: "SUP-104",
        name: "Novartis BioMed Manufacturing",
        address: "GNOVARTISUIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN5555",
        type: "Manufacturer",
        license_number: "FDA-DSCSA-44109",
        contact_email: "supply@novartisbiomed.com",
        contact_phone: "+41 61 324 1111",
        location: "Basel, Switzerland",
        compliance_status: "VERIFIED",
        quality_rating: 4.9,
        total_batches_handled: 210,
        active_shipments: 11,
        notes: "Global pharmaceutical synthesizer & vaccine batch origin node.",
        created_at: 1703000000
    },
    {
        id: "SUP-105",
        name: "Metro Health Logistics",
        address: "GCINSPECT7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN7777",
        type: "Distributor",
        license_number: "FDA-DSCSA-33102",
        contact_email: "logistics@metrohealth.com",
        contact_phone: "+1 (312) 400-8812",
        location: "Chicago, IL, USA",
        compliance_status: "PENDING_AUDIT",
        quality_rating: 4.2,
        total_batches_handled: 45,
        active_shipments: 2,
        notes: "Regional distributor pending annual FDA DSCSA audit.",
        created_at: 1704000000
    }
];

export function getSuppliers(): Supplier[] {
    if (typeof window === "undefined") {
        return INITIAL_SUPPLIERS;
    }
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SUPPLIERS));
            return INITIAL_SUPPLIERS;
        }
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SUPPLIERS));
            return INITIAL_SUPPLIERS;
        }
        return parsed;
    } catch {
        return INITIAL_SUPPLIERS;
    }
}

export function saveSuppliersToStorage(suppliers: Supplier[]): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
    } catch (e) {
        console.error("Failed to save suppliers to localStorage", e);
    }
}

export function getSupplierById(id: string): Supplier | undefined {
    return getSuppliers().find((s) => s.id === id);
}

export function getSupplierByAddress(address?: string | null): Supplier | undefined {
    if (!address) return undefined;
    const cleanAddr = address.trim();
    return getSuppliers().find((s) => s.address === cleanAddr);
}

export function saveSupplier(supplierInput: Omit<Supplier, "id" | "created_at">): Supplier {
    const suppliers = getSuppliers();
    const newId = `SUP-${101 + suppliers.length}`;
    const newSupplier: Supplier = {
        ...supplierInput,
        id: newId,
        created_at: Math.floor(Date.now() / 1000)
    };
    const updatedList = [newSupplier, ...suppliers];
    saveSuppliersToStorage(updatedList);
    return newSupplier;
}

export function updateSupplier(id: string, updates: Partial<Supplier>): Supplier | null {
    const suppliers = getSuppliers();
    const idx = suppliers.findIndex((s) => s.id === id);
    if (idx === -1) return null;

    const updated = { ...suppliers[idx], ...updates };
    suppliers[idx] = updated;
    saveSuppliersToStorage(suppliers);
    return updated;
}

export function deleteSupplier(id: string): boolean {
    const suppliers = getSuppliers();
    const filtered = suppliers.filter((s) => s.id !== id);
    if (filtered.length === suppliers.length) return false;
    saveSuppliersToStorage(filtered);
    return true;
}

export function validateSupplierForm(data: Partial<Supplier>): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (!data.name || !data.name.trim()) {
        errors.name = "Company name is required.";
    } else if (data.name.trim().length < 2) {
        errors.name = "Company name must be at least 2 characters.";
    }

    if (!data.address || !data.address.trim()) {
        errors.address = "Stellar public key / address is required.";
    } else {
        const addrValidation = validateStellarAddress(data.address);
        if (!addrValidation.valid) {
            errors.address = addrValidation.error || "Invalid Stellar address.";
        }
    }

    if (!data.type) {
        errors.type = "Supplier type selection is required.";
    }

    if (!data.license_number || !data.license_number.trim()) {
        errors.license_number = "Pharmaceutical license number is required.";
    }

    if (data.contact_email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.contact_email.trim())) {
            errors.contact_email = "Invalid email address format.";
        }
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

export function getLinkedBatchesForSupplier(
    supplierAddress: string,
    batches: Batch[],
    handoffs: Handoff[] = []
): { originated: Batch[]; handled: Batch[] } {
    if (!supplierAddress) return { originated: [], handled: [] };
    const clean = supplierAddress.trim();

    const originated = batches.filter((b) => b.manufacturer === clean);

    const handledBatchIds = new Set(
        handoffs.filter((h) => h.from_address === clean || h.to_address === clean).map((h) => h.batch_id)
    );

    const handled = batches.filter((b) => handledBatchIds.has(b.batch_id) && b.manufacturer !== clean);

    return { originated, handled };
}
