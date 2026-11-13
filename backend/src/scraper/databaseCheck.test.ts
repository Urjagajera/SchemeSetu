import { describe, it, expect } from 'vitest';
import { cleanDatabaseUrl, databaseUrlProblems, databaseErrorReason } from './databaseCheck.js';

const GOOD = 'postgresql://user:secret@ep-example-123.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

describe('cleanDatabaseUrl: a secret pasted with extra text still works', () => {
  it('leaves a clean connection string alone', () => {
    expect(cleanDatabaseUrl(GOOD)).toBe(GOOD);
  });

  it('removes spaces, line breaks and quotes around it', () => {
    expect(cleanDatabaseUrl(`  "${GOOD}"\n`)).toBe(GOOD);
    expect(cleanDatabaseUrl(`'${GOOD}'`)).toBe(GOOD);
  });

  it("removes Neon's psql command form and a DATABASE_URL= prefix", () => {
    expect(cleanDatabaseUrl(`psql '${GOOD}'`)).toBe(GOOD);
    expect(cleanDatabaseUrl(`DATABASE_URL="${GOOD}"`)).toBe(GOOD);
  });

  it('nothing usable is null', () => {
    expect(cleanDatabaseUrl(undefined)).toBeNull();
    expect(cleanDatabaseUrl('   ')).toBeNull();
  });
});

describe('databaseUrlProblems: says what is wrong without showing the secret', () => {
  it('a clean connection string has no problems', () => {
    expect(databaseUrlProblems(GOOD)).toEqual([]);
  });

  it('names each kind of mistake', () => {
    expect(databaseUrlProblems('')).toEqual(['DATABASE_URL is empty or not set']);
    expect(databaseUrlProblems(`psql '${GOOD}'`).join(' ')).toMatch(/extra text/);
    expect(databaseUrlProblems('ep-example.neon.tech/neondb').join(' ')).toMatch(/does not start with postgresql/);
    expect(databaseUrlProblems('postgresql://ep-example.neon.tech/neondb').join(' ')).toMatch(/no user name and password/);
  });

  it('never repeats the password or the host', () => {
    for (const raw of [GOOD, `psql '${GOOD}'`, 'postgresql://user:secret@host']) {
      const text = databaseUrlProblems(raw).join(' ');
      expect(text).not.toContain('secret');
      expect(text).not.toContain('neon.tech');
    }
  });
});

describe('databaseErrorReason: a short, safe reason for the report', () => {
  it("uses Prisma's error code when there is one", () => {
    expect(databaseErrorReason({ errorCode: 'P1000', message: 'Authentication failed' })).toMatch(/user name or password.*P1000/);
    expect(databaseErrorReason({ errorCode: 'P1001', message: 'x' })).toMatch(/could not be reached.*P1001/);
  });

  it('otherwise picks the cause line from a long Prisma message and hides the host', () => {
    const message = [
      'Invalid `prisma.scheme.findMany()` invocation in',
      '/home/runner/work/SchemeSetu/SchemeSetu/backend/src/scraper/run.ts:131:55',
      '',
      '→ 131     for (const { sourceUrl } of await prisma.scheme.findMany(',
      "Can't reach database server at `ep-example-123.ap-southeast-1.aws.neon.tech:5432`",
      '',
      'Please make sure your database server is running.',
    ].join('\n');
    const reason = databaseErrorReason(new Error(message));
    expect(reason).toMatch(/^Can't reach database server at/);
    expect(reason).not.toContain('neon.tech');
  });

  it('never shows a connection string found in a message', () => {
    expect(databaseErrorReason(new Error(`invalid URL ${GOOD}`))).not.toContain('secret');
  });
});
