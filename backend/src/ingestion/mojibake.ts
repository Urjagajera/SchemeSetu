/**
 * mojibake.ts
 * Utility for repairing UTF-8-read-as-Latin-1 encoding corruption,
 * stray mid-text BOM artifacts, and orphaned control sequences in dataset strings.
 */

/**
 * Repairs known mojibake and encoding corruption patterns resulting from
 * UTF-8 byte sequences being misread as Latin-1 / Windows-1252, stray mid-text BOMs,
 * and orphan control sequences.
 *
 * Known patterns repaired:
 * - â‚¹ -> ₹ (Rupee symbol)
 * - â€™, â€˜ -> ' (Single quotes)
 * - â€œ -> “ (Left double quote)
 * - â€\u009d, â€, €\u009d -> ” (Right double quote / curly quote artifacts)
 * - ï»¿, \ufeff -> stripped entirely (UTF-8 BOM read as Latin-1 or mid-text zero-width BOM)
 * - â€” -> — (Em dash)
 * - â€“ -> – (En dash)
 * - â€¦ -> … (Ellipsis)
 */
export function repairMojibake(text: string): string {
  if (typeof text !== 'string' || !text) {
    return text ?? '';
  }

  return text
    // Stray UTF-8 BOM read as Latin-1 (ï»¿) or Unicode zero-width BOM (\ufeff)
    .replace(/ï»¿/g, '')
    .replace(/\ufeff/g, '')
    // Rupee symbol corruption (UTF-8 \xE2\x82\xB9 read as Latin-1)
    .replace(/â‚¹/g, '₹')
    // Single quotes corruption (UTF-8 \xE2\x80\x99, \xE2\x80\x98)
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    // Double quotes corruption (UTF-8 \xE2\x80\x9C, \xE2\x80\x9D)
    .replace(/â€œ/g, '“')
    .replace(/â€\u009d/g, '”')
    .replace(/â€/g, '”')
    // Windows-1252 orphaned Euro + 0x9D quote corruption
    .replace(/€\u009d/g, '”')
    // Em and En dashes (UTF-8 \xE2\x80\x94, \xE2\x80\x93)
    .replace(/â€”/g, '—')
    .replace(/â€“/g, '–')
    // Ellipsis (UTF-8 \xE2\x80\xA6)
    .replace(/â€¦/g, '…');
}
