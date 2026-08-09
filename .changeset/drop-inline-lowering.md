---
"@fluixi/compiler": minor
"@fluixi/vite-plugin": patch
"@fluixi/babel-plugin-jsx": patch
---

One lowering. The compiler had two implementations of every JSX semantic and
compiled with only one of them.

`plugin.ts` carried a full second lowering — the `codegen: 'inline'` path, plus
the `backend: 'jsx'` factory emitter — alongside the IR pipeline that has been
the default for some time. Nothing selected either one; the only references left
in the repository were two tests written for them, and the option's own docstring
still advertised `inline` as the default it had stopped being. Meanwhile the two
implementations had to agree about `ref`, `use:`, spreads, control flow and
template cloning, and when they disagreed it shipped: `codegen: 'ir'` went out as
alpha.71 and broke three `@fluixi/ui` packages.

Removed: 39 of the 46 functions in `plugin.ts:898-2555` (~1,400 lines) and the
`backend`, `codegen`, `runtime`, `pragma`, `pragmaFrag`, `hoistStatics`,
`useLitHTML`, `optimizeControlFlow`, `autoShowTransform`, `detectReactivity`,
`delegatedEvents` and `optimize` options that only fed them. JSX and `` html`` ``
templates now take the same path they already took: build IR, run the imperative
backend, splice the emitted code back in. Compiled output for `examples/start-app`
is byte-identical before and after.

`backend: 'jsx'` is gone, but the `@fluixi/jsx` **runtime** is not: it is still
what TypeScript's `jsxImportSource` resolves types through and what esbuild's
automatic runtime targets. This compiler simply never emits a `jsx()` call.

Also removed from `@fluixi/compiler/integrations`: a regex-based `transform()`
that every adapter silently fell back to when `@babel/core` failed to load. It
could not compile JSX, so it returned source whose templates had never become DOM
calls — a build that reported success and failed when the page opened. Missing
babel is now a hard error, and a compile error propagates instead of being
swallowed and replaced with half-transformed source. The dead `generate:
'ssr' | 'hydrate'` option, which nothing has ever read, is gone too.

Nothing that compiles today compiles differently. Configs passing a removed
option get a type error naming it, rather than an option that silently does
nothing.
