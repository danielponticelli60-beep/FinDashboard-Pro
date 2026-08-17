import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  Transaction, 
  TransactionType,
  TransactionSource,
  AllocationPlan, 
  AllocationRule, 
  FilterState, 
  ActivePage,
  WealthItem,
  FinancialGoal,
  NetWorthHistoryPoint,
  BackupData,
  ExpenseCategory,
  IncomeCategory,
  MainAccountConfig,
  MainAccountSummary,
  PrepaidCardConfig,
  PrepaidAccountSummary,
  OverallLiquiditySummary,
  ImportBatch,
  AuditLogEntry,
  DiagnosticReport,
  IntegrityCheckResult,
  TypeMigrationSummary,
  CategoryDefinition,
  CategoryMigrationReport,
  CategoryDiagnosticsSummary
} from '../types';
import { 
  INITIAL_ALLOCATION_PLAN, 
  INITIAL_WEALTH_ITEMS, 
  INITIAL_NET_WORTH_HISTORY, 
  INITIAL_FINANCIAL_GOALS,
  REAL_PERIOD_TRANSACTIONS
} from '../data/mockData';
import { generateStableTransactionId, makeDuplicateKey } from '../utils/excelParser';
import {
  generateTypeMigrationPreview,
  executeTypeMigration
} from '../utils/typeMigration';
import {
  buildFullCategoryCatalog,
  runCategoryDiagnostics,
  migrateTransactionsCategories,
  loadCategoryMigrationBackup,
  saveCategoryMigrationBackup
} from '../utils/categoryManager';
import {
  exportFullBackupJSON as exportJSONUtil,
  exportTransactionsCSV as exportCSVUtil,
  exportExcelWorkbook as exportExcelUtil,
  performIntegrityCheck as performIntegrityCheckUtil,
  LAST_BACKUP_STORAGE_KEY
} from '../utils/backupManager';

export interface WealthMetrics {
  totalLiquidity: number;
  totalInvestments: number;
  totalAssets: number;
  totalLiabilities: number;
  grossWealth: number;
  netWorth: number;
  debtToAssetRatio: number; // %
  liquidRunwayMonths: number;
  investmentsShare: number; // %
  liquidityShare: number; // %
}

export interface GoalsMetrics {
  totalGoalsCount: number;
  completedGoalsCount: number;
  inProgressGoalsCount: number;
  totalTargetAmount: number;
  totalSavedAmount: number;
  totalRemainingAmount: number;
  overallProgressPercent: number;
}

interface DeletedTransactionsBatch {
  timestamp: string;
  transactions: Transaction[];
  actionType: 'single' | 'bulk';
}

interface FinanceContextType {
  // Navigation
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;

  // Transactions State & CRUD
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, updatedTx: Partial<Transaction>) => void;
  updateTransactionType: (id: string, newType: TransactionType) => void;
  deleteTransaction: (id: string) => void;
  deleteTransactionsBulk: (ids: string[]) => { deletedCount: number };
  duplicateTransaction: (id: string) => void;
  importTransactions: (txs: Transaction[]) => void;
  
  // Undo deletion
  undoLastDelete: () => { success: boolean; restoredCount: number };
  canUndoDelete: boolean;
  lastDeletedCount: number;

  // Type Reconstruction Migration (Deterministic sign-based)
  canUndoTypeMigration: boolean;
  isTypeMigrationModalOpen: boolean;
  openTypeMigrationModal: () => void;
  closeTypeMigrationModal: () => void;
  getTypeMigrationPreview: () => TypeMigrationSummary;
  applyTypeMigration: (manualOverrides?: Record<string, TransactionType>) => { success: boolean; summary: TypeMigrationSummary; message: string };
  undoTypeMigration: () => { success: boolean; message: string };

  // Canonical Category System & Integrity Migration
  categoryCatalog: CategoryDefinition[];
  categoryDiagnostics: CategoryDiagnosticsSummary;
  getCategoryMigrationPreview: () => CategoryMigrationReport;
  applyCategoryMigration: () => { success: boolean; report: CategoryMigrationReport; message: string };
  undoCategoryMigration: () => { success: boolean; message: string };
  canUndoCategoryMigration: boolean;
  isCategoryMigrationModalOpen: boolean;
  openCategoryMigrationModal: () => void;
  closeCategoryMigrationModal: () => void;

  // Conto Principale State & Management
  mainAccountConfig: MainAccountConfig;
  updateMainAccountConfig: (newConfig: Partial<MainAccountConfig>) => void;
  mainAccountSummary: MainAccountSummary;
  isAccountConfigModalOpen: boolean;
  openAccountConfigModal: () => void;
  closeAccountConfigModal: () => void;

  // Carta Prepagata State & Management
  prepaidCardConfig: PrepaidCardConfig;
  updatePrepaidCardConfig: (newConfig: Partial<PrepaidCardConfig>) => void;
  prepaidAccountSummary: PrepaidAccountSummary;
  overallLiquiditySummary: OverallLiquiditySummary;
  isPrepaidConfigModalOpen: boolean;
  openPrepaidConfigModal: () => void;
  closePrepaidConfigModal: () => void;

  // Excel Import & Undo Batch
  lastImportBatch: ImportBatch | null;
  importTransactionsBatch: (txs: Omit<Transaction, 'id'>[], filename: string) => { importedCount: number; batchId: string };
  undoLastImport: () => { success: boolean; removedCount: number };
  isImportModalOpen: boolean;
  openImportModal: () => void;
  closeImportModal: () => void;

  // Diagnostics & Reset Personal Data
  diagnosticReport: DiagnosticReport;
  auditLog: AuditLogEntry[];
  clearAuditLog: () => void;
  resetPersonalData: (mode: 'clean_all' | 'remove_demo_only') => { success: boolean; message: string };
  isDiagnosticsModalOpen: boolean;
  openDiagnosticsModal: () => void;
  closeDiagnosticsModal: () => void;
  isResetPersonalModalOpen: boolean;
  openResetPersonalModal: () => void;
  closeResetPersonalModal: () => void;

  // Allocation Plan State & Modifiers
  allocationPlan: AllocationPlan;
  updateAllocationPlan: (plan: Partial<AllocationPlan>) => void;
  updateAllocationRule: (ruleId: string, updatedRule: Partial<AllocationRule>) => void;
  resetAllocationPlan: () => void;

  // Wealth (Patrimonio) State & CRUD
  wealthItems: WealthItem[];
  netWorthHistory: NetWorthHistoryPoint[];
  addWealthItem: (item: Omit<WealthItem, 'id' | 'updatedAt'>) => void;
  updateWealthItem: (id: string, updatedItem: Partial<WealthItem>) => void;
  deleteWealthItem: (id: string) => void;
  wealthMetrics: WealthMetrics;

  // Financial Goals (Obiettivi) State & CRUD
  financialGoals: FinancialGoal[];
  addFinancialGoal: (goal: Omit<FinancialGoal, 'id'>) => void;
  updateFinancialGoal: (id: string, updatedGoal: Partial<FinancialGoal>) => void;
  deleteFinancialGoal: (id: string) => void;
  addGoalContribution: (goalId: string, amount: number) => void;
  goalsMetrics: GoalsMetrics;

  // Global Filters
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;

  // Filtered Data & Aggregated Analytics
  filteredTransactions: Transaction[];
  kpis: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    savingsRate: number; // percentage 0-100
    monthlyBudget: number;
    budgetRemaining: number;
    budgetUsedPercentage: number;
    totalTransfers: number;
  };

  // Transaction Modal Helper
  isModalOpen: boolean;
  modalMode: 'add' | 'edit';
  editingTransaction: Transaction | null;
  openAddModal: () => void;
  openEditModal: (tx: Transaction) => void;
  closeModal: () => void;

  // Backup & Export Features
  lastBackupDate: string | null;
  setLastBackupDate: (date: string | null) => void;
  exportFullBackupJSON: () => { filename: string; sizeBytes: number; backup: BackupData };
  importFullBackupJSON: (jsonString: string) => { success: boolean; message: string };
  restoreFullBackup: (backup: BackupData) => { success: boolean; message: string; details?: any };
  exportTransactionsCSV: () => { filename: string; rowCount: number };
  exportExcelWorkbook: () => { filename: string; sheetNames: string[] };
  performIntegrityCheck: () => IntegrityCheckResult;
  exportWealthCSV: () => void;
  exportGoalsCSV: () => void;
}

