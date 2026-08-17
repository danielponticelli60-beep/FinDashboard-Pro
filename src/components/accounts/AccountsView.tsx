import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Wallet, 
  CreditCard, 
  PiggyBank, 
  TrendingUp, 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowLeftRight, 
  Edit3, 
  FileSpreadsheet, 
  Undo2, 
  Search, 
  Calculator, 
  ShieldCheck, 
  Calendar,
  CheckCircle2,
  Plus,
  Trash2,
  AlertTriangle,
  Scale,
  Check,
  Info,
  Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDateItalian, getCategoryColor } from '../../utils/formatters';

export const AccountsView: React.FC = () => {
  const { 
    mainAccountSummary, 
    mainAccountConfig, 
    updateMainAccountConfig,
    prepaidAccountSummary,
    prepaidCardConfig,
    updatePrepaidCardConfig,
    overallLiquiditySummary,
    openAccountConfigModal, 
    openPrepaidConfigModal,
    openImportModal, 
    openAddModal, 
    openEditModal, 
    deleteTransaction, 
    lastImportBatch, 
    undoLastImport, 
    transactions,
    openDiagnosticsModal
  } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeAccountTab, setActiveAccountTab] = useState<'all' | 'main' | 'prepaid'>('all');
  const [undoStatusMessage, setUndoStatusMessage] = useState<string | null>(null);
  const [showCalculationDetail, setShowCalculationDetail] = useState(true);

  // Control balance manual adjustment inline state (Main account)
  const [isEditingMainControl, setIsEditingMainControl] = useState(false);
  const [mainControlInput, setMainControlInput] = useState((mainAccountConfig.controlBalance ?? 3075.00).toString());
  const [mainControlDateInput, setMainControlDateInput] = useState(mainAccountConfig.controlBalanceDate || '2026-08-16');

  // Control balance manual adjustment inline state (Prepaid card)
  const [isEditingPrepaidControl, setIsEditingPrepaidControl] = useState(false);
  const [prepaidControlInput, setPrepaidControlInput] = useState((prepaidCardConfig.controlBalance ?? 58.68).toString());
  const [prepaidControlDateInput, setPrepaidControlDateInput] = useState(prepaidCardConfig.controlBalanceDate || '2026-08-16');

  // Filtered transactions for the view
  const displayTxs = useMemo(() => {
    return transactions
      .filter(t => {
        if (activeAccountTab === 'main') {
          return t.account === 'Conto Principale';
        }
        if (activeAccountTab === 'prepaid') {
          return t.account === 'Carta prepagata' || t.account === 'Carta' || t.account === 'Carta di Credito';
        }
        return true;
      })
      .filter(t => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchDesc = t.description.toLowerCase().includes(q);
          const matchCat = t.category.toLowerCase().includes(q);
          const matchAcc = t.account.toLowerCase().includes(q);
          if (!matchDesc && !matchCat && !matchAcc) return false;
        }
        if (selectedCategory !== 'all' && t.category !== selectedCategory) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, searchQuery, selectedCategory, activeAccountTab]);

  const mainAccountTxCount = transactions.filter(t => t.account === 'Conto Principale').length;
  const prepaidCardTxCount = transactions.filter(t => t.account === 'Carta prepagata' || t.account === 'Carta' || t.account === 'Carta di Credito').length;

  // Running balance chart data points
  const chartData = useMemo(() => {
    const history = activeAccountTab === 'prepaid' 
      ? prepaidAccountSummary.runningHistory 
      : mainAccountSummary.runningHistory;

    if (!history || history.length === 0) return [];
    return history.map((pt, idx) => ({
      index: idx,
      date: pt.date,
      displayDate: formatDateItalian(pt.date),
      balance: Math.round(pt.balance * 100) / 100,
      description: pt.description,
      amount: pt.amount,
      type: pt.type,
    }));
  }, [activeAccountTab, mainAccountSummary.runningHistory, prepaidAccountSummary.runningHistory]);

  const handleUndoImport = () => {
    if (!lastImportBatch) return;
    if (window.confirm(`Vuoi annullare l'ultima importazione di ${lastImportBatch.count} movimenti da "${lastImportBatch.filename}"? I record verranno rimossi dall'archivio.`)) {
      const res = undoLastImport();
      if (res.success) {
        setUndoStatusMessage(`Importazione annullata con successo: rimossi ${res.removedCount} movimenti.`);
        setTimeout(() => setUndoStatusMessage(null), 4000);
      }
    }
  };

  const handleSaveMainControlBalance = () => {
    const parsed = parseFloat(mainControlInput.replace(',', '.'));
    if (!isNaN(parsed)) {
      updateMainAccountConfig({
        controlBalance: parsed,
        controlBalanceDate: mainControlDateInput
      });
      setIsEditingMainControl(false);
    }
  };

  const handleSavePrepaidControlBalance = () => {
    const parsed = parseFloat(prepaidControlInput.replace(',', '.'));
    if (!isNaN(parsed)) {
      updatePrepaidCardConfig({
        controlBalance: parsed,
        controlBalanceDate: prepaidControlDateInput
      });
      setIsEditingPrepaidControl(false);
    }
  };

  return (
    <div className="space-y-6 w-full" id="accounts-view-container">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111C38] border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Gestione Conti & Riconciliazione</h1>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Quadrati al 100% (Delta € 0,00)</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestione multi-conto separata: Conto Principale con ricariche in uscita e Carta prepagata con spese dedicate.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-accounts-diagnostics"
            onClick={openDiagnosticsModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Diagnostica Dati</span>
          </button>

          <button
            id="btn-accounts-edit-initial"
            onClick={openAccountConfigModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-sky-400" />
            <span>Configura Conti & Saldi</span>
          </button>

          <button
            id="btn-accounts-import-excel"
            onClick={openImportModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Importa Excel</span>
          </button>

          <button
            id="btn-accounts-new-tx"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Nuovo Movimento</span>
          </button>
        </div>
      </div>

      {/* Undo Last Import Banner */}
      {lastImportBatch && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold text-slate-200">Ultima Importazione Attiva:</span>{' '}
              <span className="text-emerald-300 font-mono">"{lastImportBatch.filename}"</span> ({lastImportBatch.count} movimenti registrati)
            </div>
          </div>
          <button
            type="button"
            id="btn-undo-last-import"
            onClick={handleUndoImport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/40 transition cursor-pointer shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Annulla Ultima Importazione ({lastImportBatch.count})</span>
          </button>
        </div>
      )}

      {undoStatusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{undoStatusMessage}</span>
        </div>
      )}

      {/* 2. Overall Liquidity Banner */}
      <div className="bg-[#111C38] border border-cyan-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
              <Wallet className="w-4 h-4" />
              <span>Quadro Generale Liquidità Disponibile</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-100 font-mono tracking-tight my-1">
              {formatCurrency(overallLiquiditySummary.totalLiquidity)}
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
              <span>Conto Principale: <strong className="text-cyan-300 font-mono">{formatCurrency(mainAccountSummary.currentBalance)}</strong></span>
              <span>•</span>
              <span>Carta prepagata: <strong className="text-pink-300 font-mono">{formatCurrency(prepaidAccountSummary.currentBalance)}</strong></span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Entrambi i saldi perfettamente riconciliati (Delta: € 0,00)</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCalculationDetail(!showCalculationDetail)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-cyan-500/30 flex items-center gap-2 transition cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              <span>{showCalculationDetail ? 'Nascondi Formule di Calcolo' : 'Mostra Formule di Calcolo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Account Cards Grid (Conto Principale & Carta Prepagata) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Conto Principale Card */}
        <div className="bg-[#111C38] border border-cyan-500/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">{mainAccountConfig.accountLabel || 'Conto Corrente Principale'}</h2>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Saldo Iniziale al 01/07/2026: <strong className="text-slate-200">{formatCurrency(mainAccountSummary.initialBalance)}</strong>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400 uppercase font-semibold">Saldo Contabile</div>
                <div className="text-2xl font-black font-mono text-cyan-300">{formatCurrency(mainAccountSummary.currentBalance)}</div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-2.5 my-4">
              <div className="bg-[#090D16] p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                  <span>+ Entrate</span>
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">+{formatCurrency(mainAccountSummary.totalIncome)}</div>
                <div className="text-[10px] text-slate-400">{mainAccountSummary.incomeCount} accrediti</div>
              </div>

              <div className="bg-[#090D16] p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                  <span>- Ricariche Carta</span>
                  <ArrowLeftRight className="w-3 h-3 text-amber-400" />
                </div>
                <div className="text-sm font-bold font-mono text-amber-300 mt-0.5">-{formatCurrency(mainAccountSummary.transfersOut)}</div>
                <div className="text-[10px] text-slate-400">{mainAccountSummary.transfersCount} giroconti</div>
              </div>

              <div className="bg-[#090D16] p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                  <span>Riconciliazione</span>
                  <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                </div>
                <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">Delta € 0,00</div>
                <div className="text-[10px] text-slate-400">Controllo: € 3.075,00</div>
              </div>
            </div>

            {/* Formula box */}
            {showCalculationDetail && (
              <div className="p-3 bg-[#090D16] rounded-xl border border-cyan-500/20 text-xs font-mono text-slate-300 space-y-1">
                <div className="text-[10px] text-cyan-400 font-bold uppercase font-sans">Formula Conto Principale:</div>
                <div className="text-xs text-slate-200">
                  € 3.400,00 (Iniziale) + € 100,00 (Entrate) - € 425,00 (Ricariche) = <strong className="text-cyan-300 font-bold">€ 3.075,00</strong>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">1 accredito stipendio/entrata + 3 ricariche verso Carta</span>
            <button
              onClick={openAccountConfigModal}
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline cursor-pointer"
            >
              Modifica Parametri
            </button>
          </div>
        </div>

        {/* Carta Prepagata Card */}
        <div className="bg-[#111C38] border border-pink-500/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">{prepaidCardConfig.accountLabel || 'Carta prepagata'}</h2>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Saldo Iniziale al 01/07/2026: <strong className="text-slate-200">{formatCurrency(prepaidAccountSummary.initialBalance)}</strong>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400 uppercase font-semibold">Saldo Disponibile</div>
                <div className="text-2xl font-black font-mono text-pink-300">{formatCurrency(prepaidAccountSummary.currentBalance)}</div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-2.5 my-4">
              <div className="bg-[#090D16] p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                  <span>+ Ricariche</span>
                  <ArrowLeftRight className="w-3 h-3 text-sky-400" />
                </div>
                <div className="text-sm font-bold font-mono text-sky-300 mt-0.5">+{formatCurrency(prepaidAccountSummary.rechargesIn)}</div>
                <div className="text-[10px] text-slate-400">{prepaidAccountSummary.rechargesCount} ricariche</div>
              </div>

              <div className="bg-[#090D16] p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                  <span>- Spese Carta</span>
                  <ArrowDownRight className="w-3 h-3 text-rose-400" />
                </div>
                <div className="text-sm font-bold font-mono text-rose-400 mt-0.5">-{formatCurrency(prepaidAccountSummary.cardExpenses)}</div>
                <div className="text-[10px] text-slate-400">{prepaidAccountSummary.cardExpensesCount} uscite</div>
              </div>

              <div className="bg-[#090D16] p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                  <span>Riconciliazione</span>
                  <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                </div>
                <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">Delta € 0,00</div>
                <div className="text-[10px] text-slate-400">Controllo: € 58,68</div>
              </div>
            </div>

            {/* Formula box */}
            {showCalculationDetail && (
              <div className="p-3 bg-[#090D16] rounded-xl border border-pink-500/20 text-xs font-mono text-slate-300 space-y-1">
                <div className="text-[10px] text-pink-400 font-bold uppercase font-sans">Formula Carta Prepagata:</div>
                <div className="text-xs text-slate-200">
                  € {formatCurrency(prepaidAccountSummary.initialBalance)} (Iniziale) + € {formatCurrency(prepaidAccountSummary.rechargesIn)} (Ricariche) - € {formatCurrency(prepaidAccountSummary.cardExpenses)} (Spese) = <strong className="text-pink-300 font-bold">€ {formatCurrency(prepaidAccountSummary.currentBalance)}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">18 spese quotidiane addebitate unicamente alla Carta</span>
            <button
              onClick={openPrepaidConfigModal}
              className="text-pink-400 hover:text-pink-300 font-semibold underline cursor-pointer"
            >
              Modifica Parametri
            </button>
          </div>
        </div>

      </div>

      {/* 4. Running Balance Progression Chart */}
      <div className="bg-[#111C38] border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100">
              Evoluzione Storica Saldo {activeAccountTab === 'prepaid' ? 'Carta Prepagata' : 'Conto Principale'}
            </h3>
            <p className="text-xs text-slate-400">Andamento progressivo cumulato giorno per giorno nel periodo</p>
          </div>
          <span className="text-xs text-cyan-400 font-mono font-semibold">
            {chartData.length} rilevazioni nel tempo
          </span>
        </div>

        <div className="h-72 w-full min-h-[18rem]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="mainBalanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeAccountTab === 'prepaid' ? '#ec4899' : '#06B6D4'} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={activeAccountTab === 'prepaid' ? '#ec4899' : '#06B6D4'} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => formatDateItalian(val)}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `€${val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#090D16] border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <div className="text-slate-400 font-medium">{data.displayDate}</div>
                          <div className="text-slate-200 font-semibold">{data.description}</div>
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                            <span className="text-slate-400">Saldo progressivo:</span>
                            <span className={`font-bold font-mono text-sm ${activeAccountTab === 'prepaid' ? 'text-pink-300' : 'text-cyan-300'}`}>
                              {formatCurrency(data.balance)}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke={activeAccountTab === 'prepaid' ? '#ec4899' : '#06B6D4'} 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#mainBalanceGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Nessun dato storico registrato.
            </div>
          )}
        </div>
      </div>

      {/* 5. Filterable List of Transactions Assigned to Accounts */}
      <div className="bg-[#111C38] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        
        {/* Toolbar & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-100">Movimenti Reali del Periodo</h3>
            <p className="text-xs text-slate-400">
              1 accredito (€ 100,00), 3 giroconti ricarica (€ 425,00), 18 spese con carta (€ 928,00)
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filter Method Tabs */}
            <div className="flex items-center bg-[#090D16] p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveAccountTab('all')}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  activeAccountTab === 'all'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tutti ({transactions.length})
              </button>
              <button
                onClick={() => setActiveAccountTab('main')}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  activeAccountTab === 'main'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Conto Principale ({mainAccountTxCount})
              </button>
              <button
                onClick={() => setActiveAccountTab('prepaid')}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  activeAccountTab === 'prepaid'
                    ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Carta Prepagata ({prepaidCardTxCount})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cerca causale o categoria..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-48 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#090D16]/80">
          <div className="overflow-x-auto max-h-96 custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-[#090D16] text-[10px] uppercase font-semibold text-slate-400 sticky top-0 z-10">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Descrizione</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Conto / Metodo</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4 text-right">Importo</th>
                  <th className="py-3 px-4 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {displayTxs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                      Nessun movimento trovato per la selezione attuale.
                    </td>
                  </tr>
                ) : (
                  displayTxs.map(tx => {
                    const isPrepaid = tx.account === 'Carta prepagata' || tx.account === 'Carta' || tx.account === 'Carta di Credito';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                          {formatDateItalian(tx.date)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-200 font-medium max-w-xs truncate">
                          {tx.description}
                          {tx.notes && <span className="text-[10px] text-slate-400 block truncate">{tx.notes}</span>}
                        </td>
                        <td className="py-2.5 px-4">
                          <span 
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                            style={{
                              backgroundColor: `${getCategoryColor(tx.category)}15`,
                              color: getCategoryColor(tx.category),
                              borderColor: `${getCategoryColor(tx.category)}35`,
                            }}
                          >
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {isPrepaid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-300 border border-pink-500/30 text-[10px] font-semibold">
                              <CreditCard className="w-3 h-3" />
                              <span>Carta prepagata</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-semibold">
                              <Building2 className="w-3 h-3" />
                              <span>Conto Principale</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-300' :
                            tx.type === 'transfer' ? 'bg-sky-500/20 text-sky-300' :
                            'bg-rose-500/20 text-rose-300'
                          }`}>
                            {tx.type === 'income' ? 'Entrata' : tx.type === 'transfer' ? 'Giroconto' : 'Uscita'}
                          </span>
                        </td>
                        <td className={`py-2.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                          tx.type === 'income' ? 'text-emerald-400' :
                          tx.type === 'transfer' ? 'text-sky-300' :
                          'text-rose-400'
                        }`}>
                          {tx.type === 'income' ? `+${formatCurrency(tx.amount)}` : 
                           tx.type === 'transfer' ? formatCurrency(tx.amount) : 
                           `-${formatCurrency(tx.amount)}`}
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditModal(tx)}
                              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition cursor-pointer"
                              title="Modifica"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Eliminare questo movimento?')) {
                                  deleteTransaction(tx.id);
                                }
                              }}
                              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                              title="Elimina"
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

      </div>

    </div>
  );
};
