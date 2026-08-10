/**
 * @fileoverview Babel front-end for the Fluixi compiler.
 * @module @fluixi/babel-plugin-jsx
 *
 * This is a host adapter, not the compiler. It parses with babel and, for each
 * JSX element/fragment and each `` html`...` `` template, hands the node to the
 * shared pipeline — build IR, run the imperative backend — then splices the
 * emitted code back into the program. Everything that decides *what* the output
 * means (directives, control flow, component resolution, load strategies,
 * reactivity, templates) lives in ../../{ir,resolve,optimize,codegen}, which
 * import no babel at all.
 *
 * What stays here is genuinely host work: dispatching the visitors, collecting
 * the runtime symbols the backend reported so the imports can be injected, and
 * hoisting static templates to module scope.
 */

import { declare } from '@babel/helper-plugin-utils';
import {
  createComponentResolver,
  type ComponentResolverRule,
  type ResolvedComponent,
  type ComponentResolver,
} from '../../resolve/component-resolver.js';
import { resolveComponentSources } from '../../resolve/resolve-ir.js';
import { collapseStrategies } from '../../optimize/collapse-strategies.js';
import { isDeferred, type IRLoadStrategy } from '../../resolve/load-directive.js';
import {
  CORE_CONTROL_FLOW,
  ROUTER_COMPONENTS as ROUTER_COMPONENT_NAMES,
} from '../../resolve/builtins.js';
import { types as t, template, type PluginObj } from '@babel/core';
import { buildIR } from './build-ir.js';
import { buildIRFromLit } from './build-ir-lit.js';
import { imperativeBackend } from '../../codegen/backends/imperative.js';
import type { IRNode } from '../../ir/nodes.js';

// ============================================================================
// Types
// ============================================================================

export interface PluginOptions {
  /**
   * Import source for the JSX types and for whatever JSX this plugin does not
   * consume — esbuild's automatic runtime and TypeScript's `jsxImportSource`
   * both point at it. The compiler itself never emits `jsx()` calls.
   * @default '@fluixi/jsx'
   */
  importSource?: string;

  /**
   * Enable development mode with additional checks
   * @default false
   */
  development?: boolean;

  /**
   * Enable event delegation
   * @default true
   */
  delegateEvents?: boolean;

  /**
   * Generate source maps
   * @default true
   */
  sourceMaps?: boolean;

  /**
   * Module name for signal directive
   * @default '@fluixi/dom'
   */
  signalModule?: string;

  /**
   * Module name for control flow
   * @default '@fluixi/dom'
   */
  controlFlowModule?: string;

  /**
   * Module the router components (Router/Outlet/…) are auto-imported from.
   * @default '@fluixi/core/router-next'
   */
  routerModule?: string;
  /** Clone static subtrees from a template. Client-only — see CompilerOptions. */
  templateClone?: boolean;
  /** Also clone structure-static subtrees with holes. See CompilerOptions. */
  partialTemplates?: boolean;

  /**
   * Rules that resolve an unbound capitalised tag to a module, so a component can be
   * used without an import — the configurable form of the built-in
   * Suspense/Portal/Router auto-import.
   *
   * A lexical binding always wins, so an explicit import or a local variable is never
   * overridden. With no rules, behaviour is exactly as before.
   */
  resolve?: readonly ComponentResolverRule[];

  /**
   * Where reactive primitives (createMemo) are imported from — the signal core,
   * not the dom runtime.
   * @default '@fluixi/reactive/signal'
   */
  reactiveModule?: string;

  /**
   * Which authoring syntaxes to compile:
   * - 'jsx': only JSX elements/fragments.
   * - 'lit': only `` html`...` `` / `` svg`...` `` tagged templates.
   * - 'both' (default): JSX and `html``` templates in the same file.
   *
   * Both syntaxes lower to the same IR and the same imperative backend, so the
   * choice is about which source forms the plugin touches, not about output.
   * @default 'both'
   */
  format?: 'jsx' | 'lit' | 'both';

