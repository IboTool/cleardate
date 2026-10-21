import { dateTimePlaceholder, fmtLocalValue, parseLocalText } from '../format';
import type { Settings } from '../types';
import { h } from './dom';

/** A date (and time) field: `value` is the local input value ("YYYY-MM-DDTHH:mm" or "YYYY-MM-DD"). */
export type DateField = HTMLDivElement & { value: string };

/**
 * Text field in the user's date and time format (native date inputs always follow the browser locale),
 * with a calendar button that opens the browser's picker.
 */
export function dateTimeInput(
  value: string,
  onChange: (v: string) => void,
  s: Pick<Settings, 'dateOrder' | 'hour12'>,
  opts: { withTime?: boolean; name?: string; label?: string } = {},
): DateField {
  const withTime = opts.withTime ?? true;
  let cur = value;
  const text = h('input', {
    type: 'text', class: 'dt-text', name: opts.name, autocomplete: 'off', spellcheck: false,
    placeholder: dateTimePlaceholder(s, withTime), 'aria-label': opts.label,
  });
  const native = h('input', { type: withTime ? 'datetime-local' : 'date', class: 'dt-native', tabindex: '-1', 'aria-hidden': 'true' });
  const show = () => {
    text.value = fmtLocalValue(cur, s, withTime);
    text.classList.remove('invalid');
    text.removeAttribute('aria-invalid');
  };
  const set = (v: string) => {
    if (v === cur) return;
    cur = v;
    onChange(v);
  };
  text.addEventListener('input', () => {
    const v = parseLocalText(text.value, s, withTime);
    if (v !== null) {
      text.classList.remove('invalid');
      set(v);
    }
  });
  text.addEventListener('blur', () => {
    const v = parseLocalText(text.value, s, withTime);
    if (v === null) {
      text.classList.add('invalid');
      text.setAttribute('aria-invalid', 'true');
    } else show();
  });
  native.addEventListener('change', () => {
    set(native.value);
    show();
  });
  const pick = h('button', {
    type: 'button', class: 'dt-pick', title: withTime ? 'Pick date and time' : 'Pick date', 'aria-label': withTime ? 'Pick date and time' : 'Pick date',
    onclick: (e: Event) => {
      e.preventDefault();
      native.value = cur;
      try {
        native.showPicker();
      } catch {
        native.focus();
      }
    },
  });
  pick.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2 6.5h12M5 1.5v3M11 1.5v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  const el = h('div', { class: 'dt' }, text, pick, native) as DateField;
  el.focus = (o?: FocusOptions) => text.focus(o);
  Object.defineProperty(el, 'value', {
    get: () => cur,
    set: (v: string) => {
      cur = v;
      show();
    },
  });
  show();
  return el;
}
