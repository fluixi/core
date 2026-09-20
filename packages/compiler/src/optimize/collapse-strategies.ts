/**
 * Strategy collapsing: demote a deferred reference whose module is already present.
 *
 * This is not a nice-to-have. Without it the naive feature is a regression: if a module
 * is referenced eagerly anywhere in the compilation unit, it is in the parent chunk
 * already, so a `load:visible` boundary elsewhere adds a wrapper, a promise and a
 * re-render in order to fetch nothing. The bytes are paid twice, once in the chunk,
 * once in the deferral machinery: and the component renders later than it needs to.
 *
 * Collapsing runs per module, not per component name, because a chunk is a module:
 * `<Button>` eager and `<ButtonGroup load:visible>` from the same package means the
 * package is already loaded, so deferring the second buys nothing.
 *
 * `never` is not collapsed. It means "no client code at all", which is a statement about
 * what should exist rather than about when to fetch it; an eager sibling does not make a
 * server-only component suddenly belong in the client bundle. That combination is
 * contradictory and reported instead.
 */
import type { IRNode, IRComponent } from '../ir/nodes.js';
import { isDeferred } from '../resolve/load-directive.js';
import { walk } from '../resolve/resolve-ir.js';

export interface CollapseReport {
  /** Modules demoted to eager, with the reference count that was demoted. */
  collapsed: Map<string, number>;
  /**
   * Modules referenced both as `load:never` and in a way that needs client code.
   * Contradictory rather than optimisable, so it is reported and left alone.
   */
  conflicted: string[];
}

/** Demote deferred references to modules that are already in the chunk. */
export function collapseStrategies(root: IRNode | IRNode[]): CollapseReport {
  const components: IRComponent[] = [];
  walk(root, (node) => {
    if (node.kind === 'component' && node.source) components.push(node);
  });

  const eager = new Set<string>();
  const never = new Set<string>();
  for (const node of components) {
    const { module, loading } = node.source!;
    if (loading.kind === 'eager') eager.add(module);
    if (loading.kind === 'never') never.add(module);
  }

  const collapsed = new Map<string, number>();
  for (const node of components) {
    const source = node.source!;
    if (!isDeferred(source.loading)) continue;
    if (!eager.has(source.module)) continue;
    source.loading = { kind: 'eager' };
    collapsed.set(source.module, (collapsed.get(source.module) ?? 0) + 1);
  }

  return {
    collapsed,
    conflicted: [...never].filter((m) => eager.has(m)),
  };
}
