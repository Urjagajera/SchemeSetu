import { describe, it, expect } from 'vitest';
import { buildCarryList } from './carryList';

const A = { id: 'a', name: 'Scheme A', documents: ['Aadhaar Card', 'Bank Passbook', 'Land records (7/12 extract)', 'Documents Required:'] };
const B = { id: 'b', name: 'Scheme B', documents: ['Copy of Aadhaar', 'Income Certificate', 'Any other documents as required'] };

describe('buildCarryList', () => {
  it('merges a common document across schemes, keeps other lines, and drops headings and catch-alls', () => {
    const items = buildCarryList([A, B], [], {});
    expect(items.map((i) => i.kind ?? i.line)).toEqual(['aadhaar', 'bank', 'income', 'Land records (7/12 extract)']);
    expect(items[0].schemes.map((s) => s.id)).toEqual(['a', 'b']);
    expect(items.every((i) => !i.ready)).toBe(true);
  });

  it('marks kept documents and ticked lines ready, and lists them after what is still needed', () => {
    const items = buildCarryList([A, B], ['aadhaar'], { a: { checked: ['Land records (7/12 extract)'], unchecked: [] } });
    expect(items.map((i) => [i.kind ?? i.line, i.ready])).toEqual([
      ['bank', false],
      ['income', false],
      ['aadhaar', true],
      ['Land records (7/12 extract)', true],
    ]);
  });

  it('a kept document unticked on purpose for one scheme is not ready', () => {
    const items = buildCarryList([A, B], ['aadhaar'], { b: { checked: [], unchecked: ['Copy of Aadhaar'] } });
    expect(items.find((i) => i.kind === 'aadhaar')?.ready).toBe(false);
  });

  it('"Aadhaar or Voter ID" counts as ready when either one is kept', () => {
    const items = buildCarryList([{ id: 'c', name: 'C', documents: ['Aadhaar card or Voter ID'] }], ['voter'], {});
    expect(items).toEqual([{ kind: 'voter', schemes: [{ id: 'c', name: 'C' }], ready: true }]);
  });
});
