import React, { useState, useMemo } from 'react';
import { 
  X, 
  Tag, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  FileSpreadsheet,
  Check,
  Search,
  Eye,
  Info,
  HelpCircle
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency } from '../../utils/formatters';
import { 
  buildFullCategoryCatalog, 
  runCategoryDiagnostics, 
  migrateTransactionsCategories,
  getCategoryColor,
  BASE_CATEGORIES
} from '../../utils/categoryManager';

export const CategoryMigrationModal: React.FC = () => {
  const { 
    isCategoryMigrationModalOpen, 
    closeCategoryMigrationModal,
    transactions,
    applyCategoryMigration,
    undoCategoryMigration,
    canUndoCategoryMigration
  } = useFinance();

  const [notification, setNotification] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'preview' | 'issues'>('catalog');

  // Diagnostics and Migration Preview
  const diagnostics = useMemo(() => {
    return runCategoryDiagnostics(transactions);
  }, [transactions]);

  const migrationPreview = useMemo(() => {
    return migrateTransactionsCategories(transactions).report;
  }, [transactions]);

  if (!isCategoryMigrationModalOpen) return null;

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleApply = () => {
    const res = applyCategoryMigration();
    showToast(res.message);
    if (res.success) {
      setActiveTab('preview');
    }
  };

  const handleUndo = () => {
    const res = undoCategoryMigration();
    showToast(res.message);
  };

  const filteredCategories = diagnostics.categories.filter(cat => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      cat.canonicalLabel.toLowerCase().includes(q) ||
      cat.canonicalId.toLowerCase().includes(q) ||
      cat.rawCategory.toLowerCase().includes(q)
    );
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto"
      id="category-migration-modal"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-100">
                  Mappatura Canonica Categorie & Verifica Integrità
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-800 text-pink-400 border border-slate-700">
                  {diagnostics.totalCategoriesCount} categorie attive
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Associa ID stabili univoci, preserva le etichette originali e assegna colori deterministici uniformi
              </p>
            </div>
          </div>
          
          <button 
            onClick={closeCategoryMigrationModal}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            id="btn-close-category-modal"
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

        {/* KPI Summary Cards */}
        <div className="p-6 pb-2 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/60">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Record Totali</span>
              <Layers className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-100 font-mono">
                {diagnostics.totalRecords}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {migrationPreview.migratedCount} allineati
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Categorie Riconosciute</span>
              <Tag className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {diagnostics.totalCategoriesCount}
              </div>
              <div className="text-[11px] text-emerald-400/80 mt-0.5">
                ID canonici deterministici
              </div>
            </div>
          </div>

          <div className={`border rounded-xl p-3.5 flex flex-col justify-between transition-colors ${
            diagnostics.unrecognizedRecordsCount > 0 || diagnostics.emptyCategoryRecordsCount > 0
              ? 'bg-amber-950/30 border-amber-800/60' 
              : 'bg-slate-800/60 border-slate-700/60'
          }`}>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Da Verificare / Vuote</span>
              <AlertTriangle className={`w-4 h-4 ${diagnostics.unrecognizedRecordsCount > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-bold font-mono ${diagnostics.unrecognizedRecordsCount > 0 ? 'text-amber-300' : 'text-slate-300'}`}>
                {diagnostics.unrecognizedRecordsCount + diagnostics.emptyCategoryRecordsCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Nessun fallback su Casa & Utenze ✓
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Backup Automatico</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <div className="text-xs font-semibold text-emerald-300">
                Attivo & Protetto
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Ripristino 1-click garantito
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`py-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'catalog'
                  ? 'border-pink-500 text-pink-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="tab-cat-catalog"
            >
              <Tag className="w-4 h-4" />
              Catalogo Categorie & Palette Colori ({diagnostics.categories.length})
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`py-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'preview'
                  ? 'border-pink-500 text-pink-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="tab-cat-preview"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Report Dettagliato Movimenti ({migrationPreview.categoryBreakdown.length})
            </button>
            {diagnostics.recordsWithIssues.length > 0 && (
              <button
                onClick={() => setActiveTab('issues')}
                className={`py-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'issues'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-amber-400 hover:text-amber-300'
                }`}
                id="tab-cat-issues"
              >
                <AlertTriangle className="w-4 h-4" />
                Segnalazioni ({diagnostics.recordsWithIssues.length})
              </button>
            )}
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca categoria o ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* TAB 1: Catalog & Colors */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">Garanzie di Mappatura e Isolamento Colori:</p>
                  <ul className="list-disc list-inside space-y-1 mt-1 text-slate-400">
                    <li>Ogni categoria ha una chiave canonica stabile (<code className="text-pink-300">categoryId</code>) non dipendente dalla posizione o dall'indice di riga.</li>
                    <li>Il selettore nel modale di modifica leggerà sempre la categoria esatta del movimento senza forzare mai &ldquo;Casa & Utenze&rdquo;.</li>
                    <li>Ogni categoria possiede un colore deterministico univoco replicato in tutta l'applicazione (tabella, grafici e filtri).</li>
                  </ul>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/60 text-slate-400 border-b border-slate-800 font-semibold">
                      <th className="p-3">Colore</th>
                      <th className="p-3">Nome Categoria (Label)</th>
                      <th className="p-3">ID Canonico (categoryId)</th>
                      <th className="p-3 text-center">Tipo Ammesso</th>
                      <th className="p-3 text-right">Movimenti</th>
                      <th className="p-3 text-right">Totale Spese (€)</th>
                      <th className="p-3 text-right">Totale Entrate (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredCategories.map(cat => (
                      <tr key={cat.canonicalId} className="hover:bg-slate-800/30 transition">
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-4 h-4 rounded-full inline-block shadow-sm border border-white/20 shrink-0" 
                              style={{ backgroundColor: cat.color }} 
                            />
                            <code className="text-[10px] text-slate-400 font-mono">{cat.color}</code>
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-slate-100 whitespace-nowrap">
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

          {/* TAB 2: Migration Preview & Breakdown */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                <div className="p-3.5 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">Distribuzione Categorie nei Movimenti Attuali</span>
                  <span className="text-slate-400 font-mono">{migrationPreview.categoryBreakdown.length} categorie distinte</span>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/60 text-slate-400 border-b border-slate-800 font-semibold">
                      <th className="p-3">Badge & Colore</th>
                      <th className="p-3">Categoria Assegnata</th>
                      <th className="p-3">Chiave Canonica</th>
                      <th className="p-3 text-right">Conteggio</th>
                      <th className="p-3 text-right">Somma Totale (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {migrationPreview.categoryBreakdown.map(item => (
                      <tr key={item.categoryId} className="hover:bg-slate-800/30 transition">
                        <td className="p-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-950 text-slate-200 border border-slate-800">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span>{item.normalizedLabel}</span>
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-200">
                          {item.normalizedLabel}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-pink-300">
                          {item.categoryId}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-200">
                          {item.count}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-slate-100">
                          {formatCurrency(item.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Issues */}
          {activeTab === 'issues' && (
            <div className="space-y-4">
              <div className="border border-amber-800/60 rounded-xl overflow-hidden bg-slate-950/40">
                <div className="p-3.5 bg-amber-950/30 border-b border-amber-800/60 text-xs text-amber-300 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Movimenti che richiedono attenzione o con categoria non valorizzata:</span>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/60 text-slate-400 border-b border-slate-800 font-semibold">
                      <th className="p-3">Data</th>
                      <th className="p-3">Descrizione</th>
                      <th className="p-3 text-right">Importo (€)</th>
                      <th className="p-3">Valore Originale</th>
                      <th className="p-3">Stato Rilevato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {diagnostics.recordsWithIssues.map(rec => (
                      <tr key={rec.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3 font-mono text-slate-300">{rec.date}</td>
                        <td className="p-3 font-semibold text-slate-100">{rec.description}</td>
                        <td className="p-3 text-right font-mono text-slate-200">{formatCurrency(rec.amount)}</td>
                        <td className="p-3 font-mono text-slate-400">{rec.rawCategory}</td>
                        <td className="p-3 text-amber-300 font-medium">{rec.issue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {canUndoCategoryMigration && (
              <button
                onClick={handleUndo}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                id="btn-undo-category-migration"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ripristina Snapshot Precedente</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={closeCategoryMigrationModal}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Chiudi
            </button>

            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-pink-600/20 transition cursor-pointer flex items-center gap-1.5"
              id="btn-apply-category-migration"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Applica e Salva Mappatura Canonica</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
