# API routes

Drop a file in `src/api/` and export HTTP-method handlers — they're served under `/api/*`.

```ts
// src/api/hello.ts  →  /api/hello
export function GET() {
  return Response.json({ message: 'hello' });
}

export function POST(request: Request) {
  return Response.json({ method: 'POST' });
}
```

A handler returns a Web `Response` (or any value, which is sent as JSON).

## Params & catch-all

The file path is the route, with the same conventions as pages:

```ts
// src/api/users/[id].ts  →  /api/users/:id
export function GET(_req: Request, { params }: { params: { id: string } }) {
  return Response.json({ id: params.id });
}
// src/api/files/[...path].ts  →  catch-all
```

A wrong method returns `405`; an unknown `/api/*` path returns `404`.

Next: **[Middleware](/v1/en/middleware)**.
