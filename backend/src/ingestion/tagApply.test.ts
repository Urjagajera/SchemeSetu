import { describe, it, expect } from 'vitest';
import { applyTagMerge, schemeTagsOf, unresolvedVocabulary, verifyAdditive, type Backup, type LinkRow, type TagRow, type TagStore, type TagStoreTx } from './tagApply.js';

/** An in-memory database: real link moving, real rollback. `bug` lets a test make the merge misbehave. */
class FakeStore implements TagStore {
  tags: TagRow[];
  links: LinkRow[];
  schemes: number;
  log: string[] = [];
  bug?: (links: LinkRow[], fromId: string, toId: string) => LinkRow[];

  constructor(tags: Array<[string, string]>, links: Array<[string, string]>, schemes: number) {
    this.tags = tags.map(([id, name]) => ({ id, name }));
    this.links = links.map(([schemeId, tagId]) => ({ schemeId, tagId }));
    this.schemes = schemes;
  }
  async loadTags() { return this.tags.map((t) => ({ ...t })); }
  async loadLinks() { return this.links.map((l) => ({ ...l })); }
  async countSchemes() { return this.schemes; }
  async transaction<T>(work: (tx: TagStoreTx) => Promise<T>): Promise<T> {
    const snapshot = { tags: this.tags.map((t) => ({ ...t })), links: this.links.map((l) => ({ ...l })) };
    this.log.push('begin');
    try {
      const result = await work({
        loadTags: () => this.loadTags(),
        loadLinks: () => this.loadLinks(),
        countSchemes: () => this.countSchemes(),
        mergeTag: async (fromId, toId) => {
          this.log.push(`merge ${fromId}->${toId}`);
          if (this.bug) { this.links = this.bug(this.links, fromId, toId); }
          else {
            const have = new Set(this.links.filter((l) => l.tagId === toId).map((l) => l.schemeId));
            for (const l of this.links.filter((x) => x.tagId === fromId)) if (!have.has(l.schemeId)) { this.links.push({ schemeId: l.schemeId, tagId: toId }); have.add(l.schemeId); }
          }
          this.links = this.links.filter((l) => l.tagId !== fromId);
          this.tags = this.tags.filter((t) => t.id !== fromId);
        },
      });
      this.log.push('commit');
      return result;
    } catch (e) {
      this.tags = snapshot.tags;
      this.links = snapshot.links;
      this.log.push('rollback');
      throw e;
    }
  }
}

// t1 Loan, t2 Loans, t3 Farmer, t4 Farmers, t5 Scholarship (no variant)
const fixture = () =>
  new FakeStore(
    [['t1', 'Loan'], ['t2', 'Loans'], ['t3', 'Farmer'], ['t4', 'Farmers'], ['t5', 'Scholarship']],
    [['s1', 't1'], ['s1', 't2'], ['s1', 't5'], ['s2', 't2'], ['s3', 't4'], ['s3', 't3'], ['s4', 't5'], ['s5', 't4']],
    6, // s6 has no tags at all
  );
const RENAMES = { Loans: 'Loan', Farmers: 'Farmer' };
const noBackup = { writeBackup: async () => {} };
const names = (s: FakeStore) => s.tags.map((t) => t.name).sort();
const tagsOf = async (s: FakeStore, scheme: string) => [...(schemeTagsOf(await s.loadTags(), await s.loadLinks()).get(scheme) ?? [])].sort();

