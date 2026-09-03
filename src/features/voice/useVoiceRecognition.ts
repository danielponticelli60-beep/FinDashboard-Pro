import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createSpeechRecognitionController,
  isSpeechRecognitionSupported,
  SpeechRecognitionController,
  VoiceRecognitionError,
  VoiceRecognitionStatus,
} from './speechRecognitionController';

export interface UseVoiceRecognitionReturn {
  status: VoiceRecognitionStatus;
  error: VoiceRecognitionError | null;
  transcript: string;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  cancel: () => void;
}

export function useVoiceRecognition(): UseVoiceRecognitionReturn {
  const controllerRef = useRef<SpeechRecognitionController | null>(null);
  const [status, setStatus] = useState<VoiceRecognitionStatus>('idle');
  const [error, setError] = useState<VoiceRecognitionError | null>(null);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    const controller = createSpeechRecognitionController();
    controllerRef.current = controller;

    controller.setStatusListener((newStatus) => {
      setStatus(newStatus);
    });

    controller.setErrorListener((newError) => {
      setError(newError);
    });

    controller.setTranscriptListener((newTranscript) => {
      setTranscript(newTranscript);
    });

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  const startListening = useCallback(() => {
    controllerRef.current?.start();
  }, []);

  const stopListening = useCallback(() => {
    controllerRef.current?.stop();
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.cancel();
    setStatus('idle');
    setError(null);
    setTranscript('');
  }, []);

  const isSupported = useMemo(() => isSpeechRecognitionSupported(), []);

  return {
    status,
    error,
    transcript,
    isSupported,
    startListening,
    stopListening,
    cancel,
  };
}
