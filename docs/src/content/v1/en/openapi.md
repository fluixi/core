# OpenAPI

The [route contracts](/v1/en/api-contracts) already say what each route accepts, returns and
requires, so the API description is generated from them and cannot drift from what the server
does. Postman, Insomnia, Bruno and code generators import it.

```ts
// src/api/openapi.json.ts
import { apiRoutes } from '@fluixi/start/api-routes';
import { openApiRoute } from '@fluixi/api';

export const GET = openApiRoute(() => apiRoutes, {
  title: 'Acme API',
  version: '1.0.0',
  servers: [{ url: 'https://api.acme.com' }],
});
```

`GET /api/openapi.json` now serves an OpenAPI 3.1 document. `apiRoutes` is the app's route
table, with path templates (`[id].ts` becomes `{id}`, a catch-all becomes its parameter), and is
read per request, since this route is in it too. The route serving the document leaves itself
out.

## What each operation says

| From the contract | In the document |
| --- | --- |
| `params`, `query`, `body`, `response` | parameters, request body and response schema |
| `status` | the success response's code |
| `guard` | `security`, the scheme under its name, and the 401 and 403 responses it can give |
| a route without a guard | `security: []`, so a tool does not send credentials it does not need |
| input schemas | a 400 response, with the error shape |
| `summary`, `description`, `tags`, `operationId`, `deprecated` | as given |

Without them, the tag is the first meaningful path segment (`/api/v1/projects/{id}` is in
`projects`), the summary is the method and path, and the operation id is built from both
(`getProjectsById`).

A plain handler, one not made with `route()`, still appears, marked `x-fluixi-contract: false`,
so the gap is visible rather than silent.

## Schemas

JSON Schema comes from the validator itself, through the Standard JSON Schema interface, which
Zod 4 implements. For a validator that does not, give a converter once:

```ts
import { setJsonSchemaConverter } from '@fluixi/api';
import { toJsonSchema } from '@valibot/to-json-schema';

setJsonSchemaConverter((schema) => toJsonSchema(schema as never));
```

A schema nothing can convert is described as any value and marked `x-fluixi-unconverted` with the
validator's name, so the document still builds and the gap shows.

## Routes a library handles

An auth engine or a webhook receiver often serves many paths from one catch-all route, and
describes them in its own OpenAPI document. `describedBy` puts that document in place of the
route:

```ts
// src/api/auth/[...all].ts
import { describedBy } from '@fluixi/api';

export const GET = describedBy(
  () => auth.api.generateOpenAPISchema(),
  (request: Request) => auth.handler(request),
);
export const POST = GET;
```

The library's paths appear under the route's path (`/api/auth/sign-in/email` and the rest), with
its tags and components. Where a component or a security scheme has the same name as one of
yours but a different shape, the library's is renamed after the mount (`AuthUser`), and so is a
clashing operation id (`authGetOrganization`); references follow. OpenAPI 3.0's `nullable` is
written the 3.1 way, and an operation without a summary gets one, since tools name requests after
it.

`includeDocument(target, source, mount)` does the same for a document you build yourself.

## Importing into Postman and friends

Point the tool at `/api/openapi.json`. Each operation becomes a request, grouped by tag, with its
parameters and an example body. For an API that signs in with a session cookie, call the sign-in
route once and let the tool's cookie jar carry the cookie: some importers turn a cookie scheme
into a request header, which then needs removing from the requests.
