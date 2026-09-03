# Setup dello Shortcut Apple "Registra movimento"

**Data**: 2026-09-03

## ⚠️ Blocco attuale: serve un URL HTTPS pubblico

Questo Shortcut funziona **solo quando FinDashboard Pro è raggiungibile da un indirizzo HTTPS pubblico** (es. GitHub Pages, o un dominio tuo). Al momento il repository ha un workflow di deploy su GitHub Pages configurato (`.github/workflows/deploy.yml`) ma non ho verifica diretta che sia effettivamente pubblicato e raggiungibile da questa sessione. **Non dare per scontato che lo Shortcut sia già utilizzabile dalla Lock Screen finché non hai confermato tu stesso l'URL pubblico reale.**

Una PWA richiede HTTPS sia per essere installata sulla schermata Home sia per funzionare in modo affidabile fuori dalla rete locale (Safari su iOS blocca/limita molte funzionalità PWA su HTTP semplice). `http://localhost:3000` (usato in sviluppo) **non funziona da iPhone reale** fuori dalla stessa rete Wi-Fi del Mac che esegue il server di sviluppo.

Quando avrai l'URL pubblico definitivo, sostituiscilo ovunque in questa guida al posto di `[DOMINIO-APP]`.

---

## Creare lo Shortcut "Registra movimento"

1. Apri l'app **Comandi Rapidi** (Shortcuts) su iPhone.
2. Tocca **+** in alto per creare un nuovo Shortcut.
3. Aggiungi le azioni in quest'ordine:

   **Azione 1 — Detta testo**
   - Cerca "Detta testo" nella libreria azioni.
   - Lingua: **Italiano**.
   - Interrompi ascolto: **Dopo una pausa**.

   **Azione 2 — Codifica URL**
   - Cerca "Codifica URL" (URL-Encode).
   - Input: il risultato dell'azione precedente (**Testo dettato**).

   **Azione 3 — Testo**
   - Aggiungi un'azione "Testo".
   - Componi:
     ```text
     https://[DOMINIO-APP]/?voiceCommand=[Codifica URL]
     ```
     (inserisci il risultato dell'azione "Codifica URL" al posto di `[Codifica URL]`, usando il menu variabili di Shortcuts — tocca il campo e seleziona la variabile invece di scriverla a mano).

   **Azione 4 — Apri URL**
   - Cerca "Apri URL" (Open URLs).
   - Input: il **Testo** composto al passo precedente.

4. Tocca il nome dello Shortcut in alto (di solito "Nuovo Shortcut") e rinominalo **"Registra movimento"**.
5. Scegli un'icona riconoscibile (es. un simbolo €, o un microfono) per trovarlo facilmente.
6. Tocca **Fine** per salvare.

## Aggiungerlo alla Lock Screen / Action Button / Control Center

**Lock Screen (iOS 16+)**:
1. Tieni premuto sulla schermata di blocco finché non compare "Personalizza".
2. Tocca il widget degli Shortcut (o aggiungine uno nuovo).
3. Seleziona "Registra movimento" dall'elenco.

**Action Button (iPhone 15 Pro e successivi)**:
1. Impostazioni → Tasto Azione.
2. Scorri fino a "Comando Rapido" e seleziona "Registra movimento".

**Control Center**:
1. Impostazioni → Centro di Controllo.
2. Aggiungi il controllo "Comandi Rapidi", poi personalizzalo per includere "Registra movimento" (o accedilo dal pannello Comandi Rapidi nel Centro di Controllo).

## Come si usa

1. Attiva lo Shortcut (dalla Lock Screen, Action Button o Control Center).
2. Detta il comando in modo naturale, es. *"Ho speso 12 euro e 50 al supermercato con la prepagata"*.
3. Attendi la breve pausa: lo Shortcut interrompe l'ascolto automaticamente.
4. Si apre FinDashboard Pro (o torna in primo piano se già aperta), direttamente sulla schermata **"Revisione comando vocale"**.
5. Controlla i campi pre-compilati (tipo, importo, categoria, conto, data, descrizione) — modificali se necessario.
6. Tocca **"Conferma movimento"**. Il movimento non viene mai salvato prima di questo tap esplicito.
7. Se qualcosa non va, tocca semplicemente **"Annulla"**: nulla viene registrato, e puoi comunque inserire il movimento a mano dal form classico ("+ Nuovo Movimento") come hai sempre fatto.

## Se il parser interpreta male il comando

Il parser è deterministico e locale, non un'intelligenza artificiale — riconosce solo i pattern descritti in `VOICE_INPUT_SPEC.md`. Se un comando non viene interpretato correttamente:
- Puoi modificare qualsiasi campo direttamente nella schermata di revisione prima di confermare.
- Puoi annullare e usare il form manuale "+ Nuovo Movimento", identico a prima e sempre disponibile.
- Prova a riformulare usando le parole chiave esatte elencate in `VOICE_INPUT_SPEC.md` (es. "speso"/"pagato" per le uscite, "ricevuto"/"stipendio" per le entrate, "trasferisci"/"dal...al..." per i giroconti).

---

## Uso con Gemini Live

Il pulsante che oggi apre Gemini Live gratuito può continuare a farlo, senza modifiche: **Gemini Live è e resta un'app separata**, non collegata a FinDashboard.

- Gemini Live **non è mai stato integrato automaticamente** con i tuoi dati finanziari, né con questa implementazione né in nessuna versione precedente di FinDashboard Pro. Non esiste alcuna chiamata API verso servizi Google in questo progetto (verificato: nessuna dipendenza, nessuna chiave API, nessuna chiamata di rete nel codice del parser vocale o della modale di revisione).
- Per registrare un movimento in modo affidabile e verificato, usa il nuovo Shortcut **"Registra movimento"** descritto sopra — è lui a parlare con FinDashboard, non Gemini.
- Se vuoi, puoi comunque usare Gemini Live per **formulare o verificare a voce** un comando prima di dettarlo nello Shortcut (es. chiedendogli "come dovrei dire una spesa di 12 euro al supermercato?") — ma il movimento va sempre inserito e confermato tramite FinDashboard, non tramite Gemini.

---

## Proposta separata (non implementata): riconoscimento vocale diretto in-app

Fuori dallo scope di questa fase, come richiesto. Se in futuro si volesse un riconoscimento vocale diretto dentro l'app (senza passare da Apple Shortcuts), la strada più naturale sarebbe la **Web Speech API** del browser (`SpeechRecognition`), con:
- riconoscimento vocale gestito interamente dal browser (su iOS Safari, tramite il motore di dettatura di sistema — nessun invio audio a server di FinDashboard);
- lo stesso parser italiano già costruito qui (`italianVoiceParser.ts`) riutilizzato senza modifiche, dato che è già disaccoppiato dalla sorgente del testo;
- un pulsante microfono nell'interfaccia stessa dell'app, alternativo (non sostitutivo) al flusso Shortcut.

Non è stata implementata in questa sessione, come esplicitamente richiesto — resta una proposta da valutare a parte, con una sua spec dedicata se e quando la vorrai.
