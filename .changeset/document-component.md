---
"@fluixi/start": minor
---

A page shell can now be a component (`src/document.tsx`) that renders `Html`, `Head`, `Main` and `Scripts` from `@fluixi/start/document` per request, allowing request-derived values like `lang` or a theme class, while only the app inside `Main` hydrates and `index.html` remains the default.
