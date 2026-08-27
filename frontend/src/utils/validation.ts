/**
 * Client-side input validation utilities for Stellar Pharma Chain forms.
 */

export function validateStellarAddress(address: string): { valid: boolean; error?: string } {
    if (!address || typeof address !== "string") {
        return { valid: false, error: "Stellar address is required." };
    }
    const trimmed = address.trim();
    if (!trimmed.startsWith("G") || trimmed.length !== 56) {
        return { 
            valid: false, 
            error: "Invalid Stellar public key format. Must be a 56-character string starting with 'G'." 
        };
    }
    const alphanumeric = /^[A-Z0-9]+$/;
    if (!alphanumeric.test(trimmed)) {
        return { valid: false, error: "Stellar address contains invalid characters." };
    }
    return { valid: true };
}

export function validateBatchId(batchId: string): { valid: boolean; error?: string } {
    if (!batchId || typeof batchId !== "string") {
        return { valid: false, error: "Batch ID is required." };
    }
    const trimmed = batchId.trim();
    if (trimmed.length < 3 || trimmed.length > 64) {
        return { valid: false, error: "Batch ID must be between 3 and 64 characters." };
    }
    const regex = /^[A-Za-z0-9_-]+$/;
    if (!regex.test(trimmed)) {
        return { valid: false, error: "Batch ID can only contain letters, numbers, hyphens, and underscores." };
    }
    return { valid: true };
}

export function validateQuantity(quantity: number | string): { valid: boolean; error?: string } {
    const num = Number(quantity);
    if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
        return { valid: false, error: "Quantity must be a positive integer greater than zero." };
    }
    return { valid: true };
}

export function validateDateRange(manufactureDate: string, expiryDate: string): { valid: boolean; error?: string } {
    if (!manufactureDate || !expiryDate) {
        return { valid: false, error: "Both manufacture date and expiry date are required." };
    }
    const mfgTime = new Date(manufactureDate).getTime();
    const expTime = new Date(expiryDate).getTime();

    if (isNaN(mfgTime)) {
        return { valid: false, error: "Invalid manufacture date." };
    }
    if (isNaN(expTime)) {
        return { valid: false, error: "Invalid expiry date." };
    }
    if (mfgTime >= expTime) {
        return { valid: false, error: "Expiry date must be strictly after manufacture date." };
    }
    return { valid: true };
}
