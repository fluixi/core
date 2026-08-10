---
"@fluixi/start": patch
---

Keep prerendered pages off the Cloudflare worker.

In advanced mode the worker sees every request that `_routes.json` does not exclude,
so a prerendered page woke it just to hand the file back through the `ASSETS`
binding. On a plan metered by request that spends the page-view budget on static
files. Every prerendered path is now excluded by name, capped at Cloudflare's
100-rule limit — past which the remainder still works, it just costs an invocation,
and the build says so.

`/` stays included: it is the shell an SSR miss falls back to.
