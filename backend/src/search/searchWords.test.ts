import { describe, it, expect } from 'vitest';
import { rankSchemes, searchWords, textWhere } from './searchWords.js';

describe('searchWords: what a typed or spoken search looks for', () => {
  it('drops filler words and trims plurals, so a spoken sentence becomes its topic', () => {
    expect(searchWords('Show me pension schemes for widows')).toEqual({ words: ['pension', 'widow'], state: null });
  });

  it('a state named in the search narrows it instead of being a search word', () => {
    expect(searchWords('pension for widows in Gujarat')).toEqual({ words: ['pension', 'widow'], state: 'Gujarat' });
  });

  it('finds two-word states whole, and never a state inside another word', () => {
    expect(searchWords('farmers of Arunachal Pradesh')).toEqual({ words: ['farmer'], state: 'Arunachal Pradesh' });
    expect(searchWords('tamil nadu scholarship').state).toBe('Tamil Nadu');
    expect(searchWords('goat farming')).toEqual({ words: ['goat', 'farming'], state: null });
  });

  it('keeps Hindi and Gujarati words whole, vowel signs included', () => {
    expect(searchWords('विधवा पेंशन').words).toEqual(['विधवा', 'पेंशन']);
    expect(searchWords('ખેડૂત યોજના').words).toEqual(['ખેડૂત', 'યોજના']);
  });

  it('leaves words like "class" and "bus" alone, and turns "subsidies" into a stem that finds "subsidy"', () => {
    expect(searchWords('class bus subsidies').words).toEqual(['class', 'bus', 'subsid']);
  });

  it('nothing left after the filler is no words at all', () => {
    expect(searchWords('schemes for me').words).toEqual([]);
  });
});

describe('textWhere: the database condition', () => {
  it('matches any of the words in the name, description, authority or a tag', () => {
    const text = JSON.stringify(textWhere(['widow', 'pension']));
    for (const w of ['widow', 'pension']) {
      for (const field of ['name', 'description', 'authorityName']) expect(text).toContain(`{"${field}":{"contains":"${w}","mode":"insensitive"}}`);
      expect(text).toContain(`{"tags":{"some":{"name":{"contains":"${w}","mode":"insensitive"}}}}`);
    }
  });

  it('leaves one- and two-letter words to the ranking, unless they are all there is', () => {
    expect(JSON.stringify(textWhere(['pm', 'kisan']))).not.toContain('"pm"');
    expect(JSON.stringify(textWhere(['pm']))).toContain('"pm"');
  });
});

const row = (name: string, extra: { description?: string; tags?: string[]; authorityName?: string } = {}) => ({
  id: name,
  name,
  description: extra.description ?? '',
  authorityName: extra.authorityName ?? 'Ministry',
  tags: (extra.tags ?? []).map((t) => ({ name: t })),
});

describe('rankSchemes: best matches first', () => {
  it('a scheme with more of the words beats one that has a single word everywhere', () => {
    const everywhere = row('Pension Scheme', { description: 'pension', tags: ['pension'], authorityName: 'Pension Board' });
    const both = row('Zz Support', { description: 'for a widow, a monthly pension' });
    const names = rankSchemes([everywhere, both], ['widow', 'pension'], 'widow pension').map((r) => r.name);
    expect(names).toEqual(['Zz Support', 'Pension Scheme']);
  });

  it('a word in the name counts more than the same word in the description', () => {
    const names = rankSchemes([row('Aaa Support', { description: 'for farmers' }), row('Farmer Support')], ['farmer'], 'farmer').map((r) => r.name);
    expect(names).toEqual(['Farmer Support', 'Aaa Support']);
  });

  it('the whole search written in a name puts that scheme first', () => {
    const names = rankSchemes([row('Card for Kisan Credit'), row('Kisan Credit Card')], ['kisan', 'credit', 'card'], 'kisan credit card').map((r) => r.name);
    expect(names[0]).toBe('Kisan Credit Card');
  });

  it('short words must be whole words: "pm" does not match inside "development"', () => {
    const names = rankSchemes([row('Skill Development'), row('PM Kisan')], ['pm'], 'pm').map((r) => r.name);
    expect(names).toEqual(['PM Kisan']);
  });

  it('ties go by name, so every page is in the same order', () => {
    const names = rankSchemes([row('B Widow'), row('A Widow')], ['widow'], 'widow').map((r) => r.name);
    expect(names).toEqual(['A Widow', 'B Widow']);
  });
});
