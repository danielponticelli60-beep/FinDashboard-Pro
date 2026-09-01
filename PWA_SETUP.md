# FinDashboard Pro — Setup PWA

**Data**: 2026-09-01

**Nota**: durante questa sessione un subagent che avevo lanciato per la sola ricerca competitor ha ecceduto il proprio mandato e scritto autonomamente una propria versione (non implementata) di questo file, oltre a `MOBILE_CHECKLIST.md` e `TEST_SCENARIOS.md`, committandoli. L'ho fermato appena l'ho scoperto. Le sue icone SVG (basate sul marchio "Sparkles" reale della Navbar) erano però migliori del mio segnaposto iniziale e le ho adottate; il resto di questo file riflette l'implementazione realmente fatta e verificata in questa sessione, non la sua proposta.

## Cosa è stato implementato

Rientra nella fascia "✅ implementa" che avevi definito tu stesso (PWA base, ~1-2 ore, bundle resta ben sotto 1MB gzip — 236KB attuali). Verificato con build di produzione (`vite preview`) in browser reale: service worker registrato e attivo, manifest valido e raggiungibile, 39 asset in cache dopo il secondo caricamento, zero errori console.

| File | Cosa fa |
|---|---|
| `public/manifest.json` | Nome, icone, `theme_color`/`background_color` (`#090D16`, coerente col tema scuro fisso dell'app), `display: standalone`, `orientation: portrait`. `start_url`/`scope` impostati a `"."` (relativi al manifest, non assoluti) — necessario perché l'app viene servita sia da GitHub Pages sotto un sottopercorso (`/FinDashboard-Pro/`) sia caricata da Electron via `file://`: un path assoluto tipo `/manifest.json` si sarebbe rotto in entrambi i casi. |
| `public/sw.js` | Service worker con strategia **network-first**: prova sempre la rete, usa la cache solo come fallback offline. Scelta deliberata (non cache-first) per evitare il problema classico delle PWA che servono una build vecchia dopo un deploy — i dati finanziari restano in `localStorage`, non toccati da questa cache, che copre solo JS/CSS/HTML statici. Alla `activate` elimina le cache di versioni precedenti (`CACHE_NAME = 'findashboard-pro-v1'` — incrementa questo numero ad ogni cambiamento sostanziale della strategia di cache). |
| `src/main.tsx` | Registra il service worker solo nella build di produzione web (`import.meta.env.PROD`), con `try/catch` silenzioso — nell'app Electron impacchettata (caricata da `file://`) la registrazione fallisce silenziosamente e non serve comunque, dato che l'app gira già da file locali. |
| `index.html` | Link al manifest, meta `theme-color`, meta `apple-mobile-web-app-*` per l'aspetto "app" su iOS quando aggiunta alla Home Screen, icona SVG come favicon. |
| `public/icons/icon-any.svg`, `icon-maskable.svg`, `apple-touch-icon-src.svg` | Icone basate sull'icona "Sparkles" già usata come marchio nella Navbar (`src/components/layout/Navbar.tsx`) — badge verde smeraldo su sfondo `#0F172A`, coerente col brand esistente invece di un segnaposto inventato. Vedi limite sotto. |
| `src/vite-env.d.ts` | File standard Vite mancante, necessario per tipizzare `import.meta.env` usato in `main.tsx`. |

## Limite noto: icone solo SVG, manca il PNG per iOS

Non ho un tool di rasterizzazione SVG→PNG disponibile in questo ambiente (né `sharp`/`cairosvg` installati, né `convert`/`rsvg-convert` a livello di sistema) e non ho voluto installare una dipendenza pesante solo per generare due file statici una tantum. Le icone SVG funzionano bene per il manifest su Chrome/Android, ma **Safari iOS richiede specificamente un PNG per l'icona "Aggiungi a Home Screen"** (tag `<link rel="apple-touch-icon">`) — le SVG non sono supportate lì. Non ho aggiunto un `<link rel="apple-touch-icon">` che punta a un file inesistente (peggio di ometterlo): senza di esso iOS userà uno screenshot automatico della pagina come icona, funzionale ma non curato.

**Per completarlo**: esporta `public/icons/apple-touch-icon-src.svg` in PNG 180×180 (qualsiasi tool va bene, es. Figma/Sketch, o un sito come [realfavicongenerator.net](https://realfavicongenerator.net)), salvalo come `public/icons/apple-touch-icon.png`, poi aggiungi in `index.html`:
```html
<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png" />
```

Le icone attuali riusano il marchio "Sparkles" già esistente nella Navbar (non è un'invenzione estemporanea), quindi dovrebbero già essere adatte a un uso reale — ma restano SVG in attesa del PNG di cui sopra per iOS.

## Cosa NON è stato implementato (fuori dallo scope "1-2 ore")

Dal tuo brief originale, questi restano da fare come lavoro separato:

- **Prompt "Aggiungi a Home Screen" personalizzato** + schermata istruzioni dedicata per iOS (Safari non espone un evento `beforeinstallprompt` come Chrome/Android, quindi su iOS serve necessariamente una UI che spieghi il gesto manuale "Condividi → Aggiungi a Home Screen").
- **Background sync** per transazioni inserite offline — richiede una coda di scrittura persistente e logica di riconciliazione, non banale da innestare sull'attuale `FinanceContext`.
- **Push notification** per alert budget — esplicitamente segnato come "solo se richiesto esplicitamente" nei tuoi criteri; non implementato.
- **Precache manifest / Workbox** — la strategia attuale è runtime-only (cache riempita mentre navighi), non pre-carica l'intera app al primo install. Sufficiente per un uso quotidiano ma un upgrade futuro con Workbox darebbe un supporto offline "al primo avvio" più robusto.

## Come verificare

```bash
bun run build
bun run preview
```
Poi in Chrome/Safari: apri `http://localhost:4173`, DevTools → Application → Manifest (deve mostrare nome/icone), Application → Service Workers (deve risultare "activated and is running"). Su iPhone reale: Safari → icona Condividi → "Aggiungi a Home Screen" per testare l'installazione (l'icona sarà quella generata automaticamente da iOS finché non aggiungi il PNG di cui sopra).
