import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageContext';
import { ReadAloudButton } from './ReadAloudButton';
import { useReadAloud, voiceFor, speechChunks } from '../hooks/useReadAloud';
import type { VoiceLanguage } from '../hooks/useVoiceInput';

const voice = (lang: string) => ({ lang, name: lang, default: false, localService: true, voiceURI: lang }) as SpeechSynthesisVoice;

class FakeUtterance {
  text: string;
  lang = '';
  voice: SpeechSynthesisVoice | null = null;
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

let spoken: FakeUtterance[] = [];
function installSpeech(voices: SpeechSynthesisVoice[]) {
  spoken = [];
  (window as unknown as { speechSynthesis: unknown }).speechSynthesis = {
    getVoices: () => voices,
    speak: (u: FakeUtterance) => spoken.push(u),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = FakeUtterance;
}

const Harness = ({ text, lang }: { text: string; lang: VoiceLanguage }) => {
  const reader = useReadAloud();
  return <ReadAloudButton id="benefits" text={text} lang={lang} reader={reader} />;
};
const renderButton = (text: string, lang: VoiceLanguage) => render(<LanguageProvider><Harness text={text} lang={lang} /></LanguageProvider>);

describe('voiceFor and speechChunks', () => {
  it('prefers the exact Indian voice, then any voice of the language', () => {
    expect(voiceFor([voice('hi'), voice('hi-IN')], 'hi')?.lang).toBe('hi-IN');
    expect(voiceFor([voice('en-US')], 'en')?.lang).toBe('en-US');
    expect(voiceFor([voice('en-US'), voice('hi-IN')], 'gu')).toBeNull();
  });

  it('splits long text at sentence ends, including the Hindi danda', () => {
    expect(speechChunks('पहला वाक्य। दूसरा वाक्य।')).toEqual(['पहला वाक्य।', 'दूसरा वाक्य।']);
    expect(speechChunks('a'.repeat(500)).every((c) => c.length <= 220)).toBe(true);
  });
});

describe('ReadAloudButton', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
  });

  it('reads the text with the matching voice, then offers pause and stop', () => {
    installSpeech([voice('en-IN'), voice('hi-IN')]);
    renderButton('Benefits. Up to ₹5,000 a year.', 'hi');
    fireEvent.click(screen.getByRole('button', { name: 'Read aloud' }));
    expect(spoken.map((u) => u.lang)).toEqual(['hi-IN', 'hi-IN']);
    expect(screen.getByRole('button', { name: 'Pause reading' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Stop reading' }));
    expect(screen.getByRole('button', { name: 'Read aloud' })).toBeTruthy();
  });

  it('goes back to "Read aloud" when the last piece finishes', () => {
    installSpeech([voice('en-IN')]);
    renderButton('One. Two.', 'en');
    fireEvent.click(screen.getByRole('button', { name: 'Read aloud' }));
    act(() => spoken[spoken.length - 1].onend?.());
    expect(screen.getByRole('button', { name: 'Read aloud' })).toBeTruthy();
  });

  it('says so when the device has no Gujarati voice', () => {
    installSpeech([voice('en-IN'), voice('hi-IN')]);
    renderButton('લાભ', 'gu');
    expect(screen.queryByRole('button', { name: 'Read aloud' })).toBeNull();
    expect(screen.getByText(/No Gujarati voice on this device/)).toBeTruthy();
  });

  it('shows nothing in a browser without speech', () => {
    const { container } = renderButton('Benefits', 'en');
    expect(container.textContent).toBe('');
  });
});
