---
"@fluixi/compiler": minor
"@fluixi/start": minor
---

Server functions — `"use server"`. A function carrying the directive runs only on the
server and is callable from the client over RPC:

```ts
const getUser = async (id) => {
  'use server';
  return db.users.find(id);
};
```

- `@fluixi/compiler`: `serverFunctionsVitePlugin` + `transformServerFunctions` apply the
  directive transform per build — the **client** gets an RPC stub (`$$createServerReference`),
  the **server** keeps the body and registers it (`$$registerServerFn`) under a stable id
  shared by both builds. Server-only code never ships to the client.
- `@fluixi/start`: `@fluixi/start/server-fn` runtime (registry + stub + dispatcher) and a
  `/_server` RPC endpoint wired into `dev` and `start` (with same-origin CSRF protection).
  The dispatcher rides on the entry-server module's exports so it shares the app's
  registry. The plugin is enabled by default in start apps.

Note: a server function must live in a module reachable from the server entry's eager
graph to be registered (lazy-route registration via a manifest is a follow-up).
