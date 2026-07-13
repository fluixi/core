# CDN & bundles

Every Fluixi runtime package ships a self-contained **IIFE global build** you can drop into a
page with a single `<script>` — no bundler, no build step, no npm install. They're published on
every release and served from [unpkg](https://unpkg.com) and [jsDelivr](https://www.jsdelivr.com).

## Bundle sizes

Each global is fully self-contained (its dependencies are bundled in), so you load exactly one
file. Sizes are minified; `gzip` is what ships over the wire.

| Script | Global | What's in it | Size |
| --- | --- | --- | --- |
| `@fluixi/reactive/dist/cdn/signal.global.js` | `window.Signal` | The raw TC39-Signals core (`State`, `Computed`, `subtle`) | 3.4 KB <small>(1.3 KB gz)</small> |
| `@fluixi/reactive/dist/cdn/reactive.global.js` | `window.Fluixi` | Full reactive API (signals, memos, effects, stores, resources) | 29.6 KB <small>(8.7 KB gz)</small> |
| `@fluixi/dom/dist/cdn/dom.global.js` | `window.FluixiDOM` | DOM runtime (render, control flow) **+** the reactive API | 52.5 KB <small>(17.0 KB gz)</small> |
| `@fluixi/core/dist/cdn/core.global.js` | `window.Fluixi` | The whole framework (reactivity + components + control flow + router + `startClient`) | 75.3 KB <small>(24.8 KB gz)</small> |

Pick the smallest one that covers what you need: just reactivity → `signal` or `reactive`; a
reactive UI → `dom`; the full app framework → `core`.

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
  const { render, html, createSignal } = FluixiDOM;

  function Counter() {
    const [n, setN] = createSignal(0);
    return html`<button @click=${() => setN(n() + 1)}>count: ${n()}</button>`;
  }

  render(() => html`<${Counter} />`, document.getElementById('app'));
</script>
```

Because there's no compiler in a plain-`<script>` page, author markup with the `` html`` `` tag
(runtime templates) rather than JSX.

## The whole framework — `window.Fluixi`

`core.global.js` bundles everything — reactivity, components, control flow, the router, and
`startClient`. Use it when you want the full framework without a build:

```html
<div id="app"></div>
<script src="https://unpkg.com/@fluixi/core/dist/cdn/core.global.js"></script>
<script>
  const { render, html, createSignal, Show } = Fluixi;

  function App() {
    const [on, setOn] = createSignal(false);
    return html`
      <button @click=${() => setOn(!on())}>toggle</button>
      <${Show} when=${on}><p>visible</p></${Show}>
    `;
  }

  render(() => html`<${App} />`, document.getElementById('app'));
</script>
```

> `reactive.global.js` and `core.global.js` both expose `window.Fluixi` — load **one** of them,
> not both. `signal.global.js` uses `window.Signal` and can sit alongside either.

## Version pinning

`unpkg.com/@fluixi/core@1/…` follows the major; pin an exact version for reproducibility, e.g.
`unpkg.com/@fluixi/core@1.0.0-alpha.56/dist/cdn/core.global.js`. jsDelivr works the same:
`cdn.jsdelivr.net/npm/@fluixi/core/dist/cdn/core.global.js`.

For real apps, prefer the compiled path (`npm create fluixi`) — the compiler produces smaller,
tree-shaken output than any single global bundle. The CDN builds are for demos, prototypes,
CodePen/JSFiddle, and dropping reactivity into an existing page.
