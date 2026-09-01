import React, { useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, getCategoryColor } from '../../utils/formatters';
import { Flame, TrendingUp } from 'lucide-react';

export const TopCategoriesCard: React.FC = () => {
  const { filteredTransactions, kpis } = useFinance();

  const topCategories = useMemo(() => {
    const map: Record<string, { name: string; amount: number; count: number }> = {};

    filteredTransactions.forEach(tx => {
      if (tx.type === 'expense') {
        if (!map[tx.category]) {
          map[tx.category] = { name: tx.category, amount: 0, count: 0 };
        }
        map[tx.category].amount += tx.amount;
        map[tx.category].count += 1;
      }
    });

    const total = kpis.totalExpense > 0 ? kpis.totalExpense : 1;

    return Object.values(map)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(item => ({
        ...item,
        percentage: (item.amount / total) * 100,
        color: getCategoryColor(item.name),
      }));
  }, [filteredTransactions, kpis.totalExpense]);

  return (
    <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between shadow-lg shadow-black/20">
      
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">Top 5 Voci di Spesa</h3>
            <p className="text-[11px] text-slate-400">Maggiori centri di costo</p>
          </div>
        </div>
      </div>

      {topCategories.length === 0 ? (
        <div className="py-6 text-center text-slate-500 text-xs">
          Nessuna spesa nel periodo
        </div>
      ) : (
        <div className="space-y-3">
          {topCategories.map((cat, idx) => (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 w-4">#{idx + 1}</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="font-medium text-slate-200">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-100">{formatCurrency(cat.amount)}</span>
                  <span className="text-[10px] font-semibold text-slate-400 bg-[#0D1527] px-1.5 py-0.5 rounded">
                    {cat.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, cat.percentage)}%`, 
                    backgroundColor: cat.color 
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
