import { getOwner, onCleanup, createSignal, type Accessor } from '@fluixi/reactive/signal';
import type {
  HeadInput,
  HeadSource,
  HeadTag,
  Reactive,
  OpenGraph,
  TwitterCard,
  RobotsMeta,
  OGImage,
  IconInput,
} from './types.js';

/** Read a possibly-reactive value (tracks the signal when called inside an effect). */
function val<T>(v: Reactive<T> | undefined): T | undefined {
  return typeof v === 'function' ? (v as () => T)() : v;
}

function robotsToString(r: string | RobotsMeta): string {
  if (typeof r === 'string') return r;
  const out: string[] = [];
  out.push(r.index === false ? 'noindex' : 'index');
  out.push(r.follow === false ? 'nofollow' : 'follow');
  if (r.noarchive) out.push('noarchive');
  if (r.nosnippet) out.push('nosnippet');
  if (r.noimageindex) out.push('noimageindex');
  if (r.maxSnippet != null) out.push(`max-snippet:${r.maxSnippet}`);
  if (r.maxImagePreview) out.push(`max-image-preview:${r.maxImagePreview}`);
  if (r.maxVideoPreview != null) out.push(`max-video-preview:${r.maxVideoPreview}`);
  return out.join(', ');
}

// Registry

export interface HeadRegistry {
  /** Ordered sources: layouts register before pages, so later entries override. */
  readonly sources: HeadSource[];
  /** Bumps when a source is added/removed: read it in an effect to re-run on route changes. */
  readonly version: Accessor<number>;
  push(input: HeadSource): () => void;
}

export function createHead(): HeadRegistry {
  const sources: HeadSource[] = [];
  const [version, bump] = createSignal(0);
  return {
    sources,
    version,
    push(input) {
      sources.push(input);
      bump((n) => n + 1);
      return () => {
        const i = sources.indexOf(input);
        if (i !== -1) {
          sources.splice(i, 1);
          bump((n) => n + 1);
        }
      };
    },
  };
}

// The "active" registry. On the client there is one for the document. On the server a
// request scope, when the host registers one, wins over the plain slot: a module global
// cannot survive two async renders at once, since one would clear it or collect into it
// while the other is still rendering.
//
// Both live on globalThis rather than in module scope so that two copies of this package
// agree. A workspace link next to a published install gives one copy to the server that
// sets the registry and another to the `seo()` the app calls, and every call was dropped.
interface HeadSlot {
  active: HeadRegistry | null;
  scope: (() => HeadRegistry | null | undefined) | null;
}
const slot: HeadSlot = ((globalThis as Record<symbol, HeadSlot | undefined>)[Symbol.for('fluixi.head')] ??= {
  active: null,
  scope: null,
});

export function setActiveHead(h: HeadRegistry | null): void {
  slot.active = h;
}
export function getActiveHead(): HeadRegistry | null {
  return slot.scope?.() ?? slot.active;
}
export function runWithHead<T>(h: HeadRegistry, fn: () => T): T {
  const prev = slot.active;
  slot.active = h;
  try {
    return fn();
  } finally {
    slot.active = prev;
  }
}
/**
 * Resolve the active registry from a host's own request scope, e.g. its AsyncLocalStorage.
 * Returning nothing falls back to `setActiveHead`. `null` removes the scope.
 */
export function setHeadScope(scope: (() => HeadRegistry | null | undefined) | null): void {
  slot.scope = scope;
}

/**
 * Register metadata for the current page/layout. Static, async-resolved, or reactive, values
 * that are signals update the document live on the client. Returns a disposer (client dynamic use).
 */
export function useHead(input: HeadSource): () => void {
  const h = getActiveHead();
  if (!h) {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    if (proc?.env?.NODE_ENV !== 'production') {
      console.warn('[fluixi/head] useHead() called with no active head registry — ignored.');
    }
    return () => {};
  }
  const dispose = h.push(input);
  // Drop the source when the owner (page/layout component) unmounts, this is what makes route
  // transitions update the head on the client. NOT on the server: there it's a single render and
  // we serialize the head before the root disposes, so the source must survive until then.
  if (typeof window !== 'undefined' && getOwner()) onCleanup(dispose);
  return dispose;
}

/** Ergonomic alias: `seo({ title, description })`. */
export const seo = useHead;