  /**
   * Tag name that marks a lit template for compilation (when `format` includes
   * lit). Other tagged templates are left untouched.
   * @default 'html'
   */
  litTag?: string;
}

interface PluginStateData {
  hasJSX: boolean;
  hasLitHTML: boolean;
  needsControlFlowImport: boolean;
  needsCreateMemo: boolean;
  controlFlowComponents: Set<string>;
  /** name -> module for tags resolved by the `resolve` rules (not control flow). */
  resolvedComponents: Map<string, ResolvedComponent>;
  /** Components emitted as `deferred(() => import(...))` rather than a static import. */
  deferredComponents: Map<string, { module: string; export: string; strategy: IRLoadStrategy }>;
  /** Shared by the JSX visitor and the html`` IR walk so both resolve identically. */
  componentResolver: ComponentResolver;
  delegatedEvents: Set<string>;
  /** html -> module-scope template identifier, deduped per file. */
  staticTemplates: Map<string, string>;
  staticCounter: number;
  libModule: string;
  /** Module overrides, so the resolve pass reports the same targets codegen uses. */
  controlFlowModule: string;
  routerModule: string;
  templateClone: boolean;
  partialTemplates: boolean;
  /** runtime symbols the backend reported emitting, for import injection */
  irImports: Set<string>;
  needsCreateNativeElement?: boolean;
  needsInsert?: boolean;
  needsSpread?: boolean;
  needsCreateComponent?: boolean;
  needsMergeProps?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

// Control-flow components that live in @fluixi/core, NOT @fluixi/dom — they must
// be auto-imported from core (dom doesn't export them).
const CORE_ONLY_CONTROL_FLOW = new Set<string>(CORE_CONTROL_FLOW);

// Router components auto-imported (from routerModule) the same way control flow is:
// use `<Router>`/`<Outlet>`/… in a template and the import is injected if absent.
const ROUTER_COMPONENTS = new Set<string>(ROUTER_COMPONENT_NAMES);


// ============================================================================
// Main Plugin
// ============================================================================

export default declare((api, options: PluginOptions = {}): PluginObj => {
  api.assertVersion(7);

  const {
    delegateEvents = true,
    signalModule = '@fluixi/dom',
    controlFlowModule = '@fluixi/dom',
    routerModule = '@fluixi/core/router-next',
    reactiveModule = '@fluixi/reactive/signal',
    templateClone = true,
    partialTemplates = true,
    // `both` by default: JSX and html`` are compiled out of the box, so
    // `fluixi()` needs no `format` option. Injected imports are deduped, so a
    // file mixing the two styles won't redeclare a binding.
    format = 'both',
    litTag = 'html',
    resolve: resolveRules = [],
  } = options;

  // Built once per plugin instance, not per file: the rules are static and the
  // resolver memoises lookups, so every file in the build shares one cache.
  const componentResolver = createComponentResolver(resolveRules);

  const compileLit = format === 'lit' || format === 'both';

  const pluginState: PluginStateData = {
    irImports: new Set<string>(),
    libModule: '@fluixi/core',
    controlFlowModule,
    routerModule,
    templateClone,
    partialTemplates,
    hasJSX: false,
    hasLitHTML: false,
    needsControlFlowImport: false,
    needsCreateMemo: false,
    controlFlowComponents: new Set(),
    resolvedComponents: new Map(),
    deferredComponents: new Map(),
    componentResolver,
    delegatedEvents: new Set(),
    staticTemplates: new Map(),
    staticCounter: 0,
  };

  return {
    name: '@fluixi/babel-plugin-jsx',

    manipulateOptions(opts, parserOpts) {
      // Enable JSX parsing
      parserOpts.plugins.push('jsx', 'typescript');
    },

    pre(state) {
      // Initialize plugin state
      Object.assign(state, pluginState);
    },

    visitor: {
      // Map @fluixi/core/rx imports to @fluixi/reactive for client-side code
      ImportDeclaration(path, state: any) {
        const source = path.node.source.value;

        // Map @fluixi/core/rx to @fluixi/reactive (client-side reactive primitives)
        if (source === '@fluixi/core/rx') {
          path.node.source = t.stringLiteral('@fluixi/reactive');
        }

        // Also handle fluixi server imports - keep as is for SSR
        // @fluixi/core/server stays as is (includes server reactive mappings)
      },

      Program: {
        enter(path, state: any) {
          // Reset state for new file
          Object.assign(state, {
            hasJSX: false,
            hasLitHTML: false,
            hasLitIR: false,
            needsControlFlowImport: false,
            needsCreateMemo: false,
            controlFlowComponents: new Set(),
            resolvedComponents: new Map(),
            deferredComponents: new Map(),
            componentResolver,
            delegatedEvents: new Set(),
            staticTemplates: new Map(),
            staticCounter: 0,
            libModule: '@fluixi/core',
            controlFlowModule,
            routerModule,
            templateClone,
            partialTemplates,
            irImports: new Set<string>(),
            needsCreateNativeElement: false,
            needsInsert: false,
            needsSpread: false,
            needsCreateComponent: false,
            needsMergeProps: false,
          });
        },

        exit(path, state: any) {
          const imports: t.ImportDeclaration[] = [];

          if (state.hasJSX || state.hasLitIR) {
            if (state.irImports.size > 0) {
              // Import exactly the symbols emit() reported, splitting control-flow
              // components to the control-flow module.
              const CF = new Set([
                'Show', 'For', 'Index', 'Switch', 'Match',
                'Dynamic', 'ErrorBoundary', 'Portal', 'Suspense',
              ]);
              // Reactive primitives come from the signal core, not the dom module.
              const REACTIVE = new Set([
                'createMemo', 'createEffect', 'createRenderEffect', 'createRoot',
                'createSignal', 'onCleanup', 'batch', 'untrack',
              ]);
              const all = Array.from(state.irImports as Set<string>);
              const spec = (n: string) =>
                t.importSpecifier(t.identifier(n), t.identifier(n));
              const unbound = (s: string) => !path.scope.hasBinding(s);
              const reactive = all.filter((s) => REACTIVE.has(s) && unbound(s));
              const core = all.filter((s) => !CF.has(s) && !REACTIVE.has(s) && unbound(s));
              const cf = all.filter((s) => CF.has(s) && unbound(s));
              if (reactive.length > 0) {
                imports.push(
                  t.importDeclaration(reactive.map(spec), t.stringLiteral(reactiveModule)),
                );
              }
              if (core.length > 0) {
                imports.push(
                  t.importDeclaration(core.map(spec), t.stringLiteral(signalModule)),
                );
              }
              if (cf.length > 0) {
                imports.push(
                  t.importDeclaration(cf.map(spec), t.stringLiteral(controlFlowModule)),
                );
              }
            }

            // createMemo (wraps conditionals/components) is a reactive primitive,
            // so it comes from the reactive module, not dom.
            if (state.needsCreateMemo && !path.scope.hasBinding('createMemo')) {
              imports.push(
                t.importDeclaration(
                  [t.importSpecifier(t.identifier('createMemo'), t.identifier('createMemo'))],
                  t.stringLiteral(reactiveModule),
                ),
              );
            }

            // Add control flow imports for auto-transformed components (Show, etc.)
            // Only add components that aren't already bound in the file scope.
            if (
              state.needsControlFlowImport &&
              state.controlFlowComponents.size > 0
            ) {
              const unbound = (Array.from(state.controlFlowComponents) as string[]).filter(
                (name) => !path.scope.hasBinding(name),
              );
              // Suspense/SuspenseList live in @fluixi/core, not @fluixi/dom, so
              // they must be auto-imported from core (importing them from the dom
              // controlFlowModule would resolve to nothing). Everything else comes
              // from controlFlowModule.
              const coreModule = state.libModule ?? '@fluixi/core';
              const fromRouter = unbound.filter((n) => ROUTER_COMPONENTS.has(n));
              const fromCore = unbound.filter((n) => CORE_ONLY_CONTROL_FLOW.has(n));
              const fromDom = unbound.filter(
                (n) => !CORE_ONLY_CONTROL_FLOW.has(n) && !ROUTER_COMPONENTS.has(n),
              );
              const declFor = (names: string[], mod: string) =>
                t.importDeclaration(
                  names.map((name) => t.importSpecifier(t.identifier(name), t.identifier(name))),
                  t.stringLiteral(mod),
                );
              if (fromDom.length > 0) imports.push(declFor(fromDom, controlFlowModule));
              if (fromCore.length > 0) imports.push(declFor(fromCore, coreModule));
              if (fromRouter.length > 0) imports.push(declFor(fromRouter, routerModule));
            }

            // Imports for tags matched by the `resolve` rules. Same binding guard as
            // control flow: a hand-written import or a local of the same name wins, so
            // enabling resolution can never change what an existing file means.
            //
            // Grouped by module so several components from one package share a single
            // declaration, and emitted with the local name equal to the tag — the
            // generated code refers to the tag, not to the export.
            // Deferred components become value bindings, not imports: a literal
            // `import()` is what lets the bundler split, hash and tree-shake the chunk
            // as ordinary behaviour rather than as an integration.
            const deferredDecls: t.Statement[] = [];
            if (state.deferredComponents.size > 0) {
              for (const [local, entry] of state.deferredComponents as Map<
                string,
                { module: string; export: string; strategy: IRLoadStrategy }
              >) {
                if (path.scope.hasBinding(local)) continue;
                deferredDecls.push(
                  t.variableDeclaration('const', [
                    t.variableDeclarator(
                      t.identifier(local),
                      t.callExpression(t.identifier('deferred'), [
                        t.arrowFunctionExpression(
                          [],
                          t.callExpression(t.import(), [t.stringLiteral(entry.module)]),
                        ),
                        t.objectExpression([
                          t.objectProperty(
                            t.identifier('strategy'),
                            strategyLiteral(entry.strategy),
                          ),
                          t.objectProperty(
                            t.identifier('export'),
                            t.stringLiteral(entry.export),
                          ),
                        ]),
                      ]),
                    ),
                  ]),
                );
              }
              if (deferredDecls.length > 0 && !path.scope.hasBinding('deferred')) {
                imports.push(
                  t.importDeclaration(
                    [t.importSpecifier(t.identifier('deferred'), t.identifier('deferred'))],
                    t.stringLiteral(state.libModule ?? '@fluixi/core'),
                  ),
                );
              }
            }

            if (state.resolvedComponents.size > 0) {
              const byModule = new Map<string, Array<{ local: string; exported: string }>>();
              for (const [local, resolved] of state.resolvedComponents as Map<
                string,
                ResolvedComponent
              >) {
                if (path.scope.hasBinding(local)) continue;
                const list = byModule.get(resolved.module) ?? [];
                list.push({ local, exported: resolved.export });
                byModule.set(resolved.module, list);
              }
              for (const [mod, entries] of byModule) {
                imports.push(
                  t.importDeclaration(
                    entries.map(({ local, exported }) =>
                      exported === 'default'
                        ? t.importDefaultSpecifier(t.identifier(local))
                        : t.importSpecifier(t.identifier(local), t.identifier(exported)),
                    ),
                    t.stringLiteral(mod),
                  ),
                );
              }
            }

            // Add event delegation setup if needed
            if (delegateEvents && state.delegatedEvents.size > 0) {
              imports.push(
                t.importDeclaration(
                  [
                    t.importSpecifier(
                      t.identifier('delegateEvents'),
                      t.identifier('delegateEvents')
                    ),
                  ],
                  t.stringLiteral(signalModule),
                )
              );

              // Add delegateEvents call at top of program
              const eventsArray = t.arrayExpression(
                (Array.from(state.delegatedEvents) as string[]).map((event) =>
                  t.stringLiteral(event)
                )
              );
              const delegateCall = t.expressionStatement(
                t.callExpression(t.identifier('delegateEvents'), [eventsArray])
              );
              path.node.body.unshift(delegateCall);
            }

            // Before imports are unshifted, so the
            // final order is: imports, deferred bindings, everything else.
            if (deferredDecls.length > 0) {
              path.node.body.unshift(...deferredDecls);
            }

            // Static templates, parsed once per module rather than per instance.
            if (state.staticTemplates.size > 0) {
              const decls: t.Statement[] = [];
              for (const [key, name] of state.staticTemplates as Map<string, string>) {
                const svg = key.startsWith('svg:');
                const html = svg ? key.slice(4) : key;
                decls.push(
                  t.variableDeclaration('const', [
                    t.variableDeclarator(
                      t.identifier(name),
                      // Just the HTML. Parsing is deferred to `templateNode`, which
                      // knows whether this is a server render, a hydration or a fresh
                      // client render — a module-scope `createTemplate` would touch
                      // `document` at import time and break SSR outright.
                      t.stringLiteral(html),
                    ),
                  ]),
                );
              }
              path.node.body.unshift(...decls);
            }
          }

          // Add all imports at the top, deduped. When a file mixes inline JSX
          // and html`` (format 'both'), the two injection paths can each emit an
          // import for the same module/name — merge per-module and drop repeated
          // specifiers so we never redeclare a binding.
          if (imports.length > 0) {
            path.node.body.unshift(...dedupeImports(imports));
          }
        },
      },

      // Both JSX forms take the one path: build IR, run the imperative backend,
      // splice the emitted code back in. It handles the whole subtree, so nothing
      // below this node needs its own visitor.
      JSXElement(path, state: any) {
        state.hasJSX = true;
        path.replaceWith(emitViaIR(path.node, state));
      },

      JSXFragment(path, state: any) {
        state.hasJSX = true;
        path.replaceWith(emitViaIR(path.node, state));
      },

      TaggedTemplateExpression(path, state) {
        // `html`...`` and `svg`...`` lower through the same IR and the same
        // backend as JSX — one pipeline, two authoring syntaxes.
        if (
          compileLit &&
          t.isIdentifier(path.node.tag) &&
          (path.node.tag.name === litTag || path.node.tag.name === 'svg')
        ) {
          path.replaceWith(emitLitViaIR(path.node, state));
        }
      },
    },
  };
});

// ============================================================================
// JSX Transformation
// ============================================================================

/**
 * Two usages of one component in the same file share a binding, so their strategies
 * have to agree. The earlier-loading one wins: the module is in whichever chunk loads
 * first regardless, so deferring the other buys nothing — the same reasoning as the
 * collapse pass, applied within a file.
 */
/**
 * What to do with JSX or a template found inside an expression: resolve its
 * component references and record what the module needs, exactly as the
 * top-level node gets. The IR itself is emitted and dropped by the walk, so
 * anything not taken off it here is lost — which is how `{(b) => <Input/>}`
 * came out referring to a component nothing imported.
 */
function nestedHook(state: any) {
  return (ir: IRNode): void => {
    resolveComponentSources(ir, {
      resolver: state.componentResolver,
      modules: {
        controlFlowModule: state.controlFlowModule,
        coreModule: state.libModule,
        routerModule: state.routerModule,
      },
      strategyFor: (node) => node.load,
    });
    collapseStrategies(ir);
    collectRuntimeNeeds(ir, state);
  };
}

/** The strategy as an object literal the runtime can read. */
function strategyLiteral(strategy: IRLoadStrategy): t.ObjectExpression {
  const props: t.ObjectProperty[] = [
    t.objectProperty(t.identifier('kind'), t.stringLiteral(strategy.kind)),
  ];
  if (strategy.kind === 'visible' && strategy.rootMargin) {
    props.push(t.objectProperty(t.identifier('rootMargin'), t.stringLiteral(strategy.rootMargin)));
  }
  if (strategy.kind === 'interaction') {
    props.push(
      t.objectProperty(
        t.identifier('events'),
        t.arrayExpression(strategy.events.map((e) => t.stringLiteral(e))),
      ),
    );
  }
  if (strategy.kind === 'media') {
    props.push(t.objectProperty(t.identifier('query'), t.stringLiteral(strategy.query)));
  }
  return t.objectExpression(props);
}

/**
 * Hoist the backend's static templates to module scope and rewrite the emitted code to
 * reference them. Deduped by HTML, so a subtree repeated in a file is parsed once.
 */
function adoptTemplates(
  code: string,
  templates: { id: string; html: string; svg: boolean }[] | undefined,
  state: any,
): string {
  if (!templates || templates.length === 0) return code;

  const rename = new Map<string, string>();
  for (const tpl of templates) {
    const key = `${tpl.svg ? 'svg:' : ''}${tpl.html}`;
    let name = state.staticTemplates.get(key);
    if (!name) {
      name = `_tmpl$${state.staticTemplates.size}`;
      state.staticTemplates.set(key, name);
    }
    rename.set(tpl.id, name);
  }

  // One pass, not one replacement per id. The backend's local ids and the hoisted names
  // share the `_tmpl$N` namespace, so replacing them in sequence can rewrite a name that
  // an earlier replacement just produced — which silently points a template at another
  // template's HTML.
  return code.replace(/_tmpl\$\d+/g, (id) => rename.get(id) ?? id);
}

function emitViaIR(node: t.JSXElement | t.JSXFragment, state: any): t.Expression {
  // `used` collects runtime symbols emitted for JSX nested inside expressions
  // (render-props, ternaries, fallback={<p/>}, …) so we import them too.
  const used = new Set<string>();
  const ir = buildIR(node, used, nestedHook(state));
  // The same passes the lit path runs. Without them `codegen: 'ir'` silently skipped
  // resolution entirely — a resolved tag compiled to a reference with no import.
  resolveComponentSources(ir, {
    resolver: state.componentResolver,
    modules: {
      controlFlowModule: state.controlFlowModule,
      coreModule: state.libModule,
      routerModule: state.routerModule,
    },
    strategyFor: (n) => n.load,
  });
  collapseStrategies(ir);
  const { code, imports, templates } = imperativeBackend.emit(ir, { templateClone: state.templateClone, partialTemplates: state.partialTemplates } as any);
  for (const s of imports) used.add(s);
  for (const s of used) state.irImports.add(s);
  collectRuntimeNeeds(ir, state);
  const adopted = adoptTemplates(code, templates, state);
  return template.expression(adopted, { placeholderPattern: false, plugins: ['typescript'] })() as t.Expression;
}

/**
 * Merge injected import declarations so no module/name pair is imported twice.
 * Named imports from the same module collapse into one declaration with unique
 * specifiers; anything non-trivial (default/namespace/side-effect) passes through
 * untouched. Order is preserved by first appearance.
 */
function dedupeImports(imports: t.ImportDeclaration[]): t.ImportDeclaration[] {
  const byModule = new Map<string, { decl: t.ImportDeclaration; names: Set<string> }>();
  const out: t.ImportDeclaration[] = [];
  for (const decl of imports) {
    const source = decl.source.value;
    const allNamed = decl.specifiers.every((s) => t.isImportSpecifier(s));
    if (!allNamed) { out.push(decl); continue; }
    const existing = byModule.get(source);
    if (!existing) {
      const names = new Set(
        decl.specifiers.map((s) => ((s as t.ImportSpecifier).local.name)),
      );
      byModule.set(source, { decl, names });
      out.push(decl);
      continue;
    }
    for (const s of decl.specifiers as t.ImportSpecifier[]) {
      if (!existing.names.has(s.local.name)) {
        existing.names.add(s.local.name);
        existing.decl.specifiers.push(s);
      }
    }
  }
  return out;
}

/**
 * Lit-pipeline path: build IR from a `` html`...` `` template, emit through the
 * imperative backend, reparse. Mirrors emitViaIR — the whole point is that lit
 * and JSX share one IR + one backend. Collects runtime imports and the delegated
 * events used so Program.exit wires them.
 */
function emitLitViaIR(node: t.TaggedTemplateExpression, state: any): t.Expression {
  const used = new Set<string>();
  const svg = t.isIdentifier(node.tag) && node.tag.name === 'svg';
  const ir = buildIRFromLit(node, used, { svg, onNested: nestedHook(state) });
  // Resolve pass: annotate each component reference with where it comes from, before
  // codegen. Bindings are not checked here — Program.exit knows the whole file's scope
  // and drops any injected import whose name turns out to be bound.
  resolveComponentSources(ir, {
    resolver: state.componentResolver,
    modules: {
      controlFlowModule: state.controlFlowModule,
      coreModule: state.libModule,
      routerModule: state.routerModule,
    },
    strategyFor: (node) => node.load,
  });
  // Demote deferred references whose module is already in this chunk: a lazy boundary
  // around something already present adds a wrapper, a promise and a re-render to
  // fetch nothing.
  collapseStrategies(ir);
  const { code, imports, templates } = imperativeBackend.emit(ir, { templateClone: state.templateClone, partialTemplates: state.partialTemplates } as any);
  for (const s of imports) used.add(s);
  for (const s of used) state.irImports.add(s);
  collectRuntimeNeeds(ir, state);
  state.hasLitIR = true;

  // The IR is emitted as a string and reparsed, so the resulting nodes carry no
  // position — which is why compiled html`` had no source map at all. Give every
  // generated node the template's own location so a breakpoint or stack frame
  // lands on the template instead of nowhere.
  const expression = template.expression(adoptTemplates(code, templates, state), {
    placeholderPattern: false,
    plugins: ['typescript'],
  })() as t.Expression;
  inheritLocation(expression, node);
  return expression;
}

/**
 * Copy a source position onto generated nodes that lack one.
 *
 * Coarse by construction: everything lowered from one template maps back to that
 * template. Per-hole precision would mean carrying spans through the emit, which
 * the string round-trip discards.
 */
function inheritLocation(target: t.Node, source: t.Node): void {
  if (!source.loc) return;
  const seen = new Set<t.Node>();

  const walk = (node: t.Node): void => {
    if (seen.has(node)) return;
    seen.add(node);
    if (!node.loc) {
      node.loc = source.loc;
      node.start = source.start;
      node.end = source.end;
    }
    for (const key of t.VISITOR_KEYS[node.type] ?? []) {
      const child = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const c of child) if (c && typeof c === 'object' && 'type' in c) walk(c as t.Node);
      } else if (child && typeof child === 'object' && 'type' in child) {
        walk(child as t.Node);
      }
    }
  };
  walk(target);
}

