import { Account, AccountKind, BackupData, MainAccountConfig, PrepaidCardConfig, Transaction } from '../types';

/**
 * v1 -> v2 schema migration: replaces the fixed MainAccountConfig +
 * PrepaidCardConfig pair with a generic `accounts` list (2-4 accounts).
 *
 * Guarantees (verified by schemaMigration.test.ts against both a synthetic
 * fixture and, once, manually against a real user backup):
 * - 'main_account' and 'prepaid_card' ids are preserved exactly.
 * - No transaction is added, removed, renamed, or has amount/date/category
 *   changed. The only mutation is adding `transferAccountsIncomplete: true`
 *   to transfer-type transactions missing fromAccountId/toAccountId -
 *   additive, never inferred, never turns a transfer into income/expense.
 * - accountId values with no matching config (e.g. a legacy 'cash_account'
 *   tag) are left completely untouched - never reassigned, never dropped.
 * - Idempotent: migrating an already-v2 backup returns an equivalent clone.
 * - All other top-level entities (auditLogs, wealthAssets, financialGoals,
 *   allocationRules, importPresets, categories, budgets, preferences) pass
 *   through unchanged.
 */
export const SCHEMA_V2 = 2;

export function isSchemaV2(backup: BackupData): boolean {
  return backup.schemaVersion >= SCHEMA_V2 && Array.isArray(backup.accounts);
}

function mapMainAccountToAccount(cfg: MainAccountConfig): Account {
  return {
    id: cfg.id || 'main_account',
    kind: 'checking',
    label: cfg.accountLabel || 'Conto Principale',
    initialBalance: cfg.initialBalance,
    initialDate: cfg.initialDate,
    maskedNumber: cfg.maskedNumber,
    isConfigured: cfg.isConfigured,
    controlBalance: cfg.controlBalance,
    controlBalanceDate: cfg.controlBalanceDate,
    cardDebitMode: cfg.cardDebitMode,
    linkedMethods: cfg.linkedMethods,
  };
}

function mapPrepaidCardToAccount(cfg: PrepaidCardConfig): Account {
  return {
    id: cfg.id || 'prepaid_card',
    kind: 'prepaid_card' as AccountKind,
    label: cfg.accountLabel || 'Carta prepagata',
    initialBalance: cfg.initialBalance,
    initialDate: cfg.initialDate,
    maskedNumber: cfg.maskedNumber,
    isConfigured: cfg.isConfigured,
    controlBalance: cfg.controlBalance,
    controlBalanceDate: cfg.controlBalanceDate,
  };
}

function migrateTransaction(tx: Transaction): Transaction {
  if (tx.type === 'transfer' && (!tx.fromAccountId || !tx.toAccountId)) {
    return { ...tx, transferAccountsIncomplete: true };
  }
  return tx;
}

export function migrateBackupToV2(backup: BackupData): BackupData {
  if (isSchemaV2(backup)) {
    // Already migrated. Idempotent no-op - deep clone so callers can't
    // accidentally mutate the input via the returned reference.
    return JSON.parse(JSON.stringify(backup));
  }

  const accounts: Account[] = [];
  if (backup.mainAccountConfig) accounts.push(mapMainAccountToAccount(backup.mainAccountConfig));
  if (backup.prepaidCardConfig) accounts.push(mapPrepaidCardToAccount(backup.prepaidCardConfig));

  const migrated: BackupData = {
    ...backup,
    schemaVersion: SCHEMA_V2,
    accounts,
    transactions: backup.transactions.map(migrateTransaction),
  };
  delete migrated.mainAccountConfig;
  delete migrated.prepaidCardConfig;

  return migrated;
}

export interface MigrationCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface MigrationReport {
  passed: boolean;
  checks: MigrationCheck[];
  transactionCountBefore: number;
  transactionCountAfter: number;
  accountsCreated: { id: string; kind: AccountKind; label: string }[];
  flaggedIncompleteTransfers: string[];
  orphanAccountIds: string[];
}

/**
 * Structural before/after comparison. Does not assume anything about what
 * "should" have changed beyond the documented guarantees above - it
 * verifies them.
 */
