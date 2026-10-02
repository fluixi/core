# API contracts

`@fluixi/api` turns an [API route](/v1/en/api-routes) into a contract: what it accepts, what
it returns, who may call it. The contract validates the request before your code runs, shapes
the response on the way out, describes the route in an [OpenAPI document](/v1/en/openapi), and
types a client that calls it.

```ts
// src/api/v1/projects/index.ts
import { route } from '@fluixi/api';
import { z } from 'zod';

export const POST = route({
  summary: 'Create a project',
  body: z.object({ name: z.string().min(1).max(80) }),
  response: Project,
  status: 201,
  handler: ({ body }) => createProject(body.name),
});
```

`handler` receives the validated input, already typed from the schemas: `body.name` is a
string here, not `unknown`.

## Input

| Field | Validates | Reaches the handler as |
| --- | --- | --- |
| `params` | path parameters, from the file name (`[id].ts` gives `{ id }`) | `params` |
| `query` | the query string, repeated keys as arrays | `query` |
| `body` | the JSON body | `body` |

Any [Standard Schema](https://standardschema.dev) works: Zod, Valibot, ArkType. Every problem is
reported at once, not the first one only, as a 400:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "The request is not valid.",
    "details": [
      { "path": "body.name", "message": "String must contain at least 1 character(s)" },
      { "path": "query.limit", "message": "Expected number, received string" }
    ]
  }
}
```

Without a `body` schema the body is not read, and the handler may read it itself. With one, the
body must be JSON (415 `unsupported_media_type`), must parse (400 `invalid_json`), and must stay
under `bodyLimit`, 1 MiB by default (413 `payload_too_large`), checked against the declared
length and against the bytes actually read.

## Output

`response` is applied on the way out: unknown fields are dropped and transforms run. A field
you keep on the server, such as `createdBy` or a password hash, never reaches the caller as
long as the response schema does not name it.

```ts
export const GET = route({
  params: z.object({ id: z.string().uuid() }),
  response: Project,
  handler: ({ params }) => {
    const project = findProject(params.id);
    if (!project) throw notFound('No project with that id.');
    return project;
  },
});
```

`status` sets the success status: 200 by default, 204 when the handler returns nothing and the
route has no `response`. A handler may also return a `Response` of its own, which goes out as
it is.

If the handler returns something its own `response` schema rejects, that is a server fault:
the caller gets a 500, never the bad data. Turn the check off with `validateResponse: false`
only for a reason you have measured.

## Errors

Every failure has one shape, `{ error: { code, message, details? } }`, and a matching status.
The code is for programs, the message for people.

```ts
import { ApiError, badRequest, conflict, forbidden, notFound, unauthorized } from '@fluixi/api';

throw notFound('No project with that id.');                  // 404 not_found
throw conflict('That name is taken.');                        // 409 conflict
throw new ApiError(402, 'plan_limit', 'Upgrade to add more.'); // your own
```

Anything else a handler throws becomes a 500 `internal` with a generic message: nothing from
the server's internals reaches the caller. The error itself goes to `console.error`, or to
your logger or tracker with `setErrorReporter((error, request) => ...)`.

## Guards

A guard decides who may call a route. It runs before the input is read, so a caller who may
not use the route learns nothing about what it accepts, and what it returns reaches the
handler as `auth`, typed.

```ts
import { member, signedIn } from '@fluixi/auth/server';

export const GET = route({
  guard: signedIn(),
  handler: ({ auth }) => auth.user,
});

export const DELETE = route({
  guard: member({ roles: ['owner', 'admin'] }),
  params: z.object({ id: z.string() }),
  handler: ({ auth, params }) => projects.remove(auth.member.organizationId, params.id),
});
```

`signedIn()` refuses with 401 when there is no session. `member()` also needs an active
organisation the caller belongs to, and checks `roles` (any of them) and `permissions` (all of
them). Its refusals say why: 403 `no_active_organization`, 403 `not_a_member`, 403 `forbidden`.
`auth.member.organizationId` is the tenant: pass it to every query the route makes.

A guard is any object with `check(request)`, which returns what the handler gets or throws a
refusal:

```ts
const apiKey = {
  async check(request: Request) {
    const key = await keys.find(request.headers.get('x-api-key'));
    if (!key) throw unauthorized('Send a valid x-api-key.');
    return { key };
  },
  security: { name: 'apiKey', scheme: { type: 'apiKey', in: 'header', name: 'x-api-key' } },
  refuses: [401],
};
```

`security` and `refuses` are for the OpenAPI document: the scheme a caller satisfies, under a
stable name, and the refusals the route can answer with. A refusal thrown with a `code` keeps
it in the error body, so a client can tell "choose an organisation" from "not allowed".

## Telling the browser what changed

`revalidates` names the cached data a successful call makes stale. The response carries it, and
the client refreshes the pages showing it. See [Caching data](/v1/en/caching#when-the-server-knows).

```ts
export const POST = route({ guard: signedIn(), body: invite, revalidates: ['members'], handler });
```

## A typed client

`@fluixi/start` writes `src/api.gen.ts` in the API app: every path template mapped to its route
module. A client typed with it knows, per method, the params, query and body each route takes
and what it returns. Nothing from the server is bundled; the map is types only.

```ts
import { createClient } from '@fluixi/api/client';
import type { ApiRoutes } from '@acme/api/routes'; // the API package exports src/api.gen.ts

const api = createClient<ApiRoutes>();

const project = await api.get('/api/v1/projects/{id}', { params: { id } });
await api.post('/api/v1/projects', { body: { name: 'Atlas' } }); // checked against the body schema
```

A failure throws `ApiClientError`, with the `status`, the `code` and the `details` of the error
body. Options: `baseUrl` (empty, the page's own origin, by default), `headers` (a function runs
per call, for instance to forward the visitor's cookie during a server render), `credentials`,
`fetch`, and `onRevalidate`.

## Protecting the API

`apiSecurity` puts the usual protections in one middleware. Place it first, so refusals from
everything after it carry the headers too.

```ts
// src/middleware.ts
import { defineMiddleware } from '@fluixi/start';
import { apiSecurity, postgresRateLimitStore } from '@fluixi/api';

export default defineMiddleware([
  apiSecurity({
    origins: ['https://app.example.com'],
    rateLimits: [
      {
        name: 'auth',
        match: ['/api/auth/sign-in/*', '/api/auth/sign-up/*'],
        methods: ['POST'],
        limit: 10,
        window: 60,
        store: postgresRateLimitStore(sql),
      },
    ],
  }),
]);
```

It adds security headers, answers CORS for the listed origins, refuses a cookie-carrying write
from a page on another site (403 `cross_origin_refused`), and applies each rate limit in order
(429 `rate_limited`). With no options, every cross-origin call is refused and nothing is limited: list your web
app's origins, and limit the routes that guess passwords. Counts live in memory by default; a
shared store (`postgresRateLimitStore`) keeps every instance on the same count.

The pieces are also exported on their own: `securityHeaders`, `cors`, `originCheck`,
`rateLimit`.
