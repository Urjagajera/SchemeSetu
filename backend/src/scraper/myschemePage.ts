import type { Browser, Page } from 'playwright';
import { chromium } from 'playwright';
import type { ScrapedScheme } from './csvRow.js';
import { canonicalSchemeUrl } from './schemeUrl.js';

/**
 * Everything that reads myScheme (https://www.myscheme.gov.in) in a hidden browser. Its pages build themselves with
 * JavaScript, so a plain download is empty; robots.txt allows crawling. One page at a time, with pauses, so the site
 * is never loaded heavily.
 *
 * Checked by hand on 100 random schemes already in the CSV (2026-11-05): no scraper errors against the live page.
 */

const SITE = 'https://www.myscheme.gov.in';
export const PAUSE_MS = 1500;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function openBrowser(): Promise<Browser> {
  // SCRAPER_BROWSER_CHANNEL=msedge uses the Edge already installed on a Windows PC; GitHub's runner uses Playwright's Chromium.
  return chromium.launch({ headless: true, channel: process.env.SCRAPER_BROWSER_CHANNEL || undefined });
}

/** A browser tab for reading myScheme. */
export async function newSchemePage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  // When run with tsx, functions sent into the page carry calls to a `__name` helper the page does not have.
  await page.addInitScript({ content: 'window.__name = (f) => f;' });
  return page;
}

export type PageResult = { removed: true } | { removed: false; scheme: Omit<ScrapedScheme, 'url' | 'tags'> & { pageTags: string[] } };

/** Reads one scheme page. Every "how to apply" tab is opened, so Offline steps are kept as well as Online ones. */
export async function readSchemePage(page: Page, url: string): Promise<PageResult> {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  // myScheme sends a removed scheme to /404.
  if (new URL(page.url()).pathname === '/404') return { removed: true };
  await page.waitForSelector('h1[title]', { timeout: 30_000 });

  const tabCount = await page.evaluate(() => {
    const sec = document.getElementById('application-process');
    const editor = sec?.querySelector('[data-slate-editor]');
    const tabs = sec ? [...sec.querySelectorAll('span')].filter((s) => !s.closest('[data-slate-node]') && (!editor || s.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING)) : [];
    tabs.forEach((t, i) => t.setAttribute('data-setu-tab', String(i)));
    return tabs.length;
  });

  // The steps of each tab: the page builds only the selected tab's text, so each tab is clicked in turn.
  const tabSteps: string[][] = [];
  for (let i = 0; i < Math.max(1, tabCount); i++) {
    if (tabCount > 1) {
      await page.locator(`[data-setu-tab="${i}"]`).click();
      await pause(700);
    }
    tabSteps.push(await page.evaluate(() => {
      const sec = document.getElementById('application-process');
      if (!sec) return [];
      const blocks = [...sec.querySelectorAll('[data-slate-node="element"]')].filter((el) => !el.querySelector('[data-slate-node="element"]'));
      return blocks.map((b) => (b.textContent ?? '').replace(/ /g, ' ').trim()).filter(Boolean);
    }));
  }

  const read = await page.evaluate(() => {
    const clean = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ').trim();
    const h1 = document.querySelector('h1[title]') as HTMLElement;
    let box: HTMLElement | null = h1;
    while (box && !box.querySelector('h3')) box = box.parentElement;
    let tagBox: HTMLElement | null = h1;
    while (tagBox && !tagBox.querySelector('div[role="button"][title]')) tagBox = tagBox.parentElement;

    // A section's lines: the innermost blocks of its text editor; a table row is one line with its cells joined by a tab.
    const lines = (id: string) => {
      const sec = document.getElementById(id);
      if (!sec) return [];
      const blocks = [...sec.querySelectorAll('[data-slate-node="element"]')].filter((el) => !el.querySelector('[data-slate-node="element"]'));
      const out: string[] = [];
      const rows = new Set<Element>();
      for (const b of blocks) {
        const tr = b.closest('tr');
        if (tr) {
          if (rows.has(tr)) continue;
          rows.add(tr);
          const cells = [...tr.children].map((c) => clean(c.textContent));
          if (cells.some(Boolean)) out.push(cells.join('\t'));
        } else {
          const t = clean(b.textContent);
          if (t) out.push(t);
        }
      }
      return out;
    };
    const heading = (id: string) => clean(document.getElementById(id)?.querySelector('h3')?.textContent);
    const tabs = [...document.querySelectorAll('[data-setu-tab]')].map((t) => clean((t as HTMLElement).innerText)); // as shown ("Via", not "via")
    return {
      title: clean(h1.getAttribute('title')),
      ministry: clean(box?.querySelector('h3')?.textContent),
      pageTags: [...(tagBox?.querySelectorAll('div[role="button"][title]') ?? [])].map((d) => clean(d.getAttribute('title'))).filter(Boolean),
      detailsHeading: heading('details') || 'Details',
      details: lines('details'),
      benefits: lines('benefits'),
      eligibility: lines('eligibility'),
      processHeading: heading('application-process') || 'Application Process',
      tabs,
      documents: lines('documents-required'),
    };
  });

  // How to apply, in the CSV's layout: heading, the ways to apply, then the steps. With several tabs each tab's steps
  // follow a line with its name ("Offline:"), so steps of different ways are never mixed up.
  const steps =
    read.tabs.length > 1
      ? read.tabs.flatMap((name, i) => [`${name}:`, ...(tabSteps[i] ?? [])])
      : (tabSteps[0] ?? []);
  return {
    removed: false,
    scheme: {
      title: read.title,
      ministry: read.ministry,
      pageTags: read.pageTags,
      details: read.details.length ? [read.detailsHeading, ...read.details].join('\n') : '',
      benefits: read.benefits,
      eligibility: read.eligibility,
      mode: read.tabs.join('\n'),
      applicationProcess: steps.length || read.tabs.length ? [read.processHeading, ...read.tabs, ...steps].join('\n') : '',
      documents: read.documents,
    },
  };
}

