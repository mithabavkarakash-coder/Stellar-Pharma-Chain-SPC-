import { describe, it, expect } from "vitest";
import { Batch, Handoff, Supplier } from "../types/pharma";
import { 
  getAuditHistoryLogs, 
  getAuditMetrics, 
  formatSafeTxHash, 
  AuditLogItem 
} from "../utils/auditUtils";

describe("Audit History Module Unit Tests", () => {
  const nowSec = Math.floor(Date.now() / 1000);

  const mockBatches: Batch[] = [
    {
      batch_id: "AX-7729-001",
      drug_name: "Amoxicillin Trihydrate 500mg",
      manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
      quantity: 5000,
      manufacture_date: nowSec - 86400 * 30,
      expiry_date: nowSec + 86400 * 300,
      direct_ship: false,
      is_recalled: false
    },
    {
      batch_id: "REC-9921-00",
      drug_name: "Valganciclovir 450mg",
      manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
      quantity: 800,
      manufacture_date: nowSec - 86400 * 90,
      expiry_date: nowSec + 86400 * 200,
      direct_ship: false,
      is_recalled: true,
      recalled_by: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663"
    }
  ];

  const mockHandoffs: Handoff[] = [
    {
      batch_id: "AX-7729-001",
      from_address: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
      to_address: "GDISTRIB7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN8888",
      new_role: "Distributor",
      quantity: 5000,
      timestamp: nowSec - 86400 * 15,
      transaction_hash: "5fb9930f8b898127000000000000000000000000000000000000000000000001"
    }
  ];

  const mockSuppliers: Supplier[] = [
    {
      id: "SUP-101",
      name: "Apex BioPharma Labs",
      address: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
      type: "Manufacturer",
      license_number: "FDA-1001",
      compliance_status: "VERIFIED",
      quality_rating: 4.9,
      total_batches_handled: 10,
      active_shipments: 1,
      created_at: nowSec
    }
  ];

  it("aggregates registrations, handoffs, and recall events into unified audit log", () => {
    const logs = getAuditHistoryLogs(mockBatches, mockHandoffs, mockSuppliers);
    expect(logs.length).toBe(4); // 2 registrations + 1 recall + 1 handoff = 4 logs
    const actions = logs.map(l => l.action);
    expect(actions).toContain("BATCH_REGISTERED");
    expect(actions).toContain("CUSTODY_HANDOFF");
    expect(actions).toContain("BATCH_RECALLED");
  });

  it("sorts audit logs in reverse chronological order (newest timestamp first)", () => {
    const logs = getAuditHistoryLogs(mockBatches, mockHandoffs, mockSuppliers);
    for (let i = 0; i < logs.length - 1; i++) {
      expect(logs[i].timestamp).toBeGreaterThanOrEqual(logs[i + 1].timestamp);
    }
  });

  it("computes accurate audit summary metrics", () => {
    const logs = getAuditHistoryLogs(mockBatches, mockHandoffs, mockSuppliers);
    const metrics = getAuditMetrics(logs);
    expect(metrics.totalLogs).toBe(logs.length);
    expect(metrics.registrationsCount).toBe(2);
    expect(metrics.handoffsCount).toBe(1);
    expect(metrics.recallsCount).toBe(1);
  });

  it("formats transaction hashes safely and handles missing hashes gracefully", () => {
    const fullHash = "5fb9930f8b898127000000000000000000000000000000000000000000000001";
    const formatted = formatSafeTxHash(fullHash);
    expect(formatted).toBe("5fb9930f...00000001");

    expect(formatSafeTxHash("")).toBe("0x... Pending Ledger Confirmation");
    expect(formatSafeTxHash(undefined)).toBe("0x... Pending Ledger Confirmation");
  });
});
