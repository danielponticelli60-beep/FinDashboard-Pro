import React from 'react';
import { 
  Search, 
  Filter, 
  X, 
  Calendar, 
  CreditCard, 
  Tag, 
  Layers, 
  ArrowDownUp
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { MONTH_NAMES_IT, QUARTERS_IT } from '../../utils/formatters';

const ALL_CATEGORIES = [
  // Entrate
  'Stipendio',
  'Freelance & Bonus',
  'Investimenti & Dividendi',
  'Rimborsi & Vendite',
  'Altre Entrate',
  // Spese
  'Casa & Utenze',
  'Alimentari & Spesa',
  'Trasporti & Auto',
  'Ristoranti & Svago',
  'Salute & Benessere',
  'Shopping & Abbigliamento',
  'Abbonamenti & Servizi',
  'Educazione & Corsi',
  'Viaggi & Vacanze',
  'Altro Spese',
  'Giroconto / Trasferimento'
];

const ALL_ACCOUNTS = [
  'Conto Principale',
  'Carta di Credito',
  'Conto Risparmio',
  'Portafoglio Investimenti',
  'Contanti'
];

export const GlobalFiltersBar: React.FC = () => {
  const { filters, updateFilter, resetFilters, filteredTransactions, transactions, categoryCatalog } = useFinance();

  // Count active non-default filters
  const activeFiltersCount = [
    filters.searchQuery !== '',
    filters.year !== 'all',
    filters.quarter !== 'all',
    filters.month !== 'all',
    filters.category !== 'all',
    filters.account !== 'all',
    filters.type !== 'all',
    Boolean(filters.dateFrom),
    Boolean(filters.dateTo),
  ].filter(Boolean).length;

  return (
    <div className="w-full bg-[#0D1527] border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-[1700px] mx-auto flex flex-col gap-3">
        
        {/* Main Filters Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="filter-search-input"
              type="text"
              value={filters.searchQuery}
              onChange={e => updateFilter('searchQuery', e.target.value)}
              placeholder="Cerca per descrizione, categoria o note..."
              className="w-full pl-9 pr-8 py-1.5 bg-[#131F37] hover:bg-[#16233F] focus:bg-[#16233F] border border-slate-700/70 focus:border-cyan-500/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition"
            />
            {filters.searchQuery && (
              <button
                onClick={() => updateFilter('searchQuery', '')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Selectors */}
          <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
            
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-[#131F37] border border-slate-700/70 rounded-lg px-2.5 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">Anno:</span>
              <select
                id="filter-year-select"
                value={filters.year}
                onChange={e => {
                  updateFilter('year', e.target.value);
                  if (e.target.value === 'all') {
                    updateFilter('quarter', 'all');
                    updateFilter('month', 'all');
                  }
                }}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#131F37]">Tutti gli anni</option>
                <option value="2026" className="bg-[#131F37]">2026 (Corrente)</option>
                <option value="2025" className="bg-[#131F37]">2025</option>
                <option value="2024" className="bg-[#131F37]">2024</option>
              </select>
            </div>

            {/* Quarter Selector */}
            <div className="flex items-center gap-1.5 bg-[#131F37] border border-slate-700/70 rounded-lg px-2.5 py-1 text-xs">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">Trimestre:</span>
              <select
                id="filter-quarter-select"
                value={filters.quarter}
                onChange={e => {
                  updateFilter('quarter', e.target.value);
                  if (e.target.value !== 'all') {
                    updateFilter('month', 'all');
                  }
                }}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#131F37]">Tutti</option>
                {QUARTERS_IT.map(q => (
                  <option key={q.id} value={q.id} className="bg-[#131F37]">{q.name}</option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-1.5 bg-[#131F37] border border-slate-700/70 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">Mese:</span>
              <select
                id="filter-month-select"
                value={filters.month}
                onChange={e => updateFilter('month', e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#131F37]">Tutti i mesi</option>
                {MONTH_NAMES_IT.map((name, idx) => {
                  const mStr = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
                  return (
                    <option key={mStr} value={mStr} className="bg-[#131F37]">{name}</option>
                  );
                })}
              </select>
            </div>

            {/* Category Selector */}
            <div className="flex items-center gap-1.5 bg-[#131F37] border border-slate-700/70 rounded-lg px-2.5 py-1 text-xs max-w-[190px]">
              <Tag className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <select
                id="filter-category-select"
                value={filters.category}
                onChange={e => updateFilter('category', e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer truncate"
              >
                <option value="all" className="bg-[#131F37]">Tutte le categorie</option>
                {categoryCatalog.map(cat => (
                  <option key={cat.id} value={cat.label} className="bg-[#131F37]">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Selector */}
            <div className="flex items-center gap-1.5 bg-[#131F37] border border-slate-700/70 rounded-lg px-2.5 py-1 text-xs">
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              <select
                id="filter-account-select"
                value={filters.account}
                onChange={e => updateFilter('account', e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#131F37]">Tutti i conti</option>
                {ALL_ACCOUNTS.map(acc => (
                  <option key={acc} value={acc} className="bg-[#131F37]">{acc}</option>
                ))}
              </select>
            </div>

            {/* Transaction Type */}
            <div className="flex items-center gap-1.5 bg-[#131F37] border border-slate-700/70 rounded-lg px-2.5 py-1 text-xs">
              <ArrowDownUp className="w-3.5 h-3.5 text-emerald-400" />
              <select
                id="filter-type-select"
                value={filters.type}
                onChange={e => updateFilter('type', e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#131F37]">Tutti i tipi</option>
                <option value="income" className="bg-[#131F37]">🟢 Solo Entrate (+)</option>
                <option value="expense" className="bg-[#131F37]">🔴 Solo Uscite (-)</option>
                <option value="to_verify" className="bg-[#131F37]">⚠️ Da verificare</option>
                <option value="transfer" className="bg-[#131F37]">🔵 Giroconti / Trasferimenti</option>
              </select>
            </div>

            {/* Reset Filters button */}
            {activeFiltersCount > 0 && (
              <button
                id="btn-reset-filters"
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Azzera ({activeFiltersCount})</span>
              </button>
            )}

          </div>

        </div>

        {/* Active Filter Summary Bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-cyan-400" />
              <span>Risultati visibili:</span>
              <strong className="text-slate-200 font-bold">{filteredTransactions.length}</strong>
              <span>di {transactions.length} movimenti totali</span>
            </span>

            {filters.year !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Anno: {filters.year}
              </span>
            )}
            {filters.quarter !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Trimestre: {filters.quarter}
              </span>
            )}
            {filters.month !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                Mese: {MONTH_NAMES_IT[parseInt(filters.month, 10) - 1]}
              </span>
            )}
            {filters.category !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-300 border border-pink-500/20">
                Categoria: {filters.category}
              </span>
            )}
            {filters.account !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Conto: {filters.account}
              </span>
            )}
            {filters.type !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Tipo: {filters.type === 'income' ? 'Entrate' : filters.type === 'expense' ? 'Uscite' : 'Trasferimenti'}
              </span>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3 text-slate-500 text-[11px]">
            <span>Valuta: <strong className="text-slate-400">EUR (€)</strong></span>
            <span>•</span>
            <span>Aggiornato in tempo reale</span>
          </div>
        </div>

      </div>
    </div>
  );
};
