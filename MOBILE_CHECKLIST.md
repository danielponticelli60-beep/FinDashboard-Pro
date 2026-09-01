# FinDashboard Pro — Audit Mobile & PWA-Readiness

**Data**: 2026-09-01
**Metodo**: analisi statica del codice attuale (non un test hands-on su dispositivo). Dove indicato "da verificare su device", è una lacuna che l'analisi statica non può confermare del tutto.

## Stato attuale (prima di qualunque modifica)

L'app è dichiaratamente **desktop-first** (`index.html`: `"Dashboard desktop-first professionale per la finanza personale"`) ma ha già una base responsive non banale:

- **165 varianti responsive Tailwind** in uso (`sm:` ×105, `md:` ×22, `lg:` ×38, `xl:` ×2) — la UI non è "fissa", ha già breakpoint pensati.
- La navbar (`src/components/layout/Navbar.tsx`) collassa già le etichette testuali a icona sotto `sm:`/`xl:` e diventa scrollabile orizzontalmente su schermi stretti (`overflow-x-auto w-full md:w-auto`).
- 10 componenti usano già `overflow-x-auto` per tabelle/liste larghe (pattern corretto per mobile, evita lo scroll orizzontale dell'intera pagina).
- Tema scuro fisso, nessun toggle chiaro/scuro — di fatto "dark mode" è già l'unico stato, quindi non c'è lavoro da fare lì (nessuna preferenza di sistema da rispettare, non essendoci un tema chiaro alternativo).

## Checklist

| Voce | Stato | Note |
|---|---|---|
| Meta viewport | ✅ presente | `width=device-width, initial-scale=1.0` in `index.html` |
| Breakpoint responsive | ✅ presente, esteso | 165 utilizzi `sm:/md:/lg:/xl:` nella codebase |
| No scroll orizzontale pagina intera | ✅ mitigato | tabelle/liste larghe usano `overflow-x-auto` locale |
| Touch target ≥ 44×44px (Apple HIG) | ⚠️ da verificare | 22 file usano padding molto stretto (`p-1`, `p-1.5`, `px-2 py-1`) su elementi cliccabili — probabile violazione HIG in più punti, da misurare su device |
| Font-size input ≥ 16px (evita zoom automatico iOS Safari) | ❌ non rispettato | es. l'input importo in `TransactionModal.tsx:354` usa `text-sm` (14px) — su iOS Safari il focus su un input <16px forza uno zoom automatico della pagina, esperienza fastidiosa su un form usato di frequente |
| Safe-area insets (notch / home indicator) | ❌ assente | nessun uso di `env(safe-area-inset-*)` in tutta la codebase |
| Manifest PWA (`manifest.json`) | ❌ assente | |
| Service Worker | ❌ assente | |
| Icone PWA (192/512/maskable, apple-touch-icon) | ❌ assenti | cartella `assets/` è sostanzialmente vuota |
| `theme-color` / meta Apple PWA | ❌ assenti | nessun `apple-mobile-web-app-*` in `index.html` |
| Bottom navigation mobile (thumb-friendly) | ❌ assente | la navigazione resta in alto e scrolla orizzontalmente; nessuna bottom-bar dedicata |
| Dark mode / `prefers-color-scheme` | N/A | tema scuro fisso, nessun tema chiaro da alternare |

## Lettura complessiva

Il gap più grande non è il layout responsive (già presente e ragionevole) ma **l'installabilità PWA**, che è a zero: nessun manifest, nessun service worker, nessuna icona. Prima di investire in feature PWA avanzate (offline, push, "aggiungi a Home Screen"), la base minima installabile non esiste ancora.

I due problemi concreti più economici da correggere, indipendentemente da qualunque lavoro PWA:
1. **Font-size input < 16px** → zoom automatico fastidioso su iOS Safari ad ogni focus di un campo (impatta l'inserimento transazioni, il flusso più frequente dell'app).
2. **Touch target sotto 44px** in ~22 file → tap accidentali/mancati su mobile, da campionare e correggere nei punti a densità più alta (barre azioni, filtri, tabelle).

Nessuna di queste due voci richiede un service worker o un manifest: sono fix CSS localizzati, a basso rischio, indipendenti dal resto della FASE 5.
