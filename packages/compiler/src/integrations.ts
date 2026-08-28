/**
 * @fileoverview Bundler integrations for the Fluixi compiler.
 * @module @fluixi/compiler/integrations
 *
 * vite, webpack, rollup and esbuild adapters. Each is a few lines around
 * `compileModule`, which rewrites the source in place — JSX and `` html`` `` both
 * lower to the shared IR and the imperative backend. fluixi re-exports
 * createVitePlugin from here.
 *
 * `babel: true` routes through the babel front-end instead, for a project whose
 * own babel plugins have to see the output. It is the only thing that needs
 * @babel/core, and it says so rather than degrading: source that was not compiled
 * is source whose templates never became DOM calls, and a build that ships it
 * looks successful until the page is opened.
 */

// ============================================================================
// Types
// ============================================================================

export interface CompilerOptions {
  /**
   * Rules that resolve an unbound capitalised tag to a module, so a component can be
   * used in a template without an import. See `createComponentResolver`.
   */
  resolve?: readonly ComponentResolverRule[];
  /**
   * Where to write the ambient declarations for the components `resolve` supplies.
   *
   * Relative to the project root; `false` turns generation off. Without this file every
   * resolved tag is a `Cannot find name` error in the editor and in `tsc`, because the
   * import only exists after compilation. Committing it is intended — it is what makes a
   * fresh clone type-check before anyone runs the dev server.
   *
   * It must be covered by `include` in tsconfig.json, which for the default means adding
   * `"fluixi.d.ts"` alongside `"src"`. A file TypeScript does not read looks exactly like
   * one that was never generated, so a mismatch is reported rather than left to puzzle
   * over.
   *
   * @default 'fluixi.d.ts'
   */
  globals?: string | false;
  /** Clone static subtrees from a `<template>` instead of building them element by element. */
  templateClone?: boolean;
  /** Also clone subtrees whose structure is static but which contain dynamic holes. */
  partialTemplates?: boolean;
  /**
   * Whether to generate source maps
   * @default false
   */
  sourceMaps?: boolean;

  /**
   * Whether to delegate events
   * @default true
   */
  delegateEvents?: boolean;

  /**
   * Whether to generate dev-mode code with additional checks
   * @default false
   */
  development?: boolean;

  /**
   * Where the JSX *types* come from, and the `jsxImportSource` handed to esbuild
   * and TypeScript. The compiler never emits `jsx()` calls itself — this is for
   * type resolution and for any JSX the Fluixi transform does not consume.
   * @default '@fluixi/jsx'
   */
  importSource?: string;

  /**
   * Authoring syntaxes to compile: 'jsx', 'lit' (only `` html`...` `` templates),
   * or 'both' (default). Both lower to the same IR and the same backend.
   * @default 'both'
   */
  format?: 'jsx' | 'lit' | 'both';

  /**
   * Compile through babel instead of rewriting the source directly.
   *
   * The default path parses once and splices the emitted code over the spans it
   * replaces: nothing is reprinted, edits carry a source map, and types are left
   * for esbuild to strip. Babel is kept for the cases that need to sit inside its
   * pipeline — a `babel.config.js` with other plugins that have to see the
   * output. It needs `@babel/core` and friends installed; they are optional peers.
   * @default false
   */
  babel?: boolean;

  /**
   * Tag name marking a lit template for compilation (when `format` includes lit).
   * @default 'html'
   */
  litTag?: string;

  /**
   * Rewrite a component's destructured props into property reads, so
   * `function Card({ title })` keeps updating instead of reading `title` once.
   * Applies to JSX and html`` alike — it rewrites the function body before either is
   * compiled. A pattern it can't prove is left as written, so `splitProps` keeps
   * working wherever it's still needed.
   *
   * Turn it off for a package that ships its source to be compiled by the consumer —
   * rewriting there would bake property reads into what you publish.
   *
   * @default true
   */
  propsDestructure?: boolean;

  /**
   * Module emitted runtime symbols are imported from in 'imperative' mode.
   * @default '@fluixi/dom'
   */
  signalModule?: string;

