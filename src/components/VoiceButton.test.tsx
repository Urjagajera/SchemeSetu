import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// The real dictionaries, so the button names and messages checked are the ones people see and hear.
const lang = vi.hoisted(() => ({ current: 'en' as 'en' | 'hi' | 'gu' }));
vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict[lang.current][key] || key, language: lang.current }) };
});

import { SearchBar } from './SearchBar';
import en from '../../locales/en.json';
import hi from '../../locales/hi.json';
import gu from '../../locales/gu.json';

/** A stand-in for the browser's speech engine: the test says what was "heard". */
class FakeRecognition {
  static last: FakeRecognition | null = null;
  lang = '';
  interimResults = false;
  continuous = true;
  maxAlternatives = 0;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  aborted = false;
  constructor() {
    FakeRecognition.last = this;
  }
  start() {
    this.started = true;
  }
  stop() {
    this.onend?.();
  }
  abort() {
    this.aborted = true;
  }
  hear(...parts: string[]) {
    const results = parts.map((p) => ({ isFinal: false, 0: { transcript: p } }));
    act(() => this.onresult?.({ results: Object.assign(results, { length: results.length }) }));
  }
  fail(error: string) {
    act(() => {
      this.onerror?.({ error });
      this.onend?.();
    });
  }
  end() {
    act(() => this.onend?.());
  }
}

const w = window as unknown as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown };

beforeEach(() => {
  lang.current = 'en';
  FakeRecognition.last = null;
  w.webkitSpeechRecognition = FakeRecognition;
});
afterEach(() => {
  delete w.webkitSpeechRecognition;
  delete w.SpeechRecognition;
});

const renderBar = (onSearch = vi.fn()) => {
  render(<MemoryRouter><SearchBar onSearch={onSearch} /></MemoryRouter>);
  return onSearch;
};
const mic = () => screen.getByRole('button', { name: en.voiceSearch });
const box = () => screen.getByRole('textbox') as HTMLInputElement;
const message = () => screen.getByTestId('voice-message').textContent;

describe('Voice search in the search bar', () => {
  it('listens in the page language: English, Hindi or Gujarati as spoken in India', () => {
    for (const [code, dict, speech] of [['en', en, 'en-IN'], ['hi', hi, 'hi-IN'], ['gu', gu, 'gu-IN']] as const) {
      lang.current = code;
      const { unmount } = render(<MemoryRouter><SearchBar onSearch={() => {}} /></MemoryRouter>);
      fireEvent.click(screen.getByRole('button', { name: dict.voiceSearch }));
      expect(FakeRecognition.last?.lang).toBe(speech);
      expect(FakeRecognition.last?.interimResults).toBe(true); // words appear while still speaking
      expect(FakeRecognition.last?.started).toBe(true);
      unmount();
    }
  });

  it('shows that it is listening, fills the box while you speak, then searches for what was said', () => {
    const onSearch = renderBar();
    fireEvent.click(mic());
    const stop = screen.getByRole('button', { name: en.voiceStop });
    expect(stop.getAttribute('aria-pressed')).toBe('true');
    expect(message()).toBe(en.voiceListening);

    FakeRecognition.last!.hear('widow ');
    expect(box().value).toBe('widow');
    FakeRecognition.last!.hear('widow ', 'pension in Gujarat');
    expect(box().value).toBe('widow pension in Gujarat');
    expect(onSearch).not.toHaveBeenCalled();

    FakeRecognition.last!.end();
    expect(onSearch).toHaveBeenCalledWith('widow pension in Gujarat');
    expect(mic().getAttribute('aria-pressed')).toBe('false');
    expect(message()).toBe('');
  });

  it('pressing it again stops listening, and what was heard still counts', () => {
    const onSearch = renderBar();
    fireEvent.click(mic());
    FakeRecognition.last!.hear('scholarship');
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: en.voiceStop }));
    });
    expect(onSearch).toHaveBeenCalledWith('scholarship');
  });

  it('a Hindi search is searched as spoken; the server turns it into English words', () => {
    lang.current = 'hi';
    const onSearch = renderBar();
    fireEvent.click(screen.getByRole('button', { name: hi.voiceSearch }));
    FakeRecognition.last!.hear('विधवा पेंशन');
    FakeRecognition.last!.end();
    expect(onSearch).toHaveBeenCalledWith('विधवा पेंशन');
  });

  it('says so when the microphone is blocked, and does not search', () => {
    const onSearch = renderBar();
    fireEvent.click(mic());
    FakeRecognition.last!.fail('not-allowed');
    expect(message()).toBe(en.voiceDenied);
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('says so when nothing was heard', () => {
    renderBar();
    fireEvent.click(mic());
    FakeRecognition.last!.end();
    expect(message()).toBe(en.voiceNothing);
    fireEvent.click(mic());
    FakeRecognition.last!.fail('no-speech');
    expect(message()).toBe(en.voiceNothing);
  });

  it('when listening is cancelled, says nothing and does not search', () => {
    const onSearch = renderBar();
    fireEvent.click(mic());
    FakeRecognition.last!.hear('pen');
    FakeRecognition.last!.fail('aborted');
    expect(message()).toBe('');
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('says so when the speech service cannot be reached', () => {
    renderBar();
    fireEvent.click(mic());
    FakeRecognition.last!.fail('network');
    expect(message()).toBe(en.voiceFailed);
  });

  it('the messages are read out by screen readers', () => {
    renderBar();
    expect(screen.getByTestId('voice-message').getAttribute('role')).toBe('status');
  });

  it('is not shown at all in a browser without speech-to-text (Firefox)', () => {
    delete w.webkitSpeechRecognition;
    renderBar();
    expect(screen.queryByRole('button', { name: en.voiceSearch })).toBeNull();
    expect(screen.queryByTestId('voice-message')).toBeNull();
  });

  it('leaving the page stops the microphone', () => {
    const { unmount } = render(<MemoryRouter><SearchBar onSearch={() => {}} /></MemoryRouter>);
    fireEvent.click(mic());
    unmount();
    expect(FakeRecognition.last?.aborted).toBe(true);
  });
});

describe('Voice messages exist in all three languages', () => {
  it('every voice text is written in Hindi and Gujarati, not left in English', () => {
    for (const key of ['voiceSearch', 'voiceAsk', 'voiceStop', 'voiceListening', 'voiceDenied', 'voiceNothing', 'voiceFailed', 'pvVoiceH', 'pvVoice'] as const) {
      for (const dict of [hi, gu]) {
        expect(dict[key], key).toBeTruthy();
        expect(dict[key], key).not.toBe(en[key]);
      }
    }
  });
});
