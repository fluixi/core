---
"@fluixi/start": patch
---

Serve the shell for a client route on a SPA deploy.

An app with no server entry got the static output alone, and a cold request for a
route it handles in the browser found no file: 404 on Vercel, where the config listed
only the filesystem phase, and on Netlify, which serves no fallback of its own. Both
now hand back `index.html` for an unmatched path. Cloudflare Pages already does this
for a project with no `_worker.js`, so its adapter still writes nothing.
