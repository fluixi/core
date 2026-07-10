---
"@fluixi/start": minor
"@fluixi/cli": minor
"create-fluixi": minor
---

Redesigned CLI experience. A gradient `fluixi` wordmark and a clean, colored layout
across the toolchain (zero new dependencies — hand-rolled ANSI that degrades to plain
text when not a TTY / under `NO_COLOR`):

- **`fluixi dev`** now prints a proper "ready" panel — timing plus `Local` and `Network`
  URLs — instead of a single `localhost:PORT` line.
- **`fluixi build`** shows a wordmark header, per-step lines, and a timed `built` summary.
- **`fluixi --help`** / `generate` use the wordmark, colored commands, and ✓/✗ markers.
- **`npm create fluixi`** gets a modern interactive flow: gradient intro, gutter prompts,
  and an arrow-key App-mode selector (SSR/SPA), with a styled "Next steps" outro.
- New `@fluixi/start/ui` export (shared color/wordmark/panel helpers) honoring
  `NO_COLOR`/`FORCE_COLOR`.
