import { BASE_CATEGORIES } from '../../utils/categoryManager';
import { ParsedVoiceCommand, ParseConfidence, VoiceCommandType, VoiceParserAccount } from './voiceCommandTypes';

/**
 * Local, deterministic Italian voice-command parser. No network calls, no
 * audio handling - takes text (from Apple Shortcuts dictation) and returns a
 * best-effort, never-inventing parse. Ambiguous or unrecognized values are
 * left null with a warning rather than guessed - the review UI (see
 * VoiceCommandReviewModal.tsx) is the only place a transaction is actually
 * created, and only after an explicit user tap.
 */

const MAX_INPUT_LENGTH = 500;

const round2 = (n: number): number => Math.round(n * 100) / 100;

// Lowercase + collapse whitespace only - Italian diacritics (à, è, ì, ò, ù)
// are kept intact since month names and several keywords rely on them.
const normalize = (s: string): string => s.toLowerCase().replace(/\s+/g, ' ').trim();

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------------------------------------------------------------------
// Amount extraction
// ---------------------------------------------------------------------------

// Matches either a dot-grouped Italian thousands number ("1.200") or a bare
// digit run with no separator ("1300") - the strict "groups of exactly 3
// after each dot" form alone would silently mis-match a plain 4+ digit
// number with no thousands separator (e.g. "1300 euro" would match just
// "300", skipping the leading "1"), which was a real bug found by testing
// against the spec's own "Ho ricevuto 1300 euro..." example.
const WHOLE_NUMBER = String.raw`(?:\d{1,3}(?:\.\d{3})+|\d+)`;
const AMOUNT_DIGITS = `${WHOLE_NUMBER}(?:,\\d{1,2})?`;

