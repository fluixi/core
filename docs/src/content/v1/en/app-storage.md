# Storage in an app

`@fluixi/core/storage` binds [`@fluixi/storage`](/v1/en/storage) to the app: it picks the
backend for where the code runs, keeps server state per request, and reads the same value
in the server render and in the browser.

```tsx
const prefs = $storage({ scope: 'cookie', namespace: 'ui' });
const theme = $persisted(prefs, 'theme', { fallback: 'light' });

<button onClick={() => theme.set((t) => (t === 'light' ? 'dark' : 'light'))}>
  {() => theme()}
</button>
```

The server renders the theme the visitor chose, from their cookie, and the browser starts
from the same value: no flash, no hydration mismatch. In package code the same calls are
`useStorage` and `persisted`, imported from `@fluixi/core/storage`.

## Scopes

`useStorage(options)` takes the options of `createStorage` (namespace, migrations, a
serializer) and a `scope`:

| Scope | Server | Browser |
| --- | --- | --- |
| `auto` (default) | the request's own storage | localStorage |
| `cookie` | the request's cookies, written back as `Set-Cookie` | `document.cookie` |
| `request` | values for this request only | values for this page |
| `local`, `session` | throws: there is no such storage | localStorage, sessionStorage |

Use `cookie` for anything the server render has to agree with: a theme, a language, a
dismissed banner. Use `local` for what only the browser cares about. `auto` takes a storage
from a `<StorageProvider>` first, when there is one.

On the server, state never lives in a module. Each request gets its own adapters, so two
visitors rendering at once never see each other's values. Called on the server outside any
request (at module level, in a script), `useStorage` throws instead of quietly sharing one
store between everyone.

## Cookies

```ts
const prefs = useStorage({
  scope: 'cookie',
  namespace: 'ui',
  cookie: { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' },
});
```

`httpOnly` defaults to false here, since the browser half has to read the cookie. Set it to
true for a value only the server reads. The other attributes keep their secure defaults:
Secure, SameSite=Lax, Path=/.

A cookie set during the render reaches the response, streamed pages included, until the
body's first chunk has gone out. After that the headers are sent and the write throws,
saying so. Values decided late belong in middleware, a route's data or a server function.

## persisted

`persisted(storage, key, options)` is a signal whose value lives in a storage key. It starts
with the stored value, writes through on `set`, and follows changes made by any other
storage over the same adapter, and by other tabs where the backend reports them.

```ts
const sidebar = persisted(useStorage({ namespace: 'ui' }), 'sidebar', { fallback: true });

sidebar();                // true until changed
sidebar.set((open) => !open);
sidebar.remove();         // back to the fallback
```

Options: `fallback` (the value while the key is absent; `null` without it), `ttl` for every
write, `name` for devtools. A write the storage refuses throws and leaves the signal as it
was.

Over an asynchronous or encrypted storage, `persisted` holds the fallback until it has read
the stored value (`await signal.ready`), sets the signal at once on `set`, and goes back if
the write fails. That read cannot finish during the server render, so keep such values out
of what the server renders.

Do not mirror a signal into storage with an effect; `persisted` is the one place both live.

## Asynchronous and encrypted storage

`useAsyncStorage` has the same scopes, every operation awaited, and takes `encryption`:

```ts
const vault = useAsyncStorage<{ token: string }>({
  namespace: 'auth',
  encryption: { keyProvider },
});
await vault.set('token', token, { encrypt: true });
```

See [Encryption](/v1/en/storage#encryption) for what it protects and what it does not.

## Providing a storage

```tsx
<StorageProvider storage={createStorage({ adapter: memoryStorage() })}>
  <Settings />
</StorageProvider>
```

Every `useStorage()` below with the `auto` scope gets that storage: a test's memory
storage, an app-specific one. An asynchronous storage goes to `useAsyncStorage()` the same
way.

## Carrying values to the browser

A request-scoped value computed on the server is gone by the time the browser runs.
`hydrateStorage` sends chosen keys with the page:

```ts
const scratch = useStorage<{ draft: Draft }>({ scope: 'request', namespace: 'editor' });
hydrateStorage(scratch, ['draft']);
```

Call it with the same keys on both sides. On the server it puts the values, with their
expiry and version, in the page data; in the browser the first call writes them into the
storage, and later calls leave the browser's own value alone. Page data is readable by
anyone who sees the page: never hydrate a secret. An encrypted value throws here rather than
travel in clear.

## The theme

`createTheme` keeps the visitor's choice in a cookie by default, so the server renders it:

```ts
const theme = createTheme({ themes: ['light', 'dark'], default: 'light', system: true });
theme.set('dark'); // the cookie, the signal, and <html data-theme="dark">
```

During a render it sends the attribute with the page, `<html data-theme="dark">`, through
the head. Create it during the render, in a component or provider at the app root, never at
module scope: on the server only the render has the request and its cookie, so a theme
created at import always renders the default.

`storage` changes where the choice is kept (`null` keeps it in memory). `headScript()`
returns a small inline script for one case the server cannot know: the operating system's
preference, for a visitor who has not chosen yet.

fluixi-ui's `ColorSchemeProvider`, `SkinProvider` and `createThemeAxis` are built on it and
take the same `storage` option.

## Intrinsics

In an app built by `@fluixi/start`, these need no import:

| Intrinsic | Stands for |
| --- | --- |
| `$storage(options)` | `useStorage` |
| `$asyncStorage(options)` | `useAsyncStorage` |
| `$persisted(storage, key, options)` | `persisted`, read like a signal |
