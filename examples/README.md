# Examples

Runnable apps that prove the Fluixi stack works end-to-end in a real DOM:
JSX → `@fluixi/vite-plugin` → `@fluixi/compiler` → `@fluixi/jsx` →
`@fluixi/dom` runtime → the DOM.

Each example has a Vitest spec (jsdom) that renders the app and asserts on the
produced DOM + reactivity, so they double as integration tests.

| example   | shows |
| ------------- | ----- |
| `counter`     | signals, a native element, delegated events, fine-grained text updates |
| `todo`        | `For` (keyed list), `Show` (empty state), input binding, remove handlers |
| `lit-counter` | the same counter authored with lit `` html`` `` templates, compiled through the shared IR (`fluixi({ format: 'lit' })`) — no lit-html runtime |
| `load-strategies` | component resolution with no imports, plus `load:` deciding when each component's chunk is fetched — the test asserts on the real build output |

```bash
pnpm --filter @fluixi/example-counter dev      # run in a browser
pnpm --filter @fluixi/example-counter test     # the real-DOM proof (jsdom)
pnpm --filter @fluixi/example-counter build     # production build
```

## Note on reactivity

Native element attributes and text are auto-wrapped reactively by the compiler,
so `class={cls()}` / `{count()}` just work. **Component props are not
auto-wrapped**, so control-flow components take reactive accessors explicitly:

```tsx
<Show when={() => items().length > 0}>…</Show>
<For each={items}>{(item) => <li>{item.name}</li>}</For>
```
