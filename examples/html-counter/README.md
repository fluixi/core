# html-counter

A Fluixi app authored with `` html`` `` templates instead of JSX.

The point: `` html`` `` runs through the **same compiler** JSX does. The
`@fluixi/vite-plugin` with `format: 'html'` stitches the template, scans it, and
builds the shared host-agnostic IR: then the imperative backend emits the exact
same `@fluixi/dom` runtime calls (`createNativeElement` / `spread` / `insert` /
`createComponent`). There is **no template runtime** in the output; the template
is compiled away. `html` (from `@fluixi/core`) is a compile-time marker: it never
runs.

```ts
import { html, For } from '@fluixi/core';

return html`
  <div class="counter">
    <button class="dec" @click=${() => setCount(count() - 1)}>-</button>
    <span class="value ${tone()}">${count()}</span>
    <Show when=${count() < 0}><p class="warn">below zero</p></Show>
    <ul><For each=${items()}>${(x) => html`<li>${x}</li>`}</For></ul>
  </div>
`;
```

## What it covers

- **`src/App.ts`**: the counter, with delegated `@click`, reactive text, a mixed
  `class="value ${tone()}"` value, `<Show>`, and a keyed `<For>` of nested
  `` html`` `` templates.
- **`src/Ssr.ts`**: an SSR-capable app with async `createResource` + `<Suspense>`.
  Renders on the server and hydrates on the client.

The same features work as in JSX because the compiled output is identical.
Control flow (`Show`/`For`/...) is auto-imported by the compiler; higher-level
pieces (`Suspense`, `Router`, `createResource`) you import from `@fluixi/core`.

## Run

```bash
pnpm --filter @fluixi/example-html-counter dev     # client-only, in a browser
pnpm --filter @fluixi/example-html-counter serve   # real SSR + hydration server (http://localhost:5176)
pnpm --filter @fluixi/example-html-counter test    # jsdom proofs: DOM, SSR, Suspense, routing
pnpm --filter @fluixi/example-html-counter build   # production build
```

`serve` runs `server.mjs`: Vite compiles the `` html`` `` templates on the fly,
`@fluixi/server` renders `SsrApp` to HTML per request (awaiting resources +
resolving `<Suspense>`), and `src/entry-client.ts` hydrates it in the browser.

Compare `src/App.ts` here with `../counter/src/App.tsx`: different syntax, same
runtime output.
