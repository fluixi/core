import { createRoot, createEffect, onCleanup } from '@fluixi/reactive/signal';
import type { HeadTag } from './types.js';
import { resolveHead, type HeadRegistry } from './core.js';
import { MANAGED_ATTR, KEY_ATTR } from './serialize.js';

function setAttrs(el: Element, attrs: Record<string, string>): void {
  // Remove attrs no longer present (except our markers).
  for (const a of Array.from(el.attributes)) {
    if (a.name === MANAGED_ATTR || a.name === KEY_ATTR) continue;
    if (!(a.name in attrs)) el.removeAttribute(a.name);
  }
  for (const [k, v] of Object.entries(attrs)) if (el.getAttribute(k) !== v) el.setAttribute(k, v);
}

function createEl(t: Extract<HeadTag, { tag: 'meta' | 'link' | 'base' | 'script' }>): Element {
  const el = document.createElement(t.tag);
  setAttrs(el, t.attrs);
  el.setAttribute(MANAGED_ATTR, '');
  el.setAttribute(KEY_ATTR, t.key);
  if (t.tag === 'script' && t.children != null) el.textContent = t.children;
  return el;
}

/** Reconcile the resolved tags into <head>, reusing the server-rendered managed nodes by key. */
function apply(tags: HeadTag[], htmlAttrs: Record<string, string>): void {
  const head = document.head;
  // Index existing managed nodes by key.
  const existing = new Map<string, Element>();
  for (const el of Array.from(head.querySelectorAll(`[${MANAGED_ATTR}]`))) {
    const key = el.getAttribute(KEY_ATTR);
    if (el.tagName === 'TITLE') continue; // title handled via document.title
    if (key) existing.set(key, el);
  }

  let title: string | null = null;
  const seen = new Set<string>();
  for (const t of tags) {
    if (t.tag === 'title') {
      title = t.children;
      continue;
    }
    if (t.tag === 'htmlAttr') continue; // applied to <html>, not <head> (and filtered upstream)
    seen.add(t.key);
    const cur = existing.get(t.key);
    if (cur && cur.tagName === t.tag.toUpperCase()) {
      setAttrs(cur, t.attrs);
      if (t.tag === 'script' && (cur.textContent ?? '') !== (t.children ?? '')) cur.textContent = t.children ?? '';
    } else {
      if (cur) cur.remove();
      head.appendChild(createEl(t as any));
    }
  }
  // Remove managed nodes that are no longer wanted.
  for (const [key, el] of existing) if (!seen.has(key)) el.remove();

  if (title != null && document.title !== title) document.title = title;
  for (const [k, v] of Object.entries(htmlAttrs)) {
    if (document.documentElement.getAttribute(k) !== v) document.documentElement.setAttribute(k, v);
  }
}

/**
 * Mount reactive head management on the client. Resolves the registry inside an effect so any
 * signal read while resolving re-runs reconciliation, `document.title`, meta, canonical, JSON-LD
 * etc. update live with no reload and no hydration mismatch (server tags are reused by key).
 * Returns a disposer.
 */
export function mountHead(head: HeadRegistry): () => void {
  return createRoot((dispose) => {
    createEffect(() => {
      head.version(); // re-run when sources are added/removed (route transitions)
      const { tags, htmlAttrs } = resolveHead(head);
      apply(tags, htmlAttrs);
    });
    onCleanup(() => {});
    return dispose;
  });
}
