import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Check, 
  Trash2, 
  Copy, 
  Calendar, 
  Euro, 
  CreditCard, 
  Tag, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { TransactionType, AccountType, Category, Transaction, CategoryDefinition } from '../../types';
import { 
  buildFullCategoryCatalog, 
  findCategoryInCatalog, 
  normalizeCategoryKey, 
  getCategoryColor,
  BASE_CATEGORIES 
} from '../../utils/categoryManager';

const ACCOUNTS: AccountType[] = [
  'Conto Principale',
  'Carta di Credito',
  'Conto Risparmio',
  'Portafoglio Investimenti',
  'Contanti',
];

export const TransactionModal: React.FC = () => {
  const { 
    isModalOpen, 
    modalMode, 
    editingTransaction, 
    closeModal, 
    addTransaction, 
    updateTransaction, 
    deleteTransaction,
    duplicateTransaction,
    transactions
  } = useFinance();

  const [type, setType] = useState<TransactionType>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  
  // Category canonical state
  const [categoryId, setCategoryId] = useState<string>('casa_e_utenze');
  const [categoryLabel, setCategoryLabel] = useState<string>('Casa & Utenze');
  
  const [subcategory, setSubcategory] = useState('');
  const [account, setAccount] = useState<AccountType>('Carta di Credito');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'completed' | 'pending'>('completed');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');

  // Build the complete category catalog combining system categories and any custom transaction categories
  const fullCatalog = useMemo(() => {
    return buildFullCategoryCatalog(transactions);
  }, [transactions]);

  useEffect(() => {
    if (editingTransaction && modalMode === 'edit') {
      setType(editingTransaction.type);
      setDescription(editingTransaction.description);
      setAmount(editingTransaction.amount.toString());

      // Canonical Category Resolution: prioritize raw data and never fallback to 'Casa & Utenze'
      const rawCat = editingTransaction.rawCategory || editingTransaction.categoryLabel || editingTransaction.category || '';
      const matched = findCategoryInCatalog(rawCat, fullCatalog);

      if (editingTransaction.categoryId) {
        setCategoryId(editingTransaction.categoryId);
        setCategoryLabel(editingTransaction.categoryLabel || editingTransaction.category || (matched ? matched.label : rawCat));
      } else if (matched) {
        setCategoryId(matched.id);
        setCategoryLabel(matched.label);
      } else if (rawCat.trim()) {
        const normKey = normalizeCategoryKey(rawCat);
        setCategoryId(normKey);
        setCategoryLabel(rawCat.trim());
      } else {
        setCategoryId('da_verificare');
        setCategoryLabel('Da verificare');
      }

      setSubcategory(editingTransaction.subcategory || '');
      setAccount(editingTransaction.account);
      setDate(editingTransaction.date);
      setStatus(editingTransaction.status);
      setNotes(editingTransaction.notes || '');
      setTags(editingTransaction.tags ? editingTransaction.tags.join(', ') : '');
      setError('');
    } else {
      setType('expense');
      setDescription('');
      setAmount('');
      setCategoryId('casa_e_utenze');
      setCategoryLabel('Casa & Utenze');
      setSubcategory('');
      setAccount('Conto Principale');
      setDate(new Date().toISOString().split('T')[0]);
      setStatus('completed');
      setNotes('');
      setTags('');
      setError('');
    }
  }, [editingTransaction, modalMode, isModalOpen, fullCatalog]);

  // Adjust category when user explicitly changes type tab
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'income') {
      const match = fullCatalog.find(c => c.id === 'stipendio') || fullCatalog.find(c => c.allowedType === 'income');
      setCategoryId(match?.id || 'stipendio');
      setCategoryLabel(match?.label || 'Stipendio');
      setAccount('Conto Principale');
    } else if (newType === 'expense') {
      const match = fullCatalog.find(c => c.id === 'casa_e_utenze') || fullCatalog.find(c => c.allowedType === 'expense');
      setCategoryId(match?.id || 'casa_e_utenze');
      setCategoryLabel(match?.label || 'Casa & Utenze');
      setAccount('Carta di Credito');
    } else {
      setCategoryId('giroconto_trasferimento');
      setCategoryLabel('Giroconto / Trasferimento');
      setAccount('Conto Risparmio');
    }
  };

  // Filter available categories for dropdown and ensure current category is always included
  const availableCategories = useMemo(() => {
    const list = fullCatalog.filter(cat => {
      if (type === 'income') return cat.allowedType === 'income' || cat.allowedType === 'both';
      if (type === 'expense') return cat.allowedType === 'expense' || cat.allowedType === 'both';
      if (type === 'transfer') return cat.allowedType === 'transfer' || cat.id === 'giroconto_trasferimento';
      return true;
    });

    // Ensure the currently selected category is included so select value never defaults away
    if (!list.some(c => c.id === categoryId)) {
      list.unshift({
        id: categoryId,
        label: categoryLabel,
        allowedType: type === 'income' ? 'income' : 'expense',
        color: getCategoryColor(categoryId, fullCatalog),
        isSystem: false
      });
    }

    return list;
  }, [fullCatalog, type, categoryId, categoryLabel]);

  const handleCategorySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const catDef = fullCatalog.find(c => c.id === selectedId);
    setCategoryId(selectedId);
    setCategoryLabel(catDef ? catDef.label : selectedId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (!description.trim()) {
      setError('Inserisci una descrizione valida.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Inserisci un importo valido superiore a 0.');
      return;
    }
    if (!date) {
      setError('Seleziona una data valida.');
      return;
    }

    const tagArray = tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const txPayload = {
      type,
      description: description.trim(),
      amount: parsedAmount,
      categoryId,
      categoryLabel,
      category: categoryLabel, // Maintains full backward compatibility
      rawCategory: editingTransaction?.rawCategory || categoryLabel,
      subcategory: subcategory.trim() || undefined,
      account,
      date,
      status,
      notes: notes.trim() || undefined,
      tags: tagArray.length > 0 ? tagArray : undefined,
      categoryModifiedManually: modalMode === 'edit' ? (editingTransaction?.categoryId !== categoryId) : false,
    };

    if (modalMode === 'edit' && editingTransaction) {
      updateTransaction(editingTransaction.id, txPayload);
    } else {
      addTransaction(txPayload);
    }

    closeModal();
  };

  if (!isModalOpen) return null;

  const activeColor = getCategoryColor(categoryId, fullCatalog);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        id="transaction-modal-container"
        className="w-full max-w-lg bg-[#0F172A] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#131F37]">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
              type === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              type === 'transfer' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
              'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              <Euro className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {modalMode === 'edit' ? 'Modifica Movimento' : 'Nuovo Movimento Finanziario'}
              </h3>
              <p className="text-[11px] text-slate-400">Compila i dettagli della transazione</p>
            </div>
          </div>

          <button
            onClick={closeModal}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector Tabs */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Tipo Transazione</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'expense'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm shadow-rose-500/20'
                    : 'bg-[#16233F] text-slate-400 hover:text-slate-200 border border-slate-700/60'
                }`}
              >
                <span>Uscita (-)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                    : 'bg-[#16233F] text-slate-400 hover:text-slate-200 border border-slate-700/60'
                }`}
              >
                <span>Entrata (+)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('transfer')}
                className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  type === 'transfer'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                    : 'bg-[#16233F] text-slate-400 hover:text-slate-200 border border-slate-700/60'
                }`}
              >
                <span>Giroconto</span>
              </button>
            </div>
          </div>

          {/* Amount & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Importo EUR (€) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[#16233F] border border-slate-700 focus:border-cyan-500 rounded-lg text-slate-100 text-sm font-bold focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Data <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#16233F] border border-slate-700 focus:border-cyan-500 rounded-lg text-slate-100 text-xs font-medium focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Descrizione <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="es. Spesa Esselunga, Canone Affitto, Stipendio..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#16233F] border border-slate-700 focus:border-cyan-500 rounded-lg text-slate-100 text-xs focus:outline-none transition"
            />
          </div>

          {/* Category & Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 font-semibold">Categoria</label>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span 
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-xs" 
                    style={{ backgroundColor: activeColor }} 
                  />
                  <span className="font-mono text-slate-300 truncate max-w-[120px]">{categoryId}</span>
                </div>
              </div>
              <div className="relative">
                <select
                  id="transaction-category-select"
                  value={categoryId}
                  onChange={handleCategorySelectChange}
                  className="w-full pl-3 pr-8 py-2 bg-[#16233F] border border-slate-700 focus:border-cyan-500 rounded-lg text-slate-100 text-xs font-semibold focus:outline-none transition cursor-pointer"
                >
                  {availableCategories.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#0F172A]">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Conto / Metodo</label>
              <select
                id="transaction-account-select"
                value={account}
                onChange={e => setAccount(e.target.value as AccountType)}
                className="w-full px-3 py-2 bg-[#16233F] border border-slate-700 focus:border-cyan-500 rounded-lg text-slate-100 text-xs font-semibold focus:outline-none transition cursor-pointer"
              >
                {ACCOUNTS.map(a => <option key={a} value={a} className="bg-[#0F172A]">{a}</option>)}
              </select>
            </div>
          </div>

          {/* Subcategory & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Sottocategoria (Opzionale)</label>
              <input
                type="text"
                placeholder="es. Supermercato, Ristorante, Luce..."
                value={subcategory}
                onChange={e => setSubcategory(e.target.value)}
                className="w-full px-3 py-2 bg-[#16233F] border border-slate-700 focus:border-cyan-500 rounded-lg text-slate-100 text-xs focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Stato Transazione</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as 'completed' | 'pending')}
                className="w-full px-3 py-2 bg-[#16233F] border border-slate-700 focus:border-cyan-500 rounded-lg text-slate-100 text-xs font-semibold focus:outline-none transition cursor-pointer"
              >
                <option value="completed" className="bg-[#0F172A]">Completato / Contabilizzato</option>
                <option value="pending" className="bg-[#0F172A]">In attesa / Da confermare</option>
              </select>
            </div>
          </div>

          {/* Tags & Notes */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Tag (separati da virgola)</label>
            <input
              type="text"
              placeholder="es. vacanze, lavoro, fissa, ricorrente"
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="w-full px-3 py-2 bg-[#16233F] border border-slate-700 focus:border-cyan-500 rounded-lg text-slate-100 text-xs focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Note Aggiuntive</label>
            <textarea
              rows={2}
              placeholder="Aggiungi dettagli o memo..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-[#16233F] border border-slate-700 focus:border-cyan-500 rounded-lg text-slate-100 text-xs focus:outline-none transition resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <div>
              {modalMode === 'edit' && editingTransaction && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Eliminare questo movimento?')) {
                        deleteTransaction(editingTransaction.id);
                        closeModal();
                      }
                    }}
                    className="p-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition cursor-pointer"
                    title="Elimina"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      duplicateTransaction(editingTransaction.id);
                      closeModal();
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                    title="Duplica movimento"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
              >
                Annulla
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{modalMode === 'edit' ? 'Salva Modifiche' : 'Registra Movimento'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