  /**
   * Module control-flow components are imported from in 'imperative' mode.
   * @default '@fluixi/dom'
   */
  controlFlowModule?: string;

  /**
   * Module the router components (Router/Outlet/…) are auto-imported from.
   * @default 'fluixi/router'
   */
  routerModule?: string;

  /**
   * Where reactive primitives (createMemo) are imported from in 'imperative' mode.
   * @default '@fluixi/reactive/signal'
   */
  reactiveModule?: string;
}

// ============================================================================
// Babel Plugin Helpers
// ============================================================================

/**
 * Helper for creating a Babel plugin
 */
export async function createBabelPlugin(options: CompilerOptions = {}) {
  // Import the actual Babel plugin using dynamic import for ESM
  let pluginModule = null;
  try {
    // The babel front-end lives in this same package now.
    pluginModule = await import('./frontend/babel/index.js');
  } catch (e) {
    console.warn('Could not load the babel front-end:', e);
  }

  return {
    name: 'babel-fluixi-jsx',
    plugin: pluginModule ? pluginModule.default || pluginModule : null,

    // Provide options mapping
    getOptions() {
      return {
        importSource: options.importSource || '@fluixi/jsx',
        development: options.development || false,
        delegateEvents: options.delegateEvents !== false,
        ...(options.format ? { format: options.format } : {}),
        // Forwarded explicitly: getOptions() is an allowlist, so an option missing
        // here is silently dropped rather than rejected.
        ...(options.resolve ? { resolve: options.resolve } : {}),
        ...(options.templateClone !== undefined
          ? { templateClone: options.templateClone }
          : {}),
        ...(options.partialTemplates !== undefined
          ? { partialTemplates: options.partialTemplates }
          : {}),
        ...(options.litTag ? { litTag: options.litTag } : {}),
        ...(options.signalModule ? { signalModule: options.signalModule } : {}),
        ...(options.controlFlowModule
          ? { controlFlowModule: options.controlFlowModule }
          : {}),
        ...(options.routerModule ? { routerModule: options.routerModule } : {}),
        ...(options.reactiveModule ? { reactiveModule: options.reactiveModule } : {}),
      };
    },
  };
}

// ============================================================================
// TypeScript Transformer Helpers
// ============================================================================

/**
 * Helper for creating a TypeScript transformer
 */
export function createTypeScriptTransformer(options: CompilerOptions = {}) {
  const ts = tryRequire('typescript');
  if (!ts) {
    console.warn('TypeScript not found, transformer unavailable');
    return (context: any) => (sourceFile: any) => sourceFile;
  }

  return (context: any) => {
    const visitor = (node: any): any => {
      // Transform JSX elements
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        // Use the same transformation logic as Babel
        return transformTSJSXNode(node, options, ts);
      }

      return ts.visitEachChild(node, visitor, context);
    };

    return (sourceFile: any) => {
      return ts.visitNode(sourceFile, visitor);
    };
  };
}

/**
 * Transform TypeScript JSX node
 */
function transformTSJSXNode(node: any, options: CompilerOptions, ts: any): any {
  // This is a placeholder - full implementation would mirror Babel transformation
  // For now, return the node unchanged
  return node;
}

/**
 * Try to require a module, return null if not available
 */
function tryRequire(moduleName: string): any {
  try {
    return require(moduleName);
  } catch (e) {
    return null;
  }
}

// ============================================================================
// Vite Plugin
// ============================================================================

/**
 * Create a Vite plugin for JSX transformation
 */
