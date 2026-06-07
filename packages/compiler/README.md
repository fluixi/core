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
compatibility. The Vite integration is packaged as `@fluixi/vite-plugin` (which
wraps `./integrations`); `@fluixi/kettlejs` re-exports it.

## Front-ends and SWC feasibility

Front-ends are the swap point at the parsing end, mirroring `CodegenBackend` at
the emit end. They conform to the `FrontEnd` interface (`src/frontend/types.ts`):

```
FrontEnd (babel now, swc later) -> IR -> CodegenBackend -> code
```

The babel front-end (`src/frontend/babel`) is the reference implementation. The
AST→IR→`emit()` pipeline is implemented and tested end-to-end:
`build-ir.ts` turns a JSX AST into IR, and `imperativeBackend.emit()` turns IR
into runtime-call code (`build-ir.spec.ts` parses JSX, builds IR, emits, and
executes the result in jsdom against the real `@fluixi/dom` runtime).

The plugin keeps two imperative codegens and lets you pick:

- `codegen: 'inline'` (default) — the plugin builds the runtime calls directly
  from the JSX AST (no string reparse).
- `codegen: 'ir'` — the plugin routes through the shared `build-ir` + `emit()`
  pipeline (a small reparse) — the same path a future swc front-end reuses.
  **Experimental:** `build-ir` does not yet recurse into JSX nested inside
  expressions (e.g. `fallback={<p/>}`, render-props like
  `<For>{(x) => <li/>}</For>`, or `cond ? <a/> : <b/>`). Use the default
  `'inline'` path for components that nest JSX in props/expressions until the IR
  models nested-node prop values.

For host elements with multiple children, both paths emit a separate
`insert(el, child, marker)` per child (mirroring the jsx runtime's `applyProps`)
— a single `insert(el, [children])` would not reactively bind a function/component
child sitting inside the array.

Both emit identical runtime calls. Making `'ir'` the default and deleting the
inline path is a later, behaviour-preserving flip.

**SWC feasibility.** SWC is attractive for speed, but it does not expose a
Babel-style JS visitor API for arbitrary AST manipulation — custom transforms run
as Rust/Wasm plugins. Two realistic paths:

1. **SWC as parser + Rust transform plugin** (fastest, most work): port the JSX
   transform to a Rust `swc_core` plugin emitting the same runtime calls. Best
   once the IR + imperative backend stabilise, so the Rust side only has to build
   IR and call a shared emit contract.
2. **SWC for TS/JSX parse, transform in JS over the SWC AST** (less work, slower):
   use `@swc/core` `parseSync` to get an AST, walk it in JS to build our IR, then
   run the existing JS codegen. The SWC AST is walkable but not as ergonomic as
   Babel's; the win over Babel is mainly parse speed.

Now that the IR + `emit()` contract exists and is exercised, an SWC front-end can
be added via path 1 or 2 behind the same `FrontEnd` interface — it only has to
produce IR, and everything downstream (`emit()`, the runtime contract) is reused
unchanged.
