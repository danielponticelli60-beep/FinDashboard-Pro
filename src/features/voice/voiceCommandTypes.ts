export type VoiceCommandType = 'income' | 'expense' | 'transfer';

export type ParseConfidence = 'high' | 'medium' | 'low';

export interface ParsedVoiceCommand {
  rawText: string;
  normalizedText: string;
  type: VoiceCommandType | null;
  amount: number | null;
  currency: 'EUR';
  categoryId: string | null;
  categoryLabel: string | null;
  accountId: string | null;
  accountLabel: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  date: string | null;
  description: string;
  notes?: string;
  confidence: ParseConfidence;
  warnings: string[];
  missingFields: string[];
}

/** Minimal account shape the parser needs - decoupled from the live Account
 * type in types.ts so the parser stays a pure, independently testable
 * function with no dependency on FinanceContext. */
export interface VoiceParserAccount {
  id: string;
  label: string;
  kind: string;
}

/** Accounts the parser found as candidates for a given phrase, when it
 * could not resolve to exactly one - surfaced so the review UI can offer a
 * selection menu instead of guessing. */
export interface AccountMatchAmbiguity {
  phrase: string;
  candidateAccountIds: string[];
}
