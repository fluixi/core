import { createSignal } from '@fluixi/core';
import './landing.css';

const DOCS_URL = 'https://docs.fluixi.com';
const PLAYGROUND_URL = 'https://playground.fluixi.com';
const GITHUB_URL = 'https://github.com/fluixi/core';

const FEATURES: { glyph: string; title: string; body: string; tone: string }[] = [
  { glyph: '◆', tone: 'state', title: 'Fine-grained reactivity', body: 'A TC39-Signals graph updates exactly the DOM that changed — no virtual DOM, no diffing, no re-renders.' },
  { glyph: 'ƒ', tone: 'memo', title: 'Compiled, not interpreted', body: 'JSX compiles straight to imperative DOM calls. You ship the work, not a runtime that re-discovers it.' },
  { glyph: '⚡', tone: 'effect', title: 'SSR + streaming', body: 'Request-scoped server rendering with web-stream output and seamless hydration — isolated per request.' },
  { glyph: '▤', tone: 'store', title: 'Static generation', body: 'Set `prerender` and `fluixi build` crawls your routes to static HTML — this very page is SSG.' },
  { glyph: '⟂', tone: 'state', title: 'File-based routing', body: 'Routes from the filesystem, nested layouts, lazy loading, data loaders — with a framework-agnostic core.' },
  { glyph: '⇄', tone: 'memo', title: 'Server functions & actions', body: '`"use server"` turns a function into a typed RPC; forms get progressive-enhancement actions.' },
  { glyph: '◇', tone: 'effect', title: 'API routes & middleware', body: 'Drop a handler in `src/api/**` for `/api/*`; a middleware chain runs before every render.' },
  { glyph: '✦', tone: 'store', title: 'DI, i18n, interceptors', body: 'Angular-style dependency injection, built-in typed i18n, and an HTTP interceptor pipeline.' },
  { glyph: '◐', tone: 'state', title: 'Islands & edge', body: 'Partial hydration for mostly-static pages, and an edge-safe server that runs on Workers, Deno and Bun.' },
];

function Nav() {
  return (
    <nav class="nav">
      <a class="brand" href="/">
        <span class="logo">✦</span> Fluixi
      </a>
      <div class="nav-links">
        <a href={DOCS_URL}>Docs</a>
        <a href={PLAYGROUND_URL}>Playground</a>
        <a href={GITHUB_URL}>GitHub</a>
      </div>
    </nav>
  );
}

function InstallCommand() {
  const [copied, setCopied] = createSignal(false);
  const cmd = 'npm create fluixi@latest';
  const copy = () => {
    try {
      navigator.clipboard?.writeText(cmd);
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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

const HERO_CODE = `function Counter() {
  const [count, setCount] = createSignal(0);
  const doubled = createMemo(() => count() * 2);

  return (
    <button onClick={() => setCount(c => c + 1)}>
      {count()} · {doubled()}
    </button>
  );
}`;

const SERVER_CODE = `// runs only on the server — the body is stripped from the client bundle
async function getUser(id: string) {
  "use server";
  return db.users.find(id); // secrets stay server-side
}

// call it from anywhere like a normal async function:
const user = await getUser("42");`;

function Hero() {
  return (
    <header class="hero">
      <div class="hero-copy">
        <div class="eyebrow">reactive · compiled · full-stack</div>
        <h1>
          The reactive framework
          <br />
          <span class="grad">you can see.</span>
        </h1>
        <p class="lede">
          Fluixi compiles your JSX to fine-grained DOM updates on a TC39-Signals core — then gives you SSR,
          streaming, SSG, server functions, routing, DI and i18n in one coherent stack.
        </p>
        <div class="cta">
          <a class="btn primary" href={DOCS_URL}>
            Get started →
          </a>
          <a class="btn ghost" href={PLAYGROUND_URL}>
            Open the Playground
          </a>
        </div>
        <InstallCommand />
      </div>
      <div class="hero-code">
        <div class="code-window">
          <div class="code-bar">
            <span class="dot" />
            <span class="dot" />
            <span class="dot" />
            <span class="code-name">Counter.tsx</span>
          </div>
          <pre class="code">{HERO_CODE}</pre>
        </div>
      </div>
    </header>
  );
}

function Features() {
  return (
    <section class="features" id="features">
      <div class="section-head">
        <h2>Everything a modern app needs</h2>
        <p>One framework, from the signal graph to the edge.</p>
      </div>
      <div class="grid">
        {FEATURES.map((f) => (
          <div class="card">
            <span class={`card-glyph t-${f.tone}`}>{f.glyph}</span>
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
    <section class="split">
      <div class="split-copy">
        <h2>
          The server is just <span class="grad">a function away.</span>
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
          <span class="dot" />
          <span class="dot" />
          <span class="dot" />
          <span class="code-name">user.ts</span>
        </div>
        <pre class="code">{SERVER_CODE}</pre>
      </div>
    </section>
  );
}

function PlaygroundCallout() {
  return (
    <section class="callout">
      <div class="callout-inner">
        <h2>See your reactivity.</h2>
        <p>
          The Fluixi Playground compiles JSX in your browser and renders the live dependency graph — watch state,
          memos, stores and effects light up as they propagate.
        </p>
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
      <div class="foot-brand">
        <span class="logo">✦</span> Fluixi
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
    </footer>
  );
}

export default function Home() {
  return (
    <div class="page">
      <Nav />
      <Hero />
      <Features />
      <ServerSection />
      <PlaygroundCallout />
      <Footer />
    </div>
  );
}
