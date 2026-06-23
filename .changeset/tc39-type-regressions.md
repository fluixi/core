---
"@fluixi/reactive": patch
---

Fix two type regressions introduced by the TC39-core switch (runtime was always fine):

- **`createResource` lost its return type.** The compat `createResource` had only the
  permissive `(source: unknown, fetcherFn?: unknown)` implementation signature, so every
  call site inferred `ResourceReturn<{}>` and the accessor came back as `{}`. Restored the
  two typed overloads (`createResource<T>(fetcher)` and `createResource<T, S>(source, fetcher)`)
  so `T` is inferred from the fetcher's return, as before.

- **`createContext().Provider` returned `unknown`.** A component whose body is
  `return Ctx.Provider(…)` (e.g. `<Router>`) was therefore typed `unknown`, which isn't a
  valid JSX element → `TS2786: 'X' cannot be used as a JSX component`. Changed the Provider
  return type to `any` (matching the legacy core), so Provider-returning components are valid
  JSX again.
