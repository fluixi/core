---
"@fluixi/start": minor
---

HTTP interceptors — a request/response/error pipeline around `fetch` (Angular-style).
`addInterceptor({ request, response, error })` registers cross-cutting logic: attach auth headers,
unwrap or refresh-on-401 responses, log, or recover from network errors. Server-function RPC calls
route through the chain automatically once any interceptor is registered, and `fetchWithInterceptors`
is exported for your own data fetching. `addInterceptor` returns a remover; `clearInterceptors`
resets.
