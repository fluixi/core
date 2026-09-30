---
"@fluixi/dom": patch
---

Server data is now read from the `window.__FX_DATA__` script element in the browser, preventing refetches after hydration and preserving the SSR locale seed.
