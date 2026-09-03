import { describe, expect, it } from 'vitest';
import { Transaction, AllocationRule } from '../types';
import { mergeDuplicateCategory } from './categoryMerge';
import { BASE_CATEGORIES, buildFullCategoryCatalog } from './categoryManager';

const DUP_ID = 'svago_e_ristoranti';
const DUP_LABEL = 'Svago e ristoranti';
const CANON_ID = 'ristoranti_e_svago';

const merge = (txs: Transaction[]) => mergeDuplicateCategory(txs, DUP_ID, DUP_LABEL, CANON_ID);

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 'tx-1',
  date: '2026-08-05',
  description: 'test',
  amount: 20,
  type: 'expense',
  category: DUP_LABEL,
  categoryId: DUP_ID,
  categoryLabel: DUP_LABEL,
  rawCategory: DUP_LABEL,
  accountId: 'prepaid_card',
  account: 'Carta prepagata',
  status: 'completed',
  source: 'Excel personale',
  categoryModifiedManually: false,
  ...over,
});

describe('mergeDuplicateCategory', () => {
  it('reclassifies a transaction with the duplicate category into the canonical one', () => {
    const { updatedTransactions } = merge([tx({ id: 't1' })]);
    const t = updatedTransactions[0];
    expect(t.categoryId).toBe(CANON_ID);
    expect(t.category).toBe('Ristoranti & Svago');
    expect(t.categoryLabel).toBe('Ristoranti & Svago');
    expect(t.rawCategory).toBe('Ristoranti & Svago');
  });

  it('preserves amount, date, accountId, type, source, categoryModifiedManually and id', () => {
    const before = tx({ id: 't1', amount: 44.5, date: '2026-08-07', accountId: 'prepaid_card', categoryModifiedManually: false });
    const { updatedTransactions } = merge([before]);
    const after = updatedTransactions[0];
    expect(after.id).toBe(before.id);
    expect(after.amount).toBe(before.amount);
    expect(after.date).toBe(before.date);
    expect(after.accountId).toBe(before.accountId);
    expect(after.type).toBe(before.type);
    expect(after.source).toBe(before.source);
    expect(after.categoryModifiedManually).toBe(before.categoryModifiedManually);
  });

  it('does not change the total transaction count', () => {
    const txs = [tx({ id: 't1' }), tx({ id: 't2', categoryId: CANON_ID, category: 'Ristoranti & Svago', categoryLabel: 'Ristoranti & Svago', rawCategory: 'Ristoranti & Svago' })];
    const { updatedTransactions } = merge(txs);
    expect(updatedTransactions).toHaveLength(2);
  });

  it('does not touch transfer-type transactions', () => {
    const transfer = tx({
      id: 't-transfer', type: 'transfer', category: 'Giroconto / Trasferimento',
      categoryId: 'giroconto_trasferimento', categoryLabel: 'Giroconto / Trasferimento', rawCategory: 'Giroconto / Trasferimento',
      fromAccountId: 'main_account', toAccountId: 'prepaid_card',
    });
    const { updatedTransactions } = merge([transfer]);
    expect(updatedTransactions[0]).toEqual(transfer);
  });

  it('does not touch transactions already on the canonical category or any other category', () => {
    const already = tx({ id: 't-already', categoryId: CANON_ID, category: 'Ristoranti & Svago', categoryLabel: 'Ristoranti & Svago', rawCategory: 'Casa & Utenze', categoryModifiedManually: true });
    const other = tx({ id: 't-other', categoryId: 'salute_e_benessere', category: 'Salute e benessere', categoryLabel: 'Salute e benessere', rawCategory: 'Salute e benessere' });
    const { updatedTransactions } = merge([already, other]);
    expect(updatedTransactions[0]).toEqual(already);
    expect(updatedTransactions[1]).toEqual(other);
  });

  it('reports exactly which transactions were reclassified', () => {
    const txs = [tx({ id: 't1' }), tx({ id: 't2' }), tx({ id: 't3', categoryId: 'salute_e_benessere', category: 'Salute e benessere', categoryLabel: 'Salute e benessere', rawCategory: 'Salute e benessere' })];
    const { report } = merge(txs);
    expect(report.transactionsReclassified).toBe(2);
    expect(report.transactionIds.sort()).toEqual(['t1', 't2']);
    expect(report.canonicalLabel).toBe('Ristoranti & Svago');
  });

  it('is idempotent: running twice reclassifies zero on the second pass', () => {
    const txs = [tx({ id: 't1' }), tx({ id: 't2' })];
    const once = merge(txs);
    const twice = merge(once.updatedTransactions);
    expect(twice.report.transactionsReclassified).toBe(0);
    expect(twice.updatedTransactions).toEqual(once.updatedTransactions);
  });

  it('throws clearly if the canonical category id does not exist', () => {
    expect(() => mergeDuplicateCategory([tx({ id: 't1' })], DUP_ID, DUP_LABEL, 'not_a_real_id')).toThrow();
  });

  // Regression test: found live in a real browser session (2026-09-02).
  // A transaction can already have categoryId === canonical while still
  // carrying a stale rawCategory === duplicate label, left over from the
  // app's own category-migration feature (which deliberately preserves
  // rawCategory). That alone resurrects the duplicate via
  // buildFullCategoryCatalog. The merge must catch and clean this case too,
  // not just categoryId matches.
  it('catches and cleans a transaction whose categoryId is already canonical but rawCategory is still the stale duplicate label', () => {
    const stale = tx({
      id: 't-stale',
      categoryId: CANON_ID,
      category: 'Ristoranti & Svago',
      categoryLabel: 'Ristoranti & Svago',
      rawCategory: DUP_LABEL, // stale leftover text
    });
    const { updatedTransactions, report } = merge([stale]);
    expect(updatedTransactions[0].rawCategory).toBe('Ristoranti & Svago');
    expect(report.transactionsReclassified).toBe(1);
  });
});

