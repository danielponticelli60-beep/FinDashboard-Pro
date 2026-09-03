import { ParsedVoiceCommand } from './voiceCommandTypes';

const FIELD_LABELS_IT: Record<string, string> = {
  type: 'Tipo movimento',
  amount: 'Importo',
  accountId: 'Conto',
  fromAccountId: 'Conto di origine',
  toAccountId: 'Conto di destinazione',
  date: 'Data',
};

export const canConfirmVoiceCommand = (cmd: ParsedVoiceCommand): boolean => cmd.missingFields.length === 0;

export const getMissingFieldLabels = (cmd: ParsedVoiceCommand): string[] =>
  cmd.missingFields.map((f) => FIELD_LABELS_IT[f] || f);
