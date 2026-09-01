import { 
  Transaction, 
  CategoryDefinition, 
  CategoryMigrationReport, 
  CategoryDiagnosticsSummary,
  CategoryVerificationItem
} from '../types';

export const CATEGORY_BACKUP_STORAGE_KEY = 'findashboard_category_migration_backup_v1';

// Base Predefined Standard Categories with Distinct, High-Contrast Hex Colors
export const BASE_CATEGORIES: CategoryDefinition[] = [
  // Spese
  { id: 'regali_e_famiglia', label: 'Regali e famiglia', allowedType: 'expense', color: '#EC4899', iconName: 'Gift', isSystem: true },
  { id: 'svago_e_ristoranti', label: 'Svago e ristoranti', allowedType: 'expense', color: '#F59E0B', iconName: 'Utensils', isSystem: true },
  { id: 'salute_e_benessere', label: 'Salute e benessere', allowedType: 'expense', color: '#06B6D4', iconName: 'HeartPulse', isSystem: true },
  { id: 'casa_e_utenze', label: 'Casa & Utenze', allowedType: 'expense', color: '#38BDF8', iconName: 'Home', isSystem: true },
  { id: 'alimentari_e_spesa', label: 'Alimentari & Spesa', allowedType: 'expense', color: '#EAB308', iconName: 'ShoppingCart', isSystem: true },
  { id: 'trasporti_e_auto', label: 'Trasporti & Auto', allowedType: 'expense', color: '#F97316', iconName: 'Car', isSystem: true },
  { id: 'ristoranti_e_svago', label: 'Ristoranti & Svago', allowedType: 'expense', color: '#FB923C', iconName: 'Utensils', isSystem: true },
  { id: 'shopping_e_abbigliamento', label: 'Shopping & Abbigliamento', allowedType: 'expense', color: '#A855F7', iconName: 'ShoppingBag', isSystem: true },
  { id: 'abbonamenti_e_servizi', label: 'Abbonamenti & Servizi', allowedType: 'expense', color: '#6366F1', iconName: 'Tv', isSystem: true },
  { id: 'educazione_e_corsi', label: 'Educazione & Corsi', allowedType: 'expense', color: '#14B8A6', iconName: 'GraduationCap', isSystem: true },
  { id: 'viaggi_e_vacanze', label: 'Viaggi & Vacanze', allowedType: 'expense', color: '#F43F5E', iconName: 'Plane', isSystem: true },
  { id: 'altro_spese', label: 'Altro Spese', allowedType: 'expense', color: '#94A3B8', iconName: 'MoreHorizontal', isSystem: true },

  // Entrate
  { id: 'stipendio', label: 'Stipendio', allowedType: 'income', color: '#22C55E', iconName: 'Briefcase', isSystem: true },
  { id: 'freelance_e_bonus', label: 'Freelance & Bonus', allowedType: 'income', color: '#0EA5E9', iconName: 'TrendingUp', isSystem: true },
  { id: 'investimenti_e_dividendi', label: 'Investimenti & Dividendi', allowedType: 'income', color: '#8B5CF6', iconName: 'LineChart', isSystem: true },
  { id: 'rimborsi_e_vendite', label: 'Rimborsi & Vendite', allowedType: 'income', color: '#3B82F6', iconName: 'RefreshCw', isSystem: true },
  { id: 'altre_entrate', label: 'Altre entrate', allowedType: 'income', color: '#10B981', iconName: 'PlusCircle', isSystem: true },

  // Giroconti
  { id: 'giroconto_trasferimento', label: 'Giroconto / Trasferimento', allowedType: 'transfer', color: '#64748B', iconName: 'ArrowLeftRight', isSystem: true },

  // Da verificare
  { id: 'da_verificare', label: 'Da verificare', allowedType: 'both', color: '#E11D48', iconName: 'AlertCircle', isSystem: true },
];

// Rich secondary palette for dynamic or custom user categories
const DYNAMIC_COLOR_PALETTE = [
  '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#38BDF8', 
  '#EAB308', '#F97316', '#A855F7', '#6366F1', '#14B8A6', 
  '#F43F5E', '#22C55E', '#0EA5E9', '#8B5CF6', '#3B82F6', 
  '#D946EF', '#84CC16', '#FB923C', '#A78BFA', '#34D399'
];

