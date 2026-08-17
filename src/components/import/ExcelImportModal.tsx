import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ArrowRight, 
  Check, 
  Trash2, 
  Layers, 
  Building2, 
  Info,
  ShieldCheck,
  RotateCcw,
  Eye,
  AlertTriangle,
  Lock,
  Sparkles,
  Table,
  SlidersHorizontal,
  BookmarkCheck,
  HelpCircle,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  CreditCard,
  Scale
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { 
  inspectRawWorksheet, 
  parseWorksheetAssisted, 
  loadSavedPresets, 
  savePreset, 
  RawSheetInspection, 
  ManualColumnMapping, 
  AssistedParseResult,
  MappingPreset,
  DEFAULT_PRESET_NAME,
  getColumnLetter,
  ValidatedRowResult
} from '../../utils/excelParser';
import { formatCurrency, formatDateItalian, getCategoryColor } from '../../utils/formatters';
import { TransactionType } from '../../types';

export const ExcelImportModal: React.FC = () => {
  const { 
    isImportModalOpen, 
    closeImportModal, 
    transactions, 
    importTransactionsBatch,
    mainAccountConfig,
    updateMainAccountConfig
  } = useFinance();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Raw file state
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'raw' | 'mapping' | 'preview' | 'verification'>('raw');

  // Mapping state
  const [mapping, setMapping] = useState<ManualColumnMapping>({
    dateColIndex: null,
    typeColIndex: null,
    amountColIndex: null,
    categoryColIndex: null,
    descriptionColIndex: null,
    accountColIndex: null,
    runningBalanceColIndex: null,
    ignoredColIndexes: [],
    typeVariants: {
      'entrata': 'income',
      'accredito': 'income',
      'stipendio': 'income',
      'uscita': 'expense',
      'spesa': 'expense',
      'addebito': 'expense',
      'giroconto': 'transfer',
      'trasferimento': 'transfer'
    },
    assignEmptyToMainAccount: true,
  });

  // Presets
  const [presets, setPresets] = useState<MappingPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('preset_default_v1');
  const [presetSaveName, setPresetSaveName] = useState<string>(DEFAULT_PRESET_NAME);
  const [presetSavedSuccess, setPresetSavedSuccess] = useState<boolean>(false);

  // Quantitative Verification Inputs
  const [expectedRowCount, setExpectedRowCount] = useState<string>('30');
  const [expectedIncome, setExpectedIncome] = useState<string>('');
  const [expectedExpense, setExpectedExpense] = useState<string>('');
  const [expectedNet, setExpectedNet] = useState<string>('');
  const [confirmedDiscrepancies, setConfirmedDiscrepancies] = useState<boolean>(false);

  // Row status filter in preview
  const [previewStatusFilter, setPreviewStatusFilter] = useState<'all' | 'valid' | 'to_fix' | 'duplicate' | 'discarded'>('all');

  // Success / Execution feedback
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Load presets on mount
  useEffect(() => {
    const loaded = loadSavedPresets();
    setPresets(loaded);
  }, []);

  // Raw Inspection calculation
  const rawInspection: RawSheetInspection | null = useMemo(() => {
    if (!workbook) return null;
    const availableSheets = workbook.SheetNames;
    let sheetName = selectedSheetName;
    if (!sheetName || !availableSheets.includes(sheetName)) {
      // Find "Movimenti" if available
      const match = availableSheets.find(s => s.toLowerCase().includes('moviment') || s.toLowerCase().includes('transaz'));
      sheetName = match || availableSheets[0] || '';
      setSelectedSheetName(sheetName);
    }
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return null;

    return inspectRawWorksheet(worksheet, sheetName, availableSheets, headerRowIndex);
  }, [workbook, selectedSheetName, headerRowIndex]);

  // Apply preset mapping when sheet headers change or preset is selected
  const applyPresetToInspection = (preset: MappingPreset, insp: RawSheetInspection) => {
    const newMapping: ManualColumnMapping = {
      dateColIndex: null,
      typeColIndex: null,
      amountColIndex: null,
      categoryColIndex: null,
      descriptionColIndex: null,
      accountColIndex: null,
      runningBalanceColIndex: null,
      ignoredColIndexes: [],
      typeVariants: { ...preset.typeVariants },
      assignEmptyToMainAccount: preset.assignEmptyToMainAccount ?? true,
    };

    insp.detectedHeaders.forEach(hdr => {
      const lower = hdr.name.toLowerCase().trim();
      if (preset.dateColName && lower.includes(preset.dateColName.toLowerCase())) newMapping.dateColIndex = hdr.colIndex;
      else if (!newMapping.dateColIndex && (lower.includes('data') || lower.includes('date') || lower.includes('giorno'))) newMapping.dateColIndex = hdr.colIndex;

      if (preset.typeColName && lower.includes(preset.typeColName.toLowerCase())) newMapping.typeColIndex = hdr.colIndex;
      else if (!newMapping.typeColIndex && (lower.includes('tipo') || lower.includes('type') || lower.includes('tipologia'))) newMapping.typeColIndex = hdr.colIndex;

      if (preset.amountColName && lower.includes(preset.amountColName.toLowerCase())) newMapping.amountColIndex = hdr.colIndex;
      else if (!newMapping.amountColIndex && (lower.includes('importo') || lower.includes('amount') || lower.includes('valore') || lower.includes('totale'))) newMapping.amountColIndex = hdr.colIndex;

      if (preset.categoryColName && lower.includes(preset.categoryColName.toLowerCase())) newMapping.categoryColIndex = hdr.colIndex;
      else if (!newMapping.categoryColIndex && (lower.includes('categoria') || lower.includes('category') || lower.includes('voce'))) newMapping.categoryColIndex = hdr.colIndex;

      if (preset.descriptionColName && lower.includes(preset.descriptionColName.toLowerCase())) newMapping.descriptionColIndex = hdr.colIndex;
      else if (!newMapping.descriptionColIndex && (lower.includes('descrizione') || lower.includes('causale') || lower.includes('dettaglio') || lower.includes('beneficiario'))) newMapping.descriptionColIndex = hdr.colIndex;

      if (preset.accountColName && lower.includes(preset.accountColName.toLowerCase())) newMapping.accountColIndex = hdr.colIndex;
      else if (!newMapping.accountColIndex && (lower.includes('conto') || lower.includes('metodo') || lower.includes('account') || lower.includes('carta'))) newMapping.accountColIndex = hdr.colIndex;
    });

    setMapping(newMapping);
  };

  // When raw inspection is ready, if mapping not set, try auto-preset
  useEffect(() => {
    if (rawInspection && presets.length > 0) {
      const activePreset = presets.find(p => p.id === selectedPresetId) || presets[0];
      applyPresetToInspection(activePreset, rawInspection);
    }
  }, [rawInspection?.sheetName, rawInspection?.headerRowIndex]);

  // Assisted Parsing result
  const parseResult: AssistedParseResult | null = useMemo(() => {
    if (!rawInspection) return null;
    return parseWorksheetAssisted(rawInspection, mapping, transactions, presetSaveName);
  }, [rawInspection, mapping, transactions, presetSaveName]);

  // File Upload Handlers
  const handleFileUpload = (file: File) => {
    setIsProcessing(true);
    setFilename(file.name);
    setImportSuccessMessage(null);
    setConfirmedDiscrepancies(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary', cellDates: true });
        setWorkbook(wb);
        setSelectedSheetName('');
        setHeaderRowIndex(0);
        setActiveTab('raw');
      } catch (err: any) {
        alert('Errore durante la lettura del file Excel: ' + (err.message || 'File non supportato'));
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    setWorkbook(null);
    setFilename('');
    setSelectedSheetName('');
    setHeaderRowIndex(0);
    setImportSuccessMessage(null);
    setConfirmedDiscrepancies(false);
    setActiveTab('raw');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save current mapping preset
  const handleSaveCurrentPreset = () => {
    if (!rawInspection) return;
    const name = presetSaveName.trim() || DEFAULT_PRESET_NAME;
    
    const getColName = (idx: number | null) => {
      if (idx === null) return undefined;
      const hdr = rawInspection.detectedHeaders.find(h => h.colIndex === idx);
      return hdr ? hdr.name : undefined;
    };

    const newPreset: MappingPreset = {
      id: `preset_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      sheetNameHint: rawInspection.sheetName,
      headerRowIndex,
      dateColName: getColName(mapping.dateColIndex),
      typeColName: getColName(mapping.typeColIndex),
      amountColName: getColName(mapping.amountColIndex),
      categoryColName: getColName(mapping.categoryColIndex),
      descriptionColName: getColName(mapping.descriptionColIndex),
      accountColName: getColName(mapping.accountColIndex),
      typeVariants: mapping.typeVariants,
      assignEmptyToMainAccount: mapping.assignEmptyToMainAccount,
    };

    savePreset(newPreset);
    const reloaded = loadSavedPresets();
    setPresets(reloaded);
    setSelectedPresetId(newPreset.id);
    setPresetSavedSuccess(true);
    setTimeout(() => setPresetSavedSuccess(false), 3000);
  };

  // Quantitative Discrepancy Checks
  const parsedExpectedCount = parseInt(expectedRowCount, 10);
  const isCountMismatch = !isNaN(parsedExpectedCount) && parseResult ? parseResult.validCount !== parsedExpectedCount : false;
  const countDelta = (!isNaN(parsedExpectedCount) && parseResult) ? parseResult.validCount - parsedExpectedCount : 0;

  const parsedExpectedIncome = expectedIncome ? parseFloat(expectedIncome.replace(',', '.')) : null;
  const isIncomeMismatch = parsedExpectedIncome !== null && parseResult ? Math.abs(parseResult.sumIncome - parsedExpectedIncome) > 0.01 : false;

  const parsedExpectedExpense = expectedExpense ? parseFloat(expectedExpense.replace(',', '.')) : null;
  const isExpenseMismatch = parsedExpectedExpense !== null && parseResult ? Math.abs(parseResult.sumExpense - parsedExpectedExpense) > 0.01 : false;

  const parsedExpectedNet = expectedNet ? parseFloat(expectedNet.replace(',', '.')) : null;
  const isNetMismatch = parsedExpectedNet !== null && parseResult ? Math.abs(parseResult.netBalance - parsedExpectedNet) > 0.01 : false;

  const hasAnyDiscrepancy = isCountMismatch || isIncomeMismatch || isExpenseMismatch || isNetMismatch;

  const isMandatoryMapped = mapping.dateColIndex !== null && mapping.typeColIndex !== null && mapping.amountColIndex !== null;
  const canImport = isMandatoryMapped && parseResult && parseResult.validCount > 0 && (!hasAnyDiscrepancy || confirmedDiscrepancies);

  // Final Import Confirmation
  const handleExecuteImport = () => {
    if (!parseResult || !canImport) return;

    const txsToImport = parseResult.validRows
      .map(r => r.transactionData)
      .filter((t): t is NonNullable<typeof t> => !!t);

    const result = importTransactionsBatch(txsToImport, filename || 'import_excel.xlsx');

    setImportSuccessMessage(
      `Importazione completata con successo: inseriti ${result.importedCount} movimenti con sorgente "Excel personale" e categoria originale preservata.`
    );

    setTimeout(() => {
      handleReset();
      closeImportModal();
    }, 2000);
  };

  // Filter preview rows
  const filteredPreviewRows = useMemo(() => {
    if (!parseResult) return [];
    if (previewStatusFilter === 'all') return parseResult.allRows;
    if (previewStatusFilter === 'valid') return parseResult.validRows;
    if (previewStatusFilter === 'to_fix') return parseResult.toFixRows;
    if (previewStatusFilter === 'duplicate') return parseResult.duplicateRows;
    if (previewStatusFilter === 'discarded') return parseResult.discardedRows;
    return parseResult.allRows;
  }, [parseResult, previewStatusFilter]);

  if (!isImportModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        id="excel-import-modal-container"
      >
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-100 tracking-tight">Mappatura Excel Assistita</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Controllo & Validazione Preventiva
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Lettura grezza, mappatura manuale obbligatoria delle colonne e verifica quantitativa prima dell’importazione.
              </p>
            </div>
          </div>

          <button
            onClick={closeImportModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Navigation Steps */}
        {workbook && (
          <div className="flex items-center justify-between px-5 py-2.5 bg-slate-950 border-b border-slate-800 text-xs overflow-x-auto shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('raw')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  activeTab === 'raw' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>1. Lettura Grezza & Diagnosi</span>
              </button>

              <button
                onClick={() => setActiveTab('mapping')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  activeTab === 'mapping' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>2. Mappatura Manuale Obbligatoria</span>
                {isMandatoryMapped ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  activeTab === 'preview' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>3. Anteprima di Validazione</span>
                {parseResult && (
                  <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-slate-800 text-emerald-400 text-[10px]">
                    {parseResult.validCount} validi
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('verification')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  activeTab === 'verification' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>4. Verifica Quantitativa</span>
                {hasAnyDiscrepancy ? (
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                ) : (
                  <Check className="w-3 h-3 text-emerald-400" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] shrink-0">
              <span className="text-slate-300 font-semibold">{filename}</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">Foglio: {selectedSheetName}</span>
            </div>
          </div>
        )}

        {/* Modal Body Scroll Area */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          
          {/* Feedback Banner */}
          {importSuccessMessage && (
            <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-semibold">{importSuccessMessage}</span>
            </div>
          )}

          {/* STEP 0: If No File Uploaded */}
          {!workbook && (
            <div className="space-y-6">
              <div 
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-950/50 hover:bg-slate-900/50 transition duration-150 group"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400 group-hover:scale-105 group-hover:border-emerald-500/50 transition mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-200 mb-1">
                  Trascina qui il file Excel personale (.xlsx / .xls / .csv)
                </h3>
                <p className="text-xs text-slate-400 max-w-md mb-4">
                  Il file verrà letto <strong className="text-slate-300">esclusivamente in memoria locale nel tuo browser</strong> per consentirti di selezionare la riga d'intestazione e mappare le colonne.
                </p>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition"
                >
                  Seleziona file dal computer
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2">
                <div className="flex items-center gap-2 text-slate-200 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Criteri Rigorosi di Mappatura e Sicurezza:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
                  <li><strong className="text-slate-300">Nessuna euristica automatica non verificata:</strong> la prima riga non viene assunta come intestazione, sei tu a confermarla.</li>
                  <li><strong className="text-slate-300">Preservazione fedele del testo:</strong> Categorie e Descrizioni rimangono rigorosamente identiche a quanto scritto nel foglio.</li>
                  <li><strong className="text-slate-300">Controllo quantitativo sui 30 movimenti:</strong> l’importazione resta bloccata in caso di discrepanze non esplicitamente confermate.</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 1: Lettura Grezza & Diagnosi */}
          {workbook && rawInspection && activeTab === 'raw' && (
            <div className="space-y-5" id="section-step1-raw">
              
              {/* Sheet & Header Selection Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-slate-200">Ispezione Struttura del Foglio</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-300 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Cambia file</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Foglio di lavoro selezionato:</label>
                    <select
                      value={selectedSheetName}
                      onChange={(e) => {
                        setSelectedSheetName(e.target.value);
                        setHeaderRowIndex(0);
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 font-semibold focus:outline-hidden focus:border-emerald-500"
                    >
                      {rawInspection.availableSheets.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Riga con le intestazioni delle colonne:
                    </label>
                    <select
                      value={headerRowIndex}
                      onChange={(e) => setHeaderRowIndex(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 font-semibold focus:outline-hidden focus:border-emerald-500"
                    >
                      {rawInspection.rawGrid.slice(0, 15).map((row, idx) => {
                        const preview = row.slice(0, 4).filter(Boolean).join(' | ') || '(riga vuota)';
                        return (
                          <option key={idx} value={idx}>
                            Riga {idx + 1}: {preview.slice(0, 45)}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex items-center gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Righe Totali</div>
                      <div className="text-base font-bold text-slate-100">{rawInspection.totalRows}</div>
                    </div>
                    <div className="h-6 w-px bg-slate-800" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Colonne Rilevate</div>
                      <div className="text-base font-bold text-emerald-400">{rawInspection.totalCols}</div>
                    </div>
                    <div className="h-6 w-px bg-slate-800" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Riga Dati Inizio</div>
                      <div className="text-base font-bold text-sky-400">Riga {headerRowIndex + 2}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw Grid Table (First 20 rows) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    Anteprima Grezza (prime 20 righe del foglio "{selectedSheetName}" senza alcuna trasformazione):
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Riga {headerRowIndex + 1} evidenziata come Intestazione
                  </span>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 max-h-80 overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 sticky top-0 z-10">
                        <th className="py-2 px-3 w-16 text-center border-r border-slate-800 text-[11px] bg-slate-950"># Riga</th>
                        {Array.from({ length: rawInspection.totalCols }).map((_, cIdx) => (
                          <th key={cIdx} className="py-2 px-3 border-r border-slate-800/60 font-bold text-slate-300 whitespace-nowrap">
                            Col {getColumnLetter(cIdx)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {rawInspection.rawGrid.slice(0, 20).map((row, rIdx) => {
                        const isHeader = rIdx === headerRowIndex;
                        return (
                          <tr 
                            key={rIdx} 
                            className={`transition ${
                              isHeader 
                                ? 'bg-emerald-950/40 text-emerald-300 font-bold border-y border-emerald-500/50' 
                                : rIdx < headerRowIndex 
                                  ? 'bg-slate-950/40 text-slate-500 line-through' 
                                  : 'hover:bg-slate-900/50'
                            }`}
                          >
                            <td className="py-2 px-3 text-center border-r border-slate-800 bg-slate-950 font-bold text-slate-400 whitespace-nowrap">
                              {rIdx + 1} {isHeader && '👑'}
                            </td>
                            {Array.from({ length: rawInspection.totalCols }).map((_, cIdx) => (
                              <td key={cIdx} className="py-2 px-3 border-r border-slate-800/40 whitespace-nowrap max-w-xs truncate">
                                {row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : ''}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detected Column Names from chosen header row */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                  <span>Elenco Esatto Colonne Rilevate alla Riga {headerRowIndex + 1}:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {rawInspection.detectedHeaders.map(hdr => (
                    <div key={hdr.colIndex} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between font-mono mb-1">
                        <span className="font-bold text-emerald-400">Col {hdr.colLetter}</span>
                        <span className="text-[10px] text-slate-400">Indice {hdr.colIndex}</span>
                      </div>
                      <div className="font-semibold text-slate-200 truncate">{hdr.name}</div>
                      {hdr.sampleValues.length > 0 && (
                        <div className="text-[10px] text-slate-400 font-mono mt-1 truncate">
                          Esempi: {hdr.sampleValues.slice(0, 2).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setActiveTab('mapping')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                >
                  <span>Procedi a Mappatura Manuale Obbligatoria</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 2: Mappatura Manuale Obbligatoria */}
          {workbook && rawInspection && activeTab === 'mapping' && (
            <div className="space-y-5" id="section-step2-mapping">
              
              {/* Preset Selector Bar */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                    <span>Configurazione di Mappatura Salvata:</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Seleziona una configurazione esistente o salvala con il nome standard.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <select
                    value={selectedPresetId}
                    onChange={(e) => {
                      setSelectedPresetId(e.target.value);
                      const target = presets.find(p => p.id === e.target.value);
                      if (target) applyPresetToInspection(target, rawInspection);
                    }}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-semibold"
                  >
                    {presets.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>

                  <button
                    onClick={handleSaveCurrentPreset}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5 text-sky-400" />
                    <span>Salva Mappatura ("{DEFAULT_PRESET_NAME.slice(0, 22)}...")</span>
                  </button>

                  {presetSavedSuccess && (
                    <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Salvata!
                    </span>
                  )}
                </div>
              </div>

              {/* Mandatory Field Mapping Grid */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                    <span>Associazione Campi Applicativi alle Colonne del File</span>
                  </div>
                  <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    * Data, Tipo e Importo sono Obbligatori
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  
                  {/* Data Movimento */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Data Movimento *</span>
                      </label>
                      <span className="text-[10px] text-emerald-400 font-semibold">GG/MM/AAAA, AAAA-MM-GG o seriale</span>
                    </div>
                    <select
                      value={mapping.dateColIndex !== null ? mapping.dateColIndex : ''}
                      onChange={(e) => setMapping(prev => ({
                        ...prev,
                        dateColIndex: e.target.value !== '' ? parseInt(e.target.value, 10) : null
                      }))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-semibold focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="">-- Seleziona Colonna (Obbligatorio) --</option>
                      {rawInspection.detectedHeaders.map(hdr => (
                        <option key={hdr.colIndex} value={hdr.colIndex}>
                          Col {hdr.colLetter}: {hdr.name} {hdr.sampleValues[0] ? `(es. ${hdr.sampleValues[0]})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tipo Movimento */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Tipo Movimento *</span>
                      </label>
                      <span className="text-[10px] text-emerald-400 font-semibold">Entrata, Uscita o Giroconto</span>
                    </div>
                    <select
                      value={mapping.typeColIndex !== null ? mapping.typeColIndex : ''}
                      onChange={(e) => setMapping(prev => ({
                        ...prev,
                        typeColIndex: e.target.value !== '' ? parseInt(e.target.value, 10) : null
                      }))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-semibold focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="">-- Seleziona Colonna (Obbligatorio) --</option>
                      {rawInspection.detectedHeaders.map(hdr => (
                        <option key={hdr.colIndex} value={hdr.colIndex}>
                          Col {hdr.colLetter}: {hdr.name} {hdr.sampleValues[0] ? `(es. ${hdr.sampleValues[0]})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Importo */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-200 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Importo *</span>
                      </label>
                      <span className="text-[10px] text-emerald-400 font-semibold">€ 1.250,00, 1250,00 o numeri</span>
                    </div>
                    <select
                      value={mapping.amountColIndex !== null ? mapping.amountColIndex : ''}
                      onChange={(e) => setMapping(prev => ({
                        ...prev,
                        amountColIndex: e.target.value !== '' ? parseInt(e.target.value, 10) : null
                      }))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-semibold focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="">-- Seleziona Colonna (Obbligatorio) --</option>
                      {rawInspection.detectedHeaders.map(hdr => (
                        <option key={hdr.colIndex} value={hdr.colIndex}>
                          Col {hdr.colLetter}: {hdr.name} {hdr.sampleValues[0] ? `(es. ${hdr.sampleValues[0]})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Categoria */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-sky-400" />
                        <span>Categoria (Testo Originale Preservato)</span>
                      </label>
                      <span className="text-[10px] text-sky-300 font-semibold">Nessuna alterazione</span>
                    </div>
                    <select
                      value={mapping.categoryColIndex !== null ? mapping.categoryColIndex : ''}
                      onChange={(e) => setMapping(prev => ({
                        ...prev,
                        categoryColIndex: e.target.value !== '' ? parseInt(e.target.value, 10) : null
                      }))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-semibold focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="">-- Nessuna colonna (Predefinita da tipo) --</option>
                      {rawInspection.detectedHeaders.map(hdr => (
                        <option key={hdr.colIndex} value={hdr.colIndex}>
                          Col {hdr.colLetter}: {hdr.name} {hdr.sampleValues[0] ? `(es. ${hdr.sampleValues[0]})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Descrizione / Causale */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-200 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        <span>Descrizione / Causale</span>
                      </label>
                      <span className="text-[10px] text-sky-300 font-semibold">Testo originale</span>
                    </div>
                    <select
                      value={mapping.descriptionColIndex !== null ? mapping.descriptionColIndex : ''}
                      onChange={(e) => setMapping(prev => ({
                        ...prev,
                        descriptionColIndex: e.target.value !== '' ? parseInt(e.target.value, 10) : null
                      }))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-semibold focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="">-- Nessuna colonna (Generica da tipo) --</option>
                      {rawInspection.detectedHeaders.map(hdr => (
                        <option key={hdr.colIndex} value={hdr.colIndex}>
                          Col {hdr.colLetter}: {hdr.name} {hdr.sampleValues[0] ? `(es. ${hdr.sampleValues[0]})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Conto / Metodo */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-200 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                        <span>Conto / Metodo</span>
                      </label>
                      <span className="text-[10px] text-sky-300 font-semibold">Conto o carta</span>
                    </div>
                    <select
                      value={mapping.accountColIndex !== null ? mapping.accountColIndex : ''}
                      onChange={(e) => setMapping(prev => ({
                        ...prev,
                        accountColIndex: e.target.value !== '' ? parseInt(e.target.value, 10) : null
                      }))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-semibold focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="">-- Nessuna colonna (Assegna Conto Principale) --</option>
                      {rawInspection.detectedHeaders.map(hdr => (
                        <option key={hdr.colIndex} value={hdr.colIndex}>
                          Col {hdr.colLetter}: {hdr.name} {hdr.sampleValues[0] ? `(es. ${hdr.sampleValues[0]})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Saldo Cumulato (Opzionale) */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-400 flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-slate-400" />
                        <span>Saldo Cumulato (Opzionale)</span>
                      </label>
                      <span className="text-[10px] text-slate-400">Solo per ispezione</span>
                    </div>
                    <select
                      value={mapping.runningBalanceColIndex !== null ? mapping.runningBalanceColIndex : ''}
                      onChange={(e) => setMapping(prev => ({
                        ...prev,
                        runningBalanceColIndex: e.target.value !== '' ? parseInt(e.target.value, 10) : null
                      }))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-semibold focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="">-- Non mappato --</option>
                      {rawInspection.detectedHeaders.map(hdr => (
                        <option key={hdr.colIndex} value={hdr.colIndex}>
                          Col {hdr.colLetter}: {hdr.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Empty Account Confirmation Option */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-200">Assegna "Conto Principale" se assente</div>
                      <div className="text-[11px] text-slate-400">Se il campo Conto/Metodo nel file è vuoto o non mappato</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={mapping.assignEmptyToMainAccount}
                      onChange={(e) => setMapping(prev => ({ ...prev, assignEmptyToMainAccount: e.target.checked }))}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-950 border-slate-700 cursor-pointer"
                    />
                  </div>

                </div>
              </div>

              {/* Mappatura Varianti di Tipo Riconosciute nel File */}
              {rawInspection.distinctTypeValues.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-emerald-400" />
                      <span>Mappatura Vocabolario / Varianti di "Tipo" Trovate nel File:</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Associa le parole chiave alle 3 categorie contabili</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {rawInspection.distinctTypeValues.map(rawVal => {
                      const cleanVal = rawVal.toLowerCase().trim();
                      const currentAssigned = mapping.typeVariants[cleanVal] || (
                        cleanVal.includes('entrata') || cleanVal.includes('accredito') ? 'income' :
                        cleanVal.includes('giroconto') || cleanVal.includes('trasferimento') ? 'transfer' : 'expense'
                      );

                      return (
                        <div key={rawVal} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs">
                          <span className="font-mono font-bold text-slate-200 truncate">"{rawVal}"</span>
                          <select
                            value={currentAssigned}
                            onChange={(e) => {
                              const val = e.target.value as 'income' | 'expense' | 'transfer';
                              setMapping(prev => ({
                                ...prev,
                                typeVariants: {
                                  ...prev.typeVariants,
                                  [cleanVal]: val,
                                }
                              }));
                            }}
                            className={`px-2 py-1 rounded font-bold text-xs ${
                              currentAssigned === 'income' ? 'bg-emerald-500/20 text-emerald-300' :
                              currentAssigned === 'transfer' ? 'bg-sky-500/20 text-sky-300' :
                              'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            <option value="income">→ Entrata</option>
                            <option value="expense">→ Uscita</option>
                            <option value="transfer">→ Giroconto</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setActiveTab('raw')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  ← Torna a Ispezione Grezza
                </button>

                <button
                  disabled={!isMandatoryMapped}
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition cursor-pointer ${
                    isMandatoryMapped
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>Verifica Anteprima di Validazione</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 3: Anteprima di Validazione & Controlli */}
          {workbook && parseResult && activeTab === 'preview' && (
            <div className="space-y-5" id="section-step3-preview">
              
              {/* Summary Counters Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-center font-mono">
                
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans uppercase font-bold">Righe Totali</div>
                  <div className="text-base font-bold text-slate-100 mt-0.5">{parseResult.totalRowsCount}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
                  <div className="text-[10px] text-emerald-400 font-sans uppercase font-bold">Righe Valide</div>
                  <div className="text-base font-bold text-emerald-300 mt-0.5">{parseResult.validCount}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40">
                  <div className="text-[10px] text-amber-400 font-sans uppercase font-bold">Da Correggere</div>
                  <div className="text-base font-bold text-amber-300 mt-0.5">{parseResult.toFixCount}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans uppercase font-bold">Scartate</div>
                  <div className="text-base font-bold text-slate-400 mt-0.5">{parseResult.discardedCount}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-yellow-950/40 border border-yellow-500/40">
                  <div className="text-[10px] text-yellow-400 font-sans uppercase font-bold">Duplicate</div>
                  <div className="text-base font-bold text-yellow-300 mt-0.5">{parseResult.duplicateCount}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-emerald-400 font-sans uppercase font-bold">Somma Entrate</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">+{formatCurrency(parseResult.sumIncome, false)}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-rose-400 font-sans uppercase font-bold">Somma Uscite</div>
                  <div className="text-sm font-bold text-rose-400 mt-0.5">-{formatCurrency(parseResult.sumExpense, false)}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-sky-400 font-sans uppercase font-bold">Saldo Netto</div>
                  <div className="text-sm font-bold text-slate-100 mt-0.5">{formatCurrency(parseResult.netBalance, false)}</div>
                </div>

              </div>

              {/* Filter Tabs for Preview */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setPreviewStatusFilter('all')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      previewStatusFilter === 'all' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tutti ({parseResult.totalRowsCount})
                  </button>
                  <button
                    onClick={() => setPreviewStatusFilter('valid')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      previewStatusFilter === 'valid' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Validi ({parseResult.validCount})
                  </button>
                  {parseResult.toFixCount > 0 && (
                    <button
                      onClick={() => setPreviewStatusFilter('to_fix')}
                      className={`px-3 py-1 rounded-lg font-semibold transition ${
                        previewStatusFilter === 'to_fix' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Da Correggere ({parseResult.toFixCount})
                    </button>
                  )}
                  {parseResult.duplicateCount > 0 && (
                    <button
                      onClick={() => setPreviewStatusFilter('duplicate')}
                      className={`px-3 py-1 rounded-lg font-semibold transition ${
                        previewStatusFilter === 'duplicate' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Duplicati ({parseResult.duplicateCount})
                    </button>
                  )}
                </div>

                <span className="text-xs text-slate-400 font-mono">
                  Visualizzazione: {filteredPreviewRows.length} righe
                </span>
              </div>

              {/* Validation Preview Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <div className="overflow-x-auto max-h-96 custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900 text-[10px] uppercase font-bold text-slate-400 sticky top-0 z-10 whitespace-nowrap">
                        <th className="py-2.5 px-3">Riga / ID</th>
                        <th className="py-2.5 px-3">Data Orig.</th>
                        <th className="py-2.5 px-3">Data Conv.</th>
                        <th className="py-2.5 px-3">Tipo Orig.</th>
                        <th className="py-2.5 px-3">Tipo Conv.</th>
                        <th className="py-2.5 px-3 text-right">Imp. Orig.</th>
                        <th className="py-2.5 px-3 text-right">Imp. Conv.</th>
                        <th className="py-2.5 px-3">Categoria Orig.</th>
                        <th className="py-2.5 px-3">Categoria Importata</th>
                        <th className="py-2.5 px-3">Descrizione</th>
                        <th className="py-2.5 px-3">Conto/Metodo</th>
                        <th className="py-2.5 px-3 text-center">Stato</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {filteredPreviewRows.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="py-8 text-center text-slate-500 text-xs">
                            Nessuna riga da visualizzare con il filtro selezionato.
                          </td>
                        </tr>
                      ) : (
                        filteredPreviewRows.map((row: ValidatedRowResult) => (
                          <tr key={row.id || row.rowNumber} className="hover:bg-slate-900/60 transition">
                            <td className="py-2 px-3 font-mono font-bold text-slate-400 whitespace-nowrap">
                              #{row.rowNumber}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-400 whitespace-nowrap">
                              {row.trace.originalDate || '-'}
                            </td>
                            <td className="py-2 px-3 font-mono font-semibold text-slate-200 whitespace-nowrap">
                              {row.trace.convertedDate ? formatDateItalian(row.trace.convertedDate) : <span className="text-rose-400">Err</span>}
                            </td>
                            <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                              {row.trace.originalType || '-'}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                row.trace.convertedType === 'income' ? 'bg-emerald-500/20 text-emerald-300' :
                                row.trace.convertedType === 'transfer' ? 'bg-sky-500/20 text-sky-300' :
                                row.trace.convertedType === 'expense' ? 'bg-rose-500/20 text-rose-300' :
                                'bg-slate-800 text-slate-400'
                              }`}>
                                {row.trace.convertedType === 'income' ? 'Entrata' : row.trace.convertedType === 'transfer' ? 'Giroconto' : row.trace.convertedType === 'expense' ? 'Uscita' : 'N/D'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-400 whitespace-nowrap">
                              {row.trace.originalAmount || '-'}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono font-bold whitespace-nowrap ${
                              row.trace.convertedType === 'income' ? 'text-emerald-400' : 'text-slate-100'
                            }`}>
                              {row.trace.convertedAmount !== null ? formatCurrency(row.trace.convertedAmount) : <span className="text-rose-400">Err</span>}
                            </td>
                            <td className="py-2 px-3 text-slate-400 max-w-xs truncate">
                              {row.trace.originalCategory || '-'}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-200">
                              <span 
                                className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                                style={{
                                  backgroundColor: `${getCategoryColor(row.trace.convertedCategory)}15`,
                                  color: getCategoryColor(row.trace.convertedCategory),
                                  borderColor: `${getCategoryColor(row.trace.convertedCategory)}35`,
                                }}
                              >
                                {row.trace.convertedCategory}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-300 max-w-xs truncate font-medium">
                              {row.trace.convertedDescription}
                            </td>
                            <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                              {row.trace.convertedAccount}
                            </td>
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                row.status === 'valid' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                row.status === 'duplicate' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                                row.status === 'to_fix' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                'bg-slate-800 text-slate-400'
                              }`} title={row.statusReasons.join('; ')}>
                                {row.status === 'valid' ? 'Valido' :
                                 row.status === 'duplicate' ? 'Duplicato' :
                                 row.status === 'to_fix' ? 'Da correggere' : 'Scartato'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Navigation Action */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setActiveTab('mapping')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  ← Torna a Mappatura
                </button>

                <button
                  onClick={() => setActiveTab('verification')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                >
                  <span>Procedi a Verifica Quantitativa Obbligatoria</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 4: Verifica Quantitativa Obbligatoria & Blocco Sicurezza */}
          {workbook && parseResult && activeTab === 'verification' && (
            <div className="space-y-5" id="section-step4-verification">
              
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    <span>Verifica Quantitativa & Quadratura Prima dell'Importazione</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Obiettivo: esattamente <strong className="text-emerald-300 font-bold">30 movimenti</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
                  
                  {/* Movimenti Attesi */}
                  <div className={`p-3.5 rounded-xl border ${
                    isCountMismatch ? 'bg-rose-950/30 border-rose-500/50 text-rose-300' : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}>
                    <label className="block text-slate-400 font-sans text-[11px] font-bold mb-1">
                      Numero Movimenti Attesi:
                    </label>
                    <input
                      type="number"
                      value={expectedRowCount}
                      onChange={(e) => setExpectedRowCount(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm font-bold font-mono text-slate-100"
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] font-sans">
                      <span>Rilevati dal file:</span>
                      <strong className="font-mono text-sm">{parseResult.validCount}</strong>
                    </div>
                    {isCountMismatch && (
                      <div className="text-[10px] text-rose-400 font-bold mt-1">
                        Discrepanza di {countDelta > 0 ? `+${countDelta}` : countDelta} movimenti!
                      </div>
                    )}
                  </div>

                  {/* Totale Entrate */}
                  <div className={`p-3.5 rounded-xl border ${
                    isIncomeMismatch ? 'bg-rose-950/30 border-rose-500/50 text-rose-300' : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}>
                    <label className="block text-slate-400 font-sans text-[11px] font-bold mb-1">
                      Totale Entrate Atteso (€):
                    </label>
                    <input
                      type="text"
                      placeholder="es. 4500,00"
                      value={expectedIncome}
                      onChange={(e) => setExpectedIncome(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm font-bold font-mono text-emerald-400"
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] font-sans">
                      <span>Calcolato:</span>
                      <strong className="font-mono text-sm text-emerald-400">+{formatCurrency(parseResult.sumIncome, false)}</strong>
                    </div>
                    {isIncomeMismatch && (
                      <div className="text-[10px] text-rose-400 font-bold mt-1">
                        Scostamento entrate rilevato!
                      </div>
                    )}
                  </div>

                  {/* Totale Uscite */}
                  <div className={`p-3.5 rounded-xl border ${
                    isExpenseMismatch ? 'bg-rose-950/30 border-rose-500/50 text-rose-300' : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}>
                    <label className="block text-slate-400 font-sans text-[11px] font-bold mb-1">
                      Totale Uscite Atteso (€):
                    </label>
                    <input
                      type="text"
                      placeholder="es. 2100,00"
                      value={expectedExpense}
                      onChange={(e) => setExpectedExpense(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm font-bold font-mono text-rose-400"
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] font-sans">
                      <span>Calcolato:</span>
                      <strong className="font-mono text-sm text-rose-400">-{formatCurrency(parseResult.sumExpense, false)}</strong>
                    </div>
                    {isExpenseMismatch && (
                      <div className="text-[10px] text-rose-400 font-bold mt-1">
                        Scostamento uscite rilevato!
                      </div>
                    )}
                  </div>

                  {/* Saldo Netto Previsto */}
                  <div className={`p-3.5 rounded-xl border ${
                    isNetMismatch ? 'bg-rose-950/30 border-rose-500/50 text-rose-300' : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}>
                    <label className="block text-slate-400 font-sans text-[11px] font-bold mb-1">
                      Saldo Netto Atteso (€):
                    </label>
                    <input
                      type="text"
                      placeholder="es. 2400,00"
                      value={expectedNet}
                      onChange={(e) => setExpectedNet(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm font-bold font-mono text-sky-400"
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] font-sans">
                      <span>Calcolato:</span>
                      <strong className="font-mono text-sm text-slate-100">{formatCurrency(parseResult.netBalance, false)}</strong>
                    </div>
                    {isNetMismatch && (
                      <div className="text-[10px] text-rose-400 font-bold mt-1">
                        Scostamento netto rilevato!
                      </div>
                    )}
                  </div>

                </div>

                {/* Explicit Discrepancy Lock Banner */}
                {hasAnyDiscrepancy && (
                  <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/60 text-xs space-y-3">
                    <div className="flex items-center gap-2 text-rose-300 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>BLOCCO DI SICUREZZA ATTIVO: Rilevata Discrepanza Quantitativa</span>
                    </div>
                    <p className="text-rose-200">
                      I valori estratti dal foglio non coincidono esattamente con i totali attesi ({parseResult.validCount} validi vs {expectedRowCount} attesi).
                      Per procedere con l'importazione è necessaria la conferma esplicita della spunta sottostante.
                    </p>
                    <label className="flex items-center gap-2.5 font-bold text-slate-100 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={confirmedDiscrepancies}
                        onChange={(e) => setConfirmedDiscrepancies(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-950 border-slate-700 cursor-pointer"
                      />
                      <span>Dichiaro di aver verificato l'anteprima e confermo esplicitamente le differenze riscontrate.</span>
                    </label>
                  </div>
                )}

                {/* Mapping to be saved summary */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300">Configurazione Mappatura Associata:</span>
                    <span className="font-mono text-emerald-400 font-bold">"{presetSaveName}"</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Questa configurazione rimarrà salvata in memoria locale e proposta in automatico alle prossime importazioni del file.
                  </p>
                </div>

              </div>

              {/* Final Confirmation Row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('preview')}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  ← Torna a Tabella Anteprima
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    onClick={closeImportModal}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition"
                  >
                    Annulla
                  </button>

                  <button
                    id="btn-confirm-import-excel"
                    disabled={!canImport}
                    onClick={handleExecuteImport}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs shadow-xl transition ${
                      canImport
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 cursor-pointer active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Conferma & Importa {parseResult.validCount} Movimenti</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Bottom Footer Status */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Processamento sicuro 100% Client-Side. Nessun dato inviato a server esterni.</span>
          </div>
          {parseResult && (
            <div className="font-mono text-slate-300">
              Stato: <strong className="text-emerald-400">{parseResult.validCount}</strong> righe pronte • <strong className="text-slate-200">€ {formatCurrency(parseResult.netBalance, false)}</strong> saldo previsto
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
