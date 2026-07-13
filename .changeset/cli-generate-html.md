---
"@fluixi/cli": minor
---

`fluixi generate` emits html`` components/routes (plain `.ts`) when the project is
html``-authored — detected from the tsconfig (no `jsx`), or forced with `--html` / `--jsx`.
JSX projects still generate `.tsx` as before.
