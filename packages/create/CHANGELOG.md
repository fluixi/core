# @fluixi/create

## 0.1.0-next.1

### Patch Changes

- eb95b6c: Docs: rewrite the package READMEs in the canonical format (logo, badges, overview,
  install, usage, license) and bring them up to date — streaming SSR, middleware, server
  functions, `fluixi generate`, and the SSR/SPA scaffold. Adds the missing `@fluixi/create`
  README. (The root README's package list + architecture were also corrected.)

## 0.1.0-next.0

### Minor Changes

- 6354c48: New `@fluixi/create` — scaffold a Fluixi app with `npm create @fluixi <dir>` (or
  `pnpm create @fluixi`). Prompts for a name and a mode — **SSR** (`@fluixi/start`: file
  routing + SSR + hydration) or **SPA** (`vite` + `@fluixi/vite-plugin`) — or take them on
  the CLI (`create-fluixi my-app --spa`). Replaces the broken `kettle-generate` templates.
