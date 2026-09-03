import React from 'react';
import { Mic, ShieldCheck, ExternalLink } from 'lucide-react';

/**
 * Static informational panel - no logic, no state. Explains the voice
 * command feature and links conceptually to VOICE_SHORTCUT_SETUP.md
 * (Apple Shortcuts setup instructions live there, not in the app itself,
 * since they involve steps performed in the iOS Shortcuts app).
 */
export const VoiceCommandHelp: React.FC = () => (
  <div className="bg-[#111C38] border border-violet-500/30 rounded-2xl p-5 shadow-lg">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
        <Mic className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-100">Inserimento vocale (da iPhone)</h3>
        <p className="text-xs text-slate-400">Detta un movimento tramite uno Shortcut Apple, poi confermalo qui</p>
      </div>
    </div>

    <div className="space-y-2 text-xs text-slate-300">
      <p>
        Crea lo Shortcut &ldquo;Registra movimento&rdquo; sul tuo iPhone (Detta testo → Codifica URL → Apri URL) per aprire
        FinDashboard con il comando dettato pronto per la revisione. Il movimento <strong>non viene mai salvato
        automaticamente</strong>: dovrai sempre premere &ldquo;Conferma movimento&rdquo;.
      </p>
      <p>Esempi di comandi supportati:</p>
      <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
        <li>&ldquo;Ho speso 12 euro e 50 al supermercato con la prepagata&rdquo;</li>
        <li>&ldquo;Ho ricevuto 1300 euro di stipendio sul conto corrente&rdquo;</li>
        <li>&ldquo;Trasferisci 200 euro dal conto corrente alla carta prepagata&rdquo;</li>
      </ul>
    </div>

    <div className="mt-3 pt-3 border-t border-slate-800 flex items-start gap-2 text-[11px] text-slate-500">
      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
      <span>
        Il testo dettato viene interpretato solo localmente sul dispositivo, nessun audio o testo viene inviato a
        server esterni da FinDashboard. Istruzioni complete per creare lo Shortcut: file <code>VOICE_SHORTCUT_SETUP.md</code> nel progetto.
      </span>
    </div>
    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-violet-300">
      <ExternalLink className="w-3 h-3" />
      <span>Funziona solo quando l&apos;app è pubblicata su un indirizzo HTTPS pubblico (non in locale).</span>
    </div>
  </div>
);
