# @fluixi/api

API route contracts for Fluixi: declare what a route accepts, returns and requires, and get
validation, a consistent error model, an OpenAPI document and a typed client from the same
declaration.

```ts
// src/api/v1/projects/index.ts
import { route } from '@fluixi/api';
import { z } from 'zod';

export const POST = route({
  body: z.object({ name: z.string().min(1) }),
  response: Project,
  status: 201,
  handler: ({ body }) => createProject(body.name),
});
```

- **Input**: `params`, `query` and `body`, with any Standard Schema validator (Zod, Valibot,
  ArkType). Every problem is reported at once, as a 400 `validation_failed`.
- **Output**: the `response` schema is applied on the way out, so fields it does not name never
  reach the caller.
- **Errors**: one shape, `{ error: { code, message, details? } }`. `ApiError` and `notFound`,
  `conflict` and the others for refusals; anything unexpected is a 500 with a generic message.
- **Guards**: `route({ guard })` runs before the input is read and types `auth` in the handler.
  `signedIn()` and `member()` come from `@fluixi/auth/server`.
- **Revalidation**: `route({ revalidates: ['orgs'] })` names the cached data a success changes;
  the client refreshes the pages showing it.
- **OpenAPI**: `openApiRoute(() => apiRoutes, info)` serves a 3.1 document generated from the
  contracts; `describedBy` includes a library's own document.
- **Typed client**: `createClient<ApiRoutes>()` from `@fluixi/api/client` knows each route's
  params, query, body and response.
- **Protection**: `apiSecurity({ origins, rateLimits })` for headers, CORS, the cross-site check
  and rate limits.

Documentation: [API contracts](https://docs.fluixi.com/v1/en/api-contracts) and
[OpenAPI](https://docs.fluixi.com/v1/en/openapi).
