# lit-counter

The counter, authored with lit-html `` html`` `` templates instead of JSX.

The point: `` html`` `` runs through the **same compiler** JSX does. The
`@fluixi/vite-plugin` with `format: 'lit'` stitches the template, scans it, and
builds the shared host-agnostic IR — then the imperative backend emits the exact
same `@fluixi/dom` runtime calls (`createNativeElement` / `spread` / `insert` /
`createComponent`). There is **no lit-html runtime** in the output; the template
is compiled away.

```ts
import { html } from './html';

return html`
  <div class="counter">
    <button class="dec" @click=${() => setCount(count() - 1)}>-</button>
    <span class="value ${tone()}">${count()}</span>
    <Show when=${count() < 0}>
      <p class="warn">below zero</p>
    </Show>
  </div>
`;
```

What it exercises:

- `@click=${fn}` — delegated events (the plugin injects `delegateEvents([...])`)
- `${count()}` — fine-grained reactive text
- `class="value ${tone()}"` — a mixed static + reactive attribute value
- `<Show when=${…}>` — a control-flow component, auto-imported by the compiler

The `html` tag (`src/html.ts`) is a typed stub; it only exists for the editor and
as a guard — every call is replaced at compile time.

```bash
pnpm --filter @fluixi/example-lit-counter dev     # run in a browser
pnpm --filter @fluixi/example-lit-counter test    # real-DOM proof (jsdom)
pnpm --filter @fluixi/example-lit-counter build   # production build
```

Compare `src/App.ts` here with `../counter/src/App.tsx` — different syntax, same
runtime output.
