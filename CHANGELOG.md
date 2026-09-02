# Changelog

Primo changelog del progetto — inizia da questa sessione, non è retroattivo su tutta la storia del progetto. Vedi `git log` per la cronologia completa precedente.

## 2026-09-02 — Unificazione categorie duplicate

**Rimosso**: la categoria di sistema duplicata `Svago e ristoranti` (`svago_e_ristoranti`), che coesisteva erroneamente con `Ristoranti & Svago` (`ristoranti_e_svago`) in `BASE_CATEGORIES`.

**Migrato**: 15 transazioni reali riclassificate automaticamente alla categoria canonica `Ristoranti & Svago` al primo avvio dopo l'aggiornamento (migrazione idempotente, loggata in Audit Log).

**Corretto**: un bug per cui una transazione con `categoryId` già corretto ma `rawCategory` residuo poteva far ricomparire la categoria duplicata nei selettori dopo un ricaricamento del catalogo categorie.

**Corretto**: un bug per cui l'evento di migrazione veniva registrato due volte nell'Audit Log ad ogni avvio (effetto collaterale dentro una funzione di aggiornamento React, invocata più volte da StrictMode).

Dettagli completi: `CATEGORY_MERGE_REPORT.md`.
