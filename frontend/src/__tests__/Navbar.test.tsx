import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Navbar from '../components/Navbar';

describe('Navbar Component', () => {
  const mockProps = {
    connected: false,
    address: null,
    balance: null,
    role: "Manufacturer" as const,
    loading: false,
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    onRoleChange: vi.fn(),
  };

  it('renders brand title correctly', () => {
    render(<Navbar {...mockProps} />);
    expect(screen.getByText('Stellar Pharma Chain')).toBeInTheDocument();
  });

  it('shows Connect Wallet button when not connected', () => {
    render(<Navbar {...mockProps} />);
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  it('opens wallet selection modal when Connect Wallet is clicked', () => {
    render(<Navbar {...mockProps} />);
    const button = screen.getByText('Connect Wallet');
    fireEvent.click(button);
    expect(screen.getByText('Choose Stellar Wallet')).toBeInTheDocument();
  });

  it('displays truncated address and balance when connected', () => {
    const connectedProps = {
      ...mockProps,
      connected: true,
      address: "GBRP7564M63BFEJCD3LPP4Q2Y3HCHZDFK5J42F6Z6",
      balance: "150.5",
    };
    render(<Navbar {...connectedProps} />);
    expect(screen.getByText('GBRP75...F6Z6')).toBeInTheDocument();
    expect(screen.getByText('150.5 XLM')).toBeInTheDocument();
  });
});
