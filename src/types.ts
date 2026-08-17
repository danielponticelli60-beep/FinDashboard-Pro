export type TransactionType = 'income' | 'expense' | 'transfer' | 'to_verify';

export type AccountType = 
  | 'Conto Principale' 
  | 'Carta prepagata'
  | 'Carta'
  | 'Carta di Credito' 
  | 'Conto Risparmio' 
  | 'Portafoglio Investimenti' 
  | 'Contanti';

export type ExpenseCategory = 
  | 'Casa & Utenze'
  | 'Alimentari & Spesa'
  | 'Trasporti & Auto'
  | 'Ristoranti & Svago'
  | 'Salute & Benessere'
  | 'Shopping & Abbigliamento'
  | 'Abbonamenti & Servizi'
  | 'Educazione & Corsi'
  | 'Viaggi & Vacanze'
  | 'Altro Spese';

export type IncomeCategory = 
  | 'Stipendio'
  | 'Freelance & Bonus'
  | 'Investimenti & Dividendi'
  | 'Rimborsi & Vendite'
  | 'Altre Entrate';

export type Category = string;

export type TransactionSource = 'Excel personale' | 'Manuale' | 'Demo' | 'Backup' | string;

export interface CategoryDefinition {
  id: string; // stable deterministic category ID (e.g. 'regali_e_famiglia')
  label: string; // human readable original label (e.g. 'Regali e famiglia')
  allowedType: 'expense' | 'income' | 'both' | 'transfer';
  color: string; // unique hex color
  iconName?: string;
  isSystem?: boolean;
}

export interface CategoryMigrationReport {
  totalAnalyzed: number;
  migratedCount: number;
  unrecognizedCount: number;
  modifiedCount: number;
  snapshotTimestamp: string;
  categoryBreakdown: {
    rawCategory: string;
    normalizedLabel: string;
    categoryId: string;
    color: string;
    count: number;
    totalAmount: number;
    type: string;
    isUnrecognized: boolean;
  }[];
  unrecognizedRecords: {
    id: string;
    description: string;
    date: string;
    amount: number;
    rawCategory: string;
    assignedCategoryId: string;
    assignedCategoryLabel: string;
  }[];
}

export interface CategoryVerificationItem {
  rawCategory: string;
  canonicalId: string;
  canonicalLabel: string;
  color: string;
  count: number;
  totalExpense: number;
  totalIncome: number;
  allowedType: string;
  isValid: boolean;
  isUnrecognized: boolean;
  isEmpty: boolean;
}

export interface CategoryDiagnosticsSummary {
  totalRecords: number;
  totalCategoriesCount: number;
  emptyCategoryRecordsCount: number;
  unrecognizedRecordsCount: number;
  mismatchedSelectorRecordsCount: number;
  categories: CategoryVerificationItem[];
  recordsWithIssues: {
    id: string;
    date: string;
    description: string;
    amount: number;
    rawCategory: string;
    categoryId: string;
    categoryLabel: string;
    issue: string;
  }[];
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // positive number (absolute value)
  type: TransactionType;
  category: Category;
  categoryId?: string; // Canonical stable deterministic identifier
  categoryLabel?: string; // Canonical original text label
  rawCategory?: string; // Raw input string from Excel or manual input
  subcategory?: string;
  account: AccountType;
  status: 'completed' | 'pending';
  notes?: string;
  tags?: string[];
  source?: TransactionSource;
  importBatchId?: string;
  importedAt?: string;

  // Audit & reconciliation preservation fields
  originalSignedAmount?: number | null; // e.g. -54.20 or +1500.00
  rawAmount?: number | string; // original raw string or cell value
  normalizedAmount?: number; // normalized absolute amount
  typeModifiedManually?: boolean; // true if user manually set the type
  typeMigrationReason?: string; // e.g. "Reconstructed from sign (>0 = income)"
  categoryModifiedManually?: boolean; // true if user manually changed the category in edit modal
}

export interface ToVerifyRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  account: string;
  category: string;
  source?: string;
  rawAmount?: any;
  originalSignedAmount?: number | null;
  reason: string;
  currentType: TransactionType;
}

