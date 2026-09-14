// Extending what the graph knows and what a panel says about it.
//
// Collecting runs in the page and presenting runs in a panel, sometimes across a wire, so a
// plugin is two halves with json between them. What it writes is namespaced by its name, and
// a panel that lacks the plugin carries the data across untouched.
import type { NodeKind, RNode } from './instrument.js';

/** A directive the runtime applied to an element. */
export interface DirectiveReport {
  /** The node it was applied inside, usually a component. */
  owner: number | undefined;
  /** `use`, `class`, `style`, `bind`. */
  kind: string;
  /** The key after the colon, or the function name for `use:`. */
  name: string;
  element: string;
  at?: { file?: string; line?: number; column?: number };
}

/** A node a plugin contributes. Ids come from the graph so they cannot collide. */
export interface PluginNode {
  label: string;
  kind: NodeKind;
  createdIn?: number;
  deps?: number[];
  value?: string;
  source?: { file?: string; line?: number; column?: number };
}

/** What a plugin gets in the page. */
export interface CollectContext {
  onDirective(fn: (report: DirectiveReport) => void): void;
  /** Attach data under this plugin's name. Must survive JSON.stringify. */
  annotate(id: number, data: unknown): void;
  add(node: PluginNode): number;
  /** What this plugin already attached, for adding to it rather than replacing it. */
  annotation(id: number): unknown;
}

/** A line a plugin adds to the inspector. `at` makes it a link the host can open. */
export interface PluginRow {
  label: string;
  value?: string;
  at?: { file?: string; line?: number; column?: number };
}

export interface DevtoolsPlugin {
  /** Namespaces everything it writes. */
  name: string;
  /** In the page. */
  collect?(ctx: CollectContext): void;
  /** In a panel, for the selected node. Sees only what crossed the wire. */
  rows?(node: RNode, graph: Map<number, RNode>): PluginRow[];
  /** A short word next to the label, in the tree and on the card. */
  badge?(node: RNode): string | undefined;
}

const plugins: DevtoolsPlugin[] = [];

/** Replaced rather than added twice, so a module evaluated in two bundles does not double. */
export function registerDevtoolsPlugin(plugin: DevtoolsPlugin): void {
  const at = plugins.findIndex((p) => p.name === plugin.name);
  if (at === -1) plugins.push(plugin);
  else plugins[at] = plugin;
}

export function devtoolsPlugins(): readonly DevtoolsPlugin[] {
  return plugins;
}

export function annotationOf(node: RNode, name: string): unknown {
  return node.extra?.[name];
}

export function pluginRows(node: RNode, graph: Map<number, RNode>): PluginRow[] {
  const out: PluginRow[] = [];
  for (const plugin of plugins) {
    if (!plugin.rows) continue;
    // A plugin with a bug is not a reason for the panel to stop.
    try {
      out.push(...plugin.rows(node, graph));
    } catch {
      /* ignored */
    }
  }
  return out;
}

export function pluginBadge(node: RNode): string | undefined {
  for (const plugin of plugins) {
    try {
      const badge = plugin.badge?.(node);
      if (badge) return badge;
    } catch {
      /* ignored */
    }
  }
  return undefined;
}
