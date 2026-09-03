import { describe, expect, it } from 'vitest';
import { Account } from '../types';
import { ACCOUNT_LIMITS, canAddAccount, canDeleteAccount, validateAddAccount, validateDeleteAccount } from './accountRules';

const acc = (id: string): Account => ({
  id,
  kind: 'checking',
  label: id,
  initialBalance: 0,
  initialDate: '2026-01-01',
  isConfigured: true,
});

describe('accountRules', () => {
  it('allows adding when below the max', () => {
    expect(canAddAccount([acc('a'), acc('b')])).toBe(true);
  });

  it('blocks adding a 5th account', () => {
    const accounts = [acc('a'), acc('b'), acc('c'), acc('d')];
    expect(canAddAccount(accounts)).toBe(false);
    expect(validateAddAccount(accounts)).toEqual({ valid: false, reason: expect.stringContaining('4') });
  });

  it('blocks deleting below the minimum', () => {
    const accounts = [acc('main_account'), acc('prepaid_card')];
    expect(canDeleteAccount(accounts)).toBe(false);
    expect(validateDeleteAccount(accounts, 'main_account')).toEqual({ valid: false, reason: expect.stringContaining('2') });
  });

  it('allows deleting above the minimum', () => {
    const accounts = [acc('a'), acc('b'), acc('c')];
    expect(canDeleteAccount(accounts)).toBe(true);
    expect(validateDeleteAccount(accounts, 'c')).toEqual({ valid: true });
  });

  it('rejects deleting an unknown account id', () => {
    const accounts = [acc('a'), acc('b'), acc('c')];
    expect(validateDeleteAccount(accounts, 'nope').valid).toBe(false);
  });

  it('exposes the limits used by the UI', () => {
    expect(ACCOUNT_LIMITS.MIN_ACCOUNTS).toBe(2);
    expect(ACCOUNT_LIMITS.MAX_ACCOUNTS).toBe(4);
  });
});
