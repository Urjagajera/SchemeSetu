import { describe, it, expect } from 'vitest';
import { cardDescription, stripDetailsHeading } from './descriptionText';

// The data's real shape: the word "Details" alone on the first line, then the description.
const SOURCE = 'Details\nThe scheme "Gagan Bharari Shiksha Yojana" aims to provide additional financial assistance.';

describe('stripDetailsHeading', () => {
  it('removes a first line that is only "Details"', () => {
    expect(stripDetailsHeading(SOURCE)).toBe('The scheme "Gagan Bharari Shiksha Yojana" aims to provide additional financial assistance.');
  });

  it('copes with Windows line endings, blank lines after the heading, and stray spaces', () => {
    expect(stripDetailsHeading('Details\r\nFinancial help.')).toBe('Financial help.');
    expect(stripDetailsHeading('  Details  \n\n\n  Financial help.')).toBe('Financial help.');
  });

  it('ignores case and a trailing colon or dash on the heading', () => {
    expect(stripDetailsHeading('DETAILS\nFinancial help.')).toBe('Financial help.');
    expect(stripDetailsHeading('Details:\nFinancial help.')).toBe('Financial help.');
    expect(stripDetailsHeading('Details -\nFinancial help.')).toBe('Financial help.');
  });

  it('also removes the translated heading that a Hindi or Gujarati description keeps', () => {
    expect(stripDetailsHeading('विवरण\nयह योजना छात्रों के लिए है।')).toBe('यह योजना छात्रों के लिए है।');
    expect(stripDetailsHeading('विवरण  \nयह योजना छात्रों के लिए है।')).toBe('यह योजना छात्रों के लिए है।');
    expect(stripDetailsHeading('વિગતો\nઆ યોજના વિદ્યાર્થીઓ માટે છે.')).toBe('આ યોજના વિદ્યાર્થીઓ માટે છે.');
  });

  it('leaves real sentences that merely start with the word alone', () => {
    const sentence = 'Details of the scheme are available on the official portal.';
    expect(stripDetailsHeading(sentence)).toBe(sentence);
    expect(stripDetailsHeading('Detailed guidelines apply.\nMore text.')).toBe('Detailed guidelines apply.\nMore text.');
  });

  it('removes only the first line, not a later "Details" line', () => {
    expect(stripDetailsHeading('Intro text.\nDetails\nMore text.')).toBe('Intro text.\nDetails\nMore text.');
    expect(stripDetailsHeading('Details\nIntro.\nDetails\nMore.')).toBe('Intro.\nDetails\nMore.');
  });

  it('returns text without the heading unchanged, and copes with empty input', () => {
    expect(stripDetailsHeading('Financial help for students.')).toBe('Financial help for students.');
    expect(stripDetailsHeading('')).toBe('');
    expect(stripDetailsHeading(undefined)).toBe('');
    expect(stripDetailsHeading(null)).toBe('');
  });

  it('leaves nothing when the heading is all there is', () => {
    expect(stripDetailsHeading('Details')).toBe('');
    expect(stripDetailsHeading('Details\n')).toBe('');
  });
});

describe('cardDescription', () => {
  it('strips the heading from the server\'s 150-character short description', () => {
    const shortDesc = `${SOURCE}`.slice(0, 150) + '...';
    expect(cardDescription({ shortDesc, description: SOURCE }).startsWith('The scheme')).toBe(true);
  });

  it('falls back to the start of the description when there is no short description', () => {
    expect(cardDescription({ shortDesc: '', description: SOURCE })).toBe('The scheme "Gagan Bharari Shiksha Yojana" aims to provide additional financial assistance.');
  });

  it('leaves a short description that has no heading alone', () => {
    expect(cardDescription({ shortDesc: 'Income support to farmers.', description: 'Details\nIncome support to farmers.' })).toBe('Income support to farmers.');
  });
});
