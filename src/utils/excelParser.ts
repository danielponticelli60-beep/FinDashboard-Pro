import * as XLSX from 'xlsx';
import { Transaction, TransactionType, Category, AccountType } from '../types';
import { normalizeCategoryKey } from './categoryManager';

export interface ColumnHeaderInfo {
  colIndex: number;
  colLetter: string;
  name: string;
  sampleValues: string[];
}

export interface ManualColumnMapping {
  dateColIndex: number | null; // index of column in sheet (0-based)
  typeColIndex: number | null;
  amountColIndex: number | null;
  categoryColIndex: number | null;
  descriptionColIndex: number | null;
  accountColIndex: number | null;
  runningBalanceColIndex: number | null;
  ignoredColIndexes: number[];
  typeVariants: Record<string, 'income' | 'expense' | 'transfer'>;
  assignEmptyToMainAccount: boolean;
}

export interface ConversionTrace {
  originalDate: string;
  convertedDate: string | null;
  dateRule: string;
  dateError?: string;

  originalType: string;
  convertedType: TransactionType | null;
  typeRule: string;
  typeError?: string;

  originalAmount: string;
  convertedAmount: number | null;
  amountRule: string;
  amountError?: string;

  originalCategory: string;
  convertedCategory: string;
  categoryRule: string;

  originalDescription: string;
  convertedDescription: string;

  originalAccount: string;
  convertedAccount: string;
  accountRule: string;

  originalRunningBalance?: string;
}

export type RowValidationStatus = 'valid' | 'duplicate' | 'to_fix' | 'discarded';

export interface ValidatedRowResult {
  rowNumber: number; // 1-based row number in sheet
  id: string; // Deterministic ID or preview ID
  rawValues: any[];
  trace: ConversionTrace;
  status: RowValidationStatus;
  statusReasons: string[];
  isDuplicateInDB?: boolean;
  isDuplicateInFile?: boolean;
  transactionData?: Omit<Transaction, 'id'>;
}

export interface RawSheetInspection {
  sheetName: string;
  availableSheets: string[];
  totalRows: number;
  totalCols: number;
  rawGrid: any[][]; // 2D array of raw cell strings
  headerRowIndex: number; // 0-based index in rawGrid (e.g. 0 for row 1)
  detectedHeaders: ColumnHeaderInfo[];
  distinctTypeValues: string[];
}

export interface AssistedParseResult {
  inspection: RawSheetInspection;
  mapping: ManualColumnMapping;
  allRows: ValidatedRowResult[];
  validRows: ValidatedRowResult[];
  toFixRows: ValidatedRowResult[];
  discardedRows: ValidatedRowResult[];
  duplicateRows: ValidatedRowResult[];
  
  // Quantitative metrics
  totalRowsCount: number;
  validCount: number;
  toFixCount: number;
  discardedCount: number;
  duplicateCount: number;
  
  sumIncome: number;
  sumExpense: number;
  netBalance: number;

  isMandatoryMappingComplete: boolean;
  savedPresetName: string;
}

export interface MappingPreset {
  id: string;
  name: string;
  createdAt: string;
  sheetNameHint?: string;
  headerRowIndex: number;
  dateColName?: string;
  typeColName?: string;
  amountColName?: string;
  categoryColName?: string;
  descriptionColName?: string;
  accountColName?: string;
  typeVariants?: Record<string, 'income' | 'expense' | 'transfer'>;
  assignEmptyToMainAccount?: boolean;
}

export const DEFAULT_PRESET_NAME = 'Monitor_Finanziario_Dashboard_Completa — Movimenti v1';
const PRESET_STORAGE_KEY = 'findashboard_excel_mapping_presets_v1';

