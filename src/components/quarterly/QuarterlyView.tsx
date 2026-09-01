import React, { useMemo, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  ArrowRight, 
  Layers, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatPercent, QUARTERS_IT, getCategoryColor } from '../../utils/formatters';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

export const QuarterlyView: React.FC = () => {
  const { transactions, filters, updateFilter } = useFinance();
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return filters.year !== 'all' ? filters.year : '2026';
  });

  // Calculate quarterly stats for the selected year
  const quarterlyStats = useMemo(() => {
    const quarters = [
      { id: 'Q1', name: 'Q1 (Gen - Mar)', months: [1, 2, 3], income: 0, expense: 0, net: 0, savingsRate: 0, txCount: 0, categoryBreakdown: {} as Record<string, number> },
      { id: 'Q2', name: 'Q2 (Apr - Giu)', months: [4, 5, 6], income: 0, expense: 0, net: 0, savingsRate: 0, txCount: 0, categoryBreakdown: {} as Record<string, number> },
      { id: 'Q3', name: 'Q3 (Lug - Set)', months: [7, 8, 9], income: 0, expense: 0, net: 0, savingsRate: 0, txCount: 0, categoryBreakdown: {} as Record<string, number> },
      { id: 'Q4', name: 'Q4 (Ott - Dic)', months: [10, 11, 12], income: 0, expense: 0, net: 0, savingsRate: 0, txCount: 0, categoryBreakdown: {} as Record<string, number> },
    ];

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (isNaN(txDate.getTime())) return;
      const y = txDate.getFullYear().toString();
      if (y !== selectedYear) return;

      const m = txDate.getMonth() + 1;
      let targetQ = quarters[0];
      if (m >= 4 && m <= 6) targetQ = quarters[1];
      else if (m >= 7 && m <= 9) targetQ = quarters[2];
      else if (m >= 10 && m <= 12) targetQ = quarters[3];

      targetQ.txCount += 1;
      if (tx.type === 'income') {
        targetQ.income += tx.amount;
      } else if (tx.type === 'expense') {
        targetQ.expense += tx.amount;
        targetQ.categoryBreakdown[tx.category] = (targetQ.categoryBreakdown[tx.category] || 0) + tx.amount;
      }
    });

    return quarters.map(q => {
      const net = q.income - q.expense;
      const savingsRate = q.income > 0 ? (net / q.income) * 100 : 0;
      
      // Find top expense category
      const topCat = Object.entries(q.categoryBreakdown).sort((a, b) => b[1] - a[1])[0] || ['Nessuna', 0];

      return {
        ...q,
        net,
        savingsRate: Math.max(0, savingsRate),
        topCategory: topCat[0],
        topCategoryAmount: topCat[1],
      };
    });
  }, [transactions, selectedYear]);

  // Chart data
  const chartData = quarterlyStats.map(q => ({
    name: q.id,
    fullName: q.name,
    Entrate: Math.round(q.income),
    Uscite: Math.round(q.expense),
    RisparmioNetto: Math.round(q.net),
  }));

  // Unique expense categories across the year
  const allExpenseCategories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(tx => {
      const y = new Date(tx.date).getFullYear().toString();
      if (y === selectedYear && tx.type === 'expense') {
        set.add(tx.category);
      }
    });
    return Array.from(set);
  }, [transactions, selectedYear]);

  const annualTotalIncome = quarterlyStats.reduce((acc, q) => acc + q.income, 0);
  const annualTotalExpense = quarterlyStats.reduce((acc, q) => acc + q.expense, 0);
  const annualTotalNet = annualTotalIncome - annualTotalExpense;
  const annualAvgSavingsRate = annualTotalIncome > 0 ? (annualTotalNet / annualTotalIncome) * 100 : 0;

  return (
    <div className="space-y-4 w-full animate-fadeIn">
      
      {/* Top Banner & Year Selector */}
      <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-black/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 tracking-tight">Riepilogo Trimestrale ({selectedYear})</h2>
            <p className="text-[11px] text-slate-400">Analisi comparativa delle performance su base trimestrale (Q1, Q2, Q3, Q4)</p>
          </div>
        </div>

        {/* Year Pills */}
        <div className="flex items-center gap-1.5 bg-[#0D1527] p-1 rounded-xl border border-slate-700/60 text-xs">
          {['2026', '2025', '2024'].map(yr => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                selectedYear === yr
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Quarterly Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {quarterlyStats.map((q, idx) => {
          const isPositive = q.net >= 0;
          return (
            <div 
              key={q.id}
              className="bg-[#111C38] border border-slate-800/90 hover:border-slate-700 rounded-xl p-4 space-y-3 transition shadow-lg shadow-black/20"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <span className="text-xs font-bold text-cyan-400 tracking-wider">{q.id}</span>
                  <p className="text-[10px] text-slate-400 font-medium">{q.name}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                  {q.txCount} transazioni
                </span>
              </div>

              {/* In & Out */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Entrate:
                  </span>
                  <span className="font-bold text-emerald-400">{formatCurrency(q.income)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    Uscite:
                  </span>
                  <span className="font-bold text-rose-400">{formatCurrency(q.expense)}</span>
                </div>
              </div>

              {/* Net Balance */}
              <div className="p-2.5 rounded-lg bg-[#0D1527] border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Saldo Netto:</span>
                <span className={`font-bold ${isPositive ? 'text-cyan-300' : 'text-rose-400'}`}>
                  {formatCurrency(q.net)}
                </span>
              </div>

              {/* Savings rate & Top category */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Tasso Risparmio:</span>
                <span className="font-bold text-slate-200 bg-slate-800/80 px-1.5 py-0.5 rounded">
                  {q.savingsRate.toFixed(1)}%
                </span>
              </div>
              
              {q.topCategory !== 'Nessuna' && (
                <div className="text-[10px] text-slate-400 truncate">
                  Top Spesa: <strong className="text-slate-300">{q.topCategory}</strong> ({formatCurrency(q.topCategoryAmount, false)})
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grouped Bar Chart of Quarterly Performance */}
      <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">Confronto Trimestrale Entrate, Uscite e Risparmio</h3>
              <p className="text-[11px] text-slate-400">Panoramica comparativa per trimestre nell'anno {selectedYear}</p>
            </div>
          </div>
        </div>

        <div className="w-full h-72 min-h-[18rem]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis 
                dataKey="fullName" 
                stroke="#64748B" 
                fontSize={11} 
                tickLine={false} 
                axisLine={{ stroke: '#1E293B' }}
              />
              <YAxis 
                stroke="#64748B" 
                fontSize={10} 
                tickLine={false} 
                axisLine={{ stroke: '#1E293B' }}
                tickFormatter={v => `€${v}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-[#0B132B]/95 border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs space-y-1.5">
                        <p className="font-bold text-slate-200 border-b border-slate-800 pb-1">{label}</p>
                        {payload.map((item: any) => (
                          <div key={item.name} className="flex justify-between items-center gap-4">
                            <span className="flex items-center gap-1.5" style={{ color: item.color }}>
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                              {item.name}:
                            </span>
                            <span className="font-bold text-slate-100">{formatCurrency(item.value)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Entrate" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
              <Bar dataKey="Uscite" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={24} />
              <Bar dataKey="RisparmioNetto" fill="#06B6D4" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quarterly Breakdown Matrix Table */}
      <div className="bg-[#111C38] border border-slate-800/90 rounded-xl overflow-hidden shadow-lg shadow-black/20">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100">Matrice Dettagliata Spese per Trimestre</h3>
          <span className="text-xs text-slate-400">Valori espressi in EUR (€)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E172F] text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="p-3">Categoria</th>
                <th className="p-3 text-right">Q1 (Gen-Mar)</th>
                <th className="p-3 text-right">Q2 (Apr-Giu)</th>
                <th className="p-3 text-right">Q3 (Lug-Set)</th>
                <th className="p-3 text-right">Q4 (Ott-Dic)</th>
                <th className="p-3 text-right text-cyan-300">Totale Anno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {allExpenseCategories.map(cat => {
                const q1Val = quarterlyStats[0].categoryBreakdown[cat] || 0;
                const q2Val = quarterlyStats[1].categoryBreakdown[cat] || 0;
                const q3Val = quarterlyStats[2].categoryBreakdown[cat] || 0;
                const q4Val = quarterlyStats[3].categoryBreakdown[cat] || 0;
                const totalCat = q1Val + q2Val + q3Val + q4Val;

                return (
                  <tr key={cat} className="hover:bg-slate-800/30 transition">
                    <td className="p-3 font-semibold text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(cat) }} />
                      <span>{cat}</span>
                    </td>
                    <td className="p-3 text-right text-slate-300 font-medium">
                      {q1Val > 0 ? formatCurrency(q1Val) : '-'}
                    </td>
                    <td className="p-3 text-right text-slate-300 font-medium">
                      {q2Val > 0 ? formatCurrency(q2Val) : '-'}
                    </td>
                    <td className="p-3 text-right text-slate-300 font-medium">
                      {q3Val > 0 ? formatCurrency(q3Val) : '-'}
                    </td>
                    <td className="p-3 text-right text-slate-300 font-medium">
                      {q4Val > 0 ? formatCurrency(q4Val) : '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-100">
                      {formatCurrency(totalCat)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[#0E172F] font-bold text-slate-100 border-t border-slate-700 text-xs">
              <tr>
                <td className="p-3">TOTALE SPESE TRIMESTRALI</td>
                <td className="p-3 text-right text-rose-400">{formatCurrency(quarterlyStats[0].expense)}</td>
                <td className="p-3 text-right text-rose-400">{formatCurrency(quarterlyStats[1].expense)}</td>
                <td className="p-3 text-right text-rose-400">{formatCurrency(quarterlyStats[2].expense)}</td>
                <td className="p-3 text-right text-rose-400">{formatCurrency(quarterlyStats[3].expense)}</td>
                <td className="p-3 text-right text-rose-300 font-bold">{formatCurrency(annualTotalExpense)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
};
