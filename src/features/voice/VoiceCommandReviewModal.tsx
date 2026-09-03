import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, Check, Mic, RotateCcw, X } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency } from '../../utils/formatters';
import { parseItalianVoiceCommand } from './italianVoiceParser';
import { ParsedVoiceCommand, VoiceCommandType } from './voiceCommandTypes';
import { canConfirmVoiceCommand, getMissingFieldLabels } from './voiceCommandValidation';

interface VoiceCommandReviewModalProps {
  rawText: string;
  onClose: () => void;
}

const TYPE_LABELS: Record<VoiceCommandType, string> = {
  expense: 'Uscita',
  income: 'Entrata',
  transfer: 'Giroconto',
};

export const VoiceCommandReviewModal: React.FC<VoiceCommandReviewModalProps> = ({ rawText, onClose }) => {
  const { accounts, categoryCatalog, addTransaction, createTransfer, deleteTransaction } = useFinance();

  const initialParse = useMemo<ParsedVoiceCommand>(
    () => parseItalianVoiceCommand(rawText, accounts.map((a) => ({ id: a.id, label: a.label, kind: a.kind })), new Date().toISOString().slice(0, 10)),
    [rawText, accounts]
  );

  const [cmd, setCmd] = useState<ParsedVoiceCommand>(initialParse);
  const [savedTransactionId, setSavedTransactionId] = useState<string | null>(null);
  const [savedSummary, setSavedSummary] = useState<string | null>(null);
  const [undone, setUndone] = useState(false);

  useEffect(() => {
    setCmd(initialParse);
    setSavedTransactionId(null);
    setSavedSummary(null);
    setUndone(false);
  }, [initialParse]);

  const patch = (partial: Partial<ParsedVoiceCommand>) => {
    setCmd((prev) => {
      const next = { ...prev, ...partial };
      const missingFields: string[] = [];
      if (!next.type) missingFields.push('type');
      if (next.amount === null || !(next.amount > 0)) missingFields.push('amount');
      if (next.type === 'transfer') {
        if (!next.fromAccountId) missingFields.push('fromAccountId');
        if (!next.toAccountId) missingFields.push('toAccountId');
        if (!next.date) missingFields.push('date');
      } else if (next.type === 'income' || next.type === 'expense') {
        if (!next.accountId) missingFields.push('accountId');
      }
      return { ...next, missingFields };
    });
  };

  const canConfirm = canConfirmVoiceCommand(cmd) && !savedTransactionId;
  const missingLabels = getMissingFieldLabels(cmd);

  const expenseIncomeCategories = categoryCatalog.filter((c) => c.allowedType === cmd.type || c.allowedType === 'both');

  const handleConfirm = () => {
    if (!canConfirm || !cmd.type || cmd.amount === null) return;

    if (cmd.type === 'transfer') {
      if (!cmd.fromAccountId || !cmd.toAccountId || !cmd.date) return;
      const res = createTransfer({
        fromAccountId: cmd.fromAccountId,
        toAccountId: cmd.toAccountId,
        amount: cmd.amount,
        date: cmd.date,
        description: cmd.description,
      });
      if (res.success && res.transactionId) {
        setSavedTransactionId(res.transactionId);
        const toLabel = accounts.find((a) => a.id === cmd.toAccountId)?.label || '';
        setSavedSummary(`Trasferimento di ${formatCurrency(cmd.amount)} verso ${toLabel} registrato.`);
      }
      return;
    }

    if (!cmd.accountId || !cmd.date) return;
    const account = accounts.find((a) => a.id === cmd.accountId);
    if (!account) return;
    const id = addTransaction({
      date: cmd.date,
      description: cmd.description || (cmd.type === 'income' ? 'Entrata vocale' : 'Uscita vocale'),
      amount: cmd.amount,
      type: cmd.type,
      category: cmd.categoryLabel || 'Altro Spese',
      categoryId: cmd.categoryId || undefined,
      categoryLabel: cmd.categoryLabel || undefined,
      accountId: account.id,
      account: account.label as never,
      accountLabel: account.label,
      status: 'completed',
      notes: 'Inserito tramite comando vocale',
    });
    setSavedTransactionId(id);
    setSavedSummary(`${TYPE_LABELS[cmd.type]} di ${formatCurrency(cmd.amount)} registrata su ${account.label}.`);
  };

  const handleUndo = () => {
    if (!savedTransactionId) return;
    deleteTransaction(savedTransactionId);
    setUndone(true);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="w-full sm:max-w-md bg-[#0F172A] border border-slate-700/80 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#111C38] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 truncate">Revisione comando vocale</h3>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="p-3 rounded-xl bg-[#090D16] border border-slate-800 text-xs">
            <span className="text-slate-500 uppercase font-semibold text-[10px] tracking-wide">Hai detto</span>
            <p className="text-slate-300 mt-1 italic">&ldquo;{cmd.rawText}&rdquo;</p>
          </div>

          {savedTransactionId ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm space-y-3">
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <p>{undone ? 'Movimento annullato.' : savedSummary}</p>
              </div>
              {!undone && (
                <button
                  onClick={handleUndo}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Annulla ultimo movimento</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {cmd.warnings.length > 0 && (
                <div className={`p-3 rounded-xl border text-xs space-y-1 ${cmd.confidence === 'low' ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : 'bg-amber-500/10 border-amber-500/30 text-amber-200'}`}>
                  {cmd.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Type selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['expense', 'income', 'transfer'] as VoiceCommandType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => patch({ type: t, accountId: null, fromAccountId: null, toAccountId: null })}
                      className={`min-h-[44px] rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        cmd.type === t
                          ? t === 'expense' ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : t === 'income' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                          : 'bg-[#090D16] border-slate-700/80 text-slate-400'
                      }`}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Importo (€)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={cmd.amount ?? ''}
                  onChange={(e) => {
                    const v = e.target.value.replace(',', '.');
                    const n = v === '' ? null : parseFloat(v);
                    patch({ amount: n !== null && !isNaN(n) ? n : null });
                  }}
                  placeholder="0.00"
                  className="w-full min-h-[44px] px-4 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-base font-semibold focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                />
              </div>

              {cmd.type === 'transfer' ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Da</label>
                    <select
                      value={cmd.fromAccountId ?? ''}
                      onChange={(e) => patch({ fromAccountId: e.target.value || null })}
                      className="w-full min-h-[44px] px-3 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-violet-500"
                    >
                      <option value="">Seleziona...</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </div>
                  <ArrowLeftRight className="w-4 h-4 text-slate-500 mt-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">A</label>
                    <select
                      value={cmd.toAccountId ?? ''}
                      onChange={(e) => patch({ toAccountId: e.target.value || null })}
                      className="w-full min-h-[44px] px-3 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-violet-500"
                    >
                      <option value="">Seleziona...</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Categoria</label>
                    <select
                      value={cmd.categoryId ?? ''}
                      onChange={(e) => {
                        const cat = categoryCatalog.find((c) => c.id === e.target.value);
                        patch({ categoryId: cat?.id ?? null, categoryLabel: cat?.label ?? null });
                      }}
                      className="w-full min-h-[44px] px-3 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-violet-500"
                    >
                      <option value="">Seleziona...</option>
                      {expenseIncomeCategories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Conto</label>
                    <select
                      value={cmd.accountId ?? ''}
                      onChange={(e) => patch({ accountId: e.target.value || null })}
                      className="w-full min-h-[44px] px-3 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-violet-500"
                    >
                      <option value="">Seleziona...</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Data</label>
                <input
                  type="date"
                  value={cmd.date ?? ''}
                  onChange={(e) => patch({ date: e.target.value || null })}
                  className="w-full min-h-[44px] px-4 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Descrizione</label>
                <input
                  type="text"
                  value={cmd.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  className="w-full min-h-[44px] px-4 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>

              {!canConfirm && missingLabels.length > 0 && (
                <p className="text-[11px] text-slate-400">
                  Campi mancanti prima di poter confermare: {missingLabels.join(', ')}.
                </p>
              )}
            </>
          )}
        </div>

        {!savedTransactionId && (
          <div className="p-4 border-t border-slate-800 flex items-center gap-3 shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <button
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/80 transition cursor-pointer"
            >
              Annulla
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-violet-500/25 transition cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Conferma movimento</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