// Convert column index 0, 1, 2... to Excel letters A, B, C... AA, AB...
export const getColumnLetter = (colIndex: number): string => {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

// Generate deterministic ID
export const generateDeterministicId = (
  date: string,
  type: string,
  amount: number,
  desc: string,
  account: string,
  rowNumber: number
): string => {
  const normDate = (date || '').trim().replace(/[^0-9]/g, '');
  const normType = (type || '').trim().toLowerCase().slice(0, 3);
  const normAmount = Number(amount || 0).toFixed(2).replace('.', '');
  const cleanDesc = (desc || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12);
  const cleanAcc = (account || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 6);

  let hash = 0;
  const rawKey = `${normDate}_${normType}_${normAmount}_${cleanDesc}_${cleanAcc}_${rowNumber}`;
  for (let i = 0; i < rawKey.length; i++) {
    const char = rawKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  return `tx-xls-${normDate || '0000'}-${hexHash}`;
};

// Export alias for backward compatibility
export const generateStableTransactionId = generateDeterministicId;

// Make deduplication key
export const makeDuplicateKey = (
  date: string,
  type: string,
  amount: number,
  desc: string,
  account: string
): string => {
  const normDate = (date || '').trim();
  const normType = (type || '').trim().toLowerCase();
  const normAmount = Number(amount || 0).toFixed(2);
  const normDesc = (desc || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const normAcc = (account || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return `${normDate}|${normType}|${normAmount}|${normDesc}|${normAcc}`;
};

// Load saved presets from localStorage
export const loadSavedPresets = (): MappingPreset[] => {
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading excel presets', e);
  }

  // Default initial preset
  const defaultPreset: MappingPreset = {
    id: 'preset_default_v1',
    name: DEFAULT_PRESET_NAME,
    createdAt: new Date().toISOString(),
    sheetNameHint: 'Movimenti',
    headerRowIndex: 0,
    dateColName: 'Data',
    typeColName: 'Tipo',
    amountColName: 'Importo',
    categoryColName: 'Categoria',
    descriptionColName: 'Descrizione',
    accountColName: 'Conto / Metodo',
    typeVariants: {
      'entrata': 'income',
      'accredito': 'income',
      'stipendio': 'income',
      'uscita': 'expense',
      'spesa': 'expense',
      'addebito': 'expense',
      'giroconto': 'transfer',
      'trasferimento': 'transfer'
    },
    assignEmptyToMainAccount: true,
  };

  return [defaultPreset];
};

// Save presets to localStorage
export const savePreset = (preset: MappingPreset) => {
  try {
    const existing = loadSavedPresets().filter(p => p.name !== preset.name);
    const updated = [preset, ...existing];
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving preset', e);
  }
};

// 1. Raw Inspection of Worksheet
export const inspectRawWorksheet = (
  worksheet: XLSX.WorkSheet,
  sheetName: string,
  availableSheets: string[],
  headerRowIndex = 0
): RawSheetInspection => {
  // Read worksheet as 2D raw array with defval: ''
  const rawGrid: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  const totalRows = rawGrid.length;
  let maxCols = 0;
  rawGrid.forEach(row => {
    if (Array.isArray(row) && row.length > maxCols) {
      maxCols = row.length;
    }
  });

  // Clamp header row index
  const safeHeaderRowIdx = Math.max(0, Math.min(headerRowIndex, Math.max(0, totalRows - 1)));
  const headerRow = rawGrid[safeHeaderRowIdx] || [];

  const detectedHeaders: ColumnHeaderInfo[] = [];
  const typeValuesSet = new Set<string>();

  for (let c = 0; c < Math.max(maxCols, headerRow.length); c++) {
    const rawVal = headerRow[c];
    const name = (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '')
      ? String(rawVal).trim()
      : `Colonna ${getColumnLetter(c)}`;

    // Collect first 4 non-empty sample values from subsequent rows
    const sampleValues: string[] = [];
    for (let r = safeHeaderRowIdx + 1; r < Math.min(totalRows, safeHeaderRowIdx + 25); r++) {
      const cellVal = rawGrid[r] ? rawGrid[r][c] : '';
      if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '') {
        sampleValues.push(String(cellVal).trim());
        if (sampleValues.length >= 4) break;
      }
    }

    detectedHeaders.push({
      colIndex: c,
      colLetter: getColumnLetter(c),
      name,
      sampleValues,
    });
  }

  // Scan distinct values for potential type column
  for (let r = safeHeaderRowIdx + 1; r < totalRows; r++) {
    const row = rawGrid[r];
    if (row) {
      row.forEach(val => {
        if (val && typeof val === 'string' && val.trim().length <= 25) {
          const l = val.trim().toLowerCase();
          if (
            l.includes('entrata') || l.includes('uscita') || l.includes('giroconto') ||
            l.includes('spesa') || l.includes('accredito') || l.includes('addebito') ||
            l.includes('income') || l.includes('expense') || l.includes('transfer')
          ) {
            typeValuesSet.add(val.trim());
          }
        }
      });
    }
  }

  return {
    sheetName,
    availableSheets,
    totalRows,
    totalCols: maxCols,
    rawGrid,
    headerRowIndex: safeHeaderRowIdx,
    detectedHeaders,
    distinctTypeValues: Array.from(typeValuesSet),
  };
};

// 2. Controlled Date Parsing
export const parseItalianDateControlled = (val: any): { date: string | null; rule: string; error?: string } => {
  if (val === null || val === undefined || String(val).trim() === '') {
    return { date: null, rule: 'Valore vuoto', error: 'Data assente' };
  }

  // Number / Excel serial date
  if (typeof val === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const days = Math.floor(val);
    const date = new Date(excelEpoch.getTime() + days * 86400000);
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return { date: `${y}-${m}-${d}`, rule: `Seriale Excel numerico (${val}) → YYYY-MM-DD` };
    }
  }

  // Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return { date: `${y}-${m}-${d}`, rule: 'Oggetto Date nativo → YYYY-MM-DD' };
  }

  const str = String(val).trim();

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const itMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (itMatch) {
    const day = itMatch[1].padStart(2, '0');
    const month = itMatch[2].padStart(2, '0');
    const year = itMatch[3];
    const numD = parseInt(day, 10);
    const numM = parseInt(month, 10);
    if (numD >= 1 && numD <= 31 && numM >= 1 && numM <= 12) {
      return { date: `${year}-${month}-${day}`, rule: `Formato italiano GG/MM/AAAA ("${str}") → ${year}-${month}-${day}` };
    }
    return { date: null, rule: `Formato GG/MM/AAAA invalido ("${str}")`, error: 'Giorno o mese non valido' };
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return { date: `${year}-${month}-${day}`, rule: `Formato ISO AAAA-MM-GG ("${str}") → ${year}-${month}-${day}` };
  }

  // Fallback
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return { date: `${year}-${month}-${day}`, rule: `Data standard ("${str}") → ${year}-${month}-${day}` };
  }

  return { date: null, rule: 'Nessun formato data riconosciuto', error: `Impossibile convertire "${str}" in data` };
};

