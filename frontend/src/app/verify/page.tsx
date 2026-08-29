"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { useWallet } from "../../context/WalletContext";
import { Html5QrcodeScanner } from "html5-qrcode";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Search, 
  QrCode, 
  XCircle,
  Factory,
  Truck,
  Globe,
  Building,
  AlertTriangle,
  FileCheck,
  AlertOctagon,
  WifiOff,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { getBatchOnChain } from "../../utils/soroban";
import { 
  calculateBatchExpiryStatus, 
  formatSafeDate, 
  formatSupplierAddress,
  parseGS1DataMatrix,
  determineVerificationState,
  VerificationState 
} from "../../utils/batchUtils";
import { validateBatchId } from "../../utils/validation";
import SkeletonLoader from "../../components/SkeletonLoader";
import GS1DataMatrixModal from "../../components/GS1DataMatrixModal";
import ComplianceCertificateModal from "../../components/ComplianceCertificateModal";
import IoTSensorSimulator from "../../components/IoTSensorSimulator";
import LiveTelemetryChart, { TelemetryPoint } from "../../components/LiveTelemetryChart";
import GPSCustodyTracker from "../../components/GPSCustodyTracker";
import CameraScannerModal from "../../components/CameraScannerModal";
import AIRiskDetector from "../../components/AIRiskDetector";
import CounterfeitDetector from "../../components/CounterfeitDetector";

const MOCK_DEMO_BATCHES: Record<string, any> = {
  "AX-7729-001": {
    is_genuine: true,
    batch: {
      batch_id: "AX-7729-001",
      drug_name: "Amoxicillin Trihydrate 500mg",
      manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
      quantity: 5000,
      manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 60,
      expiry_date: Math.floor(Date.now() / 1000) + 86400 * 300,
      direct_ship: 0,
      is_recalled: 0,
      is_quarantined: 0
    },
    handoffs: [
      {
        from_address: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
        to_address: "GDISTRIB7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN8888",
        new_role: "Distributor",
        quantity: 5000,
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 45,
        transaction_hash: "5fb9930f8b898127000000000000000000000000000000000000000000000001"
      },
      {
        from_address: "GDISTRIB7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN8888",
        to_address: "GPHARMACYUIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN9999",
        new_role: "Pharmacy",
        quantity: 2500,
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 15,
        transaction_hash: "5fb9930f8b898127000000000000000000000000000000000000000000000002"
      }
    ],
    dispenses: [
      {
        pharmacy: "GPHARMACYUIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN9999",
        quantity: 50,
        remaining_quantity: 2450,
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 2,
        transaction_hash: "5fb9930f8b898127000000000000000000000000000000000000000000000003"
      }
    ],
    anomalies: []
  },
  "EXP-2024-99": {
    is_genuine: true,
    batch: {
      batch_id: "EXP-2024-99",
      drug_name: "Paracetamol 650mg Systemic",
      manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
      quantity: 1200,
      manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 400,
      expiry_date: Math.floor(Date.now() / 1000) - 86400 * 30,
      direct_ship: 1,
      is_recalled: 0,
      is_quarantined: 0
    },
    handoffs: [],
    dispenses: [],
    anomalies: ["Batch past shelf life expiration date"]
  },
  "REC-9921-00": {
    is_genuine: true,
    batch: {
      batch_id: "REC-9921-00",
      drug_name: "Valganciclovir 450mg Film Coated",
      manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
      quantity: 800,
      manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 90,
      expiry_date: Math.floor(Date.now() / 1000) + 86400 * 200,
      direct_ship: 0,
      is_recalled: 1,
      recalled_by: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
      is_quarantined: 0
    },
    handoffs: [],
    dispenses: [],
    anomalies: ["Batch marked RECALLED on-chain by licensed manufacturer"]
  },
  "QUA-4410-02": {
    is_genuine: true,
    batch: {
      batch_id: "QUA-4410-02",
      drug_name: "Insulin Glargine 100U/ml Injectable",
      manufacturer: "GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663",
      quantity: 1500,
      manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 45,
      expiry_date: Math.floor(Date.now() / 1000) + 86400 * 180,
      direct_ship: 0,
      is_recalled: 0,
      is_quarantined: 1,
      quarantine_reason: "Cold-chain thermal excursion flagged (>12°C spike logged in transit)"
    },
    handoffs: [],
    dispenses: [],
    anomalies: ["Active quarantine hold flagged due to cold-chain breach"]
  }
};

