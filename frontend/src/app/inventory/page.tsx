"use client";

import Navbar from "../../components/Navbar";
import ProtectedRoute from "../../components/ProtectedRoute";
import InventoryManager from "../../components/InventoryManager";
import { useWallet } from "../../context/WalletContext";

export default function InventoryPage() {
    const wallet = useWallet();

    return (
        <ProtectedRoute allowedRoles={["Manufacturer", "Supplier", "Distributor", "Pharmacy", "Admin", "Customer"]}>
            <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
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

                <main className="main-content-offset" style={{ padding: "96px 20px 64px" }}>
                    <InventoryManager userRole={wallet.role} />
                </main>
            </div>
        </ProtectedRoute>
    );
}
