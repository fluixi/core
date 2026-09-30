---
"@fluixi/api": minor
---

New `@fluixi/api/client` entry provides a `createClient<ApiRoutes>()` function with typed get, post, put, patch, and delete methods, including typed params, query, body, and response, and throws `ApiClientError` containing status, code, message, and details, while supporting options such as baseUrl, headers, credentials, and fetch.
