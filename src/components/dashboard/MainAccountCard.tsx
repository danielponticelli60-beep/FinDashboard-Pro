import React from 'react';
import { 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowLeftRight, 
  Edit3, 
  ShieldCheck, 
  Calculator, 
  FileSpreadsheet,
  ChevronRight,
  TrendingUp,
  History
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDateItalian } from '../../utils/formatters';

export const MainAccountCard: React.FC = () => {
  const { 
    mainAccountSummary, 
    openAccountConfigModal, 
    openImportModal, 
    setActivePage 
  } = useFinance();

  const { 
    initialBalance, 
    initialDate, 
    totalIncome, 
    totalExpense, 
    transfersIn, 
    transfersOut, 
    currentBalance, 
    txCount,
    config 
  } = mainAccountSummary;

  const netTransfers = transfersIn - transfersOut;

  return (
    <div 
      id="main-account-dashboard-card"
      className="w-full bg-gradient-to-br from-[#0F1D3E] via-[#0E172F] to-[#0A1024] border border-cyan-500/30 hover:border-cyan-500/50 rounded-2xl p-5 shadow-xl shadow-cyan-950/20 relative overflow-hidden transition-all duration-300 group"
    >
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-md shadow-cyan-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-[#090D16] rounded-[10px] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                {config.accountLabel || 'Conto Principale'}
              </h2>
              {config.maskedNumber && (
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700/80 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  <span>{config.maskedNumber}</span>
                </span>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Calcolato in tempo reale
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Saldo automatico cumulato a partire dalla data di riferimento: <strong className="text-slate-300">{formatDateItalian(initialDate)}</strong> ({txCount} movimenti)
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-edit-main-account-initial"
            onClick={openAccountConfigModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-medium border border-slate-700/80 transition cursor-pointer"
            title="Correggi saldo iniziale o data di partenza"
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Modifica Saldo Iniziale</span>
          </button>

          <button
            id="btn-import-excel-quick"
            onClick={openImportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 hover:text-cyan-200 text-xs font-semibold border border-cyan-500/40 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Importa Excel</span>
          </button>

          <button
            id="btn-go-to-accounts"
            onClick={() => setActivePage('accounts')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 hover:text-blue-100 text-xs font-medium border border-blue-500/30 transition cursor-pointer"
          >
            <span>Dettagli Conti</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 my-4 relative z-10">
        
        {/* 1. Saldo Attuale (Hero Metric) */}
        <div className="sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-cyan-950/60 to-[#0c1938] border border-cyan-500/40 rounded-xl p-3.5 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-xs text-cyan-400 font-semibold mb-1">
            <span>SALDO ATTUALE</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-cyan-200 tracking-tight">
            {formatCurrency(currentBalance)}
          </div>
          <div className="text-[11px] text-cyan-400/80 mt-1 flex items-center justify-between">
            <span>Disponibilità effettiva</span>
            <span className="font-semibold">{currentBalance >= 0 ? 'In attivo' : 'In rosso'}</span>
          </div>
        </div>

        {/* 2. Saldo Iniziale */}
        <div className="bg-[#111C38]/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>SALDO INIZIALE</span>
            <History className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-200">
            {formatCurrency(initialBalance)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Al {formatDateItalian(initialDate)}
          </div>
        </div>

        {/* 3. Entrate Associate */}
        <div className="bg-[#111C38]/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>+ ENTRATE</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">
            +{formatCurrency(totalIncome)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Accrediti dal {initialDate}
          </div>
        </div>

        {/* 4. Uscite Associate */}
        <div className="bg-[#111C38]/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>- USCITE</span>
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400">
            -{formatCurrency(totalExpense)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Spese dal {initialDate}
          </div>
        </div>

        {/* 5. Giroconti Netto */}
        <div className="bg-[#111C38]/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>+/- GIROCONTI</span>
            <ArrowLeftRight className="w-4 h-4 text-purple-400" />
          </div>
          <div className={`text-xl font-bold ${netTransfers >= 0 ? 'text-purple-300' : 'text-amber-300'}`}>
            {netTransfers >= 0 ? `+${formatCurrency(netTransfers)}` : formatCurrency(netTransfers)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>In: {formatCurrency(transfersIn, false)}</span>
            <span>Out: {formatCurrency(transfersOut, false)}</span>
          </div>
        </div>

      </div>

      {/* Explicit Math Formula Breakdown Box (Requested in Requirements) */}
      <div className="bg-[#080D1A]/90 border border-slate-800 rounded-xl p-3.5 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start md:items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0 mt-0.5 md:mt-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-300 block sm:inline mr-2">Formula di Calcolo:</span>
            <span className="font-mono text-[11px] text-cyan-300/90">
              Saldo Attuale = Saldo Iniziale ({formatCurrency(initialBalance)}) + Entrate ({formatCurrency(totalIncome)}) - Uscite ({formatCurrency(totalExpense)}) + Giroconti In ({formatCurrency(transfersIn)}) - Giroconti Out ({formatCurrency(transfersOut)})
            </span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 font-mono text-xs px-3 py-1 rounded bg-slate-900 border border-slate-700/80 text-cyan-300">
          <span className="text-slate-400">=</span>
          <strong>{formatCurrency(currentBalance)}</strong>
        </div>
      </div>

    </div>
  );
};
