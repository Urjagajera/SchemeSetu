/**
 * The common documents a person can tick under "My documents" on their profile. The frontend keeps the same keys
 * (src/utils/documentKinds.ts, with the labels and the wording that matches them in scheme lists); a frontend test
 * checks the two lists stay identical.
 */
export const DOCUMENT_KINDS = [
  'aadhaar',
  'bank',
  'ration',
  'income',
  'caste',
  'domicile',
  'photo',
  'age',
  'disability',
  'marksheet',
  'pan',
  'voter',
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
