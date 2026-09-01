# FinDashboard Pro — Report di Pre-Migrazione (Account[] generico)

**Data**: 2026-09-01
**Fonte**: `FinDashboard-Pro_backup_2026-09-01_17-49.json`, fornito da Daniel come backup reale esportato da Impostazioni & Backup.
**Stato**: solo analisi. **Nessuna scrittura sul database live. Nessuna modifica al backup originale.**

## 0. Provenienza e integrità del file

- Originale: `~/Downloads/FinDashboard-Pro_backup_2026-09-01_17-49.json` — **non toccato**.
- Copia di lavoro: `scratchpad/migration-work/backup-working-copy.json` (fuori dal repo).
- Checksum SHA-256 originale = copia di lavoro: `3bf099e5029f5095185ad8b5ed89fc0e3c90fabc2e8e14ae2a99fb1bda2b4d74` (verificato identico prima di ogni analisi).
- JSON valido, `schemaVersion: 1`, `appVersion: 1.2.0`.

## 1. Inventario completo

| Voce | Valore |
|---|---|
| Transazioni totali | **40** — income: 3, expense: 33, transfer: 4 |
| Stato transazioni | tutte `completed` (nessuna `pending`) |
| Sorgente transazioni | Manuale: 12, Excel personale: 28 |
| Categorie canoniche dichiarate (`categories`) | 10 expense + 5 income |
| Valori `category` grezzi distinti nelle transazioni | 11 (alcuni non coincidono testualmente con l'elenco canonico, es. "Svago e ristoranti" vs "Ristoranti & Svago" — riflette il sistema di migrazione categorie già esistente in `categoryManager.ts`, non un errore introdotto ora) |
| `mainAccountConfig` | presente, `id: main_account`, saldo iniziale 3075€, configurato |
| `prepaidCardConfig` | presente, `id: prepaid_card`, saldo iniziale 54.68€, configurato |
| `accountId` distinti nelle transazioni | `main_account` (5), `prepaid_card` (34), **`cash_account` (1, senza config)** |
| `fromAccountId` non-null | 1 occorrenza (`main_account`) |
| `toAccountId` non-null | 1 occorrenza (`prepaid_card`) |
| `wealthAssets`/`wealthItems`/`financialGoals` | 0 record (vuoti) |
| `allocationRules` | 11 record |
| `auditLogs` | 122 record |
| `importPresets` | 1 record |
| id duplicati | **nessuno** |
| record quasi-duplicati sospetti (stessa data+importo+descrizione+tipo) | **nessuno** |

## 2. Problemi trovati che richiedono una tua decisione (per la regola #15 che hai posto)

### 🔴 A. `accountId: 'cash_account'` senza alcuna configurazione — 1 transazione

```
tx-xls-20260814-14634a4f — Entrata, 100€, 14/08/2026, "Entrata da file"
categoria: Stipendio e compensi · account: "Contanti" · accountLabel: "Contanti"
importata da Excel (riga 9), nessun controlBalance/riconciliazione mai esistiti per questo conto
```

Non esiste né è mai esistita una config per `cash_account` nel backup (solo `mainAccountConfig` e `prepaidCardConfig`). `'Contanti'` esiste solo come valore libero nell'enum `AccountType`, mai promosso a conto vero.

**Non ho assegnato questa transazione a nessun altro conto.** Due strategie possibili, a tua scelta:

- **Opzione A1 — Promuovi a terzo conto configurato**: `cash_account`/"Contanti" diventa il 3° dei 4 slot disponibili, con `initialBalance: 0` (nessun saldo storico noto) e `initialDate` = data di questa transazione o data di apertura conto principale, a tua scelta.
- **Opzione A2 — Mantienilo "legacy non configurato"**: la transazione conserva `accountId: 'cash_account'` esattamente com'è, ma non viene contata tra i 2-4 conti "veri" del nuovo modello; compare nell'UI con un badge tipo "conto non configurato" finché non lo promuovi tu manualmente in futuro.

### 🔴 B. 3 transazioni `type: 'transfer'` su 4 senza `fromAccountId`/`toAccountId`

Tutte e 3 importate dallo stesso batch Excel, tutte con `accountId: main_account`, `rawCategory: "Stipendio e compensi"` ma ri-etichettate `category/categoryLabel: "Giroconto / Trasferimento"`:

```
tx-xls-20260810-416765aa — 200€, 10/08/2026, "Spesa da file" (riga 17)
tx-xls-20260728-40d29150 — 200€, 28/07/2026, "Spesa da file" (riga 28)
tx-xls-20260727-0d7358fb —  25€, 27/07/2026, "Spesa da file" (riga 29)
```

Per confronto, l'**unica** transazione transfer strutturalmente completa è manuale, non da Excel:
```
tx-man-1787217470893-tiwff — 200€, 20/08/2026, "ricarica prepagata"
fromAccountId: main_account → toAccountId: prepaid_card
```

Lo schema (importi tondi, stesso conto sorgente, stessa etichetta categoria) è compatibile con altre ricariche main_account→prepaid_card, ma **non lo presumo**: sarebbe esattamente il tipo di inferenza semantica automatica che hai vietato. Due strategie:

- **Opzione B1**: confermi tu, riga per riga, che sono effettivamente `main_account → prepaid_card` (o mi dici la destinazione corretta per ciascuna) e le completo di conseguenza.
- **Opzione B2**: le lascio `type: transfer` con tutti i campi originali intatti (nessuna trasformazione in entrata/uscita, come richiesto), aggiungendo solo un campo opzionale nuovo `transferAccountsIncomplete: true` per segnalarle nella UI Diagnostica come "da completare manualmente" — nessun dato esistente toccato, nessuna inferenza.

### 🟡 C. Incoerenza `accountLabel`/`paymentMethod` per `prepaid_card` (informativo, non bloccante)

22 transazioni hanno `accountLabel: "Carta prepagata"` (`paymentMethod: null`); 12 hanno `accountLabel: "Carta prepagata / Carta di credito"` (`paymentMethod: "Carta prepagata / Carta di credito"`) — stesso `accountId: prepaid_card` in entrambi i casi. Coerente con `mainAccountConfig.cardDebitMode: "separate_account"` + `linkedMethods: ["Carta prepagata"]` già presenti nel backup: sembra riflettere una carta di credito collegata e addebitata sulla prepagata, non un errore di dati. Non richiede una tua decisione per procedere, salvo che tu voglia che diventi un conto/etichetta distinta nel nuovo modello a 4 slot.

## 3. Cosa NON è stato trovato (rassicurazioni)

- Nessun id di transazione duplicato.
- Nessuna transazione non-transfer con `fromAccountId`/`toAccountId` valorizzati per errore.
- Nessun record sospetto di duplicazione (stessa data+importo+descrizione+tipo).
- I 122 audit log e le altre entità (wealth, goals, allocation, import presets) non sono stati toccati né richiedono cambi per la migrazione.

## 4. Prossimo passo

In attesa delle tue decisioni su **A** e **B** prima di scrivere qualunque script di migrazione o dry-run, come da tua istruzione esplicita. Non procedo oltre l'analisi finché non mi confermi.