export function createVitePlugin<T>(options: CompilerOptions = {}): T {
  return {
    name: 'vite-fluixi-jsx',

    enforce: 'pre' as const,

    config() {
      return {
        esbuild: {
          jsx: 'automatic',
          jsxImportSource: options.importSource || '@fluixi/jsx',
        },
      };
    },

    // Written once per build, and on dev-server start, rather than per transform: the
    // set of resolvable names comes from config, so nothing a file does can change it.
    configResolved(config: { root?: string }) {
      const outcome = writeComponentGlobals(options, config?.root ?? process.cwd());
      if (outcome.warning) console.warn(outcome.warning);
    },

    async transform(code: string, id: string) {
      // Only process JSX/TSX files
      if (!/\.(jsx|tsx|ts)$/i.test(id)) {
        return null;
      }

      if (!options.babel) return compileModule(code, id, options);

      const babelPlugin = await createBabelPlugin(options);

      try {
        // Use dynamic import instead of require for ESM compatibility
        const babel = await import('@babel/core').catch(() => null);
        if (!babel) {
          // No silent fallback. This front-end compiles through babel; without it
          // there is no transform, and emitting the source unchanged would ship a
          // build whose JSX and html`` templates were never compiled — a failure
          // that looks exactly like success until the page is opened.
          throw new Error(
            `[fluixi] @babel/core is required to compile ${id} but could not be loaded. ` +
              `Install it alongside @fluixi/compiler.`,
          );
        }

        const isTSX = /\.tsx$/.test(id);
        const isTS = /\.ts$/.test(id);

        const presets: any[] = [];
        const plugins: any[] = [];

        // Add TypeScript preset if needed (but with JSX preservation)
        if (isTSX || isTS) {
          const tsPreset = await import('@babel/preset-typescript' as any)
            .then((m) => m.default || m)
            .catch(() => null);
          if (tsPreset) {
            presets.push([
              tsPreset,
              {
                isTSX: isTSX,
                allExtensions: true,
                // Important: preserve JSX so our plugin can transform it
                jsxPragma: 'jsx',
                jsxPragmaFrag: 'Fragment',
                onlyRemoveTypeImports: true,
              },
            ]);
          }
        }

        // Only our custom babel plugin handles JSX — never @babel/preset-react, which
        // rewrites spreads with Object.assign and breaks store-proxy reactivity.
        if (babelPlugin && babelPlugin.plugin) {
          plugins.push([babelPlugin.plugin, babelPlugin.getOptions()]);
        } else {
          console.warn('[createVitePlugin] custom babel plugin not found');
        }

        const result = await babel.transformAsync(code, {
          filename: id,
          configFile: false,
          babelrc: false,
          presets: presets,
          plugins: plugins,
          sourceMaps: options.sourceMaps !== false,
        });

        // console.log('[createVitePlugin] Transformation complete for:', id);
        // console.log(
        //   '[createVitePlugin] Has mergeProps in output:',
        //   result?.code?.includes('mergeProps')
        // );

        return {
          code: result?.code || code,
          map: result?.map,
        };
      } catch (e) {
        // Let it through to Vite. Swallowing a compile error here and returning
        // half-transformed source turns a diagnosable failure into a mystery at
        // runtime; the build should stop where the problem is.
        throw e;
      }
    },
  } as T;
}

/** CompilerOptions as the transform wants them. Shared by every adapter. */
function transformOptions(options: CompilerOptions) {
  return {
    resolve: options.resolve,
    litTag: options.litTag,
    templateClone: options.templateClone,
    partialTemplates: options.partialTemplates,
    runtimeModule: options.signalModule,
    controlFlowModule: options.controlFlowModule,
    routerModule: options.routerModule,
    reactiveModule: options.reactiveModule,
    propsDestructure: options.propsDestructure,
  };
}

/**
 * The babel path compiles through a host AST, so the rewrite runs as its own pass there
 * and pays for a second parse. The built-in path folds the same edits into the template
 * transform instead, which is why only this branch needs it.
 */
async function rewriteProps(code: string, id: string, options: CompilerOptions) {
  if (options.propsDestructure === false) return code;
  const { transformProps } = await import('./transform/index.js');
  const result = transformProps(code, id);
  reportDiagnostics({ propsDiagnostics: result.diagnostics }, id);
  // Untouched source comes back identical, so nothing pays for the option being on.
  return result.rewritten > 0 ? result.code : code;
}

