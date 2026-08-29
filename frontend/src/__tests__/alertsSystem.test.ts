import { describe, it, expect, beforeEach } from "vitest";
import { Batch } from "../types/pharma";
import { 
  generateInventoryAlerts, 
  markAlertAsRead, 
  markAllAlertsAsRead, 
  clearReadAlerts, 
  getReadAlertIds 
} from "../utils/alertUtils";

describe("Inventory Event Alert System Unit Tests", () => {
  const nowSec = Math.floor(Date.now() / 1000);

  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  const mockBatches: Batch[] = [
    {
      batch_id: "B-RECALL-01",
      drug_name: "Valganciclovir 450mg",
      manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
      quantity: 1200,
      manufacture_date: nowSec - 86400 * 90,
      expiry_date: nowSec + 86400 * 180,
      direct_ship: false,
      is_recalled: true
    },
    {
      batch_id: "B-EXPIRED-02",
      drug_name: "Insulin Glargine",
      manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
      quantity: 3000,
      manufacture_date: nowSec - 86400 * 400,
      expiry_date: nowSec - 86400 * 15, // Expired
      direct_ship: false,
      is_recalled: false
    },
    {
      batch_id: "B-QUARANTINE-03",
      drug_name: "Amoxicillin CL-V",
      manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
      quantity: 5000,
      manufacture_date: nowSec - 86400 * 10,
      expiry_date: nowSec + 86400 * 300,
      direct_ship: false,
      is_recalled: false,
      is_quarantined: true
    },
    {
      batch_id: "B-LOWSTOCK-04",
      drug_name: "Metformin XL",
      manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
      quantity: 450, // Low stock < 1000
      manufacture_date: nowSec - 86400 * 60,
      expiry_date: nowSec + 86400 * 20, // Expiring soon (<30d)
      direct_ship: false,
      is_recalled: false
    }
  ];

  it("generates CRITICAL recall alert for recalled batch", () => {
    const alerts = generateInventoryAlerts(mockBatches);
    const recallAlert = alerts.find(a => a.batchId === "B-RECALL-01");
    expect(recallAlert).toBeDefined();
    expect(recallAlert?.severity).toBe("CRITICAL");
    expect(recallAlert?.category).toBe("RECALL");
  });

  it("generates CRITICAL expired alert for expired batch", () => {
    const alerts = generateInventoryAlerts(mockBatches);
    const expAlert = alerts.find(a => a.batchId === "B-EXPIRED-02");
    expect(expAlert).toBeDefined();
    expect(expAlert?.severity).toBe("CRITICAL");
    expect(expAlert?.category).toBe("EXPIRED");
  });

  it("generates HIGH quarantine alert for quarantined batch", () => {
    const alerts = generateInventoryAlerts(mockBatches);
    const quAlert = alerts.find(a => a.batchId === "B-QUARANTINE-03");
    expect(quAlert).toBeDefined();
    expect(quAlert?.severity).toBe("HIGH");
    expect(quAlert?.category).toBe("QUARANTINE");
  });

  it("generates LOW_STOCK and EXPIRING_SOON alerts for low stock / expiring batch", () => {
    const alerts = generateInventoryAlerts(mockBatches);
    const lowStockAlert = alerts.find(a => a.batchId === "B-LOWSTOCK-04" && a.category === "LOW_STOCK");
    const soonAlert = alerts.find(a => a.batchId === "B-LOWSTOCK-04" && a.category === "EXPIRING_SOON");

    expect(lowStockAlert).toBeDefined();
    expect(lowStockAlert?.severity).toBe("MEDIUM");
    expect(soonAlert).toBeDefined();
    expect(soonAlert?.severity).toBe("HIGH");
  });

  it("sorts CRITICAL alerts first", () => {
    const alerts = generateInventoryAlerts(mockBatches);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].severity).toBe("CRITICAL");
  });

  it("persists read alert states to local storage", () => {
    const alertId = "ALT-REC-B-RECALL-01";
    markAlertAsRead(alertId);
    expect(getReadAlertIds()).toContain(alertId);

    markAllAlertsAsRead(["ALT-EXP-B-EXPIRED-02", "ALT-QUA-B-QUARANTINE-03"]);
    expect(getReadAlertIds().length).toBe(3);

    clearReadAlerts();
    expect(getReadAlertIds().length).toBe(0);
  });
});
