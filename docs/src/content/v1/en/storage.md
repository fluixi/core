# Storage

`@fluixi/storage` is one typed key/value API over any backend: memory, localStorage,
sessionStorage, cookies, a request, or your own. It has no dependency on the rest of
Fluixi, so a library or a script can use it as well as an app. Inside an app, start with
[Storage in an app](/v1/en/app-storage), which picks the backend for you.

```ts
import { createStorage } from '@fluixi/storage';
import { localStorageAdapter } from '@fluixi/storage/browser';

type Prefs = { theme: 'light' | 'dark'; sidebar: boolean };

const prefs = createStorage<Prefs>({ adapter: localStorageAdapter(), namespace: 'app' });

prefs.set('theme', 'dark');
prefs.get('theme');   // 'dark' | null
prefs.has('sidebar'); // false
```

The schema types every call: `get('theme')` returns `'light' | 'dark' | null`, and
`set('theme', 'blue')` does not compile. Without a schema, name the type at the call:
`storage.get<User>('user')`.

## Backends

An adapter is where the strings live. The storage puts a small envelope around each value
(when it was written, when it expires, its version) and serializes it, so every backend
behaves the same way.

| Adapter | Import | Lives |
| --- | --- | --- |
| `memoryStorage()` | `@fluixi/storage` | in a Map, for as long as the adapter |
| `localStorageAdapter()` | `@fluixi/storage/browser` | in the browser, across visits |
| `sessionStorageAdapter()` | `@fluixi/storage/browser` | in the browser tab |
| `documentCookieAdapter(options)` | `@fluixi/storage/browser` | in the page's cookies |
| `cookieStorage(options)` | `@fluixi/storage/server` | in one request's cookies, written back as `Set-Cookie` |
| `requestStorage()` | `@fluixi/storage/server` | for the length of one request |

Without an adapter, `createStorage` uses memory. The browser adapters read their global on
first use, never on import, so a module that creates one loads fine on a server; using it
there throws `StorageUnavailableError`.

Each call to `memoryStorage()` or `requestStorage()` makes its own Map. On a server, never
keep one at module level for request data: every visitor would share it.

## Namespaces

A namespace prefixes every key, so two parts of an app never collide and `clear()` only
clears its own.

```ts
const app = createStorage({ adapter: localStorageAdapter(), namespace: 'app' });
const drafts = app.namespace('drafts'); // keys stored as app:drafts:<key>

drafts.clear(); // removes app:drafts:*, nothing else
```

`storage.keyPrefix` is what a storage puts before its keys: `app:` here, empty without a
namespace.

## Expiry

```ts
storage.set('otp', code, { ttl: 5 * 60_000 });
storage.touch('otp', 5 * 60_000); // a new expiry, five minutes from now
storage.prune();                  // removes every expired entry now; returns how many
```

Expiry is checked on every read, so it holds across reloads, and an expired value reads as
absent. The cookie adapters also give the cookie the same lifetime.

## Versions and migrations

When a stored shape changes, give the key its steps. They run on read, in order, from the
stored version up to the latest, and the result is written back.

```ts
type Store = { user: { firstName: string; lastName: string } };

const storage = createStorage<Store>({
  adapter: localStorageAdapter(),
  migrations: {
    user: {
      // version 1 stored { name: 'Ada Lovelace' }
      2: (old: any) => {
        const [firstName, lastName = ''] = old.name.split(' ');
        return { firstName, lastName };
      },
    },
  },
});
```

`set` writes the latest version, and `getEntry('user')` shows it with the rest of the
metadata: `{ value, createdAt, expiresAt?, version?, encrypted? }`.

A value written without the envelope (by older code, or by hand) reads back as it is.

## Values

The default serializer is strict JSON. `JSON.stringify` drops a function, turns `NaN` into
`null` and a `Date` into a string that reads back as a string, all without a word. This
serializer refuses them instead, and says where:

```ts
storage.set('event', { at: new Date() });
// StorageSerializationError: value.at is Date, which does not survive JSON.
```

Convert first (`at.toISOString()`), and the value reads back exactly as written. For a
format of your own, pass `serializer: createSerializer(serialize, deserialize)`.

## Finding and managing entries

```ts
storage.search({ match: 'draft:*' });                 // a glob, or a RegExp
storage.search({ prefix: 'draft:', limit: 10 });
storage.search({ where: (item) => item.value.pinned });

storage.entries(); // every live item: { key, value, entry }, in key order
storage.size();
storage.usage();   // { keys, bytes }: roughly what a browser counts against its quota

storage.update('count', (n) => (n ?? 0) + 1); // keeps the expiry
storage.getOrSet('id', () => crypto.randomUUID());
```

`snapshot()` returns every live item with its metadata as plain data, and `restore(snapshot)`
writes it back, keeping existing keys unless `{ overwrite: true }`. `copyStorage(from, to)`
does both: moving data to a new adapter, seeding a test, backing up a namespace.

## Changes

```ts
const stop = storage.subscribe('theme', (event) => {
  event.type;     // 'set' | 'remove' | 'clear' | 'expire'
  event.value;    // for 'set'
  event.external; // true when it came from another tab
});
```