export function buildMigrationReport(before: BackupData, after: BackupData): MigrationReport {
  const checks: MigrationCheck[] = [];

  const beforeIds = new Set(before.transactions.map((t) => t.id));
  const afterIds = new Set(after.transactions.map((t) => t.id));
  const idsMatch = beforeIds.size === afterIds.size && [...beforeIds].every((id) => afterIds.has(id));
  checks.push({
    label: 'Nessuna transazione aggiunta o rimossa',
    passed: idsMatch,
    detail: `before=${beforeIds.size} after=${afterIds.size}`,
  });

  const beforeById = new Map(before.transactions.map((t) => [t.id, t]));
  const flaggedIncompleteTransfers: string[] = [];
  let onlyAllowedFieldChanged = true;
  let unexpectedDiff: string | null = null;
  for (const afterTx of after.transactions) {
    const beforeTx = beforeById.get(afterTx.id);
    if (!beforeTx) continue;
    const beforeCopy: Record<string, unknown> = { ...beforeTx };
    const afterCopy: Record<string, unknown> = { ...afterTx };
    delete beforeCopy.transferAccountsIncomplete;
    delete afterCopy.transferAccountsIncomplete;
    if (JSON.stringify(beforeCopy) !== JSON.stringify(afterCopy)) {
      onlyAllowedFieldChanged = false;
      unexpectedDiff = afterTx.id;
    }
    if (afterTx.transferAccountsIncomplete) flaggedIncompleteTransfers.push(afterTx.id);
  }
  checks.push({
    label: 'Nessun campo di transazione modificato oltre a transferAccountsIncomplete',
    passed: onlyAllowedFieldChanged,
    detail: onlyAllowedFieldChanged ? 'ok' : `differenza inattesa in id=${unexpectedDiff}`,
  });

  const expectedFlags = before.transactions.filter(
    (t) => t.type === 'transfer' && (!t.fromAccountId || !t.toAccountId)
  ).length;
  checks.push({
    label: 'transferAccountsIncomplete impostato esattamente sui transfer incompleti (nessuno di più, nessuno di meno)',
    passed: flaggedIncompleteTransfers.length === expectedFlags,
    detail: `atteso=${expectedFlags} effettivo=${flaggedIncompleteTransfers.length}`,
  });

  const accountIds = new Set((after.accounts || []).map((a) => a.id));
  checks.push({
    label: "main_account preservato",
    passed: !before.mainAccountConfig || accountIds.has(before.mainAccountConfig.id || 'main_account'),
    detail: [...accountIds].join(', '),
  });
  checks.push({
    label: "prepaid_card preservato",
    passed: !before.prepaidCardConfig || accountIds.has(before.prepaidCardConfig.id || 'prepaid_card'),
    detail: [...accountIds].join(', '),
  });

  const txAccountIds = new Set(before.transactions.map((t) => t.accountId).filter((v): v is string => !!v));
  const orphanAccountIds = [...txAccountIds].filter((id) => !accountIds.has(id));
  checks.push({
    label: 'accountId senza configurazione lasciati intatti (nessuna riassegnazione automatica)',
    passed: true, // informational - this is expected/allowed, not a failure
    detail: orphanAccountIds.length ? orphanAccountIds.join(', ') : 'nessuno',
  });

  const untouchedKeys: (keyof BackupData)[] = [
    'auditLogs',
    'wealthAssets',
    'wealthItems',
    'financialGoals',
    'allocationRules',
    'allocationPlan',
    'importPresets',
    'categories',
    'budgets',
    'preferences',
  ];
  let allUntouchedMatch = true;
  const untouchedDiffs: string[] = [];
  for (const key of untouchedKeys) {
    const same = JSON.stringify(before[key]) === JSON.stringify(after[key]);
    if (!same) {
      allUntouchedMatch = false;
      untouchedDiffs.push(key);
    }
  }
  checks.push({
    label: 'Entità non correlate (audit log, wealth, goals, allocation, presets, categorie, budget, preferenze) invariate',
    passed: allUntouchedMatch,
    detail: allUntouchedMatch ? 'ok' : `modificate: ${untouchedDiffs.join(', ')}`,
  });

  checks.push({
    label: 'schemaVersion aggiornato a 2',
    passed: after.schemaVersion === SCHEMA_V2,
    detail: `schemaVersion=${after.schemaVersion}`,
  });

  return {
    passed: checks.every((c) => c.passed),
    checks,
    transactionCountBefore: before.transactions.length,
    transactionCountAfter: after.transactions.length,
    accountsCreated: (after.accounts || []).map((a) => ({ id: a.id, kind: a.kind, label: a.label })),
    flaggedIncompleteTransfers,
    orphanAccountIds,
  };
}
