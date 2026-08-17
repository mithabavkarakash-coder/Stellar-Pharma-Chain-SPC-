import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "../context/WalletContext";
import { ErrorBoundary } from "../components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Stellar Pharma Chain (SPC) | On-Chain Pharmaceutical Verification",
  description: "Enterprise-grade, trustless pharmaceutical supply chain tracking and cryptographic verification platform built on Stellar and Soroban.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <WalletProvider>
            {children}
          </WalletProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

