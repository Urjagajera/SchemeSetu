import { useCallback, useEffect, useRef, useState } from 'react';
import { SPEECH_LANG, VoiceLanguage } from './useVoiceInput';

/**
 * Read aloud with the browser's own text-to-speech (speechSynthesis): free, and the text never leaves the device.
 * Voices come from the operating system: English and Hindi are common, Gujarati is missing on many phones and PCs,
 * so `hasVoice(lang)` lets the button say so and offer another language instead of reading Gujarati badly.
 */

export type ReadState = 'idle' | 'speaking' | 'paused';

const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

/** The best installed voice for a language: an exact "hi-IN" first, then any "hi-…". */
export function voiceFor(voices: SpeechSynthesisVoice[], lang: VoiceLanguage): SpeechSynthesisVoice | null {
  const wanted = SPEECH_LANG[lang].toLowerCase();
  const norm = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-');
  return voices.find((v) => norm(v) === wanted) ?? voices.find((v) => norm(v).startsWith(`${lang}-`) || norm(v) === lang) ?? null;
}

/** Long text is read in sentence-sized pieces: some browsers stop after about 15 seconds of one utterance. */
export function speechChunks(text: string, max = 220): string[] {
  const parts = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?।|])\s+/);
  const out: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    if (p.length <= max) out.push(p);
    else for (let i = 0; i < p.length; i += max) out.push(p.slice(i, i + max));
  }
  return out;
}

export function useReadAloud() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => synth()?.getVoices() ?? []);
  const [state, setState] = useState<ReadState>('idle');
  const [readingId, setReadingId] = useState<string | null>(null);
  const runRef = useRef(0);
  const supported = synth() !== null;

  useEffect(() => {
    const s = synth();
    if (!s) return;
    const load = () => setVoices(s.getVoices());
    load();
    s.addEventListener?.('voiceschanged', load);
    return () => {
      s.removeEventListener?.('voiceschanged', load);
      s.cancel();
    };
  }, []);

  const hasVoice = useCallback((lang: VoiceLanguage) => voiceFor(voices, lang) !== null, [voices]);

  const stop = useCallback(() => {
    runRef.current++;
    synth()?.cancel();
    setState('idle');
    setReadingId(null);
  }, []);

  const speak = useCallback(
    (id: string, text: string, lang: VoiceLanguage) => {
      const s = synth();
      if (!s) return;
      const run = ++runRef.current;
      s.cancel();
      const voice = voiceFor(voices, lang);
      const chunks = speechChunks(text);
      if (!chunks.length) return;
      setReadingId(id);
      setState('speaking');
      chunks.forEach((chunk, i) => {
        const u = new SpeechSynthesisUtterance(chunk);
        u.lang = voice?.lang ?? SPEECH_LANG[lang];
        if (voice) u.voice = voice;
        u.rate = 0.95;
        if (i === chunks.length - 1) {
          u.onend = () => {
            if (runRef.current === run) {
              setState('idle');
              setReadingId(null);
            }
          };
        }
        u.onerror = () => {
          if (runRef.current === run) {
            setState('idle');
            setReadingId(null);
          }
        };
        s.speak(u);
      });
    },
    [voices],
  );

  const pause = useCallback(() => {
    synth()?.pause();
    setState('paused');
  }, []);
  const resume = useCallback(() => {
    synth()?.resume();
    setState('speaking');
  }, []);

  return { supported, hasVoice, speak, pause, resume, stop, state, readingId };
}

export type ReadAloud = ReturnType<typeof useReadAloud>;
