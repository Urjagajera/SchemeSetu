import { describe, it, expect, vi } from 'vitest';
import { parseNewRows, addNewSchemes } from './addToDatabase.js';
import { toCsvValues, ScrapedScheme } from './csvRow.js';

const row = (over: Partial<ScrapedScheme> = {}) =>
  toCsvValues({
    url: 'https://www.myscheme.gov.in/schemes/new-one',
    title: 'New Widow Pension',
    ministry: 'Gujarat',
    tags: ['Widow', 'Pensions'],
    details: 'Details\nA pension for widows.',
    benefits: ['₹1,250 a month'],
    eligibility: ['The applicant must be a widow.', 'Applicants aged between 18 and 60 years may apply.', 'Annual family income must not exceed ₹1,20,000.'],
    mode: 'Online\nOffline',
    applicationProcess: 'Application Process\nOnline\nOffline\nOnline:\nApply on the portal.\nOffline:\nVisit the office.',
    documents: ['Aadhaar', 'Death certificate of husband'],
    ...over,
  });

describe('parseNewRows: new rows go through the same parser as the whole CSV', () => {
  it('reads the scheme fields, both ways to apply and the steps of each', () => {
    const [s] = parseNewRows([row()]);
    expect(s.sourceUrl).toBe('https://www.myscheme.gov.in/schemes/new-one');
    expect(s.name).toBe('New Widow Pension');
    expect(s.authorityName).toBe('Gujarat');
    expect(s.applicationMode).toEqual(['Online', 'Offline']);
    expect(s.applicationProcess).toContain('Offline:\nVisit the office.');
    expect(s.eligibilityRawText).toHaveLength(3);
    expect(s.documentRequirements).toEqual(['Aadhaar', 'Death certificate of husband']);
  });
});

function fakePrisma(existing: string[] = []) {
  const tx = {
    scheme: {
      findMany: vi.fn().mockResolvedValue(existing.map((sourceUrl) => ({ sourceUrl }))),
      create: vi.fn().mockImplementation(async ({ data }: { data: { sourceUrl: string } }) => ({ id: `id-${data.sourceUrl}` })),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    eligibilityCriteria: { create: vi.fn().mockResolvedValue({}), upsert: vi.fn(), deleteMany: vi.fn() },
  };
  const prisma = { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) };
  return { prisma: prisma as never, tx };
}

describe('addNewSchemes: only creates, in one transaction', () => {
  it('creates the scheme with its ministry and cleaned-up tags, and the eligibility read from its text', async () => {
    const { prisma, tx } = fakePrisma();
    const result = await addNewSchemes(prisma, parseNewRows([row()]));
    expect(result).toEqual({ added: 1, withCriteria: 1 });
    const data = tx.scheme.create.mock.calls[0][0].data;
    expect(data.sourceUrl).toBe('https://www.myscheme.gov.in/schemes/new-one');
    expect(data.categories.connectOrCreate.create).toMatchObject({ name: 'Gujarat', level: 'State', stateName: 'Gujarat' });
    // "Pensions" is stored under its cleaned-up name, as for the existing schemes (tagRenames.ts).
    expect(data.tags.connectOrCreate.map((t: { where: { name: string } }) => t.where.name)).toContain('Widow');
    const criteria = tx.eligibilityCriteria.create.mock.calls[0][0].data;
    expect(criteria).toMatchObject({ schemeId: 'id-https://www.myscheme.gov.in/schemes/new-one', ageMin: 18, ageMax: 60, incomeMaxAnnual: 120000 });
  });

  it('tags are stored under their cleaned-up names, as for the existing schemes (tagRenames.ts)', async () => {
    const { prisma, tx } = fakePrisma();
    await addNewSchemes(prisma, parseNewRows([row({ tags: ['Awards', 'Widow'] })]));
    const names = tx.scheme.create.mock.calls[0][0].data.tags.connectOrCreate.map((t: { where: { name: string } }) => t.where.name);
    expect(names).toEqual(['Award', 'Widow']);
  });

  it('never updates, upserts or deletes anything', async () => {
    const { prisma, tx } = fakePrisma();
    await addNewSchemes(prisma, parseNewRows([row()]));
    expect(tx.scheme.update).not.toHaveBeenCalled();
    expect(tx.scheme.upsert).not.toHaveBeenCalled();
    expect(tx.scheme.delete).not.toHaveBeenCalled();
    expect(tx.eligibilityCriteria.upsert).not.toHaveBeenCalled();
    expect(tx.eligibilityCriteria.deleteMany).not.toHaveBeenCalled();
  });

  it('adds nothing at all when one of the schemes is already in the database', async () => {
    const { prisma, tx } = fakePrisma(['https://www.myscheme.gov.in/schemes/new-one']);
    await expect(addNewSchemes(prisma, parseNewRows([row({ url: 'https://www.myscheme.gov.in/schemes/other' }), row()]))).rejects.toThrow(/already in the database/);
    expect(tx.scheme.create).not.toHaveBeenCalled();
  });

  it('a scheme with no readable eligibility gets no criteria row', async () => {
    const { prisma, tx } = fakePrisma();
    const result = await addNewSchemes(prisma, parseNewRows([row({ eligibility: ['Open to all.'] })]));
    expect(result.withCriteria).toBe(0);
    expect(tx.eligibilityCriteria.create).not.toHaveBeenCalled();
  });
});
