---
"@fluixi/core": patch
"@fluixi/start": patch
---

SSR fixes:

- **`<Form>` and `<Link>` render real elements on the server.** Both returned an HTML
  *string* on the server, which the serializer escaped as text (`&lt;form&gt;…`) — breaking
  the element and the hydration cursor. They now build a real element via the runtime
  (server `ServerNode` / client DOM).
- **`@fluixi/start`**: `/* @vite-ignore */` on the runtime dynamic imports
  (config/entry-server/middleware) to silence Vite's import-analysis warnings in `dev`.
