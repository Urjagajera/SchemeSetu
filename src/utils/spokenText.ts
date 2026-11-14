/** An answer as it should be heard: link and bold markers out, link labels kept ("[PM-KISAN](/schemes/..)" -> "PM-KISAN"). */
export function spokenText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^#+\s*/gm, '');
}
