import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Voice input with the browser's own speech-to-text (the Web Speech API): Chrome, Edge, Safari and Android have it,
 * Firefox does not, so `supported` is false there and the mic button is not shown. SchemeSetu never receives the
 * recording, only the words; Chrome sends the voice to Google to turn it into text (the Privacy page says so).
 */

export type VoiceLanguage = 'en' | 'hi' | 'gu';
export type VoiceError = 'denied' | 'nothing' | 'failed';

/** What the browser listens for: English, Hindi or Gujarati as spoken in India, following the page language. */
export const SPEECH_LANG: Record<VoiceLanguage, string> = { en: 'en-IN', hi: 'hi-IN', gu: 'gu-IN' };

interface SpeechResultList {
  length: number;
  [i: number]: { isFinal: boolean; 0: { transcript: string } };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: SpeechResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionClass = new () => Recognition;

export function speechRecognitionClass(): RecognitionClass | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionClass; webkitSpeechRecognition?: RecognitionClass };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** The browser's error names, as the three things a person can act on. "aborted" is our own stop: not an error. */
function errorKind(name: string): VoiceError | null {
  if (name === 'aborted') return null;
  if (name === 'not-allowed' || name === 'service-not-allowed' || name === 'audio-capture') return 'denied';
  if (name === 'no-speech') return 'nothing';
  return 'failed';
}

export interface VoiceCallbacks {
  /** The words so far, while the person is still speaking. */
  onText: (text: string) => void;
  /** The finished words, once they stop. Not called when nothing was heard. */
  onDone: (text: string) => void;
}

export function useVoiceInput(language: VoiceLanguage, callbacks: VoiceCallbacks) {
  const Recognition = speechRecognitionClass();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<VoiceError | null>(null);
  const current = useRef<Recognition | null>(null);
  const latest = useRef(callbacks);
  latest.current = callbacks;

  // Leaving the page stops the microphone.
  useEffect(() => () => current.current?.abort(), []);

  const start = useCallback(() => {
    if (!Recognition || current.current) return;
    const rec = new Recognition();
    rec.lang = SPEECH_LANG[language];
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let text = '';
    let failed = false;
    rec.onresult = (e) => {
      text = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join('').trim();
      latest.current.onText(text);
    };
    rec.onerror = (e) => {
      // Any error ends this try without a search; "aborted" (listening was cancelled) also without a message.
      failed = true;
      const kind = errorKind(e.error);
      if (kind) setError(kind);
    };
    rec.onend = () => {
      current.current = null;
      setListening(false);
      if (failed) return;
      if (text) latest.current.onDone(text);
      else setError('nothing');
    };
    setError(null);
    current.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      current.current = null;
      setListening(false);
      setError('failed');
    }
  }, [Recognition, language]);

  /** Stops listening; whatever was heard so far still counts. */
  const stop = useCallback(() => current.current?.stop(), []);

  return { supported: Recognition !== null, listening, error, start, stop };
}
