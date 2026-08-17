import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Sector } from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatPercent, getCategoryColor } from '../../utils/formatters';
import { PieChart as PieIcon, Layers } from 'lucide-react';

export const CategoryExpenseChart: React.FC = () => {
  const { filteredTransactions } = useFinance();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Aggregate expenses by category
  const data = useMemo(() => {
    const map: Record<string, { name: string; value: number; count: number }> = {};
    let totalExpense = 0;

    filteredTransactions.forEach(tx => {
      if (tx.type === 'expense') {
        totalExpense += tx.amount;
        if (!map[tx.category]) {
          map[tx.category] = { name: tx.category, value: 0, count: 0 };
        }
        map[tx.category].value += tx.amount;
        map[tx.category].count += 1;
      }
    });

    return Object.values(map)
      .sort((a, b) => b.value - a.value)
      .map(item => ({
        ...item,
        percentage: totalExpense > 0 ? (item.value / totalExpense) * 100 : 0,
        color: getCategoryColor(item.name),
      }));
  }, [filteredTransactions]);

  const totalExpense = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.value, 0);
  }, [data]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between shadow-lg shadow-black/20">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">Ripartizione Spese per Categoria</h3>
            <p className="text-[11px] text-slate-400">{data.length} categorie attive</p>
          </div>
        </div>
        <span className="text-xs font-bold text-slate-200 bg-[#16233F] px-2.5 py-1 rounded-lg border border-slate-700/60">
          Tot: {formatCurrency(totalExpense)}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
          <Layers className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
          <span>Nessuna spesa trovata per i filtri selezionati</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center mt-2">
          
          {/* Donut Chart with Centered Total */}
          <div className="lg:col-span-6 h-56 min-h-[14rem] relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  stroke="#111C38"
                  strokeWidth={2}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      className="cursor-pointer transition-transform duration-300 hover:scale-105"
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-[#0B132B]/95 border border-slate-700/80 rounded-xl p-2.5 shadow-xl text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-200 mb-1">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span>{item.name}</span>
                          </div>
                          <div className="flex items-baseline justify-between gap-4 text-slate-300">
                            <span>Importo:</span>
                            <strong className="text-white">{formatCurrency(item.value)}</strong>
                          </div>
                          <div className="flex items-baseline justify-between gap-4 text-slate-400 text-[11px] mt-0.5">
                            <span>Incidenza:</span>
                            <span className="font-semibold text-cyan-400">{item.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Total Center Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Uscite</span>
              <span className="text-xs sm:text-sm font-bold text-slate-100">{formatCurrency(totalExpense, false)}</span>
            </div>
          </div>

          {/* Category Legend & Percentage List */}
          <div className="lg:col-span-6 flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
            {data.map((item, idx) => {
              const isHighlighted = activeIndex === idx;
              return (
                <div
                  key={item.name}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`flex items-center justify-between p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    isHighlighted ? 'bg-slate-800/80 border border-slate-700' : 'hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className="text-slate-300 font-medium truncate">{item.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-100 font-semibold">{formatCurrency(item.value)}</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-[#0D1527] px-1.5 py-0.5 rounded min-w-[38px] text-right">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};
