import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, Check, Euro, Calendar, ShieldCheck } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { AccountKind } from '../../types';
import { ACCOUNT_KIND_META } from '../../utils/accountPresentation';

/** Handles both creating a new account and editing an existing one generically. */
export const AddAccountModal: React.FC<{ editAccountId?: string | null; onCloseEdit?: () => void }> = ({ editAccountId, onCloseEdit }) => {
  const { accounts, addAccount, updateAccount, isAddAccountModalOpen, closeAddAccountModal } = useFinance();

  const editingAccount = editAccountId ? accounts.find(a => a.id === editAccountId) : undefined;
  const isOpen = isAddAccountModalOpen || Boolean(editingAccount);
  const isEditMode = Boolean(editingAccount);

  const [kind, setKind] = useState<AccountKind>('checking');
  const [label, setLabel] = useState('');
  const [initialBalanceStr, setInitialBalanceStr] = useState('');
  const [initialDate, setInitialDate] = useState(new Date().toISOString().slice(0, 10));
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingAccount) {
      setKind(editingAccount.kind);
      setLabel(editingAccount.label);
      setInitialBalanceStr(editingAccount.initialBalance.toString());
      setInitialDate(editingAccount.initialDate);
    } else {
      setKind('checking');
      setLabel('');
      setInitialBalanceStr('');
      setInitialDate(new Date().toISOString().slice(0, 10));
    }
    setErrorMsg('');
  }, [isOpen, editingAccount]);

  if (!isOpen) return null;

  const handleClose = () => {
    closeAddAccountModal();
    onCloseEdit?.();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanBalance = initialBalanceStr.replace(',', '.').trim();
    const balanceNum = parseFloat(cleanBalance);
    if (isNaN(balanceNum)) {
      setErrorMsg('Inserisci un saldo iniziale valido in euro.');
      return;
    }
    if (!label.trim()) {
      setErrorMsg('Inserisci un nome per il conto.');
      return;
    }
    if (!initialDate) {
      setErrorMsg('Seleziona una data di riferimento.');
      return;
    }

    if (isEditMode && editingAccount) {
      updateAccount(editingAccount.id, {
        kind,
        label: label.trim(),
        initialBalance: balanceNum,
        initialDate,
      });
      handleClose();
      return;
    }

    const res = addAccount({ kind, label: label.trim(), initialBalance: balanceNum, initialDate });
    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#0F172A] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#111C38]">
          <div>
            <h3 className="text-base font-bold text-slate-100">{isEditMode ? 'Modifica Conto' : 'Aggiungi Nuovo Conto'}</h3>
            <p className="text-xs text-slate-400">{isEditMode ? 'Aggiorna i parametri del conto' : `Configura un conto aggiuntivo (${accounts.length}/4 attuali)`}</p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tipo di conto</label>
            <select
              value={kind}
              onChange={e => setKind(e.target.value as AccountKind)}
              className="w-full px-4 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            >
              {(Object.keys(ACCOUNT_KIND_META) as AccountKind[]).map(k => (
                <option key={k} value={k}>{ACCOUNT_KIND_META[k].label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nome Conto <span className="text-emerald-400">*</span></label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="es. Conto Risparmio"
              required
              className="w-full px-4 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Saldo Iniziale (€) <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Euro className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={initialBalanceStr}
                  onChange={e => setInitialBalanceStr(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Data di Riferimento <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  value={initialDate}
                  onChange={e => setInitialDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" onClick={handleClose} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/80 transition cursor-pointer">
              Annulla
            </button>
            <button type="submit" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition cursor-pointer">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isEditMode ? 'Salva Modifiche' : 'Aggiungi Conto'}</span>
            </button>
          </div>

          {!isEditMode && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 justify-center pt-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Dati salvati solo in locale sul tuo dispositivo</span>
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
