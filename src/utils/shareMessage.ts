/**
 * The message sent when a scheme is shared (WhatsApp or the phone's share sheet): the name, its main benefit and the
 * documents to keep ready, so a family member can act on it without opening the link first. Kept short enough for
 * a chat message: at most 2 benefit lines and 8 documents, each clipped.
 */
export interface ShareLabels {
  /** "Benefit:" */
  benefit: string;
  /** "Documents to keep ready:" */
  documents: string;
  /** "Details and how to apply:" */
  details: string;
}

const MAX_BENEFITS = 2;
const MAX_DOCUMENTS = 8;
const clip = (s: string, n: number) => {
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > n ? `${one.slice(0, n - 1).trimEnd()}…` : one;
};

export function buildShareMessage(
  scheme: { name: string; benefits?: string[]; documents?: string[] },
  url: string,
  labels: ShareLabels,
): string {
  const benefits = (scheme.benefits ?? []).map((b) => clip(b, 160)).filter(Boolean).slice(0, MAX_BENEFITS);
  const documents = (scheme.documents ?? []).map((d) => clip(d, 90)).filter(Boolean);
  const lines = [`*${scheme.name}*`];
  if (benefits.length > 0) lines.push('', `${labels.benefit} ${benefits.join(' ')}`);
  if (documents.length > 0) {
    lines.push('', labels.documents, ...documents.slice(0, MAX_DOCUMENTS).map((d) => `• ${d}`));
    if (documents.length > MAX_DOCUMENTS) lines.push(`• … (+${documents.length - MAX_DOCUMENTS})`);
  }
  lines.push('', labels.details, url);
  return lines.join('\n');
}
