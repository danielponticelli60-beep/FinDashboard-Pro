import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  PiggyBank, 
  ShieldCheck, 
  AlertCircle,
  TrendingUp,
  Percent
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';

export const KPICards: React.FC = () => {
  const { kpis, filteredTransactions } = useFinance();

  const incomeCount = filteredTransactions.filter(t => t.type === 'income').length;
  const expenseCount = filteredTransactions.filter(t => t.type === 'expense').length;

  const isSavingsGood = kpis.savingsRate >= 20;
  const isBudgetWarning = kpis.budgetUsedPercentage >= 90;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 w-full">
      
      {/* 1. Entrate Totali */}
      <div 
        id="kpi-entrate"
        className="bg-[#111C38] border border-slate-800/90 hover:border-emerald-500/40 rounded-xl p-4 transition-all duration-300 relative overflow-hidden group shadow-lg shadow-black/20"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-emerald-500/10 transition" />
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 tracking-wide">ENTRATE TOTALI</span>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Totale globale</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/10">
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <h3 className="text-2xl font-bold text-slate-100 tracking-tight">
            {formatCurrency(kpis.totalIncome)}
          </h3>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <TrendingUp className="w-3 h-3" />
            <span>{incomeCount} accrediti</span>
          </span>
          <span className="text-slate-500">Inflow attivo</span>
        </div>
      </div>

      {/* 2. Uscite Totali */}
      <div 
        id="kpi-uscite"
        className="bg-[#111C38] border border-slate-800/90 hover:border-rose-500/40 rounded-xl p-4 transition-all duration-300 relative overflow-hidden group shadow-lg shadow-black/20"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-rose-500/10 transition" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 tracking-wide">USCITE TOTALI</span>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Totale globale</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-sm shadow-rose-500/10">
            <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <h3 className="text-2xl font-bold text-slate-100 tracking-tight">
            {formatCurrency(kpis.totalExpense)}
          </h3>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="text-rose-400 font-medium">
            {expenseCount} transazioni
          </span>
          <span className="text-slate-500">Spese registrate</span>
        </div>
      </div>

      {/* 3. Saldo Netto */}
      <div 
        id="kpi-saldo-netto"
        className={`bg-[#111C38] border rounded-xl p-4 transition-all duration-300 relative overflow-hidden group shadow-lg shadow-black/20 ${
          kpis.netBalance >= 0 
            ? 'border-slate-800/90 hover:border-cyan-500/40' 
            : 'border-rose-900/60 hover:border-rose-500/50'
        }`}
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-cyan-500/10 transition" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 tracking-wide">SALDO NETTO</span>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Totale globale</span>
          </div>
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shadow-sm ${
            kpis.netBalance >= 0 
              ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 shadow-cyan-500/10' 
              : 'bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-rose-500/10'
          }`}>
            <Wallet className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <h3 className={`text-2xl font-bold tracking-tight ${
            kpis.netBalance >= 0 ? 'text-cyan-300' : 'text-rose-300'
          }`}>
            {formatCurrency(kpis.netBalance)}
          </h3>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className={`font-semibold ${kpis.netBalance >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
            {kpis.netBalance >= 0 ? 'Surplus positivo' : 'Deficit di periodo'}
          </span>
          <span className="text-slate-500">Entrate - Uscite</span>
        </div>
      </div>

      {/* 4. Tasso di Risparmio */}
      <div 
        id="kpi-tasso-risparmio"
        className="bg-[#111C38] border border-slate-800/90 hover:border-indigo-500/40 rounded-xl p-4 transition-all duration-300 relative overflow-hidden group shadow-lg shadow-black/20"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-indigo-500/10 transition" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 tracking-wide">TASSO DI RISPARMIO</span>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Totale globale</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm shadow-indigo-500/10">
            <PiggyBank className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-1.5">
          <h3 className="text-2xl font-bold text-slate-100 tracking-tight">
            {kpis.savingsRate.toFixed(1)}%
          </h3>
          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
            isSavingsGood ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
          }`}>
            Target: 20%
          </span>
        </div>

        {/* Progress meter */}
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isSavingsGood ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-gradient-to-r from-amber-500 to-orange-400'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, kpis.savingsRate))}%` }}
          />
        </div>
      </div>

      {/* 5. Budget Residuo */}
      <div 
        id="kpi-budget-residuo"
        className="bg-[#111C38] border border-slate-800/90 hover:border-amber-500/40 rounded-xl p-4 transition-all duration-300 relative overflow-hidden group shadow-lg shadow-black/20"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-amber-500/10 transition" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 tracking-wide">BUDGET RESIDUO</span>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Totale globale</span>
          </div>
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shadow-sm ${
            isBudgetWarning 
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-rose-500/10' 
              : 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-amber-500/10'
          }`}>
            {isBudgetWarning ? <AlertCircle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-1.5">
          <h3 className="text-2xl font-bold text-slate-100 tracking-tight">
            {formatCurrency(kpis.budgetRemaining)}
          </h3>
        </div>

        {/* Budget usage bar */}
        <div className="space-y-1">
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                isBudgetWarning ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-emerald-400'
              }`}
              style={{ width: `${Math.min(100, kpis.budgetUsedPercentage)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Speso: {kpis.budgetUsedPercentage.toFixed(0)}%</span>
            <span>Totale: {formatCurrency(kpis.monthlyBudget, false)}</span>
          </div>
        </div>
      </div>

    </div>
  );
};
