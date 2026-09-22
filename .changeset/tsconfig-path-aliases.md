---
"@fluixi/start": minor
---

Import aliases declared in `compilerOptions.paths` now resolve in the bundler as well as the type checker. TypeScript's `paths` only tells the type checker where a specifier lives, so an app that added `"@/*": ["./src/*"]` got a clean typecheck and a build that failed to resolve the import. The dev server and every build step read the same file, following `extends` and honouring `baseUrl`, with the longest prefix winning so a short alias cannot swallow a longer one.