// Resolution (expand → dedupe)

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function metaKey(a: Record<string, string>): string {
  if (a.charset != null) return 'meta:charset';
  if (a.property) return 'meta:property:' + a.property;
  if (a.name) return 'meta:name:' + a.name;
  if (a['http-equiv']) return 'meta:http-equiv:' + a['http-equiv'];
  return 'meta:' + djb2(JSON.stringify(a));
}

function pushImage(out: HeadTag[], img: string | OGImage): void {
  const o: OGImage = typeof img === 'string' ? { url: img } : img;
  out.push({ tag: 'meta', key: 'meta:property:og:image:' + o.url, attrs: { property: 'og:image', content: o.url } });
  if (o.secureUrl) out.push({ tag: 'meta', key: 'meta:property:og:image:secure:' + o.url, attrs: { property: 'og:image:secure_url', content: o.secureUrl } });
  if (o.type) out.push({ tag: 'meta', key: 'meta:property:og:image:type:' + o.url, attrs: { property: 'og:image:type', content: o.type } });
  if (o.width != null) out.push({ tag: 'meta', key: 'meta:property:og:image:width:' + o.url, attrs: { property: 'og:image:width', content: String(o.width) } });
  if (o.height != null) out.push({ tag: 'meta', key: 'meta:property:og:image:height:' + o.url, attrs: { property: 'og:image:height', content: String(o.height) } });
  if (o.alt) out.push({ tag: 'meta', key: 'meta:property:og:image:alt:' + o.url, attrs: { property: 'og:image:alt', content: o.alt } });
}

function expandOG(og: OpenGraph, out: HeadTag[]): void {
  const m = (p: string, c?: string) => { if (c != null) out.push({ tag: 'meta', key: 'meta:property:og:' + p, attrs: { property: 'og:' + p, content: c } }); };
  m('title', og.title);
  m('description', og.description);
  m('type', og.type);
  m('url', og.url);
  m('site_name', og.siteName);
  m('locale', og.locale);
  for (const l of og.localeAlternate ?? []) out.push({ tag: 'meta', key: 'meta:property:og:locale:alt:' + l, attrs: { property: 'og:locale:alternate', content: l } });
  if (og.image != null) {
    const imgs = Array.isArray(og.image) ? og.image : [og.image];
    for (const i of imgs) pushImage(out, i);
  }
  if (og.video) {
    const v = typeof og.video === 'string' ? { url: og.video } : og.video;
    m('video', v.url);
    if ('type' in v && v.type) m('video:type', v.type);
    if ('width' in v && v.width != null) m('video:width', String(v.width));
    if ('height' in v && v.height != null) m('video:height', String(v.height));
  }
  if (og.audio) {
    const a = typeof og.audio === 'string' ? { url: og.audio } : og.audio;
    m('audio', a.url);
    if ('type' in a && a.type) m('audio:type', a.type);
  }
  if (og.article) {
    const ar = og.article;
    m('article:published_time', ar.publishedTime);
    m('article:modified_time', ar.modifiedTime);
    m('article:expiration_time', ar.expirationTime);
    m('article:section', ar.section);
    for (const au of ([] as string[]).concat(ar.author ?? [])) out.push({ tag: 'meta', key: 'meta:property:og:article:author:' + au, attrs: { property: 'article:author', content: au } });
    for (const t of ([] as string[]).concat(ar.tag ?? [])) out.push({ tag: 'meta', key: 'meta:property:og:article:tag:' + t, attrs: { property: 'article:tag', content: t } });
  }
  if (og.book) {
    const b = og.book;
    m('book:isbn', b.isbn);
    m('book:release_date', b.releaseDate);
    for (const au of ([] as string[]).concat(b.author ?? [])) out.push({ tag: 'meta', key: 'meta:property:og:book:author:' + au, attrs: { property: 'book:author', content: au } });
    for (const t of ([] as string[]).concat(b.tag ?? [])) out.push({ tag: 'meta', key: 'meta:property:og:book:tag:' + t, attrs: { property: 'book:tag', content: t } });
  }
  if (og.profile) {
    const p = og.profile;
    m('profile:first_name', p.firstName);
    m('profile:last_name', p.lastName);
    m('profile:username', p.username);
    m('profile:gender', p.gender);
  }
}

