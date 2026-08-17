import React, { useState, useRef } from 'react';
import { 
  Download, 
  Upload, 
  ShieldCheck, 
  FileJson, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  RotateCcw, 
  Database, 
  Lock, 
  Sparkles, 
  HardDrive, 
  Calendar, 
  Clock, 
  Check, 
  X, 
  Eye, 
  ChevronRight, 
  RefreshCw, 
  Sliders, 
  Layers,
  ArrowRight,
  ArrowDownUp
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { 
  parseAndPreviewBackupJSON, 
  getBackupJSONFilename, 
  getTransactionsCSVFilename, 
  getExcelExportFilename 
} from '../../utils/backupManager';
import { BackupData, IntegrityCheckResult } from '../../types';
import { formatCurrency, formatDateItalian } from '../../utils/formatters';

export const SettingsView: React.FC = () => {
  const { 
    transactions,
    mainAccountConfig,
    allocationPlan,
    wealthItems,
    financialGoals,
    lastBackupDate,
    exportFullBackupJSON,
    exportTransactionsCSV,
    exportExcelWorkbook,
    performIntegrityCheck,
    restoreFullBackup,
    auditLog,
    openTypeMigrationModal
  } = useFinance();

  // Notification state
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<{
    type: 'success' | 'info';
    title: string;
    details: string;
    filename?: string;
  } | null>(null);

  // Restore Preview State
  const [restoreCandidate, setRestoreCandidate] = useState<{
    file: File;
    backup: BackupData;
    integrity: IntegrityCheckResult;
  } | null>(null);

  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);

  // Integrity Check State
  const [activeIntegrityResult, setActiveIntegrityResult] = useState<IntegrityCheckResult | null>(null);
  const [isIntegrityModalOpen, setIsIntegrityModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 7-day Backup Warning Logic
  const checkIsBackupStale = (): { isStale: boolean; daysAgo: number | null } => {
    if (!lastBackupDate) return { isStale: true, daysAgo: null };
    try {
      const lastDate = new Date(lastBackupDate);
      const diffMs = Date.now() - lastDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return { isStale: diffDays >= 7, daysAgo: diffDays };
    } catch {
      return { isStale: true, daysAgo: null };
    }
  };

  const backupStatus = checkIsBackupStale();

  // 1. Export JSON Handler
  const handleExportJSON = () => {
    try {
      const res = exportFullBackupJSON();
      setDownloadSuccessMessage({
        type: 'success',
        title: 'Backup JSON generato con successo',
        details: `Scaricati ${transactions.length} movimenti, voci di patrimonio, obiettivi e configurazioni personali.`,
        filename: res.filename,
      });
    } catch (err: any) {
      setDownloadSuccessMessage({
        type: 'info',
        title: 'Errore esportazione JSON',
        details: err.message || 'Si è verificato un problema durante la creazione del file.',
      });
    }
  };

  // 2. Export CSV Handler
  const handleExportCSV = () => {
    try {
      const res = exportTransactionsCSV();
      setDownloadSuccessMessage({
        type: 'success',
        title: 'Esportazione CSV completata',
        details: `Scaricati ${res.rowCount} movimenti con intestazioni standard e codifica UTF-8 con BOM.`,
        filename: res.filename,
      });
    } catch (err: any) {
      setDownloadSuccessMessage({
        type: 'info',
        title: 'Errore esportazione CSV',
        details: err.message || 'Impossibile esportare il file CSV.',
      });
    }
  };

  // 3. Export Excel Handler
  const handleExportExcel = () => {
    try {
      const res = exportExcelWorkbook();
      setDownloadSuccessMessage({
        type: 'success',
        title: 'File Excel (.xlsx) generato con successo',
        details: `Creata cartella di lavoro con 6 fogli distinti: Movimenti, Conti, Budget, Allocazione, Patrimonio, Obiettivi.`,
        filename: res.filename,
      });
    } catch (err: any) {
      setDownloadSuccessMessage({
        type: 'info',
        title: 'Errore esportazione Excel',
        details: err.message || 'Impossibile esportare la cartella Excel.',
      });
    }
  };

  // 4. Run Integrity Check
  const handleRunIntegrityCheck = () => {
    const result = performIntegrityCheck();
    setActiveIntegrityResult(result);
    setIsIntegrityModalOpen(true);
  };

  // 5. File selection for Restore
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError(null);
    setRestoreCandidate(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const res = parseAndPreviewBackupJSON(text);
        if (!res.isValid || !res.backup || !res.integrity) {
          setRestoreError(res.error || 'Formato backup non conforme.');
          return;
        }

        setRestoreCandidate({
          file,
          backup: res.backup,
          integrity: res.integrity,
        });
      } catch (err: any) {
        setRestoreError(`Errore di lettura del file: ${err.message}`);
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be picked again if desired
    e.target.value = '';
  };

  // Execute Restore
  const handleConfirmRestore = () => {
    if (!restoreCandidate) return;

    const result = restoreFullBackup(restoreCandidate.backup);
    setIsConfirmModalOpen(false);
    setConfirmCheckbox(false);
    setRestoreCandidate(null);

    if (result.success) {
      setDownloadSuccessMessage({
        type: 'success',
        title: 'Ripristino completato con successo!',
        details: result.message,
      });
    } else {
      setDownloadSuccessMessage({
        type: 'info',
        title: 'Errore durante il ripristino',
        details: result.message,
      });
    }
  };

  const formatLastBackupString = (): string => {
    if (!lastBackupDate) return 'Nessun backup effettuato';
    try {
      const d = new Date(lastBackupDate);
      return `${d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return lastBackupDate;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Page Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                  Impostazioni e Backup
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Gestione riservata dei dati personali, esportazione multi-formato e strumenti di sicurezza
                </p>
              </div>
            </div>
          </div>

          {/* Last Backup Pill */}
          <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3 px-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              backupStatus.isStale 
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' 
                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Ultimo backup
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-200">
                {formatLastBackupString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7-day Alert Banner if stale */}
      {backupStatus.isStale && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-300">
                {backupStatus.daysAgo === null 
                  ? 'Nessun backup recente registrato' 
                  : `Nessun backup effettuato negli ultimi ${backupStatus.daysAgo} giorni`}
              </h4>
              <p className="text-xs text-amber-200/80 mt-0.5">
                I dati risiedono nella memoria locale del tuo browser. Si consiglia vivamente di salvare regolarmente una copia completa dei dati personali in formato JSON per prevenire perdite accidentali.
              </p>
            </div>
          </div>
          <button
            onClick={handleExportJSON}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Esegui backup adesso</span>
          </button>
        </div>
      )}

      {/* Download Notification Toast / Banner */}
      {downloadSuccessMessage && (
        <div className="bg-emerald-950/50 border border-emerald-500/50 rounded-xl p-4 flex items-start justify-between gap-3 text-emerald-200 shadow-xl animate-fadeIn">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-emerald-300">
                {downloadSuccessMessage.title}
              </h4>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                {downloadSuccessMessage.details}
              </p>
              {downloadSuccessMessage.filename && (
                <div className="mt-2 text-[11px] font-mono bg-slate-950/70 border border-emerald-500/30 px-2.5 py-1 rounded inline-block text-emerald-300">
                  📁 {downloadSuccessMessage.filename}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setDownloadSuccessMessage(null)}
            className="p-1 rounded-lg text-emerald-400 hover:text-emerald-200 hover:bg-emerald-900/40 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION: BACKUP DATI & STRUMENTI */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-bold text-slate-100">
              Backup dati & Esportazioni
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {transactions.length} movimenti attivi in memoria
          </span>
        </div>

        {/* 5 Main Requested Buttons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* 1. Esporta backup completo JSON */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/40 transition group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  Esporta backup completo JSON
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Scarica l'archivio integrale: movimenti, conti, saldo iniziale, categorie, budget, piano di allocazione, patrimonio, obiettivi, preset e audit log.
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80">
                Pattern: <span className="text-emerald-400 font-semibold">{getBackupJSONFilename()}</span>
              </div>
            </div>

            <button
              id="btn-export-full-json"
              onClick={handleExportJSON}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 transition cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Esporta backup completo JSON</span>
            </button>
          </div>

          {/* 2. Importa/Ripristina backup JSON */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-cyan-500/40 transition group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  Importa / Ripristina backup JSON
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Carica un file JSON precedentemente esportato. Mostra un'anteprima dettagliata dei record e richiede doppia conferma prima del ripristino.
                </p>
              </div>
              <div className="text-[11px] text-cyan-300/80 bg-cyan-950/30 p-2 rounded-lg border border-cyan-500/20 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Controllo schema e integrità preventivo</span>
              </div>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelected}
                className="hidden"
                id="input-restore-json"
              />
              <button
                id="btn-import-restore-json"
                onClick={() => fileInputRef.current?.click()}
                className="mt-5 w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition cursor-pointer active:scale-98"
              >
                <Upload className="w-4 h-4 stroke-[2.5]" />
                <span>Importa / Ripristina backup JSON</span>
              </button>
            </div>
          </div>

          {/* 3. Esporta movimenti CSV */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  Esporta movimenti CSV
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Scarica solo l'elenco dei movimenti attivi in formato CSV tabellare standard, con intestazioni corrette in italiano e separatore punto e virgola (;).
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80">
                Pattern: <span className="text-blue-400 font-semibold">{getTransactionsCSVFilename()}</span>
              </div>
            </div>

            <button
              id="btn-export-csv"
              onClick={handleExportCSV}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Esporta movimenti CSV</span>
            </button>
          </div>

          {/* 4. Esporta dati in Excel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-600/40 transition group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/15 border border-emerald-600/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  Esporta dati in Excel
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Genera una cartella di lavoro Excel (.xlsx) con 6 fogli distinti: Movimenti, Conti, Budget mensile, Piano allocazione, Patrimonio, Obiettivi.
                </p>
              </div>
              <div className="text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80">
                Pattern: <span className="text-emerald-400 font-semibold">{getExcelExportFilename()}</span>
              </div>
            </div>

            <button
              id="btn-export-excel"
              onClick={handleExportExcel}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 transition cursor-pointer active:scale-98"
            >
              <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
              <span>Esporta dati in Excel (.xlsx)</span>
            </button>
          </div>

          {/* 5. Verifica integrità backup */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-purple-500/40 transition group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  Verifica integrità backup
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Esegue un controllo diagnostico approfondito su schema, completezza, ID univoci, quadratura matematica del Conto e consistenza del patrimonio.
                </p>
              </div>
              <div className="text-[11px] text-purple-300 bg-purple-950/30 p-2 rounded-lg border border-purple-500/20 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Genera report di conformità.</span>
              </div>
            </div>

            <button
              id="btn-check-integrity"
              onClick={handleRunIntegrityCheck}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition cursor-pointer active:scale-98"
            >
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
              <span>Verifica integrità archivio</span>
            </button>
          </div>

          {/* 6. Ricostruzione Tipo da segno */}
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-5 flex flex-col justify-between hover:border-cyan-500/60 transition group">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition">
                <ArrowDownUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  Ricostruzione Tipo da Segno
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Ricostruisce la distinzione Entrata (+) e Uscita (-) in modo deterministico dal segno dell'importo originale, con anteprima e audit log dedicati.
                </p>
              </div>
              <div className="text-[11px] text-cyan-300 bg-cyan-950/30 p-2 rounded-lg border border-cyan-500/20 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Non altera categorie, date, conti o saldi.</span>
              </div>
            </div>

            <button
              id="btn-settings-open-type-migration"
              onClick={openTypeMigrationModal}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition cursor-pointer active:scale-98"
            >
              <ArrowDownUp className="w-4 h-4 stroke-[2.5]" />
              <span>Apri Ricostruzione Tipo</span>
            </button>
          </div>

        </div>
      </div>

      {/* RESTORE PREVIEW MODAL / BANNER */}
      {restoreError && (
        <div className="bg-rose-950/60 border border-rose-500/50 rounded-2xl p-5 text-rose-200 space-y-3 shadow-2xl">
          <div className="flex items-center gap-3 text-rose-400 font-bold">
            <AlertCircle className="w-5 h-5" />
            <span>Errore durante la lettura del file di backup</span>
          </div>
          <p className="text-xs text-rose-200">{restoreError}</p>
          <button
            onClick={() => setRestoreError(null)}
            className="px-3 py-1.5 rounded-lg bg-rose-900 hover:bg-rose-800 text-rose-100 text-xs font-semibold"
          >
            Chiudi
          </button>
        </div>
      )}

      {restoreCandidate && (
        <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 animate-fadeIn">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Anteprima Backup JSON Selezionato
                </h3>
                <p className="text-xs text-slate-400">
                  File: <span className="font-mono text-cyan-300">{restoreCandidate.file.name}</span> ({(restoreCandidate.file.size / 1024).toFixed(1)} KB)
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setRestoreCandidate(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 font-semibold">Data Backup</div>
              <div className="text-xs sm:text-sm font-bold text-slate-200 mt-1">
                {new Date(restoreCandidate.backup.createdAt || '').toLocaleString('it-IT')}
              </div>
              <div className="text-[10px] text-cyan-400 mt-0.5">Versione {restoreCandidate.backup.appVersion || '1.0.0'}</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 font-semibold">Movimenti Inclusi</div>
              <div className="text-xs sm:text-sm font-bold text-emerald-400 mt-1">
                {restoreCandidate.backup.transactions.length} record
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {restoreCandidate.integrity.counts.incomes} entrate, {restoreCandidate.integrity.counts.expenses} spese
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 font-semibold">Patrimonio & Conti</div>
              <div className="text-xs sm:text-sm font-bold text-slate-200 mt-1">
                {restoreCandidate.backup.wealthItems?.length || 0} voci asset
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Saldo Iniziale: {formatCurrency(restoreCandidate.backup.mainAccountConfig?.initialBalance || 0)}
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 font-semibold">Obiettivi & Regole</div>
              <div className="text-xs sm:text-sm font-bold text-purple-400 mt-1">
                {restoreCandidate.backup.financialGoals?.length || 0} obiettivi
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {restoreCandidate.backup.allocationPlan?.rules?.length || 0} regole allocazione
              </div>
            </div>

          </div>

          {/* Financial Summary of the Backup */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Quadratura Finanziaria del Backup</span>
              <span className={`text-[11px] px-2 py-0.5 rounded font-mono ${
                restoreCandidate.integrity.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                Punteggio Integrità: {restoreCandidate.integrity.score}%
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
              <div>
                <span className="text-slate-400">Totale Entrate:</span>{' '}
                <span className="font-bold text-emerald-400">{formatCurrency(restoreCandidate.integrity.financialSummary.totalIncome)}</span>
              </div>
              <div>
                <span className="text-slate-400">Totale Uscite:</span>{' '}
                <span className="font-bold text-rose-400">{formatCurrency(restoreCandidate.integrity.financialSummary.totalExpense)}</span>
              </div>
              <div>
                <span className="text-slate-400">Saldo Netto:</span>{' '}
                <span className="font-bold text-slate-200">{formatCurrency(restoreCandidate.integrity.financialSummary.netBalance)}</span>
              </div>
            </div>
          </div>

          {/* Action Choice Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setRestoreCandidate(null)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Annulla
            </button>
            
            <button
              onClick={() => setIsConfirmModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sostituisci dati attuali</span>
            </button>
          </div>

        </div>
      )}

      {/* DOUBLE CONFIRMATION MODAL BEFORE RESTORE */}
      {isConfirmModalOpen && restoreCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Richiesta di Doppia Conferma
                </h3>
                <p className="text-xs text-slate-400">Operazione distruttiva sui dati correnti</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
              <p>
                Stai per sostituire l'intero archivio attualmente caricato in memoria con il backup del <strong className="text-slate-100">{new Date(restoreCandidate.backup.createdAt || '').toLocaleString('it-IT')}</strong>.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                <li>I <strong className="text-slate-200">{transactions.length} movimenti attuali</strong> verranno rimpiazzati con <strong className="text-cyan-300">{restoreCandidate.backup.transactions.length} movimenti</strong>.</li>
                <li>Verranno sovrascritti: Saldo Conto Principale, Voci di Patrimonio, Obiettivi di Risparmio e Regole di Allocazione.</li>
              </ul>
            </div>

            {/* Explicit Confirmation Checkbox */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmCheckbox}
                onChange={(e) => setConfirmCheckbox(e.target.checked)}
                className="mt-0.5 rounded border-amber-500 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
              />
              <span className="font-semibold">
                Confermo di voler sostituire definitivamente tutti i dati attuali con quelli contenuti in questo file di backup.
              </span>
            </label>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setConfirmCheckbox(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Annulla
              </button>

              <button
                disabled={!confirmCheckbox}
                onClick={handleConfirmRestore}
                className={`px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
                  confirmCheckbox
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Sì, Procedi con il Ripristino</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* INTEGRITY CHECK RESULT MODAL / CARD */}
      {isIntegrityModalOpen && activeIntegrityResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Esito Verifica Integrità Archivio
                  </h3>
                  <p className="text-xs text-slate-400">
                    Analisi di coerenza strutturale, quadratura contabile e validità record
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsIntegrityModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              
              {/* Score & Summary Banner */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                activeIntegrityResult.passed
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              }`}>
                <div className="flex items-center gap-3">
                  {activeIntegrityResult.passed ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      {activeIntegrityResult.passed 
                        ? 'Archivio integro e conforme al 100%' 
                        : `Rilevate ${activeIntegrityResult.warningsCount + activeIntegrityResult.errorsCount} segnalazioni`}
                    </h4>
                    <p className="text-xs opacity-90 mt-0.5">
                      Verificati {activeIntegrityResult.counts.transactions} movimenti, {activeIntegrityResult.counts.wealthItems} voci patrimoniali, {activeIntegrityResult.counts.financialGoals} obiettivi.
                    </p>
                  </div>
                </div>

                <div className="text-right pl-4">
                  <div className="text-2xl font-black font-mono text-slate-100">
                    {activeIntegrityResult.score}%
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Punteggio Qualità</div>
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Riconciliazione Finanziaria e Totali Calcolati
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Totale Entrate</span>
                    <span className="font-bold text-emerald-400 text-sm">{formatCurrency(activeIntegrityResult.financialSummary.totalIncome)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Totale Uscite</span>
                    <span className="font-bold text-rose-400 text-sm">{formatCurrency(activeIntegrityResult.financialSummary.totalExpense)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Saldo Calcolato Conto</span>
                    <span className="font-bold text-slate-200 text-sm">{formatCurrency(activeIntegrityResult.financialSummary.mainAccountCalculatedBalance)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Patrimonio Netto</span>
                    <span className="font-bold text-cyan-400 text-sm">{formatCurrency(activeIntegrityResult.financialSummary.netWorth)}</span>
                  </div>
                </div>
              </div>

              {/* Checklist Items */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Dettaglio Controlli di Integrità
                </h4>
                
                <div className="space-y-2">
                  {activeIntegrityResult.checks.map((check) => (
                    <div 
                      key={check.id}
                      className={`p-3 rounded-xl border flex items-start gap-3 text-xs ${
                        check.status === 'pass' 
                          ? 'bg-slate-950/60 border-slate-800 text-slate-300' 
                          : check.status === 'warn'
                          ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                          : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                      }`}
                    >
                      {check.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                      {check.status === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                      {check.status === 'fail' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                      
                      <div className="flex-1">
                        <div className="font-semibold text-slate-200 flex items-center gap-2">
                          <span>{check.label}</span>
                          <span className={`text-[10px] uppercase px-1.5 py-0.2 rounded font-mono ${
                            check.status === 'pass' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {check.category}
                          </span>
                        </div>
                        <p className="text-slate-400 mt-0.5">{check.message}</p>
                        {check.details && (
                          <p className="text-[11px] text-amber-300/80 mt-1 italic">{check.details}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Data controllo: {new Date(activeIntegrityResult.timestamp).toLocaleString('it-IT')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsIntegrityModalOpen(false);
                    handleExportJSON();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Esporta Backup JSON Adesso</span>
                </button>
                <button
                  onClick={() => setIsIntegrityModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                >
                  Chiudi
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* PRIVACY & LOCAL GUARANTEE CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-100">
              Garanzia di Riservatezza & Archiviazione Offline (100% Client-Side)
            </h3>
            <p className="text-xs text-slate-400">Nessun invio di dati a server esterni, API o database di terze parti</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <strong className="text-emerald-400 font-semibold block">Browser Local Storage</strong>
            <p className="text-slate-400 text-[11px]">
              Tutti i movimenti, i conti e i budget rimangono memorizzati esclusivamente nello storage locale sicuro del tuo browser.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <strong className="text-cyan-400 font-semibold block">Backup Autonomo</strong>
            <p className="text-slate-400 text-[11px]">
              Puoi salvare o ripristinare il tuo database in qualsiasi momento esportando il file JSON o Excel sul tuo computer.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <strong className="text-purple-400 font-semibold block">Audit Trail Trasparente</strong>
            <p className="text-slate-400 text-[11px]">
              Ogni creazione, modifica o eliminazione viene registrata nel registro eventi interno consultabile in Diagnostica.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
