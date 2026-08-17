import React, { useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  ShieldCheck, 
  FileJson, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2,
  HardDrive,
  Database,
  Lock
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const { 
    exportFullBackupJSON, 
    importFullBackupJSON, 
    exportTransactionsCSV,
    exportWealthCSV,
    exportGoalsCSV,
    transactions,
    wealthItems,
    financialGoals
  } = useFinance();

  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = importFullBackupJSON(text);
        setImportStatus(result);
      } catch (err: any) {
        setImportStatus({
          success: false,
          message: 'Impossibile leggere il file selezionato.',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#111C38] border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#0E172F]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100">
                Backup Locale & Esportazione Dati
              </h3>
              <p className="text-[11px] text-slate-400">Salvataggio riservato nel browser, nessun cloud esterno</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          
          {/* Privacy Note */}
          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-start gap-2.5 text-xs text-cyan-200">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-cyan-300 font-semibold mb-0.5">Privacy & Sicurezza al 100%</strong>
              Tutti i dati risiedono esclusivamente nella memoria locale del tuo browser. Nessuna informazione bancaria o finanziaria viene trasmessa all'esterno.
            </div>
          </div>

          {/* Import Status feedback */}
          {importStatus && (
            <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
              importStatus.success
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
            }`}>
              {importStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{importStatus.message}</span>
            </div>
          )}

          {/* Current State Summary */}
          <div className="grid grid-cols-3 gap-2 bg-[#0D1527] p-3 rounded-xl border border-slate-800 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Movimenti</span>
              <strong className="text-slate-100 font-bold">{transactions.length}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Voci Patrimonio</span>
              <strong className="text-cyan-300 font-bold">{wealthItems.length}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Obiettivi</span>
              <strong className="text-emerald-400 font-bold">{financialGoals.length}</strong>
            </div>
          </div>

          {/* Section 1: Full JSON Backup & Restore */}
          <div className="border border-slate-800 rounded-xl p-3.5 space-y-3 bg-[#0D1527]">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-slate-200">Backup Completo (JSON)</h4>
            </div>
            <p className="text-[11px] text-slate-400">
              Esporta o ripristina un archivio completo con tutti i movimenti, piano di allocazione, asset patrimoniali e obiettivi di risparmio.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={exportFullBackupJSON}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-semibold text-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Scarica Backup (.json)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-purple-400" />
                <span>Ripristina da File (.json)</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>

          {/* Section 2: CSV Single Tables */}
          <div className="border border-slate-800 rounded-xl p-3.5 space-y-3 bg-[#0D1527]">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-slate-200">Esportazione Fogli di Calcolo (CSV / Excel)</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={exportTransactionsCSV}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Movimenti CSV</span>
              </button>
              
              <button
                onClick={exportWealthCSV}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>Patrimonio CSV</span>
              </button>

              <button
                onClick={exportGoalsCSV}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Obiettivi CSV</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0E172F] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
};
