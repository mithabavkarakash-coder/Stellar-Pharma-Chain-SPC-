import { describe, it, expect } from 'vitest';
import { getRegistryContractId, getCustodyContractId } from '../utils/soroban';

describe('Soroban Utility Functions', () => {
  it('returns valid default registry contract ID', () => {
    const contractId = getRegistryContractId();
    expect(contractId).toBeDefined();
    expect(contractId.length).toBeGreaterThan(10);
  });

  it('returns valid default custody contract ID', () => {
    const contractId = getCustodyContractId();
    expect(contractId).toBeDefined();
    expect(contractId.length).toBeGreaterThan(10);
  });
});
