# Specifica tecnica — Inserimento movimenti via comando vocale

**Data**: 2026-09-03
**Stato**: implementato e verificato (analisi, parser, UI di revisione, wiring, test, verifica in browser a viewport iPhone). Non ancora utilizzabile dalla Lock Screen finché l'app non è pubblicata su un URL HTTPS pubblico — vedi `VOICE_SHORTCUT_SETUP.md`.

## 1. Analisi preliminare (routing e persistenza)

Prima di scegliere il formato del deep-link ho verificato lo stato reale del progetto:

- **Nessun router lato client**: l'app usa uno stato `activePage` in `FinanceContext`, non `react-router` o simili. Nessun uso di `window.location` esisteva prima di questa feature.
- **Nessun fallback SPA su GitHub Pages**: non esiste un `404.html` di rewrite. Un URL con un path diverso da `/` (es. `/voice`) risulterebbe in un 404 reale su GitHub Pages, non nell'app.
- **Electron carica via `file://`**: `electron/main.cjs` usa `mainWindow.loadFile(indexPath)`. Un path applicativo come `/voice` non ha alcun significato in questo contesto — non esiste un server che possa instradarlo.
- **`vite.config.ts`** ha `base: './'` (percorsi relativi), coerente con un'app senza routing "vero".

**Conclusione**: un formato con path dedicato (`/voice?command=...`) richiederebbe di introdurre un router client-side solo per questa feature, con rischio di regressione sull'intera navigazione esistente, e comunque non funzionerebbe su GitHub Pages senza configurazione aggiuntiva del server.

## 2. Formato del deep-link scelto

```text
https://[DOMINIO-APP]/?voiceCommand=[TESTO_URL_ENCODED]
```

Un semplice parametro di query sulla root dell'app. Funziona identicamente:
- nella PWA su GitHub Pages (nessun rewrite necessario, `/` esiste sempre);
- nell'app Electron, se mai caricata da URL con query string;
- offline/localmente, per i test.

Per tolleranza, viene accettato anche il parametro `command` (quindi anche un eventuale link nella forma alternativa `/voice?command=...`, se qualcuno lo aprisse, verrebbe comunque letto correttamente una volta atterrato sulla root — ma il formato **raccomandato e documentato** resta quello sopra).

## 3. Cosa fa il deep-link (e cosa non fa)

`useVoiceCommandDeepLink.ts` (hook, in `src/features/voice/`):

