import React from 'react';
import { Building2, ChevronRight, CheckCircle2, CreditCard } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency } from '../../utils/formatters';

export const CompactMainAccountCard: React.FC = () => {
  const { mainAccountSummary, setActivePage } = useFinance();
  const { currentBalance, initialBalance, totalIncome, totalExpense, config } = mainAccountSummary;

  return (
    <div 
      id="compact-main-account-card"
      className="bg-[#111C38] border border-cyan-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-black/20"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-300">
              {config.accountLabel || 'Conto Corrente Principale'}
            </span>
            <span className="font-mono text-[11px] text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
              {config.maskedNumber || '••••4829'}
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              <span>Carta addebita Conto Principale</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Saldo iniziale: {formatCurrency(initialBalance)} | Entrate: +{formatCurrency(totalIncome)} | Uscite (Carta): -{formatCurrency(totalExpense)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80">
        <div className="text-left sm:text-right">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Saldo Conto Principale
          </span>
          <span className="text-xl font-extrabold text-cyan-300 font-mono">
            {formatCurrency(currentBalance)}
          </span>
        </div>
        <button
          id="btn-goto-accounts-view"
          onClick={() => setActivePage('accounts')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-medium border border-cyan-500/30 transition cursor-pointer hover:border-cyan-400"
        >
          <span>Dettagli Conti</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
