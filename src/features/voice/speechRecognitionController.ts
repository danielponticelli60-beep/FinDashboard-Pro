/**
 * Thin, framework-agnostic wrapper around the browser's Web Speech API
 * (SpeechRecognition / webkitSpeechRecognition). No network calls, no
 * audio or text ever leaves the device - recognition is entirely handled
 * by the browser/OS. Kept independent of React so the state machine can
 * be unit-tested directly, the same way the rest of this feature's pure
 * logic (italianVoiceParser.ts) is tested.
 */

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;

  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;

  start(): void;
  stop(): void;
  abort(): void;
}

declare const SpeechRecognition: SpeechRecognitionConstructor | undefined;

export type VoiceRecognitionStatus = 'idle' | 'listening' | 'processing' | 'error';

export interface VoiceRecognitionError {
  code: string;
  message: string;
}

export interface SpeechRecognitionController {
  readonly status: VoiceRecognitionStatus;
  readonly error: VoiceRecognitionError | null;
  readonly transcript: string;
  readonly isSupported: boolean;

  start(): void;
  stop(): void;
  cancel(): void;
  dispose(): void;

  setStatusListener(listener: (status: VoiceRecognitionStatus) => void): void;
  setErrorListener(listener: (error: VoiceRecognitionError | null) => void): void;
  setTranscriptListener(listener: (transcript: string) => void): void;
}

export function describeRecognitionError(code: string, message?: string): VoiceRecognitionError {
  const userMessages: Record<string, string> = {
    'no-speech': 'Nessun audio rilevato. Riprova in un ambiente più silenzioso.',
    'aborted': 'Riconoscimento interrotto.',
    'audio-capture': 'Nessun microfono disponibile. Verifica le autorizzazioni.',
    'network': 'Errore di rete durante il riconoscimento. Riprova.',
    'not-allowed': 'Autorizzazione microfono negata. Consenti l\'accesso nelle impostazioni.',
    'service-not-allowed': 'Servizio di riconoscimento non consentito.',
    'bad-grammar': 'Grammatica non valida (errore interno).',
    'language-not-supported': 'Lingua non supportata.',
  };

  const userMessage = userMessages[code] ?? message ?? 'Errore di riconoscimento vocale.';

  return {
    code,
    message: userMessage,
  };
}

export function isSpeechRecognitionSupported(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    (('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window))
  );
}

export function createSpeechRecognitionController(): SpeechRecognitionController {
  let status: VoiceRecognitionStatus = 'idle';
  let error: VoiceRecognitionError | null = null;
  let transcript = '';
  let recognition: SpeechRecognition | null = null;

  let statusListener: ((status: VoiceRecognitionStatus) => void) | null = null;
  let errorListener: ((error: VoiceRecognitionError | null) => void) | null = null;
  let transcriptListener: ((transcript: string) => void) | null = null;

  function setStatus(newStatus: VoiceRecognitionStatus) {
    status = newStatus;
    statusListener?.(status);
  }

  function setError(newError: VoiceRecognitionError | null) {
    error = newError;
    errorListener?.(error);
  }

  function setTranscript(newTranscript: string) {
    transcript = newTranscript;
    transcriptListener?.(transcript);
  }

  function createRecognitionInstance(): SpeechRecognition | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const Ctor = (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor })
      .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;

    if (!Ctor) {
      return null;
    }

    const instance = new Ctor();
    instance.lang = 'it-IT';
    instance.continuous = false;
    instance.interimResults = true;
    instance.maxAlternatives = 3;

    return instance;
  }

  return {
    get status() {
      return status;
    },
    get error() {
      return error;
    },
    get transcript() {
      return transcript;
    },
    get isSupported() {
      return isSpeechRecognitionSupported();
    },

    start() {
      if (!this.isSupported) {
        setError({
          code: 'not-supported',
          message: 'Il riconoscimento vocale non è supportato da questo browser.',
        });
        return;
      }

      if (status === 'listening' || status === 'processing') {
        return;
      }

      setError(null);
      setTranscript('');

      recognition = createRecognitionInstance();
      if (!recognition) {
        setError({
          code: 'not-supported',
          message: 'Il riconoscimento vocale non è supportato da questo browser.',
        });
        return;
      }

      recognition.onstart = () => {
        setStatus('listening');
      };

      recognition.onend = () => {
        if (status === 'listening') {
          if (transcript.trim().length > 0) {
            setStatus('processing');
          } else {
            setStatus('idle');
          }
        }
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const alternative = result.item(0);
          if (result.isFinal) {
            finalTranscript += alternative.transcript;
          } else {
            interimTranscript += alternative.transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const err = describeRecognitionError(event.error, event.message);
        setError(err);
        setStatus('error');
      };

      try {
        recognition.start();
        setStatus('listening');
      } catch {
        setError({
          code: 'unknown',
          message: 'Impossibile avviare il riconoscimento vocale.',
        });
        setStatus('error');
      }
    },

    stop() {
      if (recognition && status === 'listening') {
        try {
          recognition.stop();
        } catch {
          // Ignore
        }
      }
    },

    cancel() {
      if (recognition && (status === 'listening' || status === 'processing')) {
        try {
          recognition.abort();
        } catch {
          // Ignore
        }
      }
      setStatus('idle');
      setError(null);
      setTranscript('');
      recognition = null;
    },

    dispose() {
      this.cancel();
      statusListener = null;
      errorListener = null;
      transcriptListener = null;
    },

    setStatusListener(listener: (status: VoiceRecognitionStatus) => void) {
      statusListener = listener;
    },

    setErrorListener(listener: (error: VoiceRecognitionError | null) => void) {
      errorListener = listener;
    },

    setTranscriptListener(listener: (transcript: string) => void) {
      transcriptListener = listener;
    },
  };
}
