import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InventoryManager from '../components/InventoryManager';
import { Batch } from '../types/pharma';

// Mock Next.js Link & Wallet Context
vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('../context/WalletContext', () => ({
    useWallet: () => ({
        connected: true,
        address: 'GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663',
        balance: '100.0',
        role: 'Manufacturer',
        loading: false,
        connect: vi.fn(),
        disconnect: vi.fn(),
        setRole: vi.fn(),
    }),
}));

describe('InventoryManager Component', () => {
    const mockBatches: Batch[] = [
        {
            batch_id: 'TEST-BATCH-001',
            drug_name: 'Paracetamol 500mg',
            manufacturer: 'GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663',
            quantity: 2000,
            manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 10,
            expiry_date: Math.floor(Date.now() / 1000) + 86400 * 300,
            direct_ship: false,
            is_recalled: false,
            is_quarantined: false,
        },
        {
            batch_id: 'LOW-STOCK-002',
            drug_name: 'Ibuprofen 200mg',
            manufacturer: 'GBRPNCLU7UIUKH44ZTZJSAXN7RKODHQ24NMLHGVLFBMVGGIZ2LNN6663',
            quantity: 150, // Low stock < 500
            manufacture_date: Math.floor(Date.now() / 1000) - 86400 * 20,
            expiry_date: Math.floor(Date.now() / 1000) + 86400 * 200,
            direct_ship: true,
            is_recalled: false,
            is_quarantined: false,
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock global fetch to return sample batches
        global.fetch = vi.fn().mockImplementation((url: string) => {
            if (url.endsWith('/api/batches')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBatches),
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ handoffs: [], dispenses: [] }),
            });
        }) as any;
    });

    it('renders inventory header title and summary metrics', async () => {
        render(<InventoryManager userRole="Manufacturer" initialBatches={mockBatches} />);
        expect(screen.getByText('Medicine Inventory Management')).toBeInTheDocument();
        expect(screen.getByText('Total Medicine Batches')).toBeInTheDocument();
        expect(screen.getByText('Total Available Units')).toBeInTheDocument();
    });

    it('renders medicine items in table view', async () => {
        render(<InventoryManager userRole="Manufacturer" initialBatches={mockBatches} />);
        expect(await screen.findByText('Paracetamol 500mg')).toBeInTheDocument();
        expect(screen.getByText('Ibuprofen 200mg')).toBeInTheDocument();
        expect(screen.getByText('#TEST-BATCH-001')).toBeInTheDocument();
    });

    it('filters inventory by search query', async () => {
        render(<InventoryManager userRole="Manufacturer" initialBatches={mockBatches} />);
        const searchInput = screen.getByPlaceholderText(/Search by drug name/i);
        
        fireEvent.change(searchInput, { target: { value: 'Paracetamol' } });
        
        expect(await screen.findByText('Paracetamol 500mg')).toBeInTheDocument();
        expect(screen.queryByText('Ibuprofen 200mg')).not.toBeInTheDocument();
    });

    it('shows Register Medicine button for Manufacturer and opens register modal', async () => {
        render(<InventoryManager userRole="Manufacturer" initialBatches={mockBatches} />);
        const regButton = screen.getByRole('button', { name: /Register Medicine/i });
        expect(regButton).toBeInTheDocument();

        fireEvent.click(regButton);
        expect(screen.getByText('Register New Medicine Batch')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('e.g. AX-7729-001')).toBeInTheDocument();
    });

    it('hides Register Medicine button for Customer role', () => {
        render(<InventoryManager userRole="Customer" initialBatches={mockBatches} />);
        expect(screen.queryByRole('button', { name: /Register Medicine/i })).not.toBeInTheDocument();
    });
});
