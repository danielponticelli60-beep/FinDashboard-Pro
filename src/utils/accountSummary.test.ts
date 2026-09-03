import { describe, expect, it } from 'vitest';
import { Account, Transaction } from '../types';
import { computeAccountSummary, computeAggregateSummary, computeAllAccountSummaries } from './accountSummary';

const account = (over: Partial<Account> = {}): Account => ({
  id: 'main_account',
  kind: 'checking',
  label: 'Main',
  initialBalance: 1000,
  initialDate: '2026-01-01',
  isConfigured: true,
  ...over,
});

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 'tx',
  date: '2026-01-10',
  description: 'test',
  amount: 100,
  type: 'income',
  category: 'Altro',
  accountId: 'main_account',
  account: 'Conto Principale',
  status: 'completed',
  ...over,
});

describe('computeAccountSummary', () => {
  it('adds income and subtracts expense for the account only', () => {
    const summary = computeAccountSummary(account(), [
      tx({ id: '1', type: 'income', amount: 200, accountId: 'main_account' }),
      tx({ id: '2', type: 'expense', amount: 50, accountId: 'main_account' }),
      tx({ id: '3', type: 'income', amount: 999, accountId: 'other_account' }), // unrelated account, ignored
    ]);
    expect(summary.totalIncome).toBe(200);
    expect(summary.totalExpense).toBe(50);
    expect(summary.currentBalance).toBe(1000 + 200 - 50);
  });

  it('counts a complete transfer as an outflow from source and inflow to destination', () => {
    const from = account({ id: 'main_account', initialBalance: 1000 });
    const to = account({ id: 'prepaid_card', initialBalance: 50 });
    const transfer = tx({
      id: 't1', type: 'transfer', amount: 200, accountId: 'main_account',
      fromAccountId: 'main_account', toAccountId: 'prepaid_card',
    });
    const fromSummary = computeAccountSummary(from, [transfer]);
    const toSummary = computeAccountSummary(to, [transfer]);
    expect(fromSummary.transfersOut).toBe(200);
    expect(fromSummary.currentBalance).toBe(800);
    expect(toSummary.transfersIn).toBe(200);
    expect(toSummary.currentBalance).toBe(250);
  });

  it('excludes transferAccountsIncomplete transactions from every account totals (no inference)', () => {
    const from = account({ id: 'main_account', initialBalance: 1000 });
    const incomplete = tx({
      id: 't2', type: 'transfer', amount: 200, accountId: 'main_account',
      transferAccountsIncomplete: true,
      // no fromAccountId/toAccountId
    });
    const summary = computeAccountSummary(from, [incomplete]);
    expect(summary.transfersOut).toBe(0);
    expect(summary.transfersIn).toBe(0);
    expect(summary.currentBalance).toBe(1000); // unaffected - not silently inferred as an outflow
    expect(summary.txCount).toBe(0); // not even counted in the relevant-transaction count
  });

  it('excludes transactions on or before initialDate', () => {
    const summary = computeAccountSummary(account({ initialDate: '2026-01-10' }), [
      tx({ id: 'before', date: '2026-01-10', type: 'income', amount: 500 }),
      tx({ id: 'after', date: '2026-01-11', type: 'income', amount: 100 }),
    ]);
    expect(summary.totalIncome).toBe(100);
  });
});

describe('computeAllAccountSummaries / computeAggregateSummary', () => {
  it('nets transfers between two tracked accounts to zero in the aggregate', () => {
    const accounts = [
      account({ id: 'main_account', initialBalance: 1000 }),
      account({ id: 'prepaid_card', initialBalance: 50, kind: 'prepaid_card' }),
    ];
    const transfer = tx({
      id: 't1', type: 'transfer', amount: 200, accountId: 'main_account',
      fromAccountId: 'main_account', toAccountId: 'prepaid_card',
    });
    const summaries = computeAllAccountSummaries(accounts, [transfer]);
    const aggregate = computeAggregateSummary(summaries);
    // 1000 - 200 + 50 + 200 = 1050, same as before the transfer (money just moved)
    expect(aggregate.totalLiquidity).toBe(1050);
  });

  it('sums income/expense across all accounts', () => {
    const accounts = [
      account({ id: 'a', initialBalance: 0 }),
      account({ id: 'b', initialBalance: 0 }),
    ];
    const summaries = computeAllAccountSummaries(accounts, [
      tx({ id: '1', type: 'income', amount: 100, accountId: 'a' }),
      tx({ id: '2', type: 'expense', amount: 30, accountId: 'b' }),
    ]);
    const aggregate = computeAggregateSummary(summaries);
    expect(aggregate.totalIncome).toBe(100);
    expect(aggregate.totalExpense).toBe(30);
    expect(aggregate.accountCount).toBe(2);
  });
});
