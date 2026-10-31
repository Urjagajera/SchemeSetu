/**
 * The common documents a person can tick under "My documents", and how each one is recognised in a scheme's document
 * list. Scheme lists are free text from the source data ("Aadhaar Card", "Aadhar card.", "Copy of Aadhaar"...), so
 * each kind is a pattern tried against a lower-cased line. The keys must match backend/src/utils/documentKinds.ts
 * (a test checks).
 */
export const DOCUMENT_KINDS = [
  { key: 'aadhaar', label: 'docAadhaar' },
  { key: 'bank', label: 'docBank' },
  { key: 'ration', label: 'docRation' },
  { key: 'income', label: 'docIncome' },
  { key: 'caste', label: 'docCaste' },
  { key: 'domicile', label: 'docDomicile' },
  { key: 'photo', label: 'docPhoto' },
  { key: 'age', label: 'docAge' },
  { key: 'disability', label: 'docDisability' },
  { key: 'marksheet', label: 'docMarksheet' },
  { key: 'pan', label: 'docPan' },
  { key: 'voter', label: 'docVoter' },
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number]['key'];

const NOT_A_PERSON = '(unit|house|land|site|shop|machine|machinery|vehicle|work|building|project|farm|field|boat|equipment|construction|premises)';

const PATTERNS: Record<DocumentKind, RegExp> = {
  // "Jan Aadhaar" (Rajasthan's family card) and "Udyog/Udyam Aadhaar" (a business registration) are different
  // documents: they are taken out before this is tried.
  aadhaar: /\baadh?aa?r\b|\buidai\b/,
  bank: /\bbank (account|a\/c|passbook|pass book|details|statement)|\bpassbook\b|\bcancell?ed cheque|\bifsc\b/,
  ration: /\bration card\b/,
  income: /\bincome certificate|\bincome proof|\bproof of (annual )?(family )?income/,
  caste: /\bcaste\b|\bcommunity certificate|\btribe certificate/,
  domicile: /\bdomicile\b|\bresiden(ce|tial) (certificate|proof)|\bproof of (residence|address)|\baddress proof|\bnativity\b/,
  // A "photo identity card" or "photo ID" is an identity document, and a photo of a building, land or machine is not
  // a photo of the person.
  photo: new RegExp(
    String.raw`\bpassport[- ]?size\b|\b(photographs?|photos?)\b(?! ?(id\b|identity|of (the )?(existing )?${NOT_A_PERSON}))`,
  ),
  age: /\bdate of birth\b|\bbirth certificate|\bage proof|\bproof of age\b/,
  disability: /\bdisabilit(y|ies) certificate|\budid\b|\bhandicap(ped)? certificate|\bdivyang/,
  marksheet: /\bmark ?sheets?\b|\bmarks? (card|memo|statement)|\b(10th|12th|ssc|hsc|sslc|class (x|xii|10|12))\b.*\b(certificate|marks)/,
  pan: /\bpan\b|\bpermanent account number/,
  voter: /\bvoter\b|\bepic\b|\belection (photo )?(identity )?card/,
};

/** The kinds a document line mentions (often none, sometimes two: "Aadhaar or Voter ID"). */
export function kindsInLine(line: string): DocumentKind[] {
  const text = line.toLowerCase().replace(/\b(jan|udyog|udyam)[- ]?aadh?aa?r\b/g, ' ');
  return DOCUMENT_KINDS.map((k) => k.key).filter((key) => PATTERNS[key].test(text));
}

/** A line that only introduces the lines after it ("For the Application of the Welfare Scheme:"). */
export function isHeadingLine(line: string): boolean {
  return /:\s*$/.test(line.trim());
}

/** A catch-all that names no document ("Any other documents as required"). Shown, but not counted. */
export function isFillerLine(line: string): boolean {
  return /^(and )?(any )?(other|additional|further) (relevant |supporting |related |necessary )?documents?\b/i.test(line.trim().replace(/^[-•*\d.)\s]+/, ''));
}
