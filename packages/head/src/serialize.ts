import type { HeadTag } from './types.js';
import { resolveHead, type HeadRegistry } from './core.js';

const VOID = new Set(['meta', 'link', 'base']);

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
/** Inline <script> bodies (incl. JSON-LD) must not break out of the element. */
function escScript(s: string): string {
  return s.replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--');
}

/** The attribute marking a head tag as managed by @fluixi/head (so the client reconciler owns it). */
export const MANAGED_ATTR = 'data-fh';
export const KEY_ATTR = 'data-fh-key';

function renderAttrs(attrs: Record<string, string>): string {
  let s = '';
  for (const [k, v] of Object.entries(attrs)) s += ` ${k}="${escAttr(v)}"`;
  return s;
}

function renderTag(t: HeadTag): string {
  switch (t.tag) {
    case 'title':
      return `<title ${MANAGED_ATTR}>${escText(t.children)}</title>`;
    case 'meta':
    case 'link':
    case 'base': {
      const marker = ` ${MANAGED_ATTR} ${KEY_ATTR}="${escAttr(t.key)}"`;
      return `<${t.tag}${renderAttrs(t.attrs)}${marker}>`;
    }
    case 'script': {
      const marker = ` ${MANAGED_ATTR} ${KEY_ATTR}="${escAttr(t.key)}"`;
      const body = t.children ? escScript(t.children) : '';
      return `<script${renderAttrs(t.attrs)}${marker}>${body}</script>`;
    }
    default:
      return '';
  }
}

export interface SerializedHead {
  /** Markup to inject inside <head>. */
  headHtml: string;
  /** Attributes to apply to <html> (e.g. lang). */
  htmlAttrs: Record<string, string>;
}

/** Render the registry's resolved tags to SSR head markup + <html> attributes. */
export function renderHead(head: HeadRegistry): SerializedHead {
  const { tags, htmlAttrs } = resolveHead(head);
  // Stable, predictable order: title, base, meta, link, script.
  const order: Record<string, number> = { title: 0, base: 1, meta: 2, link: 3, script: 4 };
  const sorted = [...tags].sort((a, b) => (order[a.tag] ?? 9) - (order[b.tag] ?? 9));
  return { headHtml: sorted.map(renderTag).join(''), htmlAttrs };
}

/** Render just the <html> attribute string (e.g. ` lang="en"`) for templating. */
export function renderHtmlAttrs(htmlAttrs: Record<string, string>): string {
  return Object.entries(htmlAttrs)
    .map(([k, v]) => ` ${k}="${escAttr(v)}"`)
    .join('');
}
