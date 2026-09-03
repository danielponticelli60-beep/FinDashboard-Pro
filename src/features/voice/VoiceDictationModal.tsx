import React, { useEffect } from 'react';
import { AlertTriangle, Loader2, Mic, MicOff, X } from 'lucide-react';
import { useVoiceRecognition } from './useVoiceRecognition';
import { VoiceCommandReviewModal } from './VoiceCommandReviewModal';

interface VoiceDictationModalProps {
  onClose: () => void;
  onOpenManualEntry: () => void;
}

export const VoiceDictationModal: React.FC<VoiceDictationModalProps> = ({ onClose, onOpenManualEntry }) => {
  const { status, error, transcript, isSupported, startListening, stopListening, cancel } = useVoiceRecognition();

  useEffect(() => {
    if (!isSupported) {
      return;
    }
  }, [isSupported]);

  const handleStart = () => {
    startListening();
  };

  const handleStop = () => {
    stopListening();
  };

  const handleCancel = () => {
    cancel();
    onClose();
  };

  const handleReviewClose = () => {
    onClose();
  };

  if (!isSupported) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="w-full sm:max-w-md bg-[#0F172A] border border-slate-700/80 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[92vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#111C38] shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-100 truncate">Riconoscimento non disponibile</h3>
            </div>
            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
              aria-label="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <p className="text-sm text-slate-300">
              Il tuo browser non supporta il riconoscimento vocale. Puoi comunque inserire il movimento manualmente.
            </p>
            <button
              onClick={onOpenManualEntry}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition cursor-pointer"
            >
              <MicOff className="w-4 h-4" />
              <span>Inserisci manualmente</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'listening') {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="w-full sm:max-w-md bg-[#0F172A] border border-slate-700/80 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[92vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#111C38] shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 animate-pulse">
                <Mic className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-100 truncate">Ascolto in corso...</h3>
            </div>
            <button
              onClick={handleCancel}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
              aria-label="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <p className="text-sm text-slate-300">
              Pronuncia chiaramente il movimento che vuoi registrare. Ad esempio:
            </p>
            <div className="p-3 rounded-xl bg-[#090D16] border border-slate-800 text-xs">
              <p className="text-slate-400 italic">"Ho speso dodici euro e cinquanta al supermercato con la prepagata"</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleStop}
                className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-semibold transition cursor-pointer"
              >
                <MicOff className="w-4 h-4" />
                <span>Interrompi</span>
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Annulla</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'processing' && transcript) {
    return (
      <VoiceCommandReviewModal rawText={transcript} onClose={handleReviewClose} />
    );
  }

  if (status === 'error' && error) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="w-full sm:max-w-md bg-[#0F172A] border border-slate-700/80 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[92vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#111C38] shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-100 truncate">Errore riconoscimento</h3>
            </div>
            <button
              onClick={handleCancel}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
              aria-label="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs">
              <p className="font-semibold mb-1">Errore: {error.code}</p>
              <p>{error.message}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleStart}
                className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>Riprova</span>
              </button>
              <button
                onClick={onOpenManualEntry}
                className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              >
                <MicOff className="w-4 h-4" />
                <span>Manuale</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="w-full sm:max-w-md bg-[#0F172A] border border-slate-700/80 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#111C38] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 truncate">Registra movimento con la voce</h3>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <p className="text-sm text-slate-300">
            Tocca "Inizia dettatura" e pronuncia chiaramente il movimento. Ad esempio:
          </p>
          <div className="p-3 rounded-xl bg-[#090D16] border border-slate-800 text-xs space-y-2">
            <p className="text-slate-400 italic">"Ho speso dodici euro e cinquanta al supermercato con la prepagata"</p>
            <p className="text-slate-400 italic">"Ho pagato otto euro di autobus in contanti"</p>
            <p className="text-slate-400 italic">"Ho ricevuto milletrecento euro di stipendio sul conto corrente"</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStart}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Inizia dettatura</span>
            </button>
            <button
              onClick={onOpenManualEntry}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <MicOff className="w-4 h-4" />
              <span>Manuale</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
