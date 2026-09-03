# Report — Unificazione categorie "Ristoranti & Svago" / "Svago e ristoranti"

**Data**: 2026-09-02
**Stato finale**: ✅ completato. Migrazione implementata, testata (38/38 test), verificata su backup reale e in browser, collegata come passo automatico all'avvio dell'app. Rollback: `git revert` sui commit elencati in fondo, oppure ripristina un backup pre-migrazione.

## Risultato finale

- Hai scelto **Opzione A**: `rawCategory` viene sovrascritto al valore canonico anche sulle transazioni migrate (non solo `categoryId`/`category`/`categoryLabel`).
- **15 transazioni reali** (dal tuo backup) riclassificate da `svago_e_ristoranti` a `ristoranti_e_svago`.
- `svago_e_ristoranti` rimosso da `BASE_CATEGORIES` in `categoryManager.ts`.
- Migrazione collegata come passo automatico all'avvio di `FinanceContext` (idempotente, verificata anche con reload multipli in browser reale — la seconda volta riclassifica 0 record).

### Due problemi reali trovati e corretti durante la verifica in browser (non solo teorici)

1. **Rischio di ricomparsa non solo teorico**: durante il test dal vivo ho trovato 3 transazioni con `categoryId` **già corretto** (`ristoranti_e_svago`) ma con `rawCategory` ancora `"Svago e ristoranti"` (residuo del sistema di migrazione categorie già esistente nell'app, che preserva `rawCategory` di proposito). Questo da solo bastava a far ricomparire la categoria duplicata tramite `buildFullCategoryCatalog`, che ricostruisce le categorie "personalizzate" leggendo `rawCategory` per primo — indipendentemente da `categoryId`. **Corretto**: la funzione di merge ora controlla anche `category`/`categoryLabel`/`rawCategory` uguali all'etichetta duplicata, non solo `categoryId`. Aggiunto test di regressione dedicato.
2. **Audit log duplicato**: la prima versione registrava due volte la stessa migrazione ad ogni avvio (causa: un effetto collaterale — `addAuditEntry` — dentro una funzione di aggiornamento `setTransactions(prev => ...)`, che React può invocare più volte). **Corretto**: la logica è stata spostata fuori dall'updater. Verificato: un solo record di audit log per avvio, anche con reload ripetuti.

Questi due problemi non erano nell'analisi preliminare — sono emersi solo durante la verifica pratica in browser (FASE 7), a conferma dell'utilità di quel passaggio.

## Sintesi richiesta dal template

```text
- Categoria ufficiale individuata: Ristoranti & Svago
- ID categoria ufficiale: ristoranti_e_svago
- Categoria duplicata individuata: Svago e ristoranti
- ID categoria duplicata: svago_e_ristoranti
- Numero transazioni da riclassificare: 15 (+ 4 già sulla categoria ufficiale, invariate)
- Numero regole di allocazione coinvolte: 0 (l'unica regola esistente punta già a "Ristoranti & Svago")
- Numero budget coinvolti: 0 (lo schema non ha budget per-categoria, solo un benchmark mensile globale)
- File che verranno modificati: src/utils/categoryManager.ts (codice) + record transazioni (dati)
- Strategia di migrazione proposta: vedi §3, con una scelta da confermare in §4
```

## 1. Dove sono definite/referenziate le categorie

- **Catalogo di sistema**: `src/utils/categoryManager.ts`, array `BASE_CATEGORIES`. Contiene **entrambe** le categorie come voci distinte, entrambe `isSystem: true`:
  ```ts
  { id: 'svago_e_ristoranti', label: 'Svago e ristoranti', ..., isSystem: true },   // riga 15
  { id: 'ristoranti_e_svago', label: 'Ristoranti & Svago', ..., isSystem: true },   // riga 20
  ```
  Sono **due ID diversi**, non varianti dello stesso ID con etichetta diversa — non basta correggere un'etichetta, vanno riclassificati i record.
- **Type system**: `src/types.ts`, union `ExpenseCategory` include solo `'Ristoranti & Svago'`. `'Svago e ristoranti'` non è mai stato aggiunto al type — è presente solo nel catalogo runtime, non nel type compile-time. Questo conferma che si tratta di un duplicato accidentale, non di una seconda categoria intenzionale.
- **Categorie dichiarate nel backup** (`categories.expense`): include solo `'Ristoranti & Svago'`.
- **Regole di allocazione**: `rule-5` in `allocationPlan.rules` punta già a `"Ristoranti & Svago"` (etichetta, non ID) — nessuna modifica necessaria qui.
- **Filtro categorie UI** (`GlobalFiltersBar.tsx`, lista statica `ALL_CATEGORIES`): include solo `'Ristoranti & Svago'` — già corretto, nessuna modifica necessaria.
- **Riferimenti nelle transazioni**: campi `categoryId`, `categoryLabel`, `category`, `rawCategory` — vedi §2.

Nessun'altra occorrenza di "Svago e ristoranti" nel codice sorgente, in nessuna variante di maiuscole/accenti/spazi.

## 2. Come si è creata la duplicazione (dal backup reale)

- Le **15 transazioni** con la categoria duplicata sono **tutte** `source: "Excel personale"` (importate da Excel) — nel file originale la colonna categoria conteneva letteralmente il testo "Svago e ristoranti".
- Le **4 transazioni** con la categoria ufficiale sono **tutte** `source: "Manuale"` (inserite a mano, presumibilmente da un selettore che offre solo "Ristoranti & Svago", l'unica presente in `ExpenseCategory`/`categories.expense`).
- In condizioni normali, un testo importato che non corrisponde a nessuna categoria di sistema verrebbe registrato come categoria **personalizzata** (`isSystem: false`) dal meccanismo già esistente in `buildFullCategoryCatalog`. Qui invece qualcuno ha aggiunto `svago_e_ristoranti` direttamente a `BASE_CATEGORIES` come categoria di sistema — è così che è finita "ufficializzata" per errore invece di restare un caso da unificare.

## 3. Strategia di migrazione proposta

1. **Codice**: rimuovere la voce `{ id: 'svago_e_ristoranti', ... }` da `BASE_CATEGORIES` in `categoryManager.ts`.
2. **Dati — le 15 transazioni**: aggiornare
   - `categoryId`: `svago_e_ristoranti` → `ristoranti_e_svago`
   - `category`: `"Svago e ristoranti"` → `"Ristoranti & Svago"`
   - `categoryLabel`: `"Svago e ristoranti"` → `"Ristoranti & Svago"`
3. **Invariati per tutte e 15**: `id`, `amount`, `date`, `description`, `accountId`, `account`, `type`, `notes`, `status`, `source`, `importBatchId`, `importedAt`, `categoryModifiedManually` (resta `false` su tutte — non è un cambio editoriale dell'utente, è una correzione strutturale di un bug del catalogo).
4. **Le 4 transazioni già su "Ristoranti & Svago"**: **non toccate**, incluso l'unico record con `categoryModifiedManually: true` (`tx-man-1787217681668-x1j8w`, che ha `rawCategory: "Casa & Utenze"` perché l'utente l'ha riassegnata a mano — questo storico resta intatto).
5. Migrazione idempotente per costruzione: se rieseguita, i record già su `ristoranti_e_svago` non cambiano (nessun record ha più `categoryId === 'svago_e_ristoranti'` da correggere).

## 4. ⚠️ Ambiguità da risolvere prima di procedere — gestione di `rawCategory`

Le tue regole #3 e #8 sono in tensione tra loro su questo punto specifico, e devo chiederti come vuoi risolverla:

- **Regola #3**: non cancellare `rawCategory` se è uno storico d'importazione originale.
- **Regola #8**: la categoria duplicata non deve poter ricomparire dopo un nuovo avvio/import/restore.

Il problema: `buildFullCategoryCatalog` (la funzione che costruisce il catalogo selezionabile in tutta l'app) usa **`rawCategory` come prima fonte** per ricostruire eventuali categorie "personalizzate" mancanti dal catalogo:
```ts
const raw = tx.rawCategory || tx.categoryLabel || tx.category;
// ... se `raw` non matcha nessuna categoria nel catalogo, ne crea una nuova al volo
```
Se lascio `rawCategory = "Svago e ristoranti"` intatto su quelle 15 transazioni (rispettando la regola #3 alla lettera) e rimuovo `svago_e_ristoranti` da `BASE_CATEGORIES`, la prima volta che l'app ricostruisce il catalogo (avvio, import, ecc.) **quel testo verrà interpretato come categoria sconosciuta e ricreato da capo automaticamente** — stavolta come categoria personalizzata (`isSystem: false`) invece che di sistema, ma comunque di nuovo selezionabile e duplicata. Violerebbe la regola #8.

Tre opzioni, a tua scelta:

- **Opzione A — Aggiorna anche `rawCategory`** (più semplice, elimina il rischio alla radice): sovrascrivo `rawCategory` a `"Ristoranti & Svago"` anche sulle 15 transazioni. Costo: perdi il testo esatto originale importato da Excel per quei 15 record (resterebbe comunque nell'audit log e nel backup pre-migrazione, vedi FASE 2).
- **Opzione B — Alias di categoria (consigliata)**: lascio `rawCategory` intatto su tutte e 15, ma aggiungo una piccola mappa di alias in `categoryManager.ts` (`svago_e_ristoranti → ristoranti_e_svago`) che `findCategoryInCatalog`/`buildFullCategoryCatalog` consultano prima di creare una categoria personalizzata. Preserva lo storico letterale, blocca la ricomparsa in modo permanente, tocca solo `categoryManager.ts` in modo mirato.
- **Opzione C — Riscrivi la logica di ricostruzione del catalogo** per dare priorità a `categoryId` già valorizzato (se riconosciuto) invece di ripartire sempre da `rawCategory`. Preserva lo storico, ma è una modifica più ampia che cambia il comportamento di `buildFullCategoryCatalog` per **tutte** le transazioni, non solo queste 15 — più corretta architetturalmente ma raggio d'azione maggiore, quindi rischio leggermente più alto.

Ti chiedo esplicitamente: **quale delle tre preferisci?** Se non rispondi non procedo oltre l'analisi.

## 5. Verifica prima/dopo (baseline attuale, dal backup reale)

| Metrica | Valore attuale (baseline) |
|---|---|
| Transazioni totali | 40 |
| Entrate totali | € 216,68 |
| Uscite totali | € 568,30 |
| Trasferimenti totali | € 625,00 |
| Audit log | 122 |
| Categorie distinte in uso | 11 |
| Data minima / massima | 2026-07-15 / 2026-08-20 |
| Transazioni `categoryId = ristoranti_e_svago` | 4 |
| Transazioni `categoryId = svago_e_ristoranti` | 15 |

Dopo la migrazione (attesi, indipendentemente dall'opzione A/B/C scelta in §4):
- Transazioni totali: 40 (invariato)
- Entrate/Uscite/Trasferimenti: invariati (nessun importo tocco)
- Transazioni `categoryId = ristoranti_e_svago`: **19** (4 + 15)
- Transazioni `categoryId = svago_e_ristoranti`: **0**
- `svago_e_ristoranti` non più presente in `BASE_CATEGORIES` né in nessun catalogo costruito a runtime

## 6. Nota sulla fonte dati

Questa analisi usa `FinDashboard-Pro_backup_2026-09-01_17-49.json` (lo stesso backup reale della FASE 6A) come proxy dei dati live, dato che non ho accesso diretto al `localStorage` del tuo browser. Se hai usato l'app dopo le 17:49 del 1° settembre aggiungendo o modificando movimenti, quei cambiamenti non sono in questa analisi — se è così, fammelo sapere ed esporta un backup più recente prima che io proceda alla FASE 2.

## Prossimo passo

In attesa della tua risposta su §4. Non ho ancora toccato né il codice né i dati.
