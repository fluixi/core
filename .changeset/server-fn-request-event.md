---
"@fluixi/start": minor
"@fluixi/compiler": patch
---

`getRequestEvent()` now works inside a `"use server"` function — access the request,
headers, and cookies:

```ts
import { getRequestEvent } from '@fluixi/server';

const whoami = async () => {
  'use server';
  const req = getRequestEvent()?.request as Request;
  return req.headers.get('user-agent');
};
```

The RPC dispatcher runs the function inside `@fluixi/server`'s request context (wired by
a server-only `@fluixi/start/server-fn-setup` bridge that `virtual:fluixi-server-fns`
imports, keeping the `@fluixi/start/server-fn` runtime client-safe). Response headers set
on the event (e.g. `Set-Cookie`) are returned with the RPC response.
