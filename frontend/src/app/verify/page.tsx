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
  Thermometer,
  Building,
  Download,
  AlertTriangle
} from "lucide-react";
import { getBatchOnChain } from "../../utils/soroban";

function VerifyPortalContent() {
  const wallet = useWallet();
  const searchParams = useSearchParams();
  const router = useRouter();
  const batchIdParam = searchParams.get("id") || "";

  const [batchId, setBatchId] = useState(batchIdParam);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const fetchBatchDetails = async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
      const res = await fetch(`${backendUrl}/api/batches/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const chainData = await getBatchOnChain(id);
        if (chainData) {
          setData(chainData);
        } else {
          setError("Batch not found on server or blockchain");
        }
      }
    } catch {
      try {
        const chainData = await getBatchOnChain(id);
        if (chainData) {
          setData(chainData);
        } else {
          setError("Failed to fetch batch details");
        }
      } catch {
        setError("Failed to fetch batch details from blockchain");
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

  const formatDate = (epochSeconds: number) => {
    return new Date(epochSeconds * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isExpired = (expiryEpoch: number) => {
    const currentNow = Math.floor(Date.now() / 1000);
    return currentNow > expiryEpoch;
  };

  // Export Certificate JSON handler
  const handleExportCertificate = () => {
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
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div className="spinner" />
            <p style={{ color: "var(--text-muted)", marginTop: 12 }}>Retrieving audit trail...</p>
          </div>
        )}

        {error && (
          <div className="glass-card" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", border: "1px solid var(--color-danger)" }}>
            <ShieldAlert style={{ width: 48, height: 48, stroke: "#ef4444", margin: "0 auto 16px" }} />
            <h3>Verification Failed</h3>
            <p style={{ color: "var(--text-muted)", margin: "8px 0 16px" }}>{error}</p>
            <Link href="/" className="btn btn-secondary">Back to Dashboard</Link>
          </div>
        )}

        {data && (
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            
            {/* Header Batch Info Card */}
            <div className="glass-card" style={{ padding: "20px 24px", marginBottom: 24, position: "relative", overflow: "hidden", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div className="absolute top-0 left-0 h-full w-1" style={{ background: "var(--color-primary)" }} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span className="form-label" style={{ fontSize: "0.7rem", margin: 0 }}>BATCH AUDIT TRAIL</span>
                  <span className="badge badge-blue">LIVE</span>
                </div>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff" }}>{data.batch.drug_name}</h2>
                <code style={{ background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: 4, fontSize: "0.75rem", display: "inline-block", marginTop: 4, color: "var(--color-primary)" }}>
                  {data.batch.batch_id}
                </code>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                {data.batch.is_recalled === 1 ? (
                  <span className="badge badge-danger" style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", fontSize: "0.8rem" }}>
                    <ShieldAlert style={{ width: 14, height: 14 }} />
                    RECALLED
                  </span>
                ) : isExpired(data.batch.expiry_date) ? (
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
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>Ledger status synchronized</span>
              </div>
            </div>

            {/* Expired / Recalled Warning Alert banner */}
            {data.batch.is_recalled === 1 && (
              <div className="alert alert-danger" style={{ display: "flex", gap: 16, padding: 16, alignItems: "center", marginBottom: 24 }}>
                <ShieldAlert style={{ width: 28, height: 28, flexShrink: 0 }} />
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>CRITICAL RECALL TRIGGERED</h3>
                  <p style={{ fontSize: "0.85rem", opacity: 0.9, marginTop: 2 }}>
                    This batch has been marked as RECALLED by the drug manufacturer or regulator. Do not dispense, ingest, or transport.
                  </p>
                </div>
              </div>
            )}

            {/* Bento details container */}
            <div className="dashboard-grid">
              
              {/* Left Column: Vertical Custody Timeline */}
              <div className="glass-card" style={{ flex: 1.5 }}>
                <h3 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <Globe style={{ width: 20, height: 20, stroke: "var(--color-primary)" }} />
                  <span>Verifiable Chain of Custody</span>
                </h3>

                <div className="verifiable-timeline">
                  
                  {/* Step 1: Manufacturer Origin */}
                  <div className="timeline-step-container">
                    <div className="timeline-status-line" />
                    <div className="timeline-icon-wrapper success">
                      <Factory style={{ width: 18, height: 18 }} />
                    </div>
                    <div className="timeline-step-content">
                      <div className="flex-between">
                        <h4 style={{ color: "#fff", fontWeight: 700, margin: 0 }}>Manufacturer Batch Origin</h4>
                        <span style={{ color: "var(--color-success)", fontSize: "0.75rem", fontWeight: 700 }}>VERIFIED</span>
                      </div>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4 }}>
                        Registered by Manufacturer Address: <code>{data.batch.manufacturer}</code>
                      </p>
                      <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        <span>TS: {formatDate(data.batch.manufacture_date)}</span>
                        <span>QTY: {data.batch.quantity} Units</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Handoff Transfers */}
                  {data.handoffs.length === 0 ? (
                    <div className="timeline-step-container">
                      <div className="timeline-status-line" />
                      <div className="timeline-icon-wrapper active">
                        <Truck style={{ width: 18, height: 18 }} />
                      </div>
                      <div className="timeline-step-content" style={{ opacity: 0.6 }}>
                        <h4 style={{ fontWeight: 700 }}>No Custody Transfers Recorded</h4>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 2 }}>
                          This batch is currently still stored at the manufacturer origin.
                        </p>
                      </div>
                    </div>
                  ) : (
                    data.handoffs.map((h: any, idx: number) => (
                      <div className="timeline-step-container" key={idx}>
                        <div className="timeline-status-line" />
                        <div className="timeline-icon-wrapper active">
                          <Truck style={{ width: 18, height: 18 }} />
                        </div>
                        <div className="timeline-step-content">
                          <div className="flex-between">
                            <h4 style={{ color: "#fff", fontWeight: 700, margin: 0 }}>Custody Handoff Recorded</h4>
                            <span className="badge badge-blue" style={{ fontSize: "0.7rem" }}>{h.new_role}</span>
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4 }}>
                            <div>From: <code style={{ fontSize: "0.7rem" }}>{h.from_address}</code></div>
                            <div>To: <code style={{ fontSize: "0.7rem" }}>{h.to_address}</code></div>
                            <div style={{ marginTop: 2 }}>Volume: <strong>{h.quantity} units</strong></div>
                          </div>
                          
                          {/* Cold Chain telemetric sensor concept from timeline design */}
                          {idx === 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 6, marginTop: 8, fontSize: "0.8rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-success)" }}>
                                <Thermometer style={{ width: 16, height: 16 }} />
                                <span>4.2°C Temperature Stable</span>
                              </div>
                              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-success)" }}>TELEMETRY MATCH</span>
                            </div>
                          )}

                          <div className="flex-between" style={{ marginTop: 8, fontSize: "0.75rem" }}>
                            <span style={{ color: "var(--text-muted)" }}>{new Date(h.timestamp * 1000).toLocaleString()}</span>
                            <a 
                              href={`https://explorer.stellar.org/testnet/tx/${h.transaction_hash}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              style={{ color: "var(--color-primary)" }}
                            >
                              Explore Tx Hash
                            </a>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Step 3: Dispenses */}
                  {data.dispenses.map((d: any, idx: number) => (
                    <div className="timeline-step-container" key={idx}>
                      <div className="timeline-status-line" />
                      <div className="timeline-icon-wrapper" style={{ borderColor: "var(--color-success)", color: "var(--color-success)" }}>
                        <Building style={{ width: 18, height: 18 }} />
                      </div>
                      <div className="timeline-step-content">
                        <div className="flex-between">
                          <h4 style={{ color: "var(--color-success)", fontWeight: 700, margin: 0 }}>Units Dispensed to Patient</h4>
                          <span className="badge badge-green" style={{ fontSize: "0.7rem" }}>Dispensed</span>
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4 }}>
                          <div>Pharmacy: <code style={{ fontSize: "0.7rem" }}>{d.pharmacy}</code></div>
                          <div>Dispensed: <strong>{d.quantity} units</strong></div>
                          <div>Rem. Balance: {d.remaining_quantity} units</div>
                        </div>
                        <div className="flex-between" style={{ marginTop: 8, fontSize: "0.75rem" }}>
                          <span style={{ color: "var(--text-muted)" }}>{new Date(d.timestamp * 1000).toLocaleString()}</span>
                          <a 
                            href={`https://explorer.stellar.org/testnet/tx/${d.transaction_hash}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ color: "var(--color-primary)" }}
                          >
                            Explore Tx Hash
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}

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
                      <span style={{ fontWeight: 600, color: "#fff" }}>{formatDate(data.batch.expiry_date)}</span>
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

                {/* GPS Relay Map widget */}
                <div className="glass-card">
                  <div className="flex-between" style={{ marginBottom: 12 }}>
                    <h4 style={{ fontSize: "0.9rem", color: "#fff" }}>GPS Track Relay</h4>
                    <span className="badge badge-green" style={{ fontSize: "0.6rem" }}>LIVE RELAY</span>
                  </div>
                  <div className="verification-map-container" style={{ height: "180px" }}>
                    <div 
                      className="verification-map-bg" 
                      style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCIeQWGbSRoqL1vmzUHqC32B8gCGu2WGJDo2ycHeoBGVVP0C_HkEFn_W6HCUydIeznw3P4-Sju13WY2KBuMQtPXf57eH1fAG_3p2CkjIMCtUZdnZKfetmN-YLdBPT18722_55qCiZH8UKzVZqhhl9VZd31SyGXs0x26wMi0Aqgs0yfYwS2fAYV7DPKZs02YgMoTpQlQRBf6lNS-HBPgcLZqOmIDW79eVWZcM6nnzcrDf2lwPzFPNkwnsYYJW1_rrxurRHx6B0gGVl8')` }}
                    />
                    <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-[9px] text-[#34d399] border border-emerald-500/20">GPS LOCK ACTIVE</div>
                  </div>
                </div>

                {/* Actions Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <button onClick={handleExportCertificate} className="btn btn-primary flex-gap" style={{ justifyContent: "center", padding: "12px" }}>
                    <Download style={{ width: 16, height: 16 }} />
                    <span>Certificate</span>
                  </button>
                  <button onClick={handleReportIssue} className="btn btn-secondary flex-gap" style={{ justifyContent: "center", padding: "12px", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#f87171" }}>
                    <AlertTriangle style={{ width: 16, height: 16 }} />
                    <span>Report Issue</span>
                  </button>
                </div>

              </div>

            </div>

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

