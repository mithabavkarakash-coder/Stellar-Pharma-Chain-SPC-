import { describe, it, expect } from "vitest";
import {
    parseSafeTimestamp,
    formatSafeDate,
    formatSupplierAddress,
    calculateBatchExpiryStatus
} from "../utils/batchUtils";
import { Batch } from "../types/pharma";

describe("batchUtils Unit Tests", () => {
    describe("parseSafeTimestamp", () => {
        it("correctly parses valid Unix timestamp in seconds", () => {
            const sec = 1700000000;
            expect(parseSafeTimestamp(sec)).toBe(1700000000);
        });

        it("converts Unix timestamp in milliseconds to seconds", () => {
            const ms = 1700000000000;
            expect(parseSafeTimestamp(ms)).toBe(1700000000);
        });

        it("parses valid ISO string date", () => {
            const iso = "2026-12-31T00:00:00Z";
            const expectedSec = Math.floor(Date.parse(iso) / 1000);
            expect(parseSafeTimestamp(iso)).toBe(expectedSec);
        });

        it("returns null for invalid inputs (null, undefined, invalid strings, negative numbers)", () => {
            expect(parseSafeTimestamp(null)).toBeNull();
            expect(parseSafeTimestamp(undefined)).toBeNull();
            expect(parseSafeTimestamp("INVALID_DATE_STRING")).toBeNull();
            expect(parseSafeTimestamp(-100)).toBeNull();
            expect(parseSafeTimestamp(NaN)).toBeNull();
        });
    });

    describe("formatSafeDate", () => {
        it("formats valid epoch seconds timestamp into readable string", () => {
            const sec = 1700000000;
            const formatted = formatSafeDate(sec);
            expect(formatted).not.toBe("N/A");
            expect(typeof formatted).toBe("string");
        });

        it("returns default fallback 'N/A' for invalid dates", () => {
            expect(formatSafeDate(null)).toBe("N/A");
            expect(formatSafeDate("bad-date")).toBe("N/A");
            expect(formatSafeDate(undefined, "Unknown")).toBe("Unknown");
        });
    });

    describe("formatSupplierAddress", () => {
        it("truncates Stellar address safely", () => {
            const addr = "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663";
            expect(formatSupplierAddress(addr)).toBe("GBRPNCLU...6663");
        });

        it("returns fallback for null or empty supplier address", () => {
            expect(formatSupplierAddress(null)).toBe("Unknown Supplier");
            expect(formatSupplierAddress("", "No Supplier")).toBe("No Supplier");
        });
    });

    describe("calculateBatchExpiryStatus", () => {
        it("returns ACTIVE for batch far from expiry", () => {
            const futureExp = Math.floor(Date.now() / 1000) + 86400 * 180;
            const batch: Batch = {
                batch_id: "B-001",
                drug_name: "Aspirin",
                manufacturer: "G123",
                quantity: 1000,
                manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 30,
                expiry_date: futureExp,
                direct_ship: false,
                is_recalled: false,
            };

            const result = calculateBatchExpiryStatus(batch);
            expect(result.status).toBe("ACTIVE");
            expect(result.isExpired).toBe(false);
            expect(result.isExpiringSoon).toBe(false);
        });

        it("returns EXPIRING_SOON for batch expiring within 90 days", () => {
            const soonExp = Math.floor(Date.now() / 1000) + 86400 * 45; // 45 days
            const batch: Batch = {
                batch_id: "B-002",
                drug_name: "Amoxicillin",
                manufacturer: "G123",
                quantity: 500,
                manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 60,
                expiry_date: soonExp,
                direct_ship: false,
                is_recalled: false,
            };

            const result = calculateBatchExpiryStatus(batch);
            expect(result.status).toBe("EXPIRING_SOON");
            expect(result.isExpiringSoon).toBe(true);
            expect(result.isExpired).toBe(false);
        });

        it("returns EXPIRED for batch past expiry date", () => {
            const pastExp = Math.floor(Date.now() / 1000) - 86400 * 10;
            const batch: Batch = {
                batch_id: "B-003",
                drug_name: "Expired Drug",
                manufacturer: "G123",
                quantity: 100,
                manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 200,
                expiry_date: pastExp,
                direct_ship: false,
                is_recalled: false,
            };

            const result = calculateBatchExpiryStatus(batch);
            expect(result.status).toBe("EXPIRED");
            expect(result.isExpired).toBe(true);
        });

        it("handles invalid or missing batch data safely without crashing", () => {
            const invalidBatch: any = {
                batch_id: "BAD-01",
                expiry_date: "INVALID_DATE_TIMESTAMP",
            };

            const result = calculateBatchExpiryStatus(invalidBatch);
            expect(result.status).toBe("INVALID_DATE");
            expect(result.isValid).toBe(false);

            const nullResult = calculateBatchExpiryStatus(null);
            expect(nullResult.status).toBe("INVALID_DATE");
            expect(nullResult.isValid).toBe(false);
        });
    });
});
