import { describe, expect, it } from 'vitest';
import { buildMigrationReport, isSchemaV2, migrateBackupToV2, SCHEMA_V2 } from './schemaMigration';
import { buildV1Fixture } from './schemaMigration.fixture';

describe('migrateBackupToV2', () => {
  it('preserves main_account and prepaid_card ids', () => {
    const after = migrateBackupToV2(buildV1Fixture());
    const ids = (after.accounts || []).map((a) => a.id);
    expect(ids).toContain('main_account');
    expect(ids).toContain('prepaid_card');
  });

  it('does not add, remove, or rename any transaction', () => {
    const before = buildV1Fixture();
    const after = migrateBackupToV2(before);
    expect(after.transactions).toHaveLength(before.transactions.length);
    expect(after.transactions.map((t) => t.id).sort()).toEqual(before.transactions.map((t) => t.id).sort());
  });

  it('flags exactly the structurally incomplete transfers, and only those', () => {
    const after = migrateBackupToV2(buildV1Fixture());
    const flagged = after.transactions.filter((t) => t.transferAccountsIncomplete).map((t) => t.id);
    expect(flagged.sort()).toEqual(['tx-transfer-incomplete-1', 'tx-transfer-incomplete-2']);
  });

  it('does not touch the structurally complete transfer', () => {
    const after = migrateBackupToV2(buildV1Fixture());
    const complete = after.transactions.find((t) => t.id === 'tx-transfer-complete')!;
    expect(complete.transferAccountsIncomplete).toBeUndefined();
    expect(complete.fromAccountId).toBe('main_account');
    expect(complete.toAccountId).toBe('prepaid_card');
  });

  it('never turns a transfer into income/expense', () => {
    const after = migrateBackupToV2(buildV1Fixture());
    for (const t of after.transactions) {
      const before = buildV1Fixture().transactions.find((b) => b.id === t.id)!;
      if (before.type === 'transfer') expect(t.type).toBe('transfer');
    }
  });

  it('leaves an unconfigured legacy accountId (cash_account) completely untouched, not reassigned', () => {
    const before = buildV1Fixture();
    const after = migrateBackupToV2(before);
    const beforeTx = before.transactions.find((t) => t.id === 'tx-orphan-cash')!;
    const afterTx = after.transactions.find((t) => t.id === 'tx-orphan-cash')!;
    expect(afterTx.accountId).toBe('cash_account');
    expect(afterTx.accountId).toBe(beforeTx.accountId);
    const accountIds = (after.accounts || []).map((a) => a.id);
    expect(accountIds).not.toContain('cash_account');
  });

  it('does not change any transaction field other than transferAccountsIncomplete', () => {
    const before = buildV1Fixture();
    const after = migrateBackupToV2(before);
    for (const beforeTx of before.transactions) {
      const afterTx = after.transactions.find((t) => t.id === beforeTx.id)!;
      const { transferAccountsIncomplete: _omit, ...afterRest } = afterTx;
      expect(afterRest).toEqual(beforeTx);
    }
  });

  it('leaves unrelated entities (auditLogs, allocationRules, categories, budgets, preferences) unchanged', () => {
    const before = buildV1Fixture();
    const after = migrateBackupToV2(before);
    expect(after.auditLogs).toEqual(before.auditLogs);
    expect(after.allocationRules).toEqual(before.allocationRules);
    expect(after.categories).toEqual(before.categories);
    expect(after.budgets).toEqual(before.budgets);
    expect(after.preferences).toEqual(before.preferences);
  });

  it('bumps schemaVersion to 2 and drops the legacy fixed-account fields', () => {
    const after = migrateBackupToV2(buildV1Fixture());
    expect(after.schemaVersion).toBe(SCHEMA_V2);
    expect(after.mainAccountConfig).toBeUndefined();
    expect(after.prepaidCardConfig).toBeUndefined();
  });

  it('is idempotent: migrating an already-v2 backup is a no-op', () => {
    const once = migrateBackupToV2(buildV1Fixture());
    const twice = migrateBackupToV2(once);
    expect(twice).toEqual(once);
    expect(isSchemaV2(twice)).toBe(true);
  });
});

describe('buildMigrationReport', () => {
  it('passes all checks on the synthetic fixture', () => {
    const before = buildV1Fixture();
    const after = migrateBackupToV2(before);
    const report = buildMigrationReport(before, after);
    const failed = report.checks.filter((c) => !c.passed);
    expect(failed).toEqual([]);
    expect(report.passed).toBe(true);
    expect(report.transactionCountBefore).toBe(report.transactionCountAfter);
    expect(report.flaggedIncompleteTransfers.sort()).toEqual(['tx-transfer-incomplete-1', 'tx-transfer-incomplete-2']);
    expect(report.orphanAccountIds).toEqual(['cash_account']);
  });

  it('would catch a broken migration (regression guard on the checker itself)', () => {
    const before = buildV1Fixture();
    const brokenAfter = migrateBackupToV2(before);
    brokenAfter.transactions = brokenAfter.transactions.slice(1); // simulate a dropped transaction
    const report = buildMigrationReport(before, brokenAfter);
    expect(report.passed).toBe(false);
  });
});
