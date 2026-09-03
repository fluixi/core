---
"@fluixi/core": patch
---

`onMount` and `useEffect` now only run on the client, avoiding errors from accessing `document` during server-side rendering. Suspense no longer attempts to read `process.env.FX_DEBUG` during hydration, preventing freezes in development builds.