export interface TypeMigrationSummary {
  totalCount: number;
  incomeCount: number;
  expenseCount: number;
  toVerifyCount: number;
  transferCount: number;
  sumIncome: number;
  sumExpense: number;
  netBalance: number;
  changedCount: number;
  unchangedCount: number;
  toVerifyRows: ToVerifyRow[];
}

export type AllocationGroup = 'Bisogni Essenziali' | 'Desideri & Stile di Vita' | 'Risparmio & Investimenti';

export interface AllocationRule {
  id: string;
  category: Category;
  group: AllocationGroup;
  targetPercentage: number; // e.g. 25 (%)
  color: string;
}

export interface AllocationPlan {
  name: string;
  targetNeeds: number; // e.g. 50 (%)
  targetWants: number; // e.g. 30 (%)
  targetSavings: number; // e.g. 20 (%)
  rules: AllocationRule[];
}

export interface FilterState {
  searchQuery: string;
  year: string; // 'all' | '2024' | '2025' | '2026'
  quarter: string; // 'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4'
  month: string; // 'all' | '01'..'12'
  category: string; // 'all' | category name
  account: string; // 'all' | account name
  type: string; // 'all' | 'income' | 'expense' | 'to_verify' | 'transfer'
  dateFrom?: string;
  dateTo?: string;
}

export type ActivePage = 'dashboard' | 'transactions' | 'accounts' | 'allocation' | 'wealth' | 'goals' | 'quarterly' | 'annual' | 'settings';

export type CardDebitMode = 'direct_debit' | 'separate_account' | 'excluded';

export interface MainAccountConfig {
  initialBalance: number; // e.g. 3400.00
  initialDate: string; // YYYY-MM-DD
  accountLabel?: string; // e.g. "Conto Corrente Principale"
  maskedNumber?: string; // e.g. "••••4829" (only masked last 4 digits)
  isConfigured: boolean;
  controlBalance?: number; // Manual control/reconciliation balance (e.g. 3075.00)
  controlBalanceDate?: string; // Date of the statement balance
  cardDebitMode?: CardDebitMode; // 'direct_debit' | 'separate_account' | 'excluded'
  linkedMethods?: string[]; // e.g. ['Carta']
}

export interface PrepaidCardConfig {
  initialBalance: number; // 0.00 at 01/07/2026
  initialDate: string; // YYYY-MM-DD (e.g. '2026-07-01')
  controlBalance: number; // 58.68 or calculated
  controlBalanceDate?: string;
  accountLabel: string; // 'Carta prepagata'
  maskedNumber?: string;
  isConfigured: boolean;
}

export interface PrepaidAccountSummary {
  config: PrepaidCardConfig;
  initialBalance: number;
  initialDate: string;
  rechargesIn: number; // 425.00
  rechargesCount: number; // 3
  cardExpenses: number; // 928.00
  cardExpensesCount: number; // 18
  currentBalance: number; // 0.00 + 425.00 - 928.00 = -503.00 (or reconciled)
  controlBalance: number; // 58.68
  controlBalanceDate?: string;
  reconciliationDelta: number; // 0.00
  isReconciled: boolean;
  runningHistory: {
    date: string;
    description: string;
    amount: number;
    type: TransactionType;
    balance: number;
    account: string;
  }[];
}

export interface OverallLiquiditySummary {
  mainAccountBalance: number; // 3075.00
  prepaidCardBalance: number; // 58.68
  totalLiquidity: number; // 3133.68
  totalControlBalance: number; // 3133.68
  totalDelta: number; // 0.00
  isReconciled: boolean;
}

export interface ImportBatch {
  id: string;
  importedAt: string; // ISO String
  filename: string;
  count: number;
  transactionIds: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO String
  action: 'create' | 'update' | 'delete' | 'bulk_delete' | 'import' | 'undo_delete' | 'undo_import' | 'reset_personal' | 'migration' | 'undo_migration';
  details: string;
  count?: number;
  recordIds?: string[];
  recordsSnapshot?: Transaction[];
}

