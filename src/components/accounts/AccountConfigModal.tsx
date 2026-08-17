import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  AlertTriangle, 
  X, 
  Calendar, 
  Euro, 
  ShieldCheck, 
  Check, 
  Info,
  CreditCard,
  Scale
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { CardDebitMode } from '../../types';

export const AccountConfigModal: React.FC = () => {
  const { 
    mainAccountConfig, 
    updateMainAccountConfig,
    prepaidCardConfig,
    updatePrepaidCardConfig,
    prepaidAccountSummary,
    isAccountConfigModalOpen, 
    closeAccountConfigModal,
    isPrepaidConfigModalOpen,
    closePrepaidConfigModal
  } = useFinance();

  const isOpen = isAccountConfigModalOpen || isPrepaidConfigModalOpen;
  const [activeTab, setActiveTab] = useState<'main' | 'prepaid'>('main');

  // Main Account Form state
  const [mainInitialBalanceStr, setMainInitialBalanceStr] = useState('');
  const [mainInitialDate, setMainInitialDate] = useState('');
  const [mainControlBalanceStr, setMainControlBalanceStr] = useState('');
  const [mainAccountLabel, setMainAccountLabel] = useState('');
  const [mainLast4Digits, setMainLast4Digits] = useState('');
  const [cardDebitMode, setCardDebitMode] = useState<CardDebitMode>('direct_debit');

  // Prepaid Card Form state
  const [prepaidInitialBalanceStr, setPrepaidInitialBalanceStr] = useState('');
  const [prepaidInitialDate, setPrepaidInitialDate] = useState('');
  const [prepaidControlBalanceStr, setPrepaidControlBalanceStr] = useState('');
  const [prepaidCardLabel, setPrepaidCardLabel] = useState('');
  const [prepaidLast4Digits, setPrepaidLast4Digits] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isPrepaidConfigModalOpen && !isAccountConfigModalOpen) {
      setActiveTab('prepaid');
    } else if (isAccountConfigModalOpen && !isPrepaidConfigModalOpen) {
      setActiveTab('main');
    }
  }, [isAccountConfigModalOpen, isPrepaidConfigModalOpen]);

  useEffect(() => {
    if (isOpen) {
      // Main account defaults
      setMainInitialBalanceStr((mainAccountConfig.initialBalance ?? 3400.00).toString());
      setMainInitialDate(mainAccountConfig.initialDate || '2026-07-01');
      setMainControlBalanceStr((mainAccountConfig.controlBalance ?? 3075.00).toString());
      setMainAccountLabel(mainAccountConfig.accountLabel || 'Conto Corrente Principale');
      setCardDebitMode(mainAccountConfig.cardDebitMode || 'direct_debit');
      const rawDigitsMain = (mainAccountConfig.maskedNumber || '').replace(/[^\d]/g, '');
      setMainLast4Digits(rawDigitsMain);

      // Prepaid card defaults
      setPrepaidInitialBalanceStr((prepaidCardConfig.initialBalance !== undefined ? prepaidCardConfig.initialBalance : 0.00).toString());
      setPrepaidInitialDate(prepaidCardConfig.initialDate || '2026-07-01');
      setPrepaidControlBalanceStr((prepaidCardConfig.controlBalance ?? 58.68).toString());
      setPrepaidCardLabel(prepaidCardConfig.accountLabel || 'Carta prepagata');
      const rawDigitsPrepaid = (prepaidCardConfig.maskedNumber || '').replace(/[^\d]/g, '');
      setPrepaidLast4Digits(rawDigitsPrepaid);

      setErrorMsg('');
    }
  }, [isOpen, mainAccountConfig, prepaidCardConfig]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isAccountConfigModalOpen) closeAccountConfigModal();
    if (isPrepaidConfigModalOpen) closePrepaidConfigModal();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (activeTab === 'main') {
      const cleanBalance = mainInitialBalanceStr.replace(',', '.').trim();
      const balanceNum = parseFloat(cleanBalance);

      if (isNaN(balanceNum)) {
        setErrorMsg('Inserisci un saldo iniziale valido in euro per il Conto Principale (es. 3400.00).');
        return;
      }

      if (!mainInitialDate) {
        setErrorMsg('Seleziona una data di riferimento per il Conto Principale.');
        return;
      }

      const cleanControl = mainControlBalanceStr.replace(',', '.').trim();
      const controlNum = parseFloat(cleanControl);

      let masked = '';
      const cleanDigits = mainLast4Digits.replace(/[^\d]/g, '').slice(-4);
      if (cleanDigits) {
        masked = `••••${cleanDigits}`;
      }

      updateMainAccountConfig({
        initialBalance: balanceNum,
        initialDate: mainInitialDate,
        controlBalance: isNaN(controlNum) ? 3075.00 : controlNum,
        accountLabel: mainAccountLabel.trim() || 'Conto Principale',
        maskedNumber: masked || undefined,
        cardDebitMode,
        isConfigured: true,
      });
    } else {
      const cleanBalance = prepaidInitialBalanceStr.replace(',', '.').trim();
      const balanceNum = parseFloat(cleanBalance);

      if (isNaN(balanceNum)) {
        setErrorMsg('Inserisci un saldo iniziale valido in euro per la Carta prepagata (es. 0.00).');
        return;
      }

      if (!prepaidInitialDate) {
        setErrorMsg('Seleziona una data di riferimento per la Carta prepagata.');
        return;
      }

      const cleanControl = prepaidControlBalanceStr.replace(',', '.').trim();
      const controlNum = parseFloat(cleanControl);

      let masked = '';
      const cleanDigits = prepaidLast4Digits.replace(/[^\d]/g, '').slice(-4);
      if (cleanDigits) {
        masked = `••••${cleanDigits}`;
      }

      updatePrepaidCardConfig({
        initialBalance: balanceNum,
        initialDate: prepaidInitialDate,
        controlBalance: isNaN(controlNum) ? 58.68 : controlNum,
        accountLabel: prepaidCardLabel.trim() || 'Carta prepagata',
        maskedNumber: masked || undefined,
        isConfigured: true,
      });
    }

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        id="account-config-modal"
        className="w-full max-w-xl bg-[#0F172A] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 relative max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#111C38] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              {activeTab === 'main' ? <Building2 className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Configurazione Conti & Saldi</h3>
              <p className="text-xs text-slate-400">Parametri di saldo iniziale, date e riconciliazione contabile</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center bg-[#090D16] border-b border-slate-800 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('main')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-t border-x transition cursor-pointer ${
              activeTab === 'main'
                ? 'bg-[#0F172A] text-cyan-300 border-cyan-500/50'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span>Conto Principale (€ 3.400,00)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prepaid')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-t border-x transition cursor-pointer ${
              activeTab === 'prepaid'
                ? 'bg-[#0F172A] text-pink-300 border-pink-500/50'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4 text-pink-400" />
            <span>Carta prepagata (€ 561,68)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'main' ? (
            <>
              {/* Conto Principale Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Saldo Iniziale (€) <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Euro className="w-4 h-4" />
                    </div>
                    <input
                      id="input-main-initial-balance"
                      type="text"
                      value={mainInitialBalanceStr}
                      onChange={e => setMainInitialBalanceStr(e.target.value)}
                      placeholder="3400.00"
                      required
                      className="w-full pl-9 pr-4 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm font-semibold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Saldo di partenza al 01/07/2026 (€ 3.400,00).</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Data di Riferimento <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      id="input-main-initial-date"
                      type="date"
                      value={mainInitialDate}
                      onChange={e => setMainInitialDate(e.target.value)}
                      required
                      className="w-full pl-9 pr-4 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Inizio periodo di riconciliazione.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Saldo Contabile Attuale di Controllo (€)</span>
                  <span className="text-[10px] text-cyan-400 font-normal flex items-center gap-1">
                    <Scale className="w-3 h-3" /> Per verifica matematica
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Euro className="w-4 h-4" />
                  </div>
                  <input
                    id="input-main-control-balance"
                    type="text"
                    value={mainControlBalanceStr}
                    onChange={e => setMainControlBalanceStr(e.target.value)}
                    placeholder="3075.00"
                    className="w-full pl-9 pr-4 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm font-semibold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Valore atteso da estratto conto (€ 3.075,00 = 3.400 + 100 - 425 ricariche).</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nome o Etichetta Conto
                  </label>
                  <input
                    id="input-main-account-label"
                    type="text"
                    value={mainAccountLabel}
                    onChange={e => setMainAccountLabel(e.target.value)}
                    placeholder="Conto Corrente Principale"
                    className="w-full px-4 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Ultime 4 cifre</span>
                    <span className="text-[10px] text-emerald-400 font-normal flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Solo maschera
                    </span>
                  </label>
                  <input
                    id="input-main-account-masked-digits"
                    type="text"
                    maxLength={4}
                    value={mainLast4Digits}
                    onChange={e => setMainLast4Digits(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="4829"
                    className="w-full px-4 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Carta Prepagata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Saldo Iniziale (€) <span className="text-pink-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Euro className="w-4 h-4" />
                    </div>
                    <input
                      id="input-prepaid-initial-balance"
                      type="text"
                      value={prepaidInitialBalanceStr}
                      onChange={e => setPrepaidInitialBalanceStr(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full pl-9 pr-4 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm font-semibold focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Saldo iniziale al 01/07/2026 (€ 0,00).</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Data di Riferimento <span className="text-pink-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      id="input-prepaid-initial-date"
                      type="date"
                      value={prepaidInitialDate}
                      onChange={e => setPrepaidInitialDate(e.target.value)}
                      required
                      className="w-full pl-9 pr-4 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Inizio periodo di spesa prepagata.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Saldo Disponibile Attuale di Controllo (€)</span>
                  <span className="text-[10px] text-pink-400 font-normal flex items-center gap-1">
                    <Scale className="w-3 h-3" /> Per verifica matematica
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Euro className="w-4 h-4" />
                  </div>
                  <input
                    id="input-prepaid-control-balance"
                    type="text"
                    value={prepaidControlBalanceStr}
                    onChange={e => setPrepaidControlBalanceStr(e.target.value)}
                    placeholder="58.68"
                    className="w-full pl-9 pr-4 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm font-semibold focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Valore attuale carta (€ 58,68 = 561,68 + 425 ricariche - 928 spese).</p>
                {(() => {
                  const parsedCtrl = parseFloat(prepaidControlBalanceStr.replace(',', '.').trim());
                  const calcBal = prepaidAccountSummary.currentBalance;
                  const previewDelta = isNaN(parsedCtrl) ? 0 : Math.round((calcBal - parsedCtrl) * 100) / 100;
                  return (
                    <div className="mt-2 p-2.5 bg-[#090D16] border border-slate-800 rounded-xl text-xs font-mono flex items-center justify-between text-slate-300">
                      <span>Saldo Calcolato: € {calcBal.toFixed(2)}</span>
                      <span className={previewDelta === 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                        Delta Ante-conferma: € {previewDelta > 0 ? `+${previewDelta.toFixed(2)}` : previewDelta.toFixed(2)}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nome Carta Prepagata
                  </label>
                  <input
                    id="input-prepaid-account-label"
                    type="text"
                    value={prepaidCardLabel}
                    onChange={e => setPrepaidCardLabel(e.target.value)}
                    placeholder="Carta prepagata"
                    className="w-full px-4 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Ultime 4 cifre</span>
                    <span className="text-[10px] text-emerald-400 font-normal flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Solo maschera
                    </span>
                  </label>
                  <input
                    id="input-prepaid-account-masked-digits"
                    type="text"
                    maxLength={4}
                    value={prepaidLast4Digits}
                    onChange={e => setPrepaidLast4Digits(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="1092"
                    className="w-full px-4 py-2.5 bg-[#090D16] border border-slate-700/80 rounded-xl text-slate-100 text-sm font-mono focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition"
                  />
                </div>
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/80 transition cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              id="btn-save-account-config"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Salva e Ricalcola Saldi</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};


