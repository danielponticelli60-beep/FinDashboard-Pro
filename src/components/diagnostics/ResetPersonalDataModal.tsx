import React, { useState } from 'react';
import { 
  AlertOctagon, 
  Trash2, 
  X, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export const ResetPersonalDataModal: React.FC = () => {
  const { 
    isResetPersonalModalOpen, 
    closeResetPersonalModal, 
    resetPersonalData,
    transactions,
    closeDiagnosticsModal
  } = useFinance();

  const [step, setStep] = useState<1 | 2>(1);
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [resetMode, setResetMode] = useState<'clean_all' | 'remove_demo_only'>('clean_all');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isResetPersonalModalOpen) return null;

  const handleClose = () => {
    setStep(1);
    setTypedConfirmation('');
    setIsSuccess(false);
    closeResetPersonalModal();
  };

  const handleExecuteReset = () => {
    const res = resetPersonalData(resetMode);
    if (res.success) {
      setIsSuccess(true);
      setSuccessMessage(res.message);
      setTimeout(() => {
        handleClose();
        closeDiagnosticsModal();
      }, 1800);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4" id="modal-reset-personal">
      <div className="bg-slate-900 border border-rose-900/60 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Ripristina Dati Personali</h3>
              <p className="text-xs text-rose-300">
                {step === 1 ? 'Conferma Fase 1 di 2: Selezione modalità' : 'Conferma Fase 2 di 2: Conferma definitiva'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/40">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-100">Ripristino completato</h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                {successMessage}
              </p>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/50 text-xs text-rose-200 space-y-1.5">
                <p className="font-semibold text-rose-300 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  Attenzione: Operazione di pulizia archivio
                </p>
                <p>
                  Attualmente sono presenti <strong className="text-white font-mono">{transactions.length} movimenti</strong> nell'archivio.
                  Questa procedura ti consente di azzerare i dati errati o rimuovere i record demo non desiderati.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Scegli tipo di ripristino:
                </label>

                <div 
                  onClick={() => setResetMode('clean_all')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    resetMode === 'clean_all'
                      ? 'bg-rose-950/40 border-rose-600 text-slate-100'
                      : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4" />
                      Azzera Archivio Movimenti (Esattamente 0 Movimenti)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-900/50 text-rose-300">
                      Consigliato per import pulito
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Elimina tutti i movimenti (demo ed Excel errati). Lascia intatte le configurazioni del conto, piano allocazione, patrimonio e obiettivi.
                  </p>
                </div>

                <div 
                  onClick={() => setResetMode('remove_demo_only')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    resetMode === 'remove_demo_only'
                      ? 'bg-amber-950/40 border-amber-600 text-slate-100'
                      : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4" />
                      Rimuovi solo i record Demo
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/50 text-amber-300">
                      Mantiene record validi
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Elimina solo i record identificati come Demo / Mock, preservando i movimenti con etichetta "Excel personale" o "Manuale".
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
                  id="btn-proceed-reset-step2"
                >
                  Continua alla 2ª Conferma
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800 text-xs text-rose-200 space-y-2">
                <p className="font-bold text-rose-300">
                  2ª Conferma Obbligatoria (Azione irreversibile)
                </p>
                <p className="text-slate-300">
                  Stai per procedere con: <strong>{resetMode === 'clean_all' ? 'Azzeramento completo a 0 movimenti' : 'Rimozione record Demo'}</strong>.
                </p>
                <p className="text-slate-400">
                  Per sicurezza, digita <strong className="text-rose-400 select-all font-mono">CONFERMA</strong> nel campo sottostante:
                </p>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Digita CONFERMA per abilitare il tasto"
                  value={typedConfirmation}
                  onChange={e => setTypedConfirmation(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-hidden focus:border-rose-500 font-mono"
                  id="input-confirm-reset"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Indietro
                </button>
                <button
                  type="button"
                  disabled={typedConfirmation.trim().toUpperCase() !== 'CONFERMA'}
                  onClick={handleExecuteReset}
                  className={`px-5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm ${
                    typedConfirmation.trim().toUpperCase() === 'CONFERMA'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                  }`}
                  id="btn-execute-reset-final"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Esegui Ripristino Definitivo
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
