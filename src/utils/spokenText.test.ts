import { describe, it, expect } from 'vitest';
import { spokenText } from './spokenText';

describe('spokenText: an answer as it should be heard', () => {
  it('reads link labels, not addresses, and drops bold and list markers', () => {
    const answer = '- **[PM-KISAN](/schemes/15636955-73d9)** gives ₹6,000 a year.\nCheck [Search](/search) for more.';
    expect(spokenText(answer)).toBe('PM-KISAN gives ₹6,000 a year.\nCheck Search for more.');
  });

  it('leaves plain Hindi and Gujarati text as it is', () => {
    expect(spokenText('यह योजना किसानों के लिए है।')).toBe('यह योजना किसानों के लिए है।');
    expect(spokenText('આ યોજના ખેડૂતો માટે છે.')).toBe('આ યોજના ખેડૂતો માટે છે.');
  });
});
