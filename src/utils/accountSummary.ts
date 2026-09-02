import { Account, Transaction, TransactionType } from '../types';

/**
 * Generic per-account balance/summary engine (schema v2).
 *
 * Deliberately simpler than the old MainAccountSummary/PrepaidAccountSummary
 * logic it replaces: no description-text heuristics, no cross-account
 * "linked card absorption". A transaction only affects an account's totals
 * through its explicit accountId (income/expense) or fromAccountId/
 * toAccountId (transfer) - never inferred from free text.
 *
 * Transfer-type transactions flagged `transferAccountsIncomplete` (see
 * schemaMigration.ts) are excluded from every account's transfer totals
 * until a human resolves fromAccountId/toAccountId - they still exist as
 * transactions and are surfaced in Diagnostics, they're just not counted
 * anywhere as money having moved between two specific accounts. This is a
 * deliberate, disclosed behavior change from the old heuristic engine (see
 * MIGRATION_DRYRUN_REPORT.md) which used to silently count some of these as
 * outflows via a `tx.accountId === 'main_account'` fallback.
 */

export interface AccountRunningHistoryPoint {
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  balance: number;
}

export interface AccountSummary {
  accountId: string;
  initialBalance: number;
  initialDate: string;
  totalIncome: number;
  totalExpense: number;
  incomeCount: number;
  expenseCount: number;
  transfersIn: number;
  transfersOut: number;
  transfersCount: number;
  netTransfers: number;
  currentBalance: number;
  txCount: number;
  runningHistory: AccountRunningHistoryPoint[];
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function computeAccountSummary(account: Account, transactions: Transaction[]): AccountSummary {
  const relevant = transactions
    .filter((tx) => {
      if (tx.date <= account.initialDate) return false;
      if (tx.type === 'transfer') {
        if (tx.transferAccountsIncomplete) return false;
        return tx.fromAccountId === account.id || tx.toAccountId === account.id;
      }
      return tx.accountId === account.id;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  let totalIncome = 0;
  let incomeCount = 0;
  let totalExpense = 0;
  let expenseCount = 0;
  let transfersIn = 0;
  let transfersOut = 0;
  let transfersCount = 0;
  let rollingBalance = account.initialBalance;

  const runningHistory: AccountRunningHistoryPoint[] = [
    {
      date: account.initialDate,
      description: 'Saldo iniziale',
      amount: account.initialBalance,
      type: 'income',
      balance: round2(rollingBalance),
    },
  ];

  for (const tx of relevant) {
    const amt = typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0;

    if (tx.type === 'income') {
      incomeCount++;
      totalIncome += amt;
      rollingBalance += amt;
    } else if (tx.type === 'expense') {
      expenseCount++;
      totalExpense += amt;
      rollingBalance -= amt;
    } else if (tx.type === 'transfer') {
      transfersCount++;
      if (tx.toAccountId === account.id) {
        transfersIn += amt;
        rollingBalance += amt;
      } else if (tx.fromAccountId === account.id) {
        transfersOut += amt;
        rollingBalance -= amt;
      }
    }

    runningHistory.push({
      date: tx.date,
      description: tx.description,
      amount: amt,
      type: tx.type,
      balance: round2(rollingBalance),
    });
  }

  const netTransfers = round2(transfersIn - transfersOut);
  const currentBalance = round2(account.initialBalance + totalIncome - totalExpense + netTransfers);

  return {
    accountId: account.id,
    initialBalance: account.initialBalance,
    initialDate: account.initialDate,
    totalIncome: round2(totalIncome),
    totalExpense: round2(totalExpense),
    incomeCount,
    expenseCount,
    transfersIn: round2(transfersIn),
    transfersOut: round2(transfersOut),
    transfersCount,
    netTransfers,
    currentBalance,
    txCount: relevant.length,
    runningHistory,
  };
}

export function computeAllAccountSummaries(
  accounts: Account[],
  transactions: Transaction[]
): Record<string, AccountSummary> {
  const result: Record<string, AccountSummary> = {};
  for (const account of accounts) {
    result[account.id] = computeAccountSummary(account, transactions);
  }
  return result;
}

export interface AggregateSummary {
  totalLiquidity: number;
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  accountCount: number;
}

/**
 * Sums per-account summaries. Transfers between two tracked accounts net to
 * zero automatically here (one account's transfersOut is another's
 * transfersIn), so no special-casing is needed to avoid double counting.
 */
export function computeAggregateSummary(summaries: Record<string, AccountSummary>): AggregateSummary {
  const values = Object.values(summaries);
  const totalLiquidity = round2(values.reduce((sum, s) => sum + s.currentBalance, 0));
  const totalIncome = round2(values.reduce((sum, s) => sum + s.totalIncome, 0));
  const totalExpense = round2(values.reduce((sum, s) => sum + s.totalExpense, 0));
  return {
    totalLiquidity,
    totalIncome,
    totalExpense,
    netFlow: round2(totalIncome - totalExpense),
    accountCount: values.length,
  };
}
