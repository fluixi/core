---
"@fluixi/storage": minor
---

The library now provides a new `createStorage` API, typed by a schema and supporting pluggable adapters, namespaces, expiry, versioned entries, migrations, prefix/glob/predicate search, management helpers (prune, usage, update, getOrSet, touch, snapshot, restore, copyStorage), a strict JSON serializer, and a memory adapter for safe imports in both browser and server environments.
