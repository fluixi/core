---
"@fluixi/web-components": patch
"@fluixi/dom": patch
"@fluixi/core": patch
---

A server-rendered custom element now waits for the hydrating app to provide its owner before building, ensuring that context such as the router reaches the element's first render and a `<Link>` inside it navigates after a full page load.
