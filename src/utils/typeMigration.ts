import { Transaction, TransactionType, TypeMigrationSummary, ToVerifyRow } from '../types';

/**
 * Deterministic parsing helper for evaluating the signed original amount.
 * NEVER reads or relies on cell color (red/green).
 */
export function extractSignedAmount(val: any): {
  signedAmount: number | null;
  isAmbiguous: boolean;
  reason: string;
} {
  if (val === null || val === undefined) {
    return { signedAmount: null, isAmbiguous: true, reason: 'Importo assente o nullo' };
  }

  if (typeof val === 'number') {
    if (isNaN(val)) {
      return { signedAmount: null, isAmbiguous: true, reason: 'Valore non numerico (NaN)' };
    }
    if (val === 0) {
      return { signedAmount: 0, isAmbiguous: true, reason: 'Importo numerico esattamente pari a 0,00 €' };
    }
    return {
      signedAmount: val,
      isAmbiguous: false,
      reason: val > 0 ? 'Valore numerico positivo (> 0)' : 'Valore numerico negativo (< 0)',
    };
  }

  const rawStr = String(val).trim();
  if (rawStr === '') {
    return { signedAmount: null, isAmbiguous: true, reason: 'Importo testuale vuoto' };
  }

  // Check currency or formatted string
  let cleaned = rawStr.replace(/[€$£\s]/g, '');

  let isNegative = false;
  if (cleaned.startsWith('-') || cleaned.startsWith('(') || cleaned.endsWith('-')) {
    isNegative = true;
    cleaned = cleaned.replace(/^[\-\(]/, '').replace(/[\)\-]$/, '').trim();
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.replace(/^\+/, '').trim();
  }

  // European vs International notation:
  // e.g. 1.250,50 vs 1,250.50
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
      // 1.250,50 -> 1250.50
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,250.50 -> 1250.50
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // 1250,50 -> 1250.50
    cleaned = cleaned.replace(',', '.');
  }

  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) {
    return { signedAmount: null, isAmbiguous: true, reason: `Impossibile convertire "${rawStr}" in valore numerico` };
  }

  if (parsed === 0) {
    return { signedAmount: 0, isAmbiguous: true, reason: 'Importo pari a zero (0,00 €)' };
  }

  const finalSigned = isNegative ? -Math.abs(parsed) : Math.abs(parsed);
  return {
    signedAmount: Math.round(finalSigned * 100) / 100,
    isAmbiguous: false,
    reason: isNegative ? 'Segno negativo rilevato nella stringa originale (< 0)' : 'Segno positivo rilevato nella stringa originale (> 0)',
  };
}

/**
 * Evaluates a single transaction to reconstruct its type deterministically.
 */
export function evaluateTransactionDeterministic(tx: Transaction): {
  newType: TransactionType;
  originalSignedAmount: number | null;
  normalizedAmount: number;
  isAmbiguous: boolean;
  reason: string;
  hasChanged: boolean;
} {
  // 1. Check if originalSignedAmount is already stored
  if (tx.originalSignedAmount !== undefined && tx.originalSignedAmount !== null) {
    const s = tx.originalSignedAmount;
    if (s > 0) {
      const normalized = Math.round(Math.abs(s) * 100) / 100;
      return {
        newType: 'income',
        originalSignedAmount: s,
        normalizedAmount: normalized,
        isAmbiguous: false,
        reason: 'Segno originale positivo (> 0)',
        hasChanged: tx.type !== 'income' || tx.amount !== normalized,
      };
    } else if (s < 0) {
      const normalized = Math.round(Math.abs(s) * 100) / 100;
      return {
        newType: 'expense',
        originalSignedAmount: s,
        normalizedAmount: normalized,
        isAmbiguous: false,
        reason: 'Segno originale negativo (< 0)',
        hasChanged: tx.type !== 'expense' || tx.amount !== normalized,
      };
    } else {
      return {
        newType: 'to_verify',
        originalSignedAmount: 0,
        normalizedAmount: 0,
        isAmbiguous: true,
        reason: 'Importo originale registrato pari a 0,00 €',
        hasChanged: tx.type !== 'to_verify',
      };
    }
  }

  // 2. Check rawAmount if present
  if (tx.rawAmount !== undefined && tx.rawAmount !== null && String(tx.rawAmount).trim() !== '') {
    const res = extractSignedAmount(tx.rawAmount);
    if (!res.isAmbiguous && res.signedAmount !== null) {
      const s = res.signedAmount;
      const normalized = Math.round(Math.abs(s) * 100) / 100;
      const newType = s > 0 ? 'income' : 'expense';
      return {
        newType,
        originalSignedAmount: s,
        normalizedAmount: normalized,
        isAmbiguous: false,
        reason: res.reason,
        hasChanged: tx.type !== newType || tx.amount !== normalized,
      };
    }
  }

  // 3. Check tx.amount
  if (tx.amount !== undefined && tx.amount !== null) {
    if (typeof tx.amount === 'number' && !isNaN(tx.amount)) {
      if (tx.amount < 0) {
        const normalized = Math.round(Math.abs(tx.amount) * 100) / 100;
        return {
          newType: 'expense',
          originalSignedAmount: tx.amount,
          normalizedAmount: normalized,
          isAmbiguous: false,
          reason: 'Segno negativo rilevato nell’archivio (< 0)',
          hasChanged: tx.type !== 'expense' || tx.amount !== normalized,
        };
      } else if (tx.amount === 0) {
        return {
          newType: 'to_verify',
          originalSignedAmount: 0,
          normalizedAmount: 0,
          isAmbiguous: true,
          reason: 'Importo pari a zero (0,00 €)',
          hasChanged: tx.type !== 'to_verify',
        };
      } else {
        // tx.amount > 0
        // If type is already income or expense, preserve sign alignment
        const signed = tx.type === 'income' ? tx.amount : -tx.amount;
        const normalized = Math.round(Math.abs(tx.amount) * 100) / 100;
        const targetType = tx.type === 'income' ? 'income' : 'expense';
        return {
          newType: targetType,
          originalSignedAmount: signed,
          normalizedAmount: normalized,
          isAmbiguous: false,
          reason: tx.type === 'income' ? 'Importo positivo (> 0)' : 'Importo di spesa normalizzato (< 0)',
          hasChanged: tx.type !== targetType || tx.amount !== normalized,
        };
      }
    }
  }

  // 4. Default ambiguous fallback
  return {
    newType: 'to_verify',
    originalSignedAmount: null,
    normalizedAmount: 0,
    isAmbiguous: true,
    reason: 'Importo non numerico, assente o non determinabile con certezza',
    hasChanged: tx.type !== 'to_verify',
  };
}