export interface MainAccountSummary {
  config: MainAccountConfig;
  initialBalance: number;
  initialDate: string;
  // All-time metrics (from initialDate)
  totalIncome: number;
  totalExpense: number;
  expenseDirectCount: number;
  expenseDirectAmount: number;
  expenseCardCount: number;
  expenseCardAmount: number;
  transfersIn: number;
  transfersOut: number;
  netTransfers: number;
  currentBalance: number;
  txCount: number;
  incomeCount: number;
  expenseCount: number;
  transfersCount: number;
  controlBalance: number;
  controlBalanceDate?: string;
  reconciliationDelta: number;
  isReconciled: boolean;
  // Period metrics (based on active filters)
  periodIncome: number;
  periodExpense: number;
  periodTransfersIn: number;
  periodTransfersOut: number;
  periodNetTransfers: number;
  periodNetFlow: number;
  periodTxCount: number;
  periodIncomeCount: number;
  periodExpenseCount: number;
  runningHistory: {
    date: string;
    description: string;
    amount: number;
    type: TransactionType;
    balance: number;
    account: string;
  }[];
}

export interface DiagnosticReport {
  totalRecords: number;
  bySource: {
    excelCount: number;
    excelAmount: number;
    manualCount: number;
    manualAmount: number;
    demoCount: number;
    demoAmount: number;
    otherCount: number;
    otherAmount: number;
  };
  importSessions: {
    batchId: string;
    filename: string;
    importedAt: string;
    count: number;
  }[];
  excludedFromKpisCount: number;
}

export type WealthType = 'liquidity' | 'investment' | 'asset' | 'liability';

export interface WealthItem {
  id: string;
  name: string;
  type: WealthType;
  category: string; // e.g. "Conto Corrente", "ETF Azionario", "Fondo Pensione", "Immobile", "Mutuo Prima Casa"
  value: number; // positive value in EUR
  institution?: string; // e.g. "Intesa Sanpaolo", "Directa", "Fineco"
  targetAllocationPercent?: number; // Target allocation percentage
  interestRate?: number; // annual % return or debt rate
  notes?: string;
  updatedAt: string; // YYYY-MM-DD
}

export interface NetWorthHistoryPoint {
  date: string; // YYYY-MM
  label: string; // e.g. "Gen 2025"
  liquidity: number;
  investments: number;
  assets: number;
  liabilities: number;
  netWorth: number;
}

export type GoalCategory = 'emergency' | 'house' | 'travel' | 'investment' | 'vehicle' | 'family' | 'other';

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  category: GoalCategory;
  priority: 'high' | 'medium' | 'low';
  monthlyContribution?: number;
  notes?: string;
  color?: string;
  status?: 'in_progress' | 'completed' | 'behind';
}

export interface BackupPreferences {
  theme?: string;
  currency?: string;
  lastBackupDate?: string;
  defaultAccount?: string;
}

export interface BackupData {
  schemaVersion: number;
  appVersion: string;
  createdAt: string; // ISO string
  exportDate?: string; // backward compat
  version?: string; // backward compat
  transactions: Transaction[];
  mainAccountConfig?: MainAccountConfig;
  prepaidCardConfig?: PrepaidCardConfig;
  categories?: {
    expense: ExpenseCategory[];
    income: IncomeCategory[];
  };
  budgets?: {
    monthlyBenchmark: number;
    targetSavingsRate: number;
  };
  allocationPlan?: AllocationPlan;
  allocationRules?: AllocationRule[];
  wealthAssets?: WealthItem[];
  wealthItems?: WealthItem[]; // alias for compatibility
  financialGoals?: FinancialGoal[];
  importPresets?: any[];
  preferences?: BackupPreferences;
  auditLogs?: AuditLogEntry[];
}

export interface IntegrityCheckResult {
  passed: boolean;
  score: number; // 0 - 100%
  timestamp: string;
  counts: {
    transactions: number;
    incomes: number;
    expenses: number;
    transfers: number;
    wealthItems: number;
    financialGoals: number;
    allocationRules: number;
    auditLogs: number;
  };
  financialSummary: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    mainAccountInitialBalance: number;
    mainAccountCalculatedBalance: number;
    mainAccountControlBalance?: number;
    netWorth: number;
    totalGoalsTarget: number;
    totalGoalsCurrent: number;
  };
  checks: {
    id: string;
    label: string;
    category: 'schema' | 'data' | 'financial' | 'integrity';
    status: 'pass' | 'warn' | 'fail';
    message: string;
    details?: string;
  }[];
  errorsCount: number;
  warningsCount: number;
}

