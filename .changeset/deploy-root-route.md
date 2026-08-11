---
"@fluixi/start": patch
---

Render `/` on Cloudflare, Netlify and Vercel instead of serving the shell.

`dist/client/index.html` sits at the path a prerendered `/` would occupy, so each
platform's static layer answered the home page with an empty mount element and never
reached the app: the ASSETS binding on Pages, `preferStatic` on Netlify, the filesystem
phase on Vercel. Every other route was already correct — nothing exists at `/about`
unless it was prerendered. The adapters now decide who owns `/` by whether that file
holds a rendered page, and the worker asks the ASSETS binding only about a prerendered
path or a path with a file extension, which is the rule the Node adapter already used.