// 3. Controlled Amount Parsing
export const parseItalianAmountControlled = (val: any): { amount: number | null; isNegative: boolean; rule: string; error?: string } => {
  if (val === null || val === undefined || String(val).trim() === '') {
    return { amount: null, isNegative: false, rule: 'Valore vuoto', error: 'Importo assente' };
  }

  if (typeof val === 'number') {
    if (isNaN(val)) return { amount: null, isNegative: false, rule: 'Numero NaN', error: 'Importo non numerico' };
    const isNegative = val < 0;
    const absVal = Math.round(Math.abs(val) * 100) / 100;
    return {
      amount: absVal,
      isNegative,
      rule: `Valore numerico nativo Excel: ${val} → € ${absVal.toFixed(2)} (${isNegative ? 'Negativo' : 'Positivo'})`,
    };
  }

  let str = String(val).trim();
  str = str.replace(/[€$£\s]/g, '');

  let isNegative = false;
  if (str.startsWith('-') || str.startsWith('(')) {
    isNegative = true;
    str = str.replace(/^[\-\(]/, '').replace(/\)$/, '');
  }

  let rule = '';
  // European format 1.250,00 vs 1250.00
  if (str.includes(',') && str.includes('.')) {
    if (str.indexOf('.') < str.indexOf(',')) {
      // 1.250,00 -> remove thousand dot, replace decimal comma
      str = str.replace(/\./g, '').replace(',', '.');
      rule = 'Formato valuta italiano (1.250,00)';
    } else {
      // 1,250.00 -> remove comma
      str = str.replace(/,/g, '');
      rule = 'Formato valuta internazionale (1,250.00)';
    }
  } else if (str.includes(',')) {
    // 1250,00 -> replace comma with dot
    str = str.replace(',', '.');
    rule = 'Virgola decimale italiana (1250,00)';
  } else {
    rule = 'Numero decimale con punto (1250.00)';
  }

  const parsed = parseFloat(str);
  if (isNaN(parsed)) {
    return { amount: null, isNegative: false, rule, error: `Impossibile convertire "${val}" in numero` };
  }

  const rounded = Math.round(parsed * 100) / 100;
  return {
    amount: Math.abs(rounded),
    isNegative,
    rule: `${rule} → € ${Math.abs(rounded).toFixed(2)}${isNegative ? ' (Segno negativo rilevato)' : ''}`,
  };
};

