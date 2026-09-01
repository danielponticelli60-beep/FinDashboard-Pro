import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Area, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, MONTH_SHORT_IT } from '../../utils/formatters';
import { BarChart3, TrendingUp } from 'lucide-react';

export const IncomeExpenseChart: React.FC = () => {
  const { filteredTransactions, filters } = useFinance();
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Group transactions by month or by period
  const chartData = useMemo(() => {
    const monthlyMap: Record<string, { monthKey: string; name: string; income: number; expense: number; net: number; order: number }> = {};

    // Initialize all 12 months for current selected year if specified or default
    const yearToUse = filters.year !== 'all' ? filters.year : '2026';
    MONTH_SHORT_IT.forEach((shortName, idx) => {
      const mNum = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
      const key = `${yearToUse}-${mNum}`;
      monthlyMap[key] = {
        monthKey: key,
        name: shortName,
        income: 0,
        expense: 0,
        net: 0,
        order: idx,
      };
    });

    filteredTransactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (isNaN(txDate.getTime())) return;
      const year = txDate.getFullYear();
      const mNum = txDate.getMonth() + 1;
      const mStr = mNum < 10 ? `0${mNum}` : `${mNum}`;
      const key = `${year}-${mStr}`;

      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          monthKey: key,
          name: `${MONTH_SHORT_IT[mNum - 1]} ${year !== 2026 ? `'${year.toString().slice(2)}` : ''}`,
          income: 0,
          expense: 0,
          net: 0,
          order: year * 12 + mNum,
        };
      }

      if (tx.type === 'income') {
        monthlyMap[key].income += tx.amount;
      } else if (tx.type === 'expense') {
        monthlyMap[key].expense += tx.amount;
      }
    });

    return Object.values(monthlyMap)
      .sort((a, b) => a.order - b.order)
      .map(item => ({
        ...item,
        net: item.income - item.expense,
      }));
  }, [filteredTransactions, filters.year]);

  const totalIn = chartData.reduce((acc, curr) => acc + curr.income, 0);
  const totalOut = chartData.reduce((acc, curr) => acc + curr.expense, 0);

  return (
    <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between shadow-lg shadow-black/20">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">Entrate vs Uscite nel Tempo</h3>
            <p className="text-[11px] text-slate-400">Andamento mensile e flusso di cassa</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-[#16233F] p-0.5 rounded-lg border border-slate-700/60 text-xs">
          <button
            onClick={() => setChartType('area')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
              chartType === 'area' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Area Fluida
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
              chartType === 'bar' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Barre
          </button>
        </div>
      </div>

      {/* Quick Summary Pill */}
      <div className="flex items-center gap-4 text-xs mb-2 px-3 py-1.5 rounded-lg bg-[#0D1527] border border-slate-800/70">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-slate-400">Entrate:</span>
          <strong className="text-emerald-400 font-semibold">{formatCurrency(totalIn)}</strong>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          <span className="text-slate-400">Uscite:</span>
          <strong className="text-rose-400 font-semibold">{formatCurrency(totalOut)}</strong>
        </div>
        <div className="hidden sm:flex items-center gap-2 ml-auto">
          <span className="text-slate-400">Margine:</span>
          <strong className={`font-semibold ${totalIn - totalOut >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
            {formatCurrency(totalIn - totalOut)}
          </strong>
        </div>
      </div>

      {/* Recharts Container */}
      <div className="w-full h-64 sm:h-72 min-h-[16rem] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="barIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="barExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FB7185" />
                <stop offset="100%" stopColor="#E11D48" />
              </linearGradient>
            </defs>
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
              tickFormatter={(value) => `€${value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#0B132B]/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs min-w-[180px]">
                      <p className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 mb-2">{label}</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-emerald-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            Entrate:
                          </span>
                          <span className="font-bold text-slate-100">{formatCurrency(data.income)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-rose-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                            Uscite:
                          </span>
                          <span className="font-bold text-slate-100">{formatCurrency(data.expense)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-800 font-semibold">
                          <span className="text-slate-400">Saldo Netto:</span>
                          <span className={data.net >= 0 ? 'text-cyan-400' : 'text-rose-400'}>
                            {formatCurrency(data.net)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {chartType === 'area' ? (
              <>
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  name="Entrate" 
                  stroke="#10B981" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorIncome)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  name="Uscite" 
                  stroke="#F43F5E" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorExpense)" 
                />
                <Line 
                  type="monotone" 
                  dataKey="net" 
                  name="Saldo Netto" 
                  stroke="#38BDF8" 
                  strokeWidth={1.5} 
                  strokeDasharray="4 4"
                  dot={{ fill: '#38BDF8', r: 3 }}
                />
              </>
            ) : (
              <>
                <Bar 
                  dataKey="income" 
                  name="Entrate" 
                  fill="url(#barIncome)" 
                  radius={[4, 4, 0, 0]} 
                  barSize={16}
                />
                <Bar 
                  dataKey="expense" 
                  name="Uscite" 
                  fill="url(#barExpense)" 
                  radius={[4, 4, 0, 0]} 
                  barSize={16}
                />
                <Line 
                  type="monotone" 
                  dataKey="net" 
                  name="Saldo Netto" 
                  stroke="#38BDF8" 
                  strokeWidth={2} 
                  dot={{ fill: '#38BDF8', r: 3 }}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};
