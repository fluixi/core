/**
 * @fileoverview Bundler integrations for the Fluixi compiler.
 * @module @fluixi/compiler/integrations
 *
 * Build-tool adapters (vite/webpack/rollup/esbuild) plus the prop/template
 * analysis helpers that drive them. These wrap the babel front-end so a single
 * package owns all compile-time code. @fluixi/core re-exports
 * createVitePlugin from here.
 *
 * Helpers:
 * - Detecting reactive expressions
 * - Wrapping signals for optimal updates
 * - Template optimization
 * - Static vs dynamic prop detection
 */

// ============================================================================
// Types
// ============================================================================

export interface CompilerOptions {
  /**
   * Whether to use lit-html templates when possible
   * @default true
   */
  useLitHTML?: boolean;

  /**
   * Whether to generate source maps
   * @default false
   */
  sourceMaps?: boolean;

  /**
   * Whether to enable aggressive optimizations
   * @default true
   */
  optimize?: boolean;

  /**
   * Whether to delegate events
   * @default true
   */
  delegateEvents?: boolean;

  /**
   * Events to delegate (if delegateEvents is true)
   * @default ['click', 'input', 'change', 'submit']
   */
  delegatedEvents?: string[];

  /**
   * Whether to generate dev-mode code with additional checks
   * @default false
   */
  development?: boolean;

  /**
   * Custom pragma for JSX
   * @default 'jsx'
   */
  pragma?: string;

  /**
   * Custom pragma fragment
   * @default 'Fragment'
   */
  pragmaFrag?: string;

  /**
   * Module to import JSX runtime from
   * @default '@fluixi/jsx'
   */
  importSource?: string;

  /**
   * Code-generation backend.
   * - 'imperative': compile straight into @fluixi/dom runtime calls (default).
   * - 'jsx': emit the automatic runtime jsx()/jsxs().
   * @default 'imperative'
   */
  backend?: 'jsx' | 'imperative';

  /**
   * Imperative codegen path: 'inline' (plugin builds calls directly) or 'ir'
   * (shared build-IR + backend emit() pipeline). Same output.
   * @default 'inline'
   */
  codegen?: 'inline' | 'ir';

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
}

export interface TransformResult {
  code: string;
  map?: any;
  metadata?: TransformMetadata;
}

export interface TransformMetadata {
  hasSignals: boolean;
  hasStores: boolean;
  hasLitHTML: boolean;
  staticProps: Set<string>;
  dynamicProps: Set<string>;
  components: Set<string>;
}