describe('applyTagMerge: what it does', () => {
  it('merges the tags and keeps every scheme\'s tags, with the new name in place of the old', async () => {
    const store = fixture();
    const proof = await applyTagMerge(store, RENAMES, noBackup);
    expect(names(store)).toEqual(['Farmer', 'Loan', 'Scholarship']);
    expect(await tagsOf(store, 's1')).toEqual(['Loan', 'Scholarship']); // had Loan AND Loans: now Loan once
    expect(await tagsOf(store, 's2')).toEqual(['Loan']); // had only Loans
    expect(await tagsOf(store, 's3')).toEqual(['Farmer']);
    expect(await tagsOf(store, 's5')).toEqual(['Farmer']);
    expect(await tagsOf(store, 's4')).toEqual(['Scholarship']); // untouched
    expect(proof).toMatchObject({ renamesApplied: 2, tagsBefore: 5, tagsAfter: 3, schemesBefore: 6, schemesAfter: 6, problems: [] });
    expect(proof.linksBefore - proof.linksAfter).toBe(2); // s1 and s3 each carried two spellings
  });

  it('does not touch a scheme that had none of the merged tags', async () => {
    const store = fixture();
    await applyTagMerge(store, RENAMES, noBackup);
    expect(await tagsOf(store, 's4')).toEqual(['Scholarship']);
    expect(await tagsOf(store, 's6')).toEqual([]);
  });

  it('takes the backup, with every tag and link, BEFORE changing anything', async () => {
    const store = fixture();
    let backup: Backup | undefined;
    let tagsWhenBackedUp = -1;
    await applyTagMerge(store, RENAMES, { writeBackup: async (b) => { backup = b; tagsWhenBackedUp = store.tags.length; } });
    expect(tagsWhenBackedUp).toBe(5);
    expect(backup?.tags).toHaveLength(5);
    expect(backup?.links).toHaveLength(8);
    expect(backup?.schemeCount).toBe(6);
    expect(store.log[0]).toBe('begin');
  });

  it('does not start if the backup fails', async () => {
    const store = fixture();
    await expect(applyTagMerge(store, RENAMES, { writeBackup: async () => { throw new Error('disk full'); } })).rejects.toThrow('disk full');
    expect(store.log).toEqual([]);
    expect(names(store)).toHaveLength(5);
  });

  it('a plan-only run takes the backup and changes nothing', async () => {
    const store = fixture();
    let backedUp = false;
    const proof = await applyTagMerge(store, RENAMES, { writeBackup: async () => { backedUp = true; }, dryRun: true });
    expect(backedUp).toBe(true);
    expect(store.log).toEqual([]);
    expect(names(store)).toHaveLength(5);
    expect(proof).toMatchObject({ renamesApplied: 0, tagsBefore: 5, tagsAfter: 3 });
  });

  it('is safe to run twice: the second run finds nothing to do', async () => {
    const store = fixture();
    await applyTagMerge(store, RENAMES, noBackup);
    const logAfterFirst = [...store.log];
    const second = await applyTagMerge(store, RENAMES, noBackup);
    expect(second).toMatchObject({ renamesApplied: 0, renamesAlreadyDone: 2, tagsBefore: 3, tagsAfter: 3, problems: [] });
    expect(store.log.slice(logAfterFirst.length).filter((l) => l.startsWith('merge'))).toEqual([]);
  });
});

describe('applyTagMerge: it refuses a plan it should not run', () => {
  it('a short tag merging into a longer, different one', async () => {
    const store = new FakeStore([['a', 'Workers'], ['b', 'Construction Workers']], [['s1', 'a']], 1);
    await expect(applyTagMerge(store, { Workers: 'Construction Workers' }, noBackup)).rejects.toThrow(/not the same phrase/);
    expect(store.log).toEqual([]);
  });

  it('a typo, a synonym, or a plural in a word other than the last', async () => {
    for (const [from, to] of [['Enterpris', 'Enterprise'], ['Cultivator', 'Farmer'], ['Persons With Disability', 'Person With Disability']]) {
      const store = new FakeStore([['a', from], ['b', to]], [['s1', 'a']], 1);
      await expect(applyTagMerge(store, { [from]: to }, noBackup)).rejects.toThrow(/not the same phrase/);
    }
  });

  it('merging into a tag that does not exist', async () => {
    const store = new FakeStore([['a', 'Loans']], [['s1', 'a']], 1);
    await expect(applyTagMerge(store, { Loans: 'Loan' }, noBackup)).rejects.toThrow(/does not exist/);
  });

  it('a chain, where the kept tag is itself renamed', async () => {
    const store = new FakeStore([['a', 'Loans'], ['b', 'Loan'], ['c', 'LOAN']], [], 0);
    await expect(applyTagMerge(store, { Loans: 'Loan', Loan: 'LOAN' }, noBackup)).rejects.toThrow(/itself renamed/);
  });
});