/**
 * Normalizes any category string to a deterministic snake_case identifier key.
 * Handles accents, symbols, whitespace, and Italian connector words (& -> e).
 */
export const normalizeCategoryKey = (label: string): string => {
  if (!label || typeof label !== 'string') return 'da_verificare';

  let s = label.trim().toLowerCase();
  if (!s) return 'da_verificare';

  // Replace & with e
  s = s.replace(/&/g, ' e ');

  // Normalize accented vowels
  s = s
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c');

  // Replace non-alphanumeric characters with underscores
  s = s.replace(/[^a-z0-9]+/g, '_');

  // Remove leading and trailing underscores
  s = s.replace(/^_+|_+$/g, '');

  return s || 'da_verificare';
};

/**
 * Deterministic color generator for arbitrary category keys
 */
export const getDeterministicColor = (key: string): string => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % DYNAMIC_COLOR_PALETTE.length;
  return DYNAMIC_COLOR_PALETTE[idx];
};

/**
 * Finds a matching CategoryDefinition in the catalog using exact ID, normalized key,
 * or case-insensitive label matching.
 */
export const findCategoryInCatalog = (
  identifier: string,
  catalog: CategoryDefinition[] = BASE_CATEGORIES
): CategoryDefinition | undefined => {
  if (!identifier || typeof identifier !== 'string') return undefined;

  const rawTrimmed = identifier.trim();
  if (!rawTrimmed) return undefined;

  const normKey = normalizeCategoryKey(rawTrimmed);
  const lowerLabel = rawTrimmed.toLowerCase();

  // 1. Direct ID match
  const byId = catalog.find(c => c.id === rawTrimmed || c.id === normKey);
  if (byId) return byId;

  // 2. Exact label match (case-insensitive)
  const byLabel = catalog.find(c => c.label.toLowerCase() === lowerLabel);
  if (byLabel) return byLabel;

  // 3. Normalized label match
  const byNorm = catalog.find(c => normalizeCategoryKey(c.label) === normKey);
  if (byNorm) return byNorm;

  return undefined;
};

/**
 * Builds the complete category catalog by merging BASE_CATEGORIES with any custom
 * or existing categories discovered inside transactions.
 */
export const buildFullCategoryCatalog = (transactions: Transaction[] = []): CategoryDefinition[] => {
  const catalogMap = new Map<string, CategoryDefinition>();

  // 1. Seed with base system categories
  BASE_CATEGORIES.forEach(cat => {
    catalogMap.set(cat.id, cat);
  });

  // 2. Scan transactions for any custom or additional categories
  transactions.forEach(tx => {
    const raw = tx.rawCategory || tx.categoryLabel || tx.category;
    if (!raw || typeof raw !== 'string' || !raw.trim()) return;

    const trimmed = raw.trim();
    const normKey = normalizeCategoryKey(trimmed);

    // If not in catalog, create a new CategoryDefinition
    if (!catalogMap.has(normKey)) {
      const match = findCategoryInCatalog(trimmed, BASE_CATEGORIES);
      if (match) {
        catalogMap.set(match.id, match);
      } else {
        const customCat: CategoryDefinition = {
          id: normKey,
          label: trimmed,
          allowedType: tx.type === 'income' ? 'income' : tx.type === 'transfer' ? 'transfer' : 'expense',
          color: getDeterministicColor(normKey),
          iconName: 'Tag',
          isSystem: false,
        };
        catalogMap.set(normKey, customCat);
      }
    }
  });

  return Array.from(catalogMap.values());
};

/**
 * Returns the exact, consistent color for a given category name or categoryId.
 */
export const getCategoryColor = (
  categoryOrId: string, 
  catalog: CategoryDefinition[] = BASE_CATEGORIES
): string => {
  if (!categoryOrId || typeof categoryOrId !== 'string') return '#94A3B8';

  const match = findCategoryInCatalog(categoryOrId, catalog);
  if (match) return match.color;

  const key = normalizeCategoryKey(categoryOrId);
  return getDeterministicColor(key);
};

