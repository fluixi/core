---
"@fluixi/dom": minor
"@fluixi/jsx": minor
---

Every reactive member of a children array now updates on its own, plain functions included, so a change to one member no longer re-runs its siblings or rebuilds components they built, and the server-only element object handling now loads with the jsx-runtime, reducing bundle size.
