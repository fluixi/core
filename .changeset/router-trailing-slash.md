---
'@fluixi/router': patch
---

Tolerate a trailing slash when matching routes. Static hosts (e.g. Cloudflare Pages) canonicalise `/a/b` to `/a/b/`; leaf routes match exactly, so the stray slash matched nothing and rendered an empty root after hydration. The matcher now strips a trailing slash (root `/` preserved).