export interface PropAnalysis {
  name: string;
  isStatic: boolean;
  isReactive: boolean;
  isEvent: boolean;
  isRef: boolean;
  isSpread: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const STATIC_PROPS = new Set(['key', 'ref', 'children']);

const REACTIVE_PATTERNS = [
  // Signal accessor patterns
  /\(\)\s*=>/, // Arrow function
  /function\s*\(\)/, // Function expression
  /\w+\(\)/, // Function call that might be accessor

  // Store patterns
  /\w+\.\w+/, // Property access (might be store proxy)
  /\w+\[.+\]/, // Bracket notation

  // Reactive operators
  /createSignal/,
  /createStore/,
  /createMemo/,
  /createEffect/,
];

const EVENT_PATTERN = /^on[A-Z]/;

// ============================================================================
// Prop Analysis
// ============================================================================

/**
 * Analyze a prop to determine if it's static or dynamic
 */
export function analyzeProp(name: string, value: any): PropAnalysis {
  const analysis: PropAnalysis = {
    name,
    isStatic: true,
    isReactive: false,
    isEvent: EVENT_PATTERN.test(name),
    isRef: name === 'ref',
    isSpread: name.startsWith('...'),
  };

  // Static props are always static
  if (STATIC_PROPS.has(name)) {
    return analysis;
  }

  // Events and refs are handled specially
  if (analysis.isEvent || analysis.isRef) {
    analysis.isStatic = false;
    return analysis;
  }

  // Check if value appears reactive
  if (typeof value === 'string') {
    const code = value;

    // Check for reactive patterns
    for (const pattern of REACTIVE_PATTERNS) {
      if (pattern.test(code)) {
        analysis.isStatic = false;
        analysis.isReactive = true;
        break;
      }
    }

    // Check for template literals with expressions
    if (code.includes('${')) {
      analysis.isStatic = false;
      analysis.isReactive = true;
    }
  } else if (typeof value === 'function') {
    // Functions are potentially reactive
    analysis.isStatic = false;
    analysis.isReactive = true;
  } else if (typeof value === 'object' && value !== null) {
    // Objects might contain reactive values
    analysis.isStatic = false;
  }

  return analysis;
}

/**
 * Analyze all props on an element
 */
export function analyzeProps(
  props: Record<string, any>
): Map<string, PropAnalysis> {
  const analyses = new Map<string, PropAnalysis>();

  for (const [name, value] of Object.entries(props)) {
    analyses.set(name, analyzeProp(name, value));
  }

  return analyses;
}

// ============================================================================
// Template Detection
// ============================================================================

/**
 * Check if JSX should be compiled to lit-html template
 */
export function shouldUseLitTemplate(
  tag: string,
  props: Record<string, any>,
  children: any[]
): boolean {
  // Native elements can use lit-html
  if (typeof tag !== 'string') {
    return false;
  }

  // Check if all props are compatible with lit-html
  const propAnalyses = analyzeProps(props);

  for (const analysis of propAnalyses.values()) {
    // Spread props require native JSX
    if (analysis.isSpread) {
      return false;
    }

    // Complex reactive props might be better in native JSX
    if (analysis.isReactive && !analysis.isEvent) {
      // Allow simple reactive bindings in lit-html
      // but complex ones are better in native JSX
    }
  }

  return true;
}

/**
 * Check if a value is a lit-html template
 */
export function isLitTemplate(value: any): boolean {
  return value && typeof value === 'object' && '_$litType$' in value;
}

// ============================================================================
// Code Generation Helpers
// ============================================================================

/**
 * Generate code for creating an element
 */
export function generateCreateElement(
  tag: string,
  props: Record<string, any>,
  children: any[],
  options: CompilerOptions = {}
): string {
  const isSVG = ['svg', 'path', 'circle', 'rect', 'g'].includes(tag);

  // Generate props code
  const propsCode = generatePropsCode(props, options);

  // Generate children code
  const childrenCode =
    children.length > 0 ? `, ${generateChildrenCode(children)}` : '';

  if (
    options.useLitHTML !== false &&
    shouldUseLitTemplate(tag, props, children)
  ) {
    return generateLitHTMLTemplate(tag, props, children, isSVG);
  }

  return `jsx('${tag}', ${propsCode}${childrenCode})`;
}

/**
 * Generate code for props object
 */
export function generatePropsCode(
  props: Record<string, any>,
  options: CompilerOptions = {}
): string {
  if (Object.keys(props).length === 0) {
    return '{}';
  }

  const propAnalyses = analyzeProps(props);
  const entries: string[] = [];

  for (const [name, value] of Object.entries(props)) {
    const analysis = propAnalyses.get(name)!;

    if (analysis.isReactive && !analysis.isStatic) {
      // Wrap reactive values
      entries.push(`${name}: () => ${value}`);
    } else if (typeof value === 'string') {
      entries.push(`${name}: "${value}"`);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      entries.push(`${name}: ${value}`);
    } else {
      entries.push(`${name}: ${value}`);
    }
  }

  return `{ ${entries.join(', ')} }`;
}

/**
 * Generate code for children
 */
export function generateChildrenCode(children: any[]): string {
  if (children.length === 0) {
    return 'undefined';
  }

  if (children.length === 1) {
    return String(children[0]);
  }

  return `[${children.join(', ')}]`;
}

/**
 * Generate lit-html template code
 */
export function generateLitHTMLTemplate(
  tag: string,
  props: Record<string, any>,
  children: any[],
  isSVG = false
): string {
  const templateFunc = isSVG ? 'svg' : 'html';

  // Build template string
  let template = `<${tag}`;
  const values: string[] = [];

  // Add props
  for (const [name, value] of Object.entries(props)) {
    if (name === 'children' || name === 'key' || name === 'ref') {
      continue;
    }

    const analysis = analyzeProp(name, value);

    if (analysis.isEvent) {
      const eventName = name.slice(2).toLowerCase();
      template += ` @${eventName}=\${${values.length}}`;
      values.push(String(value));
    } else if (analysis.isReactive) {
      template += ` ${name}=\${${values.length}}`;
      values.push(`signal(() => ${value})`);
    } else if (typeof value === 'string') {
      template += ` ${name}="${value}"`;
    } else {
      template += ` ${name}=\${${values.length}}`;
      values.push(String(value));
    }
  }

  template += '>';

  // Add children
  if (children.length > 0) {
    for (const child of children) {
      if (typeof child === 'string') {
        template += child;
      } else {
        template += `\${${values.length}}`;
        values.push(String(child));
      }
    }
  }

  template += `</${tag}>`;

  // Generate template literal
  return `${templateFunc}\`${template}\`${
    values.length > 0 ? `, ${values.join(', ')}` : ''
  }`;
}

// ============================================================================
// Optimization Passes
// ============================================================================

/**
 * Optimize static content
 */
export function optimizeStatic(code: string): string {
  // Combine consecutive static strings
  code = code.replace(
    /jsx\('([^']+)',\s*{},\s*"([^"]+)"\s*\)/g,
    (_, tag, text) => `_$staticNode('${tag}', '${text}')`
  );

