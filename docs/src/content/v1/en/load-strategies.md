# Loading strategies

`resolve` says **where** a component comes from. `load:` says **when** its code should be
fetched.

They are separate because they vary independently. Where `<RevenueChart>` lives is the
same everywhere and belongs in config; whether *this particular usage* should wait for the
viewport is a property of the usage.

```tsx
<Summary total={total()} />                    {/* eager, entry chunk */}
<ExportDialog load:interaction />              {/* own chunk, on the first interaction with the page */}
<AuditLog load:media="(min-width: 1024px)" />  {/* own chunk, desktop only */}
<RevenueChart load:visible="200px" />          {/* own chunk, just before it scrolls in */}
```

No import, no `lazy()`, no wrapper component. The compiler emits the dynamic import and
the deferred binding.

## The strategies

| Directive | When the module is fetched |
| --- | --- |
| `load:eager` | Immediately, in the parent chunk. The default. |
| `load:idle` | When the browser goes idle. |
| `load:visible` | When the element approaches the viewport. |
| `load:interaction` | On the first interaction anywhere on the page. |
| `load:media` | When a media query matches. |
| `load:never` | Never, no client code at all. |

The server renders a deferred component in full either way. Until its code arrives, the page
keeps what the server sent in its place: it shows, but does not respond yet. Once the code loads
the component renders and takes over. A `load:media` component whose query never matches keeps
the server's content for good. In a page reached by client navigation there is no server
content, so the slot stays empty until the code loads; for `load:never`, which has no code in
the browser build, it stays empty.

### `load:visible`

Takes an optional margin, passed through as the observer's `rootMargin`:

```tsx
<RevenueChart load:visible />          {/* on intersection */}
<RevenueChart load:visible="200px" />  {/* 200px early */}
```

Prefer the margin. Starting the fetch exactly on intersection means the user watches a
blank space while the network works.

### `load:interaction`

Fetches on the first interaction anywhere on the page, not only with the component: the
component often has no markup yet to listen on. Defaults to `pointerdown`, `focusin` and
`keydown`, the three that reliably precede a real interaction, keyboard and pointer alike.
Name your own to narrow it:

```tsx
<ExportDialog load:interaction />
<ExportDialog load:interaction="pointerdown" />
```

### `load:media`

The query is required, since there is no sensible default:

```tsx
<AuditLog load:media="(min-width: 1024px)" />
```

### `load:never`

A statement that the component has no place in the client bundle at all, server-rendered
output only. Unlike the others this is not about timing, so it is never collapsed away
(below), and pairing it with an eager usage of the same module is reported as the
contradiction it is.

## The strategy has to be static

`load:` is read at compile time, because it decides how the module is emitted. A runtime
value cannot answer that, so a `${...}` hole is rejected rather than silently ignored.

## Deferring nothing is not free

If a module is already in the parent chunk, because something else uses it eagerly, then
deferring it elsewhere buys nothing and costs a wrapper, a promise and a re-render. The
compiler notices and demotes those references back to eager.

Collapsing happens per **module**, not per component name: `<Button>` eager and
`<ButtonGroup load:visible>` from the same package means the package is already loaded, so
deferring the second is pointless.

## Verifying it

Rendering passes either way, so an assertion has to be about the build output, which
chunk each component landed in. `examples/load-strategies` in the repository does exactly
that: it runs a real build and checks that the three deferred components are in their own
chunks and absent from the entry.
