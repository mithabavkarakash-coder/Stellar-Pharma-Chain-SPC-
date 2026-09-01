import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DashboardHeader from '../components/DashboardHeader';

describe('DashboardHeader Component', () => {
  const mockProps = {
    connected: false,
    address: null,
    balance: null,
    role: "Manufacturer" as const,
    loading: false,
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    onRoleChange: vi.fn(),
    onRefresh: vi.fn(),
  };

  it('renders Stellar Pharma Chain branding', () => {
    render(<DashboardHeader {...mockProps} />);
    expect(screen.getByText('Stellar Pharma Chain')).toBeInTheDocument();
  });

  it('renders page title "Pharmaceutical Supply Chain Dashboard"', () => {
    render(<DashboardHeader {...mockProps} />);
    expect(screen.getByText('Pharmaceutical Supply Chain Dashboard')).toBeInTheDocument();
  });

  it('renders subtitle explaining medicines, batches, verification and supply-chain activity', () => {
    render(<DashboardHeader {...mockProps} />);
    expect(
      screen.getByText(/Monitors medicines, medicine batches, cryptographic verification/i)
    ).toBeInTheDocument();
  });

  it('renders last updated indicator and refresh button', () => {
    render(<DashboardHeader {...mockProps} />);
    expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
    const syncBtn = screen.getByTitle('Refresh Dashboard Data');
    expect(syncBtn).toBeInTheDocument();
    fireEvent.click(syncBtn);
    expect(mockProps.onRefresh).toHaveBeenCalled();
  });

  it('displays user profile, role selector and logout button when connected', () => {
    const connectedProps = {
      ...mockProps,
      connected: true,
      address: "GBRP7564M63BFEJCD3LPP4Q2Y3HCHZDFK5J42F6Z6",
      balance: "1250.0",
    };
    render(<DashboardHeader {...connectedProps} />);
    expect(screen.getByText('GBRP75...F6Z6')).toBeInTheDocument();
    expect(screen.getByText('1250.0 XLM')).toBeInTheDocument();
    
    const logoutBtn = screen.getByTitle('Logout / Disconnect Account');
    expect(logoutBtn).toBeInTheDocument();
    fireEvent.click(logoutBtn);
    expect(mockProps.onDisconnect).toHaveBeenCalled();
  });

  it('shows Connect Wallet button when disconnected', () => {
    render(<DashboardHeader {...mockProps} />);
    const connectBtn = screen.getByText('Connect Wallet');
    expect(connectBtn).toBeInTheDocument();
    fireEvent.click(connectBtn);
    expect(mockProps.onConnect).toHaveBeenCalledWith('freighter');
  });

  it('renders invigilator quick demo suite ribbon and opens audit diagnostic', () => {
    render(<DashboardHeader {...mockProps} />);
    expect(screen.getByText(/Invigilator Quick Demo Suite:/i)).toBeInTheDocument();
    
    const runAuditBtn = screen.getByText('Run On-Chain System Audit');
    expect(runAuditBtn).toBeInTheDocument();
    fireEvent.click(runAuditBtn);
    expect(screen.getByText('System Diagnostic Audit')).toBeInTheDocument();
  });
});
