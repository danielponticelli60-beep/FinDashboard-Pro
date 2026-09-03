import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, Check, Euro, Calendar, ArrowRight } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export const TransferModal: React.FC = () => {
  const { accounts, createTransfer, isTransferModalOpen, closeTransferModal } = useFinance();

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isTransferModalOpen) {
      setFromAccountId(accounts[0]?.id || '');
      setToAccountId(accounts[1]?.id || '');
      setAmountStr('');
      setDate(new Date().toISOString().slice(0, 10));
      setDescription('');
      setErrorMsg('');
    }
  }, [isTransferModalOpen, accounts]);

  if (!isTransferModalOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanAmount = amountStr.replace(',', '.').trim();
    const amountNum = parseFloat(cleanAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('Inserisci un importo di trasferimento valido e maggiore di zero.');
      return;
    }

    const res = createTransfer({ fromAccountId, toAccountId, amount: amountNum, date, description });
    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }
    closeTransferModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#0F172A] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#111C38]">
          <div>
            <h3 className="text-base font-bold text-slate-100">Trasferimento tra Conti</h3>
            <p className="text-xs text-slate-400">Registra un movimento tra due dei tuoi conti</p>
          </div>
          <button onClick={closeTransferModal} className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer">
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

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Da</label>
              <select
                value={fromAccountId}
                onChange={e => setFromAccountId(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 mt-5 shrink-0" />
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">A</label>
              <select
                value={toAccountId}
                onChange={e => setToAccountId(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Importo (€) <span className="text-sky-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Euro className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm font-semibold focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Data <span className="text-sky-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Descrizione (opzionale)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="es. Ricarica mensile"
              className="w-full px-4 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" onClick={closeTransferModal} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/80 transition cursor-pointer">
              Annulla
            </button>
            <button type="submit" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/25 transition cursor-pointer">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Registra Trasferimento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
