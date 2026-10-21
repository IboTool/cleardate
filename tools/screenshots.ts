// Regenerates every help-page screenshot from tools/help-scenario.json (npm run screenshots).
//
// Starts the Vite dev server, injects the fictional scenario into localStorage before the app loads,
// freezes "today", walks through the app with Playwright and writes WebP images plus callout
// positions (public/help/img/callouts.json) used by the numbered markers on the help page.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Locator, type Page } from 'playwright';
import { createServer } from 'vite';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'public/help/img');
const PORT = 5199;
const BASE = `http://localhost:${PORT}/`;
const scenario = JSON.parse(readFileSync(resolve(ROOT, 'tools/help-scenario.json'), 'utf8')) as { today: string; session: unknown };

type Box = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };
const callouts: Record<string, { n: number; x: number; y: number }[]> = {};
const written: string[] = [];

const pad = (b: Box, p: number): Box => ({ x: Math.max(0, b.x - p), y: Math.max(0, b.y - p), width: b.width + 2 * p, height: b.height + 2 * p });
const union = (...bs: Box[]): Box => {
  const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y));
  return { x, y, width: Math.max(...bs.map((b) => b.x + b.width)) - x, height: Math.max(...bs.map((b) => b.y + b.height)) - y };
};
const left = (b: Box, dx = 0): Point => ({ x: b.x + dx, y: b.y + b.height / 2 });
/** Top-left corner, so the marker sits on the element's border rather than its label. */
const corner = (b: Box): Point => ({ x: b.x + 3, y: b.y + 3 });
const above = (b: Box): Point => ({ x: b.x + b.width / 2, y: b.y - 12 });

async function box(l: Locator): Promise<Box> {
  const b = await l.boundingBox();
  if (!b) throw new Error(`Not visible: ${l}`);
  return b;
}

/** Just past the end of an element's text, so the marker doesn't cover it. */
async function textEnd(l: Locator): Promise<Point> {
  const r = await l.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((x) => x.width > 0);
    const last = rects[rects.length - 1] ?? el.getBoundingClientRect();
    return { right: last.right, mid: last.top + last.height / 2 };
  });
  return { x: r.right + 14, y: r.mid };
}

let converter: Page;

/** Screenshot a page region as WebP and record callout points (page coordinates) as % of the image. */
async function shot(page: Page, name: string, clip: Box | null, points: Point[] = []) {
  const vp = page.viewportSize()!;
  const c = clip
    ? { x: Math.max(0, Math.floor(clip.x)), y: Math.max(0, Math.floor(clip.y)), width: 0, height: 0 }
    : { x: 0, y: 0, width: vp.width, height: vp.height };
  if (clip) {
    c.width = Math.min(vp.width - c.x, Math.ceil(clip.width));
    c.height = Math.min(vp.height - c.y, Math.ceil(clip.height));
  }
  const png = await page.screenshot({ clip: c, animations: 'disabled' });
  const webp = await converter.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth;
    cv.height = img.naturalHeight;
    cv.getContext('2d')!.drawImage(img, 0, 0);
    return cv.toDataURL('image/webp', 0.86).split(',')[1];
  }, png.toString('base64'));
  writeFileSync(resolve(OUT, `${name}.webp`), Buffer.from(webp, 'base64'));
  written.push(`${name}.webp`);
  if (points.length)
    callouts[`${name}.webp`] = points.map((p, i) => ({
      n: i + 1,
      x: +(((p.x - c.x) / c.width) * 100).toFixed(2),
      y: +(((p.y - c.y) / c.height) * 100).toFixed(2),
    }));
  console.log(`  ${name}.webp`);
}

/** Pixel position of a chart value, via the app's own ECharts instance (dev server only). */
async function chartPoint(page: Page, gridIndex: number, t: number | string, v: number): Promise<Point> {
  return page.evaluate(async ([gi, tt, vv]) => {
    const ec = await import('/src/echarts.ts' as string);
    const el = document.getElementById('chart')!;
    const chart = ec.getInstanceByDom(el)!;
    const time = typeof tt === 'string' ? new Date(tt).getTime() : tt;
    const [x, y] = chart.convertToPixel({ xAxisIndex: gi, yAxisIndex: gi } as never, [time, vv]) as number[];
    const r = el.getBoundingClientRect();
    return { x: r.left + x, y: r.top + y };
  }, [gridIndex, t, v] as const);
}