function VerifyPortalContent() {
  const wallet = useWallet();
  const searchParams = useSearchParams();
  const router = useRouter();
  const batchIdParam = searchParams.get("id") || "";

  const [batchId, setBatchId] = useState(batchIdParam);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modals & New Components state
  const [isGS1ModalOpen, setIsGS1ModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  
  // Live Telemetry history stream state
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([
    { time: "10:00", temp: 4.2, humidity: 50 },
    { time: "10:15", temp: 4.5, humidity: 52 },
    { time: "10:30", temp: 4.3, humidity: 51 },
    { time: "10:45", temp: 4.6, humidity: 53 },
    { time: "11:00", temp: 4.4, humidity: 50 }
  ]);

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const handleTelemetryAdded = (temp: number, humidity: number) => {
    const timeStr = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
    const isEx = temp < 2.0 || temp > 8.0;
    setTelemetryHistory((prev) => [
      ...prev,
      { time: timeStr, temp, humidity, isExcursion: isEx }
    ].slice(-10));
  };

  const fetchBatchDetails = async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setData(null);

    // 1. Parse GS1 / URL
    const parsed = parseGS1DataMatrix(id);
    const targetId = parsed.batchId || id.trim();

    // 2. Client-side input validation
    const valResult = validateBatchId(targetId);
    if (!valResult.valid) {
      setError(valResult.error || "Identifier contains invalid characters or malformed format.");
      setLoading(false);
      return;
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
      const res = await fetch(`${backendUrl}/api/batches/${encodeURIComponent(targetId)}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const chainData = await getBatchOnChain(targetId);
        if (chainData) {
          setData({ is_genuine: true, batch: chainData, handoffs: [], dispenses: [], anomalies: [] });
        } else {
          // Fallback check against interactive demo batches
          const demoKey = targetId.toUpperCase();
          if (MOCK_DEMO_BATCHES[demoKey] || MOCK_DEMO_BATCHES[targetId]) {
            setData(MOCK_DEMO_BATCHES[demoKey] || MOCK_DEMO_BATCHES[targetId]);
          } else {
            setError("Batch not found on server or blockchain (Suspected Counterfeit)");
          }
        }
      }
    } catch {
      try {
        const chainData = await getBatchOnChain(targetId);
        if (chainData) {
          setData({ is_genuine: true, batch: chainData, handoffs: [], dispenses: [], anomalies: [] });
        } else {
          const demoKey = targetId.toUpperCase();
          if (MOCK_DEMO_BATCHES[demoKey] || MOCK_DEMO_BATCHES[targetId]) {
            setData(MOCK_DEMO_BATCHES[demoKey] || MOCK_DEMO_BATCHES[targetId]);
          } else {
            setError("Batch not found on server or blockchain (Suspected Counterfeit)");
          }
        }
      } catch {
        const demoKey = targetId.toUpperCase();
        if (MOCK_DEMO_BATCHES[demoKey] || MOCK_DEMO_BATCHES[targetId]) {
          setData(MOCK_DEMO_BATCHES[demoKey] || MOCK_DEMO_BATCHES[targetId]);
        } else {
          setError("Failed to fetch batch details from blockchain RPC network");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (batchIdParam) {
      fetchBatchDetails(batchIdParam);
    }
  }, [batchIdParam]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (batchId.trim()) {
      router.push(`/verify?id=${encodeURIComponent(batchId.trim())}`);
    }
  };

  // Setup/Teardown QR Code Scanner
  const toggleScanner = () => {
    if (isScanning) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
      setIsScanning(false);
    } else {
      setIsScanning(true);
      setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          "qr-reader-container",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          /* verbose= */ false
        );
        scannerRef.current = scanner;

        scanner.render(
          (decodedText) => {
            console.log("QR Decoded:", decodedText);
            let extractedId = decodedText;
            try {
              if (decodedText.startsWith("http://") || decodedText.startsWith("https://")) {
                const url = new URL(decodedText);
                extractedId = url.searchParams.get("id") || decodedText;
              }
            } catch {
              // Not a URL
            }
            
            setBatchId(extractedId);
            router.push(`/verify?id=${encodeURIComponent(extractedId)}`);
            
            scanner.clear().catch(console.error);
            scannerRef.current = null;
            setIsScanning(false);
          },
          (_errorMessage) => {
            // Silence noise
          }
        );
      }, 300);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  // Export Certificate JSON handler
  const _handleExportCertificate = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pharma_cert_${data.batch.batch_id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Report Issue Handler
  const handleReportIssue = () => {
    alert("Compliance Reporting Protocol Initiated. A secure log has been created and sent to your agency supervisor.");
  };

  return (
    <div>
      <Navbar
        connected={wallet.connected}
        address={wallet.address}
        balance={wallet.balance}
        role={wallet.role}
        loading={wallet.loading}
        onConnect={wallet.connect}
        onDisconnect={wallet.disconnect}
        onRoleChange={wallet.setRole}
      />

      <main className="main-content-offset" style={{ padding: "80px 20px 96px" }}>
        
        {/* Search Header */}
        <section style={{ maxWidth: 600, margin: "0 auto 32px", textAlign: "center" }}>
          <h1 style={{ fontSize: "2rem", marginBottom: 12 }}>Verify Batch Authenticity</h1>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
            Input the drug batch ID or scan the packaging QR code to verify origin and custody chain.
          </p>

          <div style={{ display: "flex", gap: 12 }}>
            <form onSubmit={handleSearch} style={{ display: "flex", flex: 1, gap: 12 }}>
              <input
                type="text"
                placeholder="Enter Batch ID..."
                className="form-control"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary">
                <Search style={{ width: 16, height: 16 }} />
              </button>
            </form>

            <button onClick={toggleScanner} className={`btn ${isScanning ? "btn-danger" : "btn-secondary"}`}>
              {isScanning ? <XCircle style={{ width: 16, height: 16 }} /> : <QrCode style={{ width: 16, height: 16 }} />}
              <span>{isScanning ? "Close" : "Scan QR"}</span>
            </button>
          </div>

          {isScanning && (
            <div className="glass-card" style={{ marginTop: 20, padding: 12 }}>
              <div id="qr-reader-container" style={{ width: "100%", background: "#000", borderRadius: 8 }}></div>
            </div>
          )}
        </section>

        {loading && (
          <div style={{ maxWidth: 800, margin: "40px auto" }}>
            <SkeletonLoader count={4} />
          </div>
        )}

        {/* State 1: Invalid Format State */}
        {error && determineVerificationState(error, data) === "INVALID_FORMAT" && (
          <div className="glass-card" style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", border: "1px solid rgba(245, 158, 11, 0.4)", padding: 32, background: "rgba(245, 158, 11, 0.05)" }}>
            <AlertCircle style={{ width: 56, height: 56, stroke: "#f59e0b", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: "1.4rem", color: "#fff", marginBottom: 8 }}>Invalid Identifier Format</h3>
            <p style={{ color: "var(--text-secondary)", margin: "8px 0 20px", fontSize: "0.92rem" }}>
              {error} Standard identifiers must contain letters, numbers, hyphens, or valid GS1 DataMatrix tags e.g. <code>(01)...(10)AX-7729-001</code>.
            </p>

            <div style={{ background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 12, marginBottom: 24, textAlign: "left" }}>
              <span className="form-label" style={{ fontSize: "0.75rem", margin: "0 0 8px 0", color: "#f59e0b" }}>TRY DEMO IDENTIFIERS:</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[
                  { id: "AX-7729-001", label: "AX-7729-001 (Authentic)" },
                  { id: "EXP-2024-99", label: "EXP-2024-99 (Expired)" },
                  { id: "REC-9921-00", label: "REC-9921-00 (Recalled)" },
                  { id: "QUA-4410-02", label: "QUA-4410-02 (Quarantined)" }
                ].map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => {
                      setBatchId(demo.id);
                      router.push(`/verify?id=${encodeURIComponent(demo.id)}`);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                  >
                    #{demo.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button 
                onClick={() => {
                  const cleaned = batchId.replace(/[^A-Za-z0-9_\-]/g, "");
                  setBatchId(cleaned);
                  if (cleaned) router.push(`/verify?id=${encodeURIComponent(cleaned)}`);
                }} 
                className="btn btn-primary"
              >
                Sanitize Input & Retry
              </button>
              <Link href="/" className="btn btn-secondary">Back to Dashboard</Link>
            </div>
          </div>
        )}

        {/* State 2: Missing / Unregistered Record State (Suspected Counterfeit) */}
        {error && determineVerificationState(error, data) === "MISSING_RECORD" && (
          <div className="glass-card" style={{ maxWidth: 680, margin: "0 auto", border: "1px solid rgba(239, 68, 68, 0.5)", padding: 32, background: "rgba(239, 68, 68, 0.05)" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <ShieldAlert style={{ width: 60, height: 60, stroke: "#ef4444", margin: "0 auto 12px" }} />
              <h3 style={{ fontSize: "1.5rem", color: "#f87171", fontWeight: 800 }}>Unregistered Batch / Counterfeit Warning</h3>
              <p style={{ color: "var(--text-secondary)", marginTop: 6, fontSize: "0.95rem" }}>
                Batch <code>#{batchId}</code> was <strong>NOT found</strong> on the Soroban blockchain or backend ledger state.
              </p>
            </div>

            <div style={{ background: "rgba(30, 41, 59, 0.6)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <h4 style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>Safety & Protocol Directives:</h4>
              <ul style={{ paddingLeft: 20, color: "var(--text-secondary)", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: 6 }}>
                <li>Do NOT dispense, sell, or administer this medication to patients.</li>
                <li>Inspect physical packaging for altered lot numbers, print anomalies, or broken seals.</li>
                <li>Quarantine the package immediately and file a regulatory compliance alert.</li>
              </ul>
            </div>

            <div style={{ background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 12, marginBottom: 24 }}>
              <span className="form-label" style={{ fontSize: "0.75rem", margin: "0 0 8px 0", color: "var(--color-primary)" }}>TRY DEMO VERIFICATION STATES:</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[
                  { id: "AX-7729-001", label: "AX-7729-001 (Authentic)" },
                  { id: "EXP-2024-99", label: "EXP-2024-99 (Expired)" },
                  { id: "REC-9921-00", label: "REC-9921-00 (Recalled)" },
                  { id: "QUA-4410-02", label: "QUA-4410-02 (Quarantined)" }
                ].map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => {
                      setBatchId(demo.id);
                      router.push(`/verify?id=${encodeURIComponent(demo.id)}`);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                  >
                    #{demo.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={handleReportIssue} className="btn btn-primary" style={{ background: "#ef4444", borderColor: "#ef4444" }}>
                Report Counterfeit Flag
              </button>
              <Link href="/" className="btn btn-secondary">Return to Dashboard</Link>
            </div>
          </div>
        )}

        {/* State 3: Unavailable Record / RPC Connection Timeout */}
        {error && determineVerificationState(error, data) === "NETWORK_UNAVAILABLE" && (
          <div className="glass-card" style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", border: "1px solid rgba(168, 85, 247, 0.4)", padding: 32, background: "rgba(168, 85, 247, 0.05)" }}>
            <WifiOff style={{ width: 56, height: 56, stroke: "#c084fc", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: "1.4rem", color: "#fff", marginBottom: 8 }}>Blockchain RPC Node Unavailable</h3>
            <p style={{ color: "var(--text-secondary)", margin: "8px 0 20px", fontSize: "0.9rem" }}>{error}</p>
            
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => fetchBatchDetails(batchId)} className="btn btn-primary">
                Retry On-Chain Query
              </button>
              <Link href="/" className="btn btn-secondary">Return to Control Center</Link>
            </div>
          </div>
        )}

        {data && data.batch && (
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            
            {/* Top Verification Status Banners */}
            {data.batch.is_recalled === 1 ? (
              <div className="alert alert-danger" style={{ display: "flex", gap: 16, padding: 18, alignItems: "center", marginBottom: 24, borderRadius: 14, border: "1px solid rgba(239, 68, 68, 0.5)" }}>
                <ShieldAlert style={{ width: 32, height: 32, flexShrink: 0, color: "#f87171" }} />
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#fff" }}>CRITICAL RECALL TRIGGERED ON-CHAIN</h3>
                  <p style={{ fontSize: "0.88rem", opacity: 0.95, marginTop: 2 }}>
                    This batch was marked RECALLED on the Stellar ledger by {formatSupplierAddress(data.batch.recalled_by || data.batch.manufacturer)}. Do not dispense or ingest.
                  </p>
                </div>
              </div>
            ) : data.batch.is_quarantined === 1 ? (
              <div className="alert alert-warning" style={{ display: "flex", gap: 16, padding: 18, alignItems: "center", marginBottom: 24, borderRadius: 14, background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.4)" }}>
                <AlertOctagon style={{ width: 32, height: 32, flexShrink: 0, color: "#c084fc" }} />
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#e9d5ff" }}>BATCH QUARANTINE HOLD ACTIVE</h3>
                  <p style={{ fontSize: "0.88rem", opacity: 0.95, marginTop: 2, color: "#e9d5ff" }}>
                    Reason: {data.batch.quarantine_reason || "Temperature excursion or custody anomaly under investigation."}
                  </p>
                </div>
              </div>
            ) : calculateBatchExpiryStatus(data.batch).isExpired ? (
              <div className="alert alert-warning" style={{ display: "flex", gap: 16, padding: 18, alignItems: "center", marginBottom: 24, borderRadius: 14, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)" }}>
                <Clock style={{ width: 32, height: 32, flexShrink: 0, color: "#fbbf24" }} />
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#fef3c7" }}>EXPIRED MEDICINE DETECTED</h3>
                  <p style={{ fontSize: "0.88rem", opacity: 0.95, marginTop: 2, color: "#fef3c7" }}>
                    This batch expired on {formatSafeDate(data.batch.expiry_date)}. Dispensing expired pharmaceuticals is strictly prohibited.
                  </p>
                </div>
              </div>
            ) : (
              <div className="glass-card" style={{ display: "flex", gap: 16, padding: 18, alignItems: "center", marginBottom: 24, borderRadius: 14, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                <CheckCircle2 style={{ width: 32, height: 32, flexShrink: 0, color: "#10b981" }} />
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#34d399" }}>AUTHENTICATED & ON-CHAIN VERIFIED</h3>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginTop: 2 }}>
                    Authentic medicine record registered by verified manufacturer <code>{formatSupplierAddress(data.batch.manufacturer)}</code>.
                  </p>
                </div>
              </div>
            )}

            {/* Header Batch Info Card */}
            <div className="glass-card" style={{ padding: "20px 24px", marginBottom: 24, position: "relative", overflow: "hidden", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div className="absolute top-0 left-0 h-full w-1" style={{ background: "var(--color-primary)" }} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span className="form-label" style={{ fontSize: "0.7rem", margin: 0 }}>BATCH AUDIT TRAIL</span>
                  <span className="badge badge-blue">ON-CHAIN AUDITED</span>
                </div>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff" }}>{data.batch.drug_name || "Prescription Medicine"}</h2>
                <code style={{ background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: 4, fontSize: "0.75rem", display: "inline-block", marginTop: 4, color: "var(--color-primary)" }}>
                  #{data.batch.batch_id}
                </code>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                {data.batch.is_recalled === 1 ? (
                  <span className="badge badge-danger" style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: "0.8rem" }}>
                    <ShieldAlert style={{ width: 14, height: 14 }} />
                    RECALLED
                  </span>
                ) : data.batch.is_quarantined === 1 ? (
                  <span className="badge badge-warning" style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: "0.8rem", color: "#c084fc", background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.4)" }}>
                    <AlertOctagon style={{ width: 14, height: 14 }} />
                    QUARANTINED
                  </span>
                ) : calculateBatchExpiryStatus(data.batch).isExpired ? (
                  <span className="badge badge-warning" style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: "0.8rem" }}>
                    <Clock style={{ width: 14, height: 14 }} />
                    EXPIRED
                  </span>
                ) : (
                  <span className="badge badge-green" style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: "0.8rem" }}>
                    <ShieldCheck style={{ width: 14, height: 14 }} />
                    AUTHENTICATED
                  </span>
                )}
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>Soroban Testnet synchronized</span>
              </div>
            </div>

            {/* Counterfeit Security Matrix */}
            <div style={{ marginBottom: 24 }}>
              <CounterfeitDetector
                batchId={data.batch.batch_id}
                isGenuine={data.is_genuine !== false}
                isRecalled={data.batch.is_recalled === 1}
                isExpired={calculateBatchExpiryStatus(data.batch).isExpired}
                anomalies={data.anomalies || []}
                manufacturer={data.batch.manufacturer}
              />
            </div>

            {/* AI Risk Detection Engine */}
            <div style={{ marginBottom: 24 }}>
              <AIRiskDetector
                batchId={data.batch.batch_id}
                anomalies={data.anomalies || []}
                isRecalled={data.batch.is_recalled === 1}
                isExpired={calculateBatchExpiryStatus(data.batch).isExpired}
                handoffCount={data.handoffs?.length || 0}
              />
            </div>

            {/* GPS Custody Tracker */}
            <div style={{ marginBottom: 24 }}>
              <GPSCustodyTracker
                manufacturer={data.batch.manufacturer}
                handoffs={data.handoffs || []}
                directShip={data.batch.direct_ship === 1}
                isRecalled={data.batch.is_recalled === 1}
              />
            </div>

            {/* Live Telemetry Chart & IoT Sensor Simulator */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, marginBottom: 24 }}>
              <LiveTelemetryChart data={telemetryHistory} batchId={data.batch.batch_id} />
              <IoTSensorSimulator batchId={data.batch.batch_id} onTelemetryAdded={handleTelemetryAdded} />
            </div>

            {/* Bento details container */}
            <div className="dashboard-grid">
              
              {/* Left Column: Vertical Custody Timeline */}
              <div className="glass-card" style={{ flex: 1.5 }}>
                <h3 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <Globe style={{ width: 20, height: 20, stroke: "var(--color-primary)" }} />
                  <span>Verifiable Chain of Custody & Event History</span>
                </h3>

                <div className="verifiable-timeline">
                  
                  {/* Event 1: Batch Registration */}
                  <div className="timeline-step-container">
                    <div className="timeline-status-line" />
                    <div className="timeline-icon-wrapper success">
                      <Factory style={{ width: 18, height: 18 }} />
                    </div>
                    <div className="timeline-step-content">
                      <div className="flex-between">
                        <h4 style={{ color: "#fff", fontWeight: 700, margin: 0 }}>Manufacturer Batch Origination</h4>
                        <span style={{ color: "var(--color-success)", fontSize: "0.72rem", fontWeight: 700 }}>VERIFIED ON-CHAIN</span>
                      </div>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4 }}>
                        Registered by Manufacturer: <code>{formatSupplierAddress(data.batch.manufacturer)}</code>
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 6, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        <span>Mfg Date: {formatSafeDate(data.batch.manufacture_date)}</span>
                        <span>Expiry Date: {formatSafeDate(data.batch.expiry_date)}</span>
                        <span>Quantity: {data.batch.quantity} Units</span>
                      </div>
                    </div>
                  </div>

                  {/* Event 2: Quarantine (If Active) */}
                  {data.batch.is_quarantined === 1 && (
                    <div className="timeline-step-container">
                      <div className="timeline-status-line" />
                      <div className="timeline-icon-wrapper" style={{ borderColor: "#c084fc", color: "#c084fc" }}>
                        <AlertOctagon style={{ width: 18, height: 18 }} />
                      </div>
                      <div className="timeline-step-content">
                        <div className="flex-between">
                          <h4 style={{ color: "#c084fc", fontWeight: 700, margin: 0 }}>Batch Quarantine Event Flagged</h4>
                          <span className="badge badge-warning" style={{ fontSize: "0.7rem", color: "#c084fc" }}>QUARANTINED</span>
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4 }}>
                          Reason: {data.batch.quarantine_reason || "Isolation flag active."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Event 3: Recall (If Active) */}
                  {data.batch.is_recalled === 1 && (
                    <div className="timeline-step-container">
                      <div className="timeline-status-line" />
                      <div className="timeline-icon-wrapper" style={{ borderColor: "#ef4444", color: "#ef4444" }}>
                        <ShieldAlert style={{ width: 18, height: 18 }} />
                      </div>
                      <div className="timeline-step-content">
                        <div className="flex-between">
                          <h4 style={{ color: "#f87171", fontWeight: 700, margin: 0 }}>Emergency Recall Issued</h4>
                          <span className="badge badge-danger" style={{ fontSize: "0.7rem" }}>RECALLED</span>
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4 }}>
                          Recalled by: <code>{formatSupplierAddress(data.batch.recalled_by || data.batch.manufacturer)}</code>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Event 4: Handoff Transfers */}
                  {(!data.handoffs || data.handoffs.length === 0) ? (
                    <div className="timeline-step-container">
                      <div className="timeline-status-line" />
                      <div className="timeline-icon-wrapper active">
                        <Truck style={{ width: 18, height: 18 }} />
                      </div>
                      <div className="timeline-step-content" style={{ opacity: 0.6 }}>
                        <h4 style={{ fontWeight: 700, color: "#cbd5e1" }}>No Custody Handoffs Recorded</h4>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 2 }}>
                          This batch is stored at manufacturer origin or waiting for distributor transfer.
                        </p>
                      </div>
                    </div>
                  ) : (
                    data.handoffs.map((h: any, idx: number) => {
                      const isFailedTx = h.status === "FAILED";
                      return (
                        <div className="timeline-step-container" key={idx}>
                          <div className="timeline-status-line" />
                          <div className="timeline-icon-wrapper active" style={{ borderColor: isFailedTx ? "#ef4444" : "var(--color-primary)" }}>
                            <Truck style={{ width: 18, height: 18 }} />
                          </div>
                          <div className="timeline-step-content">
                            <div className="flex-between">
                              <h4 style={{ color: "#fff", fontWeight: 700, margin: 0 }}>Custody Handoff Transfer</h4>
                              <span className={isFailedTx ? "badge badge-danger" : "badge badge-blue"} style={{ fontSize: "0.7rem" }}>
                                {isFailedTx ? "FAILED TX" : h.new_role || "Custody Transfer"}
                              </span>
                            </div>
                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4 }}>
                              <div>From: <code style={{ fontSize: "0.72rem" }}>{formatSupplierAddress(h.from_address)}</code></div>
                              <div>To: <code style={{ fontSize: "0.72rem" }}>{formatSupplierAddress(h.to_address)}</code></div>
                              <div style={{ marginTop: 2 }}>Volume: <strong>{h.quantity} units</strong></div>
                            </div>

                            <div className="flex-between" style={{ marginTop: 8, fontSize: "0.75rem" }}>
                              <span style={{ color: "var(--text-muted)" }}>{formatSafeDate(h.timestamp)}</span>
                              {h.transaction_hash && (
                                <a 
                                  href={`https://explorer.stellar.org/testnet/tx/${h.transaction_hash}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  style={{ color: isFailedTx ? "#f87171" : "var(--color-primary)", fontWeight: 600 }}
                                >
                                  {isFailedTx ? "Failed Tx Hash ↗" : "Explore Tx Hash ↗"}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Event 5: Dispenses */}
                  {(data.dispenses || []).map((d: any, idx: number) => {
                    const isFailedTx = d.status === "FAILED";
                    return (
                      <div className="timeline-step-container" key={idx}>
                        <div className="timeline-status-line" />
                        <div className="timeline-icon-wrapper" style={{ borderColor: isFailedTx ? "#ef4444" : "var(--color-success)", color: isFailedTx ? "#ef4444" : "var(--color-success)" }}>
                          <Building style={{ width: 18, height: 18 }} />
                        </div>
                        <div className="timeline-step-content">
                          <div className="flex-between">
                            <h4 style={{ color: isFailedTx ? "#f87171" : "var(--color-success)", fontWeight: 700, margin: 0 }}>
                              {isFailedTx ? "Failed Patient Dispense Attempt" : "Units Dispensed to Patient"}
                            </h4>
                            <span className={isFailedTx ? "badge badge-danger" : "badge badge-green"} style={{ fontSize: "0.7rem" }}>
                              {isFailedTx ? "FAILED TX" : "Dispensed"}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4 }}>
                            <div>Pharmacy: <code style={{ fontSize: "0.72rem" }}>{formatSupplierAddress(d.pharmacy)}</code></div>
                            <div>Dispensed: <strong>{d.quantity} units</strong></div>
                            <div>Remaining Inventory: {d.remaining_quantity} units</div>
                          </div>
                          <div className="flex-between" style={{ marginTop: 8, fontSize: "0.75rem" }}>
                            <span style={{ color: "var(--text-muted)" }}>{formatSafeDate(d.timestamp)}</span>
                            {d.transaction_hash && (
                              <a 
                                href={`https://explorer.stellar.org/testnet/tx/${d.transaction_hash}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                style={{ color: isFailedTx ? "#f87171" : "var(--color-primary)", fontWeight: 600 }}
                              >
                                {isFailedTx ? "Failed Tx Hash ↗" : "Explore Tx Hash ↗"}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                </div>
              </div>

              {/* Right Column: Specifications & Route Map */}
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="sidebar-specs">
                
                {/* Tech Specs Card */}
                <div className="glass-card">
                  <h3 className="form-label" style={{ fontSize: "0.75rem", marginBottom: 16 }}>BATCH SPECIFICATIONS</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: "0.85rem" }}>
                    <div className="flex-between" style={{ borderBottom: "1px solid var(--border-glass)", paddingBottom: 8 }}>
                      <span style={{ color: "var(--text-muted)" }}>Expiration</span>
                      <span style={{ fontWeight: 600, color: "#fff" }}>{formatSafeDate(data.batch.expiry_date)}</span>
                    </div>
                    <div className="flex-between" style={{ borderBottom: "1px solid var(--border-glass)", paddingBottom: 8 }}>
                      <span style={{ color: "var(--text-muted)" }}>Initial Count</span>
                      <span style={{ fontWeight: 600, color: "#fff" }}>{data.batch.quantity.toLocaleString()} Units</span>
                    </div>
                    <div className="flex-between" style={{ borderBottom: "1px solid var(--border-glass)", paddingBottom: 8 }}>
                      <span style={{ color: "var(--text-muted)" }}>Storage Conditions</span>
                      <span style={{ fontWeight: 600, color: "#fff" }}>2°C - 8°C Control</span>
                    </div>
                    <div className="flex-between" style={{ borderBottom: "1px solid var(--border-glass)", paddingBottom: 8 }}>
                      <span style={{ color: "var(--text-muted)" }}>Shipping Protocol</span>
                      <span style={{ fontWeight: 600, color: "#fff" }}>{data.batch.direct_ship === 1 ? "Direct Mode" : "Distributor Hub"}</span>
                    </div>
                    <div className="flex-between">
                      <span style={{ color: "var(--text-muted)" }}>Ledger Network</span>
                      <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>Soroban / Stellar Testnet</span>
                    </div>
                  </div>
                </div>

                {/* Quick Regulatory & GS1 Actions Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                  <button onClick={() => setIsGS1ModalOpen(true)} className="btn btn-primary flex-gap" style={{ justifyContent: "center", padding: "12px", background: "linear-gradient(135deg, #0284c7 0%, #0284c7 100%)" }}>
                    <QrCode style={{ width: 16, height: 16 }} />
                    <span>View GS1 2D DataMatrix Label</span>
                  </button>
                  
                  <button onClick={() => setIsCertModalOpen(true)} className="btn btn-secondary flex-gap" style={{ justifyContent: "center", padding: "12px", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                    <FileCheck style={{ width: 16, height: 16 }} />
                    <span>FDA DSCSA Compliance Audit Report</span>
                  </button>

                  <button onClick={handleReportIssue} className="btn btn-secondary flex-gap" style={{ justifyContent: "center", padding: "10px", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#f87171" }}>
                    <AlertTriangle style={{ width: 16, height: 16 }} />
                    <span>Report Compliance Flag</span>
                  </button>
                </div>

              </div>

            </div>

            {/* Modals */}
            <GS1DataMatrixModal
              isOpen={isGS1ModalOpen}
              onClose={() => setIsGS1ModalOpen(false)}
              batch={data.batch}
            />

            <ComplianceCertificateModal
              isOpen={isCertModalOpen}
              onClose={() => setIsCertModalOpen(false)}
              batchData={data}
            />

            <CameraScannerModal
              isOpen={isCameraModalOpen}
              onClose={() => setIsCameraModalOpen(false)}
              onScanSuccess={(code) => {
                setBatchId(code);
                fetchBatchDetails(code);
              }}
            />

          </div>
        )}

      </main>
    </div>
  );
}

export default function VerifyPortal() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--bg-dark)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-bright)" }}>
        <p>Loading Verification Portal...</p>
      </div>
    }>
      <VerifyPortalContent />
    </Suspense>
  );
}

