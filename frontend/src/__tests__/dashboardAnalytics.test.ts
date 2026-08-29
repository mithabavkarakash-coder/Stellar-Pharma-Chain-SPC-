import { describe, it, expect } from "vitest";
import { Batch, Supplier } from "../types/pharma";
import { calculateBatchExpiryStatus } from "../utils/batchUtils";

describe("Dashboard Analytics Dynamic Calculations Unit Tests", () => {
    const nowSec = Math.floor(Date.now() / 1000);

    const mockBatches: Batch[] = [
        {
            batch_id: "AX-7729-001",
            drug_name: "Amoxicillin Trihydrate 500mg",
            manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
            quantity: 5000,
            manufacture_date: nowSec - 86400 * 30,
            expiry_date: nowSec + 86400 * 365,
            direct_ship: false,
            is_recalled: false,
            is_quarantined: false
        },
        {
            batch_id: "MT-2023-F9",
            drug_name: "Metformin XL 500mg Extended Release",
            manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
            quantity: 500, // Low stock < 1000
            manufacture_date: nowSec - 86400 * 120,
            expiry_date: nowSec + 86400 * 45, // Expiring soon (<90d)
            direct_ship: false,
            is_recalled: false,
            is_quarantined: false
        },
        {
            batch_id: "PH-2024-001",
            drug_name: "Insulin Glargine Cold-Chain",
            manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
            quantity: 2500,
            manufacture_date: nowSec - 86400 * 200,
            expiry_date: nowSec - 86400 * 10, // Expired
            direct_ship: true,
            is_recalled: true,
            is_quarantined: false
        }
    ];

    const mockSuppliers: Supplier[] = [
        {
            id: "SUP-101",
            name: "Apex BioPharma Labs",
            address: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
            type: "Manufacturer",
            license_number: "FDA-1001",
            contact_email: "apex@bio.com",
            contact_phone: "+1 555 1010",
            location: "Boston, MA",
            compliance_status: "VERIFIED",
            quality_rating: 4.9,
            total_batches_handled: 50,
            active_shipments: 5,
            created_at: nowSec
        },
        {
            id: "SUP-102",
            name: "TransCold Logistics",
            address: "GDISTRIB7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN8888",
            type: "Distributor",
            license_number: "EU-2002",
            contact_email: "trans@cold.com",
            contact_phone: "+49 69 2020",
            location: "Frankfurt, Germany",
            compliance_status: "VERIFIED",
            quality_rating: 4.8,
            total_batches_handled: 30,
            active_shipments: 3,
            created_at: nowSec
        },
        {
            id: "SUP-103",
            name: "MediCare Pharmacy",
            address: "GPHARMACYUIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN9999",
            type: "Pharmacy",
            license_number: "NABP-3003",
            contact_email: "rx@medicare.org",
            contact_phone: "+1 800 3030",
            location: "New York, NY",
            compliance_status: "VERIFIED",
            quality_rating: 4.7,
            total_batches_handled: 20,
            active_shipments: 1,
            created_at: nowSec
        }
    ];

    it("calculates total unique medicine formulations", () => {
        const uniqueSet = new Set(mockBatches.map(b => b.drug_name.toLowerCase()));
        expect(uniqueSet.size).toBe(3);
    });

    it("identifies low stock items under 1000 units", () => {
        const lowStock = mockBatches.filter(b => b.quantity < 1000 && !b.is_recalled);
        expect(lowStock.length).toBe(1);
        expect(lowStock[0].batch_id).toBe("MT-2023-F9");
    });

    it("identifies expiring items within 90 days threshold", () => {
        const expiring = mockBatches.filter(b => {
            const status = calculateBatchExpiryStatus(b);
            return status.isExpiringSoon;
        });
        expect(expiring.length).toBe(1);
        expect(expiring[0].batch_id).toBe("MT-2023-F9");
    });

    it("computes supplier node breakdowns accurately", () => {
        const mfgCount = mockSuppliers.filter(s => s.type === "Manufacturer").length;
        const distCount = mockSuppliers.filter(s => s.type === "Distributor").length;
        const pharmCount = mockSuppliers.filter(s => s.type === "Pharmacy").length;

        expect(mfgCount).toBe(1);
        expect(distCount).toBe(1);
        expect(pharmCount).toBe(1);
        expect(mockSuppliers.length).toBe(3);
    });

    it("handles empty batch arrays gracefully without error", () => {
        const emptyBatches: Batch[] = [];
        const uniqueSet = new Set(emptyBatches.map(b => b.drug_name));
        expect(uniqueSet.size).toBe(0);
        const lowStock = emptyBatches.filter(b => b.quantity < 1000);
        expect(lowStock.length).toBe(0);
    });
});
