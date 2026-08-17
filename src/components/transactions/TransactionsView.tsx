import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Edit3, 
  Copy, 
  Download, 
  Upload, 
  CheckSquare, 
  Square, 
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  Database,
  FileSpreadsheet,
  AlertOctagon,
  ShieldCheck,
  Check,
  ArrowDownUp,
  AlertTriangle,
  ChevronDown,
  Tag
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction, TransactionType } from '../../types';
import { 
  formatCurrency, 
  formatDateItalian, 
  getCategoryColor, 
  getAccountBadgeColor,
  getTypeBadgeConfig
} from '../../utils/formatters';

type SortField = 'date' | 'description' | 'category' | 'amount' | 'account' | 'source' | 'type';
type SortDirection = 'asc' | 'desc';

export const TransactionsView: React.FC = () => {
  const { 
    filteredTransactions, 
    transactions,
    openAddModal, 
    openEditModal, 
    deleteTransaction, 
    deleteTransactionsBulk,
    duplicateTransaction,
    undoLastDelete,
    canUndoDelete,
    lastDeletedCount,
    openImportModal,
    openDiagnosticsModal,
    exportTransactionsCSV,
    importFullBackupJSON,
    openTypeMigrationModal,
    canUndoTypeMigration,
    undoTypeMigration,
    updateTransactionType,
    openCategoryMigrationModal,
    canUndoCategoryMigration,
    undoCategoryMigration
  } = useFinance();

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Sorting
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'description') {
        comparison = a.description.localeCompare(b.description);
      } else if (sortField === 'category') {
        comparison = a.category.localeCompare(b.category);
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortField === 'account') {
        comparison = a.account.localeCompare(b.account);
      } else if (sortField === 'type') {
        comparison = (a.type || '').localeCompare(b.type || '');
      } else if (sortField === 'source') {
        const sA = a.source || 'Manuale';
        const sB = b.source || 'Manuale';
        comparison = sA.localeCompare(sB);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredTransactions, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(start, start + itemsPerPage);
  }, [sortedTransactions, currentPage, itemsPerPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === paginatedTransactions.length && paginatedTransactions.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedTransactions.map(t => t.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Confermi l'eliminazione di ${selectedIds.length} movimenti selezionati?`)) {
      const res = deleteTransactionsBulk(selectedIds);
      setSelectedIds([]);
      showFeedback(`Eliminati ${res.deletedCount} movimenti. Puoi annullare con "Annulla eliminazione".`);
    }
  };

  const handleDeleteSingle = (id: string, desc: string) => {
    if (window.confirm(`Eliminare il movimento "${desc}"?`)) {
      deleteTransaction(id);
      setSelectedIds(prev => prev.filter(item => item !== id));
      showFeedback(`Movimento "${desc}" eliminato.`);
    }
  };

  const handleUndo = () => {
    const res = undoLastDelete();
    if (res.success) {
      showFeedback(`Ripristinati con successo ${res.restoredCount} movimenti!`);
    }
  };

  const handleUndoMigration = () => {
    const res = undoTypeMigration();
    if (res.success) {
      showFeedback(res.message);
    }
  };

  const handleTypeChange = (id: string, newType: TransactionType) => {
    updateTransactionType(id, newType);
    setEditingTypeId(null);
    showFeedback(`Tipo aggiornato a "${newType === 'income' ? 'Entrata' : newType === 'expense' ? 'Uscita' : newType === 'to_verify' ? 'Da verificare' : 'Giroconto'}".`);
  };

  return (
    <div className="space-y-4 w-full animate-fadeIn" id="transactions-view-container">
      
      {/* Toast Notification */}
      {actionFeedback && (
        <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-700 text-emerald-200 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          {canUndoDelete && (
            <button
              onClick={handleUndo}
              className="underline font-bold hover:text-white cursor-pointer ml-4"
            >
              Annulla ora
            </button>
          )}
        </div>
      )}

      {/* Undo Banner for Category Migration */}
      {canUndoCategoryMigration && !actionFeedback && (
        <div className="p-3 rounded-xl bg-pink-950/40 border border-pink-500/40 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-pink-200">
            <RotateCcw className="w-4 h-4 text-pink-400 shrink-0" />
            <span>È attiva una sessione di <strong>Mappatura Categorie</strong>. Puoi ripristinare le categorie originali se necessario.</span>
          </div>
          <button
            onClick={() => {
              const res = undoCategoryMigration();
              showFeedback(res.message);
            }}
            className="px-3 py-1 rounded-lg bg-pink-500/20 text-pink-200 hover:bg-pink-500/30 border border-pink-500/40 font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0"
            id="btn-undo-category-banner"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Ripristina Categorie
          </button>
        </div>
      )}

      {/* Undo Banner for Migration */}
      {canUndoTypeMigration && !actionFeedback && !canUndoCategoryMigration && (
        <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-indigo-200">
            <RotateCcw className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>È stata eseguita una <strong>Ricostruzione Tipo</strong>. Puoi ripristinare i tipi precedenti finché non modifichi altri movimenti.</span>
          </div>
          <button
            onClick={handleUndoMigration}
            className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30 border border-indigo-500/40 font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0"
            id="btn-undo-migration-banner"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Annulla Migrazione Tipo
          </button>
        </div>
      )}

      {/* Undo Banner if items in delete stack */}
      {canUndoDelete && !actionFeedback && !canUndoTypeMigration && (
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Ultima eliminazione in memoria ({lastDeletedCount} movimenti).</span>
          </div>
          <button
            onClick={handleUndo}
            className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 font-semibold transition cursor-pointer flex items-center gap-1.5"
            id="btn-undo-delete-banner"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Annulla Ultima Eliminazione ({lastDeletedCount})
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            <span className="text-slate-400">Movimenti visualizzati:</span>
            <strong className="text-emerald-400 font-bold font-mono">{sortedTransactions.length}</strong>
            <span className="text-slate-500 font-mono">/ {transactions.length} totali</span>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in duration-150">
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
                id="btn-delete-selected"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Elimina Selezionati ({selectedIds.length})</span>
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition cursor-pointer"
              >
                Deseleziona
              </button>
            </div>
          )}
        </div>

        {/* Buttons: Mappatura Categorie, Ricostruzione Tipo, Import Excel, Diagnostics, Export, New */}
        <div className="flex items-center gap-2 flex-wrap">
          
          <button
            onClick={openCategoryMigrationModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 text-xs font-semibold border border-pink-500/30 transition cursor-pointer shadow-sm"
            id="btn-open-category-migration"
            title="Verifica integrità categorie, mappatura canonica e palette colori uniforme"
          >
            <Tag className="w-3.5 h-3.5 text-pink-400" />
            <span>Mappatura Categorie</span>
          </button>

          <button
            onClick={openTypeMigrationModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition cursor-pointer shadow-sm"
            id="btn-open-type-migration"
            title="Ricostruisci deterministico Tipo Entrata/Uscita dal segno dell'importo originale"
          >
            <ArrowDownUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ricostruzione Tipo</span>
          </button>

          <button
            onClick={openDiagnosticsModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
            id="btn-open-diagnostics"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Diagnostica Dati</span>
          </button>

          <button
            onClick={openImportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition cursor-pointer"
            id="btn-open-import-excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Importa Excel</span>
          </button>

          <button
            onClick={exportTransactionsCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
            id="btn-export-csv"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Esporta CSV</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer"
            id="btn-new-transaction"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuovo Movimento</span>
          </button>
        </div>

      </div>

      {/* Empty State when zero transactions */}
      {sortedTransactions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4 shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
            <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-100">Nessun movimento presente nell'archivio</h3>
            <p className="text-xs text-slate-400">
              L'archivio è attualmente vuoto o nessun record corrisponde ai filtri attivi.
              Puoi importare il tuo file Excel personale o aggiungere movimenti manualmente.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={openImportModal}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              id="btn-empty-import"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Importa da Excel
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              id="btn-empty-manual"
            >
              <Plus className="w-4 h-4" />
              Inserimento Manuale
            </button>
          </div>
        </div>
      ) : (
        /* Main Table Card */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" id="transactions-table">
              
              {/* Table Header */}
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <button 
                      onClick={handleSelectAll} 
                      className="text-slate-400 hover:text-slate-200 cursor-pointer"
                      title="Seleziona tutti i movimenti visualizzati"
                    >
                      {selectedIds.length > 0 && selectedIds.length === paginatedTransactions.length ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>

                  <th className="p-3 cursor-pointer hover:text-slate-200 transition" onClick={() => handleSort('date')}>
                    <div className="flex items-center gap-1">
                      <span>Data</span>
                      {sortField === 'date' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />)}
                    </div>
                  </th>

                  {/* Explicit Tipo Column */}
                  <th className="p-3 cursor-pointer hover:text-slate-200 transition" onClick={() => handleSort('type')}>
                    <div className="flex items-center gap-1">
                      <span>Tipo</span>
                      {sortField === 'type' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />)}
                    </div>
                  </th>

                  <th className="p-3 cursor-pointer hover:text-slate-200 transition" onClick={() => handleSort('description')}>
                    <div className="flex items-center gap-1">
                      <span>Descrizione</span>
                      {sortField === 'description' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />)}
                    </div>
                  </th>

                  <th className="p-3 cursor-pointer hover:text-slate-200 transition" onClick={() => handleSort('category')}>
                    <div className="flex items-center gap-1">
                      <span>Categoria</span>
                      {sortField === 'category' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />)}
                    </div>
                  </th>

                  <th className="p-3 cursor-pointer hover:text-slate-200 transition" onClick={() => handleSort('account')}>
                    <div className="flex items-center gap-1">
                      <span>Conto / Metodo</span>
                      {sortField === 'account' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />)}
                    </div>
                  </th>

                  <th className="p-3 cursor-pointer hover:text-slate-200 transition" onClick={() => handleSort('source')}>
                    <div className="flex items-center gap-1">
                      <span>Sorgente</span>
                      {sortField === 'source' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />)}
                    </div>
                  </th>

                  <th className="p-3 cursor-pointer hover:text-slate-200 transition text-right" onClick={() => handleSort('amount')}>
                    <div className="flex items-center justify-end gap-1">
                      <span>Importo (€)</span>
                      {sortField === 'amount' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />)}
                    </div>
                  </th>

                  <th className="p-3 text-center">Stato</th>
                  
                  {/* Actions Column */}
                  <th className="p-3 text-right">Azioni</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-800/60">
                {paginatedTransactions.map(tx => {
                  const isSelected = selectedIds.includes(tx.id);
                  const isIncome = tx.type === 'income';
                  const isExpense = tx.type === 'expense';
                  const isTransfer = tx.type === 'transfer';
                  const isToVerify = tx.type === 'to_verify';
                  
                  const typeBadge = getTypeBadgeConfig(tx.type);
                  const catColor = getCategoryColor(tx.category);
                  const accountBadge = getAccountBadgeColor(tx.account);
                  const isDemo = tx.source === 'Demo' || tx.id.startsWith('tx-2025') || tx.id.startsWith('tx-2026');
                  const isEditingThisType = editingTypeId === tx.id;

                  return (
                    <tr 
                      key={tx.id}
                      className={`hover:bg-slate-800/40 transition group ${isSelected ? 'bg-emerald-950/20' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => handleToggleSelect(tx.id)}
                          className="text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="p-3 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                        {formatDateItalian(tx.date)}
                      </td>

                      {/* Tipo Column with Badge and Quick Manual Correction */}
                      <td className="p-3 whitespace-nowrap">
                        {isEditingThisType ? (
                          <div className="flex items-center gap-1">
                            <select
                              value={tx.type}
                              onChange={e => handleTypeChange(tx.id, e.target.value as TransactionType)}
                              onBlur={() => setEditingTypeId(null)}
                              autoFocus
                              className="bg-slate-950 border border-cyan-500 rounded px-2 py-0.5 text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
                            >
                              <option value="income">🟢 Entrata (+)</option>
                              <option value="expense">🔴 Uscita (-)</option>
                              <option value="to_verify">⚠️ Da verificare</option>
                              <option value="transfer">🔵 Giroconto</option>
                            </select>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingTypeId(tx.id)}
                            title="Clicca per correggere manualmente il Tipo"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition cursor-pointer hover:scale-105 ${typeBadge.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${typeBadge.dot}`} />
                            <span>{typeBadge.label}</span>
                            <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                          </button>
                        )}
                      </td>

                      {/* Description + Tags */}
                      <td className="p-3 max-w-[260px]">
                        <div className="font-semibold text-slate-100 truncate">{tx.description}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {tx.subcategory && (
                            <span className="text-[10px] text-slate-400">{tx.subcategory}</span>
                          )}
                          {tx.notes && (
                            <span className="text-[10px] text-slate-500 truncate" title={tx.notes}>
                              • {tx.notes}
                            </span>
                          )}
                          {tx.typeModifiedManually && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" title={tx.typeMigrationReason || 'Modificato manualmente'}>
                              Manuale
                            </span>
                          )}
                        </div>
                        {tx.tags && tx.tags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {tx.tags.map(t => (
                              <span key={t} className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-950 text-slate-200 border border-slate-800">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: catColor }} />
                          <span>{tx.category}</span>
                        </span>
                      </td>

                      {/* Account */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${accountBadge.bg} ${accountBadge.text} ${accountBadge.border}`}>
                          {tx.account}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          isDemo 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : tx.source === 'Excel personale'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        }`}>
                          {isDemo ? 'Demo' : (tx.source || 'Manuale')}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="p-3 text-right whitespace-nowrap font-mono">
                        <span className={`font-bold text-sm ${
                          isIncome ? 'text-emerald-400' : isExpense ? 'text-rose-400' : isTransfer ? 'text-sky-400' : 'text-amber-400'
                        }`}>
                          {isIncome ? `+${formatCurrency(tx.amount)}` : isExpense ? `-${formatCurrency(tx.amount)}` : isToVerify ? `? ${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {tx.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Contabilizzato</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>In attesa</span>
                          </span>
                        )}
                      </td>

                      {/* Actions Column (Edit, Duplicate, Delete) */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(tx)}
                            title="Modifica movimento"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => duplicateTransaction(tx.id)}
                            title="Duplica movimento"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteSingle(tx.id, tx.description)}
                            title="Elimina movimento"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination & Rows selector */}
          <div className="p-3 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>Righe per pagina:</span>
              <select
                value={itemsPerPage}
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span>
                Pagina <strong>{currentPage}</strong> di <strong>{totalPages}</strong> ({sortedTransactions.length} risultati)
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-semibold transition cursor-pointer border border-slate-800"
                >
                  Precedente
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-semibold transition cursor-pointer border border-slate-800"
                >
                  Successiva
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

