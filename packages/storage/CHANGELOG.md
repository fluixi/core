# @fluixi/storage

## 0.1.0-alpha.2

### Patch Changes

- @fluixi/utils@1.0.0-alpha.95

## 0.1.0-alpha.1

### Patch Changes

- @fluixi/utils@1.0.0-alpha.94

## 0.1.0-alpha.0

### Minor Changes

- d3701e1: The new `documentCookieAdapter` from `@fluixi/storage/browser` uses the same encoding as `cookieStorage`, so server and browser read one value, and `storage.keyPrefix` now exposes the namespace prefix.
- bfa68aa: `localStorageAdapter` and `sessionStorageAdapter` now provide a unified browser storage API that is safe to import on the server and includes detailed quota and security error messages and cross-tab change notifications via subscribe.
- 420dd32: The library now provides a new `createStorage` API, typed by a schema and supporting pluggable adapters, namespaces, expiry, versioned entries, migrations, prefix/glob/predicate search, management helpers (prune, usage, update, getOrSet, touch, snapshot, restore, copyStorage), a strict JSON serializer, and a memory adapter for safe imports in both browser and server environments.
- 1d16e9b: `createStorage({ encryption: { keyProvider } })` now returns an async storage where `set(key, value, { encrypt: true })` stores the item encrypted with AES-256-GCM and `get` automatically decrypts it, while unencrypted items remain unchanged.
- b399027: A ttl set through the storage now also sets the cookie's Expires on `cookieStorage` and `documentCookieAdapter`; `copyStorage` now accepts async and encrypted storages and returns a promise for them.
- 4778ba4: `cookieStorage` and `requestStorage` from `@fluixi/storage/server` now provide typed storage backed by request cookies, sending writes as `Set-Cookie` with secure defaults, enforcing a size limit, and isolating values per request.

### Patch Changes

- ecde4a3: Subscribers now hear writes made through any storage over the same adapter, with the cross-tab listener added once per adapter while something listens and removed after.
- f70df46: createSyncStorage is now exported as the synchronous storage by name, with JSDoc examples for the createStorage overloads, createSyncStorage, and createAsyncStorage.
- Updated dependencies [5dcdf9f]
  - @fluixi/utils@1.0.0-alpha.93