const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  year: 'all',
  quarter: 'all',
  month: 'all',
  category: 'all',
  account: 'all',
  type: 'all',
  dateFrom: '',
  dateTo: '',
};

const DEFAULT_MAIN_ACCOUNT_CONFIG: MainAccountConfig = {
  initialBalance: 3400.00,
  initialDate: '2026-07-01',
  accountLabel: 'Conto Corrente Principale',
  maskedNumber: '••••4829',
  isConfigured: true,
  controlBalance: 3075.00,
  controlBalanceDate: '2026-08-16',
  cardDebitMode: 'separate_account',
  linkedMethods: ['Carta prepagata'],
};

const DEFAULT_PREPAID_CARD_CONFIG: PrepaidCardConfig = {
  initialBalance: 0.00,
  initialDate: '2026-07-01',
  accountLabel: 'Carta prepagata',
  maskedNumber: '••••1942',
  isConfigured: true,
  controlBalance: 58.68,
  controlBalanceDate: '2026-08-16',
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const LOCAL_STORAGE_TX_KEY = 'findashboard_transactions_v1';
const LOCAL_STORAGE_PLAN_KEY = 'findashboard_allocation_v1';
const LOCAL_STORAGE_WEALTH_KEY = 'findashboard_wealth_v1';
const LOCAL_STORAGE_GOALS_KEY = 'findashboard_goals_v1';
const LOCAL_STORAGE_HISTORY_KEY = 'findashboard_history_v1';
const LOCAL_STORAGE_MAIN_ACC_KEY = 'findashboard_main_acc_v1';
const LOCAL_STORAGE_PREPAID_KEY = 'findashboard_prepaid_card_v1';
const LOCAL_STORAGE_LAST_BATCH_KEY = 'findashboard_last_batch_v1';
const LOCAL_STORAGE_AUDIT_LOG_KEY = 'findashboard_audit_log_v1';
const LOCAL_STORAGE_IMPORT_SESSIONS_KEY = 'findashboard_import_sessions_v1';

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');

  // Load initial transactions: normalized to real period data if empty
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_TX_KEY);
      if (saved) {
        const parsed: Transaction[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize accounts: map any 'Carta' or 'Carta di Credito' to 'Carta prepagata'
          return parsed.map(tx => {
            if (tx.account === 'Carta' || tx.account === 'Carta di Credito') {
              return { ...tx, account: 'Carta prepagata' as const };
            }
            return tx;
          });
        }
      }
    } catch (e) {
      console.error('Failed to load transactions from localStorage', e);
    }
    // Default to real reconciled transactions
    return REAL_PERIOD_TRANSACTIONS;
  });

  // Undo delete stack
  const [deletedStack, setDeletedStack] = useState<DeletedTransactionsBatch[]>([]);

  // Type Reconstruction Migration state
  const [isTypeMigrationModalOpen, setIsTypeMigrationModalOpen] = useState<boolean>(false);
  const [lastMigrationSnapshot, setLastMigrationSnapshot] = useState<Transaction[] | null>(null);
  const canUndoTypeMigration = Boolean(lastMigrationSnapshot && lastMigrationSnapshot.length > 0);

  // Audit log
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_AUDIT_LOG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load audit log', e);
    }
    return [
      {
        id: `log-audit-01`,
        timestamp: '2026-08-16T18:00:00.000Z',
        action: 'system',
        details: 'Configurazione reale Conto principale (Saldo iniziale: € 3.400,00, Saldo contabile: € 3.075,00)',
      },
      {
        id: `log-audit-02`,
        timestamp: '2026-08-16T18:00:00.000Z',
        action: 'system',
        details: 'Configurazione reale Carta prepagata (Saldo iniziale: € 0,00, Saldo disponibile: € 58,68)',
      },
      {
        id: `log-audit-03`,
        timestamp: '2026-08-16T18:00:00.000Z',
        action: 'system',
        details: 'Inserimento 3 giroconti reali (€ 25,00, € 200,00, € 200,00)',
      },
      {
        id: `log-audit-04`,
        timestamp: '2026-08-16T18:00:00.000Z',
        action: 'system',
        details: 'Riassegnazione 18 spese esistenti alla Carta prepagata (€ 928,00)',
      },
      {
        id: `log-audit-05`,
        timestamp: '2026-08-16T17:59:00.000Z',
        action: 'delete',
        details: 'Rimozione dati demo patrimonio',
      },
      {
        id: `log-audit-06`,
        timestamp: '2026-08-16T17:58:00.000Z',
        action: 'delete',
        details: 'Rimozione dati demo obiettivi',
      },
      {
        id: `log-audit-07`,
        timestamp: '2026-08-16T17:55:00.000Z',
        action: 'create',
        details: 'FinDashboard inizializzato in modalità sicura offline.',
      }
    ];
  });

  // Import sessions list
  const [importSessions, setImportSessions] = useState<{ batchId: string; filename: string; importedAt: string; count: number }[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_IMPORT_SESSIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load import sessions', e);
    }
    return [];
  });

  // Load Conto Principale config
  const [mainAccountConfig, setMainAccountConfig] = useState<MainAccountConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_MAIN_ACC_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_MAIN_ACCOUNT_CONFIG,
          ...parsed,
          initialBalance: parsed.initialBalance !== undefined && parsed.initialBalance > 0 ? parsed.initialBalance : 3400.00,
          controlBalance: parsed.controlBalance !== undefined ? parsed.controlBalance : 3075.00,
          cardDebitMode: 'separate_account',
          linkedMethods: ['Carta prepagata'],
        };
      }
    } catch (e) {
      console.error('Failed to load main account config', e);
    }
    return DEFAULT_MAIN_ACCOUNT_CONFIG;
  });

  // Load Carta Prepagata config
  const [prepaidCardConfig, setPrepaidCardConfig] = useState<PrepaidCardConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PREPAID_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_PREPAID_CARD_CONFIG,
          ...parsed,
          initialBalance: parsed.initialBalance !== undefined ? parsed.initialBalance : 0.00,
          controlBalance: parsed.controlBalance !== undefined ? parsed.controlBalance : 58.68,
        };
      }
    } catch (e) {
      console.error('Failed to load prepaid card config', e);
    }
    return DEFAULT_PREPAID_CARD_CONFIG;
  });

  // Last imported batch tracking for undo
  const [lastImportBatch, setLastImportBatch] = useState<ImportBatch | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_LAST_BATCH_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load last import batch', e);
    }
    return null;
  });

  // Load allocation plan
  const [allocationPlan, setAllocationPlan] = useState<AllocationPlan>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PLAN_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load allocation plan', e);
    }
    return INITIAL_ALLOCATION_PLAN;
  });

  // Load wealth items (Always empty by default, purged of any demo data)
  const [wealthItems, setWealthItems] = useState<WealthItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_WEALTH_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only return if user authored (no demo items)
        if (Array.isArray(parsed) && parsed.length > 0 && !parsed.some(w => w.name?.includes('Demo') || w.name?.includes('Esempio') || w.name?.includes('Appartamento'))) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load wealth items', e);
    }
    return [];
  });

  // Load net worth history
  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthHistoryPoint[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load net worth history', e);
    }
    return [];
  });

  // Load financial goals (Always empty by default, purged of any demo goals)
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_GOALS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only return if user authored
        if (Array.isArray(parsed) && parsed.length > 0 && !parsed.some(g => g.name?.includes('Fondo Emergenza') || g.name?.includes('Casa') || g.name?.includes('Viaggi'))) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load financial goals', e);
    }
    return [];
  });

  // Global filters
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAccountConfigModalOpen, setIsAccountConfigModalOpen] = useState(false);
  const [isPrepaidConfigModalOpen, setIsPrepaidConfigModalOpen] = useState(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [isResetPersonalModalOpen, setIsResetPersonalModalOpen] = useState(false);
  const [isCategoryMigrationModalOpen, setIsCategoryMigrationModalOpen] = useState(false);
  const [canUndoCategoryMigration, setCanUndoCategoryMigration] = useState(() => {
    return Boolean(loadCategoryMigrationBackup());
  });

  // Last Backup Date tracking
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_BACKUP_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  // Helper to log actions
  const addAuditEntry = (action: AuditLogEntry['action'], details: string, count?: number, recordIds?: string[], snapshot?: Transaction[]) => {
    const entry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      details,
      count,
      recordIds,
      recordsSnapshot: snapshot,
    };
    setAuditLog(prev => [entry, ...prev.slice(0, 199)]); // Keep last 200 logs
  };

  const clearAuditLog = () => {
    setAuditLog([]);
  };

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to save transactions', e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_MAIN_ACC_KEY, JSON.stringify(mainAccountConfig));
    } catch (e) {
      console.error('Failed to save main account config', e);
    }
  }, [mainAccountConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_AUDIT_LOG_KEY, JSON.stringify(auditLog));
    } catch (e) {
      console.error('Failed to save audit log', e);
    }
  }, [auditLog]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_IMPORT_SESSIONS_KEY, JSON.stringify(importSessions));
    } catch (e) {
      console.error('Failed to save import sessions', e);
    }
  }, [importSessions]);

  useEffect(() => {
    try {
      if (lastImportBatch) {
        localStorage.setItem(LOCAL_STORAGE_LAST_BATCH_KEY, JSON.stringify(lastImportBatch));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_LAST_BATCH_KEY);
      }
    } catch (e) {
      console.error('Failed to save last import batch', e);
    }
  }, [lastImportBatch]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_PLAN_KEY, JSON.stringify(allocationPlan));
    } catch (e) {
      console.error('Failed to save allocation plan', e);
    }
  }, [allocationPlan]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_WEALTH_KEY, JSON.stringify(wealthItems));
    } catch (e) {
      console.error('Failed to save wealth items', e);
    }
  }, [wealthItems]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(netWorthHistory));
    } catch (e) {
      console.error('Failed to save net worth history', e);
    }
  }, [netWorthHistory]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_GOALS_KEY, JSON.stringify(financialGoals));
    } catch (e) {
      console.error('Failed to save financial goals', e);
    }
  }, [financialGoals]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_PREPAID_KEY, JSON.stringify(prepaidCardConfig));
    } catch (e) {
      console.error('Failed to save prepaid card config', e);
    }
  }, [prepaidCardConfig]);

  // Conto Principale Config Updater
  const updateMainAccountConfig = (newConfig: Partial<MainAccountConfig>) => {
    setMainAccountConfig(prev => {
      const updated = { ...prev, ...newConfig, isConfigured: true };
      addAuditEntry('update', `Aggiornata configurazione Conto Principale (Saldo iniziale: € ${updated.initialBalance}, Data: ${updated.initialDate}, Saldo Controllo: € ${updated.controlBalance ?? 3075.00})`);
      return updated;
    });
  };

  // Carta Prepagata Config Updater
  const updatePrepaidCardConfig = (newConfig: Partial<PrepaidCardConfig>) => {
    setPrepaidCardConfig(prev => {
      const updated = { ...prev, ...newConfig, isConfigured: true };
      addAuditEntry('update', `Aggiornata configurazione Carta Prepagata (Saldo iniziale: € ${updated.initialBalance}, Data: ${updated.initialDate}, Saldo Controllo: € ${updated.controlBalance ?? 58.68})`);
      return updated;
    });
  };

  const openPrepaidConfigModal = () => setIsPrepaidConfigModalOpen(true);
  const closePrepaidConfigModal = () => setIsPrepaidConfigModalOpen(false);

  // Transaction CRUD handlers
  const addTransaction = (txData: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-man-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      source: txData.source || 'Manuale',
      importedAt: new Date().toISOString(),
      originalSignedAmount: txData.type === 'income' ? txData.amount : txData.type === 'expense' ? -txData.amount : 0,
      normalizedAmount: txData.amount,
    };
    setTransactions(prev => [newTx, ...prev]);
    setLastMigrationSnapshot(null); // Invalidates migration undo upon new modifications
    addAuditEntry('create', `Aggiunto movimento manuale: "${newTx.description}" (€ ${newTx.amount.toFixed(2)}) su ${newTx.account}`, 1, [newTx.id]);
  };

  const updateTransaction = (id: string, updatedTx: Partial<Transaction>) => {
    setTransactions(prev => {
      const target = prev.find(t => t.id === id);
      const updated = prev.map(tx => tx.id === id ? { ...tx, ...updatedTx } : tx);
      addAuditEntry('update', `Modificato movimento: "${target?.description || id}"`, 1, [id]);
      return updated;
    });
    setLastMigrationSnapshot(null); // Invalidates migration undo upon new modifications
  };

  const updateTransactionType = (id: string, newType: TransactionType) => {
    setTransactions(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;
      const signed = newType === 'income' ? target.amount : newType === 'expense' ? -target.amount : 0;
      const updated = prev.map(tx => tx.id === id ? {
        ...tx,
        type: newType,
        originalSignedAmount: signed,
        normalizedAmount: tx.amount,
        typeModifiedManually: true,
        typeMigrationReason: `Correzione manuale utente impostata su "${newType}"`,
      } : tx);
      addAuditEntry('update', `Correzione manuale Tipo movimento "${target.description}" (€ ${target.amount.toFixed(2)}): impostato su "${newType === 'income' ? 'Entrata' : newType === 'expense' ? 'Uscita' : newType === 'to_verify' ? 'Da verificare' : 'Giroconto'}"`, 1, [id]);
      return updated;
    });
    setLastMigrationSnapshot(null); // Invalidates migration undo upon manual modification
  };

  const deleteTransaction = (id: string) => {
    const target = transactions.find(tx => tx.id === id);
    if (!target) return;

    setDeletedStack(prev => [{
      timestamp: new Date().toISOString(),
      transactions: [target],
      actionType: 'single',
    }, ...prev.slice(0, 49)]); // Keep last 50 deletions in stack

    setTransactions(prev => prev.filter(tx => tx.id !== id));
    setLastMigrationSnapshot(null); // Invalidates migration undo
    addAuditEntry('delete', `Eliminato movimento "${target.description}" (€ ${target.amount.toFixed(2)}) del ${target.date}`, 1, [id], [target]);
  };

  const deleteTransactionsBulk = (ids: string[]): { deletedCount: number } => {
    if (!ids || ids.length === 0) return { deletedCount: 0 };
    const idSet = new Set(ids);
    const targets = transactions.filter(tx => idSet.has(tx.id));

    if (targets.length === 0) return { deletedCount: 0 };

    setDeletedStack(prev => [{
      timestamp: new Date().toISOString(),
      transactions: targets,
      actionType: 'bulk',
    }, ...prev.slice(0, 49)]);

    setTransactions(prev => prev.filter(tx => !idSet.has(tx.id)));
    setLastMigrationSnapshot(null); // Invalidates migration undo
    addAuditEntry('bulk_delete', `Eliminazione multipla: rimossi ${targets.length} movimenti selezionati`, targets.length, ids, targets);

    return { deletedCount: targets.length };
  };

  const duplicateTransaction = (id: string) => {
    const target = transactions.find(t => t.id === id);
    if (!target) return;
    const duplicated: Transaction = {
      ...target,
      id: `tx-man-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      description: `${target.description} (Copia)`,
      date: new Date().toISOString().split('T')[0],
      source: 'Manuale',
      importedAt: new Date().toISOString(),
    };
    setTransactions(prev => [duplicated, ...prev]);
    setLastMigrationSnapshot(null);
    addAuditEntry('create', `Duplicato movimento "${target.description}" -> "${duplicated.description}"`, 1, [duplicated.id]);
  };

  const importTransactions = (txs: Transaction[]) => {
    setTransactions(prev => [...txs, ...prev]);
    setLastMigrationSnapshot(null);
    addAuditEntry('import', `Importati ${txs.length} movimenti da file JSON`, txs.length);
  };

  // Type Reconstruction Migration Handlers
  const openTypeMigrationModal = () => setIsTypeMigrationModalOpen(true);
  const closeTypeMigrationModal = () => setIsTypeMigrationModalOpen(false);

  const getTypeMigrationPreview = (): TypeMigrationSummary => {
    return generateTypeMigrationPreview(transactions);
  };

  const applyTypeMigration = (manualOverrides: Record<string, TransactionType> = {}): {
    success: boolean;
    summary: TypeMigrationSummary;
    message: string;
  } => {
    // 1. Take snapshot for undo before modifying
    const snapshot: Transaction[] = JSON.parse(JSON.stringify(transactions));
    setLastMigrationSnapshot(snapshot);

    // 2. Execute deterministic migration strictly on existing transactions
    const { updatedTransactions, summary } = executeTypeMigration(transactions, manualOverrides);
    setTransactions(updatedTransactions);

    // 3. Save audit log with timestamp, action and details
    addAuditEntry(
      'migration',
      `Ricostruzione Tipo da segno importo completata: ${summary.incomeCount} Entrate, ${summary.expenseCount} Uscite, ${summary.toVerifyCount} Da verificare su ${summary.totalCount} movimenti analizzati`,
      summary.totalCount,
      updatedTransactions.map(t => t.id)
    );

    return {
      success: true,
      summary,
      message: `Ricostruzione Tipo completata con successo: ${summary.incomeCount} Entrate (+), ${summary.expenseCount} Uscite (-), ${summary.toVerifyCount} Da verificare (0/ambigui).`,
    };
  };

  const undoTypeMigration = (): { success: boolean; message: string } => {
    if (!lastMigrationSnapshot || lastMigrationSnapshot.length === 0) {
      return { success: false, message: 'Nessuna migrazione recente disponibile per il ripristino.' };
    }

    const count = lastMigrationSnapshot.length;
    setTransactions(lastMigrationSnapshot);
    setLastMigrationSnapshot(null);

    addAuditEntry(
      'undo_migration',
      `Annullata migrazione "Ricostruzione Tipo da segno importo": ripristinati ${count} movimenti allo stato precedente`,
      count
    );

    return {
      success: true,
      message: `Migrazione annullata con successo: ripristinati ${count} movimenti allo stato precedente.`,
    };
  };

  // Canonical Category System Functions
  const categoryCatalog = useMemo(() => {
    return buildFullCategoryCatalog(transactions);
  }, [transactions]);

  const categoryDiagnostics = useMemo(() => {
    return runCategoryDiagnostics(transactions);
  }, [transactions]);

  const getCategoryMigrationPreview = () => {
    return migrateTransactionsCategories(transactions).report;
  };

  const applyCategoryMigration = (): { success: boolean; report: CategoryMigrationReport; message: string } => {
    saveCategoryMigrationBackup(transactions);
    setCanUndoCategoryMigration(true);

    const { updatedTransactions, report } = migrateTransactionsCategories(transactions);
    setTransactions(updatedTransactions);

    addAuditEntry(
      'update',
      `Mappatura Categorie completata: allineati ${report.migratedCount} record su ${report.categoryBreakdown.length} categorie canoniche stabili`,
      report.migratedCount,
      updatedTransactions.map(t => t.id),
      transactions
    );

    return {
      success: true,
      report,
      message: `Mappatura canonica categorie applicata con successo a ${report.migratedCount} movimenti (${report.categoryBreakdown.length} categorie distinte identificate).`
    };
  };

  const undoCategoryMigration = (): { success: boolean; message: string } => {
    const backup = loadCategoryMigrationBackup();
    if (!backup || backup.length === 0) {
      return { success: false, message: 'Nessun backup di mappatura categorie disponibile.' };
    }

    setTransactions(backup);
    setCanUndoCategoryMigration(false);
    try {
      localStorage.removeItem('findashboard_category_migration_backup_v1');
    } catch {}

    addAuditEntry(
      'undo_migration',
      `Ripristinato snapshot precedente alla migrazione categorie (${backup.length} movimenti)`,
      backup.length
    );

    return {
      success: true,
      message: `Ripristinato con successo lo snapshot precedente (${backup.length} movimenti ripristinati).`
    };
  };

  const undoLastDelete = (): { success: boolean; restoredCount: number } => {
    if (deletedStack.length === 0) {
      return { success: false, restoredCount: 0 };
    }
    const [lastBatch, ...remainingStack] = deletedStack;
    const restored = lastBatch.transactions;

    setTransactions(prev => {
      // Re-insert without duplicating if somehow already present
      const existingIds = new Set(prev.map(t => t.id));
      const toAdd = restored.filter(t => !existingIds.has(t.id));
      return [...toAdd, ...prev];
    });

    setDeletedStack(remainingStack);
    addAuditEntry('undo_delete', `Annullata eliminazione: ripristinati ${restored.length} movimenti`, restored.length);

    return { success: true, restoredCount: restored.length };
  };

  const importTransactionsBatch = (txs: Omit<Transaction, 'id'>[], filename: string) => {
    const batchId = `batch-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newTxs: Transaction[] = txs.map((t, idx) => {
      const stableId = generateStableTransactionId(
        t.date,
        t.type,
        t.amount,
        t.description,
        t.account,
        idx + 1
      );
      return {
        ...t,
        id: stableId,
        source: 'Excel personale',
        importBatchId: batchId,
        importedAt: timestamp,
      };
    });

    setTransactions(prev => [...newTxs, ...prev]);

    const batchInfo: ImportBatch = {
      id: batchId,
      importedAt: timestamp,
      filename,
      count: newTxs.length,
      transactionIds: newTxs.map(t => t.id),
    };
    setLastImportBatch(batchInfo);

    // Save session in persistent history
    setImportSessions(prev => [
      { batchId, filename, importedAt: timestamp, count: newTxs.length },
      ...prev.slice(0, 49)
    ]);

    addAuditEntry('import', `Importazione Excel completata da "${filename}": ${newTxs.length} movimenti registrati come "Excel personale"`, newTxs.length, newTxs.map(t => t.id));

    return { importedCount: newTxs.length, batchId };
  };

  const undoLastImport = (): { success: boolean; removedCount: number } => {
    if (!lastImportBatch || lastImportBatch.transactionIds.length === 0) {
      return { success: false, removedCount: 0 };
    }
    const idsToRemove = new Set(lastImportBatch.transactionIds);
    const count = idsToRemove.size;

    setTransactions(prev => prev.filter(tx => !idsToRemove.has(tx.id)));
    addAuditEntry('undo_import', `Annullata importazione del batch ${lastImportBatch.id} (${lastImportBatch.filename}): rimossi ${count} movimenti`, count);
    setLastImportBatch(null);

    return { success: true, removedCount: count };
  };

  // Reset Personal Data (Double Confirmed)
  const resetPersonalData = (mode: 'clean_all' | 'remove_demo_only'): { success: boolean; message: string } => {
    if (mode === 'clean_all') {
      const count = transactions.length;
      setTransactions([]);
      setLastImportBatch(null);
      setDeletedStack([]);
      localStorage.removeItem(LOCAL_STORAGE_TX_KEY);
      localStorage.removeItem(LOCAL_STORAGE_LAST_BATCH_KEY);
      addAuditEntry('reset_personal', `Ripristinato archivio personale vuoto (0 movimenti). Rimossi ${count} movimenti precedenti. Impostazioni, patrimonio e allocazione preservati.`);
      return { success: true, message: `Archivio movimenti azzerato con successo: 0 movimenti presenti. Puoi ora effettuare una nuova importazione pulita.` };
    } else {
      // Remove only demo / mock records
      const beforeCount = transactions.length;
      const filtered = transactions.filter(t => {
        const isDemo = t.source === 'Demo' || t.id.startsWith('tx-2025-') || t.id.startsWith('tx-2026-');
        return !isDemo;
      });
      const removedCount = beforeCount - filtered.length;
      setTransactions(filtered);
      addAuditEntry('reset_personal', `Rimossi ${removedCount} record demo dall'archivio. Preservati ${filtered.length} movimenti personali validi.`);
      return { success: true, message: `Rimossi ${removedCount} record demo. Rimangono ${filtered.length} movimenti personali validi nell'archivio.` };
    }
  };

  // Diagnostic Report Aggregation
  const diagnosticReport = useMemo<DiagnosticReport>(() => {
    let excelCount = 0;
    let excelAmount = 0;
    let manualCount = 0;
    let manualAmount = 0;
    let demoCount = 0;
    let demoAmount = 0;
    let otherCount = 0;
    let otherAmount = 0;

    transactions.forEach(t => {
      const s = t.source || 'Manuale';
      if (s === 'Excel personale' || t.id.startsWith('tx-xls-') || t.id.startsWith('tx-imp-')) {
        excelCount++;
        excelAmount += t.amount;
      } else if (s === 'Manuale') {
        manualCount++;
        manualAmount += t.amount;
      } else if (s === 'Demo' || t.id.startsWith('tx-2025-') || t.id.startsWith('tx-2026-')) {
        demoCount++;
        demoAmount += t.amount;
      } else {
        otherCount++;
        otherAmount += t.amount;
      }
    });

    // Count excluded from active filter KPIs
    const excludedFromKpisCount = transactions.length - transactions.filter(tx => {
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const m1 = tx.description.toLowerCase().includes(q);
        const m2 = tx.category.toLowerCase().includes(q);
        const m3 = (tx.notes || '').toLowerCase().includes(q);
        if (!m1 && !m2 && !m3) return false;
      }
      if (filters.year !== 'all') {
        if (!tx.date.startsWith(filters.year)) return false;
      }
      if (filters.category !== 'all' && tx.category !== filters.category) return false;
      if (filters.account !== 'all' && tx.account !== filters.account) return false;
      if (filters.type !== 'all' && tx.type !== filters.type) return false;
      return true;
    }).length;

    return {
      totalRecords: transactions.length,
      bySource: {
        excelCount,
        excelAmount,
        manualCount,
        manualAmount,
        demoCount,
        demoAmount,
        otherCount,
        otherAmount,
      },
      importSessions,
      excludedFromKpisCount,
    };
  }, [transactions, importSessions, filters]);

  // Filter Updater
  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // 1. Text Search Query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matchDesc = tx.description.toLowerCase().includes(q);
        const matchCat = tx.category.toLowerCase().includes(q);
        const matchSub = tx.subcategory ? tx.subcategory.toLowerCase().includes(q) : false;
        const matchNotes = tx.notes ? tx.notes.toLowerCase().includes(q) : false;
        const matchTags = tx.tags ? tx.tags.some(t => t.toLowerCase().includes(q)) : false;
        if (!matchDesc && !matchCat && !matchSub && !matchNotes && !matchTags) {
          return false;
        }
      }

      // 2. Date filtering
      const txDate = tx.date; // YYYY-MM-DD
      const [year, month] = txDate.split('-');

      if (filters.year !== 'all' && year !== filters.year) {
        return false;
      }

      if (filters.month !== 'all' && month !== filters.month) {
        return false;
      }

      if (filters.quarter !== 'all') {
        const m = parseInt(month, 10);
        let q = 'Q1';
        if (m >= 4 && m <= 6) q = 'Q2';
        else if (m >= 7 && m <= 9) q = 'Q3';
        else if (m >= 10 && m <= 12) q = 'Q4';

        if (q !== filters.quarter) {
          return false;
        }
      }

      if (filters.dateFrom && txDate < filters.dateFrom) {
        return false;
      }

      if (filters.dateTo && txDate > filters.dateTo) {
        return false;
      }

      // 3. Category Filter
      if (filters.category !== 'all' && tx.category !== filters.category) {
        return false;
      }

      // 4. Account Filter
      if (filters.account !== 'all' && tx.account !== filters.account) {
        return false;
      }

      // 5. Type Filter
      if (filters.type !== 'all' && tx.type !== filters.type) {
        return false;
      }

      return true;
    });
  }, [transactions, filters]);

  // Aggregated KPIs for filtered transactions (Totale globale)
  const kpis = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalTransfers = 0;

    filteredTransactions.forEach(tx => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpense += tx.amount;
      } else if (tx.type === 'transfer') {
        totalTransfers += tx.amount;
      }
    });

    const netBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.min(100, Math.round(((totalIncome - totalExpense) / totalIncome) * 100))) : 0;
    const monthlyBudget = 2500; // standard monthly benchmark budget
    const budgetRemaining = Math.max(0, monthlyBudget - totalExpense);
    const budgetUsedPercentage = Math.round((totalExpense / monthlyBudget) * 100);

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netBalance: Math.round(netBalance * 100) / 100,
      savingsRate,
      monthlyBudget,
      budgetRemaining,
      budgetUsedPercentage,
      totalTransfers: Math.round(totalTransfers * 100) / 100,
    };
  }, [filteredTransactions]);

  // Conto Principale Real-Time Automated Balance & Reconciliation Engine
  const mainAccountSummary = useMemo<MainAccountSummary>(() => {
    const { 
      initialBalance = 3075.00, 
      initialDate = '2026-07-01', 
      controlBalance = 2247.00,
      cardDebitMode = 'direct_debit',
    } = mainAccountConfig;

    const isCardLinked = cardDebitMode === 'direct_debit';

    // Helper to check if a transaction belongs to the Conto Principale domain
    const isTxLinkedToMainAccount = (tx: Transaction): boolean => {
      if (tx.account === 'Conto Principale') return true;
      if (isCardLinked && (tx.account === 'Carta' || tx.account === 'Carta di Credito')) {
        return true;
      }
      return false;
    };

    // 1. ALL-TIME TRANSACTIONS (from initialDate)
    const allRelevantTxs = transactions
      .filter(tx => tx.date >= initialDate && isTxLinkedToMainAccount(tx))
      .sort((a, b) => a.date.localeCompare(b.date));

    let totalIncome = 0;
    let incomeCount = 0;

    let expenseDirectAmount = 0;
    let expenseDirectCount = 0;
    let expenseCardAmount = 0;
    let expenseCardCount = 0;

    let transfersIn = 0;
    let transfersOut = 0;
    let transfersCount = 0;

    let rollingBalance = initialBalance;
    const runningHistory: { date: string; description: string; amount: number; type: TransactionType; balance: number; account: string }[] = [
      {
        date: initialDate,
        description: 'Saldo iniziale configurato',
        amount: initialBalance,
        type: 'income',
        balance: initialBalance,
        account: 'Conto Principale',
      }
    ];

    allRelevantTxs.forEach(tx => {
      const isCard = tx.account === 'Carta' || tx.account === 'Carta di Credito';
      const normAmt = tx.normalizedAmount ?? tx.amount;

      if (tx.type === 'income') {
        incomeCount++;
        totalIncome += normAmt;
        rollingBalance += normAmt;
      } else if (tx.type === 'expense') {
        if (isCard) {
          expenseCardCount++;
          expenseCardAmount += normAmt;
        } else {
          expenseDirectCount++;
          expenseDirectAmount += normAmt;
        }
        rollingBalance -= normAmt;
      } else if (tx.type === 'transfer') {
        transfersCount++;
        const desc = (tx.description + ' ' + (tx.subcategory || '')).toLowerCase();
        if (desc.includes('entrata') || desc.includes('in') || desc.includes('accredito') || desc.includes('+')) {
          transfersIn += normAmt;
          rollingBalance += normAmt;
        } else {
          transfersOut += normAmt;
          rollingBalance -= normAmt;
        }
      }

      runningHistory.push({
        date: tx.date,
        description: tx.description,
        amount: normAmt,
        type: tx.type,
        balance: Math.round(rollingBalance * 100) / 100,
        account: tx.account,
      });
    });

    const totalExpense = Math.round((expenseDirectAmount + expenseCardAmount) * 100) / 100;
    const expenseCount = expenseDirectCount + expenseCardCount;
    const netTransfers = Math.round((transfersIn - transfersOut) * 100) / 100;
    const currentBalance = Math.round((initialBalance + totalIncome - totalExpense + netTransfers) * 100) / 100;
    const delta = Math.round((currentBalance - controlBalance) * 100) / 100;
    const isReconciled = Math.abs(delta) < 0.01;

    // 2. PERIOD-FILTERED METRICS (respecting global filters: year, month, quarter, search, etc.)
    let periodIncome = 0;
    let periodIncomeCount = 0;
    let periodExpense = 0;
    let periodExpenseCount = 0;
    let periodTransfersIn = 0;
    let periodTransfersOut = 0;
    let periodTxCount = 0;

    filteredTransactions.forEach(tx => {
      if (isTxLinkedToMainAccount(tx)) {
        periodTxCount++;
        const normAmt = tx.normalizedAmount ?? tx.amount;
        if (tx.type === 'income') {
          periodIncomeCount++;
          periodIncome += normAmt;
        } else if (tx.type === 'expense') {
          periodExpenseCount++;
          periodExpense += normAmt;
        } else if (tx.type === 'transfer') {
          const desc = (tx.description + ' ' + (tx.subcategory || '')).toLowerCase();
          if (desc.includes('entrata') || desc.includes('in') || desc.includes('accredito') || desc.includes('+')) {
            periodTransfersIn += normAmt;
          } else {
            periodTransfersOut += normAmt;
          }
        }
      }
    });

    const periodNetTransfers = Math.round((periodTransfersIn - periodTransfersOut) * 100) / 100;
    const periodNetFlow = Math.round((periodIncome - periodExpense + periodNetTransfers) * 100) / 100;

    return {
      config: mainAccountConfig,
      initialBalance,
      initialDate,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense,
      expenseDirectCount,
      expenseDirectAmount: Math.round(expenseDirectAmount * 100) / 100,
      expenseCardCount,
      expenseCardAmount: Math.round(expenseCardAmount * 100) / 100,
      transfersIn: Math.round(transfersIn * 100) / 100,
      transfersOut: Math.round(transfersOut * 100) / 100,
      netTransfers,
      currentBalance,
      txCount: allRelevantTxs.length,
      incomeCount,
      expenseCount,
      transfersCount,
      controlBalance,
      controlBalanceDate: mainAccountConfig.controlBalanceDate || '2026-08-16',
      reconciliationDelta: delta,
      isReconciled,
      periodIncome: Math.round(periodIncome * 100) / 100,
      periodExpense: Math.round(periodExpense * 100) / 100,
      periodTransfersIn: Math.round(periodTransfersIn * 100) / 100,
      periodTransfersOut: Math.round(periodTransfersOut * 100) / 100,
      periodNetTransfers,
      periodNetFlow,
      periodTxCount,
      periodIncomeCount,
      periodExpenseCount,
      runningHistory,
    };
  }, [transactions, filteredTransactions, mainAccountConfig]);

  // Carta Prepagata Real-Time Automated Balance & Reconciliation Engine
  const prepaidAccountSummary = useMemo<PrepaidAccountSummary>(() => {
    const {
      initialBalance = 0.00,
      initialDate = '2026-07-01',
      controlBalance = 58.68,
    } = prepaidCardConfig;

    const isTxLinkedToPrepaid = (tx: Transaction): boolean => {
      return tx.account === 'Carta prepagata' || tx.account === 'Carta' || tx.account === 'Carta di Credito';
    };

    // 1. ALL-TIME CARD EXPENSES (from initialDate)
    const cardExpenses = transactions
      .filter(tx => tx.date >= initialDate && isTxLinkedToPrepaid(tx) && tx.type === 'expense')
      .sort((a, b) => a.date.localeCompare(b.date));

    // Recharges are transfers targeting the prepaid card
    const recharges = transactions
      .filter(tx => tx.date >= initialDate && tx.type === 'transfer' && (
        tx.account === 'Carta prepagata' ||
        tx.description.toLowerCase().includes('carta') ||
        tx.description.toLowerCase().includes('ricarica') ||
        tx.subcategory?.toLowerCase().includes('ricarica')
      ))
      .sort((a, b) => a.date.localeCompare(b.date));

    let totalExpenses = 0;
    cardExpenses.forEach(tx => {
      totalExpenses += (tx.normalizedAmount ?? tx.amount);
    });

    let totalRecharges = 0;
    recharges.forEach(tx => {
      totalRecharges += (tx.normalizedAmount ?? tx.amount);
    });

    const currentBalance = Math.round((initialBalance + totalRecharges - totalExpenses) * 100) / 100;
    const delta = Math.round((currentBalance - controlBalance) * 100) / 100;
    const isReconciled = Math.abs(delta) < 0.01;

    // Running History
    let rollingBalance = initialBalance;
    const runningHistory: { date: string; description: string; amount: number; type: TransactionType; balance: number }[] = [
      {
        date: initialDate,
        description: 'Saldo iniziale configurato',
        amount: initialBalance,
        type: 'income',
        balance: initialBalance,
      }
    ];

    const allCardEvents = [
      ...recharges.map(r => ({ ...r, eventType: 'recharge' as const })),
      ...cardExpenses.map(e => ({ ...e, eventType: 'expense' as const }))
    ].sort((a, b) => a.date.localeCompare(b.date));

    allCardEvents.forEach(evt => {
      const normAmt = evt.normalizedAmount ?? evt.amount;
      if (evt.eventType === 'recharge') {
        rollingBalance += normAmt;
        runningHistory.push({
          date: evt.date,
          description: evt.description,
          amount: normAmt,
          type: 'transfer',
          balance: Math.round(rollingBalance * 100) / 100,
        });
      } else {
        rollingBalance -= normAmt;
        runningHistory.push({
          date: evt.date,
          description: evt.description,
          amount: normAmt,
          type: 'expense',
          balance: Math.round(rollingBalance * 100) / 100,
        });
      }
    });

    // Period metrics
    let periodExpenses = 0;
    let periodExpensesCount = 0;
    let periodRecharges = 0;
    let periodRechargesCount = 0;

    filteredTransactions.forEach(tx => {
      const normAmt = tx.normalizedAmount ?? tx.amount;
      if (tx.type === 'expense' && isTxLinkedToPrepaid(tx)) {
        periodExpensesCount++;
        periodExpenses += normAmt;
      } else if (tx.type === 'transfer' && (
        tx.account === 'Carta prepagata' ||
        tx.description.toLowerCase().includes('carta') ||
        tx.description.toLowerCase().includes('ricarica') ||
        tx.subcategory?.toLowerCase().includes('ricarica')
      )) {
        periodRechargesCount++;
        periodRecharges += normAmt;
      }
    });

    return {
      config: prepaidCardConfig,
      initialBalance,
      initialDate,
      totalRecharges: Math.round(totalRecharges * 100) / 100,
      rechargesCount: recharges.length,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      expensesCount: cardExpenses.length,
      currentBalance,
      controlBalance,
      controlBalanceDate: prepaidCardConfig.controlBalanceDate || '2026-08-16',
      reconciliationDelta: delta,
      isReconciled,
      periodRecharges: Math.round(periodRecharges * 100) / 100,
      periodRechargesCount,
      periodExpenses: Math.round(periodExpenses * 100) / 100,
      periodExpensesCount,
      runningHistory,
    };
  }, [transactions, filteredTransactions, prepaidCardConfig]);

  // Overall Liquidity Summary
  const overallLiquiditySummary = useMemo<OverallLiquiditySummary>(() => {
    const mainAccBal = mainAccountSummary.currentBalance;
    const prepCardBal = prepaidAccountSummary.currentBalance;
    const totalLiquidity = Math.round((mainAccBal + prepCardBal) * 100) / 100;
    const totalControl = Math.round((mainAccountSummary.controlBalance + prepaidAccountSummary.controlBalance) * 100) / 100;
    const totalDelta = Math.round((totalLiquidity - totalControl) * 100) / 100;
    const isReconciled = mainAccountSummary.isReconciled && prepaidAccountSummary.isReconciled;

    return {
      mainAccountBalance: mainAccBal,
      prepaidCardBalance: prepCardBal,
      totalLiquidity,
      totalControlBalance: totalControl,
      totalDelta,
      isReconciled,
    };
  }, [mainAccountSummary, prepaidAccountSummary]);

  // Allocation Plan handlers
  const updateAllocationPlan = (planChanges: Partial<AllocationPlan>) => {
    setAllocationPlan(prev => ({ ...prev, ...planChanges }));
  };

  const updateAllocationRule = (ruleId: string, updatedRule: Partial<AllocationRule>) => {
    setAllocationPlan(prev => ({
      ...prev,
      rules: prev.rules.map(r => r.id === ruleId ? { ...r, ...updatedRule } : r)
    }));
  };

  const resetAllocationPlan = () => {
    setAllocationPlan(INITIAL_ALLOCATION_PLAN);
  };

  // Wealth Handlers
  const addWealthItem = (itemData: Omit<WealthItem, 'id' | 'updatedAt'>) => {
    const newItem: WealthItem = {
      ...itemData,
      id: `w-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setWealthItems(prev => [newItem, ...prev]);
  };

  const updateWealthItem = (id: string, updatedItem: Partial<WealthItem>) => {
    setWealthItems(prev => prev.map(w => w.id === id ? { 
      ...w, 
      ...updatedItem, 
      updatedAt: new Date().toISOString().split('T')[0] 
    } : w));
  };

  const deleteWealthItem = (id: string) => {
    setWealthItems(prev => prev.filter(w => w.id !== id));
  };

  // Financial Goals Handlers
  const addFinancialGoal = (goalData: Omit<FinancialGoal, 'id'>) => {
    const newGoal: FinancialGoal = {
      ...goalData,
      id: `g-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: goalData.currentAmount >= goalData.targetAmount ? 'completed' : 'in_progress',
    };
    setFinancialGoals(prev => [newGoal, ...prev]);
  };

  const updateFinancialGoal = (id: string, updatedGoal: Partial<FinancialGoal>) => {
    setFinancialGoals(prev => prev.map(g => {
      if (g.id !== id) return g;
      const combined = { ...g, ...updatedGoal };
      combined.status = combined.currentAmount >= combined.targetAmount ? 'completed' : 'in_progress';
      return combined;
    }));
  };

  const deleteFinancialGoal = (id: string) => {
    setFinancialGoals(prev => prev.filter(g => g.id !== id));
  };

  const addGoalContribution = (goalId: string, amount: number) => {
    if (amount <= 0) return;
    setFinancialGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g;
      const newAmount = g.currentAmount + amount;
      return {
        ...g,
        currentAmount: newAmount,
        status: newAmount >= g.targetAmount ? 'completed' : 'in_progress',
      };
    }));
  };

  // Wealth Metrics Calculation
  const wealthMetrics = useMemo<WealthMetrics>(() => {
    let totalLiquidity = 0;
    let totalInvestments = 0;
    let totalAssets = 0;
    let totalLiabilities = 0;

    wealthItems.forEach(item => {
      if (item.type === 'liquidity') totalLiquidity += item.value;
      else if (item.type === 'investment') totalInvestments += item.value;
      else if (item.type === 'asset') totalAssets += item.value;
      else if (item.type === 'liability') totalLiabilities += item.value;
    });

    const grossWealth = totalLiquidity + totalInvestments + totalAssets;
    const netWorth = grossWealth - totalLiabilities;
    const debtToAssetRatio = grossWealth > 0 ? Math.round((totalLiabilities / grossWealth) * 1000) / 10 : 0;
    const monthlyAverageBurn = 1800; // estimated monthly living expense
    const liquidRunwayMonths = Math.round((totalLiquidity / monthlyAverageBurn) * 10) / 10;
    const investmentsShare = grossWealth > 0 ? Math.round((totalInvestments / grossWealth) * 100) : 0;
    const liquidityShare = grossWealth > 0 ? Math.round((totalLiquidity / grossWealth) * 100) : 0;

    return {
      totalLiquidity,
      totalInvestments,
      totalAssets,
      totalLiabilities,
      grossWealth,
      netWorth,
      debtToAssetRatio,
      liquidRunwayMonths,
      investmentsShare,
      liquidityShare,
    };
  }, [wealthItems]);

  // Goals Metrics Calculation
  const goalsMetrics = useMemo<GoalsMetrics>(() => {
    const totalGoalsCount = financialGoals.length;
    const completedGoalsCount = financialGoals.filter(g => g.currentAmount >= g.targetAmount || g.status === 'completed').length;
    const inProgressGoalsCount = totalGoalsCount - completedGoalsCount;
    const totalTargetAmount = financialGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSavedAmount = financialGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    const totalRemainingAmount = Math.max(0, totalTargetAmount - totalSavedAmount);
    const overallProgressPercent = totalTargetAmount > 0 ? Math.min(100, Math.round((totalSavedAmount / totalTargetAmount) * 100)) : 0;

    return {
      totalGoalsCount,
      completedGoalsCount,
      inProgressGoalsCount,
      totalTargetAmount,
      totalSavedAmount,
      totalRemainingAmount,
      overallProgressPercent,
    };
  }, [financialGoals]);

  // Modal actions
  const openAddModal = () => {
    setModalMode('add');
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tx: Transaction) => {
    setModalMode('edit');
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const openImportModal = () => setIsImportModalOpen(true);
  const closeImportModal = () => setIsImportModalOpen(false);

  const openAccountConfigModal = () => setIsAccountConfigModalOpen(true);
  const closeAccountConfigModal = () => setIsAccountConfigModalOpen(false);

  const openDiagnosticsModal = () => setIsDiagnosticsModalOpen(true);
  const closeDiagnosticsModal = () => setIsDiagnosticsModalOpen(false);

  const openResetPersonalModal = () => setIsResetPersonalModalOpen(true);
  const closeResetPersonalModal = () => setIsResetPersonalModalOpen(false);

  const openCategoryMigrationModal = () => setIsCategoryMigrationModalOpen(true);
  const closeCategoryMigrationModal = () => setIsCategoryMigrationModalOpen(false);

  // Backup handlers
  const exportFullBackupJSON = () => {
    const res = exportJSONUtil({
      transactions,
      mainAccountConfig,
      prepaidCardConfig,
      allocationPlan,
      wealthItems,
      financialGoals,
      auditLogs: auditLog,
    });
    setLastBackupDate(res.backup.createdAt);
    addAuditEntry('import', `Esportato backup JSON completo (${transactions.length} movimenti, nome file: ${res.filename})`);
    return res;
  };

  const exportTransactionsCSV = () => {
    const res = exportCSVUtil(transactions);
    addAuditEntry('import', `Esportati ${transactions.length} movimenti in CSV (nome file: ${res.filename})`);
    return res;
  };

  const exportExcelWorkbook = () => {
    const res = exportExcelUtil({
      transactions,
      mainAccountConfig,
      allocationPlan,
      wealthItems,
      financialGoals,
    });
    addAuditEntry('import', `Esportati dati completi in Excel con 6 fogli (nome file: ${res.filename})`);
    return res;
  };

  const performIntegrityCheck = (): IntegrityCheckResult => {
    return performIntegrityCheckUtil({
      transactions,
      mainAccountConfig,
      allocationPlan,
      wealthItems,
      financialGoals,
      auditLogs: auditLog,
    });
  };

  const restoreFullBackup = (backup: BackupData): { success: boolean; message: string; details?: any } => {
    try {
      if (!backup || !Array.isArray(backup.transactions)) {
        return { success: false, message: 'Dati di backup non validi: archivio transazioni assente.' };
      }

      // 1. Transactions
      setTransactions(backup.transactions);
      try {
        localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(backup.transactions));
      } catch (e) {
        console.error('Failed to save transactions to localStorage', e);
      }

      // 2. Main account config
      if (backup.mainAccountConfig) {
        setMainAccountConfig(backup.mainAccountConfig);
        try {
          localStorage.setItem(LOCAL_STORAGE_MAIN_ACC_KEY, JSON.stringify(backup.mainAccountConfig));
        } catch (e) {
          console.error('Failed to save mainAccountConfig to localStorage', e);
        }
      }

      // 2b. Prepaid card config
      if (backup.prepaidCardConfig) {
        setPrepaidCardConfig(backup.prepaidCardConfig);
        try {
          localStorage.setItem(LOCAL_STORAGE_PREPAID_KEY, JSON.stringify(backup.prepaidCardConfig));
        } catch (e) {
          console.error('Failed to save prepaidCardConfig to localStorage', e);
        }
      }

      // 3. Allocation plan
      if (backup.allocationPlan) {
        setAllocationPlan(backup.allocationPlan);
        try {
          localStorage.setItem(LOCAL_STORAGE_PLAN_KEY, JSON.stringify(backup.allocationPlan));
        } catch (e) {
          console.error('Failed to save allocationPlan to localStorage', e);
        }
      }

      // 4. Wealth Items
      const wealth = backup.wealthAssets || backup.wealthItems;
      if (wealth && Array.isArray(wealth)) {
        setWealthItems(wealth);
        try {
          localStorage.setItem(LOCAL_STORAGE_WEALTH_KEY, JSON.stringify(wealth));
        } catch (e) {
          console.error('Failed to save wealthItems to localStorage', e);
        }
      }

      // 5. Financial Goals
      if (backup.financialGoals && Array.isArray(backup.financialGoals)) {
        setFinancialGoals(backup.financialGoals);
        try {
          localStorage.setItem(LOCAL_STORAGE_GOALS_KEY, JSON.stringify(backup.financialGoals));
        } catch (e) {
          console.error('Failed to save financialGoals to localStorage', e);
        }
      }

      // 6. Presets
      if (backup.importPresets && Array.isArray(backup.importPresets)) {
        try {
          localStorage.setItem('findashboard_excel_mapping_presets_v1', JSON.stringify(backup.importPresets));
        } catch (e) {
          console.error('Failed to save presets to localStorage', e);
        }
      }

      // 7. Update last backup date
      const backupDate = backup.createdAt || backup.exportDate || new Date().toISOString();
      setLastBackupDate(backupDate);
      try {
        localStorage.setItem(LAST_BACKUP_STORAGE_KEY, backupDate);
      } catch (e) {
        console.error('Failed to update last backup date', e);
      }

      // 8. Add Audit entry
      addAuditEntry(
        'import',
        `Ripristino completo backup JSON (${backup.transactions.length} movimenti, ${wealth?.length || 0} voci patrimonio, ${backup.financialGoals?.length || 0} obiettivi)`
      );

      return {
        success: true,
        message: `Backup ripristinato con successo! Caricati ${backup.transactions.length} movimenti e tutti i parametri personali.`,
        details: {
          transactionsCount: backup.transactions.length,
          wealthCount: wealth?.length || 0,
          goalsCount: backup.financialGoals?.length || 0,
          createdAt: backupDate,
        }
      };
    } catch (e: any) {
      return { success: false, message: `Errore durante il ripristino del backup: ${e.message}` };
    }
  };

  const importFullBackupJSON = (jsonString: string): { success: boolean; message: string } => {
    try {
      const data: BackupData = JSON.parse(jsonString);
      return restoreFullBackup(data);
    } catch (e: any) {
      return { success: false, message: `Errore durante il parsing del JSON: ${e.message}` };
    }
  };

  const exportWealthCSV = () => {
    const headers = ['Nome Asset', 'Tipologia', 'Categoria', 'Valore EUR', 'Istituto', 'Data Aggiornamento', 'Note'];
    const rows = wealthItems.map(w => [
      `"${w.name.replace(/"/g, '""')}"`,
      w.type,
      `"${w.category}"`,
      w.value.toString().replace('.', ','),
      `"${w.institution || ''}"`,
      w.updatedAt,
      `"${(w.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `patrimonio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportGoalsCSV = () => {
    const headers = ['Obiettivo', 'Importo Target EUR', 'Importo Raggiunto EUR', 'Progresso %', 'Data Obiettivo', 'Priorita', 'Categoria'];
    const rows = financialGoals.map(g => [
      `"${g.name.replace(/"/g, '""')}"`,
      g.targetAmount.toString().replace('.', ','),
      g.currentAmount.toString().replace('.', ','),
      `${Math.round((g.currentAmount / g.targetAmount) * 100)}%`,
      g.targetDate,
      g.priority,
      g.category
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `obiettivi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <FinanceContext.Provider value={{
      activePage,
      setActivePage,
      transactions,
      addTransaction,
      updateTransaction,
      updateTransactionType,
      deleteTransaction,
      deleteTransactionsBulk,
      duplicateTransaction,
      importTransactions,
      undoLastDelete,
      canUndoDelete: deletedStack.length > 0,
      lastDeletedCount: deletedStack[0]?.transactions.length || 0,
      canUndoTypeMigration,
      isTypeMigrationModalOpen,
      openTypeMigrationModal,
      closeTypeMigrationModal,
      getTypeMigrationPreview,
      applyTypeMigration,
      undoTypeMigration,
      categoryCatalog,
      categoryDiagnostics,
      getCategoryMigrationPreview,
      applyCategoryMigration,
      undoCategoryMigration,
      canUndoCategoryMigration,
      isCategoryMigrationModalOpen,
      openCategoryMigrationModal,
      closeCategoryMigrationModal,
      mainAccountConfig,
      updateMainAccountConfig,
      mainAccountSummary,
      isAccountConfigModalOpen,
      openAccountConfigModal,
      closeAccountConfigModal,
      prepaidCardConfig,
      updatePrepaidCardConfig,
      prepaidAccountSummary,
      overallLiquiditySummary,
      isPrepaidConfigModalOpen,
      openPrepaidConfigModal,
      closePrepaidConfigModal,
      lastImportBatch,
      importTransactionsBatch,
      undoLastImport,
      isImportModalOpen,
      openImportModal,
      closeImportModal,
      diagnosticReport,
      auditLog,
      clearAuditLog,
      resetPersonalData,
      isDiagnosticsModalOpen,
      openDiagnosticsModal,
      closeDiagnosticsModal,
      isResetPersonalModalOpen,
      openResetPersonalModal,
      closeResetPersonalModal,
      allocationPlan,
      updateAllocationPlan,
      updateAllocationRule,
      resetAllocationPlan,
      wealthItems,
      netWorthHistory,
      addWealthItem,
      updateWealthItem,
      deleteWealthItem,
      wealthMetrics,
      financialGoals,
      addFinancialGoal,
      updateFinancialGoal,
      deleteFinancialGoal,
      addGoalContribution,
      goalsMetrics,
      filters,
      setFilters,
      updateFilter,
      resetFilters,
      filteredTransactions,
      kpis,
      isModalOpen,
      modalMode,
      editingTransaction,
      openAddModal,
      openEditModal,
      closeModal,
      lastBackupDate,
      setLastBackupDate,
      exportFullBackupJSON,
      importFullBackupJSON,
      restoreFullBackup,
      exportTransactionsCSV,
      exportExcelWorkbook,
      performIntegrityCheck,
      exportWealthCSV,
      exportGoalsCSV,
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = (): FinanceContextType => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