  return code;
}

/**
 * Optimize prop spreads
 */
export function optimizeSpreads(code: string): string {
  // DISABLED: This string-based transformation was incorrectly transforming JSX spreads
  // The babel plugin handles spread attributes properly using Object.assign
  // This was causing spread(storeProxy) to be called instead of proper prop merging
  return code;
}

/**
 * Hoist static elements
 */
export function hoistStatic(code: string): string {
  const hoisted: string[] = [];
  let counter = 0;

  // Find static JSX elements
  code = code.replace(
    /jsx\('([^']+)',\s*{([^}]*)},\s*([^)]*)\)/g,
    (match, tag, props, children) => {
      // Simple heuristic: if no reactive props, hoist
      if (!props.includes('()') && !props.includes('=>')) {
        const varName = `_$static${counter++}`;
        hoisted.push(`const ${varName} = ${match};`);
        return varName;
      }
      return match;
    }
  );

  if (hoisted.length > 0) {
    return hoisted.join('\n') + '\n' + code;
  }

  return code;
}

// ============================================================================
// Event Delegation
// ============================================================================

/**
 * Generate event delegation setup
 */
export function generateEventDelegation(
  events: string[],
  options: CompilerOptions = {}
): string {
  const delegatedEvents = options.delegatedEvents || [
    'click',
    'input',
    'change',
    'submit',
  ];
  const filtered = events.filter((e) =>
    delegatedEvents.includes(e.toLowerCase())
  );

  if (filtered.length === 0) {
    return '';
  }

  return `delegateEvents([${filtered.map((e) => `'${e}'`).join(', ')}]);`;
}

// ============================================================================
// Transform Pipeline
// ============================================================================

/**
 * Transform JSX code with optimizations
 */
