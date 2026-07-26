import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "../context/WalletContext";

export const metadata: Metadata = {
  title: "MedChain | On-Chain Pharma Supply Chain Verification",
  description: "End-to-end drug batch traceability and authenticity verification platform built on Stellar and Soroban.",
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
