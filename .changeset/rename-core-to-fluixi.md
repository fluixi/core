---
"fluixi": minor
"@fluixi/compiler": minor
"@fluixi/start": minor
"@fluixi/auth": minor
"@fluixi/session": minor
---

The package is now named `fluixi` instead of `@fluixi/core`, with the same contents and subpaths; all other `@fluixi/*` packages retain their names. 
Replace `@fluixi/core` with `fluixi` in `package.json` and all import statements, and update subpaths like `@fluixi/core/server` to `fluixi/server`.
