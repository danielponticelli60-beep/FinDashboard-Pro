# FinDashboard Pro — Piano PWA / iOS Installabilità

**Stato**: proposta/spec, non ancora implementata. Vedi `MOBILE_CHECKLIST.md` per l'audit dello stato attuale (zero infrastruttura PWA esistente).

## Perché è una proposta e non un'implementazione diretta

Trasformare l'app in una PWA installabile tocca comportamenti runtime nuovi (caching, offline, install prompt) su un'app che gestisce dati finanziari reali in `localStorage`. Un service worker configurato male può servire asset stantii dopo un deploy o, in scenari peggiori, interferire con l'accesso ai dati — per questo lo tratto come le altre modifiche strutturali della FASE 4 ("chiedi conferma" per feature nuova sostanziale), non come un quick-win.

## Blocco preliminare: manca un'icona

Il repo non contiene nessun logo/icona (`assets/` ha solo un file di tooling `.gitignore`). Il marchio visivo attuale nella Navbar è l'icona Lucide "Sparkles" su sfondo verde smeraldo. Prima di generare le icone PWA (192×192, 512×512, maskable, apple-touch-icon 180×180) serve una decisione: uso quell'icona Sparkles come base per un'icona quadrata a tinta unita, oppure hai un logo tuo da fornire?

## Cosa implementerei (in ordine)

### 1. `public/manifest.json`
```json
{
  "name": "FinDashboard Pro",
  "short_name": "FinDash",
  "description": "Gestione Finanze & Patrimonio Personale",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#090D16",
  "theme_color": "#090D16",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
`background_color`/`theme_color` allineati al tema scuro fisso dell'app (`#090D16`, già usato in `index.html`).

### 2. Meta tag iOS in `index.html`
```html
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="FinDashboard" />
<meta name="theme-color" content="#090D16" />
```
Nota: `black-translucent` richiede poi gestire il safe-area inset in alto via CSS (`env(safe-area-inset-top)`) sulla Navbar, altrimenti il contenuto finisce sotto la status bar — punto già segnalato in `MOBILE_CHECKLIST.md`.

### 3. Service worker — strategia minima e conservativa
Userei **Workbox** via `vite-plugin-pwa` (libreria matura, non richiede scrivere a mano la cache-invalidation logic — un service worker scritto a mano è il modo più comune di introdurre bug "l'utente vede la versione vecchia dopo un deploy"):
- **Cache-first** per asset statici con hash nel nome (i chunk JS/CSS di Vite già lo sono)
- **Network-first con fallback cache** per `index.html` (evita di bloccare l'utente su una versione vecchia della shell se offline)
- **Nessun caching dei dati applicativi**: transazioni/conti/budget restano solo in `localStorage`, il service worker non li tocca — non c'è nulla da sincronizzare, l'app è già 100% locale
- Aggiornamento: prompt "Nuova versione disponibile, ricarica" quando un service worker nuovo è pronto, invece di sostituire silenziosamente (evita che un refresh a metà sessione perda lo stato di un form aperto)

`vite-plugin-pwa` aggiungerebbe una dipendenza dev (`~50-80KB` la libreria in sé, zero impatto sul bundle prod perché genera il SW a build time). Coerente con il criterio della tua FASE 4 ("dipendenza nuova pesante >50KB → chiedi conferma") — la cito esplicitamente qui per lo stesso motivo.

### 4. Install prompt personalizzato
- Su Android/desktop Chrome: intercettare `beforeinstallprompt`, mostrare un bottone "Installa app" invece del prompt automatico del browser
- **Su iOS Safari non esiste `beforeinstallprompt`**: l'unico modo per installare è "Condividi → Aggiungi a Home", quindi serve una schermata/banner dedicata con le istruzioni testuali per iOS (rilevabile via `navigator.userAgent` o, meglio, via un feature-detect su `standalone` in `navigator`)

## Target Lighthouse (dal tuo brief originale)
Performance ≥85, Accessibility ≥90, Best Practices ≥90, SEO ≥90, PWA 100 — non misurabili finché manifest/SW/icone non esistono. Una volta implementato il punto 1-3, andrebbe fatto un run reale (`npx lighthouse http://localhost:3000 --view` con `bun run build && bun run preview`) per avere numeri veri invece di stime.

## Prossimo passo
Fammi sapere: (a) come vuoi gestire l'icona, (b) se vuoi che proceda con `vite-plugin-pwa` o preferisci una soluzione senza dipendenze nuove (service worker scritto a mano, più controllo ma più superficie per bug), (c) se vuoi che proceda subito o prima vedere questo piano.
