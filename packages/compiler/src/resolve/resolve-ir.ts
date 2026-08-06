/**
 * The resolve pass: annotate component references in the IR with where they come from.
 *
 * Runs between the frontends and the optimizer, so every later pass reads provenance off
 * the node instead of re-deriving it. Nothing here emits code — the pass only records a
 * decision, which is what lets the same answer drive import injection, chunk grouping,
 * hint planning and diagnostics without any of them agreeing by coincidence.
 *
 * Two suppliers, in precedence order:
 *
 *  1. **Control flow** (`Show`, `For`, `Switch`, …) — the name selects a lowering, so a
 *     rule cannot re-point it. Recorded as `builtin` so a later pass can tell the
 *     difference between "configured here" and "fixed by the compiler".
 *  2. **Configured rules**, then the **router built-ins**. Router components are only an
 *     import, so a project's own `Link` wins; see `builtins.ts`.
 *
 * A name bound in the file is not resolved at all: the author's import always wins, and
 * the caller supplies those bindings via `isBound`.
 */
import type { IRNode, IRComponent, IRComponentSource } from '../ir/nodes.js';
import type { ComponentResolver } from './component-resolver.js';
import { RESERVED_COMPONENTS, ROUTER_COMPONENTS, builtinComponentMap } from './builtins.js';

export interface ResolveOptions {
  /** Rules configured for the project. Omit when the project configures none. */
  resolver?: ComponentResolver;
  /** True when the name already has a binding in the file — an import the author wrote. */
  isBound?: (name: string) => boolean;
  /** Module overrides, so `routerModule` and friends are honoured. */
  modules?: Parameters<typeof builtinComponentMap>[0];
}

export interface ResolveReport {
  /** Every reference the pass annotated, by name. */
  resolved: Map<string, IRComponentSource>;
  /**
   * Capitalised tags nothing supplies and nothing binds.
   *
   * These compile to a reference to an identifier that does not exist — the build
   * succeeds and the page throws at runtime — so they are the pass's most useful
   * output for diagnostics.
   */
  unresolved: string[];
}

/** Annotate every component reference in `root`, returning what was decided. */
export function resolveComponentSources(
  root: IRNode | IRNode[],
  options: ResolveOptions = {},
): ResolveReport {
  const { resolver, isBound, modules } = options;
  const builtins = builtinComponentMap(modules);
  const resolved = new Map<string, IRComponentSource>();
  const unresolved = new Set<string>();

  const annotate = (node: IRComponent): void => {
    const { name } = node;
    // A dotted path (`Ctx.Provider`) or a dynamic tag needs its root binding, which is
    // an ordinary expression the author wrote — nothing to supply.
    if (!name || name.includes('.')) return;
    if (isBound?.(name)) return;

    const source = sourceFor(name);
    if (!source) {
      unresolved.add(name);
      return;
    }
    node.source = source;
    resolved.set(name, source);
  };

  const sourceFor = (name: string): IRComponentSource | undefined => {
    // Control flow first: the name is fixed by the compiler.
    if (RESERVED_COMPONENTS.has(name)) {
      return { module: builtins[name]!, export: name, origin: 'builtin' };
    }
    const rule = resolver?.resolve(name);
    if (rule) return { module: rule.module, export: rule.export, origin: 'rule' };
    if (ROUTER_COMPONENTS.includes(name as (typeof ROUTER_COMPONENTS)[number])) {
      return { module: builtins[name]!, export: name, origin: 'builtin' };
    }
    return undefined;
  };

  walk(root, (node) => {
    if (node.kind === 'component') annotate(node);
  });

  return { resolved, unresolved: [...unresolved] };
}

/** Depth-first walk over every node that can contain children. */
export function walk(root: IRNode | IRNode[], visit: (node: IRNode) => void): void {
  const nodes = Array.isArray(root) ? root : [root];
  for (const node of nodes) {
    visit(node);
    const children = (node as { children?: IRNode[] }).children;
    if (children) walk(children, visit);
  }
}
