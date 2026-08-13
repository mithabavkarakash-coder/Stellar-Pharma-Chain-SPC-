import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "../context/WalletContext";

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
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
