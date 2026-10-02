# API-only example

An API service on `@fluixi/start` with `@fluixi/api` contracts: no pages, only `src/api`.

```sh
pnpm install
pnpm dev     # http://localhost:3400
```

| Route | What it shows |
| --- | --- |
| `GET /api/v1/health` | the smallest contract: a response schema |
| `GET /api/v1/projects?status=active` | a query schema, a list response |
| `POST /api/v1/projects` | a body schema, status 201, a server-only field (`createdBy`) the response schema leaves out |
| `GET /api/v1/projects/{id}` | a params schema (`uuid`) and a `notFound` refusal |
| `GET /api/openapi.json` | the OpenAPI document generated from the contracts |

Try a refusal: `curl -X POST localhost:3400/api/v1/projects -H 'content-type: application/json' -d '{}'`
answers a 400 `validation_failed` with every issue listed.

Things to notice:

- `fluixi.config.ts` sets `apiOnly: true`: no `index.html`, no render, and a path outside the API
  answers a JSON 404 in the same shape as the API's errors.
- `src/api.gen.ts` is written by `@fluixi/start`: every path template mapped to its route module.
  A client typed with it (`createClient<ApiRoutes>()` from `@fluixi/api/client`) checks params,
  query and body at compile time.
- Projects live in memory (`src/projects.ts`); the example is about the API, not storage.

`pnpm build` then `pnpm start` runs the built server. Documentation:
[API contracts](https://docs.fluixi.com/v1/en/api-contracts).
