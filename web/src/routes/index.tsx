import { signal, useColorScheme } from '@fluixi/core';
import { seo } from '@fluixi/start/head';
import './landing.css';

const SITE = 'https://fluixi.com';
const DOCS_URL = 'https://docs.fluixi.com';
const PLAYGROUND_URL = 'https://playground.fluixi.com';
const GITHUB_URL = 'https://github.com/fluixi/core';
const LICENSE_URL = `${GITHUB_URL}/blob/main/LICENSE`;

const TITLE = 'Fluixi, a compiler-native reactive framework';
const DESC =
  'Fluixi compiles components into imperative DOM calls, no virtual DOM, no diffing, no re-renders. Fine-grained reactivity on a TC39-Signals core, with SSR, streaming, SSG, file routing, server functions, DI and i18n. The reactive model the compiler builds is the one the devtools read, from source and at runtime.';

const FEATURES: { title: string; body: string }[] = [
  { title: 'Fine-grained reactivity', body: 'A TC39-Signals graph updates exactly the DOM that changed, no virtual DOM, no diffing, no re-renders.' },
  { title: 'Compiled, not interpreted', body: 'JSX compiles straight to imperative DOM calls. You ship the work, not a runtime that re-discovers it.' },
  { title: 'SSR + streaming', body: 'Request-scoped server rendering with web-stream output and hydration, isolated per request.' },
  { title: 'Static generation', body: 'Set `prerender` and `fluixi build` crawls your routes to static HTML, this very page is SSG.' },
  { title: 'File-based routing', body: 'Routes from the filesystem, nested layouts, lazy loading, data loaders, with a framework-agnostic core.' },
  { title: 'Server functions & actions', body: '`"use server"` turns a function into a typed RPC; forms get progressive-enhancement actions.' },
  { title: 'API routes & middleware', body: 'Drop a handler in `src/api/**` for `/api/*`; a middleware chain runs before every render.' },
  { title: 'DI, i18n, interceptors', body: 'Angular-style dependency injection, built-in typed i18n, and an HTTP interceptor pipeline.' },
  { title: 'Islands & edge', body: 'Partial hydration for mostly-static pages, and an edge-safe server that runs on Workers, Deno and Bun.' },
];

// Sizes are the minified+gzipped globals @fluixi/cdn publishes; regenerate them here if
// the bundles move, since a stale number on the front page is worse than none.
const STATS: { value: string; label: string }[] = [
  { value: '35.8 KB', label: 'The whole framework, gzipped, reactivity, components, router and all.' },
  { value: 'Zero', label: 'Virtual DOM nodes. The compiler emits the DOM calls directly.' },
  { value: 'TC39', label: 'Signals, the standards-track proposal, as the reactive core.' },
];

function Nav() {
  const scheme = useColorScheme();
  return (
    <nav class="nav">
      <style scoped>{`
        .nav {
          position: sticky; top: 0; z-index: 50;
          border-bottom: 1px solid var(--line);
          background: var(--bg-head); backdrop-filter: blur(12px);
        }
        .nav-inner {
          display: flex; align-items: center; justify-content: space-between;
          max-width: var(--maxw); margin: 0 auto; padding: 0 24px; height: 58px;
        }
        .brand { display: flex; align-items: center; gap: 9px; font-weight: 600; font-size: 16px; letter-spacing: -.015em; }
        .nav-links { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--muted); }
        .nav-links a { padding: 6px 10px; border-radius: var(--r-sm); }
        .nav-links a:hover { color: var(--text); background: var(--hover); }
        .theme-toggle {
          display: inline-grid; place-items: center; width: 32px; height: 32px; padding: 0;
          margin-left: 4px; font-size: 14px; line-height: 1; cursor: pointer; color: var(--muted);
          background: transparent; border: 1px solid var(--line); border-radius: var(--r-md);
          transition: color .15s, border-color .15s;
        }
        .theme-toggle:hover { color: var(--text); border-color: var(--line-strong); }
        @media (max-width: 620px) {
          .nav-links a { padding: 6px 7px; }
        }
      `}</style>
      <div class="nav-inner">
        <a class="brand" href="/">
          <img class="logo" src="/logos/mark.png" alt="" width="21" height="21" /> Fluixi
        </a>
        <div class="nav-links">
          <a href={DOCS_URL}>Docs</a>
          <a href={PLAYGROUND_URL}>Playground</a>
          <a href={GITHUB_URL}>GitHub</a>
          <button
            type="button"
            class="theme-toggle"
            aria-label="Switch theme"
            title="Switch theme"
            onClick={() => scheme.toggle()}
          >
            ◐
          </button>
        </div>
      </div>
    </nav>
  );
}

