# CDN & bundles

Every Fluixi runtime package ships a self-contained **IIFE global build** you can drop into a
page with a single `<script>` — no bundler, no build step, no npm install. They're published on
every release and served from [unpkg](https://unpkg.com) and [jsDelivr](https://www.jsdelivr.com).

## Bundle sizes

Each global is fully self-contained (its dependencies are bundled in), so you load exactly one
file. Sizes are minified; `gzip` is what ships over the wire.

| Script | Global | What's in it | Size |
| --- | --- | --- | --- |
| `@fluixi/reactive/dist/cdn/signal.global.js` | `window.Signal` | The raw TC39-Signals core (`State`, `Computed`, `subtle`) | 3.3 KB <small>(1.3 KB gz)</small> |
| `@fluixi/reactive/dist/cdn/reactive.global.js` | `window.Fluixi` | Full reactive API (signals, memos, effects, stores, resources) | 40.8 KB <small>(12.2 KB gz)</small> |
| `@fluixi/dom/dist/cdn/dom.global.js` | `window.FluixiDOM` | DOM runtime (render, control flow) **+** the reactive API | 58.1 KB <small>(18.9 KB gz)</small> |
| `@fluixi/core/dist/cdn/core.global.js` | `window.Fluixi` | The whole framework (reactivity + components + control flow + router + `startClient`) | 78.5 KB <small>(25.9 KB gz)</small> |
| `@fluixi/template-runtime/dist/cdn/fluixi.global.js` | `window.Fluixi` | The framework **+** the template compiler, so `` html`` `` works in the page | 103.3 KB <small>(32.9 KB gz)</small> |

Pick the smallest one that covers what you need: just reactivity → `signal` or `reactive`; a
reactive UI → `dom`; the full app framework → `core`; `` html`` `` in the page → `fluixi`.

## Reactivity only — `window.Signal`

The leanest option: the standards-track Signals primitives, nothing else.

```html
<script src="https://unpkg.com/@fluixi/reactive/dist/cdn/signal.global.js"></script>
<script>
  const count = new Signal.State(0);
  const doubled = new Signal.Computed(() => count.get() * 2);

  const w = new Signal.subtle.Watcher(() => {
    queueMicrotask(() => { console.log('doubled =', doubled.get()); w.watch(); });
  });
  w.watch(doubled);

  count.set(5); // → doubled = 10
</script>
```

## The reactive API — `window.Fluixi`

The ergonomic `createSignal`/`createMemo`/`createEffect`/`createStore` surface, on the same core:

```html
<script src="https://unpkg.com/@fluixi/reactive/dist/cdn/reactive.global.js"></script>
<script>
  const { createSignal, createMemo, createEffect } = Fluixi;

  const [count, setCount] = createSignal(0);
  const doubled = createMemo(() => count() * 2);
  createEffect(() => console.log('doubled =', doubled()));

  setCount(5); // → doubled = 10
</script>
```

## A reactive UI — `window.FluixiDOM`

The DOM runtime plus the reactive API, so one script builds a live interface. It re-exports the
reactive primitives (dom no longer bundles them itself), so you don't need a second file.

```html
<div id="app"></div>
<script src="https://unpkg.com/@fluixi/dom/dist/cdn/dom.global.js"></script>
<script>
  const { render, createNativeElement, insert, signal } = FluixiDOM;

  function Counter() {
    const n = signal(0);
    const button = createNativeElement('button');
    button.addEventListener('click', () => n.set(n() + 1));
    insert(button, () => `count: ${n()}`);
    return button;
  }

  render(() => Counter(), document.getElementById('app'));
</script>
```

## The whole framework — `window.Fluixi`

`core.global.js` bundles everything — reactivity, components, control flow, the router, and
`startClient`. Use it when you want the full framework without a build:

```html
<div id="app"></div>
<script src="https://unpkg.com/@fluixi/core/dist/cdn/core.global.js"></script>
<script>
  const { render, insert, createSignal } = Fluixi;

  function Counter() {
    const [n, setN] = createSignal(0);
    const button = document.createElement('button');
    button.addEventListener('click', () => setN(n() + 1));
    insert(button, () => `count: ${n()}`);
    return button;
  }

  render(() => Counter(), document.getElementById('app'));
</script>
```

> `reactive.global.js`, `core.global.js` and `fluixi.global.js` all expose `window.Fluixi` — load
> **one** of them, not several. `signal.global.js` uses `window.Signal` and can sit alongside either.

## Templates in the page — `window.Fluixi`

`` html`` `` needs the full build because the compiler normally replaces the tag at build time;
`fluixi.global.js` carries the compiler itself, so a page with no build step compiles its
templates as it renders. The other globals ship the runtime only.

```html
<div id="app"></div>
<script src="https://unpkg.com/@fluixi/template-runtime/dist/cdn/fluixi.global.js"></script>
<script>
  const { render, html, signal, define, Show } = Fluixi;

  function Counter() {
    const n = signal(0);
    return html`<button @click=${() => n.set(n() + 1)}>count: ${n}</button>`;
  }
  define({ Counter });

  function App() {
    const on = signal(false);
    return html`
      <div>
        <Counter />
        <button @click=${() => on.set(!on())}>toggle</button>
        <${Show} when=${on}><p>visible</p></${Show}>
      </div>
    `;
  }

  render(() => App(), document.getElementById('app'));
</script>
```

A component is reachable as a bare `<Counter />` once it is passed to `define()`, and as
`` <${Counter} /> `` without registering anything.

Pages that compile elsewhere, or that build nodes through the runtime API directly, use the
other globals. `dom.global.js` and `core.global.js` are smaller for that reason.

Compiling in the page evaluates the code it emits, so a Content-Security-Policy without
`unsafe-eval` blocks the full build. The other globals are unaffected.

## Version pinning

`unpkg.com/@fluixi/core@1/…` follows the major; pin an exact version for reproducibility, e.g.
`unpkg.com/@fluixi/core@1.0.0-alpha.79/dist/cdn/core.global.js`. jsDelivr works the same:
`cdn.jsdelivr.net/npm/@fluixi/core/dist/cdn/core.global.js`.

For real apps, prefer the compiled path (`npm create fluixi`) — the compiler produces smaller,
tree-shaken output than any single global bundle. The CDN builds are for demos, prototypes,
CodePen/JSFiddle, and dropping reactivity into an existing page.
