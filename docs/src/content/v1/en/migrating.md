# Upgrading between alphas

During the alpha, an API that is replaced is removed rather than kept beside its successor. This
page lists what went, and what to write instead. The changesets of each release say the same,
package by package.

## Storage

| Removed | Use instead |
| --- | --- |
| `storage` from `@fluixi/core` | `useStorage()` from `@fluixi/core/storage`, or `@fluixi/storage` outside an app |
| `createMemoryStorage` from `@fluixi/core` | `memoryStorage()` from `@fluixi/storage` |

The old `storage` was one `localStorage`-shaped object, and on the server one Map shared by every
request. `useStorage` picks the backend for where the code runs and keeps server values per
request. See [Storage in an app](/v1/en/app-storage).

Values written by `@fluixi/session` and by `createTheme` before this change are not read: both
now store through `@fluixi/storage`, the theme in a cookie. A visitor signs in once more and picks
their theme again.

## Cached data

| Removed | Use instead |
| --- | --- |
| `createCachedResource(...)`, returning `[data, actions]` | `cachedResource(...)`, one handle with `refetch`, `invalidate` and `mutate` on it |
| `clearCachedResourceNamespace(name)` | `clearCachedResources(name)` |
| `clearAllCachedResources()` | `clearCachedResources()` |

```ts
// before
const [orgs, { invalidate }] = createCachedResource(fetchOrgs, { name: 'orgs' });
// after
const orgs = cachedResource(fetchOrgs, { name: 'orgs' });
orgs.invalidate();
```

Entries now live per request on the server and per page in the browser; nothing is shared
between visitors. The router's `cache()` behaves the same way, and `revalidate` also reloads the
routes on screen. See [Caching data](/v1/en/caching).

## Theming

`createTheme` keeps the choice in a cookie by default and sends its before-paint script with the
page during a render: remove a hand-written theme script from `index.html`. Pass `script: false`
to keep your own, and `storage` to keep the choice elsewhere.

In fluixi-ui, `ColorSchemeProvider` is now core's: its options are `ColorSchemeOptions`
(`storageKey`, `attribute`, `storage`, `systemAs`, `themeColor`), and `schemes`, `default` and
`system` are gone. For a scheme with more values than light and dark, use `createTheme` with
`ThemeProvider`. See [Theming](/v1/en/theming).

## Server internals

`streamDocument` from `@fluixi/start` returns a promise of the `Response` instead of the
`Response`: it waits for the page's head before answering, so headers set while the shell renders
still reach the response. Only a custom server entry that called it directly needs an `await`.
