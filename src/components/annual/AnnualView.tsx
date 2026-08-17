import React, { useState, useMemo } from 'react';
import { 
  CalendarRange, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  AlertCircle, 
  Flame, 
  PiggyBank, 
  CreditCard,
  Euro,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { 
  formatCurrency, 
  formatPercent, 
  MONTH_NAMES_IT, 
  MONTH_SHORT_IT,
  getCategoryColor 
} from '../../utils/formatters';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  Area 
} from 'recharts';

export const AnnualView: React.FC = () => {
  const { transactions } = useFinance();
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Compute 12 months statistics for selected year
  const monthlyStats = useMemo(() => {
    const months = MONTH_NAMES_IT.map((name, idx) => ({
      index: idx + 1,
      monthStr: idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`,
      name,
      shortName: MONTH_SHORT_IT[idx],
      income: 0,
      expense: 0,
      net: 0,
      savingsRate: 0,
      txCount: 0,
      categoryExpenses: {} as Record<string, number>,
      topCategory: 'Nessuna',
      topCategoryAmount: 0,
    }));

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (isNaN(txDate.getTime())) return;
      const y = txDate.getFullYear().toString();
      if (y !== selectedYear) return;

      const mIdx = txDate.getMonth();
      const monthObj = months[mIdx];
      if (!monthObj) return;

      monthObj.txCount += 1;
      if (tx.type === 'income') {
        monthObj.income += tx.amount;
      } else if (tx.type === 'expense') {
        monthObj.expense += tx.amount;
        monthObj.categoryExpenses[tx.category] = (monthObj.categoryExpenses[tx.category] || 0) + tx.amount;
      }
    });

    return months.map(m => {
      const net = m.income - m.expense;
      const savingsRate = m.income > 0 ? (net / m.income) * 100 : 0;
      
      const topEntry = Object.entries(m.categoryExpenses).sort((a, b) => b[1] - a[1])[0];
      const topCat = topEntry ? topEntry[0] : 'Nessuna';
      const topCatAmount = topEntry ? topEntry[1] : 0;

      return {
        ...m,
        net,
        savingsRate: Math.max(0, savingsRate),
        topCategory: topCat,
        topCategoryAmount: topCatAmount,
      };
    });
  }, [transactions, selectedYear]);

  // Annual Totals & KPIs
  const annualTotals = useMemo(() => {
    const totalIncome = monthlyStats.reduce((acc, m) => acc + m.income, 0);
    const totalExpense = monthlyStats.reduce((acc, m) => acc + m.expense, 0);
    const netBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;
    
    // Count active months (with at least 1 tx)
    const activeMonths = monthlyStats.filter(m => m.txCount > 0).length || 1;
    const avgMonthlyIncome = totalIncome / activeMonths;
    const avgMonthlyExpense = totalExpense / activeMonths;
    const avgDailyExpense = totalExpense / (activeMonths * 30.4);

    // Best and heaviest months
    const sortedBySavings = [...monthlyStats.filter(m => m.income > 0)].sort((a, b) => b.savingsRate - a.savingsRate);
    const bestMonth = sortedBySavings[0] || null;

    const sortedByExpense = [...monthlyStats].sort((a, b) => b.expense - a.expense);
    const heaviestMonth = sortedByExpense[0] || null;

    return {
      totalIncome,
      totalExpense,
      netBalance,
      savingsRate,
      avgMonthlyIncome,
      avgMonthlyExpense,
      avgDailyExpense,
      bestMonth,
      heaviestMonth,
      activeMonths,
    };
  }, [monthlyStats]);

  // Chart data for annual view
  const chartData = monthlyStats.map(m => ({
    name: m.shortName,
    fullName: m.name,
    Entrate: Math.round(m.income),
    Uscite: Math.round(m.expense),
    Saldo: Math.round(m.net),
    TassoRisparmio: Number(m.savingsRate.toFixed(1)),
  }));

  return (
    <div className="space-y-4 w-full animate-fadeIn">
      
      {/* Top Banner with Year Switcher */}
      <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-black/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CalendarRange className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 tracking-tight">Riepilogo Annuale ({selectedYear})</h2>
            <p className="text-[11px] text-slate-400">Consuntivo dei 12 mesi, indicatori di performance e tendenze di spesa</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0D1527] p-1 rounded-xl border border-slate-700/60 text-xs">
          {['2026', '2025', '2024'].map(yr => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
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

      {/* Annual Summary Scorecard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Entrate Annuali */}
        <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 space-y-1 shadow-lg shadow-black/20">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Entrate Totali Anno</span>
          <div className="text-xl font-bold text-emerald-400">{formatCurrency(annualTotals.totalIncome)}</div>
          <div className="text-[11px] text-slate-400">
            Media mensile: <strong className="text-slate-200">{formatCurrency(annualTotals.avgMonthlyIncome)}</strong>
          </div>
        </div>

        {/* Uscite Annuali */}
        <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 space-y-1 shadow-lg shadow-black/20">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Uscite Totali Anno</span>
          <div className="text-xl font-bold text-rose-400">{formatCurrency(annualTotals.totalExpense)}</div>
          <div className="text-[11px] text-slate-400">
            Spesa media/giorno: <strong className="text-slate-200">{formatCurrency(annualTotals.avgDailyExpense)}</strong>
          </div>
        </div>

        {/* Risparmio Netto Annuo */}
        <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 space-y-1 shadow-lg shadow-black/20">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Risparmio Netto Annuo</span>
          <div className={`text-xl font-bold ${annualTotals.netBalance >= 0 ? 'text-cyan-300' : 'text-rose-300'}`}>
            {formatCurrency(annualTotals.netBalance)}
          </div>
          <div className="text-[11px] text-slate-400">
            Tasso di risparmio: <strong className="text-cyan-400">{annualTotals.savingsRate.toFixed(1)}%</strong>
          </div>
        </div>

        {/* Mese Top Performance */}
        <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 space-y-1 shadow-lg shadow-black/20">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mese Più Virtuoso</span>
          <div className="text-lg font-bold text-slate-100 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            <span>{annualTotals.bestMonth ? annualTotals.bestMonth.name : 'N/D'}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Risparmio: <strong className="text-emerald-400">+{annualTotals.bestMonth?.savingsRate.toFixed(1)}%</strong>
          </div>
        </div>

      </div>

      {/* Annual Trend Chart */}
      <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">Evoluzione Mensile {selectedYear}</h3>
              <p className="text-[11px] text-slate-400">Confronto tra entrate, uscite e saldo mese per mese</p>
            </div>
          </div>
        </div>

        <div className="w-full h-72 min-h-[18rem]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis 
                dataKey="name" 
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
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#0B132B]/95 border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs space-y-1.5 min-w-[180px]">
                        <p className="font-bold text-slate-200 border-b border-slate-800 pb-1">{d.fullName} {selectedYear}</p>
                        <div className="flex justify-between text-emerald-400">
                          <span>Entrate:</span>
                          <strong>{formatCurrency(d.Entrate)}</strong>
                        </div>
                        <div className="flex justify-between text-rose-400">
                          <span>Uscite:</span>
                          <strong>{formatCurrency(d.Uscite)}</strong>
                        </div>
                        <div className="flex justify-between text-cyan-300 font-semibold pt-1 border-t border-slate-800">
                          <span>Saldo Netto:</span>
                          <strong>{formatCurrency(d.Saldo)}</strong>
                        </div>
                        <div className="flex justify-between text-slate-400 text-[10px]">
                          <span>Tasso Risparmio:</span>
                          <span>{d.TassoRisparmio}%</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Entrate" fill="#10B981" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="Uscite" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={16} />
              <Line type="monotone" dataKey="Saldo" stroke="#38BDF8" strokeWidth={2.5} dot={{ fill: '#38BDF8', r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 12-Month Table */}
      <div className="bg-[#111C38] border border-slate-800/90 rounded-xl overflow-hidden shadow-lg shadow-black/20">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100">Dettaglio 12 Mesi dell'Anno {selectedYear}</h3>
          <span className="text-xs text-slate-400">Valori espressi in EUR (€)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0E172F] text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="p-3">Mese</th>
                <th className="p-3 text-right">Entrate</th>
                <th className="p-3 text-right">Uscite</th>
                <th className="p-3 text-right">Saldo Netto</th>
                <th className="p-3 text-center">Tasso Risparmio</th>
                <th className="p-3">Top Voce di Spesa</th>
                <th className="p-3 text-center">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {monthlyStats.map(m => {
                const isPositive = m.net >= 0;
                const hasActivity = m.txCount > 0;

                return (
                  <tr key={m.monthStr} className="hover:bg-slate-800/30 transition">
                    <td className="p-3 font-semibold text-slate-200">
                      <span>{m.name}</span>
                    </td>

                    <td className="p-3 text-right text-emerald-400 font-semibold">
                      {hasActivity ? formatCurrency(m.income) : '-'}
                    </td>

                    <td className="p-3 text-right text-rose-400 font-semibold">
                      {hasActivity ? formatCurrency(m.expense) : '-'}
                    </td>

                    <td className="p-3 text-right font-bold">
                      {hasActivity ? (
                        <span className={isPositive ? 'text-cyan-300' : 'text-rose-400'}>
                          {isPositive ? `+${formatCurrency(m.net)}` : formatCurrency(m.net)}
                        </span>
                      ) : '-'}
                    </td>

                    <td className="p-3 text-center">
                      {hasActivity ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          m.savingsRate >= 20 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}>
                          {m.savingsRate.toFixed(1)}%
                        </span>
                      ) : '-'}
                    </td>

                    <td className="p-3">
                      {m.topCategory !== 'Nessuna' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(m.topCategory) }} />
                          <span className="text-slate-300 font-medium">{m.topCategory}</span>
                          <span className="text-slate-500 text-[11px]">({formatCurrency(m.topCategoryAmount, false)})</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      {hasActivity ? (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          <span>{isPositive ? 'Surplus' : 'Deficit'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[10px]">Nessun movimento</span>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[#0E172F] font-bold text-slate-100 border-t border-slate-700 text-xs">
              <tr>
                <td className="p-3">TOTALE ANNUALE</td>
                <td className="p-3 text-right text-emerald-400">{formatCurrency(annualTotals.totalIncome)}</td>
                <td className="p-3 text-right text-rose-400">{formatCurrency(annualTotals.totalExpense)}</td>
                <td className="p-3 text-right text-cyan-300">{formatCurrency(annualTotals.netBalance)}</td>
                <td className="p-3 text-center text-cyan-300">{annualTotals.savingsRate.toFixed(1)}%</td>
                <td colSpan={2} className="p-3 text-slate-400 font-medium">
                  Media mensile: {formatCurrency(annualTotals.avgMonthlyExpense)}/mese
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
};
