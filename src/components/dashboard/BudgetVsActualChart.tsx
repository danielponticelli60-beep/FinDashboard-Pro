import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { Target, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const BudgetVsActualChart: React.FC = () => {
  const { filteredTransactions, allocationPlan, kpis } = useFinance();

  // Calculate actual spending per category in current filtered scope
  const actualByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.forEach(tx => {
      if (tx.type === 'expense') {
        map[tx.category] = (map[tx.category] || 0) + tx.amount;
      }
    });
    return map;
  }, [filteredTransactions]);

  // Compute base income for budget scaling
  const effectiveIncome = kpis.totalIncome > 0 ? kpis.totalIncome : 3250;

  // Build comparison data
  const data = useMemo(() => {
    return allocationPlan.rules.map(rule => {
      const budgetAmount = (rule.targetPercentage / 100) * effectiveIncome;
      const actualAmount = actualByCategory[rule.category] || 0;
      const delta = budgetAmount - actualAmount;
      const percentUsed = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;
      const isOverBudget = actualAmount > budgetAmount;

      return {
        category: rule.category,
        shortName: rule.category.split('&')[0].trim(),
        budget: Math.round(budgetAmount),
        actual: Math.round(actualAmount),
        delta,
        percentUsed,
        isOverBudget,
        color: rule.color,
      };
    }).sort((a, b) => (b.actual - b.budget) - (a.actual - a.budget));
  }, [allocationPlan, effectiveIncome, actualByCategory]);

  const overBudgetCategories = data.filter(d => d.isOverBudget);

  return (
    <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between shadow-lg shadow-black/20">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">Budget Previsto vs Spesa Effettiva</h3>
            <p className="text-[11px] text-slate-400">Confronto per categoria e scostamento</p>
          </div>
        </div>

        {overBudgetCategories.length > 0 ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>{overBudgetCategories.length} categorie fuori budget</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Spese nei limiti previsti</span>
          </div>
        )}
      </div>

      {/* Recharts Bar Comparison */}
      <div className="w-full h-64 sm:h-72 min-h-[16rem] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
            <XAxis 
              type="number" 
              stroke="#64748B" 
              fontSize={10} 
              tickFormatter={(v) => `€${v}`}
              axisLine={{ stroke: '#1E293B' }}
            />
            <YAxis 
              dataKey="shortName" 
              type="category" 
              stroke="#94A3B8" 
              fontSize={11} 
              tickLine={false} 
              axisLine={{ stroke: '#1E293B' }}
              width={100}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#0B132B]/95 border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs min-w-[200px]">
                      <p className="font-bold text-slate-100 border-b border-slate-800 pb-1.5 mb-2">{d.category}</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Budget Obiettivo:</span>
                          <span className="text-indigo-300 font-semibold">{formatCurrency(d.budget)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Spesa Effettiva:</span>
                          <span className={`font-bold ${d.isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {formatCurrency(d.actual)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-800 font-semibold">
                          <span className="text-slate-400">Differenza:</span>
                          <span className={d.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {d.delta >= 0 ? `+${formatCurrency(d.delta)} (Risparmiati)` : `${formatCurrency(d.delta)} (Sforamento)`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              verticalAlign="top" 
              align="right"
              wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }} 
            />
            <Bar 
              dataKey="budget" 
              name="Budget Previsto (€)" 
              fill="#6366F1" 
              radius={[0, 4, 4, 0]} 
              barSize={9}
            />
            <Bar 
              dataKey="actual" 
              name="Spesa Reale (€)" 
              fill="#F43F5E" 
              radius={[0, 4, 4, 0]} 
              barSize={9}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};
