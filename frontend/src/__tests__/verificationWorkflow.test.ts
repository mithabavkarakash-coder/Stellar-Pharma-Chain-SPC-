import { describe, it, expect } from "vitest";
import { validateBatchId } from "../utils/validation";
import { 
    parseGS1DataMatrix, 
    determineVerificationState 
} from "../utils/batchUtils";

describe("Verification Workflow Unit Tests", () => {
    describe("validateBatchId", () => {
        it("accepts valid alphanumeric batch IDs", () => {
            expect(validateBatchId("AX-7729-001").valid).toBe(true);
            expect(validateBatchId("BATCH_2026_X").valid).toBe(true);
        });

        it("accepts GS1 DataMatrix formatted strings with parentheses", () => {
            const gs1String = "(01)00312345678906(10)AX-7729-001(17)261231";
            expect(validateBatchId(gs1String).valid).toBe(true);
        });

        it("rejects invalid characters e.g. script tags or special symbols", () => {
            expect(validateBatchId("<script>alert(1)</script>").valid).toBe(false);
            expect(validateBatchId("BATCH$#@!").valid).toBe(false);
        });

        it("rejects empty or whitespace-only inputs", () => {
            expect(validateBatchId("").valid).toBe(false);
            expect(validateBatchId("   ").valid).toBe(false);
        });
    });

    describe("parseGS1DataMatrix", () => {
        it("extracts batch ID from GS1 DataMatrix string with Application Identifiers", () => {
            const raw = "(01)00312345678906(10)AX-7729-001(17)261231";
            const parsed = parseGS1DataMatrix(raw);
            expect(parsed.batchId).toBe("AX-7729-001");
            expect(parsed.gtin).toBe("00312345678906");
            expect(parsed.expiryRaw).toBe("261231");
            expect(parsed.isGS1).toBe(true);
        });

        it("extracts batch ID from full QR code verification URLs", () => {
            const url = "https://stellar-pharma-chain.app/verify?id=AX-7729-001";
            const parsed = parseGS1DataMatrix(url);
            expect(parsed.batchId).toBe("AX-7729-001");
        });

        it("handles standard batch ID strings directly", () => {
            const plain = "PH-2024-001";
            const parsed = parseGS1DataMatrix(plain);
            expect(parsed.batchId).toBe("PH-2024-001");
            expect(parsed.isGS1).toBe(false);
        });
    });

    describe("determineVerificationState", () => {
        const nowSec = Math.floor(Date.now() / 1000);

        it("classifies valid authentic batch as VALID", () => {
            const validData = {
                batch: {
                    batch_id: "AX-7729-001",
                    drug_name: "Amoxicillin",
                    manufacture_date: nowSec - 86400 * 30,
                    expiry_date: nowSec + 86400 * 180,
                    is_recalled: 0,
                    is_quarantined: 0
                }
            };
            expect(determineVerificationState(null, validData)).toBe("VALID");
        });

        it("classifies expired batch as EXPIRED", () => {
            const expiredData = {
                batch: {
                    batch_id: "EXP-001",
                    manufacture_date: nowSec - 86400 * 400,
                    expiry_date: nowSec - 86400 * 10,
                    is_recalled: 0,
                    is_quarantined: 0
                }
            };
            expect(determineVerificationState(null, expiredData)).toBe("EXPIRED");
        });

        it("classifies recalled batch as RECALLED", () => {
            const recalledData = {
                batch: {
                    batch_id: "REC-001",
                    expiry_date: nowSec + 86400 * 100,
                    is_recalled: 1,
                    is_quarantined: 0
                }
            };
            expect(determineVerificationState(null, recalledData)).toBe("RECALLED");
        });

        it("classifies quarantined batch as QUARANTINED", () => {
            const quarantinedData = {
                batch: {
                    batch_id: "QUA-001",
                    expiry_date: nowSec + 86400 * 100,
                    is_recalled: 0,
                    is_quarantined: 1
                }
            };
            expect(determineVerificationState(null, quarantinedData)).toBe("QUARANTINED");
        });

        it("classifies invalid input string error as INVALID_FORMAT", () => {
            expect(determineVerificationState("Identifier contains invalid characters", null)).toBe("INVALID_FORMAT");
        });

        it("classifies missing batch error as MISSING_RECORD", () => {
            expect(determineVerificationState("Batch not found on server or blockchain", null)).toBe("MISSING_RECORD");
        });

        it("classifies RPC connection error as NETWORK_UNAVAILABLE", () => {
            expect(determineVerificationState("Failed to fetch batch details from blockchain RPC network", null)).toBe("NETWORK_UNAVAILABLE");
        });
    });
});
