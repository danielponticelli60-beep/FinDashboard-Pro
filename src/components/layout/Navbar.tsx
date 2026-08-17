import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  PieChart, 
  BarChart3, 
  CalendarRange, 
  Plus, 
  Sparkles, 
  TrendingUp, 
  Landmark, 
  Target, 
  Wallet, 
  FileSpreadsheet,
  Database,
  ShieldAlert,
  Settings
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ActivePage } from '../../types';
import { formatCurrency } from '../../utils/formatters';

export const Navbar: React.FC = () => {
  const { 
    activePage, 
    setActivePage, 
    openAddModal, 
    openImportModal,
    openDiagnosticsModal,
    openResetPersonalModal,
    transactions,
    wealthMetrics,
    financialGoals 
  } = useFinance();

  const navItems: { id: ActivePage; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'transactions', label: 'Movimenti', icon: <ArrowLeftRight className="w-4 h-4" />, badge: transactions.length.toString() },
    { id: 'accounts', label: 'Conti', icon: <Wallet className="w-4 h-4" /> },
    { id: 'allocation', label: 'Piano allocazione', icon: <PieChart className="w-4 h-4" /> },
    { id: 'wealth', label: 'Patrimonio', icon: <Landmark className="w-4 h-4" /> },
    { id: 'goals', label: 'Obiettivi', icon: <Target className="w-4 h-4" />, badge: financialGoals.length.toString() },
    { id: 'quarterly', label: 'Riepilogo trimestrale', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'annual', label: 'Riepilogo annuale', icon: <CalendarRange className="w-4 h-4" /> },
    { id: 'settings', label: 'Impostazioni e backup', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="w-full bg-slate-950/90 backdrop-blur-xs border-b border-slate-800 sticky top-0 z-40 px-4 lg:px-8 py-3">
      <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Quick Net Balance / Net Worth Indicator */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div 
            onClick={() => setActivePage('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-100 tracking-tight">FinDashboard</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">PRO</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Gestione Finanze & Patrimonio</p>
            </div>
          </div>

          {/* Quick Net Worth Pill on Desktop */}
          <div className="hidden xl:flex items-center gap-3 pl-4 ml-2 border-l border-slate-800">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Patrimonio Netto:</span>
              <span className="font-bold text-slate-100 font-mono">
                {formatCurrency(wealthMetrics.netWorth, false)}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto py-1 scrollbar-none">
          {navItems.map(item => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => setActivePage(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                    isActive ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            id="btn-nav-settings"
            onClick={() => setActivePage('settings')}
            title="Impostazioni e Backup Dati"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              activePage === 'settings'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Impostazioni & Backup</span>
          </button>

          <button
            id="btn-nav-diagnostics"
            onClick={openDiagnosticsModal}
            title="Diagnostica Integrità Dati e Origine Record"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 text-xs font-semibold border border-slate-800 transition cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Diagnostica</span>
          </button>

          <button
            id="btn-import-excel-nav"
            onClick={openImportModal}
            title="Importa file Excel personale"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importa Excel</span>
          </button>

          <button
            id="btn-new-transaction"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuovo Movimento</span>
          </button>
        </div>

      </div>
    </header>
  );
};
