import { describe, it, expect } from "vitest";
import { getTransactionStatus, getRegistryContractId, getCustodyContractId } from "../utils/soroban";
import { calculateBatchExpiryStatus } from "../utils/batchUtils";

describe("Traceability & Blockchain Integration Tests", () => {
    describe("getTransactionStatus", () => {
        it("returns NOT_FOUND for empty or invalid transaction hash", async () => {
            const res1 = await getTransactionStatus("");
            expect(res1.status).toBe("NOT_FOUND");

            const res2 = await getTransactionStatus("123");
            expect(res2.status).toBe("NOT_FOUND");
        });

        it("returns SUCCESS for valid mock transaction hashes", async () => {
            const mockHash = "mock_tx_hash_98765432101234567890";
            const res = await getTransactionStatus(mockHash);
            expect(res.status).toBe("SUCCESS");
        });
    });

    describe("Contract Addresses", () => {
        it("loads non-empty registry and custody contract IDs", () => {
            expect(getRegistryContractId()).toBeTruthy();
            expect(getCustodyContractId()).toBeTruthy();
        });
    });

    describe("Traceability Batch Audit Verification", () => {
        it("correctly flags recalled and quarantined batch events", () => {
            const recalledBatch = {
                batch_id: "REC-1001",
                drug_name: "Recalled Test Drug",
                manufacturer: "G1111111111111111111111111111111111111111111111111111111",
                quantity: 100,
                manufacture_date: 1700000000,
                expiry_date: 1800000000,
                direct_ship: false,
                is_recalled: true,
                recalled_by: "G1111111111111111111111111111111111111111111111111111111"
            };

            const status = calculateBatchExpiryStatus(recalledBatch);
            expect(status.status).toBe("RECALLED");
            expect(status.badgeStatus).toBe("RECALLED");
        });

        it("correctly flags expired batch events", () => {
            const expiredBatch = {
                batch_id: "EXP-999",
                drug_name: "Expired Product",
                manufacturer: "G1111111111111111111111111111111111111111111111111111111",
                quantity: 50,
                manufacture_date: 1600000000,
                expiry_date: 1650000000, // Past timestamp
                direct_ship: false,
                is_recalled: false,
            };

            const status = calculateBatchExpiryStatus(expiredBatch);
            expect(status.status).toBe("EXPIRED");
            expect(status.isExpired).toBe(true);
        });
    });
});
