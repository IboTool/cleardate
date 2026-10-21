// Minimal DOM helpers — no framework.

type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown> & { class?: string; style?: string; dataset?: Record<string, string> };

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs)
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'style') el.setAttribute('style', String(v));
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else if (k in el && typeof v !== 'string') (el as unknown as Record<string, unknown>)[k] = v;
      else if (k === 'value' || k === 'checked' || k === 'selected' || k === 'disabled') (el as unknown as Record<string, unknown>)[k] = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  append(el, children);
  return el;
}

export function append(el: Element, children: Child[]) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el: Element) {
  while (el.firstChild) el.firstChild.remove();
}

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;

/** A labelled form row. */
export function field(label: string, control: Node, hint?: string | Node): HTMLElement {
  return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control, hint ? h('span', { class: 'field-hint' }, hint) : null);
}

export function select<T extends string>(value: T, options: readonly (T | [T, string])[], onChange: (v: T) => void, attrs: Attrs = {}): HTMLSelectElement {
  const s = h('select', attrs, ...options.map((o) => {
    const [v, l] = Array.isArray(o) ? o : [o, o];
    return h('option', { value: v, selected: v === value }, l);
  }));
  s.addEventListener('change', () => onChange(s.value as T));
  return s;
}

export function numberInput(value: number, onInput: (v: number) => void, attrs: Attrs = {}): HTMLInputElement {
  const i = h('input', { type: 'number', step: 'any', value: value ? String(value) : '', ...attrs });
  i.addEventListener('input', () => onInput(i.value === '' ? 0 : Number(i.value)));
  return i;
}

export function textInput(value: string, onInput: (v: string) => void, attrs: Attrs = {}): HTMLInputElement {
  const i = h('input', { type: 'text', value, ...attrs });
  i.addEventListener('input', () => onInput(i.value));
  return i;
}

export function badge(text: string, kind: string, title?: string) {
  return h('span', { class: `badge badge-${kind}`, title }, text);
}

/** Wraps matched ranges in <mark>. */
export function highlight(text: string, ranges: [number, number][]): Node {
  const frag = document.createDocumentFragment();
  const sorted = [...ranges].filter((r) => r[0] <= r[1]).sort((a, b) => a[0] - b[0]);
  let pos = 0;
  for (const [a, b] of sorted) {
    if (a < pos) continue;
    if (a > pos) frag.append(text.slice(pos, a));
    frag.append(h('mark', null, text.slice(a, b + 1)));
    pos = b + 1;
  }
  if (pos < text.length) frag.append(text.slice(pos));
  return frag;
}

export function modal(title: string, body: Node, opts: { wide?: boolean; onClose?: () => void } = {}) {
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    opts.onClose?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  const overlay = h(
    'div',
    { class: 'modal-overlay', onmousedown: (e: Event) => e.target === overlay && close() },
    h('div', { class: `modal glass ${opts.wide ? 'modal-wide' : ''}`, role: 'dialog', 'aria-label': title },
      h('div', { class: 'modal-head' }, h('h2', null, title), h('button', { class: 'icon-btn', onclick: close, 'aria-label': 'Close' }, '✕')),
      body),
  );
  document.body.append(overlay);
  document.addEventListener('keydown', onKey);
  return { close, overlay };
}

export function toast(text: string, ms = 2600) {
  const t = h('div', { class: 'toast glass' }, text);
  document.body.append(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, ms);
}
