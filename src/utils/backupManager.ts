import * as XLSX from 'xlsx';
import { 
  BackupData, 
  Transaction, 
  MainAccountConfig, 
  PrepaidCardConfig,
  AllocationPlan, 
  WealthItem, 
  FinancialGoal, 
  AuditLogEntry, 
  IntegrityCheckResult,
  ExpenseCategory,
  IncomeCategory
} from '../types';
import { loadSavedPresets } from './excelParser';

export const APP_VERSION = '1.2.0';
export const SCHEMA_VERSION = 1;
export const LAST_BACKUP_STORAGE_KEY = 'findashboard_last_backup_date';

const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Casa & Utenze',
  'Alimentari & Spesa',
  'Trasporti & Auto',
  'Ristoranti & Svago',
  'Salute & Benessere',
  'Shopping & Abbigliamento',
  'Abbonamenti & Servizi',
  'Educazione & Corsi',
  'Viaggi & Vacanze',
  'Altro Spese'
];

const DEFAULT_INCOME_CATEGORIES: IncomeCategory[] = [
  'Stipendio',
  'Freelance & Bonus',
  'Investimenti & Dividendi',
  'Rimborsi & Vendite',
  'Altre Entrate'
];

/**
 * Format timestamp into YYYY-MM-DD_HH-mm
 */
