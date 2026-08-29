import { describe, it, expect, beforeEach } from "vitest";
import { 
    getSuppliers, 
    getSupplierById, 
    getSupplierByAddress, 
    saveSupplier, 
    updateSupplier, 
    deleteSupplier, 
    validateSupplierForm, 
    getLinkedBatchesForSupplier,
    INITIAL_SUPPLIERS 
} from "../utils/supplierUtils";
import { Batch, Handoff } from "../types/pharma";

describe("Supplier Management Module Unit Tests", () => {
    beforeEach(() => {
        if (typeof window !== "undefined") {
            localStorage.clear();
        }
    });

    describe("Supplier CRUD & Storage Operations", () => {
        it("returns seeded initial suppliers by default", () => {
            const list = getSuppliers();
            expect(list.length).toBeGreaterThanOrEqual(5);
            expect(list[0].name).toBe("Apex BioPharma Labs");
            expect(list[0].type).toBe("Manufacturer");
        });

        it("retrieves supplier by ID", () => {
            const supplier = getSupplierById("SUP-101");
            expect(supplier).toBeDefined();
            expect(supplier?.name).toBe("Apex BioPharma Labs");
        });

        it("retrieves supplier by Stellar public key address", () => {
            const addr = "GDISTRIB7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN8888";
            const supplier = getSupplierByAddress(addr);
            expect(supplier).toBeDefined();
            expect(supplier?.name).toBe("TransCold Logistics Corp");
        });

        it("saves a new supplier and persists it to storage", () => {
            const newSup = saveSupplier({
                name: "BioPharma Synthetics Inc",
                address: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
                type: "Manufacturer",
                license_number: "FDA-DSCSA-99881",
                contact_email: "info@biopharmasynthetics.com",
                contact_phone: "+1 555 999 0000",
                location: "San Diego, CA, USA",
                compliance_status: "VERIFIED",
                quality_rating: 5.0,
                total_batches_handled: 10,
                active_shipments: 2
            });

            expect(newSup.id).toBeDefined();
            expect(getSupplierById(newSup.id)?.name).toBe("BioPharma Synthetics Inc");
        });

        it("updates an existing supplier profile", () => {
            const updated = updateSupplier("SUP-101", {
                contact_phone: "+1 (800) 999-7777",
                compliance_status: "VERIFIED"
            });

            expect(updated).not.toBeNull();
            expect(getSupplierById("SUP-101")?.contact_phone).toBe("+1 (800) 999-7777");
        });

        it("deletes a supplier record", () => {
            const deleted = deleteSupplier("SUP-105");
            expect(deleted).toBe(true);
            expect(getSupplierById("SUP-105")).toBeUndefined();
        });
    });

    describe("validateSupplierForm", () => {
        it("validates correct supplier input data", () => {
            const result = validateSupplierForm({
                name: "Valid Pharma Co",
                address: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
                type: "Manufacturer",
                license_number: "FDA-12345",
                contact_email: "test@pharma.com"
            });

            expect(result.valid).toBe(true);
            expect(Object.keys(result.errors).length).toBe(0);
        });

        it("catches missing name, invalid Stellar address, and bad email format", () => {
            const result = validateSupplierForm({
                name: "",
                address: "INVALID_ADDRESS",
                type: "Manufacturer",
                license_number: "",
                contact_email: "not-an-email"
            });

            expect(result.valid).toBe(false);
            expect(result.errors.name).toBeDefined();
            expect(result.errors.address).toBeDefined();
            expect(result.errors.license_number).toBeDefined();
            expect(result.errors.contact_email).toBeDefined();
        });
    });

    describe("getLinkedBatchesForSupplier", () => {
        const mfgAddr = "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663";
        const distAddr = "GDISTRIB7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN8888";

        const batches: Batch[] = [
            {
                batch_id: "B-01",
                drug_name: "Aspirin",
                manufacturer: mfgAddr,
                quantity: 1000,
                manufacture_date: 1700000000,
                expiry_date: 1750000000,
                direct_ship: false,
                is_recalled: false
            },
            {
                batch_id: "B-02",
                drug_name: "Amoxicillin",
                manufacturer: mfgAddr,
                quantity: 2000,
                manufacture_date: 1700000000,
                expiry_date: 1750000000,
                direct_ship: false,
                is_recalled: false
            }
        ];

        const handoffs: Handoff[] = [
            {
                batch_id: "B-01",
                from_address: mfgAddr,
                to_address: distAddr,
                quantity: 1000,
                new_role: "Distributor",
                transaction_hash: "0x123",
                timestamp: 1701000000
            }
        ];

        it("links originated batches to manufacturer supplier address", () => {
            const linked = getLinkedBatchesForSupplier(mfgAddr, batches, handoffs);
            expect(linked.originated.length).toBe(2);
            expect(linked.originated[0].batch_id).toBe("B-01");
        });

        it("links handled transit batches to distributor supplier address", () => {
            const linked = getLinkedBatchesForSupplier(distAddr, batches, handoffs);
            expect(linked.originated.length).toBe(0);
            expect(linked.handled.length).toBe(1);
            expect(linked.handled[0].batch_id).toBe("B-01");
        });
    });
});
