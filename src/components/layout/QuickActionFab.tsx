import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Pencil, Plus, X } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { VoiceDictationModal } from '../../features/voice/VoiceDictationModal';
import { useVoiceQuickAction } from '../../features/voice/useVoiceQuickAction';

export const QuickActionFab: React.FC = () => {
  const { openAddModal } = useFinance();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleOpenManual = useCallback(() => {
    setIsMenuOpen(false);
    openAddModal();
  }, [openAddModal]);

  const handleOpenVoice = useCallback(() => {
    setIsMenuOpen(false);
    setIsVoiceModalOpen(true);
  }, []);

  const handleToggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleVoiceModalClose = useCallback(() => {
    setIsVoiceModalOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleCloseMenu();
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, handleCloseMenu]);

  useVoiceQuickAction(useCallback(() => {
    setIsVoiceModalOpen(true);
  }, []));

  return (
    <>
      <div
        ref={menuRef}
        className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-24"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {isMenuOpen && (
          <div className="flex flex-col items-end gap-2 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              onClick={handleOpenVoice}
              className="min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-slate-950 text-xs font-semibold shadow-lg shadow-violet-500/30 transition cursor-pointer active:scale-95"
            >
              <Mic className="w-4 h-4" />
              <span>Registra con la voce</span>
            </button>
            <button
              onClick={handleOpenManual}
              className="min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold shadow-lg shadow-emerald-500/30 transition cursor-pointer active:scale-95"
            >
              <Pencil className="w-4 h-4" />
              <span>Inserisci manualmente</span>
            </button>
          </div>
        )}

        <button
          onClick={handleToggleMenu}
          className={`min-h-[56px] min-w-[56px] flex items-center justify-center rounded-full shadow-lg transition cursor-pointer active:scale-95 ${
            isMenuOpen
              ? 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-500/30'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
          }`}
          aria-label="Aggiungi movimento"
        >
          {isMenuOpen ? <X className="w-6 h-6 stroke-[2.5]" /> : <Plus className="w-6 h-6 stroke-[2.5]" />}
        </button>
      </div>

      {isVoiceModalOpen && (
        <VoiceDictationModal
          onClose={handleVoiceModalClose}
          onOpenManualEntry={() => {
            handleVoiceModalClose();
            openAddModal();
          }}
        />
      )}
    </>
  );
};
