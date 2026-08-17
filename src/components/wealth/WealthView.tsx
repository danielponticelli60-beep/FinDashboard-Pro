import React, { useState, useMemo } from 'react';
import { 
  Landmark, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Download, 
  Upload, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Coins, 
  Building2, 
  CreditCard, 
  PieChart as PieIcon, 
  Scale, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  Sparkles,
  Info
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { WealthItem, WealthType } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { WealthItemModal } from './WealthItemModal';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Area, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export const WealthView: React.FC = () => {
  const { 
    wealthItems, 
    netWorthHistory, 
    wealthMetrics, 
    addWealthItem, 
    updateWealthItem, 
    deleteWealthItem,
    exportWealthCSV,
    exportFullBackupJSON
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'all' | WealthType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WealthItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items
  const filteredItems = useMemo(() => {
    return wealthItems.filter(item => {
      if (activeTab !== 'all' && item.type !== activeTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mName = item.name.toLowerCase().includes(q);
        const mCat = item.category.toLowerCase().includes(q);
        const mInst = item.institution ? item.institution.toLowerCase().includes(q) : false;
        if (!mName && !mCat && !mInst) return false;
      }
      return true;
    });
  }, [wealthItems, activeTab, searchQuery]);

  // Asset allocation: Real vs Target for Liquidità + Investimenti
  const allocationComparison = useMemo(() => {
    const financialItems = wealthItems.filter(w => w.type === 'liquidity' || w.type === 'investment');
    const totalFinancial = financialItems.reduce((acc, curr) => acc + curr.value, 0);

    // Group by category
    const catMap: Record<string, { name: string; realValue: number; realPercent: number; targetPercent: number; delta: number; type: WealthType }> = {};

    financialItems.forEach(item => {
      if (!catMap[item.category]) {
        catMap[item.category] = {
          name: item.category,
          realValue: 0,
          realPercent: 0,
          targetPercent: 0,
          delta: 0,
          type: item.type,
        };
      }
      catMap[item.category].realValue += item.value;
      if (item.targetAllocationPercent) {
        catMap[item.category].targetPercent += item.targetAllocationPercent;
      }
    });

    return Object.values(catMap).map(c => {
      const realPercent = totalFinancial > 0 ? (c.realValue / totalFinancial) * 100 : 0;
      const targetPercent = c.targetPercent || 0;
      const delta = realPercent - targetPercent;
      return {
        ...c,
        realPercent: Number(realPercent.toFixed(1)),
        targetPercent: Number(targetPercent.toFixed(1)),
        delta: Number(delta.toFixed(1)),
      };
    }).sort((a, b) => b.realValue - a.realValue);
  }, [wealthItems]);

  // Handle Quick Value Update
  const handleQuickValueUpdate = (id: string, currentVal: number) => {
    const input = window.prompt('Inserisci il nuovo valore aggiornato in EUR (€):', currentVal.toString());
    if (input === null) return;
    const num = parseFloat(input.replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      updateWealthItem(id, { value: num });
    } else {
      alert('Valore inserito non valido.');
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: WealthItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSaveModal = (itemData: Omit<WealthItem, 'id' | 'updatedAt'>) => {
    if (editingItem) {
      updateWealthItem(editingItem.id, itemData);
    } else {
      addWealthItem(itemData);
    }
  };

  const getTypeBadge = (type: WealthType) => {
    switch (type) {
      case 'liquidity':
        return { label: 'Liquidità', bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30' };
      case 'investment':
        return { label: 'Investimento', bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
      case 'asset':
        return { label: 'Bene Immobile', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'liability':
        return { label: 'Passività / Debito', bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
    }
  };

  return (
    <div className="space-y-4 w-full animate-fadeIn">
      
      {/* Top Banner with Action Controls */}
      <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-black/20">
        
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 tracking-tight">Patrimonio & Asset Allocation</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Net Worth: {formatCurrency(wealthMetrics.netWorth, false)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Monitoraggio liquidità, portafoglio investimenti, immobili e debiti</p>
          </div>
        </div>

        {/* Buttons: Export CSV, Backup JSON, New Asset */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportFullBackupJSON}
            title="Scarica backup completo in formato JSON"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Backup JSON</span>
          </button>

          <button
            onClick={exportWealthCSV}
            title="Esporta tabella asset in formato CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Esporta CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuova Voce</span>
          </button>
        </div>

      </div>

      {/* 5-Column Metric Scorecard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* 1. Liquidità */}
        <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-3.5 space-y-1 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Liquidità Totale</span>
            <Coins className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-sky-400">{formatCurrency(wealthMetrics.totalLiquidity, false)}</div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Autonomia stimata:</span>
            <strong className="text-slate-200">{wealthMetrics.liquidRunwayMonths.toFixed(1)} mesi</strong>
          </div>
        </div>

        {/* 2. Investimenti */}
        <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-3.5 space-y-1 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Investimenti</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-400">{formatCurrency(wealthMetrics.totalInvestments, false)}</div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Peso su asset fin.:</span>
            <strong className="text-purple-300">{wealthMetrics.investmentsShare.toFixed(0)}%</strong>
          </div>
        </div>

        {/* 3. Immobili & Beni */}
        <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-3.5 space-y-1 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Immobili & Beni</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">{formatCurrency(wealthMetrics.totalAssets, false)}</div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Valore patrimoniale:</span>
            <strong className="text-slate-200">Prima casa & auto</strong>
          </div>
        </div>

        {/* 4. Debiti & Passività */}
        <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-3.5 space-y-1 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Debiti & Passività</span>
            <CreditCard className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400">-{formatCurrency(wealthMetrics.totalLiabilities, false)}</div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Indice indebitamento:</span>
            <strong className="text-rose-300">{wealthMetrics.debtToAssetRatio.toFixed(1)}%</strong>
          </div>
        </div>

        {/* 5. Patrimonio Netto */}
        <div className="bg-[#111C38] border border-cyan-500/40 rounded-xl p-3.5 space-y-1 shadow-lg shadow-cyan-500/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-cyan-300 tracking-wider">Patrimonio Netto</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-300">{formatCurrency(wealthMetrics.netWorth, false)}</div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Attivi Lordi:</span>
            <strong className="text-slate-200">{formatCurrency(wealthMetrics.grossWealth, false)}</strong>
          </div>
        </div>

      </div>

      {/* Two Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Chart 1: Net Worth Progression Over Time (7 cols) */}
        <div className="lg:col-span-7 bg-[#111C38] border border-slate-800/90 rounded-xl p-4 shadow-lg shadow-black/20 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Andamento Patrimonio Netto nel Tempo</h3>
                <p className="text-[11px] text-slate-400">Evoluzione storica di liquidità, investimenti, immobili e debiti</p>
              </div>
            </div>
          </div>

          <div className="w-full h-72 min-h-[18rem]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={netWorthHistory} margin={{ top: 10, right: 15, left: -5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis 
                  dataKey="label" 
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
                  tickFormatter={v => `€${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#0B132B]/95 border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs space-y-1.5 min-w-[200px]">
                          <p className="font-bold text-slate-200 border-b border-slate-800 pb-1">{d.label}</p>
                          <div className="flex justify-between text-sky-400">
                            <span>Liquidità:</span>
                            <strong>{formatCurrency(d.liquidity, false)}</strong>
                          </div>
                          <div className="flex justify-between text-purple-400">
                            <span>Investimenti:</span>
                            <strong>{formatCurrency(d.investments, false)}</strong>
                          </div>
                          <div className="flex justify-between text-emerald-400">
                            <span>Immobili & Beni:</span>
                            <strong>{formatCurrency(d.assets, false)}</strong>
                          </div>
                          <div className="flex justify-between text-rose-400">
                            <span>Debiti residui:</span>
                            <strong>-{formatCurrency(d.liabilities, false)}</strong>
                          </div>
                          <div className="flex justify-between text-cyan-300 font-bold pt-1 border-t border-slate-800">
                            <span>Patrimonio Netto:</span>
                            <strong>{formatCurrency(d.netWorth, false)}</strong>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="liquidity" name="Liquidità" fill="#38BDF8" stackId="assets" barSize={18} />
                <Bar dataKey="investments" name="Investimenti" fill="#A855F7" stackId="assets" barSize={18} />
                <Bar dataKey="assets" name="Immobili & Beni" fill="#10B981" stackId="assets" barSize={18} />
                <Line type="monotone" dataKey="netWorth" name="Patrimonio Netto" stroke="#06B6D4" strokeWidth={3} dot={{ fill: '#06B6D4', r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Asset Allocation Reale vs Target (5 cols) */}
        <div className="lg:col-span-5 bg-[#111C38] border border-slate-800/90 rounded-xl p-4 shadow-lg shadow-black/20 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Asset Allocation Reale vs Target</h3>
                <p className="text-[11px] text-slate-400">Ribilanciamento del portafoglio finanziario</p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-72 pr-1">
            {allocationComparison.map((cat, idx) => {
              const isOver = cat.delta > 2;
              const isUnder = cat.delta < -2;
              const inTarget = !isOver && !isUnder;

              return (
                <div key={idx} className="bg-[#0D1527] p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{cat.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-300 font-bold">{formatCurrency(cat.realValue, false)}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        inTarget
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : isOver
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                      }`}>
                        {inTarget ? 'In Target' : isOver ? `+${cat.delta}% Sovrappesato` : `${cat.delta}% Sottopesato`}
                      </span>
                    </div>
                  </div>

                  {/* Progress Comparison Bars */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Reale: <strong className="text-cyan-300">{cat.realPercent}%</strong></span>
                      <span>Target: <strong className="text-slate-300">{cat.targetPercent > 0 ? `${cat.targetPercent}%` : 'N/D'}</strong></span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" 
                        style={{ width: `${Math.min(100, cat.realPercent)}%` }} 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* Asset and Liabilities Table */}
      <div className="bg-[#111C38] border border-slate-800/90 rounded-xl overflow-hidden shadow-lg shadow-black/20">
        
        {/* Table Filter Tabs and Search Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#0E172F]">
          
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#090D16] p-1 rounded-xl border border-slate-800 text-xs">
            {[
              { id: 'all', label: 'Tutti gli Asset', count: wealthItems.length },
              { id: 'liquidity', label: 'Liquidità', count: wealthItems.filter(w => w.type === 'liquidity').length },
              { id: 'investment', label: 'Investimenti', count: wealthItems.filter(w => w.type === 'investment').length },
              { id: 'asset', label: 'Immobili & Beni', count: wealthItems.filter(w => w.type === 'asset').length },
              { id: 'liability', label: 'Debiti & Mutui', count: wealthItems.filter(w => w.type === 'liability').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cerca asset o istituto..."
              className="w-full bg-[#16233F] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D1527] text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="p-3">Denominazione & Categoria</th>
                <th className="p-3">Tipologia</th>
                <th className="p-3">Istituto / Piattaforma</th>
                <th className="p-3 text-right">Valore (€)</th>
                <th className="p-3 text-center">Target Allocazione</th>
                <th className="p-3 text-center">Rendimento / Tasso</th>
                <th className="p-3">Ultimo Aggiornamento</th>
                <th className="p-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Nessuna voce trovata per la tipologia o ricerca selezionata.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const badge = getTypeBadge(item.type);
                  const isDebt = item.type === 'liability';

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition group">
                      
                      {/* Name & Category */}
                      <td className="p-3">
                        <div className="font-bold text-slate-100">{item.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{item.category}</span>
                          {item.notes && <span className="text-slate-500 truncate max-w-[200px]">• {item.notes}</span>}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Institution */}
                      <td className="p-3 whitespace-nowrap text-slate-300 font-medium">
                        {item.institution || '-'}
                      </td>

                      {/* Value */}
                      <td className="p-3 text-right whitespace-nowrap font-bold">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={`text-sm ${isDebt ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isDebt ? `-${formatCurrency(item.value)}` : formatCurrency(item.value)}
                          </span>
                          <button
                            onClick={() => handleQuickValueUpdate(item.id, item.value)}
                            title="Aggiorna valore rapido"
                            className="p-1 rounded text-slate-500 hover:text-cyan-300 hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Target Allocation */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {item.targetAllocationPercent ? (
                          <span className="font-semibold text-slate-200">{item.targetAllocationPercent}%</span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Yield / Interest */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {item.interestRate !== undefined ? (
                          <span className={`font-semibold ${isDebt ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {item.interestRate}%
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Updated Date */}
                      <td className="p-3 text-slate-400 text-[11px] whitespace-nowrap">
                        {item.updatedAt}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Modifica voce"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Eliminare "${item.name}" dal patrimonio?`)) {
                                deleteWealthItem(item.id);
                              }
                            }}
                            title="Elimina voce"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Wealth Item Modal */}
      <WealthItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        editingItem={editingItem}
      />

    </div>
  );
};