describe('BASE_CATEGORIES no longer has the duplicate', () => {
  it('does not contain svago_e_ristoranti', () => {
    expect(BASE_CATEGORIES.find((c) => c.id === DUP_ID)).toBeUndefined();
  });

  it('still contains the canonical ristoranti_e_svago', () => {
    expect(BASE_CATEGORIES.find((c) => c.id === CANON_ID)?.label).toBe('Ristoranti & Svago');
  });
});

describe('the duplicate cannot resurrect via buildFullCategoryCatalog after migration', () => {
  it('a migrated transaction (rawCategory also updated) does not recreate a custom svago_e_ristoranti entry', () => {
    const migrated = merge([tx({ id: 't1' })]).updatedTransactions;
    const catalog = buildFullCategoryCatalog(migrated);
    expect(catalog.find((c) => c.id === DUP_ID)).toBeUndefined();
    expect(catalog.filter((c) => c.label === 'Ristoranti & Svago')).toHaveLength(1);
  });

  it('a transaction with only a stale rawCategory (categoryId already canonical) does not recreate the duplicate either', () => {
    const stale = tx({
      id: 't-stale',
      categoryId: CANON_ID,
      category: 'Ristoranti & Svago',
      categoryLabel: 'Ristoranti & Svago',
      rawCategory: DUP_LABEL,
    });
    const migrated = merge([stale]).updatedTransactions;
    const catalog = buildFullCategoryCatalog(migrated);
    expect(catalog.find((c) => c.id === DUP_ID)).toBeUndefined();
  });
});

describe('allocation rules only reference the canonical category', () => {
  it('no allocation rule in mockData references the duplicate label or id', async () => {
    const { INITIAL_ALLOCATION_PLAN } = await import('../data/mockData');
    const referencesduplicate = INITIAL_ALLOCATION_PLAN.rules.some(
      (r: AllocationRule) => r.category === DUP_LABEL
    );
    expect(referencesduplicate).toBe(false);
  });
});