/**
 * Creates and stores an internal snapshot backup before migration.
 */
export const saveCategoryMigrationBackup = (transactions: Transaction[]): void => {
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      transactions: transactions,
    };
    localStorage.setItem(CATEGORY_BACKUP_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to save category migration backup to localStorage', e);
  }
};

/**
 * Loads the internal category migration backup.
 */
export const loadCategoryMigrationBackup = (): Transaction[] | null => {
  try {
    const raw = localStorage.getItem(CATEGORY_BACKUP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.transactions)) {
        return parsed.transactions;
      }
    }
  } catch (e) {
    console.warn('Failed to load category migration backup', e);
  }
  return null;
};

/**
 * Executes migration of all transactions:
 * 1. Backs up the current state
 * 2. Assigns canonical categoryId and categoryLabel without modifying amounts, dates, accounts, etc.
 * 3. Never falls back to 'Casa & Utenze' (uses 'da_verificare' / 'Da verificare' for unrecognized)
 * 4. Generates an exhaustive migration report.
 */
export const migrateTransactionsCategories = (
  transactions: Transaction[]
): { updatedTransactions: Transaction[]; report: CategoryMigrationReport } => {
  // Step 1: Save Backup Snapshot
  saveCategoryMigrationBackup(transactions);

  const catalog = buildFullCategoryCatalog(transactions);
  const updatedTransactions: Transaction[] = [];

  let migratedCount = 0;
  let unrecognizedCount = 0;
  let modifiedCount = 0;

  const breakdownMap = new Map<string, {
    rawCategory: string;
    normalizedLabel: string;
    categoryId: string;
    color: string;
    count: number;
    totalAmount: number;
    type: string;
    isUnrecognized: boolean;
  }>();

  const unrecognizedRecords: CategoryMigrationReport['unrecognizedRecords'] = [];

  transactions.forEach(tx => {
    // Preserve original raw text
    const raw = tx.rawCategory || tx.categoryLabel || tx.category || '';
    const rawTrimmed = typeof raw === 'string' ? raw.trim() : String(raw || '').trim();

    let assignedId = '';
    let assignedLabel = '';
    let assignedColor = '';
    let isUnrecognized = false;

    if (!rawTrimmed) {
      // Empty category -> Da verificare (NEVER Casa & Utenze)
      assignedId = 'da_verificare';
      assignedLabel = 'Da verificare';
      assignedColor = '#E11D48';
      isUnrecognized = true;
      unrecognizedCount++;
    } else {
      const match = findCategoryInCatalog(rawTrimmed, catalog);
      if (match) {
        assignedId = match.id;
        assignedLabel = match.label;
        assignedColor = match.color;
        migratedCount++;
      } else {
        // Unknown category -> create deterministic entry or mark to verify
        const normKey = normalizeCategoryKey(rawTrimmed);
        assignedId = normKey;
        assignedLabel = rawTrimmed; // Keep exact original text!
        assignedColor = getDeterministicColor(normKey);
        migratedCount++;
      }
    }

    const wasModified = 
      tx.categoryId !== assignedId || 
      tx.categoryLabel !== assignedLabel ||
      !tx.rawCategory;

    if (wasModified) {
      modifiedCount++;
    }

    // Build the clean migrated Transaction object
    const updatedTx: Transaction = {
      ...tx,
      categoryId: assignedId,
      categoryLabel: assignedLabel,
      rawCategory: tx.rawCategory || rawTrimmed || assignedLabel,
      category: assignedLabel, // Keeps existing display bindings 100% consistent
    };

    updatedTransactions.push(updatedTx);

    // Track Breakdown
    const bKey = assignedId;
    if (!breakdownMap.has(bKey)) {
      breakdownMap.set(bKey, {
        rawCategory: rawTrimmed || '(Vuoto)',
        normalizedLabel: assignedLabel,
        categoryId: assignedId,
        color: assignedColor,
        count: 0,
        totalAmount: 0,
        type: tx.type,
        isUnrecognized,
      });
    }
    const bEntry = breakdownMap.get(bKey)!;
    bEntry.count += 1;
    bEntry.totalAmount = Math.round((bEntry.totalAmount + tx.amount) * 100) / 100;

    if (isUnrecognized) {
      unrecognizedRecords.push({
        id: tx.id,
        description: tx.description,
        date: tx.date,
        amount: tx.amount,
        rawCategory: rawTrimmed || '(Valore vuoto)',
        assignedCategoryId: assignedId,
        assignedCategoryLabel: assignedLabel,
      });
    }
  });

  const report: CategoryMigrationReport = {
    totalAnalyzed: transactions.length,
    migratedCount,
    unrecognizedCount,
    modifiedCount,
    snapshotTimestamp: new Date().toISOString(),
    categoryBreakdown: Array.from(breakdownMap.values()).sort((a, b) => b.count - a.count),
    unrecognizedRecords,
  };

  return { updatedTransactions, report };
};