/** readSchemePage with up to three tries (myScheme is sometimes slow for a moment), waiting longer each time. */
export async function readSchemePageWithRetry(page: Page, url: string): Promise<PageResult> {
  let last: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await readSchemePage(page, url);
    } catch (e) {
      last = e;
      await pause(10_000 * attempt);
    }
  }
  throw last;
}

/**
 * Every scheme link myScheme lists, by going through its search pages sorted A to Z (the page number in the address
 * is ignored by the site, so it clicks "next"). Also returns the total the site says it has, so a run can tell a
 * complete list from a cut-short one.
 */
export async function listAllSchemeUrls(page: Page, log: (msg: string) => void = () => {}, maxPages = 2000): Promise<{ urls: string[]; siteTotal: number | null }> {
  await page.goto(`${SITE}/search`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.locator('select').first().selectOption('schemename-asc');
  await pause(3000);
  const siteTotal = await page.evaluate(() => {
    const m = document.body.innerText.match(/Total\s+([\d,]+)\s+schemes/i);
    return m ? Number(m[1].replace(/,/g, '')) : null;
  });

  const found = new Set<string>();
  const pageLinks = async () => (await page.evaluate(() => [...document.querySelectorAll('a[href*="/schemes/"]')].map((a) => a.getAttribute('href') ?? ''))).join('\n');
  // "next" is the arrow after the page numbers.
  const next = page.locator('ul:has(li) > svg').last();
  /** Clicks "next" and waits up to 30 s for other cards; myScheme is sometimes slow for a moment, so up to 3 tries. */
  const goNext = async (current: string): Promise<boolean> => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      if ((await next.count()) === 0) return false;
      await next.click();
      for (let w = 0; w < 60; w++) {
        await pause(500);
        if ((await pageLinks()) !== current) return true;
      }
      log(`  page did not change after "next" (try ${attempt} of 3)`);
    }
    return false;
  };

  let links = await pageLinks();
  for (let n = 1; n <= maxPages; n++) {
    for (const href of links.split('\n')) {
      const url = canonicalSchemeUrl(href);
      if (url) found.add(url);
    }
    if (n % 50 === 0) log(`  listed ${n} pages, ${found.size} schemes`);
    if (siteTotal !== null && found.size >= siteTotal) break; // everything the site says it has
    if (!(await goNext(links))) break; // the last page, or the site stopped answering (the run then sees a short list)
    links = await pageLinks();
    await pause(PAUSE_MS);
  }
  return { urls: [...found].sort(), siteTotal };
}