function expandTwitter(t: TwitterCard, out: HeadTag[]): void {
  const m = (n: string, c?: string) => { if (c != null) out.push({ tag: 'meta', key: 'meta:name:twitter:' + n, attrs: { name: 'twitter:' + n, content: c } }); };
  m('card', t.card);
  m('site', t.site);
  m('creator', t.creator);
  m('title', t.title);
  m('description', t.description);
  m('image', t.image);
  m('image:alt', t.imageAlt);
  m('player', t.player);
  if (t.playerWidth != null) m('player:width', String(t.playerWidth));
  if (t.playerHeight != null) m('player:height', String(t.playerHeight));
  if (t.app) {
    m('app:name:iphone', t.app.name);
    m('app:id:iphone', t.app.idIphone);
    m('app:id:ipad', t.app.idIpad);
    m('app:id:googleplay', t.app.idGooglePlay);
  }
}

function expandIcons(icons: IconInput, out: HeadTag[]): void {
  const link = (key: string, attrs: Record<string, string>) => out.push({ tag: 'link', key, attrs });
  if (icons.icon != null) {
    const arr = typeof icons.icon === 'string' ? [{ url: icons.icon }] : icons.icon;
    for (const i of arr) link('link:icon:' + i.url, { rel: 'icon', href: i.url, ...(i.type ? { type: i.type } : {}), ...(i.sizes ? { sizes: i.sizes } : {}) });
  }
  if (icons.apple != null) {
    const arr = typeof icons.apple === 'string' ? [{ url: icons.apple }] : icons.apple;
    for (const i of arr) link('link:apple-touch-icon:' + i.url, { rel: 'apple-touch-icon', href: i.url, ...(i.sizes ? { sizes: i.sizes } : {}) });
  }
  if (icons.mask) link('link:mask-icon', { rel: 'mask-icon', href: icons.mask.url, ...(icons.mask.color ? { color: icons.mask.color } : {}) });
  if (icons.shortcut) link('link:shortcut', { rel: 'shortcut icon', href: icons.shortcut });
  if (icons.msTileImage) out.push({ tag: 'meta', key: 'meta:name:msapplication-TileImage', attrs: { name: 'msapplication-TileImage', content: icons.msTileImage } });
  if (icons.msTileColor) out.push({ tag: 'meta', key: 'meta:name:msapplication-TileColor', attrs: { name: 'msapplication-TileColor', content: icons.msTileColor } });
}

interface TitleState { title?: string; template?: string | ((t: string) => string); }

