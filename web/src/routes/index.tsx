import { signal, useColorScheme } from '@fluixi/core';
import { seo } from '@fluixi/start/head';
import './landing.css';

const SITE = 'https://fluixi.com';
const DOCS_URL = 'https://docs.fluixi.com';
const PLAYGROUND_URL = 'https://playground.fluixi.com';
const GITHUB_URL = 'https://github.com/fluixi/core';

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
  { value: '25.9 KB', label: 'The whole framework, gzipped, reactivity, components, router and all.' },
  { value: 'Zero', label: 'Virtual DOM nodes. The compiler emits the DOM calls directly.' },
  { value: 'TC39', label: 'Signals, the standards-track proposal, as the reactive core.' },
];

function Nav() {
  const scheme = useColorScheme();
  return (
    <nav class="nav">
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
      <div class="footer-inner">
      <div class="foot-brand">
        <img class="logo" src="/logos/mark.png" alt="" width="22" height="22" /> Fluixi
      </div>
      <div class="foot-cols">
        <div>
          <h4>Product</h4>
          <a href={DOCS_URL}>Documentation</a>
          <a href={PLAYGROUND_URL}>Playground</a>
        </div>
        <div>
          <h4>Source</h4>
          <a href={GITHUB_URL}>GitHub</a>
        </div>
      </div>
      <div class="foot-note">Built with Fluixi · prerendered to static HTML</div>
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
