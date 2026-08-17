import React, { useState, useMemo } from 'react';
import { 
  Sliders, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  PieChart as PieIcon, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  HeartHandshake, 
  PiggyBank,
  ArrowRight,
  Info
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { AllocationGroup, AllocationRule } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export const AllocationView: React.FC = () => {
  const { 
    allocationPlan, 
    updateAllocationPlan, 
    updateAllocationRule, 
    resetAllocationPlan, 
    kpis, 
    filteredTransactions 
  } = useFinance();

  const [simulatedMonthlyIncome, setSimulatedMonthlyIncome] = useState<number>(() => {
    return kpis.totalIncome > 0 ? Math.round(kpis.totalIncome) : 3500;
  });

  // Calculate actual spending per category in filtered context
  const actualByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.forEach(tx => {
      if (tx.type === 'expense') {
        map[tx.category] = (map[tx.category] || 0) + tx.amount;
      }
    });
    return map;
  }, [filteredTransactions]);

  // Group rules by Macro bucket
  const groupedRules = useMemo(() => {
    const groups: Record<AllocationGroup, AllocationRule[]> = {
      'Bisogni Essenziali': [],
      'Desideri & Stile di Vita': [],
      'Risparmio & Investimenti': [],
    };

    allocationPlan.rules.forEach(rule => {
      if (groups[rule.group]) {
        groups[rule.group].push(rule);
      }
    });

    return groups;
  }, [allocationPlan.rules]);

  // Calculate totals per macro group
  const macroSums = useMemo(() => {
    const sumNeeds = groupedRules['Bisogni Essenziali'].reduce((acc, r) => acc + r.targetPercentage, 0);
    const sumWants = groupedRules['Desideri & Stile di Vita'].reduce((acc, r) => acc + r.targetPercentage, 0);
    const sumSavings = groupedRules['Risparmio & Investimenti'].reduce((acc, r) => acc + r.targetPercentage, 0);
    const grandTotal = sumNeeds + sumWants + sumSavings;

    return {
      sumNeeds,
      sumWants,
      sumSavings,
      grandTotal,
    };
  }, [groupedRules]);

  // Preset models
  const applyPreset = (needs: number, wants: number, savings: number, name: string) => {
    updateAllocationPlan({
      name,
      targetNeeds: needs,
      targetWants: wants,
      targetSavings: savings,
    });
  };

  // Pie chart data for allocation target vs actual
  const targetPieData = useMemo(() => {
    return [
      { name: 'Bisogni (Target)', value: macroSums.sumNeeds, color: '#38BDF8', amount: (macroSums.sumNeeds / 100) * simulatedMonthlyIncome },
      { name: 'Desideri (Target)', value: macroSums.sumWants, color: '#EC4899', amount: (macroSums.sumWants / 100) * simulatedMonthlyIncome },
      { name: 'Risparmio & Inv. (Target)', value: macroSums.sumSavings, color: '#10B981', amount: (macroSums.sumSavings / 100) * simulatedMonthlyIncome },
    ];
  }, [macroSums, simulatedMonthlyIncome]);

  return (
    <div className="space-y-4 w-full animate-fadeIn">
      
      {/* Top Banner: Income Basis & Macro Summary */}
      <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100 tracking-tight">Piano di Allocazione & Budgeting</h2>
                <p className="text-[11px] text-slate-400">Regola 50/30/20 con percentuali personalizzate e calcoli dinamici</p>
              </div>
            </div>
          </div>

          {/* Income Modeler Field */}
          <div className="flex items-center gap-3 bg-[#0D1527] border border-slate-700/60 rounded-xl p-2 px-3">
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px]">Reddito Mensile di Riferimento:</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-bold text-sm">€</span>
                <input
                  type="number"
                  value={simulatedMonthlyIncome}
                  onChange={e => setSimulatedMonthlyIncome(Math.max(0, Number(e.target.value)))}
                  className="bg-transparent text-slate-100 font-bold text-sm w-24 focus:outline-none focus:border-b border-cyan-400"
                />
              </div>
            </div>

            <button
              onClick={() => setSimulatedMonthlyIncome(Math.round(kpis.totalIncome > 0 ? kpis.totalIncome : 3500))}
              className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700 font-medium transition cursor-pointer"
            >
              Usa Entrate Reali
            </button>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 text-xs font-semibold mr-1">Preset:</span>
            <button
              onClick={() => applyPreset(50, 30, 20, 'Classica 50/30/20')}
              className="px-2.5 py-1 rounded bg-[#16233F] hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 transition cursor-pointer"
            >
              50 / 30 / 20
            </button>
            <button
              onClick={() => applyPreset(60, 20, 20, 'Prudente 60/20/20')}
              className="px-2.5 py-1 rounded bg-[#16233F] hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 transition cursor-pointer"
            >
              60 / 20 / 20
            </button>
            <button
              onClick={() => applyPreset(40, 20, 40, 'Aggressivo FIRE 40/20/40')}
              className="px-2.5 py-1 rounded bg-[#16233F] hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 transition cursor-pointer"
            >
              40 / 20 / 40
            </button>
            <button
              onClick={resetAllocationPlan}
              title="Ripristina valori predefiniti"
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Validation Warning if sum != 100 */}
        {macroSums.grandTotal !== 100 && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                La somma attuale delle percentuali è <strong>{macroSums.grandTotal}%</strong> (Target ideale: 100%).
              </span>
            </div>
            <span>Differenza: {100 - macroSums.grandTotal > 0 ? `+${100 - macroSums.grandTotal}%` : `${100 - macroSums.grandTotal}%`}</span>
          </div>
        )}
      </div>

      {/* 3 Macro Cards (Needs, Wants, Savings) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* 1. Bisogni Essenziali */}
        <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 space-y-4 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Bisogni Essenziali</h3>
                <span className="text-[10px] text-slate-400">Casa, Spesa, Auto, Utenze, Salute</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-sky-400">{macroSums.sumNeeds}%</span>
              <span className="text-[10px] text-slate-400 block font-medium">
                {formatCurrency((macroSums.sumNeeds / 100) * simulatedMonthlyIncome)}/mese
              </span>
            </div>
          </div>

          {/* Sub Categories Sliders */}
          <div className="space-y-3">
            {groupedRules['Bisogni Essenziali'].map(rule => {
              const ruleBudget = (rule.targetPercentage / 100) * simulatedMonthlyIncome;
              const ruleActual = actualByCategory[rule.category] || 0;
              const delta = ruleBudget - ruleActual;

              return (
                <div key={rule.id} className="bg-[#0D1527] p-3 rounded-lg border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: rule.color }} />
                      <span className="font-semibold text-slate-200">{rule.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={rule.targetPercentage}
                        onChange={e => updateAllocationRule(rule.id, { targetPercentage: Math.max(0, Number(e.target.value)) })}
                        className="w-12 text-right bg-[#16233F] border border-slate-700 rounded px-1.5 py-0.5 text-slate-100 font-bold text-xs"
                      />
                      <span className="text-slate-400 text-xs">%</span>
                    </div>
                  </div>

                  {/* Range Slider */}
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={rule.targetPercentage}
                    onChange={e => updateAllocationRule(rule.id, { targetPercentage: Number(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />

                  {/* Calculations */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Budget: <strong className="text-slate-200">{formatCurrency(ruleBudget)}</strong></span>
                    <span>Reale: <strong className={ruleActual > ruleBudget ? 'text-rose-400' : 'text-slate-300'}>{formatCurrency(ruleActual)}</strong></span>
                    <span className={delta >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                      {delta >= 0 ? `+${formatCurrency(delta)}` : formatCurrency(delta)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Desideri & Stile di Vita */}
        <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 space-y-4 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Desideri & Lifestyle</h3>
                <span className="text-[10px] text-slate-400">Ristoranti, Viaggi, Shopping, Streaming</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-pink-400">{macroSums.sumWants}%</span>
              <span className="text-[10px] text-slate-400 block font-medium">
                {formatCurrency((macroSums.sumWants / 100) * simulatedMonthlyIncome)}/mese
              </span>
            </div>
          </div>

          {/* Sub Categories Sliders */}
          <div className="space-y-3">
            {groupedRules['Desideri & Stile di Vita'].map(rule => {
              const ruleBudget = (rule.targetPercentage / 100) * simulatedMonthlyIncome;
              const ruleActual = actualByCategory[rule.category] || 0;
              const delta = ruleBudget - ruleActual;

              return (
                <div key={rule.id} className="bg-[#0D1527] p-3 rounded-lg border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: rule.color }} />
                      <span className="font-semibold text-slate-200">{rule.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={rule.targetPercentage}
                        onChange={e => updateAllocationRule(rule.id, { targetPercentage: Math.max(0, Number(e.target.value)) })}
                        className="w-12 text-right bg-[#16233F] border border-slate-700 rounded px-1.5 py-0.5 text-slate-100 font-bold text-xs"
                      />
                      <span className="text-slate-400 text-xs">%</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={rule.targetPercentage}
                    onChange={e => updateAllocationRule(rule.id, { targetPercentage: Number(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-400"
                  />

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Budget: <strong className="text-slate-200">{formatCurrency(ruleBudget)}</strong></span>
                    <span>Reale: <strong className={ruleActual > ruleBudget ? 'text-rose-400' : 'text-slate-300'}>{formatCurrency(ruleActual)}</strong></span>
                    <span className={delta >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                      {delta >= 0 ? `+${formatCurrency(delta)}` : formatCurrency(delta)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Risparmio & Investimenti */}
        <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 space-y-4 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <PiggyBank className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Risparmio & Investimenti</h3>
                <span className="text-[10px] text-slate-400">Fondo emergenze, PAC ETF, Pensione</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-emerald-400">{macroSums.sumSavings}%</span>
              <span className="text-[10px] text-slate-400 block font-medium">
                {formatCurrency((macroSums.sumSavings / 100) * simulatedMonthlyIncome)}/mese
              </span>
            </div>
          </div>

          {/* Sub Categories Sliders */}
          <div className="space-y-3">
            {groupedRules['Risparmio & Investimenti'].map(rule => {
              const ruleBudget = (rule.targetPercentage / 100) * simulatedMonthlyIncome;
              const ruleActual = actualByCategory[rule.category] || 0;
              const delta = ruleBudget - ruleActual;

              return (
                <div key={rule.id} className="bg-[#0D1527] p-3 rounded-lg border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: rule.color }} />
                      <span className="font-semibold text-slate-200">{rule.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={rule.targetPercentage}
                        onChange={e => updateAllocationRule(rule.id, { targetPercentage: Math.max(0, Number(e.target.value)) })}
                        className="w-12 text-right bg-[#16233F] border border-slate-700 rounded px-1.5 py-0.5 text-slate-100 font-bold text-xs"
                      />
                      <span className="text-slate-400 text-xs">%</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={rule.targetPercentage}
                    onChange={e => updateAllocationRule(rule.id, { targetPercentage: Number(e.target.value) })}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Budget: <strong className="text-slate-200">{formatCurrency(ruleBudget)}</strong></span>
                    <span>Reale: <strong className={ruleActual > ruleBudget ? 'text-rose-400' : 'text-slate-300'}>{formatCurrency(ruleActual)}</strong></span>
                    <span className={delta >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                      {delta >= 0 ? `+${formatCurrency(delta)}` : formatCurrency(delta)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Allocation Model Breakdown & Target Ring */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        <div className="lg:col-span-8 bg-[#111C38] border border-slate-800/90 rounded-xl p-4 space-y-3 shadow-lg shadow-black/20">
          <h3 className="text-sm font-bold text-slate-100">Guida alla Strategia di Risparmio</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[#0D1527] border border-slate-800/80">
              <span className="text-sky-400 font-bold block mb-1">50% - Bisogni</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Spese non negoziabili necessarie per vivere: mutuo/affitto, bollette energetiche, spesa alimentare di base, carburante.
              </p>
            </div>
            
            <div className="p-3 rounded-lg bg-[#0D1527] border border-slate-800/80">
              <span className="text-pink-400 font-bold block mb-1">30% - Desideri</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Spese voluttuarie che migliorano la qualità della vita: cene fuori, viaggi, abbigliamento non essenziale, cinema e hobby.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[#0D1527] border border-slate-800/80">
              <span className="text-emerald-400 font-bold block mb-1">20% - Risparmio</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Costruzione del patrimonio futuro: fondo emergenza (3-6 mesi di spese), versamenti PAC ETF e previdenza complementare.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#111C38] border border-slate-800/90 rounded-xl p-4 flex flex-col items-center justify-center shadow-lg shadow-black/20">
          <span className="text-xs font-bold text-slate-300 mb-2">Composizione Target Teorica</span>
          <div className="w-44 h-44 min-w-[11rem] min-h-[11rem] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={targetPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="#111C38"
                  strokeWidth={2}
                >
                  {targetPieData.map((entry, index) => (
                    <Cell key={`target-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#0B132B]/95 border border-slate-700 rounded-lg p-2 text-xs">
                          <span className="font-bold text-slate-200">{d.name}</span>
                          <div className="text-slate-300 font-medium">{d.value}% ({formatCurrency(d.amount)})</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-slate-400 font-medium">Totale</span>
              <span className="text-xs font-bold text-slate-100">{macroSums.grandTotal}%</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
