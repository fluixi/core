/**
 * The components the compiler supplies without an import, as data.
 *
 * Two different things have always been bundled into one hardcoded `Set` per group:
 * *which module a name comes from*, and *whether the name has special lowering*. Only
 * the first is interesting outside the compiler, and every tool needs it — the TS
 * plugin, to resolve `<Show>` for hover and go-to-definition; the language server, to
 * complete and validate tags inside `` html`…` ``; a codemod, to materialise imports.
 * Having no published source, `@fluixi/ts-plugin` duplicated the list and pinned it
 * with a test that fails when the two drift.
 *
 * So the names live here, shaped as {@link ComponentMapRule} so they compose with
 * user-configured `resolve` rules, and the compiler keeps its own sets for the parts
 * that are genuinely about codegen.
 *
 * The split matters: control-flow names cannot become ordinary rules. `Show`, `For`,
 * `Index` and `Match` read a reactive *value* prop inside their own tracking scope, so
 * the compiler emits that prop as a getter — without it `each={items()}` snapshots once
 * and never updates. They are also exempted from `createMemo` wrapping and may be
 * replaced outright by `optimizeControlFlowComponent`. A rule only injects an import,
 * so converting them would keep the import and silently drop the reactivity.
 *
 * Router components have no such behaviour — every reference to them in the plugin is
 * import plumbing — so they are a plain rule.
 */
import type { ComponentMapRule } from './component-resolver.js';

/** Where the built-in groups come from when the host does not override the module. */
export interface BuiltinModules {
  /** Control flow that lives in the DOM package. Default `@fluixi/dom`. */
  controlFlowModule?: string;
  /** Control flow that only exists in core. Default `@fluixi/core`. */
  coreModule?: string;
  /** Router components. Default `@fluixi/core/router-next`. */
  routerModule?: string;
}

/** Control flow lowered against the DOM runtime. */
export const DOM_CONTROL_FLOW = [
  'Show',
  'For',
  'Index',
  'Switch',
  'Match',
  'Portal',
  'Dynamic',
  'ErrorBoundary',
] as const;

/** Control flow that only `@fluixi/core` exports — importing it from dom resolves to nothing. */
export const CORE_CONTROL_FLOW = ['Suspense', 'SuspenseList', 'Await'] as const;

/**
 * Router components.
 *
 * `Routes` is not a component (routing is `<Router routes={…}>`) and `lazy` is a call
 * rather than a tag, so neither can be supplied this way.
 */
export const ROUTER_COMPONENTS = ['Router', 'Outlet', 'Redirect', 'Link'] as const;

/** Every name the compiler supplies without an import. */
export const BUILTIN_COMPONENTS: readonly string[] = [
  ...DOM_CONTROL_FLOW,
  ...CORE_CONTROL_FLOW,
  ...ROUTER_COMPONENTS,
];

/**
 * Names whose meaning is fixed by the compiler and cannot be reassigned by a rule.
 *
 * A rule naming one of these is a silent no-op — the compiler matches the built-in
 * first and the tag renders control flow instead of the intended component, with no
 * error. Rule authors should check against this set and report rather than emit.
 */
export const RESERVED_COMPONENTS: ReadonlySet<string> = new Set([
  ...DOM_CONTROL_FLOW,
  ...CORE_CONTROL_FLOW,
]);

/** Name → module for every built-in, honouring host module overrides. */
export function builtinComponentMap(modules: BuiltinModules = {}): Record<string, string> {
  const {
    controlFlowModule = '@fluixi/dom',
    coreModule = '@fluixi/core',
    routerModule = '@fluixi/core/router-next',
  } = modules;

  const map: Record<string, string> = {};
  for (const name of DOM_CONTROL_FLOW) map[name] = controlFlowModule;
  for (const name of CORE_CONTROL_FLOW) map[name] = coreModule;
  for (const name of ROUTER_COMPONENTS) map[name] = routerModule;
  return map;
}

/**
 * The built-ins as a resolver rule, for tools that want one uniform lookup.
 *
 * Note this is the *naming* half only. Feeding it to the compiler would not make
 * control flow work through resolution — the compiler still recognises those names
 * itself, for the codegen reasons above.
 */
export function builtinComponents(modules: BuiltinModules = {}): ComponentMapRule {
  return { components: builtinComponentMap(modules) };
}

/** Just the router group as a rule — the one group that is purely an import. */
export function routerComponents(routerModule?: string): ComponentMapRule {
  const module = routerModule ?? '@fluixi/core/router-next';
  return { components: Object.fromEntries(ROUTER_COMPONENTS.map((n) => [n, module])) };
}
