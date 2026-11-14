import { describe, it, expect } from 'vitest';
import { buildShareMessage } from './shareMessage';

const labels = { benefit: 'Benefit:', documents: 'Documents to keep ready:', details: 'Details and how to apply:' };
const URL_ = 'https://example.org/schemes/abc';

describe('buildShareMessage', () => {
  it('name, main benefit, document list and the link, ready for WhatsApp', () => {
    const text = buildShareMessage(
      { name: 'Tractor Assistance', benefits: ['25% subsidy, up to ₹45,000.'], documents: ['Aadhaar card', 'Land record (8-A)'] },
      URL_,
      labels,
    );
    expect(text).toBe(
      ['*Tractor Assistance*', '', 'Benefit: 25% subsidy, up to ₹45,000.', '', 'Documents to keep ready:', '• Aadhaar card', '• Land record (8-A)', '', 'Details and how to apply:', URL_].join('\n'),
    );
  });

  it('keeps it short: 2 benefits, 8 documents, long lines clipped', () => {
    const text = buildShareMessage(
      { name: 'S', benefits: ['one', 'two', 'three'], documents: Array.from({ length: 11 }, (_, i) => `Doc ${i + 1}`), },
      URL_,
      labels,
    );
    expect(text).toContain('Benefit: one two');
    expect(text).not.toContain('three');
    expect(text).toContain('• Doc 8');
    expect(text).not.toContain('• Doc 9');
    expect(text).toContain('• … (+3)');
    expect(buildShareMessage({ name: 'S', documents: ['x'.repeat(200)] }, URL_, labels)).toMatch(/x{80,}…/);
  });

  it('without benefits or documents it is just the name and the link', () => {
    expect(buildShareMessage({ name: 'S' }, URL_, labels)).toBe(['*S*', '', 'Details and how to apply:', URL_].join('\n'));
  });
});
