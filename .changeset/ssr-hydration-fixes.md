---
"@fluixi/core": patch
"@fluixi/start": patch
---

SSR/hydration fixes:

- **`startClient` now actually hydrates SSR apps.** It only hydrated when a
  `__FLUIXI_HYDRATION__` marker was present, which `@fluixi/server`/`@fluixi/start` never
  emit — so every `@fluixi/start` app silently fell back to a fresh client render (server
  DOM discarded, resources never seeded from `__FX_DATA__`). It now hydrates when the
  mount container already holds server-rendered markup.
- **`<Form>` and `<Link>` render real elements on the server.** Both returned an HTML
  *string* on the server, which the serializer escaped as text (`&lt;form&gt;…`) — breaking
  the element and the hydration cursor. They now build a real element via the runtime
  (server `ServerNode` / client DOM), so SSR markup is correct and hydration reuses it.
- **`@fluixi/start`**: `/* @vite-ignore */` on the runtime dynamic imports
  (config/entry-server/middleware) to silence Vite's import-analysis warnings in `dev`.
