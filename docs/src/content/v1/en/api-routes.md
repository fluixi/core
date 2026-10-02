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

## Contracts

For anything past a quick endpoint, declare the route with `route()` from `@fluixi/api`: input
validated before your code runs, the response shaped on the way out, guards for who may call
it, an [OpenAPI document](/v1/en/openapi) and a typed client for free. See
[API contracts](/v1/en/api-contracts).

```ts
export const GET = route({
  params: z.object({ id: z.string().uuid() }),
  response: Project,
  handler: ({ params }) => findProject(params.id),
});
```

## Inside the request

An API route runs inside the request context, like a page render: `requireUser()`,
`getLocals()` and what your middleware put there work in a handler, and so do
`appendResponseHeader` and cookie storage.

## The route table

`@fluixi/start/api-routes` exports `apiRoutes`, every route of the app with its path template
(`src/api/v1/projects/[id].ts` is `/api/v1/projects/{id}`, a catch-all becomes its parameter)
and its module. The OpenAPI route and the typed client are built from it.

## An API-only app

An API without pages sets `apiOnly: true` in `fluixi.config.ts`. There is no `index.html` and no
render: a path outside the API answers a JSON 404 in the same shape as the API's errors, and
`fluixi build` and `fluixi start` produce and run the server alone.

A web app next to it forwards `/api` there, so the browser talks to one origin and the API's
cookies stay first-party:

```ts
// the web app's src/middleware.ts
import { defineMiddleware, forward } from '@fluixi/start';

export default defineMiddleware([forward({ to: process.env.API_URL! })]);
```

The caller's address goes on as `x-forwarded-for`, replacing whatever the client sent.
WebSocket upgrades are not forwarded.

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
