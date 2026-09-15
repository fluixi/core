import { createSignal, onMount, onCleanup, Portal } from '@fluixi/core';
import { Link, useLinkNavigation } from '@fluixi/start/router';
import { seo } from '@fluixi/start/head';
import { getDoc, VERSIONS, type Lang } from './content.js';
import { NAV, ORDER, UI, LANG_LABEL, versionLabel } from './nav.js';

const SITE = 'https://docs.fluixi.com';

// First paragraph of the doc as a plain-text meta description. The markdown is already HTML, so
// strip tags AND decode entities (otherwise the head serializer re-escapes `&#39;` → `&amp;#39;`).
function describe(html: string | undefined): string {
  const p = html?.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '';
  const text = p
    .replace(/<[^>]+>/g, '')
    .replace(/&#3?9;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return (text || 'Fluixi documentation, reactivity, compiled.').slice(0, 155);
}

/**
 * One delegated listener for every copy button on the page.
 *
 * Delegated rather than per-button: the buttons arrive as prerendered HTML inside the
 * prose, so there is nothing to bind to per block without walking the DOM after every
 * navigation. The label reports what happened and reverts, so the control is never a
 * button that appears to do nothing.
 */
function onProseClick(event: MouseEvent): void {
  const button = (event.target as HTMLElement | null)?.closest('[data-copy]') as HTMLButtonElement | null;
  if (!button) return;

  const code = button.parentElement?.querySelector('code')?.textContent ?? '';
  const say = (text: string, ms: number) => {
    button.textContent = text;
    setTimeout(() => (button.textContent = 'Copy'), ms);
  };

  // No clipboard in an insecure context, and the user can refuse, say so rather than
  // leaving the label unchanged.
  const write = navigator.clipboard?.writeText(code);
  if (!write) return say('Press ⌘C', 2400);
  void write.then(() => say('Copied', 1600), () => say('Press ⌘C', 2400));
}

interface Hit { v: string; l: string; s: string; t: string; h: string[]; b: string }

/**
 * Docs search.
 *
 * The index is a build-time asset (`search-index.json`), fetched the first time search is
 * opened and kept for the session, it is 95 KB, which is worth downloading once on demand
 * and not at all for the majority who never search.
 *
 * Ranking is deliberately simple and explainable: a title match beats a heading match beats
 * a body match. With 52 pages the honest answer is that fuzzy scoring would add weight and
 * unpredictability without finding anything a substring match misses.
 */
function score(hit: Hit, q: string): number {
  const title = hit.t.toLowerCase();
  if (title === q) return 100;
  if (title.startsWith(q)) return 80;
  if (title.includes(q)) return 60;
  if (hit.h.some((h) => h.toLowerCase().includes(q))) return 40;
  if (hit.b.toLowerCase().includes(q)) return 20;
  return 0;
}

/** The sentence around the first match, so a result shows why it matched. */
function excerpt(hit: Hit, q: string): string {
  const at = hit.b.toLowerCase().indexOf(q);
  if (at < 0) return hit.b.slice(0, 110);
  const from = Math.max(0, at - 45);
  return (from > 0 ? '...' : '') + hit.b.slice(from, from + 130).trim() + '...';
}

let cachedIndex: Hit[] | null = null;

function Search(props: { lang: Lang; version: string; label: string }) {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal('');
  const [hits, setHits] = createSignal<Hit[]>([]);
  const [active, setActive] = createSignal(0);
  let input: HTMLInputElement | undefined;

  async function load(): Promise<Hit[]> {
    if (!cachedIndex) {
      // The index is written by the build, so in dev this path falls through to the
      // HTML shell. Reading that as JSON throws; an empty index is the honest answer.
      const res = await fetch('/search-index.json');
      const ok = res.ok && (res.headers.get('content-type') ?? '').includes('json');
      cachedIndex = ok ? ((await res.json()) as Hit[]) : [];
    }
    return cachedIndex;
  }

  async function show() {
    setOpen(true);
    await load();
    run(query());
    // Focus after the dialog exists, or there is nothing to focus.
    setTimeout(() => input?.focus(), 0);
  }

  function run(q: string) {
    const needle = q.trim().toLowerCase();
    if (!needle || !cachedIndex) return setHits([]);
    const scoped = cachedIndex.filter((h) => h.l === props.lang && h.v === props.version);
    setHits(
      scoped
        .map((h) => ({ h, n: score(h, needle) }))
        .filter((r) => r.n > 0)
        .sort((a, b) => b.n - a.n)
        .slice(0, 8)
        .map((r) => r.h),
    );
    setActive(0);
  }

  function go(hit: Hit) {
    location.href = `/${hit.v}/${hit.l}/${hit.s}`;
  }

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA)$/.test((e.target as HTMLElement)?.tagName ?? '');
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        void show();
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    onCleanup(() => document.removeEventListener('keydown', onKey));
  });

  const onInput = (e: Event) => {
    const q = (e.target as HTMLInputElement).value;
    setQuery(q);
    run(q);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const list = hits();
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((active() + 1) % Math.max(list.length, 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((active() - 1 + list.length) % Math.max(list.length, 1)); }
    else if (e.key === 'Enter' && list[active()]) { e.preventDefault(); go(list[active()]); }
  };

  return (
    <>
      <button type="button" class="search-open" onClick={() => void show()} aria-label={props.label}>
        <span>{props.label}</span>
        <kbd>⌘K</kbd>
      </button>

      {/* Through a portal to the body: the header sets `backdrop-filter`, which makes
          it a containing block for fixed-position descendants, the overlay would
          otherwise resolve against the header and be clipped to its 56px box. */}
      {() =>
        open() ? (
          <Portal>
          <div class="search-scrim" onClick={() => setOpen(false)}>
            <div
              class="search-panel"
              role="dialog"
              aria-modal="true"
              aria-label={props.label}
              onClick={(e: MouseEvent) => e.stopPropagation()}
            >
              <input
                ref={(el: HTMLInputElement) => (input = el)}
                class="search-input"
                type="search"
                placeholder={props.label}
                value={query()}
                onInput={onInput}
                onKeyDown={onKeyDown}
                autocomplete="off"
                spellcheck={false}
              />
              <ul class="search-hits">
                {() =>
                  hits().map((hit, i) => (
                    <li>
                      <a
                        class={i === active() ? 'hit on' : 'hit'}
                        href={`/${hit.v}/${hit.l}/${hit.s}`}
                        onMouseEnter={() => setActive(i)}
                      >
                        <strong>{hit.t}</strong>
                        <span>{excerpt(hit, query().trim().toLowerCase())}</span>
                      </a>
                    </li>
                  ))
                }
              </ul>
              {() =>
                query().trim() && hits().length === 0 ? (
                  <p class="search-empty">No matches for “{query().trim()}”.</p>
                ) : null
              }
            </div>
          </div>
          </Portal>
        ) : null
      }
    </>
  );
}