function InstallCommand(props: { cmd?: string }) {
  const copied = signal(false);
  const cmd = props.cmd ?? 'npm create fluixi@latest';
  const copy = () => {
    try {
      navigator.clipboard?.writeText(cmd);
    } catch {
      /* ignore */
    }
    copied.set(true);
    setTimeout(() => copied.set(false), 1500);
  };
  return (
    <div class="install">
      <style scoped>{`
        .install {
          display: inline-flex; align-items: center; gap: 10px;
          background: var(--code-bg); border: 1px solid var(--code-line); border-radius: var(--r-md);
          padding: 9px 10px 9px 14px; font-family: var(--mono); font-size: 13px;
        }
        .install .prompt { color: var(--muted); }
        .install code { color: var(--code-text); }
        .install .copy {
          margin-left: 4px; background: transparent; border: 1px solid var(--code-line);
          color: var(--muted); border-radius: var(--r-sm); padding: 3px 9px;
          font-size: 11.5px; font-family: var(--mono); cursor: pointer;
          transition: color .15s, border-color .15s;
        }
        .install .copy:hover { color: var(--text); border-color: var(--line-strong); }
      `}</style>
      <span class="prompt">$</span>
      <code>{cmd}</code>
      <button class="copy" onClick={copy}>
        {copied() ? '✓ copied' : 'copy'}
      </button>
    </div>
  );
}

// The three panels of the hero. COMPILED is the compiler's real output for JSX_SRC,
// generated with @fluixi/compiler and pasted verbatim, not paraphrased. If the codegen
// changes, regenerate it; a stale "compiled output" would be worse than none.
const JSX_SRC = `function Counter() {
  const count = $signal(0);          // no import, the compiler resolves it

  return (
    <button onClick={() => count.set(c => c + 1)}>
      {count()}
    </button>
  );
}`;

const HTML_SRC = `function Counter() {
  const count = $signal(0);

  return html\`
    <button @click=\${() => count.set(c => c + 1)}>
      \${count()}
    </button>
  \`;
}`;

// What the compiler does that a runtime cannot: the destructured props below stay live,
// because it knows `title` came from a component's props.
const WHY_CODE = `function Card({ title, ...rest }) {
  return <h2 {...rest}>{title}</h2>;   // title still updates
}

import { signal as state } from '@fluixi/reactive/signal';
const count = state(0);        // a signal, resolved through the import

function signal() { return 42; }
const value = signal();        // not a signal, a local function`;

const COMPILED = `import { signal } from "@fluixi/reactive/signal";
import { createNativeElement, delegateEvents,
         insert, spread } from "@fluixi/dom";

delegateEvents(["click"]);          // one listener, at the root

function Counter() {
  const count = signal(0);          // the import above, added for you

  return (() => {
    const _el$ = createNativeElement("button");
    spread({ element: _el$, props: {
      onClick: () => count.set(c => c + 1),
    } });
    insert(_el$, () => count(), null);   // this text node. only.
    return _el$;
  })();
}`;

/**
 * Minimal highlighter for the three hero samples.
 *
 * Deliberately not highlight.js: that is one dependency and, if imported by a component,
 * a large one in the client bundle, the exact mistake the docs site had to undo. The
 * input here is three strings we control, so a small tokenizer is both sufficient and
 * predictable.
 *
 * Single pass with one alternation, because the classic failure is replacing inside markup
 * that a previous pass already emitted. Whichever group matched decides the class, so no
 * token can be re-tokenized.
 */
