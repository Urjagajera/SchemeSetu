/**
 * Plain-language checks for the weekly job's database connection (the DATABASE_URL repository secret on GitHub).
 * Nothing here ever prints the connection string, the password, or the database's host name.
 */

/**
 * Cleans what is commonly pasted by mistake around a connection string: spaces and line breaks, surrounding quotes,
 * and Neon's "psql '...'" command form. Returns null when nothing usable is left.
 */
export function cleanDatabaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  let url = raw.trim();
  url = url.replace(/^psql\s+/i, '').trim();
  url = url.replace(/^(['"])(.*)\1$/s, '$2').trim();
  url = url.replace(/^DATABASE_URL\s*=\s*/i, '').trim();
  url = url.replace(/^(['"])(.*)\1$/s, '$2').trim();
  return url.length > 0 ? url : null;
}

/** What looks wrong with the shape of a connection string, in words that do not reveal it. Empty when it looks fine. */
export function databaseUrlProblems(raw: string | undefined): string[] {
  if (!raw || raw.trim() === '') return ['DATABASE_URL is empty or not set'];
  const problems: string[] = [];
  const cleaned = cleanDatabaseUrl(raw)!;
  if (cleaned !== raw) problems.push('it had extra text around it (spaces, quotes or "psql"); the job now removes that itself');
  if (!/^postgres(ql)?:\/\//i.test(cleaned)) problems.push('it does not start with postgresql:// (copy the "Connection string" from Neon, not a command)');
  else {
    if (!cleaned.includes('@')) problems.push('it has no user name and password part (user:password@...)');
    if (/\s/.test(cleaned)) problems.push('it contains spaces or line breaks inside it');
  }
  return problems;
}

/** Hides anything that could identify the database: connection strings and quoted host names. */
function redact(text: string): string {
  return text
    .replace(/postgres(ql)?:\/\/\S+/gi, '<connection string>')
    .replace(/`[^`]*`/g, '`<database host>`')
    .replace(/\b[\w-]+(\.[\w-]+)*\.(neon\.tech|aws\.neon\.tech|amazonaws\.com)\b/gi, '<database host>');
}

/** Prisma's connection error codes in plain words (https://www.prisma.io/docs/orm/reference/error-reference). */
const REASONS: Record<string, string> = {
  P1000: 'the database rejected the user name or password (copy the connection string again from Neon)',
  P1001: 'the database server could not be reached (wrong host, or the connection string is incomplete)',
  P1002: 'the database server was reached but did not answer in time',
  P1003: 'the database named in the connection string does not exist',
  P1008: 'the connection timed out',
  P1010: 'the database user is not allowed to use this database',
  P1011: 'a secure (TLS) connection could not be opened',
  P1012: 'the connection string is not valid',
  P1013: 'the connection string is not a valid database address',
  P1017: 'the database server closed the connection',
  P2021: 'the database has no SchemeSetu tables yet (migrations were not applied to it)',
};

/** A short, safe reason for a database error, for the run's report and log. */
export function databaseErrorReason(e: unknown): string {
  const err = e as { errorCode?: string; code?: string; message?: string } | null;
  const code = err?.errorCode ?? err?.code;
  if (code && REASONS[code]) return `${REASONS[code]} [${code}]`;
  const message = String(err?.message ?? e ?? 'unknown error');
  // Prisma puts the cause on the last non-empty line, after a code frame.
  // Skip Prisma's heading ("Invalid `prisma...` invocation in"), the file path and the code frame.
  const lines = message
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^Invalid `prisma/.test(l) && !/^(→|\d+\s)/.test(l) && !/\.(ts|js):\d+:\d+$/.test(l));
  const cause = lines.find((l) => /can't reach|authentication|password|does not exist|tls|ssl|timed out|invalid|denied|refused|must start with/i.test(l)) ?? lines[lines.length - 1] ?? 'unknown error';
  return redact(cause).slice(0, 300);
}
