"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import { useWallet } from "../../context/WalletContext";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Flashlight, Keyboard, RefreshCw, XCircle } from "lucide-react";

export default function ScanPortal() {
  const wallet = useWallet();
  const router = useRouter();
  
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [manualInputActive, setManualInputActive] = useState(false);
  const [manualId, setManualId] = useState("");
  const [scannerActive, _setScannerActive] = useState(true);
  const [statusMessage, setStatusMessage] = useState("CAMERA_ACTIVE_WAITING_FOR_MARKER");

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Start QR scanner in viewfinder container
    let scanner: Html5QrcodeScanner;
    
    const startScanner = () => {
      try {
        scanner = new Html5QrcodeScanner(
          "camera-feed-element",
          { fps: 15, qrbox: { width: 220, height: 220 } },
          /* verbose= */ false
        );
        scannerRef.current = scanner;
        
        scanner.render(
          (decodedText) => {
            console.log("Scan success:", decodedText);
            setStatusMessage("MARKER_DETECTED_SYNCING_LEDGER");
            
            // Clean up scanner
            scanner.clear().catch(console.error);
            scannerRef.current = null;
            
            // Extract ID if URL
            let extractedId = decodedText;
            try {
              if (decodedText.startsWith("http://") || decodedText.startsWith("https://")) {
                const url = new URL(decodedText);
                extractedId = url.searchParams.get("id") || decodedText;
              }
            } catch {
              // Not a URL
            }

            // Redirect
            setTimeout(() => {
              router.push(`/verify?id=${encodeURIComponent(extractedId)}`);
            }, 800);
          },
          (_error) => {
            // Keep searching silently
          }
        );
      } catch (err) {
        console.warn("Could not access camera feed. Displaying preview simulator.", err);
        setStatusMessage("CAMERA_PERMISSIONS_BLOCKED_SIMULATOR_ACTIVE");
      }
    };

    if (scannerActive) {
      setTimeout(startScanner, 400);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [scannerActive, router]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualId.trim()) {
      router.push(`/verify?id=${encodeURIComponent(manualId.trim())}`);
    }
  };

  const toggleFlashlight = () => {
    setFlashlightOn(prev => !prev);
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

      <main className="main-content-offset" style={{ padding: "80px 20px 96px", background: "#000", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        
        {/* Viewfinder box container */}
        <div style={{ position: "relative", width: "100%", maxWidth: "320px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          
          <div className="scanner-viewport">
            {/* Viewfinder corner brackets */}
            <div className="scanner-corner top-left" />
            <div className="scanner-corner top-right" />
            <div className="scanner-corner bottom-left" />
            <div className="scanner-corner bottom-right" />
            
            {/* Pulsing red reticle */}
            <div className="scanner-laser-line" />
            
            {/* HTML5 Qr Code Camera target */}
            <div id="camera-feed-element" style={{ width: "100%", height: "100%", zIndex: 5, overflow: "hidden" }}></div>
            
            {/* Simulated background package image in case camera fails / doesn't load */}
            <div 
              className={`scanner-camera-bg ${flashlightOn ? "flashlight-on" : ""}`}
              style={{ 
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDndB_33CUiH_lTPy802G7s73yBbrulkQzHQkb6f-3SzFaAcYoD6gSscQ7YwTc6ljpqYWfba0kcJ8oNn-QZ0Pbf4OWhg7dEFg0aKwFSw9tThuYXp0bDtkuNoFyeGbiEZ3psIbDP6I3fRsrOoc1JLUJeVHTo0Ml9NUJfCUOXH_M-g6gK7MjOBFs0LkZonrbZVV8mj3fzUzqY331cqtmCm__iz7q-PFbUn0lcGR26Hj0miqlx3tuJf5Mh-bs_dCdglX56oqGRLbilTxg')`,
                zIndex: 1
              }}
            />
          </div>

          {/* Context Card Instructions */}
          <div className="glass-card" style={{ marginTop: 24, textAlign: "center", width: "100%", padding: "16px 20px" }}>
            <h3 style={{ fontSize: "1.1rem", color: "#fff", marginBottom: 6 }}>Align Package Code</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
              Position the 2D Data Matrix or QR code within the highlighted guidelines to begin verification.
            </p>
          </div>

          {/* Controller buttons */}
          <div style={{ display: "flex", gap: 32, marginTop: 24 }}>
            <button onClick={toggleFlashlight} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: flashlightOn ? "var(--color-primary)" : "var(--text-muted)" }}>
              <div style={{ width: 50, height: 50, borderRadius: "50%", background: "var(--bg-tertiary)", border: "1px solid var(--border-glass)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Flashlight style={{ width: 20, height: 20 }} />
              </div>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>Flashlight</span>
            </button>
            <button onClick={() => setManualInputActive(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
              <div style={{ width: 50, height: 50, borderRadius: "50%", background: "var(--bg-tertiary)", border: "1px solid var(--border-glass)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Keyboard style={{ width: 20, height: 20 }} />
              </div>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>Manual ID</span>
            </button>
          </div>

        </div>

        {/* Live Status indicator */}
        <div style={{ position: "fixed", bottom: "96px", left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div className="glass-card" style={{ padding: "6px 12px", background: "rgba(10, 14, 26, 0.8)", display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border-glass)" }}>
            <RefreshCw className="status-pulse" style={{ width: 12, height: 12, stroke: "var(--color-primary)" }} />
            <code style={{ fontSize: "0.7rem", color: "#fff", fontFamily: "monospace" }}>SYS_STATUS: {statusMessage}</code>
          </div>
        </div>

        {/* Manual Input Dialog Modal overlay */}
        {manualInputActive && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
            <div className="glass-card" style={{ width: "100%", maxWidth: "400px", padding: 24 }}>
              <div className="flex-between" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: "1.2rem", color: "#fff" }}>Enter Tracking ID</h3>
                <button onClick={() => setManualInputActive(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                  <XCircle style={{ width: 20, height: 20 }} />
                </button>
              </div>
              <form onSubmit={handleManualSubmit}>
                <label className="form-label">Batch Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. AX-7729-001"
                  className="form-control"
                  style={{ marginBottom: 20 }}
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  required
                  autoFocus
                />
                <div style={{ display: "flex", gap: 12 }}>
                  <button type="button" onClick={() => setManualInputActive(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    Verify ID
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
