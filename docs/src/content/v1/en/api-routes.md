# API routes

Drop a file in `src/api/` and export HTTP-method handlers, they are served under
`/api/*`.

```ts
// src/api/hello.ts  →  /api/hello
export function GET() {
  return Response.json({ message: 'hello' });
}

export function POST(request: Request) {
  return Response.json({ method: 'POST' });
}
```

Export one function per method you support: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`,
`HEAD`, `OPTIONS`. The directory is configurable through `apiDir` in `fluixi.config`;
`src/api` is the default.

## Return values

A handler returns a Web `Response`, or any value, which is sent as JSON:

```ts
export function GET() {
  return { ok: true };          // → application/json
}

export function GET() {
  return Response.json({ ok: true }, { status: 201 });   // full control
}

export function GET() {
  return new Response('plain', { headers: { 'content-type': 'text/plain' } });
}
```

Return a `Response` yourself when you need a status other than 200, custom headers, a
redirect, or a non-JSON body. The plain-value form exists so the common case stays short.

## Params and catch-all

The file path is the route, with the same conventions as pages:

```ts
// src/api/users/[id].ts  →  /api/users/:id
export function GET(_req: Request, { params }: { params: { id: string } }) {
  return Response.json({ id: params.id });
}

// src/api/files/[...path].ts  →  catch-all, /api/files/**
```

Params arrive as **plain strings** on the second argument, not as accessors, an API
handler runs once per request, so there is nothing reactive about it.

Everything else about the request comes from the standard `Request`: the query string via
`new URL(request.url).searchParams`, the body via `await request.json()` or
`await request.formData()`, and headers via `request.headers`.

## Status codes you get for free

A request to a path that exists but with a method you did not export returns **405**, with
an `Allow` header listing the methods that file does export; an unknown `/api/*` path
returns **404**. You do not need to write either.

## API route or server function?

Both run only on the server, so the choice is about who calls them:

- A **server function** is for your own client code. It is typed end to end, and the call
  looks like a function call rather than a fetch.
- An **API route** is for callers you do not control, a webhook, a mobile app, a CLI,
  anything that needs a stable URL, a specific status code, or a non-JSON body.

If you are reaching for `fetch('/api/...')` inside your own app, a
[server function](/v1/en/server-functions) is usually the shorter path.

Next: **[Middleware](/v1/en/middleware)**.