/**
 * Warnings already printed, so a watch rebuild doesn't repeat them.
 *
 * A module is transformed again on every edit to it or its importers, and the same
 * warning ten times reads as ten problems. Cleared when the message changes, which is
 * the only thing worth re-printing.
 */
const reported = new Set<string>();

/**
 * Say what the compiler refused to do.
 *
 * All of these build cleanly and fail at runtime, which is why they are worth printing: an
 * unresolved tag renders nothing, a `load:` it cannot act on ships the chunk eagerly, and a
 * props pattern the rewrite refused reads its value once instead of tracking it. None leaves
 * a trace anywhere else — the last one is a stale value on screen and nothing in the build.
 *
 * `console.warn`, deliberately, not a plugin's `this.warn`: that only exists in the
 * rollup/vite context, and this runs for the esbuild and webpack adapters too. A
 * diagnostic that only some bundlers get is worse than one that is plainly ours.
 */
function reportDiagnostics(result: unknown, id: string): void {
  const r = result as {
    loadDiagnostics?: { message: string }[];
    unresolvedDiagnostics?: { message: string }[];
    propsDiagnostics?: { name: string; message: string }[];
    intrinsicDiagnostics?: { name: string; message: string }[];
  } | null;
  const say = (message: string): void => {
    const key = `${id}\u0000${message}`;
    if (reported.has(key)) return;
    reported.add(key);
    console.warn(`[fluixi] ${id}: ${message}`);
  };

  for (const d of r?.unresolvedDiagnostics ?? []) say(d.message);
  for (const d of r?.loadDiagnostics ?? []) say(d.message);
  for (const d of r?.intrinsicDiagnostics ?? []) say(d.message);
  for (const d of r?.propsDiagnostics ?? []) {
    say(`\`${d.name}\` was left destructured: ${d.message}. It reads once instead of tracking.`);
  }
}

/** Compile one module, through babel only when asked for it. */
async function compileModule(code: string, id: string, options: CompilerOptions) {
  if (!options.babel) {
    const { transformTemplates } = await import('./transform/index.js');
    const result = transformTemplates(code, id, transformOptions(options));
    reportDiagnostics(result, id);
    return result;
  }

  const source = await rewriteProps(code, id, options);
  const babel = await import('@babel/core').catch(() => null);
  const plugin = await createBabelPlugin(options);
  if (!babel || !plugin.plugin) {
    throw new Error(
      `[fluixi] babel: true needs @babel/core, which could not be loaded for ${id}. ` +
        `Install it, or drop the option to use the built-in compiler.`,
    );
  }
  const result = await babel.transformAsync(source, {
    filename: id,
    configFile: false,
    babelrc: false,
    plugins: [[plugin.plugin, plugin.getOptions()]],
    sourceMaps: options.sourceMaps !== false,
  });
  return result?.code ? { code: result.code, map: result.map } : null;
}

// ============================================================================
// Webpack Loader
// ============================================================================

/**
 * Create a Webpack loader for JSX transformation
 */
export function createWebpackLoader(options: CompilerOptions = {}) {
  return async function (this: any, source: string) {
    const callback = this.async();
    compileModule(source, this.resourcePath, options)
      .then((result: any) => {
        callback(null, result?.code, result?.map);
      })
      .catch((err: any) => {
        callback(err);
      });
  };
}

// ============================================================================
// Rollup Plugin
// ============================================================================

/**
 * Create a Rollup plugin for JSX transformation
 */
export function createRollupPlugin(options: CompilerOptions = {}) {
  return {
    name: 'rollup-fluixi-jsx',

    async transform(code: string, id: string) {
      if (!/\.[jt]sx?$/.test(id)) return null;
      return compileModule(code, id, options);
    },
  };
}

// ============================================================================
// ESBuild Plugin
// ============================================================================

/**
 * Create an ESBuild plugin for JSX transformation
 */
