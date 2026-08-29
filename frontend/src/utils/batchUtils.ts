import { Batch } from "../types/pharma";

export type BatchExpiryStatus = 
    | "ACTIVE" 
    | "EXPIRING_SOON" 
    | "EXPIRED" 
    | "RECALLED" 
    | "QUARANTINED" 
    | "INVALID_DATE";

export interface BatchStatusCalculation {
    status: BatchExpiryStatus;
    label: string;
    daysRemaining: number | null;
    isExpired: boolean;
    isExpiringSoon: boolean;
    isValid: boolean;
    badgeStatus: "AUTHENTIC" | "WARNING" | "EXPIRED" | "RECALLED" | "QUARANTINED" | string;
}

/**
 * Safely parses any date input (Unix epoch in seconds or milliseconds, ISO date string, or Date object)
 * into Unix epoch seconds. Returns null if invalid.
 */
export function parseSafeTimestamp(dateInput: any): number | null {
    if (dateInput === null || dateInput === undefined || dateInput === "" || Number.isNaN(dateInput)) {
        return null;
    }

    if (typeof dateInput === "number") {
        if (!isFinite(dateInput) || dateInput <= 0) return null;
        // If input looks like milliseconds (> year 3000 in seconds), convert to seconds
        if (dateInput > 32503680000) {
            return Math.floor(dateInput / 1000);
        }
        return Math.floor(dateInput);
    }

    if (typeof dateInput === "string") {
        const trimmed = dateInput.trim();
        if (!trimmed) return null;
        // Try parsing numeric string
        const num = Number(trimmed);
        if (!isNaN(num) && num > 0) {
            return parseSafeTimestamp(num);
        }
        // Try parsing ISO or Date string
        const parsed = Date.parse(trimmed);
        if (!isNaN(parsed) && parsed > 0) {
            return Math.floor(parsed / 1000);
        }
        return null;
    }

    if (dateInput instanceof Date) {
        const time = dateInput.getTime();
        return isNaN(time) || time <= 0 ? null : Math.floor(time / 1000);
    }

    return null;
}

/**
 * Safely formats any date timestamp into a locale date string.
 * Fallback is displayed if date is invalid or missing.
 */
export function formatSafeDate(dateInput: any, fallback = "N/A"): string {
    const timestampSec = parseSafeTimestamp(dateInput);
    if (timestampSec === null) return fallback;
    try {
        const date = new Date(timestampSec * 1000);
        if (isNaN(date.getTime())) return fallback;
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    } catch (_e) {
        return fallback;
    }
}

/**
 * Safely formats a Stellar address / supplier ID into a truncated display format.
 */
export function formatSupplierAddress(address?: string | null, fallback = "Unknown Supplier"): string {
    if (!address || typeof address !== "string") return fallback;
    const trimmed = address.trim();
    if (trimmed.length < 12) return trimmed || fallback;
    return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
}

/**
 * Automatically calculates batch status (Active, Expiring Soon, Expired, Recalled, Quarantined, Invalid Date)
 * with complete safe error handling for missing/null/invalid data.
 */
