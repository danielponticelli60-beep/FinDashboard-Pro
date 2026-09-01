import { BackupData } from '../types';

/**
 * Synthetic fixture for schemaMigration tests. Deliberately NOT the real
 * user backup used to validate this migration once by hand (see
 * MIGRATION_PREMIGRATION_REPORT.md / MIGRATION_DRYRUN_REPORT.md) - those
 * contain real financial data and were never committed to the repo. This
 * fixture reproduces the same structural edge cases with fake numbers:
 * - 2 configured accounts (main_account, prepaid_card)
 * - 1 structurally complete transfer (fromAccountId + toAccountId set)
 * - 2 structurally incomplete transfers (type: 'transfer' but missing both)
 * - 1 transaction referencing an unconfigured legacy accountId ('cash_account')
 * - unrelated entities (auditLogs, allocationRules) that must pass through untouched
 */
export function buildV1Fixture(): BackupData {
  return {
    schemaVersion: 1,
    appVersion: '1.2.0',
    createdAt: '2026-01-01T00:00:00.000Z',
    transactions: [
      {
        id: 'tx-income-1',
        date: '2026-01-05',
        description: 'Stipendio test',
        amount: 1500,
        type: 'income',
        category: 'Stipendio',
        accountId: 'main_account',
        account: 'Conto Principale',
        status: 'completed',
      },
      {
        id: 'tx-expense-1',
        date: '2026-01-06',
        description: 'Spesa test',
        amount: 42.5,
        type: 'expense',
        category: 'Alimentari & Spesa',
        accountId: 'prepaid_card',
        account: 'Carta prepagata',
        status: 'completed',
      },
      {
        id: 'tx-transfer-complete',
        date: '2026-01-07',
        description: 'Ricarica completa',
        amount: 100,
        type: 'transfer',
        category: 'Giroconto / Trasferimento',
        accountId: 'main_account',
        account: 'Conto Principale',
        status: 'completed',
        fromAccountId: 'main_account',
        toAccountId: 'prepaid_card',
      },
      {
        id: 'tx-transfer-incomplete-1',
        date: '2026-01-08',
        description: 'Trasferimento senza destinazione (import)',
        amount: 200,
        type: 'transfer',
        category: 'Giroconto / Trasferimento',
        accountId: 'main_account',
        account: 'Conto Principale',
        status: 'completed',
      },
      {
        id: 'tx-transfer-incomplete-2',
        date: '2026-01-09',
        description: 'Altro trasferimento senza destinazione (import)',
        amount: 25,
        type: 'transfer',
        category: 'Giroconto / Trasferimento',
        accountId: 'main_account',
        account: 'Conto Principale',
        status: 'completed',
      },
      {
        id: 'tx-orphan-cash',
        date: '2026-01-10',
        description: 'Entrata contanti senza conto configurato',
        amount: 30,
        type: 'income',
        category: 'Altre Entrate',
        accountId: 'cash_account',
        account: 'Contanti',
        status: 'completed',
      },
    ],
    mainAccountConfig: {
      id: 'main_account',
      initialBalance: 1000,
      initialDate: '2026-01-01',
      accountLabel: 'Conto Corrente Principale',
      isConfigured: true,
    },
    prepaidCardConfig: {
      id: 'prepaid_card',
      initialBalance: 50,
      initialDate: '2026-01-01',
      accountLabel: 'Carta prepagata',
      isConfigured: true,
    },
    categories: {
      expense: ['Alimentari & Spesa'],
      income: ['Stipendio', 'Altre Entrate'],
    },
    budgets: { monthlyBenchmark: 1000, targetSavingsRate: 20 },
    allocationRules: [
      { id: 'rule-1', category: 'Alimentari & Spesa', group: 'Bisogni Essenziali', targetPercentage: 50, color: '#000' },
    ],
    auditLogs: [
      { id: 'audit-1', timestamp: '2026-01-01T00:00:00.000Z', action: 'create', details: 'test' },
    ],
    wealthAssets: [],
    financialGoals: [],
    importPresets: [],
    preferences: { theme: 'dark' },
  };
}
