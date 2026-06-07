# @fluixi/compiler

The host-agnostic JSX compiler for KettleJS. It owns all compile-time code:
parsing front-ends, the intermediate representation, and the code generators.

## Pipeline

```
front-end adapters        IR              codegen backends
(babel now, swc later) → (ir/nodes) → analyze → transform → (imperative now,
                                                              template-clone later)
                                                                   │
                                                          emit against a versioned
                                                            RuntimeContract
```

- **Front-ends** (`src/frontend/*`) parse source and produce IR. The babel
  front-end ships today at `@fluixi/compiler/babel`; a SWC front-end can plug in
  alongside it without touching anything downstream.
- **IR** (`src/ir/nodes.ts`) is the stable, host-agnostic contract between
  parsing and codegen — the layer our own optimizations (hoisting, islands,
  resumability hints) operate on.
- **Codegen backends** (`src/codegen/*`) turn IR into runtime calls. This is the
  swap point: pick a backend, not a rewrite. Each backend declares the
  `RuntimeContract` (`src/codegen/contract.ts`) it emits against, so backend and
  runtime evolve in lockstep.
- **Integrations** (`src/integrations.ts`, exported at
  `@fluixi/compiler/integrations`) are the bundler adapters (vite/webpack/
  rollup/esbuild) that drive the front-end.

## Backends

| backend          | contract | status                                         |
| ---------------- | -------- | ---------------------------------------------- |
| `imperative`     | v1       | live — emits `createNativeElement`/`spread`/`insert`/`createComponent` (locked by the `@fluixi/dom` contract tests). Enable via the babel front-end option `backend: 'imperative'`; default is still `jsx`. The IR-driven `emit()` (so non-babel front-ends share it) is the remaining seam. |
| `template-clone` | v2       | future — Solid-style template clone, our own improvements. |

## Entry points

- `@fluixi/compiler` — IR, options, runtime contract, backend interface + registry.
- `@fluixi/compiler/babel` — the babel front-end (plugin + presets).
- `@fluixi/compiler/integrations` — bundler plugins.

`@fluixi/babel-plugin-jsx` remains as a thin re-export of `./babel` for backward
compatibility. `@fluixi/kettlejs` re-exports `createVitePlugin` from
`./integrations`.
