---
"@fluixi/reactive": minor
"@fluixi/dom": minor
---

The new `cachedResource` handle supports `refetch`, `invalidate`, and `mutate`, accepts a `cache` option, and carries server values to the browser. Remove any use of `createCachedResource`, `clearCachedResourceNamespace`, or `clearAllCachedResources` and use `cachedResource` and `clearCachedResources(name?)` instead.