export function createESBuildPlugin(options: CompilerOptions = {}) {
  return {
    name: 'esbuild-fluixi-jsx',

    setup(build: any) {
      build.onLoad({ filter: /\.[jt]sx?$/ }, async (args: any) => {
        const { readFileSync } = await import('node:fs');
        const source = readFileSync(args.path, 'utf8');

        try {
          const result = await compileModule(source, args.path, options);
          // esbuild still has to strip the types the transform leaves in place.
          return {
            contents: result?.code ?? source,
            loader: args.path.endsWith('x') ? 'tsx' : 'ts',
          };
        } catch (e) {
          return {
            errors: [
              {
                text: `Transform error: ${e}`,
              },
            ],
          };
        }
      });
    },
  };
}

// ============================================================================
// Exports
// ============================================================================


// ============================================================================
// "use server" — server functions vite plugin
// ============================================================================

export type { ServerFnTransformOptions } from './frontend/babel/server-functions.js';
import type { ComponentResolverRule } from './resolve/component-resolver.js';
import { writeComponentGlobals } from './resolve/write-globals.js';
import { readdirSync, readFileSync } from 'node:fs';
import { join as _join } from 'node:path';

const SERVER_FNS_VMOD = 'virtual:fluixi-server-fns';

/** Recursively find source files containing the `"use server"` directive under `dir`. */
function findServerFnModules(dir: string, out: string[] = []): string[] {
  let entries: any[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
    const full = _join(dir, e.name);
    if (e.isDirectory()) findServerFnModules(full, out);
    else if (/\.[jt]sx?$/.test(e.name)) {
      try {
        if (readFileSync(full, 'utf8').includes('use server')) out.push(full);
      } catch {
        /* unreadable — skip */
      }
    }
  }
  return out;
}

/**
 * Vite plugin for `"use server"`: applies the transform (client→RPC stub, server→register
 * the body), and provides `virtual:fluixi-server-fns` — side-effect imports of every
 * module that defines a server function. The server entry imports it so ALL server
 * functions register at startup (including those in lazy routes, which would otherwise
 * register only when their chunk loads → an RPC registry miss). The client never imports
 * it. `enforce:'pre'` so it runs on the raw source before other transforms.
 */
export function serverFunctionsVitePlugin<T = any>(options: { babel?: boolean } = {}): T {
  let root = process.cwd();
  return {
    name: 'fluixi-server-functions',
    enforce: 'pre' as const,
    configResolved(config: any) {
      root = config.root || root;
    },
    resolveId(id: string) {
      return id === SERVER_FNS_VMOD || id === '@fluixi/start/server-fns'
        ? '\0' + SERVER_FNS_VMOD
        : null;
    },
    load(id: string) {
      if (id !== '\0' + SERVER_FNS_VMOD) return null;
      const mods = findServerFnModules(_join(root, 'src'));
      // First wire the request-context bridge (server-only), then side-effect import each
      // server-fn module so its top-level $$registerServerFn(...) runs, then re-export the
      // dispatcher so the host can route /_server through THIS module graph (sharing the
      // registry the imports populated) — apps don't need to re-export it from entry-server.
      const setup = `import '@fluixi/start/server-fn-setup';\n`;
      const imports = mods.map((m) => `import ${JSON.stringify(m)};`).join('\n');
      const dispatcher = `\nexport { isServerFnRequest, handleServerFn } from '@fluixi/start/server-fn';\n`;
      return setup + imports + dispatcher;
    },
    async transform(code: string, id: string, opts?: { ssr?: boolean }) {
      if (!/\.[jt]sx?$/.test(id)) return null;
      if (!code.includes('use server')) return null;
      const args = { ssr: !!opts?.ssr, filename: id, root };
      if (options.babel) {
        const { transformServerFunctions } = await import('./frontend/babel/server-functions.js');
        return transformServerFunctions(code, args);
      }
      const { transformServerFns } = await import('./transform/server-fns.js');
      return transformServerFns(code, args);
    },
  } as T;
}

export default {
  createBabelPlugin,
  createTypeScriptTransformer,
  createVitePlugin,
  createWebpackLoader,
  createRollupPlugin,
  createESBuildPlugin,
};
