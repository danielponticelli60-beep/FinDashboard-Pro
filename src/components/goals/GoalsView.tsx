import React, { useState, useMemo } from 'react';
import { 
  Target, 
  Plus, 
  Download, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Sparkles, 
  TrendingUp, 
  CheckCheck,
  Zap,
  PiggyBank,
  Compass,
  ArrowRight
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { FinancialGoal } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { FinancialGoalModal } from './FinancialGoalModal';

export const GoalsView: React.FC = () => {
  const { 
    financialGoals, 
    goalsMetrics, 
    addFinancialGoal, 
    updateFinancialGoal, 
    deleteFinancialGoal,
    addGoalContribution,
    exportGoalsCSV,
    exportFullBackupJSON
  } = useFinance();

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | FinancialGoal['category']>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);

  // Filter goals
  const filteredGoals = useMemo(() => {
    return financialGoals.filter(goal => {
      if (activeCategoryFilter !== 'all' && goal.category !== activeCategoryFilter) return false;
      return true;
    });
  }, [financialGoals, activeCategoryFilter]);

  // Calculate goal stats
  const getGoalStatus = (goal: FinancialGoal) => {
    const isCompleted = goal.currentAmount >= goal.targetAmount;
    const today = new Date();
    const targetDate = new Date(goal.targetDate);
    
    // Calculate months remaining
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.max(1, Math.ceil(diffDays / 30.4));
    const isPastDue = diffDays < 0 && !isCompleted;

    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
    const suggestedMonthly = remainingAmount > 0 && diffMonths > 0 ? (remainingAmount / diffMonths) : 0;
    const progressPercent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));

    return {
      isCompleted,
      isPastDue,
      diffDays,
      diffMonths,
      remainingAmount,
      suggestedMonthly,
      progressPercent,
    };
  };

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleSaveGoal = (goalData: Omit<FinancialGoal, 'id' | 'createdAt'>) => {
    if (editingGoal) {
      updateFinancialGoal(editingGoal.id, goalData);
    } else {
      addFinancialGoal(goalData);
    }
  };

  const handleQuickAdd = (goal: FinancialGoal, amount: number) => {
    addGoalContribution(goal.id, amount);
  };

  const handleCustomAdd = (goal: FinancialGoal) => {
    const input = window.prompt(`Inserisci l'importo del contributo per "${goal.name}" in EUR (€):`, '100');
    if (input === null) return;
    const num = parseFloat(input.replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      addGoalContribution(goal.id, num);
    } else {
      alert('Importo non valido.');
    }
  };

  const getPriorityBadge = (priority: FinancialGoal['priority']) => {
    switch (priority) {
      case 'high':
        return { label: 'Alta Priorità', bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
      case 'medium':
        return { label: 'Media Priorità', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'low':
        return { label: 'Bassa Priorità', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
    }
  };

  return (
    <div className="space-y-4 w-full animate-fadeIn">
      
      {/* Top Header Banner */}
      <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-black/20">
        
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 tracking-tight">Obiettivi di Risparmio & Traguardi</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {goalsMetrics.completedGoalsCount} di {goalsMetrics.totalGoalsCount} Raggiunti
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Pianifica tappe finanziarie, contributi mensili e avanzamento target</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportFullBackupJSON}
            title="Backup completo di tutta l'applicazione"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Backup JSON</span>
          </button>

          <button
            onClick={exportGoalsCSV}
            title="Esporta lista obiettivi in CSV"
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
            <span>Nuovo Obiettivo</span>
          </button>
        </div>

      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* 1. Totale Accantonato */}
        <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-3.5 space-y-1 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Totale Accantonato</span>
            <PiggyBank className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-300">{formatCurrency(goalsMetrics.totalSavedAmount, false)}</div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Target complessivo:</span>
            <strong className="text-slate-200">{formatCurrency(goalsMetrics.totalTargetAmount, false)}</strong>
          </div>
        </div>

        {/* 2. Avanzamento Globale */}
        <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-3.5 space-y-1 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avanzamento Globale</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">{goalsMetrics.overallProgressPercent.toFixed(0)}%</div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full" 
              style={{ width: `${Math.min(100, goalsMetrics.overallProgressPercent)}%` }} 
            />
          </div>
        </div>

        {/* 3. Obiettivi Raggiunti */}
        <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-3.5 space-y-1 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Stato Traguardi</span>
            <CheckCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-400">
            {goalsMetrics.completedGoalsCount} / {goalsMetrics.totalGoalsCount}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>In corso di completamento:</span>
            <strong className="text-slate-200">{goalsMetrics.inProgressGoalsCount}</strong>
          </div>
        </div>

        {/* 4. Risparmio Rimanente */}
        <div className="bg-[#111C38] border border-slate-800/90 rounded-xl p-3.5 space-y-1 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mancante al Target</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400">
            {formatCurrency(goalsMetrics.totalRemainingAmount, false)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Capitale da raccogliere:</span>
            <strong className="text-amber-300">{(100 - goalsMetrics.overallProgressPercent).toFixed(0)}%</strong>
          </div>
        </div>

      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Tutti gli Obiettivi' },
          { id: 'emergency', label: 'Fondo Emergenza' },
          { id: 'house', label: 'Casa & Arredo' },
          { id: 'travel', label: 'Viaggi & Vacanze' },
          { id: 'investment', label: 'Investimenti & FIRE' },
          { id: 'vehicle', label: 'Auto & Mobilità' },
          { id: 'other', label: 'Altri Traguardi' },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategoryFilter(cat.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
              activeCategoryFilter === cat.id
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-[#111C38] text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Goals Cards Grid */}
      {financialGoals.length === 0 ? (
        <div className="bg-[#111C38] border border-slate-800 rounded-xl p-12 text-center text-slate-500 space-y-3">
          <Compass className="w-12 h-12 mx-auto text-cyan-500/40" />
          <h3 className="text-slate-200 font-bold text-base">Nessun obiettivo configurato</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Non è presente alcun obiettivo demo o predefinito. Puoi creare i tuoi obiettivi personali in totale autonomia.
          </p>
          <div className="pt-2">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Aggiungi obiettivo</span>
            </button>
          </div>
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="bg-[#111C38] border border-slate-800 rounded-xl p-12 text-center text-slate-500 space-y-3">
          <Compass className="w-12 h-12 mx-auto text-slate-600 opacity-60" />
          <h3 className="text-slate-300 font-bold text-sm">Nessun obiettivo per il filtro selezionato</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Seleziona un'altra categoria o reimposta il filtro per visualizzare gli obiettivi esistenti.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredGoals.map(goal => {
            const status = getGoalStatus(goal);
            const priorityBadge = getPriorityBadge(goal.priority);

            return (
              <div 
                key={goal.id} 
                className="bg-[#111C38] border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between space-y-4 shadow-lg shadow-black/20 hover:border-slate-700 transition group relative overflow-hidden"
              >
                {/* Top Colored Accent Bar */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1" 
                  style={{ backgroundColor: goal.color || '#06B6D4' }} 
                />

                {/* Card Header */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className={`inline-block px-1.5 py-0.2 text-[10px] font-bold rounded border ${priorityBadge.bg}`}>
                        {priorityBadge.label}
                      </span>
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition">
                        {goal.name}
                      </h3>
                    </div>

                    {/* Status Badge */}
                    {status.isCompleted ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        <CheckCircle className="w-3 h-3" />
                        <span>Raggiunto</span>
                      </span>
                    ) : status.isPastDue ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Scaduto</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{status.diffMonths} mesi rimasti</span>
                      </span>
                    )}
                  </div>

                  {goal.notes && (
                    <p className="text-[11px] text-slate-400 line-clamp-1">{goal.notes}</p>
                  )}
                </div>

                {/* Target & Current Values */}
                <div className="bg-[#0D1527] p-3 rounded-lg border border-slate-800/80 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Accantonato</span>
                      <span className="text-base font-bold text-cyan-300">{formatCurrency(goal.currentAmount, false)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Target Finale</span>
                      <span className="text-sm font-bold text-slate-300">{formatCurrency(goal.targetAmount, false)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                      <span>Avanzamento</span>
                      <span className="font-bold text-cyan-300">{status.progressPercent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${status.progressPercent}%`,
                          backgroundColor: goal.color || '#06B6D4'
                        }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Strategy Details (Monthly plan & Deadlines) */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
                  <div>
                    <span className="block text-[10px] text-slate-500">Scadenza</span>
                    <strong className="text-slate-300 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {goal.targetDate}
                    </strong>
                  </div>

                  <div className="text-right">
                    <span className="block text-[10px] text-slate-500">Quota Mensile Richiesta</span>
                    <strong className="text-amber-300">
                      {status.isCompleted ? 'Traguardo Raggiunto' : `${formatCurrency(status.suggestedMonthly, false)}/m`}
                    </strong>
                  </div>
                </div>

                {/* Action Buttons: Quick Contributions + Edit/Delete */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  
                  {/* Quick Add Pills */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleQuickAdd(goal, 50)}
                      title="Aggiungi +50€ al risparmio"
                      className="px-2 py-1 rounded text-[10px] font-bold bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700 transition cursor-pointer"
                    >
                      +50€
                    </button>
                    <button
                      onClick={() => handleQuickAdd(goal, 100)}
                      title="Aggiungi +100€ al risparmio"
                      className="px-2 py-1 rounded text-[10px] font-bold bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700 transition cursor-pointer"
                    >
                      +100€
                    </button>
                    <button
                      onClick={() => handleCustomAdd(goal)}
                      title="Aggiungi importo personalizzato"
                      className="px-2 py-1 rounded text-[10px] font-bold bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-700 transition cursor-pointer"
                    >
                      +Altro
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(goal)}
                      title="Modifica obiettivo"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Eliminare l'obiettivo "${goal.name}"?`)) {
                          deleteFinancialGoal(goal.id);
                        }
                      }}
                      title="Elimina obiettivo"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <FinancialGoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveGoal}
        editingGoal={editingGoal}
      />

    </div>
  );
};
