/**
 * Components the compiler auto-imports.
 *
 * `<Show>`, `<Portal>`, `<Suspense>`, `<Outlet>` and friends work in a template
 * with no import: the compiler injects one. That's good ergonomics and bad for
 * tooling: there is no binding in the file, so `getSymbolsInScope` finds nothing
 * and every symbol-driven feature (definition, references, rename, hover) goes
 * quiet on exactly the components used most.
 *
 * So resolve them the way the compiler would: find the module it would import
 * from, and look the name up there.
 *
 * The names come from `@fluixi/compiler/builtins`, which exists so this list is not
 * copied. It used to be duplicated here: the plugin is an esbuild bundle and pulling
 * in the compiler would dwarf it: with a spec reading the compiler source to pin the
 * two together. That subpath is pure data with no compiler code behind it, so the
 * bundle stays small and the copy is gone.
 */
import type * as TS from 'typescript';
import { builtinComponentMap } from '@fluixi/compiler/builtins';

/** Tag name → the module the compiler injects an import from. */
export const AUTO_IMPORTED: Readonly<Record<string, string>> = builtinComponentMap();

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

/** Where a name is declared: enough for a jump, without needing the checker. */
export interface DeclarationSite {
  fileName: string;
  start: number;
  length: number;
}

const sitesByProgram = new WeakMap<TS.Program, Map<string, DeclarationSite | undefined>>();

/**
 * Find where a module declares a name, reading from disk.
 *
 * Needed because an auto-imported component means nothing imports its module, so
 * the module's declarations are usually NOT in the program and the checker can say
 * nothing about them. Definition only needs a file and a span, so it can be
 * answered without the program: following `export *` re-exports through the
 * barrels these packages are built from.
 */
export function declarationSite(
  ts: typeof TS,
  program: TS.Program,
  host: TS.ModuleResolutionHost,
  from: TS.SourceFile,
  name: string,
): DeclarationSite | undefined {
  const moduleName = AUTO_IMPORTED[name];
  if (!moduleName) return undefined;

  let cache = sitesByProgram.get(program);
  if (!cache) {
    cache = new Map();
    sitesByProgram.set(program, cache);
  }
  const key = `${moduleName}:${name}`;
  if (cache.has(key)) return cache.get(key);

  let site: DeclarationSite | undefined;
  try {
    const resolved = ts.resolveModuleName(moduleName, from.fileName, program.getCompilerOptions(), host);
    const entry = resolved.resolvedModule?.resolvedFileName;
    if (entry) site = findExport(ts, host, program.getCompilerOptions(), entry, name, 0);
  } catch {
    site = undefined;
  }

  cache.set(key, site);
  return site;
}

/** Depth-limited search for `name` through a declaration file and its re-exports. */
function findExport(
  ts: typeof TS,
  host: TS.ModuleResolutionHost,
  options: TS.CompilerOptions,
  fileName: string,
  name: string,
  depth: number,
): DeclarationSite | undefined {
  if (depth > 4) return undefined; // barrels nest, but not that far
  const text = host.readFile?.(fileName);
  if (text === undefined) return undefined;

  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const reExports: string[] = [];

  for (const statement of sf.statements) {
    // export declare function Name / class Name / const Name
    const declared = declaredName(ts, statement, name);
    if (declared) {
      return { fileName, start: declared.getStart(sf), length: declared.getWidth(sf) };
    }

    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        // `export { Name } from './x'`: the name is here, the declaration is there.
        const named = statement.exportClause.elements.find((e) => e.name.text === name);
        if (named) reExports.unshift(specifier);
      } else if (!statement.exportClause) {
        reExports.push(specifier); // `export * from './x'`
      }
    }
  }

  for (const specifier of reExports) {
    const target = resolveRelative(ts, host, options, fileName, specifier);
    const found = target && findExport(ts, host, options, target, name, depth + 1);
    if (found) return found;
  }
  return undefined;
}

function declaredName(ts: typeof TS, statement: TS.Statement, name: string): TS.Node | undefined {
  const exported = ts.canHaveModifiers(statement)
    ? ts.getModifiers(statement)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    : false;
  if (!exported) return undefined;

  if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name?.text === name) {
    return statement.name;
  }
  if (ts.isVariableStatement(statement)) {
    for (const d of statement.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && d.name.text === name) return d.name;
    }
  }
  return undefined;
}

/**
 * Resolve a relative specifier the way TypeScript would.
 *
 * Hand-rolled path joining got this wrong: `./lib/index.js` from a barrel became
 * `dist/./lib/index.d.ts`, which matches nothing. TypeScript's resolver also maps
 * the `.js` specifier these ESM packages use to the `.d.ts` that actually exists.
 */
function resolveRelative(
  ts: typeof TS,
  host: TS.ModuleResolutionHost,
  options: TS.CompilerOptions,
  from: string,
  specifier: string,
): string | undefined {
  if (!specifier.startsWith('.')) return undefined;
  try {
    return ts.resolveModuleName(specifier, from, options, host).resolvedModule?.resolvedFileName;
  } catch {
    return undefined;
  }
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

  // These modules are barrels, so the export is an alias, follow it to the real
  // declaration, which is what a jump should land on.
  try {
    return program.getTypeChecker().getAliasedSymbol(symbol);
  } catch {
    return symbol;
  }
}
