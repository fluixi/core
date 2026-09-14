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
  /** The element as a selector. */
  element: string;
  /** The element itself. Only in the page, and the key to annotate it by. */
  target?: unknown;
  at?: { file?: string; line?: number; column?: number };
}

/** A node a plugin contributes. Ids come from the graph so they cannot collide. */
export interface PluginNode {
  label: string;
  kind: NodeKind;
  createdIn?: number;
  deps?: number[];
  /** Short enough for a card. */
  value?: string;
  /** The whole of it, for the inspector. */
  detail?: string;
  /**
   * Whether the application wrote this or the framework did. False folds it into the
   * machinery card, the way an unnamed memo is folded.
   */
  authored?: boolean;
  source?: { file?: string; line?: number; column?: number };
}

/** A context provided or read. */
export interface ContextReport {
  /** The node it happened in. */
  owner: number | undefined;
  /** Identity of the context, stable for its lifetime. */
  id: symbol;
  /** What the symbol was created with, when it says anything. */
  name: string;
  /** Label of the node it happened in, for naming a context nobody named. */
  ownerLabel?: string;
  /** Where the context was written, and whether that was inside a package. */
  at?: { file?: string; line?: number; column?: number; external?: boolean };
  kind: 'provide' | 'read';
  /** Formatted, since a panel elsewhere cannot hold the value itself. Not yet clipped. */
  value?: string;
}

/** What a plugin gets in the page. */
export interface CollectContext {
  onDirective(fn: (report: DirectiveReport) => void): void;
  onContext(fn: (report: ContextReport) => void): void;
  /** Attach data under this plugin's name. Must survive JSON.stringify. */
  annotate(id: number, data: unknown): void;
  /**
   * The same, for an element rather than a node. A directive belongs to the element it was
   * applied to, and an element is not a node, so it is keyed by the element itself and
   * lands on the description a panel draws.
   */
  annotateElement(target: unknown, data: unknown): void;
  /** What this plugin already attached to an element. */
  elementAnnotation(target: unknown): unknown;
  add(node: PluginNode): number;
  /**
   * Say what a plain component really is. A component that exists to provide a context is a
   * provider, and nothing but the plugin watching the context can know that. Ignored for a
   * node the framework already named: a Router that provides one is still a Router.
   */
  retype(id: number, kind: NodeKind): void;
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
  /** The same, for an element row. Given what plugins attached to that element. */
  elementBadge?(extra: Record<string, unknown>): string | undefined;
  /** Rows for a selected element row. */
  elementRows?(extra: Record<string, unknown>): PluginRow[];
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

export function pluginElementRows(extra?: Record<string, unknown>): PluginRow[] {
  if (!extra) return [];
  const out: PluginRow[] = [];
  for (const plugin of plugins) {
    if (!plugin.elementRows) continue;
    try {
      out.push(...plugin.elementRows(extra));
    } catch {
      /* ignored */
    }
  }
  return out;
}

export function pluginElementBadge(extra?: Record<string, unknown>): string | undefined {
  if (!extra) return undefined;
  for (const plugin of plugins) {
    try {
      const badge = plugin.elementBadge?.(extra);
      if (badge) return badge;
    } catch {
      /* ignored */
    }
  }
  return undefined;
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
