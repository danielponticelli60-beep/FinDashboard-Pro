# FinDashboard Pro — Scenari di Test

**Data**: 2026-09-01. Scenari manuali (nessun test automatico esiste ancora — vedi `ANALYSIS_REPORT.md` §1) pensati per QA umana o come base futura per test E2E.

## Premessa: modello dati reale dell'app

Prima di scrivere scenari "multi-account" bisogna essere precisi su cosa l'app supporta davvero oggi (da `src/types.ts` e `FinanceContext.tsx`), perché non è un modello multi-conto generico:

- **Un solo utente, nessun account/login**: tutto vive in `localStorage` del browser locale. Non esiste alcun concetto di famiglia/più utenti/conti condivisi — gli scenari "famiglia" e "business" del brief originale non sono testabili perché la feature non esiste.
- **Due conti "configurati" di primo livello**: `MainAccountConfig` (Conto Principale) e `PrepaidCardConfig` (Carta Prepagata), ciascuno con saldo iniziale, data iniziale, saldo di controllo per riconciliazione.
- **Altri "conti" sono solo un tag sulla transazione** (`AccountType`: Carta, Carta di Credito, Conto Risparmio, Portafoglio Investimenti, Contanti, Da verificare) — non hanno saldo proprio, config o riconciliazione: sono categorie di pagamento, non conti veri.
- **Patrimonio (`WealthItem`)** è un registro separato (liquidità/investimenti/immobili/debiti) usato per il net worth, non collegato ai movimenti transazionali.

Gli scenari sotto riflettono questo, non il modello "multi-account" generico immaginato nel brief.

## Onboarding (primo utilizzo, dati vuoti)

1. Primo avvio senza dati → la Dashboard deve gestire lo stato vuoto su tutte le card (KPI, grafici) senza errori — **da verificare**: `KPICards`/i grafici assumono `filteredTransactions` non vuoto? (divisioni per zero su percentuali, medie)
2. Apertura `AccountConfigModal` → impostazione saldo iniziale e data del Conto Principale
3. Stesso per la Carta Prepagata
4. Inserimento prima transazione manuale (`TransactionModal`) → verifica che compaia su Dashboard, Movimenti, e che il saldo conto si aggiorni coerentemente
5. Import Excel come alternativa al passo 4 — flusso `ExcelImportModal`: selezione file → mappatura colonne manuale (obbligatoria, il tool non assume automaticamente la riga di intestazione, vedi `PWA_SETUP.md`/`ANALYSIS_REPORT.md`) → validazione quantitativa → conferma

## Flusso quotidiano: inserimento transazione

1. **Uscita rapida**: apri `TransactionModal` → tipo Uscita, importo, categoria, conto, data odierna precompilata → salva → verifica comparsa in `TransactionsView` e aggiornamento KPI Dashboard
2. **Entrata**: stesso flusso, tipo Entrata
3. **Trasferimento**: tipo Giroconto tra Conto Principale e Carta Prepagata → verifica che NON sia contato come entrata/uscita nei KPI aggregati ma correttamente in `transfersIn`/`transfersOut`
4. **Duplica transazione** (`duplicateTransaction`) → verifica nuovo id, stessi dati, non sovrascrive l'originale
5. **Modifica categoria manualmente** → verifica `categoryModifiedManually: true` settato (usato altrove per non sovrascrivere scelte utente in migrazioni automatiche — vedi `categoryManager.ts`)
6. **Elimina + Undo** (`deleteTransaction` / `undoLastDelete`) → verifica ripristino esatto entro la finestra di undo; verifica che `canUndoDelete` torni `false` dopo l'uso
7. **Elimina in blocco** (`deleteTransactionsBulk`) → stesso, con conteggio corretto in `lastDeletedCount`

## Flusso settimanale/mensile

