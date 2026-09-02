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

Nessun test di componenti React (React Testing Library) è ancora presente — solo logica pura (`utils/`). `FinanceContext.tsx` non è testato in isolamento (richiederebbe un setup React Testing Library non ancora configurato).

## Checklist di verifica manuale in browser (multi-conto + categorie)

Prima di considerare un cambiamento ai dati concluso:

1. Avvia `bun run dev`, apri l'app.
2. Controlla la console del browser: zero errori.
3. **Conti**: pagina "Conti" mostra i conti attesi con saldi corretti; il pulsante "Aggiungi Conto" si disabilita a 4/4; "Elimina" sparisce a 2 conti.
4. **Categorie**: apri "Nuovo Movimento" e il filtro categoria in alto — ogni categoria attesa compare **una sola volta**.
5. **Diagnostica**: tab "Audit Log" — ogni operazione compare una sola volta (non duplicata). Tab "Trasferimenti Incompleti" mostra solo i record realmente incompleti.
6. Ricarica la pagina 2-3 volte: i conteggi (movimenti, saldi, voci di audit log per una data migrazione) devono restare stabili — nessuna migrazione deve "ripetersi" ad ogni avvio.

Questa checklist è nata da bug reali trovati solo in verifica manuale (non dai test automatici) durante la sessione del 2026-09-02 — vedi `CATEGORY_MERGE_REPORT.md`.
