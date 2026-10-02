# @fluixi/storage

One typed key/value API over any backend: memory, localStorage, sessionStorage, cookies, a
request, or your own. No dependency on the rest of Fluixi.

```ts
import { createStorage } from '@fluixi/storage';
import { localStorageAdapter } from '@fluixi/storage/browser';

const prefs = createStorage<{ theme: 'light' | 'dark' }>({ adapter: localStorageAdapter(), namespace: 'app' });

prefs.set('theme', 'dark', { ttl: 30 * 24 * 3600_000 });
prefs.get('theme'); // 'dark' | null
```

- **Adapters**: `memoryStorage` (`.`), `localStorageAdapter`, `sessionStorageAdapter` and
  `documentCookieAdapter` (`./browser`), `cookieStorage` and `requestStorage` (`./server`), or
  your own.
- **Values**: namespaces, expiry, versions and migrations, a strict JSON serializer that refuses
  what JSON would silently change.
- **Management**: `search`, `entries`, `prune`, `usage`, `update`, `getOrSet`, `snapshot`,
  `restore`, `copyStorage`.
- **Changes**: `subscribe`, across every storage over the same adapter and across tabs.
- **Encryption**: per item and opt in, AES-256-GCM through Web Crypto, with a key provider.
- **Errors**: one `StorageError` family with stable codes.

In a Fluixi app, `useStorage`, `persisted` and the theme helpers in `@fluixi/core` build on it.

Documentation: [Storage](https://docs.fluixi.com/v1/en/storage) and
[Storage in an app](https://docs.fluixi.com/v1/en/app-storage).