export function calculateBatchExpiryStatus(
    batch?: Partial<Batch> | null,
    thresholdDays = 90
): BatchStatusCalculation {
    if (!batch) {
        return {
            status: "INVALID_DATE",
            label: "Missing Data",
            daysRemaining: null,
            isExpired: false,
            isExpiringSoon: false,
            isValid: false,
            badgeStatus: "WARNING"
        };
    }

    // Explicit override flags
    if (batch.is_recalled) {
        return {
            status: "RECALLED",
            label: "Recalled",
            daysRemaining: null,
            isExpired: false,
            isExpiringSoon: false,
            isValid: true,
            badgeStatus: "RECALLED"
        };
    }

    if (batch.is_quarantined) {
        return {
            status: "QUARANTINED",
            label: "Quarantined",
            daysRemaining: null,
            isExpired: false,
            isExpiringSoon: false,
            isValid: true,
            badgeStatus: "QUARANTINED"
        };
    }

    const expSec = parseSafeTimestamp(batch.expiry_date);
    if (expSec === null) {
        return {
            status: "INVALID_DATE",
            label: "Invalid Expiry Date",
            daysRemaining: null,
            isExpired: false,
            isExpiringSoon: false,
            isValid: false,
            badgeStatus: "WARNING"
        };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const diffSec = expSec - nowSec;
    const daysRemaining = Math.floor(diffSec / 86400);

    if (diffSec <= 0) {
        return {
            status: "EXPIRED",
            label: "Expired",
            daysRemaining,
            isExpired: true,
            isExpiringSoon: false,
            isValid: true,
            badgeStatus: "EXPIRED"
        };
    }

    const thresholdSec = thresholdDays * 86400;
    if (diffSec <= thresholdSec) {
        return {
            status: "EXPIRING_SOON",
            label: `Expiring Soon (${daysRemaining}d)`,
            daysRemaining,
            isExpired: false,
            isExpiringSoon: true,
            isValid: true,
            badgeStatus: "WARNING"
        };
    }

    return {
        status: "ACTIVE",
        label: "Active",
        daysRemaining,
        isExpired: false,
        isExpiringSoon: false,
        isValid: true,
        badgeStatus: "AUTHENTIC"
    };
}

export interface GS1ParseResult {
    batchId: string;
    gtin?: string;
    expiryRaw?: string;
    originalInput: string;
    isGS1: boolean;
}

/**
 * Parses raw barcode input, URLs, or GS1 2D DataMatrix strings to extract the Batch ID.
 * Examples:
 * - "(01)00312345678906(10)AX-7729-001(17)261231" -> Batch ID: "AX-7729-001"
 * - "https://stellar-pharma.app/verify?id=AX-7729-001" -> Batch ID: "AX-7729-001"
 * - "AX-7729-001" -> Batch ID: "AX-7729-001"
 */
export function parseGS1DataMatrix(input: string): GS1ParseResult {
    if (!input || typeof input !== "string") {
        return { batchId: "", originalInput: "", isGS1: false };
    }

    const trimmed = input.trim();

    // 1. Try URL parameter extraction
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        try {
            const url = new URL(trimmed);
            const idParam = url.searchParams.get("id");
            if (idParam) {
                return parseGS1DataMatrix(idParam);
            }
        } catch {
            // Ignore URL parse error and continue
        }
    }

    // 2. Try bracketed GS1 Application Identifiers: (01)... (10)BATCH_ID (17)EXP
    const batchIdMatch = trimmed.match(/\(10\)([A-Za-z0-9_\-]+)/);
    const gtinMatch = trimmed.match(/\(01\)(\d{14})/);
    const expMatch = trimmed.match(/\(17\)(\d{6})/);

    if (batchIdMatch) {
        return {
            batchId: batchIdMatch[1],
            gtin: gtinMatch ? gtinMatch[1] : undefined,
            expiryRaw: expMatch ? expMatch[1] : undefined,
            originalInput: trimmed,
            isGS1: true
        };
    }

    // 3. Fallback: Return direct sanitized string
    return {
        batchId: trimmed,
        originalInput: trimmed,
        isGS1: false
    };
}

export type VerificationState = 
    | "VALID" 
    | "INVALID_FORMAT" 
    | "MISSING_RECORD" 
    | "EXPIRED" 
    | "RECALLED" 
    | "QUARANTINED" 
    | "NETWORK_UNAVAILABLE";

export function determineVerificationState(
    errorMsg: string | null,
    batchData: any | null
): VerificationState {
    if (errorMsg) {
        const lower = errorMsg.toLowerCase();
        if (lower.includes("format") || lower.includes("invalid character") || lower.includes("identifier length")) {
            return "INVALID_FORMAT";
        }
        if (lower.includes("not found") || lower.includes("unregistered") || lower.includes("counterfeit")) {
            return "MISSING_RECORD";
        }
        if (lower.includes("failed to fetch") || lower.includes("network") || lower.includes("blockchain") || lower.includes("rpc")) {
            return "NETWORK_UNAVAILABLE";
        }
        return "MISSING_RECORD";
    }

    if (!batchData || !batchData.batch) {
        return "MISSING_RECORD";
    }

    const b = batchData.batch;
    if (b.is_recalled === 1 || b.is_recalled === true) {
        return "RECALLED";
    }
    if (b.is_quarantined === 1 || b.is_quarantined === true) {
        return "QUARANTINED";
    }

    const expiryStatus = calculateBatchExpiryStatus(b);
    if (expiryStatus.isExpired) {
        return "EXPIRED";
    }

    return "VALID";
}