1. Filtra per mese corrente (barra filtri globale) → verifica coerenza tra "Risultati visibili" e conteggio reale
2. Vista `QuarterlyView` → confronto Entrate/Uscite/Risparmio per trimestre, verifica che i totali per trimestre sommino ai totali annuali in `AnnualView`
3. Export CSV (`exportTransactionsCSV`) → verifica encoding UTF-8 con BOM (dichiarato in `SettingsView.tsx`) apra correttamente caratteri accentati in Excel
4. Export Excel multi-foglio (`exportExcelWorkbook`) → verifica i 6 fogli dichiarati (Movimenti, Conti, Budget, Allocazione, Patrimonio, Obiettivi)
5. Backup JSON completo → **poi restore su dati puliti** → verifica round-trip esatto (conteggio transazioni, config conti, budget, allocazione, patrimonio, obiettivi — vedi campi di `BackupData` in `types.ts`)

## Migrazioni (feature a rischio più alto, toccano dati esistenti in blocco)

1. **Ricostruzione Tipo** (`TypeMigrationModal`, sign-based da `typeMigration.ts`): su un set con importi ambigui (zero, stringhe non numeriche) → verifica che l'anteprima marchi correttamente le righe "da verificare" invece di forzare un tipo; testare `undoTypeMigration` dopo l'applicazione
2. **Migrazione Categorie** (`CategoryMigrationModal`, `categoryManager.ts`): su transazioni con categorie testuali "sporche" (spazi, maiuscole diverse, sinonimi) → verifica `normalizeCategoryKey`/`findCategoryInCatalog` le raggruppi correttamente; verifica `undoCategoryMigration` ripristini le etichette originali esatte
3. Entrambe le migrazioni creano uno snapshot di backup interno (`saveCategoryMigrationBackup`, `lastMigrationSnapshot`) — verificare che un secondo giro di migrazione dopo un undo non lasci lo snapshot in uno stato incoerente

## Diagnostica e integrità

1. `DataDiagnosticsModal` → su dati con categorie non riconosciute/vuote, verifica che `runCategoryDiagnostics` le segnali correttamente (non le nasconda)
2. `performIntegrityCheck` → alterare manualmente (devtools) il saldo di controllo di un conto per introdurre uno scostamento intenzionale, verificare che il check lo segnali con lo score/checks corretti invece di dare falso "passed"
3. Reset dati personali (`ResetPersonalDataModal`, doppia conferma) → verificare che **non** cancelli config/preset non personali per errore, e che sia irreversibile solo dopo la seconda conferma esplicita

## Edge case

- Saldo negativo su Conto Principale dopo un'uscita grande → l'app non ha un concetto di "scoperto", verificare solo che il numero negativo si visualizzi correttamente (colore, segno) senza troncamenti
- Transazione con importo `0` → deve essere accettata o rifiutata in modo esplicito, non silenziosamente scartata
- Import Excel con file `.xls`/`.csv` oltre a `.xlsx` (dichiarati supportati nell'estensione file) → verificare che il parsing `xlsx` gestisca tutti e tre senza differenze silenziose
- Import Excel con date in formati misti nello stesso file (seriali Excel, `DD/MM/YYYY`, ISO) → `parseItalianDateControlled` li gestisce tutti nello stesso passaggio? (la funzione supporta i tre casi singolarmente, non testato il misto)
- Import con righe duplicate rispetto a transazioni già presenti → verificare che `generateStableTransactionId`/`makeDuplicateKey` le rilevi come `duplicate` invece di importarle due volte
- Fuso orario: inserire una transazione a ridosso della mezzanotte mentre il sistema è su un fuso diverso da quello italiano → verificare che la data salvata (`YYYY-MM-DD`) sia quella attesa dall'utente, non quella UTC
- Backup corrotto (JSON troncato o con struttura invalida) in restore → verificare che `parseAndPreviewBackupJSON` fallisca con un messaggio chiaro invece di uno stack trace o, peggio, un import parziale silenzioso

## Non testabile con l'architettura attuale (richiede prima la feature)

- Transazioni ricorrenti automatiche — non esiste il concetto nel modello dati
- Multi-utente / conti condivisi — l'app è single-user by design
- Offline "vero" con sync — non c'è nulla da sincronizzare (già 100% locale), ma non c'è nemmeno service worker/installabilità (vedi `PWA_SETUP.md`)
- Multi-valuta — `formatCurrency` è fissa su EUR/it-IT, nessun campo valuta nel modello `Transaction`