1. Legge `voiceCommand`/`command` da `window.location.search` al mount, e su `focus`/`visibilitychange` (per il caso in cui l'app sia già aperta e il sistema operativo riporti in primo piano la stessa finestra PWA con la nuova URL).
2. Tronca il testo a 500 caratteri.
3. Rimuove immediatamente il parametro dalla URL (`history.replaceState`), così un refresh o un ritorno successivo all'app non ripete lo stesso comando.
4. Espone il testo allo stato React (`pendingCommandText`), che apre `VoiceCommandReviewModal`.

**Non fa mai**: salvare un movimento, chiamare API esterne, inviare il testo dettato altrove. Il testo vive solo nello stato temporaneo del componente React finché l'utente non conferma o annulla.

## 4. Architettura dei moduli

```text
src/features/voice/
  voiceCommandTypes.ts        Tipi (ParsedVoiceCommand, VoiceParserAccount, ...)
  italianVoiceParser.ts       Parser puro, deterministico, testabile in isolamento
  italianVoiceParser.test.ts  70 test (copre i 17 scenari richiesti + unit test sui singoli estrattori)
  voiceCommandValidation.ts   canConfirmVoiceCommand(), getMissingFieldLabels()
  useVoiceCommandDeepLink.ts  Hook per la lettura del deep-link
  VoiceCommandReviewModal.tsx UI di revisione/conferma (lazy-loaded in App.tsx)
  VoiceCommandHelp.tsx        Pannello informativo statico in Impostazioni
```

Nessuna logica vocale è stata aggiunta a `FinanceContext.tsx` — la modale usa direttamente `addTransaction`/`createTransfer`/`deleteTransaction` già esistenti, allo stesso modo del form manuale.

## 5. Modello dati

Vedi `voiceCommandTypes.ts` per l'interfaccia `ParsedVoiceCommand` completa (identica a quella specificata). Note implementative:

- `VoiceParserAccount` è un tipo minimale (`id`, `label`, `kind`) usato solo dal parser, per tenerlo disaccoppiato da `FinanceContext` e testabile con fixture proprie.
- `confidence` è calcolata come: `'low'` se mancano campi obbligatori, `'medium'` se tutti i campi obbligatori sono presenti ma esistono warning (es. categoria non riconosciuta, tipo dedotto), `'high'` se nessun warning.
- `missingFields` guida sia il blocco del bottone "Conferma movimento" sia i messaggi visibili in UI.

## 6. Regole del parser (MVP)

Vedi il codice in `italianVoiceParser.ts` per i dettagli completi. Sintesi delle scelte progettuali principali:

- **Tipo**: rilevato per parole chiave, controllate in ordine trasferimento → entrata → uscita (il trasferimento è il più specifico strutturalmente). **Eccezione emersa dai test**: un comando senza verbo esplicito ma con importo + una categoria riconosciuta (es. *"8 euro autobus in contanti"*) viene dedotto come uscita — è la forma più comune per note vocali brevi — ma questo viene sempre segnalato con un warning esplicito ("dedotto dal contesto"), abbassando la confidenza a `medium`, mai silenziosamente a `high`.
- **Importo**: supporta `12 euro`, `12€`, `12,50 euro`, `12 euro e 50`, `mille euro`, `1.200 euro`, `1.200,50 euro`. **Bug reale trovato e corretto durante i test**: il pattern iniziale per i numeri con separatore delle migliaia matchava erroneamente un numero a 4+ cifre senza punteggiatura (es. `1300 euro` → `300`, ignorando l'`1` iniziale). Corretto per accettare sia la forma con punti di migliaia sia un numero semplice senza separatori.
- **Data**: `oggi`/`ieri`/`domani` relativi alla data corrente del dispositivo (iniettata come parametro, mai `new Date()` diretto, per rendere il parser testabile deterministicamente); `il 3 settembre`/`3 settembre` risolti nell'anno corrente. Espressioni come "venerdì scorso" o "l'altro giorno" sono rilevate esplicitamente e lasciano la data `null` con un warning, mai risolte a una data indovinata.
- **Conti**: risolti contro la lista dinamica `accounts[]` dell'utente — prima per corrispondenza diretta (sotto)stringa con l'etichetta reale del conto (funziona automaticamente con qualsiasi nome personalizzato), poi con un'euristica su `kind` per i sinonimi noti (conto corrente, carta, prepagata, contanti, risparmio). Più conti compatibili → nessuna scelta automatica, campo lasciato vuoto con warning.
- **Trasferimenti**: la direzione (`da...a...` o "sulla X dal Y" invertito) è riconosciuta con due pattern espliciti. Se nessuno dei due matcha, origine e destinazione restano `null` — non viene mai indovinato l'ordine dalla sola posizione delle parole.
- **Categorie**: solo le categorie canoniche già esistenti in `categoryManager.ts` (`BASE_CATEGORIES`), più una mappa di alias per parole comuni (supermercato, benzina, farmacia, ecc. — vedi il file per l'elenco completo). La variante legacy "svago e ristoranti" è sempre normalizzata a "Ristoranti & Svago". Nessuna categoria nuova viene mai creata dal parser: se non riconosciuta, propone "Altro Spese"/"Altre Entrate" con un warning esplicito, modificabile prima di confermare.

## 7. Sicurezza e privacy

- Nessuna chiamata di rete nel parser o nella modale di revisione — solo funzioni locali sincrone.
- Nessun audio viene mai gestito da questa feature (il riconoscimento vocale avviene interamente in Apple Shortcuts, fuori da FinDashboard).
- Il testo dettato non viene mai salvato come dato persistente a meno che l'utente non prema "Conferma movimento" — a quel punto diventa una `Transaction` normale, con `notes: "Inserito tramite comando vocale"` come unico segno distintivo.
- Input troncato a 500 caratteri e trattato sempre come testo puro (mai interpretato/eseguito) — verificato con un test dedicato che passa contenuto simile a HTML/script e conferma che non viene mai interpretato.

## 8. Limiti noti

- Nessun riconoscimento vocale diretto in-app (Web Speech API): fuori scope per questa fase, vedi proposta separata in fondo a `VOICE_SHORTCUT_SETUP.md`.
- Date relative diverse da oggi/ieri/domani/giorno+mese esplicito non sono supportate (richiedono selezione manuale).
- Il riconoscimento di "più conti compatibili" si basa su corrispondenza di etichetta o di `kind` — conti con etichette molto generiche o sovrapposte potrebbero risultare ambigui più spesso del necessario; è una scelta deliberata (mai indovinare) più che un limite da correggere.
- Non è stato implementato/richiesto alcun instradamento URL per l'app Electron: il deep-link è pensato per la PWA su iPhone.
