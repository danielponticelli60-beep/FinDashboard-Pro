# Guida ai Test

Prima guida test del progetto — inizia da questa sessione.

## Eseguire i test

```bash
bun run test      # vitest, tutti i test unitari
npx tsc --noEmit  # type-check
bun run build     # build di produzione
```

## Cosa è coperto oggi

| Modulo | File test | Cosa verifica |
|---|---|---|
| `utils/schemaMigration.ts` | `schemaMigration.test.ts` | Migrazione backup v1→v2 (Account[] generico), idempotenza, preservazione ID storici |
| `utils/accountRules.ts` | `accountRules.test.ts` | Limiti MIN 2 / MAX 4 conti |
| `utils/accountSummary.ts` | `accountSummary.test.ts` | Calcolo saldi per conto, aggregazione, esclusione trasferimenti incompleti |
| `utils/categoryMerge.ts` | `categoryMerge.test.ts` | Unificazione categorie duplicate: riclassificazione, idempotenza, non-ricomparsa nel catalogo, campi preservati |
| `features/voice/italianVoiceParser.ts` | `italianVoiceParser.test.ts` | Parser comandi vocali italiani: i 17 scenari richiesti (importi, date, conti, categorie, ambiguità, idempotenza, input malformato) + unit test sui singoli estrattori (importo, data, tipo) |

Nessun test di componenti React (React Testing Library) è ancora presente — solo logica pura (`utils/`, `features/voice/`). `FinanceContext.tsx` non è testato in isolamento (richiederebbe un setup React Testing Library non ancora configurato). Anche `VoiceCommandReviewModal.tsx` non ha test automatici propri — solo verifica manuale in browser (vedi sotto).

## Checklist di verifica manuale in browser (multi-conto + categorie)

Prima di considerare un cambiamento ai dati concluso:

1. Avvia `bun run dev`, apri l'app.
2. Controlla la console del browser: zero errori.
3. **Conti**: pagina "Conti" mostra i conti attesi con saldi corretti; il pulsante "Aggiungi Conto" si disabilita a 4/4; "Elimina" sparisce a 2 conti.
4. **Categorie**: apri "Nuovo Movimento" e il filtro categoria in alto — ogni categoria attesa compare **una sola volta**.
5. **Diagnostica**: tab "Audit Log" — ogni operazione compare una sola volta (non duplicata). Tab "Trasferimenti Incompleti" mostra solo i record realmente incompleti.
6. Ricarica la pagina 2-3 volte: i conteggi (movimenti, saldi, voci di audit log per una data migrazione) devono restare stabili — nessuna migrazione deve "ripetersi" ad ogni avvio.

Questa checklist è nata da bug reali trovati solo in verifica manuale (non dai test automatici) durante la sessione del 2026-09-02 — vedi `CATEGORY_MERGE_REPORT.md`.

## Checklist di verifica manuale — comando vocale

1. Apri `http://localhost:3000/?voiceCommand=Ho%20speso%2012%20euro%20e%2050%20al%20supermercato%20con%20la%20prepagata` (o incolla un URL simile nella barra indirizzi) — deve aprirsi direttamente la schermata "Revisione comando vocale" con i campi pre-compilati.
2. Verifica che l'URL nella barra indirizzi torni pulito (senza `?voiceCommand=...`) subito dopo l'apertura.
3. Prova viewport iPhone (393×852 e 430×932 in DevTools): nessuno scroll orizzontale, bottoni ≥44×44px, nessun testo tagliato.
4. Tocca **Annulla**: nessun movimento deve comparire in "Movimenti".
5. Riapri con lo stesso link, tocca **Conferma movimento**: il movimento deve comparire con i valori corretti; deve apparire il bottone "Annulla ultimo movimento".
6. Tocca "Annulla ultimo movimento": il movimento deve sparire, saldi e conteggi devono tornare come prima.
7. Prova un comando di trasferimento (es. `?voiceCommand=Trasferisci%20200%20euro%20dal%20conto%20corrente%20alla%20carta%20prepagata`): entrambi i saldi dei conti devono aggiornarsi, il totale aggregato deve restare invariato.
8. Prova un comando ambiguo/incompleto (es. solo `?voiceCommand=Ho%20speso%2010%20euro`): "Conferma movimento" deve restare disabilitato finché non completi manualmente i campi mancanti.
9. Controlla la sezione "Inserimento vocale" in Impostazioni & Backup: deve essere presente e leggibile.
10. Zero errori console in ogni passaggio.
