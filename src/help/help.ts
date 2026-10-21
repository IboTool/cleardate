// Help page: live library figures, numbered screenshot callouts and the table of contents.
// Same rules as the app: only same-origin requests (drugs.json and the callout positions).

import '@fontsource-variable/inter';
import './help.css';
import { dataStatement, libraryStats } from '../library/status';
import type { Library } from '../types';

const base = import.meta.env.BASE_URL;

function setFig(name: string, value: string) {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-fig="${name}"]`)) el.textContent = value;
}

/** Figures from drugs.json; the sentences that need them stay hidden if it can't be loaded. */
async function liveFigures() {
  setFig('version', __APP_VERSION__);
  try {
    const res = await fetch(`${base}drugs.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(String(res.status));
    const lib = (await res.json()) as Library;
    const n = (x: number) => x.toLocaleString('en-GB');
    const latest = [...lib.compounds, ...lib.products]
      .filter((e) => e.verified && /^\d{4}-\d{2}-\d{2}$/.test(e.verifiedDate ?? ''))
      .map((e) => e.verifiedDate)
      .sort()
      .at(-1) ?? __LIBRARY_COMMIT_DATE__;
    setFig('drugs', n(new Set(lib.products.map((p) => p.candidateId)).size));
    setFig('products', n(lib.products.length));
    setFig('compounds', n(lib.compounds.length));
    setFig('verifiedProducts', n(lib.products.filter((p) => p.verified).length));
    setFig('verifiedCompounds', n(lib.compounds.filter((c) => c.verified).length));
    const stats = libraryStats(lib);
    setFig('drugsVerified', n(stats.verified));
    setFig('drugsDraft', n(stats.draft));
    setFig('drugsIncomplete', n(stats.incomplete));
    setFig('drugsNoData', n(stats.noData));
    setFig('statement', dataStatement(stats));
    setFig('schema', String(lib.schemaVersion));
    setFig('updated', latest ? new Date(`${latest}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'unknown');
    if (lib.categories.length)
      setFig('categories', [...lib.categories].sort((a, b) => a.order - b.order).map((c) => c.name).join('; '));
    for (const el of document.querySelectorAll<HTMLElement>('.live')) el.hidden = false;
  } catch {
    /* offline or missing: the page reads fine without the numbers */
  }
}

/** Numbered markers over screenshots, positioned from callouts.json (written by npm run screenshots). */
async function callouts() {
  let pos: Record<string, { n: number; x: number; y: number }[]> = {};
  try {
    const res = await fetch(`${base}help/img/callouts.json`, { cache: 'no-cache' });
    if (res.ok) pos = await res.json();
  } catch {
    return;
  }
  for (const fig of document.querySelectorAll<HTMLElement>('figure.shot[data-img]')) {
    const frame = fig.querySelector('.shot-frame');
    const items = fig.querySelectorAll('.callout-list > li');
    const points = pos[fig.dataset.img!] ?? [];
    if (!frame || !items.length) continue;
    for (const p of points) {
      if (p.n > items.length) continue;
      const m = document.createElement('span');
      m.className = 'callout-marker';
      m.textContent = String(p.n);
      m.setAttribute('aria-hidden', 'true');
      m.style.left = `${Math.min(97, Math.max(3, p.x))}%`;
      m.style.top = `${Math.min(95, Math.max(5, p.y))}%`;
      frame.append(m);
    }
    fig.classList.toggle('has-callouts', points.length > 0);
  }
}

/** Collapsible contents on narrow screens, always open (and sticky) on wide ones; highlights the current section. */
function toc() {
  const details = document.querySelector<HTMLDetailsElement>('.toc details')!;
  const wide = window.matchMedia('(min-width: 1080px)');
  const sync = () => (details.open = wide.matches);
  sync();
  wide.addEventListener('change', sync);
  details.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a') && !wide.matches) details.open = false;
  });

  const links = new Map<string, HTMLAnchorElement>();
  for (const a of details.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) links.set(a.hash.slice(1), a);
  const visible = new Set<string>();
  const observer = new IntersectionObserver((entries) => {
    for (const e of entries) (e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id));
    const current = [...links.keys()].filter((id) => visible.has(id)).at(-1) ?? [...links.keys()].find((id) => visible.has(id));
    if (!current) return;
    for (const [id, a] of links) a.toggleAttribute('aria-current', id === current);
  }, { rootMargin: '-10% 0px -70% 0px' });
  for (const id of links.keys()) {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  }
}

toc();
liveFigures();
callouts();