/**
 * Runs deep category verification and diagnostics.
 */
export const runCategoryDiagnostics = (
  transactions: Transaction[]
): CategoryDiagnosticsSummary => {
  const catalog = buildFullCategoryCatalog(transactions);
  const catMap = new Map<string, CategoryVerificationItem>();

  let emptyCount = 0;
  let unrecognizedCount = 0;
  let mismatchedCount = 0;
  const recordsWithIssues: CategoryDiagnosticsSummary['recordsWithIssues'] = [];

  transactions.forEach(tx => {
    const raw = (tx.rawCategory || tx.categoryLabel || tx.category || '').trim();
    const currentId = tx.categoryId || normalizeCategoryKey(raw);
    const currentLabel = tx.category || tx.categoryLabel || raw;

    let hasIssue = false;
    let issueReason = '';

    if (!raw) {
      emptyCount++;
      hasIssue = true;
      issueReason = 'Categoria vuota o non valorizzata nel record';
    }

    const match = findCategoryInCatalog(raw, catalog);
    if (!match && !raw) {
      unrecognizedCount++;
      hasIssue = true;
      issueReason = 'Categoria non riconosciuta nel catalogo';
    }

    // Verify selector consistency (would edit modal read this cleanly?)
    if (tx.categoryId && match && tx.categoryId !== match.id) {
      mismatchedCount++;
      hasIssue = true;
      issueReason = `Disallineamento: categoryId (${tx.categoryId}) != catalogo (${match.id})`;
    }

    if (hasIssue) {
      recordsWithIssues.push({
        id: tx.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        rawCategory: raw || '(Vuoto)',
        categoryId: currentId,
        categoryLabel: currentLabel,
        issue: issueReason,
      });
    }

    // Grouping
    const groupKey = currentId || 'da_verificare';
    if (!catMap.has(groupKey)) {
      const color = match ? match.color : getDeterministicColor(groupKey);
      catMap.set(groupKey, {
        rawCategory: raw || '(Vuoto)',
        canonicalId: groupKey,
        canonicalLabel: match ? match.label : currentLabel || 'Da verificare',
        color,
        count: 0,
        totalExpense: 0,
        totalIncome: 0,
        allowedType: match ? match.allowedType : tx.type,
        isValid: Boolean(raw),
        isUnrecognized: !match && Boolean(raw),
        isEmpty: !raw,
      });
    }

    const item = catMap.get(groupKey)!;
    item.count += 1;
    if (tx.type === 'income') {
      item.totalIncome = Math.round((item.totalIncome + tx.amount) * 100) / 100;
    } else if (tx.type === 'expense') {
      item.totalExpense = Math.round((item.totalExpense + tx.amount) * 100) / 100;
    }
  });

  return {
    totalRecords: transactions.length,
    totalCategoriesCount: catMap.size,
    emptyCategoryRecordsCount: emptyCount,
    unrecognizedRecordsCount: unrecognizedCount,
    mismatchedSelectorRecordsCount: mismatchedCount,
    categories: Array.from(catMap.values()).sort((a, b) => b.count - a.count),
    recordsWithIssues,
  };
};