Every storage over the same adapter hears a write made through any of them. localStorage
also reports writes from other tabs, marked `external`. In a component, a
[`persisted`](/v1/en/app-storage#persisted) signal does this for you.

## On the server

```ts
import { createStorage } from '@fluixi/storage';
import { cookieStorage } from '@fluixi/storage/server';

const headers = new Headers();
const prefs = createStorage<{ theme: string }>({
  adapter: cookieStorage({ request, response: headers, maxAge: 60 * 60 * 24 * 365 }),
  namespace: 'ui',
});

prefs.get('theme');        // from the request's Cookie header
prefs.set('theme', 'dark'); // adds a Set-Cookie to headers
```

`request` and `response` take a fetch `Request` and `Headers` as they are, or anything with
`getHeader(name)` and `appendHeader(name, value)`. Cookies are secure by default (HttpOnly,
Secure, SameSite=Lax, Path=/), each write is one `Set-Cookie`, and a value over `maxSize`
(4096 bytes) throws `StorageQuotaError` rather than being dropped by the browser. Without a
response the adapter is read-only.

The cookie strings come from `@fluixi/utils/cookie` (`parseCookies`, `serializeCookie`,
`deleteCookie`), which you can use directly for a cookie outside any storage.

Every cookie the request carries is visible to the adapter, so always give the storage a
namespace: `clear()` without one would delete the session cookie too.

Inside an app, `useStorage({ scope: 'cookie' })` does this wiring and sends the cookie with
the page. See [Storage in an app](/v1/en/app-storage).

## Encryption

Encryption is per item and opt in. A storage with `encryption` is asynchronous, since the
platform's crypto is, and holds encrypted and plain entries side by side.

```ts
import { createStorage, generateEncryptionKey, staticKeyProvider } from '@fluixi/storage';

const vault = createStorage<{ theme: string; token: string }>({
  adapter: localStorageAdapter(),
  encryption: { keyProvider: staticKeyProvider(generateEncryptionKey()) },
});

await vault.set('theme', 'dark');                    // plain
await vault.set('token', token, { encrypt: true });  // AES-256-GCM
await vault.get('token');                            // decrypted on its own
```

What it does:

- AES-256-GCM through Web Crypto, in the browser and on Node, with a new random IV for every
  write.
- The entry's key, timestamps and version are authenticated with it: a value copied under
  another key, or an edited expiry, fails to decrypt instead of returning data.
- Setting the same key with `{ encrypt: false }` stores it in clear again, and nothing of the
  encrypted form is left.
- `prune`, expiry and `remove` work without the key.

The key comes from a provider, never from the call:

```ts
const keyProvider = {
  async getKey({ key, namespace, operation, keyId }) {
    // return a CryptoKey, or { key, id } so later reads can find it after a rotation
  },
};
```

`generateEncryptionKey()` makes a key script cannot export, and `importEncryptionKey(raw)`
takes 32 bytes or their base64. Failures each have their own error, all extending
`StorageEncryptionError`: a missing or unusable key, failed authentication, a format or
algorithm this release cannot read, a corrupted payload. A synchronous storage over the same
adapter can list and remove encrypted entries, but reading one throws.

Encryption keeps a value private from someone without the key. It is not authentication, it
does not replace HTTPS, secure cookies or checks on the server, and a key stored next to the
data protects nothing.

## Errors

Every error extends `StorageError`, with a stable `code`, the `key` when there is one, and
the underlying `cause`.

| Error | When |
| --- | --- |
| `StorageSerializationError` | a value JSON would change or drop |
| `StorageDeserializationError` | stored text that does not parse |
| `StorageUnavailableError` | the backend does not exist here: localStorage on a server |
| `StorageQuotaError` | the backend is full, or a cookie is over its limit |
| `StorageSecurityError` | the browser blocked storage (privacy settings, sandbox) |
| `StorageAdapterError` | anything else the backend failed with |

## Your own backend

An adapter is an object with `get`, `set`, `remove`, `has`, `keys` and `clear` over strings,
plus a `name`, a `scope` and what it can do (`capabilities`). Return promises and pass it to
`createAsyncStorage` for a backend that answers later, such as a remote store.

```ts
import { createAsyncStorage, type AsyncStorageAdapter } from '@fluixi/storage';

// `kv` is any client whose calls return promises: Redis, a KV binding, a remote API.
const kvAdapter: AsyncStorageAdapter = {
  name: 'kv',
  scope: 'persistent',
  capabilities: { synchronous: false, persistent: true, reactive: false, crossContext: true, expiration: false, transactions: false },
  get: (key) => kv.get(key),
  set: (key, value) => kv.set(key, value),
  remove: (key) => kv.del(key),
  has: async (key) => (await kv.get(key)) !== null,
  keys: () => kv.keys('*'),
  clear: async () => {
    for (const key of await kv.keys('*')) await kv.del(key);
  },
};

const storage = createAsyncStorage({ adapter: kvAdapter, namespace: 'app' });
await storage.set('count', 1);
```

`createStorage` without `encryption` returns the synchronous storage; `createSyncStorage`
says so by name, for code that depends on reads returning at once.
