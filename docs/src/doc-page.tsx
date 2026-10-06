import { createSignal, createMemo, createEffect, onMount, onCleanup, Portal, useColorScheme } from '@fluixi/core';
import { Link, useLinkNavigation } from '@fluixi/start/router';
import { seo } from '@fluixi/start/head';
import { titleOf as titleIn, VERSIONS, type Doc, type Lang } from './content.js';
import { NAV, ORDER, UI, LANG_LABEL, versionLabel } from './nav.js';
import { languageStorage } from './language.js';

const SITE = 'https://docs.fluixi.com';
const LICENSE_URL = 'https://github.com/fluixi/core/blob/main/LICENSE';

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
      <style scoped>{`
        /* The trigger reads as a field rather than a button, because that is what it
           opens; the shortcut is shown so it is discoverable without a tooltip. */
        .search-open {
          display: inline-flex; align-items: center; gap: 10px; cursor: pointer;
          padding: 6px 8px 6px 12px; border-radius: var(--r-md); min-width: 200px;
          font-family: var(--font); font-size: 13px; color: var(--muted);
          background: var(--panel-2); border: 1px solid var(--line);
          transition: border-color .15s, color .15s;
        }
        .search-open:hover { color: var(--text); border-color: var(--line-strong); }
        .search-open kbd {
          margin-left: auto;
          font-family: var(--mono); font-size: 10.5px; padding: 2px 5px; border-radius: 4px;
          color: var(--muted); background: var(--bg); border: 1px solid var(--line);
        }

        .search-scrim {
          position: fixed; inset: 0; z-index: 200; background: var(--scrim);
          display: flex; align-items: flex-start; justify-content: center; padding: 12vh 20px 20px;
        }
        .search-panel {
          width: min(620px, 100%); max-height: 70vh; overflow: hidden;
          display: flex; flex-direction: column;
          background: var(--bg); border: 1px solid var(--line-strong);
          border-radius: var(--r-lg); box-shadow: 0 24px 60px var(--shadow);
        }
        .search-input {
          width: 100%; padding: 17px 18px; border: 0; border-bottom: 1px solid var(--line);
          background: transparent; color: var(--text); font-family: var(--font); font-size: 15.5px;
        }
        .search-input:focus { outline: none; }
        .search-input::placeholder { color: var(--muted); }

        .search-hits { list-style: none; margin: 0; padding: 6px; overflow-y: auto; }
        .hit {
          display: flex; flex-direction: column; gap: 2px;
          padding: 9px 13px; border-radius: var(--r-md); border-left: 2px solid transparent;
        }
        .hit strong { font-size: 14px; font-weight: 500; color: var(--text); }
        .hit span {
          font-size: 12.5px; color: var(--muted); overflow: hidden;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        /* Active row is marked by border and background, so it does not rely on colour alone. */
        .hit.on { background: var(--accent-soft); border-left-color: var(--accent); }
        .search-empty { margin: 0; padding: 18px 20px; font-size: 13.5px; color: var(--muted); }

        @media (max-width: 560px) {
          .search-open { min-width: 0; padding: 6px 10px; }
          .search-open span { display: none; }
          .search-open kbd { display: none; }
          .search-open::after { content: '⌕'; font-size: 16px; }
        }
      `}</style>
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

