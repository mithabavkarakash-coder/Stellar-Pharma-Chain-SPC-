import { Batch, Handoff, Supplier } from "../types/pharma";
import { calculateBatchExpiryStatus, formatSupplierAddress } from "./batchUtils";

export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";

export type AlertCategory = 
  | "LOW_STOCK"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "RECALL"
  | "QUARANTINE"
  | "TELEMETRY_BREACH"
  | "CUSTODY_HANDOFF";

export interface InventoryAlert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  batchId: string;
  drugName: string;
  timestamp: number;
  timeFormatted: string;
  targetAddress?: string;
  supplierName?: string;
  actionUrl: string;
  isRead?: boolean;
}

const READ_ALERTS_KEY = "spc_read_alert_ids";

/**
 * Retrieve list of read alert IDs from localStorage
 */
export function getReadAlertIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(READ_ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Mark a specific alert ID as read
 */
export function markAlertAsRead(alertId: string): void {
  if (typeof window === "undefined") return;
  const current = getReadAlertIds();
  if (!current.includes(alertId)) {
    const updated = [...current, alertId];
    localStorage.setItem(READ_ALERTS_KEY, JSON.stringify(updated));
  }
}

/**
 * Mark an array of alert IDs as read
 */
export function markAllAlertsAsRead(alertIds: string[]): void {
  if (typeof window === "undefined") return;
  const current = getReadAlertIds();
  const set = new Set([...current, ...alertIds]);
  localStorage.setItem(READ_ALERTS_KEY, JSON.stringify(Array.from(set)));
}

/**
 * Clear all read alert states
 */
export function clearReadAlerts(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(READ_ALERTS_KEY);
}

/**
 * Format timestamp into human-readable relative time string
 */
export function formatRelativeTime(timestampSec: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diffSec = Math.max(0, now - timestampSec);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

/**
 * Generate prioritized inventory event alerts dynamically from live batch, handoff, and supplier arrays.
 * Efficient evaluation in memory with zero extra network polling.
 */
export function generateInventoryAlerts(
  batches: Batch[] = [],
  handoffs: Handoff[] = [],
  suppliers: Supplier[] = []
): InventoryAlert[] {
  const alerts: InventoryAlert[] = [];
  const readIds = new Set(getReadAlertIds());
  const nowSec = Math.floor(Date.now() / 1000);

  // Supplier lookup helper
  const getSupplierName = (addr: string) => {
    const found = suppliers.find(s => s.address.toLowerCase() === addr.toLowerCase());
    return found ? found.name : formatSupplierAddress(addr);
  };

  batches.forEach(batch => {
    const expCalc = calculateBatchExpiryStatus(batch);
    const mfgName = getSupplierName(batch.manufacturer);

    // 1. Emergency Recalls (CRITICAL)
    if (batch.is_recalled) {
      const alertId = `ALT-REC-${batch.batch_id}`;
      alerts.push({
        id: alertId,
        severity: "CRITICAL",
        category: "RECALL",
        title: `Emergency Recall: ${batch.drug_name}`,
        description: `Manufacturer ${mfgName} registered an on-chain recall for Batch #${batch.batch_id}. Cease distribution & quarantine remaining ${batch.quantity.toLocaleString()} units immediately.`,
        batchId: batch.batch_id,
        drugName: batch.drug_name,
        timestamp: batch.manufacture_date || nowSec,
        timeFormatted: formatRelativeTime(batch.manufacture_date || nowSec),
        targetAddress: batch.manufacturer,
        supplierName: mfgName,
        actionUrl: `/verify?id=${encodeURIComponent(batch.batch_id)}`,
        isRead: readIds.has(alertId)
      });
    }

    // 2. Expired Batches (CRITICAL)
    if (expCalc.isExpired && !batch.is_recalled) {
      const alertId = `ALT-EXP-${batch.batch_id}`;
      alerts.push({
        id: alertId,
        severity: "CRITICAL",
        category: "EXPIRED",
        title: `Expired Inventory: ${batch.drug_name}`,
        description: `Batch #${batch.batch_id} passed its shelf-life expiration date. ${batch.quantity.toLocaleString()} units marked for disposal audit.`,
        batchId: batch.batch_id,
        drugName: batch.drug_name,
        timestamp: batch.expiry_date || nowSec,
        timeFormatted: formatRelativeTime(batch.expiry_date || nowSec),
        targetAddress: batch.manufacturer,
        supplierName: mfgName,
        actionUrl: `/verify?id=${encodeURIComponent(batch.batch_id)}`,
        isRead: readIds.has(alertId)
      });
    }

    // 3. Quarantined Holds (HIGH)
    if (batch.is_quarantined && !batch.is_recalled) {
      const alertId = `ALT-QUA-${batch.batch_id}`;
      alerts.push({
        id: alertId,
        severity: "HIGH",
        category: "QUARANTINE",
        title: `Quarantine Hold Flagged: ${batch.drug_name}`,
        description: `Batch #${batch.batch_id} is under active quality assurance quarantine hold pending seal audit.`,
        batchId: batch.batch_id,
        drugName: batch.drug_name,
        timestamp: nowSec - 3600,
        timeFormatted: "1h ago",
        targetAddress: batch.manufacturer,
        supplierName: mfgName,
        actionUrl: `/verify?id=${encodeURIComponent(batch.batch_id)}`,
        isRead: readIds.has(alertId)
      });
    }

    // 4. Medicines Approaching Expiry (<30 days HIGH, <90 days MEDIUM)
    if (!expCalc.isExpired && expCalc.isExpiringSoon && !batch.is_recalled) {
      const daysLeft = expCalc.daysRemaining ?? 0;
      const isUrgent = daysLeft <= 30;
      const alertId = `ALT-SOON-${batch.batch_id}`;

      alerts.push({
        id: alertId,
        severity: isUrgent ? "HIGH" : "MEDIUM",
        category: "EXPIRING_SOON",
        title: `Expiring Soon (${daysLeft} days left): ${batch.drug_name}`,
        description: `Batch #${batch.batch_id} expires in ${daysLeft} days. Priority dispatch or restocking protocol recommended.`,
        batchId: batch.batch_id,
        drugName: batch.drug_name,
        timestamp: batch.expiry_date ? batch.expiry_date - 86400 * 30 : nowSec,
        timeFormatted: formatRelativeTime(batch.expiry_date ? batch.expiry_date - 86400 * 30 : nowSec),
        targetAddress: batch.manufacturer,
        supplierName: mfgName,
        actionUrl: `/verify?id=${encodeURIComponent(batch.batch_id)}`,
        isRead: readIds.has(alertId)
      });
    }

    // 5. Low Stock Alert (<1,000 units) (MEDIUM)
    const remaining = batch.remaining_quantity !== undefined ? batch.remaining_quantity : batch.quantity;
    if (remaining < 1000 && !batch.is_recalled) {
      const alertId = `ALT-LOW-${batch.batch_id}`;
      alerts.push({
        id: alertId,
        severity: "MEDIUM",
        category: "LOW_STOCK",
        title: `Low Stock Warning: ${batch.drug_name}`,
        description: `Batch #${batch.batch_id} remaining stock dropped to ${remaining.toLocaleString()} units (Below 1,000 unit threshold).`,
        batchId: batch.batch_id,
        drugName: batch.drug_name,
        timestamp: nowSec - 7200,
        timeFormatted: "2h ago",
        targetAddress: batch.manufacturer,
        supplierName: mfgName,
        actionUrl: `/inventory`,
        isRead: readIds.has(alertId)
      });
    }
  });

  // Sort alerts by severity priority (CRITICAL > HIGH > MEDIUM > INFO) then newest timestamp
  const severityScore: Record<AlertSeverity, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    INFO: 1
  };

  return alerts.sort((a, b) => {
    if (severityScore[b.severity] !== severityScore[a.severity]) {
      return severityScore[b.severity] - severityScore[a.severity];
    }
    return b.timestamp - a.timestamp;
  });
}