describe('applyTagMerge: it rolls back rather than leave a scheme without a tag', () => {
  it('when the merge drops a link, the proof fails and nothing is changed', async () => {
    const store = fixture();
    store.bug = (links, fromId) => links.filter((l) => l.tagId !== fromId); // deletes the old links without moving them
    await expect(applyTagMerge(store, RENAMES, noBackup)).rejects.toThrow(/proof failed, rolling back.*lost/);
    expect(store.log.at(-1)).toBe('rollback');
    expect(names(store)).toEqual(['Farmer', 'Farmers', 'Loan', 'Loans', 'Scholarship']);
    expect(await tagsOf(store, 's2')).toEqual(['Loans']);
  });

  it('when the merge gives a scheme a tag it never had', async () => {
    const store = fixture();
    store.bug = (links, fromId, toId) => [...links, { schemeId: 's4', tagId: toId }]; // attaches the target to an unrelated scheme
    await expect(applyTagMerge(store, RENAMES, noBackup)).rejects.toThrow(/gained/);
    expect(await tagsOf(store, 's4')).toEqual(['Scholarship']);
  });

  it('when the scheme count changes', async () => {
    const store = fixture();
    const original = store.transaction.bind(store);
    store.transaction = async (work) => original(async (tx) => { store.schemes = 5; return work(tx); });
    await expect(applyTagMerge(store, RENAMES, noBackup)).rejects.toThrow(/scheme count changed/);
    expect(names(store)).toHaveLength(5);
  });
});

describe('verifyAdditive', () => {
  const before = new Map([['s1', new Set(['Loan', 'Loans'])], ['s2', new Set(['Loans'])]]);

  it('accepts exactly the renamed result', () => {
    expect(verifyAdditive(before, new Map([['s1', new Set(['Loan'])], ['s2', new Set(['Loan'])]]), { Loans: 'Loan' })).toEqual([]);
  });

  it('reports a lost tag, a gained tag, and a scheme that appeared', () => {
    expect(verifyAdditive(before, new Map([['s1', new Set(['Loan'])]]), { Loans: 'Loan' }).join('|')).toMatch(/s2 lost: Loan/);
    expect(verifyAdditive(before, new Map([['s1', new Set(['Loan', 'Farmer'])], ['s2', new Set(['Loan'])]]), { Loans: 'Loan' }).join('|')).toMatch(/s1 gained: Farmer/);
    expect(verifyAdditive(before, new Map([['s1', new Set(['Loan'])], ['s2', new Set(['Loan'])], ['s9', new Set(['X'])]]), { Loans: 'Loan' }).join('|')).toMatch(/s9 has tags now/);
  });

  it('reports a merged-away name that is still on a scheme', () => {
    expect(verifyAdditive(before, new Map([['s1', new Set(['Loan', 'Loans'])], ['s2', new Set(['Loan'])]]), { Loans: 'Loan' }).join('|')).toMatch(/s1 gained: Loans/);
  });
});

describe('unresolvedVocabulary: the Hindi entries must still resolve', () => {
  const vocabulary = { Loan: 'ऋण', Farmer: 'किसान', Loans: 'ऋण' };

  it('is clean when each key still exists or was merged into a name that has its own entry', () => {
    expect(unresolvedVocabulary(['Loan', 'Loans', 'Farmer'], { Loans: 'Loan' }, new Set(['Loan', 'Farmer']), vocabulary)).toEqual([]);
  });

  it('flags a key whose tag disappeared without a home', () => {
    expect(unresolvedVocabulary(['Farmer'], {}, new Set(['Loan']), vocabulary)).toEqual(['Farmer: its tag "Farmer" does not exist']);
  });

  it('flags a merge into a name with no Hindi entry', () => {
    expect(unresolvedVocabulary(['Loans'], { Loans: 'Credit' }, new Set(['Credit']), vocabulary)).toEqual(['Loans: merged into "Credit", which has no Hindi entry']);
  });
});
