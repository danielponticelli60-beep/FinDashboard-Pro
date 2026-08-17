import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDateShort } from '../../utils/formatters';
import { LineChart, Sparkles } from 'lucide-react';

export const CumulativeBalanceChart: React.FC = () => {
  const { filteredTransactions } = useFinance();

  // Sort transactions by date ascending and calculate cumulative balance
  const data = useMemo(() => {
    if (filteredTransactions.length === 0) return [];

    const sorted = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningBalance = 0;
    const dateMap: Record<string, { date: string; displayDate: string; change: number; cumulative: number }> = {};

    sorted.forEach(tx => {
      let delta = 0;
      if (tx.type === 'income') delta = tx.amount;
      else if (tx.type === 'expense') delta = -tx.amount;
      
      runningBalance += delta;

      dateMap[tx.date] = {
        date: tx.date,
        displayDate: formatDateShort(tx.date),
        change: delta,
        cumulative: Math.round(runningBalance),
      };
    });

    return Object.values(dateMap);
  }, [filteredTransactions]);

  const maxBalance = data.reduce((max, d) => Math.max(max, d.cumulative), 0);
  const minBalance = data.reduce((min, d) => Math.min(min, d.cumulative), 0);
  const finalBalance = data.length > 0 ? data[data.length - 1].cumulative : 0;

  return (
    <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between shadow-lg shadow-black/20">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <LineChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">Saldo Cumulativo & Patrimonio</h3>
            <p className="text-[11px] text-slate-400">Progressione temporale del saldo netto</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Saldo finale di periodo:</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
            finalBalance >= 0 
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}>
            {formatCurrency(finalBalance)}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-64 sm:h-72 min-h-[16rem] mt-2">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            Nessun dato cumulativo disponibile per la selezione attuale
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis 
                dataKey="displayDate" 
                stroke="#64748B" 
                fontSize={10} 
                tickLine={false} 
                axisLine={{ stroke: '#1E293B' }}
              />
              <YAxis 
                stroke="#64748B" 
                fontSize={10} 
                tickLine={false} 
                axisLine={{ stroke: '#1E293B' }}
                tickFormatter={(val) => `€${val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}`}
              />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-[#0B132B]/95 border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs min-w-[170px]">
                        <p className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-1.5">{item.date}</p>
                        <div className="flex justify-between items-center text-slate-300">
                          <span>Saldo Cumulativo:</span>
                          <strong className={item.cumulative >= 0 ? 'text-cyan-400' : 'text-rose-400'}>
                            {formatCurrency(item.cumulative)}
                          </strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="cumulative" 
                stroke="#06B6D4" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#balanceGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
};
