---
"@fluixi/compiler": minor
"@fluixi/dom": minor
"@fluixi/start": minor
"@fluixi/vite-plugin": minor
---

The new `hydratable` compiler option (default `true`) can be set to `false` for code that is never server rendered to omit hydration markers, producing smaller components and runtime. `@fluixi/start` apps with `ssr: false` get it automatically.
