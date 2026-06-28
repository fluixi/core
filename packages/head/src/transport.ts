import type { SerializedHead } from './serialize.js';

// The server can't change the render's return type, so the collected head rides back inside the
// rendered HTML as one inert comment marker; the adapter/prerender extracts it into <head>. If a
// custom server doesn't extract it, it's just an invisible comment in the body — no breakage.

const RE = /<!--fh:([A-Za-z0-9+/=]+)-->/;

function b64encode(s: string): string {
  const g = globalThis as { Buffer?: { from(s: string, e?: string): { toString(e: string): string } }; btoa?: (s: string) => string };
  if (g.Buffer) return g.Buffer.from(s, 'utf-8').toString('base64');
  return g.btoa!(unescape(encodeURIComponent(s)));
}
function b64decode(s: string): string {
  const g = globalThis as { Buffer?: { from(s: string, e: string): { toString(e: string): string } }; atob?: (s: string) => string };
  if (g.Buffer) return g.Buffer.from(s, 'base64').toString('utf-8');
  return decodeURIComponent(escape(g.atob!(s)));
}

/** Encode the serialized head into a marker to prepend to the rendered body. */
export function encodeHeadMarker(head: SerializedHead): string {
  if (!head.headHtml && Object.keys(head.htmlAttrs).length === 0) return '';
  return `<!--fh:${b64encode(JSON.stringify(head))}-->`;
}

/** Pull the head marker out of rendered HTML, returning the head and the cleaned body. */
export function extractHeadMarker(html: string): { head: SerializedHead | null; body: string } {
  const m = html.match(RE);
  if (!m) return { head: null, body: html };
  let head: SerializedHead | null = null;
  try {
    head = JSON.parse(b64decode(m[1])) as SerializedHead;
  } catch {
    head = null;
  }
  return { head, body: html.replace(m[0], '') };
}
