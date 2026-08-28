---
"fluixi": minor
"@fluixi/start": patch
---

`@fluixi/core` no longer installs the build toolchain.

It listed `@fluixi/compiler`, `@fluixi/vite-plugin` and
`vite-plugin-node-polyfills` under `dependencies` while importing none of them
from `src/` — they exist for the `@fluixi/core/plugins` subpath, which is
build-time tooling. Declaring them as runtime dependencies of the *runtime*
package meant every consumer of `@fluixi/core` installed Vite plugins and a Babel
toolchain (52 MB in this workspace) to render a component. Component libraries
built on `@fluixi/core` were passing that on to their own users.

They are now **optional peer dependencies**: use `@fluixi/core/plugins` and you
need them, otherwise you do not. `@fluixi/start` reaches that subpath through
`await import('@fluixi/core/plugins')`, so it declares them itself — apps using
the meta-framework are unaffected, and the standalone Vite templates already
declared `@fluixi/vite-plugin` as a devDependency.

`@fluixi/core`'s runtime closure is now `@fluixi/{dom,jsx,reactive,router,server,utils,head}`,
none of which reach the compiler.
