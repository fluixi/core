---
"@fluixi/dom": minor
---

Light DOM custom elements now render on the server and are adopted on upgrade, with object props passed as JSON in `data-fx-props`, and `hydrateChildren(container, build)` is exported from `@fluixi/dom`. Shadow DOM elements still render on the client, and content an element places from its authored children is not adopted.
