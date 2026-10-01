---
"@fluixi/head": minor
---

useHead({ htmlAttrs: { 'data-theme': () => theme() } }) now sets attributes on `<html>`, rendered by the server and kept current on the client.
