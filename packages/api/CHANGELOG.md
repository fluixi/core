# @fluixi/api

## 1.0.0-alpha.107

## 1.0.0-alpha.106

## 1.0.0-alpha.105

## 1.0.0-alpha.104

## 1.0.0-alpha.103

## 1.0.0-alpha.102

## 1.0.0-alpha.101

## 1.0.0-alpha.100

## 1.0.0-alpha.99

## 0.1.0-alpha.3

### Minor Changes

- b7faba4: First release: typed routes with guards that refuse with 401, 403 or 503, rate limits, an OpenAPI document generated from the routes, and a typed client in `@fluixi/api/client`.

## 0.1.0-alpha.2

### Minor Changes

- bb143e4: A guard can declare 503 in `refuses`, for a check that asks another service, and the OpenAPI document lists the 503 for its routes.

## 0.1.0-alpha.1

### Minor Changes

- 37a8ea7: New `@fluixi/api/client` entry provides a `createClient<ApiRoutes>()` function with typed get, post, put, patch, and delete methods, including typed params, query, body, and response, and throws `ApiClientError` containing status, code, message, and details, while supporting options such as baseUrl, headers, credentials, and fetch.
- 5c92214: New `describedBy(document, handler)` adds the library's OpenAPI paths to the API document under the route's path, showing them instead of an undescribed catch-all route.
- 0884ce9: The `route()` function now accepts a new `guard` option that runs before input is read, passes its result to the handler as `auth`, and adds the appropriate security scheme and 401/403 responses to the OpenAPI document, using `security: []` when no guard is set.
- 5184261: The new `revalidates` route option names cached data a success changes, sending an `x-fx-revalidate` header that the client applies to the router in the browser by default or to `onRevalidate`.
- 2a3bc25: The library now offers `apiSecurity()` middleware that adds security headers, enforces CORS for listed origins, checks request origin on cookie writes, and applies per-client rate limits with 429 responses and Retry-After headers. Cross-origin calls are refused until origins are listed, and only paths under `/api` are touched.
- 7abd65f: The new `postgresRateLimitStore(client, { table, schema, createTable })` shares rate-limit counts across all instances on any client using `query(text, values)`. If the database fails, hits are counted in memory until it is back.