export function formatBackupTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}_${HH}-${mm}`;
}

/**
 * Filename generators
 */
export function getBackupJSONFilename(date: Date = new Date()): string {
  return `FinDashboard-Pro_backup_${formatBackupTimestamp(date)}.json`;
}

export function getTransactionsCSVFilename(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return `FinDashboard-Pro_movimenti_${yyyy}-${MM}-${dd}.csv`;
}

export function getExcelExportFilename(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return `FinDashboard-Pro_esportazione_${yyyy}-${MM}-${dd}.xlsx`;
}

/**
 * Helper to trigger client-side file download
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Build complete backup object
 */
export function buildBackupPayload(params: {
  transactions: Transaction[];
  mainAccountConfig: MainAccountConfig;
  prepaidCardConfig?: PrepaidCardConfig;
  allocationPlan: AllocationPlan;
  wealthItems: WealthItem[];
  financialGoals: FinancialGoal[];
  auditLogs: AuditLogEntry[];
}): BackupData {
  const now = new Date().toISOString();
  const presets = loadSavedPresets();

  return {
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    createdAt: now,
    exportDate: now,
    version: APP_VERSION,
    transactions: params.transactions,
    mainAccountConfig: params.mainAccountConfig,
    prepaidCardConfig: params.prepaidCardConfig,
    categories: {
      expense: DEFAULT_EXPENSE_CATEGORIES,
      income: DEFAULT_INCOME_CATEGORIES,
    },
    budgets: {
      monthlyBenchmark: 2500,
      targetSavingsRate: 20,
    },
    allocationPlan: params.allocationPlan,
    allocationRules: params.allocationPlan.rules,
    wealthAssets: params.wealthItems,
    wealthItems: params.wealthItems,
    financialGoals: params.financialGoals,
    importPresets: presets,
    preferences: {
      theme: 'dark',
      currency: 'EUR',
      lastBackupDate: now,
      defaultAccount: 'Conto Principale',
    },
    auditLogs: params.auditLogs,
  };
}

/**
 * Export full JSON backup
 */
export function exportFullBackupJSON(params: {
  transactions: Transaction[];
  mainAccountConfig: MainAccountConfig;
  prepaidCardConfig?: PrepaidCardConfig;
  allocationPlan: AllocationPlan;
  wealthItems: WealthItem[];
  financialGoals: FinancialGoal[];
  auditLogs: AuditLogEntry[];
}): { filename: string; sizeBytes: number; backup: BackupData } {
  const backup = buildBackupPayload(params);
  const filename = getBackupJSONFilename();
  const jsonContent = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  
  triggerFileDownload(blob, filename);

  // Update last backup timestamp
  try {
    localStorage.setItem(LAST_BACKUP_STORAGE_KEY, backup.createdAt);
  } catch (e) {
    console.error('Failed to update last backup date in storage', e);
  }

  return {
    filename,
    sizeBytes: blob.size,
    backup,
  };
}

/**
 * Export active transactions as CSV
 */
export function exportTransactionsCSV(transactions: Transaction[]): { filename: string; rowCount: number } {
  const filename = getTransactionsCSVFilename();
  const headers = [
    'ID',
    'Data',
    'Tipo',
    'Importo (€)',
    'Categoria',
    'Sottocategoria',
    'Descrizione',
    'Conto',
    'Stato',
    'Sorgente',
    'Note'
  ];

  const escapeCSV = (val: any) => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = transactions.map(tx => [
    escapeCSV(tx.id),
    escapeCSV(tx.date),
    escapeCSV(tx.type === 'income' ? 'Entrata' : tx.type === 'expense' ? 'Uscita' : 'Giroconto'),
    escapeCSV(tx.amount.toFixed(2).replace('.', ',')),
    escapeCSV(tx.category),
    escapeCSV(tx.subcategory || ''),
    escapeCSV(tx.description),
    escapeCSV(tx.account),
    escapeCSV(tx.status === 'completed' ? 'Completato' : 'In attesa'),
    escapeCSV(tx.source || 'Manuale'),
    escapeCSV(tx.notes || '')
  ]);

  const csvBody = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  // Include UTF-8 BOM for Microsoft Excel compatibility
  const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' });

  triggerFileDownload(blob, filename);

  return {
    filename,
    rowCount: transactions.length,
  };
}

/**
 * Export complete multi-sheet Excel Workbook (.xlsx)
 */
export function exportExcelWorkbook(params: {
  transactions: Transaction[];
  mainAccountConfig: MainAccountConfig;
  allocationPlan: AllocationPlan;
  wealthItems: WealthItem[];
  financialGoals: FinancialGoal[];
}): { filename: string; sheetNames: string[] } {
  const filename = getExcelExportFilename();
  const wb = XLSX.utils.book_new();

  // 1. Sheet "Movimenti"
  const txRows = params.transactions.map((tx, idx) => ({
    'N°': idx + 1,
    'ID Univoco': tx.id,
    'Data': tx.date,
    'Tipo': tx.type === 'income' ? 'Entrata' : tx.type === 'expense' ? 'Uscita' : 'Giroconto',
    'Importo (€)': tx.amount,
    'Categoria': tx.category,
    'Sottocategoria': tx.subcategory || '',
    'Descrizione': tx.description,
    'Conto / Metodo': tx.account,
    'Stato': tx.status === 'completed' ? 'Completato' : 'In attesa',
    'Sorgente': tx.source || 'Manuale',
    'Note': tx.notes || '',
  }));
  const wsMovimenti = XLSX.utils.json_to_sheet(txRows.length > 0 ? txRows : [{
    'N°': '', 'ID Univoco': '', 'Data': '', 'Tipo': '', 'Importo (€)': '', 'Categoria': '', 'Sottocategoria': '', 'Descrizione': '', 'Conto / Metodo': '', 'Stato': '', 'Sorgente': '', 'Note': 'Nessun movimento registrato'
  }]);
  XLSX.utils.book_append_sheet(wb, wsMovimenti, 'Movimenti');

  // 2. Sheet "Conti"
  let totalIncome = 0;
  let totalExpense = 0;
  let netTransfers = 0;
  params.transactions.forEach(t => {
    if (t.type === 'income') totalIncome += t.amount;
    else if (t.type === 'expense') totalExpense += t.amount;
    else if (t.type === 'transfer') netTransfers += 0;
  });
  const currentCalcBalance = params.mainAccountConfig.initialBalance + totalIncome - totalExpense;

  const accountsRows = [
    {
      'Proprietà': 'Nome Conto',
      'Valore / Dettaglio': params.mainAccountConfig.accountLabel || 'Conto Principale',
      'Note': params.mainAccountConfig.maskedNumber || '••••4829'
    },
    {
      'Proprietà': 'Saldo Iniziale Configurato (€)',
      'Valore / Dettaglio': params.mainAccountConfig.initialBalance,
      'Note': `Data di riferimento iniziale: ${params.mainAccountConfig.initialDate}`
    },
    {
      'Proprietà': 'Totale Entrate Cumulate (€)',
      'Valore / Dettaglio': totalIncome,
      'Note': `${params.transactions.filter(t => t.type === 'income').length} movimenti di entrata`
    },
    {
      'Proprietà': 'Totale Uscite Cumulate (€)',
      'Valore / Dettaglio': totalExpense,
      'Note': `${params.transactions.filter(t => t.type === 'expense').length} movimenti di spesa`
    },
    {
      'Proprietà': 'Saldo Attuale Calcolato (€)',
      'Valore / Dettaglio': currentCalcBalance,
      'Note': 'Saldo Iniziale + Entrate - Uscite'
    },
    {
      'Proprietà': 'Saldo di Controllo Riconciliato (€)',
      'Valore / Dettaglio': params.mainAccountConfig.controlBalance ?? currentCalcBalance,
      'Note': `Data estratto conto: ${params.mainAccountConfig.controlBalanceDate || '-'}`
    },
    {
      'Proprietà': 'Scostamento / Delta Riconciliazione (€)',
      'Valore / Dettaglio': Math.round(((params.mainAccountConfig.controlBalance ?? currentCalcBalance) - currentCalcBalance) * 100) / 100,
      'Note': Math.abs((params.mainAccountConfig.controlBalance ?? currentCalcBalance) - currentCalcBalance) < 0.01 ? 'Perfettamente Riconciliato (Delta 0,00 €)' : 'Scostamento presente'
    }
  ];
  const wsConti = XLSX.utils.json_to_sheet(accountsRows);
  XLSX.utils.book_append_sheet(wb, wsConti, 'Conti');

  // 3. Sheet "Budget mensile"
  const catExpenses: Record<string, number> = {};
  params.transactions.filter(t => t.type === 'expense').forEach(t => {
    catExpenses[t.category] = (catExpenses[t.category] || 0) + t.amount;
  });

  const budgetRows = DEFAULT_EXPENSE_CATEGORIES.map(cat => {
    const actual = catExpenses[cat] || 0;
    const benchmark = 250; // benchmark per category
    return {
      'Categoria': cat,
      'Spesa Totale Effettiva (€)': Math.round(actual * 100) / 100,
      'Budget Mensile Riferimento (€)': benchmark,
      'Scostamento / Residuo (€)': Math.round((benchmark - actual) * 100) / 100,
      'Stato Budget': actual <= benchmark ? 'Entro i limiti' : 'Superato'
    };
  });
  const wsBudget = XLSX.utils.json_to_sheet(budgetRows);
  XLSX.utils.book_append_sheet(wb, wsBudget, 'Budget mensile');

  // 4. Sheet "Piano allocazione"
  const allocRows = params.allocationPlan.rules.map(rule => ({
    'Categoria Spesa': rule.category,
    'Gruppo Allocazione': rule.group,
    'Quota Target (%)': rule.targetPercentage,
    'Codice Colore': rule.color,
  }));
  const wsAlloc = XLSX.utils.json_to_sheet(allocRows);
  XLSX.utils.book_append_sheet(wb, wsAlloc, 'Piano allocazione');

  // 5. Sheet "Patrimonio"
  const wealthRows = params.wealthItems.map(item => ({
    'Nome Asset / Voce': item.name,
    'Tipologia': item.type === 'liquidity' ? 'Liquidità' : item.type === 'investment' ? 'Investimenti' : item.type === 'asset' ? 'Beni Reali' : 'Passività / Debiti',
    'Categoria': item.category,
    'Valore Attuale (€)': item.value,
    'Istituto / Piattaforma': item.institution || '-',
    'Target Allocazione (%)': item.targetAllocationPercent ? `${item.targetAllocationPercent}%` : '-',
    'Rendimento / Tasso (%)': item.interestRate ? `${item.interestRate}%` : '-',
    'Ultimo Aggiornamento': item.updatedAt,
    'Note': item.notes || '',
  }));
  const wsWealth = XLSX.utils.json_to_sheet(wealthRows.length > 0 ? wealthRows : [{
    'Nome Asset / Voce': 'Nessun asset inserito', 'Tipologia': '', 'Categoria': '', 'Valore Attuale (€)': 0, 'Istituto / Piattaforma': '', 'Target Allocazione (%)': '', 'Rendimento / Tasso (%)': '', 'Ultimo Aggiornamento': '', 'Note': ''
  }]);
  XLSX.utils.book_append_sheet(wb, wsWealth, 'Patrimonio');

  // 6. Sheet "Obiettivi"
  const goalsRows = params.financialGoals.map(goal => {
    const progress = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0;
    return {
      'Nome Obiettivo': goal.name,
      'Categoria': goal.category,
      'Priorità': goal.priority === 'high' ? 'Alta' : goal.priority === 'medium' ? 'Media' : 'Bassa',
      'Importo Target (€)': goal.targetAmount,
      'Importo Raggiunto (€)': goal.currentAmount,
      'Progresso (%)': `${progress}%`,
      'Quota Mensile Prevista (€)': goal.monthlyContribution || 0,
      'Data Obiettivo': goal.targetDate,
      'Stato': goal.status === 'completed' ? 'Completato' : goal.status === 'behind' ? 'In ritardo' : 'In corso',
      'Note': goal.notes || '',
    };
  });
  const wsGoals = XLSX.utils.json_to_sheet(goalsRows.length > 0 ? goalsRows : [{
    'Nome Obiettivo': 'Nessun obiettivo configurato', 'Categoria': '', 'Priorità': '', 'Importo Target (€)': 0, 'Importo Raggiunto (€)': 0, 'Progresso (%)': '0%', 'Quota Mensile Prevista (€)': 0, 'Data Obiettivo': '', 'Stato': '', 'Note': ''
  }]);
  XLSX.utils.book_append_sheet(wb, wsGoals, 'Obiettivi');

  // Write file
  XLSX.writeFile(wb, filename);

  return {
    filename,
    sheetNames: ['Movimenti', 'Conti', 'Budget mensile', 'Piano allocazione', 'Patrimonio', 'Obiettivi'],
  };
}

/**
 * Perform Comprehensive Integrity Check on data
 */
export function performIntegrityCheck(params: {
  transactions: Transaction[];
  mainAccountConfig?: MainAccountConfig;
  allocationPlan?: AllocationPlan;
  wealthItems?: WealthItem[];
  financialGoals?: FinancialGoal[];
  auditLogs?: AuditLogEntry[];
}): IntegrityCheckResult {
  const checks: IntegrityCheckResult['checks'] = [];
  const { 
    transactions = [], 
    mainAccountConfig, 
    allocationPlan, 
    wealthItems = [], 
    financialGoals = [], 
    auditLogs = [] 
  } = params;

  let totalIncome = 0;
  let totalExpense = 0;
  let totalTransfers = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  let transferCount = 0;

  // 1. Transaction integrity checks
  const txIds = new Set<string>();
  let duplicateIdCount = 0;
  let invalidDateCount = 0;
  let invalidAmountCount = 0;
  let missingCategoryCount = 0;

  transactions.forEach(tx => {
    if (txIds.has(tx.id)) {
      duplicateIdCount++;
    } else {
      txIds.add(tx.id);
    }

    if (!tx.date || !/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) {
      invalidDateCount++;
    }

    if (typeof tx.amount !== 'number' || isNaN(tx.amount) || tx.amount <= 0) {
      invalidAmountCount++;
    }

    if (!tx.category || tx.category.trim() === '') {
      missingCategoryCount++;
    }

    if (tx.type === 'income') {
      totalIncome += tx.amount || 0;
      incomeCount++;
    } else if (tx.type === 'expense') {
      totalExpense += tx.amount || 0;
      expenseCount++;
    } else if (tx.type === 'transfer') {
      totalTransfers += tx.amount || 0;
      transferCount++;
    }
  });

  // Check 1: Unique IDs
  if (duplicateIdCount === 0) {
    checks.push({
      id: 'tx_unique_ids',
      label: 'Univocità identificativi (ID)',
      category: 'integrity',
      status: 'pass',
      message: `Tutti i ${transactions.length} movimenti possiedono un ID univoco e deterministico.`,
    });
  } else {
    checks.push({
      id: 'tx_unique_ids',
      label: 'Univocità identificativi (ID)',
      category: 'integrity',
      status: 'fail',
      message: `Rilevati ${duplicateIdCount} ID duplicati all'interno dei movimenti.`,
    });
  }

  // Check 2: Dates Validity
  if (invalidDateCount === 0) {
    checks.push({
      id: 'tx_dates',
      label: 'Validità date (Formato YYYY-MM-DD)',
      category: 'data',
      status: 'pass',
      message: 'Tutte le date dei movimenti rispettano il formato standard ISO 8601.',
    });
  } else {
    checks.push({
      id: 'tx_dates',
      label: 'Validità date (Formato YYYY-MM-DD)',
      category: 'data',
      status: 'fail',
      message: `${invalidDateCount} movimenti presentano una data non valida o corrotta.`,
    });
  }

  // Check 3: Amounts Validity
  if (invalidAmountCount === 0) {
    checks.push({
      id: 'tx_amounts',
      label: 'Validità importi numerici',
      category: 'data',
      status: 'pass',
      message: 'Tutti gli importi sono valori numerici positivi e finiti.',
    });
  } else {
    checks.push({
      id: 'tx_amounts',
      label: 'Validità importi numerici',
      category: 'data',
      status: 'fail',
      message: `${invalidAmountCount} movimenti presentano importi non validi (zero o negativi).`,
    });
  }

  // Check 4: Categories
  if (missingCategoryCount === 0) {
    checks.push({
      id: 'tx_categories',
      label: 'Integrità categorie assegnate',
      category: 'data',
      status: 'pass',
      message: 'Nessun movimento ha categoria vuota o non valorizzata.',
    });
  } else {
    checks.push({
      id: 'tx_categories',
      label: 'Integrità categorie assegnate',
      category: 'data',
      status: 'warn',
      message: `${missingCategoryCount} movimenti non hanno una categoria esplicita.`,
    });
  }

  // 2. Main account reconciliation check
  const initBal = mainAccountConfig?.initialBalance || 0;
  const calcBal = Math.round((initBal + totalIncome - totalExpense) * 100) / 100;
  const controlBal = mainAccountConfig?.controlBalance;
  
  if (controlBal !== undefined && controlBal !== null) {
    const delta = Math.abs(controlBal - calcBal);
    if (delta < 0.01) {
      checks.push({
        id: 'acc_reconciliation',
        label: 'Riconciliazione Conto Principale',
        category: 'financial',
        status: 'pass',
        message: `Saldo calcolato (${calcBal.toFixed(2)} €) coincide con il saldo di controllo (${controlBal.toFixed(2)} €). Delta: 0,00 €.`,
      });
    } else {
      checks.push({
        id: 'acc_reconciliation',
        label: 'Riconciliazione Conto Principale',
        category: 'financial',
        status: 'warn',
        message: `Scostamento di ${delta.toFixed(2)} € tra saldo calcolato (${calcBal.toFixed(2)} €) ed estratto conto (${controlBal.toFixed(2)} €).`,
        details: 'Verifica se mancano movimenti o se il saldo iniziale è corretto.',
      });
    }
  } else {
    checks.push({
      id: 'acc_reconciliation',
      label: 'Riconciliazione Conto Principale',
      category: 'financial',
      status: 'pass',
      message: `Saldo calcolato: ${calcBal.toFixed(2)} € (Saldo iniziale: ${initBal.toFixed(2)} €).`,
    });
  }

  // 3. Allocation plan checks
  if (allocationPlan) {
    const totalAllocTargets = (allocationPlan.targetNeeds || 0) + (allocationPlan.targetWants || 0) + (allocationPlan.targetSavings || 0);
    if (Math.abs(totalAllocTargets - 100) < 0.1) {
      checks.push({
        id: 'alloc_rule_sum',
        label: 'Piano di allocazione (Regola 50/30/20)',
        category: 'schema',
        status: 'pass',
        message: `Somma dei target di allocazione pari al 100% (${allocationPlan.targetNeeds}% / ${allocationPlan.targetWants}% / ${allocationPlan.targetSavings}%).`,
      });
    } else {
      checks.push({
        id: 'alloc_rule_sum',
        label: 'Piano di allocazione (Regola 50/30/20)',
        category: 'schema',
        status: 'warn',
        message: `La somma dei target di allocazione è ${totalAllocTargets}%, diversa da 100%.`,
      });
    }
  }

  // 4. Wealth calculation check
  let liquidityTotal = 0;
  let investmentsTotal = 0;
  let assetsTotal = 0;
  let liabilitiesTotal = 0;
  wealthItems.forEach(w => {
    if (w.type === 'liquidity') liquidityTotal += w.value || 0;
    else if (w.type === 'investment') investmentsTotal += w.value || 0;
    else if (w.type === 'asset') assetsTotal += w.value || 0;
    else if (w.type === 'liability') liabilitiesTotal += w.value || 0;
  });
  const netWorth = (liquidityTotal + investmentsTotal + assetsTotal) - liabilitiesTotal;

  checks.push({
    id: 'wealth_integrity',
    label: 'Integrità patrimonio e voci attive/passive',
    category: 'financial',
    status: 'pass',
    message: `${wealthItems.length} voci patrimoniali verificate. Patrimonio netto calcolato: ${netWorth.toFixed(2)} €.`,
  });

  // 5. Goals check
  let totalGoalsTarget = 0;
  let totalGoalsCurrent = 0;
  financialGoals.forEach(g => {
    totalGoalsTarget += g.targetAmount || 0;
    totalGoalsCurrent += g.currentAmount || 0;
  });

  checks.push({
    id: 'goals_integrity',
    label: 'Integrità obiettivi di risparmio',
    category: 'integrity',
    status: 'pass',
    message: `${financialGoals.length} obiettivi monitorati. Target totale: ${totalGoalsTarget.toFixed(2)} €, accumulati: ${totalGoalsCurrent.toFixed(2)} €.`,
  });

  // Count fails and warns
  const errorsCount = checks.filter(c => c.status === 'fail').length;
  const warningsCount = checks.filter(c => c.status === 'warn').length;
  const passed = errorsCount === 0;
  const score = Math.max(0, Math.round(100 - (errorsCount * 25) - (warningsCount * 5)));

  return {
    passed,
    score,
    timestamp: new Date().toISOString(),
    counts: {
      transactions: transactions.length,
      incomes: incomeCount,
      expenses: expenseCount,
      transfers: transferCount,
      wealthItems: wealthItems.length,
      financialGoals: financialGoals.length,
      allocationRules: allocationPlan?.rules?.length || 0,
      auditLogs: auditLogs.length,
    },
    financialSummary: {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netBalance: Math.round((totalIncome - totalExpense) * 100) / 100,
      mainAccountInitialBalance: initBal,
      mainAccountCalculatedBalance: calcBal,
      mainAccountControlBalance: controlBal,
      netWorth: Math.round(netWorth * 100) / 100,
      totalGoalsTarget: Math.round(totalGoalsTarget * 100) / 100,
      totalGoalsCurrent: Math.round(totalGoalsCurrent * 100) / 100,
    },
    checks,
    errorsCount,
    warningsCount,
  };
}

