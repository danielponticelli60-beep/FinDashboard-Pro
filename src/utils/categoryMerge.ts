import { Transaction } from '../types';
import { BASE_CATEGORIES } from './categoryManager';

/**
 * Generic, reusable merge of one duplicate system category into a canonical
 * one. Built for the 'svago_e_ristoranti' -> 'ristoranti_e_svago' merge (see
 * CATEGORY_MERGE_REPORT.md) but not specific to it.
 *
 * A transaction is caught by this merge if EITHER:
 *  - categoryId === duplicateCategoryId (the structural/ID check - the
 *    primary criterion, checked first), OR
 *  - category / categoryLabel / rawCategory exactly equals
 *    `duplicateLabel` (an exact match against the one specific, known
 *    label being retired - not fuzzy text matching).
 *
 * The second condition exists because buildFullCategoryCatalog rebuilds
 * "custom" categories from rawCategory first: a transaction can already
 * have the canonical categoryId while still carrying a stale rawCategory
 * (e.g. left over from the app's own earlier category-migration feature,
 * which preserves rawCategory on purpose) - and that alone is enough to
 * resurrect the duplicate as a new isSystem:false entry on the next catalog
 * rebuild, even though categoryId itself was already correct. Confirmed
 * live in a real browser session, not theoretical - see
 * CATEGORY_MERGE_REPORT.md.
 *
 * Only categoryId/category/categoryLabel/rawCategory are ever touched.
 * Everything else on a matched transaction (amount, date, description,
 * accountId, type, notes, status, source, importBatchId,
 * categoryModifiedManually, ...) passes through unchanged. Transactions
 * using any other category are completely untouched.
 *
 * rawCategory is overwritten to the canonical label rather than left as the
 * original imported text - a deliberate choice (Option A in
 * CATEGORY_MERGE_REPORT.md §4), confirmed by the user.
 *
 * Idempotent: after one run, no transaction can match either condition any
 * more, so a second run reclassifies zero transactions.
 */
export interface CategoryMergeReport {
  duplicateCategoryId: string;
  duplicateLabel: string;
  canonicalCategoryId: string;
  canonicalLabel: string;
  transactionsReclassified: number;
  transactionIds: string[];
}

export function mergeDuplicateCategory(
  transactions: Transaction[],
  duplicateCategoryId: string,
  duplicateLabel: string,
  canonicalCategoryId: string
): { updatedTransactions: Transaction[]; report: CategoryMergeReport } {
  const canonical = BASE_CATEGORIES.find((c) => c.id === canonicalCategoryId);
  if (!canonical) {
    throw new Error(`Categoria canonica "${canonicalCategoryId}" non trovata in BASE_CATEGORIES`);
  }

  const isDuplicate = (tx: Transaction): boolean =>
    tx.categoryId === duplicateCategoryId ||
    tx.category === duplicateLabel ||
    tx.categoryLabel === duplicateLabel ||
    tx.rawCategory === duplicateLabel;

  const transactionIds: string[] = [];
  const updatedTransactions = transactions.map((tx) => {
    if (!isDuplicate(tx)) return tx;
    transactionIds.push(tx.id);
    return {
      ...tx,
      categoryId: canonical.id,
      category: canonical.label,
      categoryLabel: canonical.label,
      rawCategory: canonical.label,
    };
  });

  return {
    updatedTransactions,
    report: {
      duplicateCategoryId,
      duplicateLabel,
      canonicalCategoryId: canonical.id,
      canonicalLabel: canonical.label,
      transactionsReclassified: transactionIds.length,
      transactionIds,
    },
  };
}
