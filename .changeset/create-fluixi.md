---
"@fluixi/create": minor
---

New `@fluixi/create` — scaffold a Fluixi app with `npm create @fluixi <dir>` (or
`pnpm create @fluixi`). Prompts for a name and a mode — **SSR** (`@fluixi/start`: file
routing + SSR + hydration) or **SPA** (`vite` + `@fluixi/vite-plugin`) — or take them on
the CLI (`create-fluixi my-app --spa`). Replaces the broken `kettle-generate` templates.
