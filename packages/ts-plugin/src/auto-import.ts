/**
 * Components the compiler auto-imports.
 *
 * `<Show>`, `<Portal>`, `<Suspense>`, `<Outlet>` and friends work in a template
 * with no import — the compiler injects one. That's good ergonomics and bad for
 * tooling: there is no binding in the file, so `getSymbolsInScope` finds nothing
 * and every symbol-driven feature (definition, references, rename, hover) goes
 * quiet on exactly the components used most.
 *
 * So resolve them the way the compiler would: find the module it would import
 * from, and look the name up there.
 *
 * The map mirrors `CONTROL_FLOW_COMPONENTS`, `CORE_ONLY_CONTROL_FLOW` and
 * `ROUTER_COMPONENTS` in `compiler/src/frontend/babel/plugin.ts`. It is duplicated
 * rather than imported because the plugin is an esbuild bundle and pulling in the
 * compiler would dwarf it; `auto-import.spec.ts` pins the expectation so drift
 * shows up as a failing test.
 */
import type * as TS from 'typescript';

const DOM = '@fluixi/dom';
const CORE = '@fluixi/core';
const ROUTER = '@fluixi/core/router-next';

/** Tag name → the module the compiler injects an import from. */
export const AUTO_IMPORTED: Readonly<Record<string, string>> = {
  // Control flow. Suspense and Await live in core; dom doesn't export them.
  Show: DOM,
  For: DOM,
  Index: DOM,
  Switch: DOM,
  Match: DOM,
  Portal: DOM,
  Dynamic: DOM,
  ErrorBoundary: DOM,
  Suspense: CORE,
  Await: CORE,
  // Router. `Routes` isn't a component and `lazy` is a call, so neither appears.
  Router: ROUTER,
  Outlet: ROUTER,
  Redirect: ROUTER,
  Link: ROUTER,
};

/** Exported symbols of a module, cached per program so resolution happens once. */
const exportsByProgram = new WeakMap<TS.Program, Map<string, TS.Symbol[] | undefined>>();

function moduleExports(
  ts: typeof TS,
  program: TS.Program,
  host: TS.ModuleResolutionHost,
  from: TS.SourceFile,
  moduleName: string,
): TS.Symbol[] | undefined {
  let cache = exportsByProgram.get(program);
  if (!cache) {
    cache = new Map();
    exportsByProgram.set(program, cache);
  }
  if (cache.has(moduleName)) return cache.get(moduleName);

  let symbols: TS.Symbol[] | undefined;
  try {
    const resolved = ts.resolveModuleName(moduleName, from.fileName, program.getCompilerOptions(), host);
    const file = resolved.resolvedModule && program.getSourceFile(resolved.resolvedModule.resolvedFileName);
    const checker = program.getTypeChecker();
    const moduleSymbol = file && checker.getSymbolAtLocation(file);
    if (moduleSymbol) symbols = checker.getExportsOfModule(moduleSymbol);
  } catch {
    symbols = undefined;
  }

  cache.set(moduleName, symbols);
  return symbols;
}

/**
 * The symbol for an auto-imported component tag, or undefined when the name isn't
 * one or the module can't be resolved.
 */
export function autoImportedSymbol(
  ts: typeof TS,
  program: TS.Program,
  host: TS.ModuleResolutionHost,
  from: TS.SourceFile,
  name: string,
): TS.Symbol | undefined {
  const moduleName = AUTO_IMPORTED[name];
  if (!moduleName) return undefined;

  const symbol = moduleExports(ts, program, host, from, moduleName)?.find((s) => s.name === name);
  if (!symbol) return undefined;
  if (!(symbol.flags & ts.SymbolFlags.Alias)) return symbol;

  // These modules are barrels, so the export is an alias — follow it to the real
  // declaration, which is what a jump should land on.
  try {
    return program.getTypeChecker().getAliasedSymbol(symbol);
  } catch {
    return symbol;
  }
}
