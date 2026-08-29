export type Role = "Manufacturer" | "Supplier" | "Distributor" | "Pharmacy" | "Customer" | "Admin";

export type SupplierType = "Manufacturer" | "Distributor" | "Pharmacy";
export type ComplianceStatus = "VERIFIED" | "PENDING_AUDIT" | "SUSPENDED";

export interface Supplier {
    id: string;
    name: string;
    address: string;
    type: SupplierType;
    license_number: string;
    contact_email: string;
    contact_phone: string;
    location: string;
    compliance_status: ComplianceStatus;
    quality_rating: number; // 0.0 to 5.0
    total_batches_handled: number;
    active_shipments: number;
    notes?: string;
    created_at: number;
}

export interface Batch {
    batch_id: string;
    drug_name: string;
    manufacturer: string;
    quantity: number;
    manufacture_date: number;
    expiry_date: number;
    direct_ship: boolean;
    is_recalled: boolean;
    recalled_by?: string | null;
    created_at?: number;
    is_quarantined?: boolean;
    quarantine_reason?: string | null;
}

export interface Handoff {
    id?: number;
    batch_id: string;
    from_address: string;
    to_address: string;
    quantity: number;
    new_role: string;
    transaction_hash: string;
    timestamp: number;
}

export interface Dispense {
    id?: number;
    batch_id: string;
    pharmacy: string;
    quantity: number;
    remaining_quantity: number;
    transaction_hash: string;
    timestamp: number;
}

export interface VerificationResult {
    is_genuine: boolean;
    is_recalled: boolean;
    is_expired: boolean;
    batch?: Batch | null;
    handoffs?: Handoff[];
    dispenses?: Dispense[];
    anomalies: string[];
    status: "AUTHENTIC" | "WARNING" | "COUNTERFEIT" | "RECALLED" | "EXPIRED" | string;
}

export interface TelemetryData {
    timestamp: string;
    temperature: number;
    humidity: number;
    isAnomaly?: boolean;
}

export interface AIRiskAssessment {
    riskScore: number; // 0 to 100
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    riskFactors: string[];
    recommendations: string[];
}
