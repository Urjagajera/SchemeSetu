/** A language's name in its own script, as shown on the per-section language switch. */
const NATIVE_NAMES: Record<string, string> = { en: 'English', hi: 'हिन्दी', gu: 'ગુજરાતી' };

export function nativeLanguageName(code: string): string {
  return NATIVE_NAMES[code] ?? code;
}