/**
 * Walk the lit IR for things Program.exit wires: delegated events (-> the
 * delegateEvents([...]) call) and control-flow component names used as tags
 * (-> auto-import from the control-flow module, like the inline JSX path).
 */
function collectRuntimeNeeds(node: IRNode, state: any): void {
  if (node.kind === 'component' && node.source) {
    // Provenance was decided by the resolve pass and recorded on the node; this only
    // translates it into the two things Program.exit wires. Reading it here rather
    // than re-resolving is the point — one decision, so import injection and every
    // later pass cannot disagree.
    if (node.source.origin === 'builtin') {
      state.controlFlowComponents.add(node.name);
      state.needsControlFlowImport = true;
    } else if (isDeferred(node.source.loading) && !state.resolvedComponents.has(node.name)) {
      state.deferredComponents.set(node.name, {
        module: node.source.module,
        export: node.source.export,
        strategy: node.source.loading,
      });
    } else {
      state.deferredComponents.delete(node.name);
      state.resolvedComponents.set(node.name, {
        module: node.source.module,
        export: node.source.export,
      });
    }
  }
  if (node.kind === 'element' || node.kind === 'component' || node.kind === 'control') {
    if ('props' in node) {
      for (const p of node.props) {
        if (p.kind === 'event' && p.event?.delegated) state.delegatedEvents.add(p.event.name);
      }
    }
  }
  if ('children' in node && node.children) {
    for (const c of node.children) collectRuntimeNeeds(c, state);
  }
}