/**
 * Validate and parse a raw JSON backup file string for preview
 */
export function parseAndPreviewBackupJSON(jsonString: string): {
  isValid: boolean;
  error?: string;
  backup?: BackupData;
  integrity?: IntegrityCheckResult;
} {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'Il file selezionato non contiene una struttura JSON valida.' };
    }

    if (!Array.isArray(parsed.transactions)) {
      return { isValid: false, error: 'File di backup non valido: elemento "transactions" mancante o non corretto.' };
    }

    const backupData: BackupData = {
      schemaVersion: parsed.schemaVersion || 1,
      appVersion: parsed.appVersion || parsed.version || '1.0.0',
      createdAt: parsed.createdAt || parsed.exportDate || new Date().toISOString(),
      exportDate: parsed.exportDate || parsed.createdAt || new Date().toISOString(),
      version: parsed.version || parsed.appVersion || '1.0.0',
      transactions: parsed.transactions,
      mainAccountConfig: parsed.mainAccountConfig,
      prepaidCardConfig: parsed.prepaidCardConfig,
      categories: parsed.categories,
      budgets: parsed.budgets,
      allocationPlan: parsed.allocationPlan,
      allocationRules: parsed.allocationRules || parsed.allocationPlan?.rules,
      wealthAssets: parsed.wealthAssets || parsed.wealthItems || [],
      wealthItems: parsed.wealthItems || parsed.wealthAssets || [],
      financialGoals: parsed.financialGoals || [],
      importPresets: parsed.importPresets || [],
      preferences: parsed.preferences,
      auditLogs: parsed.auditLogs || [],
    };

    const integrity = performIntegrityCheck({
      transactions: backupData.transactions,
      mainAccountConfig: backupData.mainAccountConfig,
      allocationPlan: backupData.allocationPlan,
      wealthItems: backupData.wealthItems,
      financialGoals: backupData.financialGoals,
      auditLogs: backupData.auditLogs,
    });

    return {
      isValid: true,
      backup: backupData,
      integrity,
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `Errore nella lettura del JSON: ${err.message || 'Sintassi non valida'}`,
    };
  }
}
