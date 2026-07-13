---
"create-fluixi": minor
---

Scaffold html``-only projects. `create-fluixi` now asks for a template syntax (JSX or
html``) alongside the SSR/SPA mode — pass `--jsx` / `--html` to skip the prompt. The
html`` variant is JSX-free: plain `.ts` sources and a tsconfig without `jsx`, useful when
you don't want JSX configured. Every generated app now includes `@fluixi/ts-plugin` (dev
dependency + `tsconfig` plugin) for html`` editor support, and the `@fluixi/*` template
dependencies now track the `alpha` dist-tag.