// The docs page UI, parameterized by version/lang/slug. Version is a literal path segment (v1/, v2/...)
// so each version has its own route wrapper, the router merges the inner [lang]/[slug] params.
export default function DocPage(props: { version: string; lang: Lang; slug: string; doc: Doc | null | undefined }) {
  // Read through, never snapshot. Every doc is the same route, so navigating between two
  // of them changes these props on a page that stays mounted. Taking a copy here is what
  // forced the route to rebuild the whole page, header and sidebar included, to show a
  // different article.
  const version = () => props.version;
  const scheme = useColorScheme();
  const lang = () => props.lang;
  const slug = () => props.slug;

  const doc = () => props.doc;
  const ui = createMemo(() => UI[lang()]);
  const link = (s: string) => `/${version()}/${lang()}/${s}`;
  const titleOf = (s: string) => titleIn(version(), lang(), s);
  const other = createMemo<Lang>(() => (lang() === 'en' ? 'fr' : 'en'));

  // The prose is prerendered HTML, so its cross-links are raw anchors with no <Link> to
  // render. One delegated handler makes them navigate client-side like the rest.
  const onLinkClick = useLinkNavigation();

  // Mobile sidebar drawer (no effect on desktop, where the sidebar is a grid column).
  const [navOpen, setNavOpen] = createSignal(false);

  const i = createMemo(() => ORDER.indexOf(slug()));
  const prev = createMemo(() => (i() > 0 ? ORDER[i() - 1] : null));
  const next = createMemo(() => (i() >= 0 && i() < ORDER.length - 1 ? ORDER[i() + 1] : null));

  // Per-doc document head, rendered into <head> at prerender (each page is static), so crawlers
  // get a unique title/description/canonical per doc, plus en/fr hreflang alternates.
  //
  // Called straight through, not from an effect: effects do not run while prerendering, and
  // an effect here left every generated page with an empty <title>. `seo` takes accessors for
  // the fields that move, so a client navigation updates them on a page that stays mounted.
  //
  // og and twitter take plain values, so they keep whatever the first render saw. That is the
  // right trade: they exist for crawlers, and a crawler reads the prerendered page, where each
  // doc is its own render.
  const title = createMemo(() => `${doc()?.title ?? slug()} · ${ui().product}`);
  const description = createMemo(() => doc()?.description ?? 'Fluixi documentation, reactivity, compiled.');
  const canonical = createMemo(() => `${SITE}${link(slug())}`);
  seo({
    title,
    description,
    canonical,
    lang,
    og: {
      type: 'article',
      siteName: ui().product,
      url: canonical(),
      title: title(),
      description: description(),
      locale: lang(),
      image: { url: `${SITE}/og.png`, width: 1200, height: 630, alt: ui().product },
    },
    twitter: { card: 'summary_large_image', title: title(), description: description(), image: `${SITE}/og.png` },
    alternates: [
      { hreflang: 'en', href: `${SITE}/${version()}/en/${slug()}` },
      { hreflang: 'fr', href: `${SITE}/${version()}/fr/${slug()}` },
      { hreflang: 'x-default', href: `${SITE}/${version()}/en/${slug()}` },
    ],
  });

  return (
    <div class="docs">
      <style scoped>{`
        .docs { min-height: 100vh; }

        /* header */
        .d-head {
          position: sticky; top: 0; z-index: 40;
          display: flex; align-items: center; justify-content: space-between;
          height: var(--head); padding: 0 20px; border-bottom: 1px solid var(--line);
          background: var(--bg-head); backdrop-filter: blur(12px);
        }
        /* flex-shrink: 0, so the brand never loses the shrink race against .d-actions,
           or its text overflows its own box and overlaps whatever sits to its right. */
        .d-head-left { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .d-menu {
          display: none; align-items: center; justify-content: center;
          width: 34px; height: 34px; padding: 0; font-size: 17px; line-height: 1;
          color: var(--muted); background: transparent;
          border: 1px solid var(--line); border-radius: var(--r-md); cursor: pointer;
        }
        .d-menu:hover { color: var(--text); border-color: var(--line-strong); }
        /* Link renders its own <a>, which this component's scope does not reach: :deep from a
           scoped parent. The same for the language toggle, the nav items and the pager. */
        .d-head-left :deep(.d-brand) { display: flex; align-items: center; gap: 9px; font-weight: 600; font-size: 15px; letter-spacing: -.01em; }
        .logo { width: 20px; height: 20px; flex: none; }
        .d-actions { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .ver { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--muted); }
        .ver select {
          background: transparent; color: var(--muted); border: 1px solid var(--line);
          border-radius: var(--r-md); padding: 5px 8px; font-size: 12.5px;
          font-family: var(--mono); cursor: pointer;
        }
        .ver select:hover { color: var(--text); border-color: var(--line-strong); }
        .d-actions :deep(.lang-toggle), .theme-toggle {
          display: inline-flex; align-items: center; justify-content: center;
          height: 32px; padding: 0 11px; font-size: 12.5px; line-height: 1;
          color: var(--muted); background: transparent;
          border: 1px solid var(--line); border-radius: var(--r-md); cursor: pointer;
        }
        .theme-toggle { width: 32px; padding: 0; font-size: 14px; }
        .d-actions :deep(.lang-toggle:hover), .theme-toggle:hover { color: var(--text); border-color: var(--line-strong); }
        .d-link { font-size: 13px; color: var(--muted); }
        .d-link:hover { color: var(--text); }

        /* body grid */
        .d-body { display: grid; grid-template-columns: var(--sb) minmax(0, 1fr); max-width: 1200px; margin: 0 auto; }
        .d-sidebar {
          position: sticky; top: var(--head); align-self: start;
          height: calc(100vh - var(--head)); overflow-y: auto;
          padding: 28px 16px 60px; border-right: 1px solid var(--line);
        }
        .nav-group { margin-bottom: 26px; }
        .nav-group-title {
          font-size: 11px; text-transform: uppercase; letter-spacing: .09em;
          color: var(--muted); margin: 0 10px 8px; font-weight: 600;
        }
        /* Marked by rule, weight and colour, so it does not depend on hue alone. */
        .d-sidebar :deep(.nav-item) {
          display: block; padding: 6px 10px; border-radius: var(--r-sm);
          font-size: 13.5px; line-height: 1.5; color: var(--muted);
          border-left: 2px solid transparent; margin-left: -2px;
        }
        .d-sidebar :deep(.nav-item:hover) { color: var(--text); background: var(--hover); }
        /* Square left corners, or the radius clips the rule down to a stub. */
        .d-sidebar :deep(.nav-item.on) {
          color: var(--text); background: var(--accent-soft); border-left-color: var(--accent);
          font-weight: 500; border-radius: 0 var(--r-sm) var(--r-sm) 0;
        }

        /* mobile drawer backdrop, inert on desktop */
        .d-backdrop { display: none; }

        .d-main { padding: 56px 64px 120px; max-width: calc(var(--measure) + 128px); }

        /* pager */
        .d-pager { display: flex; justify-content: space-between; gap: 14px; margin-top: 72px; padding-top: 28px; border-top: 1px solid var(--line); }
        .d-pager :deep(.pager) {
          display: flex; flex-direction: column; gap: 3px; padding: 13px 16px;
          border: 1px solid var(--line); border-radius: var(--r-md); min-width: 0;
          transition: border-color .15s;
        }
        .d-pager :deep(.pager.next) { text-align: right; margin-left: auto; }
        .d-pager :deep(.pager:hover) { border-color: var(--line-strong); }
        .d-pager :deep(.pager span) { font-size: 11.5px; color: var(--muted); }
        .d-pager :deep(.pager b) { font-size: 14px; font-weight: 500; color: var(--text); }

        .d-foot { margin-top: 48px; padding-top: 22px; font-size: 12px; line-height: 1.6; color: var(--muted); display: flex; justify-content: center; gap: .5rem; }
        .d-foot p { margin: 0; }
        .d-foot a { color: var(--text); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--line-strong); margin-left: .25rem; }
        .d-foot a:hover { text-decoration-color: currentColor; }
        @media (max-width: 400px) {
          .d-foot { display: block; text-align: center; }
        }
        @media (max-width: 980px) {
          .d-body { grid-template-columns: 1fr; min-width: 0; }
          .d-main { padding: 36px 24px 80px; min-width: 0; max-width: none; }

          .d-menu { display: inline-flex; }

          /* sidebar becomes a slide-in drawer */
          .d-sidebar {
            position: fixed;
            top: var(--head);
            left: 0;
            z-index: 50;
            width: 276px;
            max-width: 84vw;
            height: calc(100vh - var(--head));
            background: var(--bg);
            border-right: 1px solid var(--line);
            transform: translateX(-100%);
            transition: transform .22s ease;
          }
          .d-sidebar.open { transform: translateX(0); box-shadow: 0 0 40px var(--shadow); }

          .d-backdrop {
            display: block;
            position: fixed;
            inset: var(--head) 0 0;
            z-index: 45;
            background: var(--scrim);
            opacity: 0;
            pointer-events: none;
            transition: opacity .22s ease;
          }
          .d-backdrop.show { opacity: 1; pointer-events: auto; }
        }

        @media (max-width: 560px) {
          .d-head { padding: 0 14px; gap: 8px; }
          .d-head-left :deep(.d-brand) { font-size: 14.5px; }
          .d-actions { gap: 6px; }
          .ver > span { display: none; }        /* keep the select, drop the "Version" label */
          /* The select and the language name are the two variable-width items in the row,
             so they are the ones that give way, clipped rather than left to force the
             header wider than the viewport. */
          .ver select { max-width: 76px; }
          .d-actions :deep(.lang-toggle) {
            padding: 0 8px; max-width: 64px;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          }
          .d-main { padding: 28px 18px 64px; }
        }

        @media (max-width: 360px) {
          /* Still does not fit clipped below this width. Dropping it loses the control;
             leaving it risked overlap again, which is worse. */
          .d-actions :deep(.lang-toggle) { display: none; }
        }
      `}</style>
      {/* First tab stop: the sidebar is ~25 links, so a keyboard or screen-reader user
          would otherwise traverse the whole nav on every page to reach the content. */}
      <a class="skip" href="#content">{ui().skip}</a>
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
            <img class="logo" src="/logos/mark.png" alt="" width="22" height="22" /> {ui().product}
          </Link>
        </div>
        <div class="d-actions">
          <Search lang={lang()} version={version()} label={ui().search} />
          <label class="ver">
            <span>{ui().version}</span>
            {/* Named on its own: the visible label is hidden on narrow screens. */}
            <select aria-label={ui().version} onChange={(e: any) => (location.href = `/${e.target.value}/${lang()}/${slug()}`)}>
              {VERSIONS.map((v) => (
                <option value={v} selected={v === version()}>
                  {versionLabel(v)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            class="theme-toggle"
            aria-label={ui().theme}
            title={ui().theme}
            onClick={() => scheme.toggle()}
          >
            ◐
          </button>
          <Link
            class="lang-toggle"
            href={`/${version()}/${other()}/${slug()}`}
            onClick={() => languageStorage().set('lang', other())}
          >
            {LANG_LABEL[other()]}
          </Link>
          <a class="d-link" href="https://playground.fluixi.com">
            {ui().playground}
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
              <div class="nav-group-title">{section.group[lang()]}</div>
              {section.slugs.map((s) => (
                <Link
                  class={() => (s === slug() ? 'nav-item on' : 'nav-item')}
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
          <article class="prose" innerHTML={doc()?.html ?? '<h1>Not found</h1>'} />
          <nav class="d-pager">
            {() => (prev() ? (
              <Link class="pager" href={link(prev()!)}>
                <span>← {ui().prev}</span>
                <b>{titleOf(prev()!)}</b>
              </Link>
            ) : (
              <span />
            ))}
            {() => (next() ? (
              <Link class="pager next" href={link(next()!)}>
                <span>{ui().next} →</span>
                <b>{titleOf(next()!)}</b>
              </Link>
            ) : (
              <span />
            ))}
          </nav>
          <footer class="d-foot">
            <p>
              {ui().released} <a href={LICENSE_URL}>{ui().license}</a>.
            </p>
            <p>Copyright © 2026 Ibrahima Touré</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