function expand(input: HeadInput, out: HeadTag[], ts: TitleState): void {
  const meta = (key: string, attrs: Record<string, string>) => out.push({ tag: 'meta', key, attrs });

  const title = val(input.title);
  if (title !== undefined) ts.title = title;
  if (input.titleTemplate !== undefined) ts.template = input.titleTemplate;

  const lang = val(input.lang);
  if (lang !== undefined) out.push({ tag: 'htmlAttr', key: 'html:lang', name: 'lang', value: lang });
  for (const [name, raw] of Object.entries(input.htmlAttrs ?? {})) {
    const value = val(raw);
    if (value !== undefined) out.push({ tag: 'htmlAttr', key: `html:${name}`, name, value });
  }

  if (input.charset !== undefined) meta('meta:charset', { charset: input.charset });
  if (input.viewport !== undefined) meta('meta:name:viewport', { name: 'viewport', content: input.viewport });
  const desc = val(input.description);
  if (desc !== undefined) meta('meta:name:description', { name: 'description', content: desc });
  const kw = val(input.keywords);
  if (kw !== undefined) meta('meta:name:keywords', { name: 'keywords', content: Array.isArray(kw) ? kw.join(', ') : kw });
  if (input.author !== undefined) meta('meta:name:author', { name: 'author', content: input.author });
  if (input.robots !== undefined) meta('meta:name:robots', { name: 'robots', content: robotsToString(input.robots) });
  if (input.generator !== undefined) meta('meta:name:generator', { name: 'generator', content: input.generator });
  if (input.applicationName !== undefined) meta('meta:name:application-name', { name: 'application-name', content: input.applicationName });
  if (input.referrer !== undefined) meta('meta:name:referrer', { name: 'referrer', content: input.referrer });
  const scheme = val(input.colorScheme);
  if (scheme !== undefined) meta('meta:name:color-scheme', { name: 'color-scheme', content: scheme });
  const theme = val(input.themeColor);
  if (typeof theme === 'string') meta('meta:name:theme-color', { name: 'theme-color', content: theme });
  // One tag per media query, keyed by it: a later source replaces the same media, not the others.
  else if (theme) {
    for (const { color, media } of theme) {
      meta(`meta:name:theme-color${media ? `:${media}` : ''}`, media ? { name: 'theme-color', content: color, media } : { name: 'theme-color', content: color });
    }
  }

  const canonical = val(input.canonical);
  if (canonical !== undefined) out.push({ tag: 'link', key: 'link:rel:canonical', attrs: { rel: 'canonical', href: canonical } });
  if (input.manifest !== undefined) out.push({ tag: 'link', key: 'link:rel:manifest', attrs: { rel: 'manifest', href: input.manifest } });
  if (input.base !== undefined) out.push({ tag: 'base', key: 'base', attrs: { href: input.base } });

  if (input.verification) {
    const map: Record<string, string> = { google: 'google-site-verification', bing: 'msvalidate.01', yandex: 'yandex-verification', pinterest: 'p:domain_verify' };
    for (const [k, v] of Object.entries(input.verification)) {
      if (v == null) continue;
      const name = map[k] ?? k;
      meta('meta:name:' + name, { name, content: v });
    }
  }

  for (const a of input.alternates ?? []) out.push({ tag: 'link', key: 'link:alternate:hreflang:' + a.hreflang, attrs: { rel: 'alternate', hreflang: a.hreflang, href: a.href } });
  for (const f of input.feeds ?? []) out.push({ tag: 'link', key: 'link:alternate:feed:' + f.href, attrs: { rel: 'alternate', type: f.type ?? 'application/rss+xml', href: f.href, ...(f.title ? { title: f.title } : {}) } });

  if (input.og) expandOG(input.og, out);
  if (input.twitter) expandTwitter(input.twitter, out);
  if (input.icons) expandIcons(input.icons, out);

  const ld = val(input.jsonLd);
  if (ld !== undefined) {
    const arr = Array.isArray(ld) ? ld : [ld];
    for (const obj of arr) {
      const json = JSON.stringify(obj);
      out.push({ tag: 'script', key: 'script:ldjson:' + djb2(json), attrs: { type: 'application/ld+json' }, children: json });
    }
  }

  for (const m of input.meta ?? []) {
    const attrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(m)) if (v != null) attrs[k === 'httpEquiv' ? 'http-equiv' : k] = v;
    out.push({ tag: 'meta', key: metaKey(attrs), attrs });
  }
  for (const l of input.link ?? []) {
    const attrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(l)) if (v != null) attrs[k] = v;
    out.push({ tag: 'link', key: 'link:' + (attrs.rel ?? '') + ':' + (attrs.href ?? djb2(JSON.stringify(attrs))), attrs });
  }
  for (const s of input.script ?? []) {
    const attrs: Record<string, string> = {};
    let children: string | undefined;
    for (const [k, v] of Object.entries(s)) { if (v == null) continue; if (k === 'children') children = v; else attrs[k] = v; }
    out.push({ tag: 'script', key: 'script:' + (attrs.src ?? djb2((children ?? '') + JSON.stringify(attrs))), attrs, children });
  }
}

function applyTemplate(tpl: string | ((t: string) => string), title: string): string {
  return typeof tpl === 'function' ? tpl(title) : tpl.includes('%s') ? tpl.replace('%s', title) : tpl;
}

export interface ResolvedHead {
  tags: HeadTag[];
  htmlAttrs: Record<string, string>;
}

/**
 * Flatten every source (in registration order: layouts first, page last) into tags, then
 * deduplicate by key: last write wins for singletons (title, description, canonical, ...),
 * while repeatable tags (extra og:image, hreflang alternates, json-ld) accumulate.
 */
export function resolveHead(head: HeadRegistry): ResolvedHead {
  const raw: HeadTag[] = [];
  const ts: TitleState = {};
  for (const src of head.sources) {
    const input = typeof src === 'function' ? src() : src;
    expand(input, raw, ts);
  }
  if (ts.title !== undefined) {
    raw.push({ tag: 'title', key: 'title', children: ts.template ? applyTemplate(ts.template, ts.title) : ts.title });
  }

  const byKey = new Map<string, HeadTag>();
  const htmlAttrs: Record<string, string> = {};
  for (const t of raw) {
    if (t.tag === 'htmlAttr') {
      htmlAttrs[t.name] = t.value;
      continue;
    }
    byKey.set(t.key, t); // last wins
  }
  return { tags: [...byKey.values()], htmlAttrs };
}
