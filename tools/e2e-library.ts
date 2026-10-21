// End-to-end checks for the Drug Library overlay in a real browser (npm run test:e2e).
//
// Opening from the header, keyboard search, deep links, back/forward between entries, tree links,
// Esc / × closing back to the app with the session untouched, and provenance markers shown for
// drafts but hidden for a verified entry (one drug is marked verified in a patched drugs.json).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import { createServer } from 'vite';
import type { Library } from '../src/types';

const ROOT = resolve(import.meta.dirname, '..');
const PORT = 5197;
const BASE = `http://localhost:${PORT}/`;
const scenario = JSON.parse(readFileSync(resolve(ROOT, 'tools/help-scenario.json'), 'utf8')) as { session: unknown };
const VERIFIED_DRUG = 'codeine';

function patchedLibrary(): string {
  const lib = JSON.parse(readFileSync(resolve(ROOT, 'public/drugs.json'), 'utf8')) as Library;
  const products = lib.products.filter((p) => p.candidateId === VERIFIED_DRUG);
  const ids = new Set(products.flatMap((p) => p.components.map((c) => c.compound)));
  for (let grew = true; grew;) {
    grew = false;
    for (const c of lib.compounds) if (!ids.has(c.id) && c.formedFrom.some((f) => ids.has(f.compound))) ids.add(c.id), (grew = true);
  }
  for (const e of [...products, ...lib.compounds.filter((c) => ids.has(c.id))]) Object.assign(e, { verified: true, verifiedDate: '2026-10-01' });
  return JSON.stringify(lib);
}

const results: string[] = [];
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  results.push(name);
  console.log(`  ✓ ${name}`);
}

const hash = (page: Page) => page.evaluate(() => location.hash);
const title = (page: Page) => page.locator('.lib-detail .lib-entry-title').innerText();
const overlayOpen = (page: Page) => page.locator('.lib-overlay').isVisible();
const stored = (page: Page) => page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => !/ui/i.test(k))));

async function main() {
  const server = await createServer({ root: ROOT, server: { port: PORT, strictPort: true }, logLevel: 'error' });
  await server.listen();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    await ctx.addInitScript((s) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('cleardate.session.v2', JSON.stringify(s));
        sessionStorage.setItem('seeded', '1');
      }
    }, scenario.session);
    const lib = patchedLibrary();
    await ctx.route('**/drugs.json*', (r) => r.fulfill({ contentType: 'application/json', body: lib }));
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(BASE);
    await page.locator('#chart canvas').first().waitFor();
    const before = await stored(page);
    const libBtn = page.getByRole('link', { name: 'Library' });

    await check('header button opens the overlay at #library with focus in search', async () => {
      await libBtn.click();
      await page.locator('.lib-overlay').waitFor();
      assert.equal(await hash(page), '#library');
      assert.ok(await page.locator('.lib-search').evaluate((el) => el === document.activeElement));
      assert.match(await page.locator('.lib-statement').innerText(), /drafted with the assistance of AI language models/);
      assert.ok(await page.locator('#app').evaluate((el) => el.hasAttribute('inert')));
    });

    await check('typing filters; ↓ and Enter open an entry', async () => {
      await page.keyboard.type('fluox');
      await page.locator('a.lib-row', { hasText: 'Fluoxetine' }).first().waitFor();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => location.hash === '#library/fluoxetine');
      assert.equal(await title(page), 'Fluoxetine');
      assert.match(await page.locator('.lib-glance').innerText(), /^After a single dose, typically below the clear threshold in ~\d+ days/);
    });

    await check('draft entries show provenance markers and the legend', async () => {
      assert.ok((await page.locator('.lib-detail .lib-src-row .lib-prov').count()) > 0);
      assert.equal(await page.locator('.lib-legend').count(), 1);
    });

    await check('evidence notes expander reveals the raw notes verbatim', async () => {
      const raw = page.locator('.lib-src[open] .lib-raw').first();
      await raw.locator('summary').click();
      assert.match(await raw.locator('pre').innerText(), /\[(checked|recall|gap|estimate)\]/);
    });

    await check('tree links open the metabolite entry', async () => {
      await page.locator('a.lib-node[href="#library/norfluoxetine"]').click();
      await page.waitForFunction(() => location.hash === '#library/norfluoxetine');
      assert.equal(await title(page), 'Norfluoxetine');
    });

    await check('back / forward walk between entries', async () => {
      await page.goBack();
      await page.waitForFunction(() => location.hash === '#library/fluoxetine');
      assert.equal(await title(page), 'Fluoxetine');
      await page.goForward();
      await page.waitForFunction(() => location.hash === '#library/norfluoxetine');
      assert.equal(await title(page), 'Norfluoxetine');
    });

    await check('Esc closes back to the app with the session intact and focus restored', async () => {
      await page.locator('.lib-detail').click({ position: { x: 5, y: 5 } });
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.lib-overlay'));
      assert.equal(await hash(page), '');
      assert.deepEqual(await stored(page), before);
      assert.ok(await libBtn.evaluate((el) => el === document.activeElement));
      assert.ok(!(await page.locator('#app').evaluate((el) => el.hasAttribute('inert'))));
      assert.ok(await page.locator('#chart canvas').first().isVisible());
    });

    await check('a deep link opens the entry; × closes to the app', async () => {
      await page.goto(`${BASE}#library/methadone`);
      await page.locator('.lib-overlay').waitFor();
      assert.equal(await title(page), 'Methadone');
      await page.locator('a.lib-node').nth(1).click();
      await page.waitForFunction(() => location.hash !== '#library/methadone');
      await page.getByRole('button', { name: 'Close library' }).click();
      await page.waitForFunction(() => !document.querySelector('.lib-overlay'));
      assert.equal(await hash(page), '');
      assert.equal(await overlayOpen(page), false);
      assert.deepEqual(await stored(page), before);
    });

    await check('verified entries hide provenance markers', async () => {
      await page.goto(`${BASE}#library/${VERIFIED_DRUG}`);
      await page.locator('.lib-overlay').waitFor();
      assert.match(await page.locator('.lib-entry-head .lib-status').innerText(), /^Verified/);
      assert.equal(await page.locator('.lib-detail .lib-prov').count(), 0);
      assert.equal(await page.locator('.lib-legend').count(), 0);
    });

    await check('an unknown id says so', async () => {
      await page.goto(`${BASE}#library/not_a_drug`);
      await page.locator('.lib-overlay').waitFor();
      assert.equal(await title(page), 'Not in the library');
    });

    await check('narrow screens: list first, entry replaces it with a back button', async () => {
      await page.setViewportSize({ width: 600, height: 900 });
      await page.goto(`${BASE}#library`);
      await page.locator('.lib-overlay').waitFor();
      assert.ok(await page.locator('.lib-list').isVisible());
      await page.locator('a.lib-row').first().click();
      await page.locator('.lib-back').waitFor();
      assert.equal(await page.locator('.lib-list').isVisible(), false);
      await page.locator('.lib-back').click();
      await page.waitForFunction(() => location.hash === '#library');
      assert.ok(await page.locator('.lib-list').isVisible());
    });

    assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
    console.log(`\n${results.length} library checks passed.`);
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