export function extractAmount(text: string): number | null {
  // "X euro e Y" -> X.YY (spoken cents form)
  const eurosECents = text.match(new RegExp(`(${WHOLE_NUMBER})\\s*euro\\s+e\\s+(\\d{1,2})\\b`, 'i'));
  if (eurosECents) {
    const whole = parseInt(eurosECents[1].replace(/\./g, ''), 10);
    const centsStr = eurosECents[2].length === 1 ? `${eurosECents[2]}0` : eurosECents[2];
    const cents = parseInt(centsStr, 10);
    if (!isNaN(whole) && !isNaN(cents)) return round2(whole + cents / 100);
  }

  // "mille euro" - the only word-form amount supported in this MVP
  if (/\bmille\s+euro\b/i.test(text)) return 1000;

  // "12,50 euro" / "1.200 euro" / "1.200,50 euro" / "12 euro" / "1300 euro"
  const numThenUnit = text.match(new RegExp(`(${AMOUNT_DIGITS})\\s*(?:euro|€)`, 'i'));
  // "€12,50" / "€ 1.200,50"
  const unitThenNum = text.match(new RegExp(`€\\s*(${AMOUNT_DIGITS})`, 'i'));
  const rawMatch = numThenUnit?.[1] ?? unitThenNum?.[1];
  if (rawMatch) {
    const normalized = rawMatch.replace(/\./g, '').replace(',', '.');
    const val = parseFloat(normalized);
    if (!isNaN(val) && isFinite(val)) return round2(val);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Date extraction
// ---------------------------------------------------------------------------

const MONTHS_IT = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

const addDaysToISODate = (isoDate: string, days: number): string => {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};

const AMBIGUOUS_DATE_PATTERN = /\b(luned[ìi]|marted[ìi]|mercoled[ìi]|gioved[ìi]|venerd[ìi]|sabato|domenica)\s+scors[oa]\b|\bl['’]?\s?altro\s+giorno\b|\bqualche\s+giorno\s+fa\b/i;

export function extractDate(text: string, today: string): { date: string | null; warning: string | null } {
  if (/\boggi\b/i.test(text)) return { date: today, warning: null };
  if (/\bieri\b/i.test(text)) return { date: addDaysToISODate(today, -1), warning: null };
  if (/\bdomani\b/i.test(text)) return { date: addDaysToISODate(today, 1), warning: null };

  const monthPattern = MONTHS_IT.join('|');
  const dateMatch = text.match(new RegExp(`\\b(\\d{1,2})\\s+(${monthPattern})\\b`, 'i'));
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const monthIdx = MONTHS_IT.indexOf(dateMatch[2].toLowerCase());
    const year = parseInt(today.slice(0, 4), 10);
    if (day >= 1 && day <= 31 && monthIdx >= 0) {
      const mm = String(monthIdx + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return { date: `${year}-${mm}-${dd}`, warning: null };
    }
  }

  if (AMBIGUOUS_DATE_PATTERN.test(text)) {
    return { date: null, warning: 'Data ambigua ("scorso"/riferimento relativo): seleziona la data manualmente.' };
  }

  // No date phrase at all -> silently default to today, per spec.
  return { date: today, warning: null };
}

// ---------------------------------------------------------------------------
// Type detection
// ---------------------------------------------------------------------------

const TRANSFER_KEYWORDS = ['trasferisci', 'trasferimento', 'giroconto', 'ricarica', 'carica', 'ricarico', 'verso'];
const INCOME_KEYWORDS = ['ricevuto', 'accreditato', 'accredito', 'entrata', 'stipendio', 'incassato', 'rimborso', 'guadagnato'];
const EXPENSE_KEYWORDS = ['spesa', 'speso', 'pagato', 'pagata', 'uscita', 'costa', 'addebito'];

const matchesAnyKeyword = (text: string, keywords: string[]): boolean =>
  keywords.some((kw) => new RegExp(`\\b${escapeRegex(kw)}\\b`, 'i').test(text));

export function detectType(text: string): VoiceCommandType | null {
  // Transfer checked first: most structurally specific, and words like
  // "ricarica" would otherwise read as ambiguous.
  if (matchesAnyKeyword(text, TRANSFER_KEYWORDS)) return 'transfer';
  if (matchesAnyKeyword(text, INCOME_KEYWORDS)) return 'income';
  if (matchesAnyKeyword(text, EXPENSE_KEYWORDS)) return 'expense';
  return null;
}

// ---------------------------------------------------------------------------
// Account resolution
// ---------------------------------------------------------------------------

const ACCOUNT_SYNONYM_TO_KINDS: { phrase: string; kinds: string[] }[] = [
  { phrase: 'conto corrente', kinds: ['checking'] },
  { phrase: 'conto principale', kinds: ['checking'] },
  { phrase: 'carta prepagata', kinds: ['prepaid_card'] },
  { phrase: 'carta di credito', kinds: ['credit_card'] },
  { phrase: 'prepagata', kinds: ['prepaid_card'] },
  { phrase: 'carta', kinds: ['prepaid_card', 'credit_card'] },
  { phrase: 'contanti', kinds: ['cash'] },
  { phrase: 'risparmio', kinds: ['savings'] },
  { phrase: 'conto', kinds: ['checking'] },
];
// Longest phrase first so "carta prepagata" is tried before bare "carta".
const ACCOUNT_SYNONYM_PATTERN = ACCOUNT_SYNONYM_TO_KINDS
  .map((s) => s.phrase)
  .sort((a, b) => b.length - a.length)
  .map(escapeRegex)
  .join('|');

export interface AccountResolution {
  accountId: string | null;
  accountLabel: string | null;
  ambiguousCandidateIds: string[];
}

/** Resolves one account phrase (e.g. "carta prepagata") against the user's
 * real, dynamic accounts[] list - label match first (works directly for a
 * custom-labeled account), then a kind heuristic as fallback. Never guesses
 * between multiple equally-plausible candidates. */
export function resolveAccountPhrase(phrase: string, accounts: VoiceParserAccount[]): AccountResolution {
  const norm = normalize(phrase);
  if (!norm) return { accountId: null, accountLabel: null, ambiguousCandidateIds: [] };

  const labelMatches = accounts.filter((a) => {
    const accNorm = normalize(a.label);
    return accNorm.includes(norm) || norm.includes(accNorm);
  });
  if (labelMatches.length === 1) {
    return { accountId: labelMatches[0].id, accountLabel: labelMatches[0].label, ambiguousCandidateIds: [] };
  }
  if (labelMatches.length > 1) {
    return { accountId: null, accountLabel: null, ambiguousCandidateIds: labelMatches.map((a) => a.id) };
  }

  const synonym = ACCOUNT_SYNONYM_TO_KINDS.find((s) => s.phrase === norm);
  if (synonym) {
    const kindMatches = accounts.filter((a) => synonym.kinds.includes(a.kind));
    if (kindMatches.length === 1) {
      return { accountId: kindMatches[0].id, accountLabel: kindMatches[0].label, ambiguousCandidateIds: [] };
    }
    if (kindMatches.length > 1) {
      return { accountId: null, accountLabel: null, ambiguousCandidateIds: kindMatches.map((a) => a.id) };
    }
  }

  return { accountId: null, accountLabel: null, ambiguousCandidateIds: [] };
}

/** Single-account resolution for income/expense commands: finds the first
 * recognized account-synonym phrase anywhere in the text and resolves it. */
function resolveSingleAccount(text: string, accounts: VoiceParserAccount[]): AccountResolution {
  const match = text.match(new RegExp(`\\b(${ACCOUNT_SYNONYM_PATTERN})\\b`, 'i'));
  if (!match) return { accountId: null, accountLabel: null, ambiguousCandidateIds: [] };
  return resolveAccountPhrase(match[1], accounts);
}

/** from/to resolution for transfer commands. Tries "da X a/alla/verso Y"
 * first, then the reversed "a/su/verso Y ... da X" order (covers "Ricarica
 * di 100 euro sulla prepagata dal conto corrente"). If neither directional
 * pattern is found, returns both null - never guesses direction from bare
 * word order. */
function resolveTransferAccounts(
  text: string,
  accounts: VoiceParserAccount[]
): { from: AccountResolution; to: AccountResolution; directionFound: boolean } {
  const empty: AccountResolution = { accountId: null, accountLabel: null, ambiguousCandidateIds: [] };

  const sourceToDestPattern = new RegExp(
    `\\bda(?:l|lla|ll['’])?\\s+(${ACCOUNT_SYNONYM_PATTERN})\\b.*?\\b(?:a|al|alla|all['’]|verso)\\s+(${ACCOUNT_SYNONYM_PATTERN})\\b`,
    'i'
  );
  const m1 = text.match(sourceToDestPattern);
  if (m1) {
    return { from: resolveAccountPhrase(m1[1], accounts), to: resolveAccountPhrase(m1[2], accounts), directionFound: true };
  }

  const destToSourcePattern = new RegExp(
    `\\b(?:a|al|alla|all['’]|su|sul|sulla|sull['’]|verso)\\s+(${ACCOUNT_SYNONYM_PATTERN})\\b.*?\\bda(?:l|lla|ll['’])?\\s+(${ACCOUNT_SYNONYM_PATTERN})\\b`,
    'i'
  );
  const m2 = text.match(destToSourcePattern);
  if (m2) {
    return { from: resolveAccountPhrase(m2[2], accounts), to: resolveAccountPhrase(m2[1], accounts), directionFound: true };
  }

  return { from: empty, to: empty, directionFound: false };
}

// ---------------------------------------------------------------------------
// Category resolution
// ---------------------------------------------------------------------------

const CATEGORY_KEYWORD_ALIASES: Record<string, string> = {
  'supermercato': 'alimentari_e_spesa',
  'spesa alimentare': 'alimentari_e_spesa',
  'ristorante': 'ristoranti_e_svago',
  'bar': 'ristoranti_e_svago',
  'aperitivo': 'ristoranti_e_svago',
  'cena': 'ristoranti_e_svago',
  'svago e ristoranti': 'ristoranti_e_svago', // legacy variant, always normalized to the canonical category
  'benzina': 'trasporti_e_auto',
  'autobus': 'trasporti_e_auto',
  'treno': 'trasporti_e_auto',
  'taxi': 'trasporti_e_auto',
  'parcheggio': 'trasporti_e_auto',
  'farmacia': 'salute_e_benessere',
  'medico': 'salute_e_benessere',
  'palestra': 'salute_e_benessere',
  'affitto': 'casa_e_utenze',
  'bolletta': 'casa_e_utenze',
  'luce': 'casa_e_utenze',
  'gas': 'casa_e_utenze',
  'internet': 'casa_e_utenze',
  'spotify': 'abbonamenti_e_servizi',
  'netflix': 'abbonamenti_e_servizi',
  'abbonamento': 'abbonamenti_e_servizi',
  'corso': 'educazione_e_corsi',
  'libro': 'educazione_e_corsi',
  'lezione': 'educazione_e_corsi',
  'formazione': 'educazione_e_corsi',
  'shopping': 'shopping_e_abbigliamento',
  'vestiti': 'shopping_e_abbigliamento',
  'abbigliamento': 'shopping_e_abbigliamento',
  'viaggio': 'viaggi_e_vacanze',
  'hotel': 'viaggi_e_vacanze',
  'aereo': 'viaggi_e_vacanze',
  'stipendio': 'stipendio',
  'rimborso': 'rimborsi_e_vendite',
  'vendita': 'rimborsi_e_vendite',
};

const sortedCategoryKeywords = Object.keys(CATEGORY_KEYWORD_ALIASES).sort((a, b) => b.length - a.length);

interface CategoryResolution {
  categoryId: string | null;
  categoryLabel: string | null;
  matchedKeyword: string | null;
  warning: string | null;
}

export function resolveCategory(text: string, type: VoiceCommandType): CategoryResolution {
  if (type === 'transfer') {
    const cat = BASE_CATEGORIES.find((c) => c.id === 'giroconto_trasferimento')!;
    return { categoryId: cat.id, categoryLabel: cat.label, matchedKeyword: null, warning: null };
  }

  for (const kw of sortedCategoryKeywords) {
    if (new RegExp(`\\b${escapeRegex(kw)}\\b`, 'i').test(text)) {
      const cat = BASE_CATEGORIES.find((c) => c.id === CATEGORY_KEYWORD_ALIASES[kw]);
      if (cat) return { categoryId: cat.id, categoryLabel: cat.label, matchedKeyword: kw, warning: null };
    }
  }

  const fallbackId = type === 'income' ? 'altre_entrate' : 'altro_spese';
  const fallbackCat = BASE_CATEGORIES.find((c) => c.id === fallbackId)!;
  return {
    categoryId: fallbackCat.id,
    categoryLabel: fallbackCat.label,
    matchedKeyword: null,
    warning: `Categoria non riconosciuta nel testo: proposta "${fallbackCat.label}", verifica prima di confermare.`,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

const capitalize = (s: string): string => (s.length ? s[0].toUpperCase() + s.slice(1) : s);

export function parseItalianVoiceCommand(
  rawTextInput: string,
  accounts: VoiceParserAccount[],
  todayISODate: string
): ParsedVoiceCommand {
  const rawText = (rawTextInput ?? '').slice(0, MAX_INPUT_LENGTH);
  const normalizedText = normalize(rawText);
  const warnings: string[] = [];
  const missingFields: string[] = [];

  if (!normalizedText) {
    return {
      rawText,
      normalizedText,
      type: null,
      amount: null,
      currency: 'EUR',
      categoryId: null,
      categoryLabel: null,
      accountId: null,
      accountLabel: null,
      fromAccountId: null,
      toAccountId: null,
      date: null,
      description: '',
      confidence: 'low',
      warnings: ['Comando vuoto o non interpretabile.'],
      missingFields: ['type', 'amount'],
    };
  }

  const amount = extractAmount(normalizedText);

  let type = detectType(normalizedText);
  if (!type) {
    // No explicit verb ("speso"/"pagato"/...), but a shorthand note like
    // "8 euro autobus in contanti" is still a clear expense: an amount plus
    // a recognized category keyword is a strong enough secondary signal to
    // default to 'expense' (the overwhelmingly common shape for quick
    // dictated notes) rather than leaving the whole command unusable. Flagged
    // as inferred (not silent) so confidence drops to 'medium', not 'high'.
    const hasCategorySignal = sortedCategoryKeywords.some((kw) => new RegExp(`\\b${escapeRegex(kw)}\\b`, 'i').test(normalizedText));
    if (amount !== null && hasCategorySignal) {
      type = 'expense';
      warnings.push('Tipo di movimento non dichiarato esplicitamente: dedotto "Uscita" dal contesto, verifica prima di confermare.');
    } else {
      warnings.push('Tipo di movimento non riconosciuto (entrata/uscita/giroconto): selezionalo manualmente.');
      missingFields.push('type');
    }
  }

  if (amount === null) {
    warnings.push('Importo non riconosciuto: inseriscilo manualmente.');
    missingFields.push('amount');
  } else if (!(amount > 0) || !isFinite(amount)) {
    warnings.push('Importo non valido (deve essere maggiore di zero): correggilo manualmente.');
    missingFields.push('amount');
  }

  const { date, warning: dateWarning } = extractDate(normalizedText, todayISODate);
  if (dateWarning) {
    warnings.push(dateWarning);
    missingFields.push('date');
  }

  let accountId: string | null = null;
  let accountLabel: string | null = null;
  let fromAccountId: string | null = null;
  let toAccountId: string | null = null;

  if (type === 'transfer') {
    const { from, to, directionFound } = resolveTransferAccounts(normalizedText, accounts);
    fromAccountId = from.accountId;
    toAccountId = to.accountId;
    if (!directionFound) {
      warnings.push('Origine e destinazione del trasferimento non chiare: specifica "da... a..." oppure selezionale manualmente.');
    }
    if (!fromAccountId) {
      missingFields.push('fromAccountId');
      if (from.ambiguousCandidateIds.length > 1) warnings.push('Più conti di origine compatibili: seleziona quello corretto.');
    }
    if (!toAccountId) {
      missingFields.push('toAccountId');
      if (to.ambiguousCandidateIds.length > 1) warnings.push('Più conti di destinazione compatibili: seleziona quello corretto.');
    }
    if (fromAccountId && toAccountId && fromAccountId === toAccountId) {
      warnings.push('Il conto di origine e destinazione coincidono: correggi manualmente.');
      toAccountId = null;
      missingFields.push('toAccountId');
    }
  } else if (type === 'income' || type === 'expense') {
    const resolved = resolveSingleAccount(normalizedText, accounts);
    accountId = resolved.accountId;
    accountLabel = resolved.accountLabel;
    if (!accountId) {
      missingFields.push('accountId');
      if (resolved.ambiguousCandidateIds.length > 1) {
        warnings.push('Più conti compatibili trovati: seleziona quello corretto.');
      } else {
        warnings.push('Conto non riconosciuto nel testo: selezionalo manualmente.');
      }
    }
  }

  let categoryId: string | null = null;
  let categoryLabel: string | null = null;
  let description = type === 'transfer' ? 'Trasferimento' : type === 'income' ? 'Entrata vocale' : 'Uscita vocale';

  if (type) {
    const catResult = resolveCategory(normalizedText, type);
    categoryId = catResult.categoryId;
    categoryLabel = catResult.categoryLabel;
    if (catResult.warning) warnings.push(catResult.warning);
    if (catResult.matchedKeyword) description = capitalize(catResult.matchedKeyword);
  }

  if (type === 'transfer' && toAccountId) {
    const toAccount = accounts.find((a) => a.id === toAccountId);
    if (toAccount) description = `Trasferimento a ${toAccount.label}`;
  }

  const confidence: ParseConfidence = missingFields.length > 0 ? 'low' : warnings.length > 0 ? 'medium' : 'high';

  return {
    rawText,
    normalizedText,
    type,
    amount,
    currency: 'EUR',
    categoryId,
    categoryLabel,
    accountId,
    accountLabel,
    fromAccountId,
    toAccountId,
    date,
    description,
    confidence,
    warnings,
    missingFields,
  };
}