export function transform(
  code: string,
  options: CompilerOptions = {}
): TransformResult {
  const metadata: TransformMetadata = {
    hasSignals: /createSignal|signal\(/.test(code),
    hasStores: /createStore|store\(/.test(code),
    hasLitHTML: /html`|svg`/.test(code),
    staticProps: new Set(),
    dynamicProps: new Set(),
    components: new Set(),
  };

  let transformed = code;

  // Apply optimizations
  if (options.optimize !== false) {
    transformed = optimizeStatic(transformed);
    // optimizeSpreads is disabled - babel plugin handles spreads correctly
    // transformed = optimizeSpreads(transformed);
    transformed = hoistStatic(transformed);
  }

  // Add event delegation if needed
  if (options.delegateEvents !== false) {
    const events = extractEvents(code);
    const delegation = generateEventDelegation(events, options);
    if (delegation) {
      transformed = delegation + '\n' + transformed;
    }
  }

  // Add imports if needed
  transformed = addImports(transformed, metadata, options);

  return {
    code: transformed,
    metadata,
  };
}

/**
 * Extract event names from code
 */
function extractEvents(code: string): string[] {
  const events = new Set<string>();
  const regex = /on([A-Z][a-z]+)/g;
  let match;

  while ((match = regex.exec(code)) !== null) {
    events.add(match[1].toLowerCase());
  }

  return Array.from(events);
}

/**
 * Add necessary imports
 */
function addImports(
  code: string,
  metadata: TransformMetadata,
  options: CompilerOptions
): string {
  const imports: string[] = [];
  const source = options.importSource || '@fluixi/jsx';

  // Always import jsx basics
  imports.push(`import { jsx, jsxs, Fragment, spread } from '${source}';`);

  // Import signal directive if needed
  if (metadata.hasSignals) {
    imports.push(`import { signal } from '@fluixi/dom/reactive';`);
  }

  // Import control flow if used
  if (
    code.includes('<Show') ||
    code.includes('<For') ||
    code.includes('<Switch')
  ) {
    imports.push(
      `import { Show, For, Index, Switch, Match } from '@fluixi/dom/control-flow';`
    );
  }

  // Import event delegation if used
  if (options.delegateEvents !== false) {
    imports.push(`import { delegateEvents } from '@fluixi/dom/runtime';`);
  }

  return imports.join('\n') + '\n\n' + code;
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
        runtime: 'automatic',
        importSource: options.importSource || '@fluixi/jsx',
        pragma: options.pragma || 'jsx',
        pragmaFrag: options.pragmaFrag || 'Fragment',
        development: options.development || false,
        detectReactivity: true,
        useLitHTML: options.useLitHTML !== false,
        hoistStatics: options.optimize !== false,
        delegateEvents: options.delegateEvents !== false,
        delegatedEvents: options.delegatedEvents || [
          'click',
          'input',
          'change',
          'submit',
        ],
        optimizeControlFlow: options.optimize !== false,
        sourceMaps: options.sourceMaps !== false,
        // Codegen backend selection (default 'imperative').
        backend: options.backend || 'imperative',
        ...(options.codegen ? { codegen: options.codegen } : {}),
        ...(options.signalModule ? { signalModule: options.signalModule } : {}),
        ...(options.controlFlowModule
          ? { controlFlowModule: options.controlFlowModule }
          : {}),
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

    async transform(code: string, id: string) {
      // Load babel plugin dynamically on first transform
      const babelPlugin = await createBabelPlugin(options);
      // Only process JSX/TSX files
      // if (!/\.[jt]sx$/.test(id)) {
      if (!/\.(jsx|tsx|ts)$/i.test(id)) {
        return null;
      }

      // console.log('[createVitePlugin] Transforming file:', id);

      try {
        // Use dynamic import instead of require for ESM compatibility
        const babel = await import('@babel/core').catch(() => null);
        if (!babel) {
          // console.log('[createVitePlugin] Babel not found, using fallback');
          // Fallback to simple transform
          return {
            code: transform(code, options).code,
            map: null,
          };
        }

        // console.log('[createVitePlugin] Using babel transformation');

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
                jsxPragma: options.pragma || 'jsx',
                jsxPragmaFrag: options.pragmaFrag || 'Fragment',
                onlyRemoveTypeImports: true,
              },
            ]);
          }
        }

        // IMPORTANT: Only use our custom babel plugin for JSX transformation
        // Do NOT use @babel/preset-react as it will transform spreads with Object.assign
        // which breaks store proxy reactivity
        if (babelPlugin && babelPlugin.plugin) {
          // console.log('[createVitePlugin] Adding custom babel plugin');
          plugins.push([babelPlugin.plugin, babelPlugin.getOptions()]);
        } else {
          console.log(
            '[createVitePlugin] WARNING: Custom babel plugin not found!'
          );
        }

        // console.log('[createVitePlugin] Babel config:', {
        //   presets: presets.length,
        //   plugins: plugins.length,
        //   hasCustomPlugin: !!(babelPlugin && babelPlugin.plugin),
        // });

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
        console.error('Transform error:', e);
        // Return fallback transform on error
        try {
          return {
            code: transform(code, options).code,
            map: null,
          };
        } catch (fallbackError) {
          console.error('Fallback transform also failed:', fallbackError);
          return null;
        }
      }
    },
  } as T;
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
    const babel = tryRequire('@babel/core');
    const babelPlugin = await createBabelPlugin(options);

    if (!babel || !babelPlugin.plugin) {
      // Fallback to simple transform
      const result = transform(source, options);
      callback(null, result.code);
      return;
    }

    babel
      .transformAsync(source, {
        filename: this.resourcePath,
        plugins: [[babelPlugin.plugin, babelPlugin.getOptions()]],
        sourceMaps: options.sourceMaps !== false,
      })
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
      const babelPlugin = await createBabelPlugin(options);
      if (!/\.[jt]sx$/.test(id)) {
        return null;
      }

      try {
        const babel = tryRequire('@babel/core');
        if (!babel || !babelPlugin.plugin) {
          const result = transform(code, options);
          return {
            code: result.code,
            map: null,
          };
        }

        const result = await babel.transformAsync(code, {
          filename: id,
          plugins: [[babelPlugin.plugin, babelPlugin.getOptions()]],
          sourceMaps: options.sourceMaps !== false,
        });

        return {
          code: result?.code || code,
          map: result?.map,
        };
      } catch (e) {
        console.error('Transform error:', e);
        return null;
      }
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
      build.onLoad({ filter: /\.[jt]sx$/ }, async (args: any) => {
        const babel = tryRequire('@babel/core');
        const babelPlugin = await createBabelPlugin(options);
        const fs = require('fs');
        const source = fs.readFileSync(args.path, 'utf8');

        try {
          if (!babel || !babelPlugin.plugin) {
            const result = transform(source, options);
            return {
              contents: result.code,
              loader: 'js',
            };
          }

          const result = await babel.transformAsync(source, {
            filename: args.path,
            plugins: [[babelPlugin.plugin, babelPlugin.getOptions()]],
            sourceMaps: false,
          });

          return {
            contents: result?.code || source,
            loader: 'js',
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

export { transformServerFunctions } from './frontend/babel/server-functions.js';
import { transformServerFunctions as _txServerFns } from './frontend/babel/server-functions.js';
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
export function serverFunctionsVitePlugin<T = any>(): T {
  let root = process.cwd();
  return {
    name: 'fluixi-server-functions',
    enforce: 'pre' as const,
    configResolved(config: any) {
      root = config.root || root;
    },
    resolveId(id: string) {
      return id === SERVER_FNS_VMOD ? '\0' + SERVER_FNS_VMOD : null;
    },
    load(id: string) {
      if (id !== '\0' + SERVER_FNS_VMOD) return null;
      const mods = findServerFnModules(_join(root, 'src'));
      // Side-effect import each so its top-level $$registerServerFn(...) runs.
      return mods.map((m) => `import ${JSON.stringify(m)};`).join('\n') + '\n';
    },
    transform(code: string, id: string, opts?: { ssr?: boolean }) {
      if (!/\.[jt]sx?$/.test(id)) return null;
      if (!code.includes('use server')) return null;
      return _txServerFns(code, { ssr: !!opts?.ssr, filename: id, root });
    },
  } as T;
}

export default {
  // Analysis
  analyzeProp,
  analyzeProps,
  shouldUseLitTemplate,
  isLitTemplate,

  // Code generation
  generateCreateElement,
  generatePropsCode,
  generateChildrenCode,
  generateLitHTMLTemplate,

  // Optimization
  optimizeStatic,
  optimizeSpreads,
  hoistStatic,
  generateEventDelegation,

  // Transform
  transform,

  // Plugin creators
  createBabelPlugin,
  createTypeScriptTransformer,
  createVitePlugin,
  createWebpackLoader,
  createRollupPlugin,
  createESBuildPlugin,
};
