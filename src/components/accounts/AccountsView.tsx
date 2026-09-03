import React, { useMemo, useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Edit3,
  FileSpreadsheet,
  Undo2,
  Search,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Trash2,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDateItalian, getCategoryColor } from '../../utils/formatters';
import { ACCOUNT_KIND_META } from '../../utils/accountPresentation';
import { ACCOUNT_LIMITS } from '../../utils/accountRules';
import { AddAccountModal } from './AddAccountModal';
import { TransferModal } from './TransferModal';

export const AccountsView: React.FC = () => {
  const {
    accounts,
    accountSummaries,
    aggregateSummary,
    deleteAccount,
    openAddAccountModal,
    openTransferModal,
    openImportModal,
    openAddModal,
    openEditModal,
    deleteTransaction,
    lastImportBatch,
    undoLastImport,
    transactions,
    openDiagnosticsModal,
  } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeAccountTab, setActiveAccountTab] = useState<string>('all');
  const [undoStatusMessage, setUndoStatusMessage] = useState<string | null>(null);
  const [editAccountId, setEditAccountId] = useState<string | null>(null);

  const canDelete = accounts.length > ACCOUNT_LIMITS.MIN_ACCOUNTS;
  const canAdd = accounts.length < ACCOUNT_LIMITS.MAX_ACCOUNTS;

  // Transactions whose accountId doesn't match any configured account
  // (e.g. a legacy 'cash_account' tag never promoted to a real account).
  const orphanAccountGroups = useMemo(() => {
    const knownIds = new Set(accounts.map(a => a.id));
    const groups = new Map<string, { label: string; count: number; total: number }>();
    for (const tx of transactions) {
      if (!tx.accountId || knownIds.has(tx.accountId)) continue;
      const key = tx.accountId;
      const existing = groups.get(key) || { label: tx.accountLabel || tx.account || key, count: 0, total: 0 };
      existing.count += 1;
      existing.total += tx.type === 'expense' ? -tx.amount : tx.amount;
      groups.set(key, existing);
    }
    return Array.from(groups.entries()).map(([id, g]) => ({ id, ...g }));
  }, [accounts, transactions]);

  const incompleteTransfersCount = useMemo(
    () => transactions.filter(t => t.transferAccountsIncomplete).length,
    [transactions]
  );

  const displayTxs = useMemo(() => {
    return transactions
      .filter(t => {
        if (activeAccountTab === 'all') return true;
        return t.accountId === activeAccountTab;
      })
      .filter(t => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.account || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, searchQuery, activeAccountTab]);

  const txCountByAccount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of accounts) counts[a.id] = transactions.filter(t => t.accountId === a.id).length;
    return counts;
  }, [accounts, transactions]);

  const chartAccountId = activeAccountTab !== 'all' ? activeAccountTab : accounts[0]?.id;
  const chartData = useMemo(() => {
    const history = chartAccountId ? accountSummaries[chartAccountId]?.runningHistory : undefined;
    if (!history || history.length === 0) return [];
    return history.map((pt, idx) => ({
      index: idx,
      date: pt.date,
      displayDate: formatDateItalian(pt.date),
      balance: Math.round(pt.balance * 100) / 100,
      description: pt.description,
    }));
  }, [chartAccountId, accountSummaries]);

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

  const handleDeleteAccount = (id: string, label: string) => {
    if (!window.confirm(`Eliminare il conto "${label}"? Le transazioni storiche non verranno eliminate, ma mostreranno questo conto come non configurato.`)) return;
    const res = deleteAccount(id);
    if (!res.success) window.alert(res.message);
  };

  return (
    <div className="space-y-6 w-full" id="accounts-view-container">

      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111C38] border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Gestione Conti & Liquidità</h1>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>{accounts.length} conti attivi</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestione multi-conto (2-4 conti): ciascun conto ha saldo operativo autonomo, aggiornato dai movimenti collegati.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={openDiagnosticsModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Diagnostica Dati</span>
          </button>

          <button
            onClick={openTransferModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-500/30 transition cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Trasferimento</span>
          </button>

          <button
            onClick={openImportModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Importa Excel</span>
          </button>

          <button
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

      {incompleteTransfersCount > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {incompleteTransfersCount} trasferiment{incompleteTransfersCount === 1 ? 'o' : 'i'} storic{incompleteTransfersCount === 1 ? 'o' : 'i'} senza conto di destinazione noto — non conteggiati nei saldi dei conti finché non li completi.
            </span>
          </div>
          <button onClick={openDiagnosticsModal} className="text-amber-300 hover:text-amber-200 font-semibold underline cursor-pointer shrink-0">
            Vedi in Diagnostica
          </button>
        </div>
      )}

      {/* 2. Aggregate Liquidity Banner */}
      <div className="bg-[#111C38] border border-cyan-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
          <Wallet className="w-4 h-4" />
          <span>Quadro Generale Liquidità Disponibile</span>
        </div>
        <div className="text-3xl sm:text-4xl font-extrabold text-slate-100 font-mono tracking-tight my-1">
          {formatCurrency(aggregateSummary.totalLiquidity)}
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
          {accounts.map((a, idx) => (
            <React.Fragment key={a.id}>
              {idx > 0 && <span>•</span>}
              <span>{a.label}: <strong className={`${ACCOUNT_KIND_META[a.kind].accentText} font-mono`}>{formatCurrency(accountSummaries[a.id]?.currentBalance ?? a.initialBalance)}</strong></span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 3. Account Cards Grid (2-4 accounts, generic) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {accounts.map(account => {
          const summary = accountSummaries[account.id];
          const meta = ACCOUNT_KIND_META[account.kind];
          const Icon = meta.icon;
          return (
            <div key={account.id} className={`bg-[#111C38] border ${meta.cardBorder} rounded-2xl p-5 shadow-xl flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${meta.badgeBg} border ${meta.badgeBorder} flex items-center justify-center ${meta.badgeText}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-100">{account.label}</h2>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {meta.label} · Data saldo: <strong className="text-slate-200">{formatDateItalian(account.initialDate)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Saldo Attuale</div>
                    <div className={`text-2xl font-black font-mono ${meta.accentText}`}>{formatCurrency(summary?.currentBalance ?? account.initialBalance)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 my-4">
                  <div className="bg-[#090D16] p-2.5 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                      <span>+ Entrate</span>
                      <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                    </div>
                    <div className="text-xs font-bold font-mono text-emerald-400 mt-0.5">+{formatCurrency(summary?.totalIncome ?? 0)}</div>
                    <div className="text-[10px] text-slate-500">{summary?.incomeCount ?? 0} movimenti</div>
                  </div>
                  <div className="bg-[#090D16] p-2.5 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                      <span>- Spese</span>
                      <ArrowDownRight className="w-3 h-3 text-rose-400" />
                    </div>
                    <div className="text-xs font-bold font-mono text-rose-400 mt-0.5">-{formatCurrency(summary?.totalExpense ?? 0)}</div>
                    <div className="text-[10px] text-slate-500">{summary?.expenseCount ?? 0} movimenti</div>
                  </div>
                  <div className="bg-[#090D16] p-2.5 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                      <span>+/- Trasf.</span>
                      <ArrowLeftRight className="w-3 h-3 text-amber-400" />
                    </div>
                    <div className="text-xs font-bold font-mono text-amber-300 mt-0.5">{formatCurrency(summary?.netTransfers ?? 0)}</div>
                    <div className="text-[10px] text-slate-500">{summary?.transfersCount ?? 0} movimenti</div>
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Saldo operativo autonomo aggiornato dai movimenti</span>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setEditAccountId(account.id)}
                    className={`flex items-center gap-1 ${meta.accentText} hover:opacity-80 font-semibold cursor-pointer`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modifica</span>
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteAccount(account.id, account.label)}
                      className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Elimina</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add-account tile */}
        <button
          onClick={openAddAccountModal}
          disabled={!canAdd}
          title={!canAdd ? `Massimo ${ACCOUNT_LIMITS.MAX_ACCOUNTS} conti raggiunto` : 'Aggiungi conto'}
          className={`rounded-2xl border-2 border-dashed p-5 flex flex-col items-center justify-center gap-2 min-h-[220px] transition ${
            canAdd
              ? 'border-slate-700 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-300 cursor-pointer'
              : 'border-slate-800 text-slate-600 cursor-not-allowed'
          }`}
        >
          <Plus className="w-8 h-8" />
          <span className="text-sm font-semibold">{canAdd ? 'Aggiungi Conto' : `Massimo ${ACCOUNT_LIMITS.MAX_ACCOUNTS} conti raggiunto`}</span>
          {!canAdd && <span className="text-[11px] text-slate-500">Elimina un conto per aggiungerne un altro</span>}
        </button>
      </div>

      {/* Orphan account references (e.g. legacy 'cash_account') */}
      {orphanAccountGroups.length > 0 && (
        <div className="bg-[#111C38] border border-amber-500/30 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs uppercase tracking-wider mb-3">
            <HelpCircle className="w-4 h-4" />
            <span>Riferimenti a conti non configurati</span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Queste transazioni fanno riferimento a un conto che non è (più) tra quelli configurati. Non sono state riassegnate automaticamente — puoi promuoverle a nuovo conto se {canAdd ? 'vuoi' : 'liberi uno slot'}.
          </p>
          <div className="space-y-2">
            {orphanAccountGroups.map(g => (
              <div key={g.id} className="flex items-center justify-between p-3 rounded-xl bg-[#090D16] border border-slate-800 text-xs">
                <div>
                  <span className="font-semibold text-slate-200">{g.label}</span>
                  <span className="text-slate-500 ml-2 font-mono">({g.id})</span>
                  <span className="text-slate-500 ml-2">{g.count} movimento{g.count === 1 ? '' : 'i'}</span>
                </div>
                <span className="font-mono font-bold text-slate-300">{formatCurrency(g.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Running Balance Progression Chart */}
      <div className="bg-[#111C38] border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100">
              Evoluzione Storica Saldo {chartAccountId ? accounts.find(a => a.id === chartAccountId)?.label : ''}
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
                  <linearGradient id="accountBalanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => formatDateItalian(val)} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `€${val}`} />
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
                            <span className="font-bold font-mono text-sm text-cyan-300">{formatCurrency(data.balance)}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="balance" stroke="#06B6D4" strokeWidth={2.5} fillOpacity={1} fill="url(#accountBalanceGradient)" />
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-100">Movimenti per Conto</h3>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center bg-[#090D16] p-1 rounded-xl border border-slate-800 text-xs flex-wrap">
              <button
                onClick={() => setActiveAccountTab('all')}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  activeAccountTab === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tutti ({transactions.length})
              </button>
              {accounts.map(a => (
                <button
                  key={a.id}
                  onClick={() => setActiveAccountTab(a.id)}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                    activeAccountTab === a.id ? `${ACCOUNT_KIND_META[a.kind].badgeBg} ${ACCOUNT_KIND_META[a.kind].badgeText} font-bold border ${ACCOUNT_KIND_META[a.kind].badgeBorder}` : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {a.label} ({txCountByAccount[a.id] ?? 0})
                </button>
              ))}
            </div>

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

        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#090D16]/80">
          <div className="overflow-x-auto max-h-96 custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-[#090D16] text-[10px] uppercase font-semibold text-slate-400 sticky top-0 z-10">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Descrizione</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Conto</th>
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
                    const account = accounts.find(a => a.id === tx.accountId);
                    const meta = account ? ACCOUNT_KIND_META[account.kind] : null;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-4 font-mono text-slate-300 whitespace-nowrap">{formatDateItalian(tx.date)}</td>
                        <td className="py-2.5 px-4 text-slate-200 font-medium max-w-xs truncate">
                          {tx.description}
                          {tx.notes && <span className="text-[10px] text-slate-400 block truncate">{tx.notes}</span>}
                          {tx.transferAccountsIncomplete && (
                            <span className="text-[10px] text-amber-400 block">⚠ destinazione da completare</span>
                          )}
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
                          {meta ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${meta.badgeBg} ${meta.badgeText} border ${meta.badgeBorder} text-[10px] font-semibold`}>
                              <meta.icon className="w-3 h-3" />
                              <span>{account!.label}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700/30 text-slate-400 border border-slate-700 text-[10px] font-semibold">
                              <HelpCircle className="w-3 h-3" />
                              <span>Non configurato</span>
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

      <AddAccountModal editAccountId={editAccountId} onCloseEdit={() => setEditAccountId(null)} />
      <TransferModal />
    </div>
  );
};
