---
"@fluixi/dom": minor
"@fluixi/start": minor
"@fluixi/core": minor
---

The mount element carries a single `data-fluixi` attribute in place of `fluixi`, `fx-dom` and `fx-reactive`; its value is the release in development and empty in production. `@fluixi/start` writes this attribute on the server so it appears in the page source, and `window.Fluixi` retains all three version strings.