/**
 * Computes a detailed preview of the migration across existing transactions.
 */
export function generateTypeMigrationPreview(transactions: Transaction[]): TypeMigrationSummary {
  let incomeCount = 0;
  let expenseCount = 0;
  let toVerifyCount = 0;
  let transferCount = 0;
  let sumIncome = 0;
  let sumExpense = 0;
  let changedCount = 0;
  let unchangedCount = 0;

  const toVerifyRows: ToVerifyRow[] = [];

  for (const tx of transactions) {
    const evalRes = evaluateTransactionDeterministic(tx);
    const resolvedType = evalRes.newType;
    const amountVal = evalRes.normalizedAmount;

    if (evalRes.hasChanged) {
      changedCount++;
    } else {
      unchangedCount++;
    }

    if (resolvedType === 'income') {
      incomeCount++;
      sumIncome += amountVal;
    } else if (resolvedType === 'expense') {
      expenseCount++;
      sumExpense += amountVal;
    } else if (resolvedType === 'to_verify') {
      toVerifyCount++;
      toVerifyRows.push({
        id: tx.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        account: tx.account,
        category: tx.category,
        source: tx.source,
        rawAmount: tx.rawAmount,
        originalSignedAmount: evalRes.originalSignedAmount,
        reason: evalRes.reason,
        currentType: tx.type,
      });
    } else if (resolvedType === 'transfer') {
      transferCount++;
    }
  }

  sumIncome = Math.round(sumIncome * 100) / 100;
  sumExpense = Math.round(sumExpense * 100) / 100;
  const netBalance = Math.round((sumIncome - sumExpense) * 100) / 100;

  return {
    totalCount: transactions.length,
    incomeCount,
    expenseCount,
    toVerifyCount,
    transferCount,
    sumIncome,
    sumExpense,
    netBalance,
    changedCount,
    unchangedCount,
    toVerifyRows,
  };
}

/**
 * Applies the migration strictly to existing transactions.
 * Preserves Date, Category, Description, Account, and other user data untouched.
 */
export function executeTypeMigration(
  transactions: Transaction[],
  manualOverrides: Record<string, TransactionType> = {}
): {
  updatedTransactions: Transaction[];
  summary: TypeMigrationSummary;
} {
  const updatedTransactions: Transaction[] = transactions.map(tx => {
    // If user provided a specific manual override during preview review
    if (manualOverrides[tx.id]) {
      const overrideType = manualOverrides[tx.id];
      const normalized = Math.abs(tx.amount);
      const signed = overrideType === 'income' ? normalized : overrideType === 'expense' ? -normalized : 0;
      return {
        ...tx,
        type: overrideType,
        amount: normalized,
        originalSignedAmount: signed,
        normalizedAmount: normalized,
        typeModifiedManually: true,
        typeMigrationReason: `Correzione manuale utente impostata su "${overrideType}"`,
      };
    }

    const evalRes = evaluateTransactionDeterministic(tx);
    return {
      ...tx,
      type: evalRes.newType,
      amount: evalRes.normalizedAmount,
      originalSignedAmount: evalRes.originalSignedAmount,
      normalizedAmount: evalRes.normalizedAmount,
      typeMigrationReason: evalRes.reason,
    };
  });

  const summary = generateTypeMigrationPreview(updatedTransactions);

  return {
    updatedTransactions,
    summary,
  };
}
