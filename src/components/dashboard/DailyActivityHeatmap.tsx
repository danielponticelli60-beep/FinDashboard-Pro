import React, { useMemo, useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, MONTH_SHORT_IT } from '../../utils/formatters';
import { CalendarDays, Info } from 'lucide-react';

export const DailyActivityHeatmap: React.FC = () => {
  const { filteredTransactions, filters } = useFinance();
  const [selectedDayInfo, setSelectedDayInfo] = useState<{ date: string; amount: number; count: number } | null>(null);

  const targetYear = filters.year !== 'all' ? parseInt(filters.year, 10) : 2026;

  // Aggregate daily expenses
  const dailyExpenses = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};

    filteredTransactions.forEach(tx => {
      if (tx.type === 'expense') {
        if (!map[tx.date]) {
          map[tx.date] = { amount: 0, count: 0 };
        }
        map[tx.date].amount += tx.amount;
        map[tx.date].count += 1;
      }
    });

    return map;
  }, [filteredTransactions]);

  // Generate calendar grid for the year (52 weeks x 7 days)
  const calendarData = useMemo(() => {
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31);
    
    // Find the first Sunday/Monday
    const startDay = startDate.getDay(); // 0 is Sunday
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const weeks: Array<Array<{ dateStr: string; dayOfMonth: number; month: number; amount: number; count: number; dayOfWeek: number } | null>> = [];
    let currentWeek: Array<{ dateStr: string; dayOfMonth: number; month: number; amount: number; count: number; dayOfWeek: number } | null> = [];

    // Pad beginning of first week
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null);
    }

    for (let d = 0; d < totalDays; d++) {
      const cur = new Date(targetYear, 0, 1 + d);
      const m = cur.getMonth() + 1;
      const mStr = m < 10 ? `0${m}` : `${m}`;
      const day = cur.getDate();
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const dateStr = `${targetYear}-${mStr}-${dayStr}`;

      const exp = dailyExpenses[dateStr] || { amount: 0, count: 0 };

      currentWeek.push({
        dateStr,
        dayOfMonth: day,
        month: m - 1,
        amount: exp.amount,
        count: exp.count,
        dayOfWeek: cur.getDay(),
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [targetYear, dailyExpenses]);

  // Determine intensity color
  const getCellColor = (amount: number) => {
    if (amount === 0) return 'bg-[#16233F]/70 border-slate-800/80 hover:border-slate-500';
    if (amount < 50) return 'bg-cyan-900/60 border-cyan-700/50 hover:border-cyan-400';
    if (amount < 150) return 'bg-cyan-600/70 border-cyan-400/60 hover:border-cyan-200';
    if (amount < 300) return 'bg-cyan-500 border-cyan-300 hover:border-white shadow-sm shadow-cyan-500/30';
    return 'bg-amber-400 border-amber-200 hover:border-white shadow-md shadow-amber-500/40';
  };

  const daysOfWeekLabels = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];

  return (
    <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between shadow-lg shadow-black/20">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">Calendario Uscite Quotidiane ({targetYear})</h3>
            <p className="text-[11px] text-slate-400">Intensità di spesa giorno per giorno</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>Min</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#16233F] border border-slate-700" />
            <span className="w-2.5 h-2.5 rounded-xs bg-cyan-900/60 border border-cyan-700/50" />
            <span className="w-2.5 h-2.5 rounded-xs bg-cyan-600/70 border border-cyan-400/60" />
            <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500 border border-cyan-300" />
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 border border-amber-200" />
          </div>
          <span>Max (€300+)</span>
        </div>
      </div>

      {/* Selected Day Toast */}
      {selectedDayInfo && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-xs text-cyan-200 animate-fadeIn">
          <span>Data: <strong>{selectedDayInfo.date}</strong></span>
          <span>Spesa totale: <strong>{formatCurrency(selectedDayInfo.amount)}</strong> ({selectedDayInfo.count} movimenti)</span>
        </div>
      )}

      {/* Calendar Grid Matrix */}
      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="min-w-[680px]">
          
          {/* Months header labels */}
          <div className="flex justify-between pl-6 text-[10px] text-slate-400 font-semibold mb-1">
            {MONTH_SHORT_IT.map(m => (
              <span key={m} className="w-12 text-center">{m}</span>
            ))}
          </div>

          <div className="flex gap-1.5">
            
            {/* Days of week labels column */}
            <div className="flex flex-col gap-1 pr-1 text-[10px] text-slate-400 font-bold justify-between py-0.5">
              {daysOfWeekLabels.map((d, i) => (
                <span key={i} className="h-3 flex items-center justify-center">{d}</span>
              ))}
            </div>

            {/* Weeks Columns */}
            <div className="flex gap-1 flex-1">
              {calendarData.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1 flex-1">
                  {week.map((day, dIdx) => {
                    if (!day) {
                      return <div key={dIdx} className="h-3 rounded-[2px] opacity-0" />;
                    }
                    return (
                      <div
                        key={dIdx}
                        onClick={() => setSelectedDayInfo({ date: day.dateStr, amount: day.amount, count: day.count })}
                        title={`${day.dateStr}: ${formatCurrency(day.amount)} (${day.count} spese)`}
                        className={`h-3 rounded-[2px] border transition-all cursor-pointer ${getCellColor(day.amount)}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

          </div>

        </div>
      </div>

    </div>
  );
};
