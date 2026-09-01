import React, { useState, useEffect } from 'react';
import { X, Landmark, Euro, Check, AlertCircle } from 'lucide-react';
import { WealthItem, WealthType } from '../../types';

interface WealthItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<WealthItem, 'id' | 'updatedAt'>) => void;
  editingItem?: WealthItem | null;
}

const CATEGORY_SUGGESTIONS: Record<WealthType, string[]> = {
  liquidity: [
    'Conto Corrente Operativo',
    'Conto Deposito Libero',
    'Conto Deposito Vincolato',
    'Contante / Riserva Fisica',
    'Carta Conto Ricaricabile',
  ],
  investment: [
    'ETF Azionario Globale',
    'ETF Mercati Emergenti',
    'ETF Settoriale / Tematico',
    'Obbligazioni Governative (BTP/BOT)',
    'Obbligazioni Corporate',
    'Azioni Singole',
    'Previdenza Complementare (Fondo Pensione)',
    'Criptovalute & Asset Digitali',
    'Fondi Comuni di Investimento',
  ],
  asset: [
    'Immobili Residenziali (Prima Casa)',
    'Immobili a Reddito (Locazione)',
    'Veicoli & Autovetture',
    'Metalli Preziosi & Oro Fisico',
    'Beni di Valore / Collezionismo',
  ],
  liability: [
    'Mutuo Ipotecario Casa',
    'Prestito Personale',
    'Finanziamento Auto',
    'Carta di Credito a Saldo / Revolving',
    'Debiti Privati / Familiari',
  ],
};

export const WealthItemModal: React.FC<WealthItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<WealthType>('liquidity');
  const [category, setCategory] = useState('');
  const [value, setValue] = useState('');
  const [institution, setInstitution] = useState('');
  const [targetAllocationPercent, setTargetAllocationPercent] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setType(editingItem.type);
      setCategory(editingItem.category);
      setValue(editingItem.value.toString());
      setInstitution(editingItem.institution || '');
      setTargetAllocationPercent(editingItem.targetAllocationPercent?.toString() || '');
      setInterestRate(editingItem.interestRate?.toString() || '');
      setNotes(editingItem.notes || '');
    } else {
      setName('');
      setType('liquidity');
      setCategory(CATEGORY_SUGGESTIONS['liquidity'][0]);
      setValue('');
      setInstitution('');
      setTargetAllocationPercent('');
      setInterestRate('');
      setNotes('');
    }
    setError('');
  }, [editingItem, isOpen]);

  const handleTypeChange = (newType: WealthType) => {
    setType(newType);
    setCategory(CATEGORY_SUGGESTIONS[newType][0] || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Inserisci una denominazione valida per la voce di patrimonio.');
      return;
    }
    const numValue = parseFloat(value.replace(',', '.'));
    if (isNaN(numValue) || numValue < 0) {
      setError('Inserisci un importo valido in EUR (maggiore o uguale a 0).');
      return;
    }

    onSave({
      name: name.trim(),
      type,
      category: category.trim() || 'Altro',
      value: numValue,
      institution: institution.trim() || undefined,
      targetAllocationPercent: targetAllocationPercent ? parseFloat(targetAllocationPercent.replace(',', '.')) : undefined,
      interestRate: interestRate ? parseFloat(interestRate.replace(',', '.')) : undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#111C38] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#0E172F]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100">
                {editingItem ? 'Modifica Voce Patrimonio' : 'Nuova Voce Patrimonio'}
              </h3>
              <p className="text-[11px] text-slate-400">Gestisci asset, investimenti, beni e debiti</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector (4 Pills) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tipologia Voce</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'liquidity', label: 'Liquidità', color: 'text-sky-400', activeBg: 'bg-sky-500/20 border-sky-500/40 text-sky-300' },
                { id: 'investment', label: 'Investimento', color: 'text-purple-400', activeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-300' },
                { id: 'asset', label: 'Bene / Immobile', color: 'text-emerald-400', activeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' },
                { id: 'liability', label: 'Debito / Mutuo', color: 'text-rose-400', activeBg: 'bg-rose-500/20 border-rose-500/40 text-rose-300' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTypeChange(t.id as WealthType)}
                  className={`px-2 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer text-center ${
                    type === t.id
                      ? t.activeBg
                      : 'bg-[#0D1527] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Denominazione Asset / Debito *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="es. ETF FTSE All-World VWCE / Conto Deposito / Mutuo Casa"
              className="w-full bg-[#0D1527] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Category & Institution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria</label>
              <input
                type="text"
                list="category-suggestions"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Seleziona o digita..."
                className="w-full bg-[#0D1527] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
              />
              <datalist id="category-suggestions">
                {CATEGORY_SUGGESTIONS[type]?.map((cat, idx) => (
                  <option key={idx} value={cat} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Istituto / Piattaforma</label>
              <input
                type="text"
                value={institution}
                onChange={e => setInstitution(e.target.value)}
                placeholder="es. Scalable / Fineco / Intesa"
                className="w-full bg-[#0D1527] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Value (€) & Allocation Target / Yield Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {type === 'liability' ? 'Debito Residuo (€) *' : 'Valore Attuale (€) *'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#0D1527] border border-slate-700/80 rounded-lg pl-3 pr-7 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-cyan-400"
                />
                <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">€</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Allocazione (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={targetAllocationPercent}
                  onChange={e => setTargetAllocationPercent(e.target.value)}
                  placeholder="es. 30"
                  className="w-full bg-[#0D1527] border border-slate-700/80 rounded-lg pl-3 pr-7 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                />
                <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {type === 'liability' ? 'Tasso Debito (%)' : 'Rendimento Stim. (%)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={interestRate}
                  onChange={e => setInterestRate(e.target.value)}
                  placeholder="es. 3.5"
                  className="w-full bg-[#0D1527] border border-slate-700/80 rounded-lg pl-3 pr-7 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                />
                <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Note o Dettagli Aggiuntivi</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="es. Rata mensile 620€ / PAC 400€ al mese / Scadenza 2029"
              className="w-full bg-[#0D1527] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition cursor-pointer"
            >
              {editingItem ? 'Salva Modifiche' : 'Aggiungi Voce'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