/** A point on a plotted line, by series-id prefix and fraction along its data. */
async function linePoint(page: Page, idPrefix: string, frac: number): Promise<Point> {
  const [t, v] = await page.evaluate(async ([pre, f]) => {
    const ec = await import('/src/echarts.ts' as string);
    const chart = ec.getInstanceByDom(document.getElementById('chart')!)!;
    const s = (chart.getOption().series as { id?: string; data?: [number, number | null][] }[]).find((x) => x.id?.startsWith(pre));
    if (!s?.data?.length) throw new Error(`No series ${pre}`);
    const pts = s.data.filter((d) => d[1] !== null && d[1]! > 0);
    return pts[Math.floor(pts.length * f)];
  }, [idPrefix, frac] as const);
  return chartPoint(page, 0, t, v!);
}

async function settle(page: Page, ms = 400) {
  await page.waitForTimeout(ms);
}

async function setTab(page: Page, name: 'Doses' | 'Patient' | 'Settings') {
  await page.locator('.tabs .tab', { hasText: name }).click();
  await settle(page, 200);
}

async function pick(page: Page, query: string) {
  const input = page.locator('.picker-input');
  await input.click();
  await input.fill(query);
  await settle(page, 250);
  await input.press('Enter');
  await settle(page, 250);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = await createServer({ root: ROOT, configFile: resolve(ROOT, 'vite.config.ts'), server: { port: PORT, strictPort: true, open: false }, logLevel: 'warn' });
  await server.listen();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark', timezoneId: 'UTC', locale: 'en-GB',
      acceptDownloads: true,
    });
    converter = await context.newPage();
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date(`${scenario.today}Z`));
    await page.addInitScript((session) => {
      if (!sessionStorage.getItem('cleardate.screenshots')) {
        localStorage.setItem('cleardate.session.v2', JSON.stringify(session));
        sessionStorage.setItem('cleardate.screenshots', '1');
      }
    }, scenario.session);
    await page.goto(BASE);
    await page.addStyleTag({ content: '.dev-section { display: none !important; }' });
    await page.waitForFunction(() => document.querySelectorAll('.legend-item').length > 0);
    await settle(page, 1800);

    const chartWrap = page.locator('.chart-wrap');
    const side = page.locator('aside.side');
    const ib = scenario.session as { ibogaine: { flood: { time: string }; boosters: { time: string }[] } };
    const ibAt = `${ib.ibogaine.flood.time}Z`;
    const boosterAt = `${ib.ibogaine.boosters[0].time}Z`;
    const todayAt = `${scenario.today}Z`;

    console.log('Overview');
    const trackY = async (gi: number) => (await chartPoint(page, gi, todayAt, 0.5)).y;
    await shot(page, 'chart-overview', null, [
      corner(await box(page.locator('.tabs .tab').nth(1))),
      left(await box(page.locator('.legend-item').first()), 10),
      await linePoint(page, 'line:diazepam_oral', 0.2),
      { x: (await chartPoint(page, 0, ibAt, 0)).x, y: (await box(chartWrap)).y + 40 },
      { x: (await chartPoint(page, 1, todayAt, 0)).x - 120, y: await trackY(2) },
      left(await box(page.locator('.warnings')), 14),
    ]);

    const topbar = page.locator('.topbar');
    await shot(page, 'saved-indicator', pad(union(await box(page.locator('.wordmark')), await box(page.locator('.saved'))), 12));
    const headerButtons = union(await box(page.locator('.topbar .btn-gold')), await box(page.locator('.topbar a.btn')));
    await shot(page, 'header-controls', pad(headerButtons, 10), [
      corner(await box(page.locator('.topbar .btn-gold'))),
      corner(await box(topbar.getByRole('button', { name: 'Reset view' }))),
      corner(union(await box(topbar.getByRole('button', { name: 'PNG' })), await box(topbar.getByRole('button', { name: 'PDF' })))),
      corner(union(await box(topbar.getByRole('button', { name: 'Save file' })), await box(topbar.getByRole('button', { name: 'Load file' })))),
      corner(await box(page.locator('.topbar a.btn'))),
    ]);

    console.log('Chart');
    await shot(page, 'legend', pad(await box(page.locator('.legend')), 8), [
      await textEnd(page.locator('.legend-item', { hasText: 'Fluoxetine' }).locator('.legend-sub')),
      corner(await box(page.locator('.legend-item', { hasText: 'Methadone' }).locator('.legend-sub'))),
      corner(await box(page.locator('.legend-item', { hasText: 'Methadone' }).locator('.badge').first())),
      corner(await box(page.locator('.legend-key'))),
    ]);

    const wrap = await box(chartWrap);
    const mainBottom = await chartPoint(page, 0, todayAt, 0);
    const mainClip: Box = { x: wrap.x, y: wrap.y, width: wrap.width, height: mainBottom.y - wrap.y + 14 };
    const tick = await page.evaluate(async () => {
      const ec = await import('/src/echarts.ts' as string);
      const chart = ec.getInstanceByDom(document.getElementById('chart')!)!;
      const s = (chart.getOption().series as { id?: string; data?: [number, number][] }[]).find((x) => x.id === 'clear-ticks');
      return s?.data?.[0]?.[0] ?? null;
    });
    await shot(page, 'chart-main', mainClip, [
      { x: (await chartPoint(page, 0, todayAt, 0)).x, y: wrap.y + 22 },
      { x: (await chartPoint(page, 0, ibAt, 0)).x, y: wrap.y + 22 },
      { x: (await chartPoint(page, 0, boosterAt, 0)).x + 10, y: wrap.y + 60 },
      await linePoint(page, 'line:methadone_oral:methadone', 0.35),
      await linePoint(page, 'line:diazepam_oral:nordiazepam', 0.55),
      tick !== null ? { x: (await chartPoint(page, 0, tick, 0)).x, y: mainBottom.y - 22 } : { x: wrap.x + wrap.width / 2, y: mainBottom.y - 22 },
    ]);

    const tracksTop = (await chartPoint(page, 1, todayAt, 1)).y - 22;
    await shot(page, 'chart-tracks', { x: wrap.x, y: tracksTop, width: wrap.width, height: wrap.y + wrap.height - tracksTop }, [
      { x: wrap.x + 18, y: (await chartPoint(page, 1, todayAt, 1)).y - 12 },
      { x: (await chartPoint(page, 2, todayAt, 0)).x - 200, y: await trackY(2) },
      { x: wrap.x + wrap.width - 20, y: (await chartPoint(page, 2, todayAt, 1)).y - 12 },
      { x: wrap.x + 18, y: (await chartPoint(page, 3, todayAt, 1)).y - 12 },
      { x: wrap.x + wrap.width / 2, y: wrap.y + wrap.height - 24 },
    ]);

    const hover = await chartPoint(page, 0, new Date(new Date(ibAt).getTime() - 4 * 86400000).getTime(), 0);
    await page.mouse.move(hover.x, (wrap.y + 28 + hover.y) / 2);
    await settle(page, 500);
    const tip = page.locator('#chart > div').filter({ hasNot: page.locator('canvas') }).last();
    await shot(page, 'chart-tooltip', pad(union(mainClip, await box(tip)), 6));
    await page.mouse.move(5, 5);
    await settle(page, 300);

    await page.locator('.legend-item', { hasText: 'Diazepam' }).click();
    await settle(page, 400);
    await shot(page, 'chart-highlight', union(await box(page.locator('.legend')), mainClip));
    await page.locator('.legend-item', { hasText: 'Diazepam' }).click();
    await settle(page, 300);

    await shot(page, 'warnings', pad(await box(page.locator('.warnings')), 6));

    console.log('Settings and patient');
    await setTab(page, 'Settings');
    await page.locator('.field', { hasText: 'Y-axis' }).locator('select').selectOption('log');
    await settle(page, 500);
    await shot(page, 'chart-log-scale', mainClip);
    await page.locator('.field', { hasText: 'Y-axis' }).locator('select').selectOption('linear');
    await settle(page, 300);
    const sections = side.locator('.side-body > .section');
    await shot(page, 'settings-clearance', pad(await box(sections.nth(0)), 4));
    await sections.nth(1).scrollIntoViewIfNeeded();
    await shot(page, 'settings-display', pad(await box(sections.nth(1)), 4));
    const danger = side.getByRole('button', { name: 'Clear all data' });
    await danger.scrollIntoViewIfNeeded();
    const exportsSec = sections.filter({ hasText: 'Exports' });
    await shot(page, 'clear-all-data', pad(union(await box(exportsSec), await box(danger)), 6), [corner(await box(danger))]);

    await setTab(page, 'Patient');
    const fields = side.locator('.field');
    await shot(page, 'patient-details', pad(await box(side.locator('.side-body .section')), 2), [
      await textEnd(fields.filter({ hasText: 'Date of birth' }).locator('.field-hint').last()),
      await textEnd(fields.filter({ hasText: 'Body weight' }).locator('.field-hint')),
      corner(await box(fields.filter({ hasText: 'CYP2D6 phenotype' }).locator('select'))),
      corner(await box(fields.filter({ hasText: 'Baseline QTc' }).locator('input'))),
    ]);

    console.log('Finding drugs');
    await setTab(page, 'Doses');
    const input = page.locator('.picker-input');
    const pickerShot = async (name: string, q: string, points: () => Promise<Point[]> = async () => []) => {
      await input.click();
      await input.fill(q);
      await settle(page, 350);
      const b = union(await box(input), await box(page.locator('.picker-pop')));
      await shot(page, name, pad(b, 8), await points());
    };
    await pickerShot('picker-brand-name', 'valium', async () => [await textEnd(page.locator('.pi-alias').first())]);
    await pickerShot('picker-typo', 'diazapam');
    await pickerShot('picker-browse', '', async () => [
      corner(await box(page.locator('.chips .chip').first())),
      left(await box(page.locator('.picker-group.clickable').first()), 12),
      corner(await box(page.locator('.picker-item.disabled').first())),
    ]);
    await input.press('Escape');
    await settle(page, 200);

    console.log('Dose entry');
    const form = page.locator('.dose-form');
    await pick(page, 'diazepam oral');
    await form.locator('input[name=amount]').fill('10');
    await settle(page, 200);
    await shot(page, 'dose-entry-single', pad(await box(form), 4), [
      corner(await box(form.locator('.segmented'))),
      corner(await box(form.locator('input[name=amount]'))),
      corner(await box(form.locator('.dt-text').first())),
    ]);
    await form.locator('.dose-form-head .icon-btn').click();

    await page.locator('.dose-item', { hasText: 'Methadone' }).locator('button[title=Edit]').click();
    await settle(page, 250);
    await shot(page, 'dose-entry-regimen', pad(await box(form), 4), [
      corner(await box(form.locator('.segmented .seg.on'))),
      corner(await box(form.locator('.regimen .row').first().locator('input').first())),
      corner(await box(form.locator('.regimen .row').last().locator('input').first())),
      await textEnd(form.locator('.regimen > .field-hint')),
    ]);
    await form.locator('.dose-form-head .icon-btn').click();

    await pick(page, 'suboxone');
    await form.locator('input[name=amount]').fill('8');
    await settle(page, 200);
    await shot(page, 'dose-entry-combination', pad(await box(form), 4), [await textEnd(form.locator('.mgkg'))]);
    await form.locator('.dose-form-head .icon-btn').click();

    await page.locator('.dose-item', { hasText: 'Fentanyl' }).locator('button[title=Edit]').click();
    await settle(page, 250);
    await shot(page, 'dose-entry-patch', pad(await box(form), 4));
    await form.locator('.dose-form-head .icon-btn').click();

    await pick(page, 'vivitrol');
    await shot(page, 'dose-entry-depot', pad(await box(form), 4));
    await form.locator('.dose-form-head .icon-btn').click();
    await settle(page, 200);

    const list = side.locator('.section', { hasText: 'Entered doses' });
    await shot(page, 'dose-list', pad(await box(list), 2), [
      await textEnd(list.locator('.dose-group').first().locator('.dose-name')),
      await textEnd(list.locator('.dose-clear').nth(1)),
      above(await box(list.locator('button[title=Edit]').nth(1))),
      above(await box(list.locator('button[title=Delete]').nth(1))),
    ]);

    console.log('Ibogaine and custom drugs');
    await page.locator('.topbar .btn-gold').click();
    await settle(page, 300);
    const modal = page.locator('.modal');
    await shot(page, 'ibogaine-form', pad(await box(modal), 2), [
      corner(await box(modal.locator('.ib-row').first().locator('input[type=number]'))),
      await textEnd(modal.locator('.ib-row').first().locator('.mgkg')),
      corner(await box(modal.locator('.ib-row').nth(1).locator('.dt-text'))),
      corner(await box(modal.getByRole('button', { name: '+ Add booster' }))),
    ]);
    await modal.locator('.modal-head .icon-btn').click();
    await settle(page, 200);

    await page.getByRole('button', { name: '+ Add custom drug' }).click();
    await settle(page, 300);
    await modal.locator('input').first().fill('Example compound');
    await shot(page, 'wizard-basics', pad(await box(modal), 2), [corner(await box(modal.locator('.wizard-steps')))]);
    await modal.getByRole('button', { name: 'Next' }).click();
    await settle(page, 250);
    const hl = modal.locator('.hl-row').first();
    const untick = async (l: Locator) => { if (await l.isChecked()) await l.click(); };
    await untick(hl.locator('.hl-head .unk input'));
    await untick(hl.locator('.nullable').first().locator('.unk input'));
    await hl.locator('.nullable input[type=number]').first().fill('12');
    await shot(page, 'wizard-kinetics', pad(await box(modal), 2));
    await modal.getByRole('button', { name: 'Next' }).click();
    await settle(page, 250);
    await modal.getByRole('button', { name: /Add metabolite/ }).first().click();
    await settle(page, 200);
    await modal.locator('.met-head input').first().fill('Example metabolite');
    await shot(page, 'wizard-metabolites', pad(await box(modal), 2));
    await modal.locator('.modal-head .icon-btn').click();
    await settle(page, 200);

    console.log('Exports');
    const [pdf] = await Promise.all([page.waitForEvent('download'), topbar.getByRole('button', { name: 'PDF' }).click()]);
    const pdfBytes = readFileSync((await pdf.path())!);
    const [png] = await Promise.all([page.waitForEvent('download'), topbar.getByRole('button', { name: 'PNG' }).click()]);
    const pngBytes = readFileSync((await png.path())!);

    const viewer = await context.newPage();
    await viewer.goto(`${BASE}help.html`);
    for (const [i, name] of [[1, 'export-pdf-page-1'], [2, 'export-pdf-page-2']] as const) {
      const size = await viewer.evaluate(async ([b64, n]) => {
        const pdfjs = await import('/node_modules/pdfjs-dist/build/pdf.mjs' as string);
        pdfjs.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';
        const doc = await pdfjs.getDocument({ data: Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0)) }).promise;
        const pg = await doc.getPage(n);
        const vp = pg.getViewport({ scale: 1.2 });
        const cv = document.createElement('canvas');
        cv.width = vp.width;
        cv.height = vp.height;
        cv.style.cssText = `position:fixed;left:0;top:0;z-index:99999;width:${vp.width}px;height:${vp.height}px;box-shadow:none`;
        cv.id = 'pdf-page';
        document.getElementById('pdf-page')?.remove();
        document.body.append(cv);
        await pg.render({ canvas: cv, canvasContext: cv.getContext('2d')!, viewport: vp }).promise;
        return { width: vp.width, height: vp.height };
      }, [pdfBytes.toString('base64'), i] as const);
      await viewer.setViewportSize({ width: Math.ceil(size.width), height: Math.ceil(size.height) });
      await shot(viewer, name, { x: 0, y: 0, width: size.width, height: size.height });
    }
    await viewer.setViewportSize({ width: 1440, height: 900 });
    const pngWebp = await converter.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const cv = document.createElement('canvas');
      cv.width = 1200;
      cv.height = Math.round((img.naturalHeight * 1200) / img.naturalWidth);
      cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/webp', 0.86).split(',')[1];
    }, pngBytes.toString('base64'));
    writeFileSync(resolve(OUT, 'export-png.webp'), Buffer.from(pngWebp, 'base64'));
    written.push('export-png.webp');
    console.log('  export-png.webp');

    writeFileSync(resolve(OUT, 'callouts.json'), JSON.stringify(callouts, null, 2) + '\n');
    console.log(`\n${written.length} screenshots and callouts.json written to public/help/img/`);
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
