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
8. **Doppia implementazione di `getCategoryColor`**: una in `formatters.ts` (lookup per nome categoria legacy, usata da 10 componenti) e una in `categoryManager.ts` (lookup per `categoryId` canonico contro il nuovo catalogo, usata solo da `TransactionModal`/`CategoryMigrationModal`). Sintomo di una migrazione legacy→canonico non ancora completata: stesso concetto, due fonti di verità, colori potenzialmente diversi tra viste per la stessa categoria.
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

## 4. Cosa NON ho toccato e perché

Non ho ancora modificato il codice applicativo. Ho solo:
- inizializzato git e creato un commit baseline reversibile (`ad39f04`)
- eseguito `tsc --noEmit` e `vite build` (nessuna modifica, solo verifica)

Secondo i criteri di autonomia che tu stesso hai definito nella FASE 4 ("⚠️ Chiedi conferma se: refactoring architetturale major, cambiamento breaking"), lo split di `FinanceContext.tsx` in più context, l'attivazione di `strict` mode (potenzialmente decine di errori a cascata su 17k LOC) e l'eventuale rimozione di `webSecurity: false` rientrano in quella categoria — per questo mi fermo qui prima di procedere e ti propongo come priorizzare la FASE 2.
