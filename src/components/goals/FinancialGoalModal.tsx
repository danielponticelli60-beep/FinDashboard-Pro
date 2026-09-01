import React, { useState, useEffect } from 'react';
import { X, Target, AlertCircle, Calendar } from 'lucide-react';
import { FinancialGoal } from '../../types';

interface FinancialGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Omit<FinancialGoal, 'id' | 'createdAt'>) => void;
  editingGoal?: FinancialGoal | null;
}

const GOAL_CATEGORIES: { id: FinancialGoal['category']; label: string; defaultColor: string }[] = [
  { id: 'emergency', label: 'Fondo Emergenza', defaultColor: '#06B6D4' },
  { id: 'house', label: 'Casa / Ristrutturazione', defaultColor: '#10B981' },
  { id: 'travel', label: 'Viaggi & Esperienze', defaultColor: '#F59E0B' },
  { id: 'investment', label: 'Investimenti & FIRE', defaultColor: '#8B5CF6' },
  { id: 'vehicle', label: 'Auto / Mobilità', defaultColor: '#EC4899' },
  { id: 'other', label: 'Altro Obiettivo', defaultColor: '#3B82F6' },
];

export const FinancialGoalModal: React.FC<FinancialGoalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingGoal,
}) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('2026-12-31');
  const [category, setCategory] = useState<FinancialGoal['category']>('emergency');
  const [priority, setPriority] = useState<FinancialGoal['priority']>('medium');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [color, setColor] = useState('#06B6D4');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingGoal) {
      setName(editingGoal.name);
      setTargetAmount(editingGoal.targetAmount.toString());
      setCurrentAmount(editingGoal.currentAmount.toString());
      setTargetDate(editingGoal.targetDate);
      setCategory(editingGoal.category);
      setPriority(editingGoal.priority);
      setMonthlyContribution(editingGoal.monthlyContribution?.toString() || '');
      setColor(editingGoal.color || '#06B6D4');
      setNotes(editingGoal.notes || '');
    } else {
      setName('');
      setTargetAmount('');
      setCurrentAmount('0');
      setTargetDate('2026-12-31');
      setCategory('emergency');
      setPriority('medium');
      setMonthlyContribution('');
      setColor('#06B6D4');
      setNotes('');
    }
    setError('');
  }, [editingGoal, isOpen]);

  const handleCategoryChange = (cat: FinancialGoal['category']) => {
    setCategory(cat);
    const catObj = GOAL_CATEGORIES.find(c => c.id === cat);
    if (catObj) setColor(catObj.defaultColor);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Inserisci il nome del tuo obiettivo finanziario.');
      return;
    }
    const targetNum = parseFloat(targetAmount.replace(',', '.'));
    if (isNaN(targetNum) || targetNum <= 0) {
      setError('Inserisci un importo target valido maggiore di zero.');
      return;
    }
    const currentNum = parseFloat(currentAmount.replace(',', '.')) || 0;
    if (isNaN(currentNum) || currentNum < 0) {
      setError('Inserisci un importo risparmiato valido (≥ 0).');
      return;
    }
    if (!targetDate) {
      setError('Seleziona una data di scadenza obiettivo.');
      return;
    }

    onSave({
      name: name.trim(),
      targetAmount: targetNum,
      currentAmount: currentNum,
      targetDate,
      category,
      priority,
      monthlyContribution: monthlyContribution ? parseFloat(monthlyContribution.replace(',', '.')) : undefined,
      color,
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
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100">
                {editingGoal ? 'Modifica Obiettivo Finanziario' : 'Nuovo Obiettivo Finanziario'}
              </h3>
              <p className="text-[11px] text-slate-400">Pianifica risparmio, scadenze e contributi mensili</p>
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

          {/* Goal Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Obiettivo *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="es. Fondo Emergenza 6 Mesi / Anticipo Casa / Viaggio Giappone"
              className="w-full bg-[#0D1527] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria Obiettivo</label>
              <select
                value={category}
                onChange={e => handleCategoryChange(e.target.value as any)}
                className="w-full bg-[#0D1527] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
              >
                {GOAL_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Priorità</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full bg-[#0D1527] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
              >
                <option value="high">Alta Priorità 🔴</option>
                <option value="medium">Media Priorità 🟡</option>
                <option value="low">Bassa Priorità 🟢</option>
              </select>
            </div>
          </div>

          {/* Target Amount & Current Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Importo Target (€) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={targetAmount}
                  onChange={e => setTargetAmount(e.target.value)}
                  placeholder="10000.00"
                  className="w-full bg-[#0D1527] border border-slate-700/80 rounded-lg pl-3 pr-7 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-cyan-400"
                />
                <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">€</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Già Accantonato (€)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentAmount}
                  onChange={e => setCurrentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#0D1527] border border-slate-700/80 rounded-lg pl-3 pr-7 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-cyan-400"
                />
                <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">€</span>
              </div>
            </div>
          </div>

          {/* Target Date & Monthly Contribution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Data Obiettivo *</label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full bg-[#0D1527] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Risparmio Mensile Previsto (€)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={monthlyContribution}
                  onChange={e => setMonthlyContribution(e.target.value)}
                  placeholder="es. 250"
                  className="w-full bg-[#0D1527] border border-slate-700/80 rounded-lg pl-3 pr-7 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                />
                <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">€</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Note e Strategia</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="es. Bonifico ricorrente il 27 del mese sul conto deposito"
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
              {editingGoal ? 'Salva Modifiche' : 'Crea Obiettivo'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
