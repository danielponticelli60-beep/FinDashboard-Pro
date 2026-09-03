# FinDashboard Pro — Report di Analisi (FASE 1)

**Data**: 2026-09-01
**Base di lavoro scelta**: `/Users/danielponticelli/antigravity/FinDashboard-Pro---Gestione-Finanze-Personali`

## 0. Riconciliazione versioni (locale vs GitHub vs backup)

| Fonte | Stato | Note |
|---|---|---|
| `Documents/Finanze/FinDashboard-Pro` | ❌ non esiste | Percorso indicato nelle istruzioni ma assente sul filesystem |
| `antigravity/...-Personali` (**usata come base**) | ✅ più recente | Non era un repo git — inizializzato ora (`git init` + commit baseline `ad39f04`) |
| `antigravity/...-BACKUP-2026-08-17` | snapshot intermedio | Identico alla base tranne 6 file (`FinanceContext.tsx`, `types.ts`, `AccountConfigModal.tsx`, `AccountsView.tsx`, `CompactMainAccountCard.tsx`, `MainAccountCard.tsx`) — la base li ha più avanti |
| GitHub `main` (`a255e6e`, 2026-08-17 15:25) | indietro | 10/42 file di `src` sono più corti/vecchi su GitHub; **manca `.github/workflows/deploy.yml`** in locale (presente solo su GitHub — da riportare prima di un futuro push) |

**Non è mai stato inizializzato git in locale prima d'ora**: questo significa che fino a questa sessione non esisteva alcuna cronologia/rollback locale. È stato creato un commit baseline reversibile prima di qualunque modifica.

## 1. Metriche del progetto

- **~16.930 LOC** in 42 file TypeScript/TSX sotto `src/`
- 14 cartelle componenti, come da mappa attesa
- **0 test**, 0 config ESLint/Prettier/Husky, 0 CI locale (esiste solo su GitHub, non sincronizzata)
- **0 errori TypeScript** (`tsc --noEmit` pulito) ma **`strict` NON è attivo** in `tsconfig.json`
- **Bundle di produzione: 1.52 MB JS (420 KB gzip) in un unico chunk** — ben oltre la soglia di 500 KB, zero code-splitting (`vite build` emette warning esplicito)
- Dipendenze morte in `package.json`: `@google/genai`, `express`, `dotenv` — nessun import nel codice, nessuna chiamata di rete (`fetch`/`axios`) in tutta l'app

### File più corposi
| File | Righe | Nota |
|---|---:|---|
| `src/context/FinanceContext.tsx` | 1967 | God-context, vedi §3 |
| `src/components/import/ExcelImportModal.tsx` | 1420 | |
| `src/components/settings/SettingsView.tsx` | 939 | |
| `src/utils/excelParser.ts` | 955 | |
| `src/utils/backupManager.ts` | 777 | |
| `src/components/transactions/TransactionsView.tsx` | 690 | |
| `src/components/accounts/AccountsView.tsx` | 683 | |

## 2. Problemi identificati (priorità)

### 🔴 Alta priorità

1. **`webSecurity: false` in `electron/main.cjs`** (riga `webPreferences`). Disattiva le protezioni same-origin del renderer Electron. Non risulta alcuna chiamata di rete nell'app (0 `fetch`/`axios` in `src/`), quindi molto probabilmente non serve più — ma va **verificato lanciando l'app impacchettata** prima di rimuoverlo, perché potrebbe essere stato aggiunto per un problema di caricamento asset da `file://`. Non l'ho disattivato autonomamente: è un cambio comportamentale su un binario desktop che non posso testare visivamente da qui.
2. **`FinanceContext.tsx` è un god-context da 1967 righe**: 24 `useState`, 10 `useEffect`, 43 accessi diretti a `localStorage`, 70+ funzioni, gestisce transazioni, conti, categorie, wealth, goal, import, backup, audit log tutto insieme. Ogni consumer che chiama `useFinance()` si ri-renderizza a ogni cambiamento di stato, ovunque esso avvenga (es. `MainContent` in `App.tsx` non è memoizzato e dipende da tutto il context solo per leggere `activePage`).
3. **Zero `React.memo`, zero `useCallback` in tutta la codebase** (solo 19 `useMemo` sparsi). Su viste pesanti come `AccountsView` (683 righe) o `TransactionsView` (690 righe) ogni digitazione nei filtri globali ri-renderizza l'intero albero.
4. **Zero code-splitting**: tutte le 9 view + tutti i modali sono montati sempre in `App.tsx`, nessun `React.lazy`/`Suspense`. Da qui il bundle da 1.52 MB in un solo chunk.
5. **Zero Error Boundary** in tutta l'app: un errore di rendering in una qualsiasi vista o modale fa crashare l'intera dashboard finanziaria, senza possibilità di recovery.