// 4. Controlled Type Parsing
export const parseTransactionTypeControlled = (
  rawType: any,
  amountIsNegative: boolean,
  typeVariants: Record<string, 'income' | 'expense' | 'transfer'> = {}
): { type: TransactionType | null; rule: string; error?: string } => {
  const str = String(rawType || '').trim().toLowerCase();

  // Check custom user variant mappings
  if (str && typeVariants[str]) {
    const target = typeVariants[str];
    return {
      type: target,
      rule: `Mappatura manuale personalizzata: "${str}" → ${target === 'income' ? 'Entrata' : target === 'transfer' ? 'Giroconto' : 'Uscita'}`,
    };
  }

  if (str === 'entrata' || str === 'income' || str === 'accredito' || str === 'ricavo' || str === 'stipendio' || str === '+') {
    return { type: 'income', rule: `Riconosciuta parola chiave Entrata ("${rawType}")` };
  }

  if (str === 'giroconto' || str === 'trasferimento' || str === 'transfer' || str === 'giroconti') {
    return { type: 'transfer', rule: `Riconosciuta parola chiave Giroconto ("${rawType}")` };
  }

  if (str === 'uscita' || str === 'expense' || str === 'spesa' || str === 'addebito' || str === 'costo' || str === '-') {
    return { type: 'expense', rule: `Riconosciuta parola chiave Uscita ("${rawType}")` };
  }

  // If type string is empty but amount was negative, suggest expense
  if (!str && amountIsNegative) {
    return { type: 'expense', rule: 'Tipo non specificato, dedotto da importo negativo (-) → Uscita' };
  }

  if (!str) {
    return { type: null, rule: 'Campo tipo vuoto', error: 'Tipo movimento mancante' };
  }

  return {
    type: null,
    rule: `Valore non riconosciuto ("${rawType}")`,
    error: `Valore "${rawType}" non mappato a Entrata, Uscita o Giroconto`,
  };
};

