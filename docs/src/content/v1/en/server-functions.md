# Server functions

Mark a function `"use server"` and its body runs **only on the server**. The compiler
strips it from the client bundle and replaces the call with a typed RPC, so secrets and
database access never reach the browser.

```ts
async function getUser(id: string) {
  "use server";
  return db.users.find(id); // runs on the server
}

// Call it anywhere like a normal async function:
const user = await getUser("42"); // POSTs to /_server under the hood
```

The call site does not change shape: it is an ordinary `await` returning ordinary data.
What changes is where the body runs.

## What the compiler does

The directive is the whole API. At build time the function body is removed from the client
bundle and replaced with a stub that posts its arguments to the server, where the real body
runs and the result comes back.

Two things follow from that, and they are the source of most surprises:

- **Arguments and return values cross the wire**, so they must be serialisable. Passing a
  class instance, a function, a DOM node or a signal will not work, send plain data.
- **The body is gone from the client**, so anything it closes over is gone too. Imports
  used only inside server functions are dropped from the browser bundle, which is exactly
  why a database client can be imported at the top of a route file.

Always `await` a server function. Since it becomes a network call, the result is a promise
even where the original body was synchronous.

## Request context

Inside a server function you can reach the current request, headers, cookies, the URL:

```ts
import { getRequestEvent } from '@fluixi/server';

async function whoAmI() {
  "use server";
  const event = getRequestEvent();
  return event?.request.headers.get('authorization');
}
```

`getRequestEvent()` returns `undefined` when there is no request in scope, which is why the
optional chaining above is not decoration, the same module may be imported during a
build-time prerender.

Because the context is bound to the request, read it **before** the first `await` in
complex flows, and pass what you need down rather than reaching for it again later.

## Errors

An exception thrown on the server rejects the call with a `ServerFunctionError` (from
`@fluixi/start`), carrying `status`, `code` and `details`. What reaches it depends on what was
thrown:

- **A refusal**, an error with a 4xx `status`, arrives with that status and the error's own
  `code` and `details`. This is the way to tell the client something it can act on:

  ```ts
  throw Object.assign(new Error('quota reached'), { status: 403, code: 'quota', details: { limit: 10 } });
  // at the call site: err.status === 403, err.code === 'quota', err.details.limit === 10
  ```

- **Anything else** is a 500. In development its message arrives in `code`; in production
  nothing of it does, and the error is logged on the server instead, so an internal failure
  cannot leak paths or query text to the browser.

No other property of the thrown error crosses the wire, and the stack never does.

## Form actions

`@fluixi/forms` turns a server function into a progressive-enhancement `<form action>`, so
it works before JavaScript loads. For the router's own mutation flow, pending state, retry,
see [`action` and `<ActionForm>`](/v1/en/routing).

Next: **[API routes](/v1/en/api-routes)**.