### 🟡 Media priorità

6. **`any` esplicito in 15 file** (~31 occorrenze), concentrato in `excelParser.ts`, `backupManager.ts`, `typeMigration.ts`, `categoryManager.ts` e nei modali che li consumano. Punti notevoli: `Transaction.rawAmount?: any`, `ToVerifyRow.rawAmount?: any`, `BackupData.importPresets?: any[]`, `restoreFullBackup(...): { details?: any }`, blocchi `catch (e: any)`.
7. **`Category = string`** (types.ts:32) vaporizza gli union type `ExpenseCategory`/`IncomeCategory` già definiti: qualsiasi stringa è accettata dove il codice vorrebbe un tipo chiuso — perdita di type safety proprio dove servirebbe di più.
8. ~~Doppia implementazione di `getCategoryColor`~~ **[Corretto in analisi]** — verificando il codice, `formatters.ts` non aveva una logica propria: era già un semplice wrapper che delegava a `categoryManager.ts` (stesso algoritmo, stesso fallback deterministico per categorie custom). Non è un bug di colori divergenti, solo un'indirection ridondante — risolta rendendolo un re-export diretto (vedi §5).
9. **Zero attributi `aria-*` in tutti i 31 componenti**: nessuna base di accessibilità (niente `aria-label` su bottoni icon-only, niente gestione focus nei modali).
10. **File Electron duplicato**: `main.cjs` in root e `electron/main.cjs` sono divergenti (quello in root è una versione più vecchia senza dialog di errore e diagnostica); `package.json` punta solo a `electron/main.cjs`, quindi quello in root è probabilmente morto/dimenticato.

### 🟢 Bassa priorità

11. Dipendenze inutilizzate da rimuovere: `@google/genai`, `express`, `dotenv`, `@types/express` — riducono `node_modules`/superficie di audit senza alcun beneficio.
12. Nessun alias `@/` sfruttato nei componenti nonostante sia configurato in `tsconfig.json` — tutti gli import sono relativi (`../../utils/...`).
13. `.github/workflows/deploy.yml` esiste solo su GitHub, non nel working copy locale: da riportare per non perderlo al prossimo push.

## 3. Nota architetturale su `FinanceContext.tsx`

Lo stato coperto (con relativo `useState` + persistenza `localStorage` manuale) copre questi domini distinti, candidati naturali per context/hook separati come richiesto in FASE 2.3:

- **Transactions**: `transactions`, `deletedStack` (undo), `auditLog`, `lastImportBatch`/`importSessions`
- **Accounts**: `mainAccountConfig`, `prepaidCardConfig`
- **Categories**: catalogo canonico, stato migrazione categorie
- **Type migration**: stato migrazione tipo transazione (segno→tipo)
- **Wealth**: `wealthItems`, `netWorthHistory`
- **Goals**: `financialGoals`
- **Allocation**: `allocationPlan`
- **UI/Settings**: `filters`, stato apertura di 9 modali diversi, `lastBackupDate`

Il pattern ripetuto ~15 volte (`useState(() => { leggi da localStorage }) + useEffect(persisti su localStorage)`) è un ottimo candidato per un hook riutilizzabile `usePersistedState<T>(key, initial)`, che da solo eliminerebbe gran parte della duplicazione prima ancora di spezzare il context.

