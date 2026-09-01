import React, { useState, useMemo } from 'react';
import { 
  X, 
  ArrowDownUp, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDateItalian, getTypeBadgeConfig } from '../../utils/formatters';
import { TransactionType } from '../../types';

export const TypeMigrationModal: React.FC = () => {
  const { 
    isTypeMigrationModalOpen, 
    closeTypeMigrationModal, 
    getTypeMigrationPreview, 
    applyTypeMigration,
    canUndoTypeMigration,
    undoTypeMigration
  } = useFinance();

  const [hasConfirmedCheckbox, setHasConfirmedCheckbox] = useState<boolean>(false);
  const [manualOverrides, setManualOverrides] = useState<Record<string, TransactionType>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Compute preview data
  const preview = useMemo(() => {
    if (!isTypeMigrationModalOpen) return null;
    return getTypeMigrationPreview();
  }, [isTypeMigrationModalOpen, getTypeMigrationPreview]);

  if (!isTypeMigrationModalOpen || !preview) return null;

  const handleApply = () => {
    if (!hasConfirmedCheckbox) return;
    try {
      const res = applyTypeMigration(manualOverrides);
      if (res.success) {
        setSuccessMessage(res.message);
        setTimeout(() => {
          setSuccessMessage(null);
          setHasConfirmedCheckbox(false);
          setManualOverrides({});
          closeTypeMigrationModal();
        }, 1800);
      } else {
        setErrorMessage('Errore durante l’applicazione della migrazione.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore imprevisto.');
    }
  };

  const handleUndo = () => {
    const res = undoTypeMigration();
    if (res.success) {
      setSuccessMessage(res.message);
      setTimeout(() => {
        setSuccessMessage(null);
        closeTypeMigrationModal();
      }, 1500);
    }
  };

  const handleOverrideChange = (txId: string, newType: TransactionType) => {
    setManualOverrides(prev => ({
      ...prev,
      [txId]: newType,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0D1527] border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#111C35]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ArrowDownUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Ricostruzione Tipo da Segno Importo
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Modello Dati Sicuro
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Classificazione deterministica Entrate (+) e Uscite (-) basata esclusivamente sul valore numerico originale.
              </p>
            </div>
          </div>
          <button
            onClick={closeTypeMigrationModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">

          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="font-medium">{successMessage}</div>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Principle Info Card */}
          <div className="p-4 rounded-xl bg-[#131F37] border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Regole di Ricostruzione e Vincoli di Integrità</span>
            </div>
            <ul className="space-y-1 text-slate-300 text-[11px] leading-relaxed list-disc list-inside">
              <li><strong>Importo originale &gt; 0</strong>: Classificato deterministico come <span className="text-emerald-400 font-bold">Entrata</span>.</li>
              <li><strong>Importo originale &lt; 0</strong>: Classificato deterministico come <span className="text-rose-400 font-bold">Uscita</span>.</li>
              <li><strong>Importo = 0, vuoto o non determinabile</strong>: Classificato come <span className="text-amber-400 font-bold">Da verificare</span>.</li>
              <li>I colori verde/rosso della grafica vengono ignorati: fa fede solo il dato numerico originario.</li>
              <li>L’importo monetario assoluto viene visualizzato correttamente con segno positivo, mentre il segno originale viene preservato per audit.</li>
              <li><strong>Integrità garantita</strong>: Nessun record viene aggiunto o duplicato; Data, Categoria, Descrizione e Conti rimangono invariati al 100%.</li>
            </ul>
          </div>

          {/* Preview Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            {/* Total Analyzed */}
            <div className="p-3.5 rounded-xl bg-[#131F37]/80 border border-slate-700/60 flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium">Totale Movimenti</span>
              <span className="text-xl font-extrabold text-slate-100 mt-1">{preview.totalCount}</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Archivio corrente</span>
            </div>

            {/* Income Count & Sum */}
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Entrate (+)
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                  {preview.incomeCount}
                </span>
              </div>
              <span className="text-lg font-extrabold text-emerald-300 mt-1">{formatCurrency(preview.sumIncome)}</span>
              <span className="text-[10px] text-emerald-400/70 mt-0.5">Somma entrate</span>
            </div>

            {/* Expense Count & Sum */}
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Uscite (-)
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                  {preview.expenseCount}
                </span>
              </div>
              <span className="text-lg font-extrabold text-rose-300 mt-1">{formatCurrency(preview.sumExpense)}</span>
              <span className="text-[10px] text-rose-400/70 mt-0.5">Somma uscite</span>
            </div>

            {/* To Verify Count & Net */}
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Da Verificare
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                  {preview.toVerifyCount}
                </span>
              </div>
              <span className={`text-lg font-extrabold mt-1 ${preview.netBalance >= 0 ? 'text-cyan-300' : 'text-rose-300'}`}>
                {formatCurrency(preview.netBalance)}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Saldo netto risultante</span>
            </div>

          </div>

          {/* Section for "Da Verificare" Rows */}
          {preview.toVerifyRows.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Righe classificate come "Da verificare" ({preview.toVerifyRows.length})
                </h3>
                <span className="text-[10px] text-slate-400">
                  Puoi correggere il tipo manualmente qui sotto oppure confermarle come da verificare
                </span>
              </div>

              <div className="border border-slate-700/80 rounded-xl overflow-hidden bg-[#111C35]/60 max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#16233F] text-slate-400 text-[11px] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Descrizione</th>
                      <th className="py-2 px-3">Categoria</th>
                      <th className="py-2 px-3">Conto</th>
                      <th className="py-2 px-3 text-right">Importo</th>
                      <th className="py-2 px-3">Motivo</th>
                      <th className="py-2 px-3 text-center">Azione Correzione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {preview.toVerifyRows.map(row => {
                      const selectedOverride = manualOverrides[row.id] || row.currentType;
                      return (
                        <tr key={row.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-2 px-3 text-slate-300 whitespace-nowrap">{formatDateItalian(row.date)}</td>
                          <td className="py-2 px-3 font-medium text-slate-100 max-w-[180px] truncate">{row.description}</td>
                          <td className="py-2 px-3 text-slate-400 max-w-[120px] truncate">{row.category}</td>
                          <td className="py-2 px-3 text-slate-400">{row.account}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-300">{formatCurrency(row.amount)}</td>
                          <td className="py-2 px-3 text-[11px] text-slate-400 italic max-w-[180px] truncate">{row.reason}</td>
                          <td className="py-2 px-3 text-center">
                            <select
                              value={selectedOverride}
                              onChange={e => handleOverrideChange(row.id, e.target.value as TransactionType)}
                              className="bg-[#16233F] border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
                            >
                              <option value="to_verify">⚠️ Da verificare</option>
                              <option value="income">🟢 Entrata (+)</option>
                              <option value="expense">🔴 Uscita (-)</option>
                              <option value="transfer">🔵 Giroconto</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Nessun movimento ambiguo o a zero rilevato. Tutti i {preview.totalCount} movimenti sono stati determinati con certezza numerica.</span>
            </div>
          )}

          {/* Undo section if migration was previously performed */}
          {canUndoTypeMigration && (
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300">
                <RotateCcw className="w-4 h-4 text-indigo-400" />
                <span>È disponibile un ripristino per l'ultima migrazione eseguita.</span>
              </div>
              <button
                id="btn-undo-migration-modal"
                onClick={handleUndo}
                className="px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 rounded-lg font-semibold text-xs transition cursor-pointer"
              >
                Annulla migrazione precedente
              </button>
            </div>
          )}

          {/* Double confirmation checkbox - BLOCKS application until confirmed */}
          <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/30 flex items-start gap-3">
            <input
              id="confirm-type-migration-checkbox"
              type="checkbox"
              checked={hasConfirmedCheckbox}
              onChange={e => setHasConfirmedCheckbox(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-900 cursor-pointer"
            />
            <label htmlFor="confirm-type-migration-checkbox" className="text-xs text-slate-200 cursor-pointer leading-relaxed">
              <strong>Confermo l'applicazione della migrazione</strong>: ho esaminato l'anteprima ({preview.incomeCount} Entrate, {preview.expenseCount} Uscite, {preview.toVerifyCount} Da verificare) e autorizzo la ricostruzione deterministica del campo Tipo in base al segno dell'importo per tutti i {preview.totalCount} movimenti esistenti.
            </label>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#111C35]/50 flex items-center justify-between">
          <button
            onClick={closeTypeMigrationModal}
            className="px-4 py-2 rounded-xl text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 font-semibold transition cursor-pointer"
          >
            Annulla
          </button>

          <button
            id="btn-apply-type-migration"
            disabled={!hasConfirmedCheckbox}
            onClick={handleApply}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition shadow-lg ${
              hasConfirmedCheckbox
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Applica Ricostruzione Tipo</span>
          </button>
        </div>

      </div>
    </div>
  );
};
