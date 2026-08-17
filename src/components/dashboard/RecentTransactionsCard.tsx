import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDateShort, getCategoryColor, getAccountBadgeColor } from '../../utils/formatters';
import { ArrowLeftRight, ExternalLink, Plus, Edit2 } from 'lucide-react';

export const RecentTransactionsCard: React.FC = () => {
  const { filteredTransactions, setActivePage, openEditModal, openAddModal } = useFinance();

  const recent = filteredTransactions.slice(0, 6);

  return (
    <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between shadow-lg shadow-black/20">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">Ultimi Movimenti Registrati</h3>
            <p className="text-[11px] text-slate-400">Attività recente filtrata</p>
          </div>
        </div>

        <button
          onClick={() => setActivePage('transactions')}
          className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition cursor-pointer"
        >
          <span>Tutti i movimenti</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List / Table */}
      {recent.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs">
          Nessun movimento trovato con i filtri correnti.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800/80 text-[11px]">
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">Descrizione</th>
                <th className="pb-2 font-medium hidden sm:table-cell">Categoria</th>
                <th className="pb-2 font-medium hidden md:table-cell">Conto</th>
                <th className="pb-2 font-medium text-right">Importo</th>
                <th className="pb-2 font-medium text-right w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {recent.map(tx => {
                const isIncome = tx.type === 'income';
                const isTransfer = tx.type === 'transfer';
                const catColor = getCategoryColor(tx.category);
                const accountBadge = getAccountBadgeColor(tx.account);

                return (
                  <tr 
                    key={tx.id} 
                    className="hover:bg-slate-800/40 transition group"
                  >
                    <td className="py-2.5 text-slate-400 font-medium whitespace-nowrap">
                      {formatDateShort(tx.date)}
                    </td>
                    <td className="py-2.5 max-w-[180px]">
                      <div className="font-semibold text-slate-200 truncate">{tx.description}</div>
                      {tx.subcategory && (
                        <div className="text-[10px] text-slate-400 truncate">{tx.subcategory}</div>
                      )}
                    </td>
                    <td className="py-2.5 hidden sm:table-cell whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColor }} />
                        <span>{tx.category}</span>
                      </span>
                    </td>
                    <td className="py-2.5 hidden md:table-cell whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${accountBadge.bg} ${accountBadge.text} ${accountBadge.border}`}>
                        {tx.account}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-bold whitespace-nowrap">
                      <span className={
                        isIncome ? 'text-emerald-400' : isTransfer ? 'text-cyan-400' : 'text-rose-400'
                      }>
                        {isIncome ? `+${formatCurrency(tx.amount)}` : isTransfer ? formatCurrency(tx.amount) : `-${formatCurrency(tx.amount)}`}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => openEditModal(tx)}
                        title="Modifica movimento"
                        className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
