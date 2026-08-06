# `load:` strategies

Every component in `src/App.tsx` is used **without an import**, and each one states
*when* its code should be fetched.

```tsx
<Summary total={total()} />                    {/* eager — entry chunk */}
<ExportDialog load:interaction />              {/* own chunk, on first interaction */}
<AuditLog load:media="(min-width: 1024px)" />  {/* own chunk, desktop only */}
<RevenueChart load:visible="200px" />          {/* own chunk, on approach */}
```

Two separate decisions, deliberately kept apart:

- **Where** a tag comes from is the same everywhere, so it lives in `vite.config.ts`
  under `resolve`. Moving a component is one config line.
- **When** its module loads varies per usage, so it is written at the usage site in one
  token.

Fusing them — `<Chart lazy="./Chart" />` — would repeat the path at every usage and
still say nothing about timing.

## The proof

`pnpm --filter @fluixi/example-load-strategies build`

```
dist/assets/ExportDialog-*.js    0.33 kB
dist/assets/AuditLog-*.js        0.34 kB
dist/assets/RevenueChart-*.js    0.55 kB
dist/assets/index-*.js          99.54 kB   ← only Summary is here
```

Three deferred components, three chunks, none of them in the entry. `src/App.tsx`
contains no import for any of them.

`pnpm --filter @fluixi/example-load-strategies test` asserts exactly that — it runs the
real build and checks which chunk each component landed in. Rendering would pass either
way, so the assertion has to be about the output.

## Strategies

| directive | fetches when |
| --- | --- |
| `load:eager` | in the parent chunk (the default; an explicit opt-out) |
| `load:idle` | `requestIdleCallback` |
| `load:visible="200px"` | it intersects the viewport, with an optional root margin |
| `load:interaction` | first pointer / focus / key event — or the events you name |
| `load:media="(…)"` | the media query matches |
| `load:never` | server only, no client code |

## Collapsing

If a module is referenced eagerly anywhere in the same file, deferred references to it
collapse to eager. It is already in the chunk, so a lazy boundary would add a wrapper, a
promise and a re-render in order to fetch nothing.

```tsx
<Button />
<Button load:visible />   {/* collapses — one static import, no deferred() */}
```

## Running it

```bash
pnpm --filter @fluixi/example-load-strategies dev     # scroll to trigger load:visible
pnpm --filter @fluixi/example-load-strategies build   # see the chunk split
pnpm --filter @fluixi/example-load-strategies test    # assert the chunk split
```

Open devtools' network panel in `dev` and scroll: `RevenueChart` is requested only as it
approaches the viewport.
