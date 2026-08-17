"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught error]:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: "40px 20px", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
          <div className="glass-card" style={{ maxWidth: "500px", textAlign: "center", borderColor: "rgba(239, 68, 68, 0.4)" }}>
            <div style={{ background: "rgba(239, 68, 68, 0.1)", width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <AlertTriangle style={{ width: 28, height: 28, stroke: "#ef4444" }} />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", marginBottom: 8 }}>
              Something went wrong
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 20 }}>
              {this.state.error?.message || "An unexpected error occurred while rendering this interface."}
            </p>
            <button
              onClick={this.handleReset}
              className="btn btn-primary"
              style={{ margin: "0 auto", gap: 8 }}
            >
              <RefreshCw style={{ width: 16, height: 16 }} />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
