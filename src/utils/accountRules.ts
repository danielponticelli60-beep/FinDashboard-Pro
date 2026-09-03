import { Account } from '../types';

export const ACCOUNT_LIMITS = {
  MIN_ACCOUNTS: 2,
  MAX_ACCOUNTS: 4,
} as const;

export const canAddAccount = (accounts: Account[]): boolean =>
  accounts.length < ACCOUNT_LIMITS.MAX_ACCOUNTS;

export const canDeleteAccount = (accounts: Account[]): boolean =>
  accounts.length > ACCOUNT_LIMITS.MIN_ACCOUNTS;

export interface AccountValidationResult {
  valid: boolean;
  reason?: string;
}

export const validateAddAccount = (accounts: Account[]): AccountValidationResult => {
  if (!canAddAccount(accounts)) {
    return { valid: false, reason: `Massimo ${ACCOUNT_LIMITS.MAX_ACCOUNTS} conti raggiunto.` };
  }
  return { valid: true };
};

export const validateDeleteAccount = (accounts: Account[], accountId: string): AccountValidationResult => {
  if (!accounts.some((a) => a.id === accountId)) {
    return { valid: false, reason: 'Conto non trovato.' };
  }
  if (!canDeleteAccount(accounts)) {
    return { valid: false, reason: `Servono almeno ${ACCOUNT_LIMITS.MIN_ACCOUNTS} conti configurati.` };
  }
  return { valid: true };
};
