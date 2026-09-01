import React, { useState, useMemo } from 'react';
import { 
  X, 
  Database, 
  AlertTriangle, 
  Trash2, 
  Search, 
  FileSpreadsheet, 
  UserCheck, 
  History, 
  ShieldCheck, 
  RotateCcw,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  ArrowUpDown,
  Tag
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';

export const DataDiagnosticsModal: React.FC = () => {
  const { 
    isDiagnosticsModalOpen, 
    closeDiagnosticsModal, 
    transactions, 
    diagnosticReport, 
    auditLog, 
    deleteTransaction,
    openResetPersonalModal,
    resetPersonalData,
    lastImportBatch,
    undoLastImport,
    categoryDiagnostics,
    openCategoryMigrationModal
  } = useFinance();

  const [searchFilter, setSearchFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'Excel personale' | 'Manuale' | 'Demo'>('all');
  const [activeTab, setActiveTab] = useState<'records' | 'categories' | 'sessions' | 'audit'>('records');
  const [notification, setNotification] = useState<string | null>(null);

  const filteredRecords = useMemo(() => {
    return transactions.filter(t => {
      if (sourceFilter !== 'all') {
        const s = t.source || 'Manuale';
        if (sourceFilter === 'Excel personale' && !s.includes('Excel') && !t.id.startsWith('tx-xls') && !t.id.startsWith('tx-imp')) return false;
        if (sourceFilter === 'Demo' && s !== 'Demo' && !t.id.startsWith('tx-2025') && !t.id.startsWith('tx-2026')) return false;
        if (sourceFilter === 'Manuale' && (s !== 'Manuale' || t.id.startsWith('tx-xls') || t.id.startsWith('tx-2025'))) return false;
      }
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const m1 = t.id.toLowerCase().includes(q);
        const m2 = t.description.toLowerCase().includes(q);
        const m3 = t.date.includes(q);
        const m4 = t.account.toLowerCase().includes(q);
        const m5 = t.amount.toString().includes(q);
        if (!m1 && !m2 && !m3 && !m4 && !m5) return false;
      }
      return true;
    });
  }, [transactions, sourceFilter, searchFilter]);

  if (!isDiagnosticsModalOpen) return null;

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleCleanDemoOnly = () => {
    const res = resetPersonalData('remove_demo_only');
    showToast(res.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto" id="data-diagnostics-modal">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-100">Diagnostica Integrità Dati</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-800 text-emerald-400 border border-slate-700">
                  {transactions.length} record totali
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Verifica sorgenti, ID univoci, log delle importazioni e isolamento dati personali
              </p>
            </div>
          </div>
          
          <button 
            onClick={closeDiagnosticsModal}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors"
            id="btn-close-diagnostics"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Alert */}
        {notification && (
          <div className="bg-emerald-950/90 border-b border-emerald-800 text-emerald-300 px-6 py-2.5 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Summary Metrics Cards */}
        <div className="p-6 pb-2 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/60">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Excel Personale</span>
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-100 font-mono">
                {diagnosticReport.bySource.excelCount}
              </div>
              <div className="text-[11px] text-emerald-400 mt-0.5 font-mono">
                € {diagnosticReport.bySource.excelAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Inserimenti Manuali</span>
              <UserCheck className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-100 font-mono">
                {diagnosticReport.bySource.manualCount}
              </div>
              <div className="text-[11px] text-sky-400 mt-0.5 font-mono">
                € {diagnosticReport.bySource.manualAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className={`border rounded-xl p-3.5 flex flex-col justify-between transition-colors ${
            diagnosticReport.bySource.demoCount > 0 
              ? 'bg-rose-950/30 border-rose-800/60' 
              : 'bg-slate-800/60 border-slate-700/60'
          }`}>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Record Demo / Mock</span>
              <AlertTriangle className={`w-4 h-4 ${diagnosticReport.bySource.demoCount > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-bold font-mono ${diagnosticReport.bySource.demoCount > 0 ? 'text-rose-300' : 'text-slate-300'}`}>
                {diagnosticReport.bySource.demoCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                {diagnosticReport.bySource.demoCount > 0 ? 'Attenzione: dati demo rilevati' : 'Nessun record demo ✓'}
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Esclusi da KPI Attivi</span>
              <Filter className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-100 font-mono">
                {diagnosticReport.excludedFromKpisCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Fuori dai filtri data/conto
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('records')}
              className={`py-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'records'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="tab-diagnostic-records"
            >
              <Layers className="w-4 h-4" />
              Tutti i Record ({filteredRecords.length})
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'categories'
                  ? 'border-pink-500 text-pink-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="tab-diagnostic-categories"
            >
              <Tag className="w-4 h-4" />
              Verifica Categorie ({categoryDiagnostics.totalCategoriesCount})
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'sessions'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="tab-diagnostic-sessions"
            >
              <Clock className="w-4 h-4" />
              Sessioni di Importazione ({diagnosticReport.importSessions.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`py-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="tab-diagnostic-audit"
            >
              <History className="w-4 h-4" />
              Audit Log ({auditLog.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {diagnosticReport.bySource.demoCount > 0 && (
              <button
                onClick={handleCleanDemoOnly}
                className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-colors flex items-center gap-1"
                id="btn-clean-demo-records"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Elimina solo record Demo ({diagnosticReport.bySource.demoCount})
              </button>
            )}
            <button
              onClick={openResetPersonalModal}
              className="text-xs px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium transition-colors flex items-center gap-1.5 shadow-sm"
              id="btn-open-reset-personal"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Ripristina Dati Personali
            </button>
          </div>
        </div>

        {/* Tab 1: Records Table */}
        {activeTab === 'records' && (
          <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cerca per ID, descrizione, importo o conto..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
                  id="input-diagnostic-search"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-xs text-slate-400 mr-1">Sorgente:</span>
                {(['all', 'Excel personale', 'Manuale', 'Demo'] as const).map(src => (
                  <button
                    key={src}
                    onClick={() => setSourceFilter(src)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                      sourceFilter === src 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium' 
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    {src === 'all' ? 'Tutti' : src}
                  </button>
                ))}
              </div>
            </div>

            {/* Records List Table */}
            {filteredRecords.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                Nessun record corrisponde ai criteri di ricerca o archivio attualmente vuoto.
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 sticky top-0 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">ID Univoco</th>
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Descrizione</th>
                        <th className="py-2.5 px-3">Conto</th>
                        <th className="py-2.5 px-3 text-right">Importo (€)</th>
                        <th className="py-2.5 px-3">Sorgente</th>
                        <th className="py-2.5 px-3 text-center">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {filteredRecords.map(record => {
                        const isDemo = record.source === 'Demo' || record.id.startsWith('tx-2025') || record.id.startsWith('tx-2026');
                        return (
                          <tr key={record.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2 px-3 text-slate-400 truncate max-w-[140px]" title={record.id}>
                              {record.id}
                            </td>
                            <td className="py-2 px-3 text-slate-200 whitespace-nowrap">
                              {record.date}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-medium ${
                                record.type === 'income' 
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                  : record.type === 'transfer'
                                  ? 'bg-blue-950/60 text-blue-400 border border-blue-800/60'
                                  : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                              }`}>
                                {record.type === 'income' ? 'Entrata' : record.type === 'transfer' ? 'Giroconto' : 'Uscita'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-200 font-sans max-w-[180px] truncate" title={record.description}>
                              {record.description}
                            </td>
                            <td className="py-2 px-3 text-slate-300 font-sans whitespace-nowrap">
                              {record.account}
                            </td>
                            <td className={`py-2 px-3 text-right font-semibold whitespace-nowrap ${
                              record.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                            }`}>
                              {record.type === 'income' ? '+' : '-'}€ {record.amount.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-medium ${
                                isDemo 
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : record.source === 'Excel personale'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              }`}>
                                {isDemo ? 'Demo' : (record.source || 'Manuale')}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                onClick={() => deleteTransaction(record.id)}
                                className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                                title="Elimina questo singolo record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Categories Diagnostics */}
        {activeTab === 'categories' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Verifica Integrità & Mappatura Categorie</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Audit completo dei {categoryDiagnostics.totalRecords} movimenti registrati e {categoryDiagnostics.totalCategoriesCount} categorie rilevate.
                </p>
              </div>
              <button
                onClick={() => {
                  closeDiagnosticsModal();
                  openCategoryMigrationModal();
                }}
                className="text-xs px-3.5 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                id="btn-open-category-wizard-from-diag"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Apri Wizard Mappatura Categorie</span>
              </button>
            </div>

            {/* Category breakdown table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800/60 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="p-3">Colore</th>
                    <th className="p-3">Etichetta Categoria</th>
                    <th className="p-3">Chiave Canonica (ID)</th>
                    <th className="p-3 text-center">Tipo Ammesso</th>
                    <th className="p-3 text-right">Movimenti</th>
                    <th className="p-3 text-right">Totale Spese (€)</th>
                    <th className="p-3 text-right">Totale Entrate (€)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {categoryDiagnostics.categories.map(cat => (
                    <tr key={cat.canonicalId} className="hover:bg-slate-800/30 transition">
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-3.5 h-3.5 rounded-full inline-block shadow-sm border border-white/20" 
                            style={{ backgroundColor: cat.color }} 
                          />
                          <span className="text-[10px] text-slate-400 font-mono">{cat.color}</span>
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-slate-200 whitespace-nowrap">
                        {cat.canonicalLabel}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <code className="px-2 py-0.5 rounded bg-slate-900 text-pink-300 border border-slate-800 font-mono text-[11px]">
                          {cat.canonicalId}
                        </code>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          cat.allowedType === 'income' 
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : cat.allowedType === 'transfer'
                            ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}>
                          {cat.allowedType === 'income' ? 'Entrata' : cat.allowedType === 'transfer' ? 'Giroconto' : 'Uscita'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-200">
                        {cat.count}
                      </td>
                      <td className="p-3 text-right font-mono text-rose-300">
                        {cat.totalExpense > 0 ? formatCurrency(cat.totalExpense) : '—'}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-300">
                        {cat.totalIncome > 0 ? formatCurrency(cat.totalIncome) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Sessions */}
        {activeTab === 'sessions' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Storico Importazioni Excel</h3>
              {lastImportBatch && (
                <button
                  onClick={() => {
                    const res = undoLastImport();
                    if (res.success) showToast(`Annullata ultima importazione (${res.removedCount} movimenti rimossi)`);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Annulla Ultima Importazione ({lastImportBatch.count} record)
                </button>
              )}
            </div>

            {diagnosticReport.importSessions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                Nessuna sessione di importazione registrata.
              </div>
            ) : (
              <div className="space-y-2">
                {diagnosticReport.importSessions.map((session, idx) => (
                  <div key={session.batchId || idx} className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200">{session.filename}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Batch ID: {session.batchId} • {new Date(session.importedAt).toLocaleString('it-IT')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono font-medium">
                        {session.count} record importati
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Audit Log */}
        {activeTab === 'audit' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-2">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Registro Attività e Modifiche Database</h3>
            {auditLog.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                Nessun evento registrato.
              </div>
            ) : (
              <div className="space-y-1.5 font-mono text-[11px]">
                {auditLog.map(log => (
                  <div key={log.id} className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-start gap-3">
                    <span className="text-slate-500 text-[10px] whitespace-nowrap pt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString('it-IT')}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-sans font-semibold shrink-0 ${
                      log.action === 'create' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      log.action === 'delete' || log.action === 'bulk_delete' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                      log.action === 'import' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                      log.action === 'reset_personal' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-slate-300 font-sans text-xs">
                      {log.details}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Modalità locale sicura: nessuna trasmissione verso server esterni.</span>
          </div>
          <button
            onClick={closeDiagnosticsModal}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Chiudi Diagnostica
          </button>
        </div>

      </div>
    </div>
  );
};