// 5. Execute Assisted Parsing and Validation
export const parseWorksheetAssisted = (
  inspection: RawSheetInspection,
  mapping: ManualColumnMapping,
  existingTransactions: Transaction[] = [],
  savedPresetName: string = DEFAULT_PRESET_NAME
): AssistedParseResult => {
  const { rawGrid, headerRowIndex, totalRows } = inspection;

  const isMandatoryMappingComplete = 
    mapping.dateColIndex !== null &&
    mapping.typeColIndex !== null &&
    mapping.amountColIndex !== null;

  if (!isMandatoryMappingComplete) {
    return {
      inspection,
      mapping,
      allRows: [],
      validRows: [],
      toFixRows: [],
      discardedRows: [],
      duplicateRows: [],
      totalRowsCount: 0,
      validCount: 0,
      toFixCount: 0,
      discardedCount: 0,
      duplicateCount: 0,
      sumIncome: 0,
      sumExpense: 0,
      netBalance: 0,
      isMandatoryMappingComplete: false,
      savedPresetName,
    };
  }

  // Pre-load existing duplicates map
  const existingDupSet = new Set<string>();
  existingTransactions.forEach(tx => {
    existingDupSet.add(makeDuplicateKey(tx.date, tx.type, tx.amount, tx.description, tx.account));
  });

  const internalSeenSet = new Set<string>();

  const allRows: ValidatedRowResult[] = [];
  const validRows: ValidatedRowResult[] = [];
  const toFixRows: ValidatedRowResult[] = [];
  const discardedRows: ValidatedRowResult[] = [];
  const duplicateRows: ValidatedRowResult[] = [];

  let sumIncome = 0;
  let sumExpense = 0;

  for (let r = headerRowIndex + 1; r < totalRows; r++) {
    const rowNumber = r + 1; // 1-based row number
    const rowValues = rawGrid[r] || [];

    // Check if entire row is empty
    const hasAnyValue = rowValues.some(val => val !== undefined && val !== null && String(val).trim() !== '');
    if (!hasAnyValue) {
      // Discard empty row
      const discarded: ValidatedRowResult = {
        rowNumber,
        id: `empty-row-${rowNumber}`,
        rawValues: rowValues,
        trace: {
          originalDate: '',
          convertedDate: null,
          dateRule: 'Riga vuota',
          originalType: '',
          convertedType: null,
          typeRule: 'Riga vuota',
          originalAmount: '',
          convertedAmount: null,
          amountRule: 'Riga vuota',
          originalCategory: '',
          convertedCategory: '',
          categoryRule: 'Invariata',
          originalDescription: '',
          convertedDescription: '',
          originalAccount: '',
          convertedAccount: '',
          accountRule: 'Nessuna',
        },
        status: 'discarded',
        statusReasons: ['Riga completamente vuota'],
      };
      discardedRows.push(discarded);
      allRows.push(discarded);
      continue;
    }

    // Extract raw mapped cell values
    const rawDate = mapping.dateColIndex !== null ? rowValues[mapping.dateColIndex] : '';
    const rawType = mapping.typeColIndex !== null ? rowValues[mapping.typeColIndex] : '';
    const rawAmount = mapping.amountColIndex !== null ? rowValues[mapping.amountColIndex] : '';
    const rawCategory = mapping.categoryColIndex !== null ? rowValues[mapping.categoryColIndex] : '';
    const rawDesc = mapping.descriptionColIndex !== null ? rowValues[mapping.descriptionColIndex] : '';
    const rawAccount = mapping.accountColIndex !== null ? rowValues[mapping.accountColIndex] : '';
    const rawRunningBal = mapping.runningBalanceColIndex !== null ? rowValues[mapping.runningBalanceColIndex] : '';

    // Check if summary row (Totale, Somma, Riepilogo)
    const combinedText = `${rawDate} ${rawType} ${rawCategory} ${rawDesc}`.toLowerCase();
    if (
      combinedText.includes('totale entrate') ||
      combinedText.includes('totale uscite') ||
      combinedText.includes('saldo finale') ||
      combinedText.includes('somma totale') ||
      combinedText.includes('riepilogo')
    ) {
      const summaryDiscarded: ValidatedRowResult = {
        rowNumber,
        id: `summary-row-${rowNumber}`,
        rawValues: rowValues,
        trace: {
          originalDate: String(rawDate || ''),
          convertedDate: null,
          dateRule: 'Esclusione riga di riepilogo',
          originalType: String(rawType || ''),
          convertedType: null,
          typeRule: 'Esclusione',
          originalAmount: String(rawAmount || ''),
          convertedAmount: null,
          amountRule: 'Esclusione',
          originalCategory: String(rawCategory || ''),
          convertedCategory: '',
          categoryRule: 'Invariata',
          originalDescription: String(rawDesc || ''),
          convertedDescription: '',
          originalAccount: String(rawAccount || ''),
          convertedAccount: '',
          accountRule: 'Nessuna',
        },
        status: 'discarded',
        statusReasons: ['Riga di riepilogo/totali del foglio esclusa dal calcolo'],
      };
      discardedRows.push(summaryDiscarded);
      allRows.push(summaryDiscarded);
      continue;
    }

    // Trace parsing
    const dateParsed = parseItalianDateControlled(rawDate);
    const amountParsed = parseItalianAmountControlled(rawAmount);
    const typeParsed = parseTransactionTypeControlled(rawType, amountParsed.isNegative, mapping.typeVariants);

    // Exact text preservation for Category (CRITICAL requirement: NO NORMALIZATION / NO INVENTIONS)
    const exactCategory = String(rawCategory || '').trim() || (typeParsed.type === 'income' ? 'Altre Entrate' : 'Altro Spese');
    const categoryRule = 'Testo originale conservato esattamente senza normalizzazione';

    // Exact text preservation for Description
    const exactDesc = String(rawDesc || '').trim() || (typeParsed.type === 'income' ? 'Entrata da file' : 'Spesa da file');

    // Conto / Metodo preservation & empty assignment logic
    let exactAccount: string = String(rawAccount || '').trim();
    let accountRule = 'Testo originale conservato';
    if (!exactAccount) {
      if (mapping.assignEmptyToMainAccount) {
        exactAccount = 'Conto Principale';
        accountRule = 'Valore vuoto → Assegnato Conto Principale (previa conferma utente)';
      } else {
        exactAccount = 'Non specificato';
        accountRule = 'Valore assente';
      }
    }

    const trace: ConversionTrace = {
      originalDate: String(rawDate || ''),
      convertedDate: dateParsed.date,
      dateRule: dateParsed.rule,
      dateError: dateParsed.error,

      originalType: String(rawType || ''),
      convertedType: typeParsed.type,
      typeRule: typeParsed.rule,
      typeError: typeParsed.error,

      originalAmount: String(rawAmount || ''),
      convertedAmount: amountParsed.amount,
      amountRule: amountParsed.rule,
      amountError: amountParsed.error,

      originalCategory: String(rawCategory || ''),
      convertedCategory: exactCategory,
      categoryRule,

      originalDescription: String(rawDesc || ''),
      convertedDescription: exactDesc,

      originalAccount: String(rawAccount || ''),
      convertedAccount: exactAccount,
      accountRule,

      originalRunningBalance: rawRunningBal ? String(rawRunningBal) : undefined,
    };

    const statusReasons: string[] = [];
    if (dateParsed.error) statusReasons.push(`Data: ${dateParsed.error}`);
    if (amountParsed.error) statusReasons.push(`Importo: ${amountParsed.error}`);
    if (typeParsed.error) statusReasons.push(`Tipo: ${typeParsed.error}`);

    // If conversion errors exist -> 'to_fix'
    if (statusReasons.length > 0) {
      const toFixRow: ValidatedRowResult = {
        rowNumber,
        id: `row-tofix-${rowNumber}`,
        rawValues: rowValues,
        trace,
        status: 'to_fix',
        statusReasons,
      };
      toFixRows.push(toFixRow);
      allRows.push(toFixRow);
      continue;
    }

    // Check Duplicates
    const finalDate = dateParsed.date!;
    const finalType = typeParsed.type!;
    const finalAmount = amountParsed.amount!;
    const dupKey = makeDuplicateKey(finalDate, finalType, finalAmount, exactDesc, exactAccount);

    if (existingDupSet.has(dupKey)) {
      const dupRow: ValidatedRowResult = {
        rowNumber,
        id: generateDeterministicId(finalDate, finalType, finalAmount, exactDesc, exactAccount, rowNumber),
        rawValues: rowValues,
        trace,
        status: 'duplicate',
        statusReasons: ['Movimento già presente nell’archivio locale (Data, Tipo, Importo, Descrizione, Conto identici)'],
        isDuplicateInDB: true,
      };
      duplicateRows.push(dupRow);
      allRows.push(dupRow);
      continue;
    }

    if (internalSeenSet.has(dupKey)) {
      const dupRow: ValidatedRowResult = {
        rowNumber,
        id: generateDeterministicId(finalDate, finalType, finalAmount, exactDesc, exactAccount, rowNumber),
        rawValues: rowValues,
        trace,
        status: 'duplicate',
        statusReasons: ['Riga duplicata all’interno dello stesso file Excel'],
        isDuplicateInFile: true,
      };
      duplicateRows.push(dupRow);
      allRows.push(dupRow);
      continue;
    }

    internalSeenSet.add(dupKey);

    // Build standard transaction structure
    const stableId = generateDeterministicId(finalDate, finalType, finalAmount, exactDesc, exactAccount, rowNumber);

    const signedAmount = amountParsed.isNegative ? -finalAmount : (finalType === 'income' ? finalAmount : -finalAmount);

    const catRaw = String(rawCategory || '').trim();
    const normCatKey = normalizeCategoryKey(catRaw);
    const exactCatLabel = exactCategory || catRaw || 'Da verificare';

    const transactionData: Omit<Transaction, 'id'> = {
      date: finalDate,
      type: finalType,
      amount: finalAmount,
      categoryId: normCatKey,
      categoryLabel: exactCatLabel,
      category: exactCatLabel as Category,
      rawCategory: catRaw || undefined,
      subcategory: undefined,
      description: exactDesc,
      account: exactAccount as AccountType,
      status: 'completed',
      notes: `Importato da foglio "${inspection.sheetName}" (riga ${rowNumber})`,
      source: 'Excel personale',
      originalSignedAmount: signedAmount,
      rawAmount: rawAmount !== undefined && rawAmount !== null ? String(rawAmount) : undefined,
      normalizedAmount: finalAmount,
    };

    const validRow: ValidatedRowResult = {
      rowNumber,
      id: stableId,
      rawValues: rowValues,
      trace,
      status: 'valid',
      statusReasons: ['Movimento valido e pronto per l’importazione'],
      transactionData,
    };

    validRows.push(validRow);
    allRows.push(validRow);

    if (finalType === 'income') {
      sumIncome += finalAmount;
    } else if (finalType === 'expense') {
      sumExpense += finalAmount;
    }
  }

  const netBalance = Math.round((sumIncome - sumExpense) * 100) / 100;

  return {
    inspection,
    mapping,
    allRows,
    validRows,
    toFixRows,
    discardedRows,
    duplicateRows,
    totalRowsCount: allRows.length,
    validCount: validRows.length,
    toFixCount: toFixRows.length,
    discardedCount: discardedRows.length,
    duplicateCount: duplicateRows.length,
    sumIncome: Math.round(sumIncome * 100) / 100,
    sumExpense: Math.round(sumExpense * 100) / 100,
    netBalance,
    isMandatoryMappingComplete,
    savedPresetName,
  };
};
