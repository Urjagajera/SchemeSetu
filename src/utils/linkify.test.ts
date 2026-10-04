import { describe, it, expect } from 'vitest';
import { splitLinks, type TextPart } from './linkify';

const links = (text: string) => splitLinks(text).filter((p): p is Extract<TextPart, { type: 'link' }> => p.type === 'link').map((p) => p.href);
const rejoin = (text: string) => splitLinks(text).map((p) => p.text).join('');

describe('splitLinks: what becomes a link', () => {
  it('links an https address in the middle of a sentence', () => {
    expect(splitLinks('Visit https://jansuraksha.gov.in/Forms-PMSBY.aspx to apply')).toEqual([
      { type: 'text', text: 'Visit ' },
      { type: 'link', text: 'https://jansuraksha.gov.in/Forms-PMSBY.aspx', href: 'https://jansuraksha.gov.in/Forms-PMSBY.aspx' },
      { type: 'text', text: ' to apply' },
    ]);
  });

  it('links http as well as https, and several addresses in one text', () => {
    expect(links('Use http://old.example.gov.in/a or https://new.example.gov.in/b today')).toEqual(['http://old.example.gov.in/a', 'https://new.example.gov.in/b']);
  });

  it('keeps the query string, fragment and PDF paths whole', () => {
    expect(links('See https://www.rbi.org.in/Scripts/query.aspx?id=5&x=1#top and https://jansuraksha.gov.in/files/STATEWISETOLLFREE.pdf')).toEqual([
      'https://www.rbi.org.in/Scripts/query.aspx?id=5&x=1#top',
      'https://jansuraksha.gov.in/files/STATEWISETOLLFREE.pdf',
    ]);
  });

  it('finds an address at the start of a line and across lines', () => {
    expect(links('Step 1: Open\nhttps://www.standupmitra.in/Login/Register\nStep 2: Register')).toEqual(['https://www.standupmitra.in/Login/Register']);
  });
});

describe('splitLinks: punctuation around an address is not part of it', () => {
  // These are the endings found in the real data: . ) , and a closing curly quote
  it.each([
    ['Apply at https://jeevanpramaan.gov.in.', 'https://jeevanpramaan.gov.in'],
    ['Apply (see https://jeevanpramaan.gov.in)', 'https://jeevanpramaan.gov.in'],
    ['(https://www.kolkatapolice.gov.in/).', 'https://www.kolkatapolice.gov.in/'],
    ['Visit https://hpahdbt.hp.gov.in/Home/Index), then log in', 'https://hpahdbt.hp.gov.in/Home/Index'],
    ['Portals: https://a.gov.in/x, https://b.gov.in/y; and more', 'https://a.gov.in/x'],
    ['He said “go to https://a.gov.in/x”', 'https://a.gov.in/x'],
    ['Is it https://a.gov.in/x?', 'https://a.gov.in/x'],
    ['जाएँ https://a.gov.in/apply।', 'https://a.gov.in/apply'],
    ['Done: https://a.gov.in/x...', 'https://a.gov.in/x'],
  ])('%s', (text, expected) => {
    expect(links(text)[0]).toBe(expected);
  });

  it('keeps the punctuation in the text around the link, so nothing is lost', () => {
    const parts = splitLinks('Apply at https://jeevanpramaan.gov.in.');
    expect(parts[parts.length - 1]).toEqual({ type: 'text', text: '.' });
  });

  it('keeps a closing bracket the address itself opened', () => {
    expect(links('See https://en.wikipedia.org/wiki/Thing_(film) now')).toEqual(['https://en.wikipedia.org/wiki/Thing_(film)']);
    expect(links('(See https://en.wikipedia.org/wiki/Thing_(film)).')).toEqual(['https://en.wikipedia.org/wiki/Thing_(film)']);
  });

  it('keeps the hash fragment but not the bracket after it (real data: ".../LDMS#NoBack)")', () => {
    expect(links('(link: https://www.standupmitra.in/LDMS#NoBack)')).toEqual(['https://www.standupmitra.in/LDMS#NoBack']);
  });
});

describe('splitLinks: what is NOT a link', () => {
  it.each([
    'Visit www.example.gov.in for details',
    'Write to help@example.gov.in',
    'Download from ftp://files.example.gov.in/a.zip',
    'mailto:help@example.gov.in',
    'javascript:alert(1)',
    'Click javascript:void(0) or data:text/html;base64,AAAA',
    'Go to https:// and see',
    'Broken http://. address',
  ])('leaves "%s" as plain text', (text) => {
    expect(links(text)).toEqual([]);
    expect(splitLinks(text)).toEqual([{ type: 'text', text }]);
  });

  it('does not link an address that only looks like one inside another word', () => {
    expect(links('nothttps-address and xhttp.example')).toEqual([]);
  });

  it('does not turn markup into anything: it is just text', () => {
    const text = '<img src=x onerror=alert(1)> https://a.gov.in/x <script>alert(1)</script>';
    expect(splitLinks(text).filter((p) => p.type === 'text').map((p) => p.text).join('')).toContain('<img src=x onerror=alert(1)>');
    expect(links(text)).toEqual(['https://a.gov.in/x']);
  });
});

describe('splitLinks: the text always comes back whole', () => {
  it.each([
    '',
    'No address here.',
    'Visit https://a.gov.in/x.',
    '(https://www.kolkatapolice.gov.in/). Next https://b.gov.in, then www.c.in',
    'https://a.gov.in/x https://b.gov.in/y',
    'Line one\n\nhttps://a.gov.in/x\n  indented text.',
    'जाएँ https://a.gov.in/apply। फिर लॉगिन करें।',
  ])('%j', (text) => {
    expect(rejoin(text)).toBe(text);
  });

  it('never leaves two text parts next to each other', () => {
    const parts = splitLinks('a https://x. b www.c.in d');
    parts.forEach((p, i) => {
      if (i > 0) expect(!(p.type === 'text' && parts[i - 1].type === 'text')).toBe(true);
    });
  });
});