## 4. FASE 2 — Quick-win applicati (2026-09-01)

Su tua indicazione ho implementato solo i miglioramenti a rischio zero, verificabili con `tsc --noEmit` + `vite build` dopo ogni passo (mai rotti durante la sessione), lasciando invariati flag Electron e split del context. Commit atomici:

| Commit | Cosa |
|---|---|
| `807f175` | Rimosse `@google/genai`, `express`, `dotenv` (mai importate, zero chiamate di rete nell'app), deduplicato `vite`. **Aggiunto `@types/react`/`@types/react-dom`, che mancavano del tutto** — senza di essi `tsc` trattava silenziosamente l'intera superficie React (hook, `FC`, `Component`, JSX) come non tipata: lo `tsc --noEmit` pulito riportato in §1 non stava in realtà verificando gran parte del codice. Aggiunti i types, **0 nuovi errori** — la base di codice era già corretta contro i tipi reali. |
| `408a50d` | Code-splitting con `React.lazy`+`Suspense` per le 9 view e gli 8 modali sempre montati in `App.tsx`. Bundle singolo da 1.52 MB → 739 KB (420 KB → 236 KB gzip), con chunk per-view/modale caricati on-demand. Aggiunto `ErrorBoundary` (nuovo `src/components/common/ErrorBoundary.tsx`) attorno all'area principale e al cluster modali: un errore di rendering non fa più crashare tutta la dashboard. |
| `24ce2eb` | Eliminati tutti i 31 `any` espliciti in 15 file: `catch (e: any)` → `catch (e)` con un helper condiviso `getErrorMessage()`; i parser di celle Excel grezze (`excelParser.ts`, `typeMigration.ts`) tipizzati `unknown` (facevano già narrowing interno via `typeof`/`instanceof`); `Transaction.rawAmount`/`ToVerifyRow.rawAmount` → `number \| string`; `restoreFullBackup` ha ora un tipo di ritorno reale (`RestoreBackupDetails`) invece di `details?: any`; i 4 cast `as any` su `onChange` di `<select>` sostituiti con l'union type reale (`GoalCategory`, `WealthType`, `FinancialGoal['priority']`). |
| `710836f` | Rimosso `main.cjs` in root (copia obsoleta e divergente di `electron/main.cjs`, non referenziata in `package.json`). Ripristinato `.github/workflows/deploy.yml` (esisteva solo su GitHub, mancava nella copia locale più recente). |

**React.memo non è stato applicato**: 28 dei 31 componenti chiamano `useFinance()` direttamente senza ricevere props, quindi `React.memo` non avrebbe alcun effetto sui loro re-render — servirebbe prima lo split del context (non incluso in questa passata, vedi §5).

Verificato anche manualmente in browser (dev server + navigazione Dashboard → Movimenti → Conti → Patrimonio → apertura modali Backup ed Excel): nessun errore console, tutti i chunk lazy si caricano correttamente.

## 5. Cosa resta aperto (non toccato in questa passata)

Restano deliberatamente intatti, perché rientrano nei criteri di "chiedi conferma" che tu stesso hai definito per la FASE 4 (refactoring architetturale major, cambiamento breaking):

- **`webSecurity: false`** in `electron/main.cjs` — non verificato/rimosso su tua indicazione esplicita.
- **Split di `FinanceContext.tsx`** in context modulari — proposto ma non incluso in questo giro di quick-win.
- **`strict` mode** in `tsconfig.json` — non ancora attivato (potenzialmente decine di errori a cascata su 17k LOC, da valutare a parte).
- **Accessibilità (`aria-*`)**, **virtualizzazione liste lunghe**, **test automatici** — non affrontati in questa sessione.

Tutto il resto della FASE 2.1 (any/type safety) e parte della 2.2/2.3 (code-splitting, error boundary) è stato completato — vedi §4. `tsc --noEmit` e `vite build` sono verdi ad ogni commit.