const THEME_KEY = 'fluixi-docs-theme';

/**
 * Flip between light and dark, and remember it.
 *
 * The stored value pins `color-scheme`; with nothing stored the page follows the OS, so
 * the first visit matches whatever the reader already set system-wide. The inline script
 * in index.html re-applies the choice before first paint, doing it here would mean a
 * flash of the wrong theme on every prerendered page.
 */
function toggleTheme(): void {
  const root = document.documentElement;
  const current =
    root.dataset.theme ??
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';

  root.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Private mode or blocked storage, the theme still applies for this page.
  }
}

// The docs page UI, parameterized by version/lang/slug. Version is a literal path segment (v1/, v2/...)
// so each version has its own route wrapper, the router merges the inner [lang]/[slug] params.
export default function DocPage(props: { version: string; lang: Lang; slug: string }) {
  const { version, slug } = props;
  const lang = props.lang;
  const doc = getDoc(version, lang, slug);
  const ui = UI[lang];
  const link = (s: string) => `/${version}/${lang}/${s}`;
  const titleOf = (s: string) => getDoc(version, lang, s)?.title ?? s;
  const other: Lang = lang === 'en' ? 'fr' : 'en';

  // The prose is prerendered HTML, so its cross-links are raw anchors with no <Link> to
  // render. One delegated handler makes them navigate client-side like the rest.
  const onLinkClick = useLinkNavigation();

  // Mobile sidebar drawer (no effect on desktop, where the sidebar is a grid column).
  const [navOpen, setNavOpen] = createSignal(false);

  const i = ORDER.indexOf(slug);
  const prev = i > 0 ? ORDER[i - 1] : null;
  const next = i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : null;

  // Per-doc document head, rendered into <head> at prerender (each page is static), so crawlers
  // get a unique title/description/canonical per doc, plus en/fr hreflang alternates.
  const title = `${doc?.title ?? slug} · ${ui.product}`;
  const description = describe(doc?.html);
  const canonical = `${SITE}${link(slug)}`;
  seo({
    title,
    description,
    canonical,
    lang,
    og: {
      type: 'article',
      siteName: ui.product,
      url: canonical,
      title,
      description,
      locale: lang,
      image: { url: `${SITE}/og.png`, width: 1200, height: 630, alt: ui.product },
    },
    twitter: { card: 'summary_large_image', title, description, image: `${SITE}/og.png` },
    alternates: [
      { hreflang: 'en', href: `${SITE}/${version}/en/${slug}` },
      { hreflang: 'fr', href: `${SITE}/${version}/fr/${slug}` },
      { hreflang: 'x-default', href: `${SITE}/${version}/en/${slug}` },
    ],
  });

  return (
    <div class="docs">
      {/* First tab stop: the sidebar is ~25 links, so a keyboard or screen-reader user
          would otherwise traverse the whole nav on every page to reach the content. */}
      <a class="skip" href="#content">{ui.skip}</a>
      <header class="d-head">
        <div class="d-head-left">
          <button
            class="d-menu"
            aria-label="Toggle navigation"
            aria-expanded={() => (navOpen() ? 'true' : 'false')}
            onClick={() => setNavOpen(!navOpen())}
          >
            {() => (navOpen() ? '✕' : '☰')}
          </button>
          <Link class="d-brand" href={link('introduction')}>
            <img class="logo" src="/logos/mark.png" alt="" width="22" height="22" /> {ui.product}
          </Link>
        </div>
        <div class="d-actions">
          <Search lang={lang} version={version} label={ui.search} />
          <label class="ver">
            <span>{ui.version}</span>
            <select onChange={(e: any) => (location.href = `/${e.target.value}/${lang}/${slug}`)}>
              {VERSIONS.map((v) => (
                <option value={v} selected={v === version}>
                  {versionLabel(v)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            class="theme-toggle"
            aria-label={ui.theme}
            title={ui.theme}
            onClick={toggleTheme}
          >
            ◐
          </button>
          <a class="lang-toggle" href={`/${version}/${other}/${slug}`}>
            {LANG_LABEL[other]}
          </a>
          <a class="d-link" href="https://playground.fluixi.com">
            {ui.playground}
          </a>
        </div>
      </header>

      <div class="d-body">
        <div
          class="d-backdrop"
          classList={{ show: navOpen() }}
          onClick={() => setNavOpen(false)}
        />
        <aside class="d-sidebar" classList={{ open: navOpen() }}>
          {NAV.map((section) => (
            <div class="nav-group">
              <div class="nav-group-title">{section.group[lang]}</div>
              {section.slugs.map((s) => (
                <Link
                  class={s === slug ? 'nav-item on' : 'nav-item'}
                  href={link(s)}
                  onClick={() => setNavOpen(false)}
                >
                  {titleOf(s)}
                </Link>
              ))}
            </div>
          ))}
        </aside>

        <main
          class="d-main"
          id="content"
          tabindex={-1}
          onClick={(e: MouseEvent) => {
            onProseClick(e);
            onLinkClick(e);
          }}
        >
          <article class="prose" innerHTML={doc?.html ?? '<h1>Not found</h1>'} />
          <nav class="d-pager">
            {prev ? (
              <Link class="pager" href={link(prev)}>
                <span>← {ui.prev}</span>
                <b>{titleOf(prev)}</b>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link class="pager next" href={link(next)}>
                <span>{ui.next} →</span>
                <b>{titleOf(next)}</b>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </main>
      </div>
    </div>
  );
}
