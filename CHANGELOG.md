# Changelog

Primo changelog del progetto — inizia da questa sessione, non è retroattivo su tutta la storia del progetto. Vedi `git log` per la cronologia completa precedente.

## 2026-09-03 — Inserimento movimenti via comando vocale (Apple Shortcuts)

**Aggiunto**: possibilità di registrare un movimento dettando un comando in italiano tramite uno Shortcut Apple dedicato ("Registra movimento"), che apre FinDashboard con il testo pronto per la revisione.

- **Input**: testo proveniente da uno Shortcut Apple (Detta testo → Codifica URL → Apri URL), tramite deep-link `https://[app]/?voiceCommand=...`. Nessun riconoscimento audio diretto in questa fase.
- **Parser locale**: interamente deterministico, italiano, nessuna chiamata di rete, nessun invio di audio o testo a server esterni.
- **Conferma sempre obbligatoria**: nessun movimento viene mai salvato senza un tap esplicito su "Conferma movimento" nella schermata di revisione. "Annulla" non salva nulla; "Annulla ultimo movimento" è disponibile subito dopo la conferma.
- **Nessuna integrazione Gemini/API cloud**: il pulsante Gemini Live esistente resta un'app separata, non collegata ai dati finanziari.
- Copre uscite, entrate e trasferimenti tra conti (risolti dinamicamente contro la lista `accounts[]` reale dell'utente, non hardcoded).
- 70 test automatici (parser + estrattori), inclusi 2 bug reali trovati e corretti durante i test (parsing di importi a 4+ cifre senza separatore delle migliaia; comandi senza verbo esplicito tipo "8 euro autobus in contanti").

Dettagli tecnici: `VOICE_INPUT_SPEC.md`. Guida di configurazione iPhone: `VOICE_SHORTCUT_SETUP.md` (richiede la pubblicazione dell'app su un URL HTTPS pubblico, non ancora confermata).

## 2026-09-02 — Unificazione categorie duplicate

**Rimosso**: la categoria di sistema duplicata `Svago e ristoranti` (`svago_e_ristoranti`), che coesisteva erroneamente con `Ristoranti & Svago` (`ristoranti_e_svago`) in `BASE_CATEGORIES`.

**Migrato**: 15 transazioni reali riclassificate automaticamente alla categoria canonica `Ristoranti & Svago` al primo avvio dopo l'aggiornamento (migrazione idempotente, loggata in Audit Log).

**Corretto**: un bug per cui una transazione con `categoryId` già corretto ma `rawCategory` residuo poteva far ricomparire la categoria duplicata nei selettori dopo un ricaricamento del catalogo categorie.

**Corretto**: un bug per cui l'evento di migrazione veniva registrato due volte nell'Audit Log ad ogni avvio (effetto collaterale dentro una funzione di aggiornamento React, invocata più volte da StrictMode).

Dettagli completi: `CATEGORY_MERGE_REPORT.md`.