const TOKENS =
  /(\/\/[^\n]*)|(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(import|from|function|const|let|return|new|await|async)\b|\b(signal|memo|effect|store|\$signal|\$memo|\$effect|\$store|createNativeElement|spread|insert|delegateEvents|html)\b/g;

const ESCAPE: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

function highlight(code: string): string {
  return code
    .replace(/[&<>]/g, (c) => ESCAPE[c])
    .replace(TOKENS, (match, comment, str, keyword, api) => {
      if (comment) return `<i class="t-com">${comment}</i>`;
      if (str) return `<i class="t-str">${str}</i>`;
      if (keyword) return `<i class="t-kw">${keyword}</i>`;
      if (api) return `<i class="t-api">${api}</i>`;
      return match;
    });
}

const PANELS = [
  { id: 'jsx', label: 'JSX', file: 'Counter.tsx', code: JSX_SRC },
  { id: 'html', label: 'html``', file: 'Counter.ts', code: HTML_SRC },
  { id: 'out', label: 'Compiled', file: 'what the browser runs', code: COMPILED },
] as const;

const HTML_CODE = `import { html } from "@fluixi/core";

// No JSX, no tsconfig changes, plain .ts, same compiled output.
function Counter() {
  const count = signal(0);

  return html\`
    <button @click=\${() => setCount(c => c + 1)}>
      count: \${count()}
    </button>
  \`;
}`;

const SERVER_CODE = `// runs only on the server, the body is stripped from the client bundle
async function getUser(id: string) {
  "use server";
  return db.users.find(id); // secrets stay server-side
}

// call it from anywhere like a normal async function:
const user = await getUser("42");`;

/**
 * The hero is the argument, not a screenshot.
 *
 * A counter written with signals looks like every other signals framework, so leading with
 * one concedes the comparison. What is ours is the third tab: the same component after the
 * compiler, with no virtual DOM and no diff, one element built once and a single text node
 * kept up to date. Showing it is a claim nobody can answer by writing better marketing.
 */
function Hero() {
  const panel = signal<string>('jsx');
  const current = () => PANELS.find((p) => p.id === panel()) ?? PANELS[0];

  return (
    <header class="hero">
      <style scoped>{`
        .hero {
          max-width: var(--maxw); margin: 0 auto; padding: 76px 24px 64px;
          display: grid; grid-template-columns: 1.02fr .98fr; gap: 52px; align-items: center;
        }
        /* A grid item's default min-width is auto, so the pre inside (white-space: pre, sized to its
           longest line) refuses to shrink below its own content and forces the track, and the page,
           wider than the viewport. */
        .hero-code { min-width: 0; }
        .eyebrow {
          font-family: var(--mono); font-size: 11.5px; letter-spacing: .12em;
          text-transform: uppercase; color: var(--muted); margin-bottom: 20px;
        }
        /* Scales with the column, so "The compiler knows" stays on one line instead of
           breaking after two words. */
        .hero h1 { margin: 0; font-size: clamp(33px, 3.6vw, 47px); line-height: 1.08; letter-spacing: -.03em; font-weight: 700; }
        .hero h1 .quiet { color: var(--muted); font-weight: 700; }
        .lede { margin: 22px 0 28px; font-size: 17px; line-height: 1.65; color: var(--prose); max-width: 32em; }
        /* The panels differ in length, 8, 9 and 17 lines, so switching tabs would resize the window
           and shove the page around. Reserve the tallest once, in em so it tracks the font size
           rather than a magic pixel number. */
        .hero-code .code { min-height: calc(17 * 1.7em + 36px); }
        .code-tab {
          font-family: var(--mono); font-size: 11.5px; line-height: 1.6;
          padding: 6px 11px; border-radius: var(--r-sm) var(--r-sm) 0 0; cursor: pointer;
          color: var(--muted); background: transparent; border: 1px solid transparent;
          transition: color .15s, background .15s, border-color .15s;
        }
        .code-tab:hover { color: var(--text); }
        /* Weight and a border carry the selected state as well as colour. */
        .code-tab.on {
          color: var(--text); font-weight: 500;
          background: var(--code-bg);
          border-color: var(--code-line);
          border-bottom-color: var(--code-bg);
          margin-bottom: -1px;
        }
        .hero-note { margin: 12px 2px 0; font-size: 12px; color: var(--muted); font-family: var(--mono); line-height: 1.5; }
        @media (max-width: 900px) {
          .hero { grid-template-columns: 1fr; gap: 36px; padding-top: 48px; }
          .hero h1 { font-size: 40px; }
        }
        @media (max-width: 620px) {
          .hero h1 { font-size: 33px; }
        }
      `}</style>
      <div class="hero-copy">
        <div class="eyebrow">compiler-native · reactive · full-stack · inspectable</div>
        <h1>
          The compiler knows
          <br />
          <span class="quiet">what's reactive.</span>
        </h1>
        <p class="lede">
          Every reactive framework asks you to remember which reads are tracked and what you
          may not destructure. Fluixi's compiler resolves that itself, by where a value came
          from, not by how it's named, and carries it through JSX, templates, the DOM it
          generates, SSR, hydration and routing as one model. You write ordinary TypeScript.
          And because the model is the compiler's own, you can read it back: from source, and
          from a running app in your editor or the browser.
        </p>
        <div class="cta">
          <a class="btn primary" href={DOCS_URL}>
            Get started →
          </a>
          <a class="btn ghost" href="#compiled" onClick={() => panel.set('out')}>
            See the compiled output
          </a>
        </div>
        <InstallCommand />
      </div>

      <div class="hero-code" id="compiled">
        <div class="code-window">
          <div class="code-bar" role="tablist" aria-label="Source and compiled output">
            {PANELS.map((p) => (
              <button
                type="button"
                role="tab"
                class={() => (panel() === p.id ? 'code-tab on' : 'code-tab')}
                aria-selected={() => (panel() === p.id ? 'true' : 'false')}
                onClick={() => panel.set(p.id)}
              >
                {p.label}
              </button>
            ))}
            <span class="code-name">{() => current().file}</span>
          </div>
          <pre class="code" innerHTML={() => highlight(current().code)} />
        </div>
        <p class="hero-note">
          {() =>
            panel() === 'out'
              ? 'Generated by @fluixi/compiler, this is the real output, not a sketch.'
              : 'Both syntaxes compile to the same calls. Switch to Compiled to see them.'
          }
        </p>
      </div>
    </header>
  );
}

function Why() {
  return (
    <section class="section split" id="why">
      <div class="split-copy">
        <h2>
          Ordinary TypeScript, still reactive.
        </h2>
        <p>
          The compiler resolves a reactive value by the binding it came from, never by how the
          name reads, so an alias is recognised and a local function of the same name is not.
          Knowing that, it can rewrite what a runtime alone would lose.
        </p>
        <ul class="checks">
          <li>Destructure props and the bindings stay live reads</li>
          <li>What it can't prove safe is left as written, and reported</li>
          <li>JSX and <code>html``</code> compile to one reactive model</li>
        </ul>
      </div>
      <div class="code-window">
        <div class="code-bar">
          <span class="code-name">Card.tsx</span>
        </div>
        <pre class="code" innerHTML={highlight(WHY_CODE)} />
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section class="stats" aria-label="At a glance">
      <style scoped>{`
        .stats {
          border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
          background: var(--panel);
        }
        .stats-inner {
          max-width: var(--maxw); margin: 0 auto; padding: 0 24px;
          display: grid; grid-template-columns: repeat(3, 1fr);
        }
        .stat { padding: 26px 4px; border-left: 1px solid var(--line); padding-left: 26px; }
        .stat:first-child { border-left: 0; padding-left: 4px; }
        .stat b { display: block; font-size: 26px; font-weight: 600; letter-spacing: -.02em; font-family: var(--mono); }
        .stat span { display: block; margin-top: 5px; font-size: 13.5px; color: var(--muted); line-height: 1.5; }
        @media (max-width: 620px) {
          .stats-inner { grid-template-columns: 1fr; }
          .stat { border-left: 0; border-top: 1px solid var(--line); padding-left: 4px; }
          .stat:first-child { border-top: 0; }
        }
      `}</style>
      <div class="stats-inner">
        {STATS.map((s) => (
          <div class="stat">
            <b>{s.value}</b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section class="section" id="features">
      <style scoped>{`
        .section-head { max-width: 34em; margin-bottom: 40px; }
        .section-head h2 { margin: 0; font-size: 30px; letter-spacing: -.026em; font-weight: 700; line-height: 1.2; }
        .section-head p { margin: 12px 0 0; color: var(--muted); font-size: 16px; line-height: 1.6; }
        .kicker {
          font-family: var(--mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase;
          color: var(--muted); margin: 0 0 14px;
        }
        /* The capability list, hairline rows rather than a grid of tiles. */
        .spec-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 48px; border-top: 1px solid var(--line); }
        .spec { padding: 22px 0; border-bottom: 1px solid var(--line); }
        .spec h3 { margin: 0 0 6px; font-size: 15.5px; font-weight: 600; letter-spacing: -.01em; }
        .spec p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.62; }
        .spec code {
          font-family: var(--mono); font-size: .88em; color: var(--text);
          background: var(--panel-2); border: 1px solid var(--line); padding: .1em .38em; border-radius: var(--r-sm);
        }
        @media (max-width: 900px) {
          .spec-list { grid-template-columns: 1fr; }
        }
      `}</style>
      <div class="section-head">
        <p class="kicker">The rest of it</p>
        <h2>Everything a modern app needs</h2>
        <p>One framework, from the signal graph to the edge.</p>
      </div>
      <div class="spec-list">
        {FEATURES.map((f) => (
          <div class="spec">
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServerSection() {
  return (
    <section class="section split">
      <div class="split-copy">
        <h2>
          The server is just a function away.
        </h2>
        <p>
          Mark a function <code>"use server"</code> and the compiler strips its body from the browser, leaving a
          typed RPC stub. Secrets, database calls and your API keys never ship to the client.
        </p>
        <ul class="checks">
          <li>Request-scoped context, cookies and headers</li>
          <li>Form actions with progressive enhancement</li>
          <li>File-based API routes at <code>/api/*</code></li>
        </ul>
      </div>
      <div class="code-window">
        <div class="code-bar">
          <span class="code-name">user.ts</span>
        </div>
        <pre class="code" innerHTML={highlight(SERVER_CODE)} />
      </div>
    </section>
  );
}

function GetStarted() {
  return (
    <section class="section split flip" id="get-started">
      <div class="split-copy">
        <h2>
          Start in seconds, JSX or html``.
        </h2>
        <p>
          One command scaffolds an SPA or an SSR app, in JSX or JSX-free <code>{'html``'}</code> templates.
          Both compile to the same fine-grained DOM calls, so you can even mix them in one file.
        </p>
        <ul class="checks">
          <li><code>--jsx</code> or <code>--html</code> · <code>--spa</code> or <code>--ssr</code></li>
          <li>html`` needs no <code>jsx</code> in tsconfig, plain <code>.ts</code> files</li>
          <li>Editor support via <code>@fluixi/ts-plugin</code>, wired in for you</li>
        </ul>
        <InstallCommand cmd="npm create fluixi@latest my-app -- --html --ssr" />
        <div class="cta">
          <a class="btn ghost" href={`${DOCS_URL}/v1/en/quickstart`}>
            Quick start →
          </a>
          <a class="btn ghost" href={`${DOCS_URL}/v1/en/html-templates`}>
            html`` templates →
          </a>
        </div>
      </div>
      <div class="code-window">
        <div class="code-bar">
          <span class="code-name">Counter.ts</span>
        </div>
        <pre class="code" innerHTML={highlight(HTML_CODE)} />
      </div>
    </section>
  );
}

function PlaygroundCallout() {
  return (
    <section class="callout">
      <style scoped>{`
        .callout { max-width: var(--maxw); margin: 0 auto; padding: 0 24px 92px; }
        .callout-inner {
          border: 1px solid var(--line); border-radius: var(--r-lg); padding: 48px 40px;
          display: flex; align-items: center; justify-content: space-between; gap: 32px; flex-wrap: wrap;
          background: var(--panel);
        }
        .callout-inner h2 { margin: 0 0 8px; font-size: 25px; letter-spacing: -.022em; font-weight: 700; }
        .callout-inner p { margin: 0; color: var(--muted); font-size: 15px; line-height: 1.6; max-width: 44em; }
        @media (max-width: 900px) {
          .callout-inner { padding: 36px 26px; }
        }
      `}</style>
      <div class="callout-inner">
        <div>
          <h2>See your reactivity.</h2>
          <p>
            The Fluixi Playground compiles JSX in your browser and renders the live dependency graph, watch state,
            memos, stores and effects light up as they propagate.
          </p>
        </div>
        <a class="btn primary" href={PLAYGROUND_URL}>
          Try the Playground →
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer class="footer">
      <style scoped>{`
        .footer { border-top: 1px solid var(--line); }
        .footer-inner {
          max-width: var(--maxw); margin: 0 auto; padding: 44px 24px;
          display: grid; grid-template-columns: 1fr auto; gap: 30px; align-items: start;
        }
        .foot-brand { display: flex; align-items: center; gap: 9px; font-weight: 600; font-size: 15px; }
        .foot-cols { display: flex; gap: 56px; }
        .foot-cols h2 { margin: 0 0 12px; font-size: 11px; text-transform: uppercase; letter-spacing: .09em; color: var(--muted); font-weight: 600; }
        /* 24px tall, the minimum size for a touch target. */
        .foot-cols a { display: block; color: var(--muted); font-size: 13.5px; padding: 4px 0; margin: 3px 0; }
        .foot-cols a:hover { color: var(--text); }
        .foot-note { grid-column: 1 / -1; color: var(--muted); font-size: 12px; line-height: 1.6; text-align: center; }
        .foot-note p { margin: 0; }
        .foot-note a { color: var(--text); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--line-strong); }
        .foot-note a:hover { text-decoration-color: currentColor; }
        @media (max-width: 620px) {
          .footer-inner { grid-template-columns: 1fr; }
          .foot-cols { gap: 36px; }
        }
      `}</style>
      <div class="footer-inner">
      <div class="foot-brand">
        <img class="logo" src="/logos/mark.png" alt="" width="22" height="22" /> Fluixi
      </div>
      <div class="foot-cols">
        <div>
          <h2>Product</h2>
          <a href={DOCS_URL}>Documentation</a>
          <a href={PLAYGROUND_URL}>Playground</a>
          <a href="/llms.txt">llms.txt</a>
        </div>
        <div>
          <h2>Source</h2>
          <a href={GITHUB_URL}>GitHub</a>
        </div>
      </div>
      <div class="foot-note">
        <p>
          Released under the <a href={LICENSE_URL}>MIT License</a>.
        </p>
        <p>Copyright © 2026 Ibrahima Touré</p>
      </div>
      </div>
    </footer>
  );
}

export default function Home() {
  // Page metadata, rendered into <head> on the server (this page is SSG) and kept reactive on
  // the client. Gives crawlers a canonical URL + rich link previews (the robots.txt/sitemap live
  // in public/).
  seo({
    title: TITLE,
    description: DESC,
    canonical: `${SITE}/`,
    og: {
      type: 'website',
      siteName: 'Fluixi',
      url: `${SITE}/`,
      title: TITLE,
      description: DESC,
      image: { url: `${SITE}/og.png`, width: 1200, height: 630, alt: 'Fluixi' },
    },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESC, image: `${SITE}/og.png` },
    // Structured data, neither site had any. SoftwareApplication is the type search engines
    // actually use for a developer tool, and it is the one that can earn a rich result.
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Fluixi',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      description: DESC,
      url: `${SITE}/`,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      license: 'https://opensource.org/licenses/MIT',
      codeRepository: GITHUB_URL,
    },
  });

  return (
    <div class="page">
      <a class="skip" href="#main">Skip to content</a>
      <Nav />
      <main id="main" tabindex={-1}>
      <Hero />
      <Stats />
      <Why />
      <Features />
      <GetStarted />
      <ServerSection />
      <PlaygroundCallout />
      </main>
      <Footer />
    </div>
  );
}
