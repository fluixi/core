/**
 * What the page is made of, as a tree.
 *
 * The graph answers which value depends on which. It does not answer what the page is built
 * from, and that is the question a tree is for: `<Router>` holding a `<Counter>` and an
 * `<Another>`, each openable to see what it holds.
 *
 * Both are drawn from the same nodes. A component's place in the tree is `createdIn`, the
 * node whose run made it, lifted through everything that is not itself a tag, since the
 * compiler wraps each component in a memo and that memo is not something anyone wrote.
 */
import type { NodeKind, RNode } from './instrument.js';
import type { DomNode } from './dom.js';
import { pluginBadge, pluginElementBadge } from './plugin.js';
import { kindRules } from './palette.js';
import { shorten } from './format.js';

/** Kinds that are tags in the source, and so have a place in a tree of them. */
export const TREE_KINDS: ReadonlySet<NodeKind> = new Set<NodeKind>([
  'component',
  'control',
  'router',
  'handler',
  // A component a plugin recognised as providing a context. Still a tag the author wrote,
  // so leaving it out took it and everything it rendered out of the tree.
  'provider',
  // Scopes the runtime reported: what their signals and memos belong to.
  'custom-element',
  'module',
  'service',
]);

export interface TreeNode {
  id: number;
  label: string;
  kind: NodeKind;
  children: TreeNode[];
  /** A value the author declared rather than a tag they wrote. */
  value?: boolean;
  /** Came down as its own chunk. */
  lazy?: boolean;
  /** What a plugin wants said beside the label. */
  badge?: string;
}

/** A row in the drawn tree: a node from the graph, or an element one of them rendered. */
interface Row {
  /** Unique in the tree, so what is open stays open. Ids for nodes, paths for elements. */
  key: string;
  label: string;
  kind: NodeKind | 'element';
  children: Row[];
  id?: number;
  element?: Element;
  value?: boolean;
  lazy?: boolean;
  badge?: string;
  /** Element rows only: the tag whose dom this element is part of. */
  owner?: number;
  /** Element rows only: ids of the values writing into it. */
  writes?: number[];
  /** Element rows only: where the element was written. */
  at?: { file: string; line: number; column: number };
  /** Element rows only: what plugins attached to it. */
  extra?: Record<string, unknown>;
  /** A prop row: what the tag above it was handed. */
  prop?: { name: string; value?: string };
  /** The row holding a tag's props, which folds them away. */
  props?: boolean;
}

/**
 * An element row, for a host that wants to say something about one.
 *
 * An element is not a node, so it has no id to select. What it does have is the tag it
 * belongs to and the values writing into it, which between them are what there is to say.
 */
export interface ElementPick {
  /** The row key, which doubles as a path to the element. */
  key: string;
  /** The element as a selector: `div#app.card`. */
  label: string;
  owner?: number;
  writes?: number[];
  /** Where the element itself was written, when the build recorded it. */
  at?: { file: string; line: number; column: number };
  /** What plugins attached to this element. */
  extra?: Record<string, unknown>;
  /** Only in a host that is in the page. */
  element?: Element;
}

/** Whatever the host can say about the dom under a tag. Elements only when it has them. */
export type { DomNode } from './dom.js';

/**
 * The tags in `graph`, each under the tag that made it.
 *
 * Ordered by id, which is creation order, so siblings read down the page the way they were
 * rendered. A node whose ancestors are all untagged is a root.
 */
export interface TreeOptions {
  /**
   * Also list the reactive values each tag made: the signals and memos the author wrote
   * inside it. Machinery is left out: a node the framework named itself does not count, so
   * a component shows `count` and not the memo it was wrapped in.
   *
   * Only an explicit `authored: false` is machinery. A graph read from the source says
   * nothing either way, and everything in it was written by hand.
   */
  values?: boolean;
  /**
   * Keep only what this names, and whatever holds it. An ancestor is kept even when its own
   * name does not match, since dropping it would leave the match with nothing above it.
   */
  filter?: string;
}

/**
 * Put the tags that rendered back into page order, leaving everything else untouched.
 *
 * Sorting by id alone reads as creation order, which is wrong for a keyed list: rebuilding a
 * row hands the replacement the highest id, so the row you edited jumped to the bottom.
 *
 * Only the slots those tags already occupy are reshuffled. Sorting the whole list by `order`
 * instead sent every value to the end of its band, so editing a todo moved the `left` memo
 * as well, which had nothing to do with the change.
 */
export function inPageOrder<T extends { order?: number }>(nodes: T[]): T[] {
  const slots: number[] = [];
  const placed: T[] = [];
  nodes.forEach((node, at) => {
    if (node.order !== undefined) {
      slots.push(at);
      placed.push(node);
    }
  });
  if (placed.length < 2) return nodes;
  placed.sort((a, b) => a.order! - b.order!);
  const out = nodes.slice();
  slots.forEach((slot, i) => (out[slot] = placed[i]!));
  return out;
}

/** Cached per call: a plugin's badge is computed from the node and asked for twice. */
const badges = new WeakMap<RNode, string | undefined>();
function badgeOf(node: RNode): string | undefined {
  if (!badges.has(node)) badges.set(node, pluginBadge(node));
  return badges.get(node);
}

export function componentTree(graph: Map<number, RNode>, options: TreeOptions = {}): TreeNode[] {
  const wanted = (node: RNode): boolean =>
    TREE_KINDS.has(node.kind) || (options.values === true && node.authored !== false);

  const tagged = inPageOrder([...graph.values()].filter(wanted).sort((a, b) => a.id - b.id));

  const made = new Map<number, TreeNode>();
  for (const node of tagged) {
    made.set(node.id, {
      id: node.id,
      label: node.label,
      kind: node.kind,
      children: [],
      ...(TREE_KINDS.has(node.kind) ? {} : { value: true }),
      ...(node.lazy ? { lazy: true } : {}),
      ...(badgeOf(node) ? { badge: badgeOf(node) } : {}),
    });
  }

  /** The nearest ancestor that is a tag, following what created what. */
  const owner = (node: RNode): TreeNode | undefined => {
    const seen = new Set<number>([node.id]);
    let at = node.createdIn;
    while (at !== undefined && !seen.has(at)) {
      seen.add(at);
      const found = made.get(at);
      if (found) return found;
      at = graph.get(at)?.createdIn;
    }
    return undefined;
  };

  const roots: TreeNode[] = [];
  for (const node of tagged) {
    const parent = owner(node);
    if (parent) parent.children.push(made.get(node.id)!);
    else roots.push(made.get(node.id)!);
  }

  const term = options.filter?.trim().toLowerCase();
  return term ? keep(roots, term) : roots;
}

/** The nodes naming `term`, each still under whatever held it. */
function keep(nodes: readonly TreeNode[], term: string): TreeNode[] {
  const out: TreeNode[] = [];
  for (const node of nodes) {
    const children = keep(node.children, term);
    const hit = node.label.toLowerCase().includes(term);
    if (hit || children.length) out.push({ ...node, children: hit ? node.children : children });
  }
  return out;
}

/** Every id in the tree, for a caller that wants to open or shut all of it. */
export function idsIn(nodes: readonly TreeNode[]): number[] {
  const out: number[] = [];
  const walk = (list: readonly TreeNode[]): void => {
    for (const node of list) {
      out.push(node.id);
      walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

export interface ComponentTreeOptions {
  /** Clicking a row. The host decides what selecting means, usually the inspector. */
  onSelect?: (id: number) => void;
  /**
   * Clicking an element row. Elements have no id, so a host that leaves this out gets no
   * selection for them at all, which is what made half the tree look inert.
   */
  onPick?: (pick: ElementPick) => void;
  /** Double-clicking a row, for a host that can open the file it came from. */
  onReveal?: (id: number) => void;
  /** Double-clicking an element row. */
  onRevealPick?: (pick: ElementPick) => void;
  /**
   * The row under the pointer, and null on the way out. For a host that can reach the page
   * and show where the node writes. An element row gives the element itself, which needs no
   * looking up.
   */
  onHover?: (id: number | null, element?: Element, path?: string) => void;
  /**
   * What each tag rendered. A host in the page walks its own elements; one reading a
   * snapshot passes what the producer described. Omitted draws tags only.
   */
  domFor?: (id: number) => readonly DomNode[];
  /** What to say when nothing has rendered yet. */
  empty?: string;
  /** Start with the values shown. @default false */
  values?: boolean;
}

export interface ComponentTree {
  /** Draw `graph`, with `selected` marked. Cheap to call every frame. */
  render(graph: Map<number, RNode>, selected?: number | null): void;
  clear(): void;
  destroy(): void;
}

const escape = (text: string): string =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function createComponentTree(host: HTMLElement, options: ComponentTreeOptions = {}): ComponentTree {
  const empty = options.empty ?? 'nothing rendered yet';
  /** Shut by the reader. Everything else is open, so a new subtree arrives visible. */
  const shut = new Set<string>();
  let signature = '';
  /** Prop groups already given their starting fold, so reopening one is not undone. */
  const defaulted = new Set<string>();
  let marked: number | null = null;
  /** Element rows have no id, so what is selected is tracked by row key. */
  let markedKey: string | null = null;
  let values = options.values === true;
  let filter = '';

  const doc = host.ownerDocument;
  // In the pane rather than the toolbar: it belongs to the tree, and three hosts would
  // otherwise each need a button of their own for it.
  const bar = doc.createElement('label');
  bar.className = 'fx-tree-bar';
  const box = doc.createElement('input');
  box.type = 'checkbox';
  box.checked = values;
  bar.append(box, doc.createTextNode('values'));
  bar.title = 'List the signals and memos each tag declares';
  const search = doc.createElement('input');
  search.type = 'search';
  search.className = 'fx-tree-search';
  search.placeholder = 'filter by name';
  search.addEventListener('input', () => {
    filter = search.value;
    signature = '';
  });

  const list = doc.createElement('div');
  list.className = 'fx-tree-list';
  host.replaceChildren(bar, search, list);
  /** What was last drawn, so a control can redraw without waiting for the app to move. */
  let last: { graph: Map<number, RNode>; selected: number | null } | null = null;

  box.addEventListener('change', () => {
    values = box.checked;
    signature = '';
    // Clearing the signature only marks it stale. On an idle page nothing calls render
    // again, so ticking the box appeared to do nothing at all until something else changed.
    if (last) api.render(last.graph, last.selected);
  });

  const row = (node: Row, depth: number): string => {
    const has = node.children.length > 0;
    const open = has && !shut.has(node.key);
    const twist = has ? (open ? '▾' : '▸') : node.prop ? '' : '·';
    const tag = node.props
      ? `<span class="fx-tree-props-label">props</span><span class="fx-tree-props-count">${node.children.length}</span>`
      : node.prop
      ? `<span class="fx-tree-prop-name">${escape(node.prop.name)}</span>${
          node.prop.value === undefined
            ? ''
            : `<span class="fx-tree-prop-value">${escape(shorten(node.prop.value, 44))}</span>`
        }`
      : node.value
        ? escape(node.label)
        : has
          ? `&lt;${escape(node.label)}&gt;`
          : `&lt;${escape(node.label)} /&gt;`;
    const count = has && !open && !node.props ? `<span class="fx-tree-count">${node.children.length}</span>` : '';
    // Says the chunk it came from was fetched separately, which is why it appeared late.
    const chunk = node.lazy ? '<span class="fx-tree-lazy" title="loaded as its own chunk">lazy</span>' : '';
    const mark = node.badge
      ? `<span class="fx-tree-plugin" title="${escape(node.badge)}">${escape(node.badge)}</span>`
      : '';
    return (
      `<div class="fx-tree-row n-${node.kind}${node.value ? ' is-value' : ''}${node.prop ? ' is-prop' : ''}${node.props ? ' is-props' : ''}"` +
      ` data-key="${escape(node.key)}"${node.id !== undefined ? ` data-id="${node.id}"` : ''}` +
      ` style="--depth:${depth}">` +
      `<button type="button" class="fx-tree-twist" data-twist="${escape(node.key)}"${has ? '' : ' tabindex="-1"'}>${twist}</button>` +
      `<span class="fx-tree-tag"${
        node.prop?.value ? ` title="${escape(node.prop.name)}=${escape(node.prop.value)}"` : ''
      }>${tag}</span>${mark}${chunk}${count}` +
      `</div>` +
      (open ? node.children.map((child) => row(child, depth + 1)).join('') : '')
    );
  };

  /** The element a row stands for, out of what was drawn for it. */
  const pickOf = (rowEl: HTMLElement): ElementPick | undefined => {
    const found = shown.get(rowEl.dataset.key ?? '');
    if (!found || found.kind !== 'element') return undefined;
    return {
      key: found.key,
      label: found.label,
      ...(found.owner !== undefined ? { owner: found.owner } : {}),
      ...(found.writes?.length ? { writes: found.writes } : {}),
      ...(found.at ? { at: found.at } : {}),
      ...(found.extra ? { extra: found.extra } : {}),
      ...(found.element ? { element: found.element } : {}),
    };
  };

  const onClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const twist = target?.closest?.('[data-twist]') as HTMLElement | null;
    if (twist) {
      const key = twist.dataset.twist ?? '';
      if (shut.has(key)) shut.delete(key);
      else shut.add(key);
      signature = '';
      event.stopPropagation();
      return;
    }
    const rowEl = target?.closest?.('.fx-tree-row') as HTMLElement | null;
    if (!rowEl) return;
    if (rowEl.dataset.id) {
      markedKey = null;
      options.onSelect?.(Number(rowEl.dataset.id));
      return;
    }
    // A prop is not a node of its own, so selecting it selects the tag it was written on,
    // which is where its value came from and what the inspector has something to say about.
    const held = shown.get(rowEl.dataset.key ?? '');
    if (held?.props) {
      if (shut.has(held.key)) shut.delete(held.key);
      else shut.add(held.key);
      signature = '';
      if (last) api.render(last.graph, last.selected);
      return;
    }
    if (held?.prop) {
      if (held.owner === undefined) return;
      markedKey = held.key;
      paint();
      options.onSelect?.(held.owner);
      return;
    }
    const pick = pickOf(rowEl);
    if (!pick) return;
    markedKey = pick.key;
    paint();
    options.onPick?.(pick);
  };

  const onDouble = (event: Event): void => {
    const rowEl = (event.target as HTMLElement | null)?.closest?.('.fx-tree-row') as HTMLElement | null;
    if (!rowEl) return;
    if (rowEl.dataset.id) {
      options.onReveal?.(Number(rowEl.dataset.id));
      return;
    }
    const pick = pickOf(rowEl);
    if (pick) options.onRevealPick?.(pick);
  };

  /** Rows by key, so a pointer over one can be answered without searching the tree again. */
  let shown = new Map<string, Row>();

  const onOver = (event: Event): void => {
    const rowEl = (event.target as HTMLElement | null)?.closest?.('.fx-tree-row') as HTMLElement | null;
    const found = rowEl ? shown.get(rowEl.dataset.key ?? '') : undefined;
    if (!found) {
      options.onHover?.(null);
      return;
    }
    // The key doubles as a path to the element, for a host that has to ask the page to
    // highlight rather than doing it itself.
    options.onHover?.(found.id ?? null, found.element, found.id === undefined ? found.key : undefined);
  };
  const onOut = (): void => options.onHover?.(null);

  host.addEventListener('click', onClick);
  host.addEventListener('dblclick', onDouble);
  if (options.onHover) {
    host.addEventListener('pointermove', onOver);
    host.addEventListener('pointerleave', onOut);
  }

  const paint = (): void => {
    for (const el of list.querySelectorAll('.fx-tree-row')) {
      const row = el as HTMLElement;
      const id = row.dataset.id;
      const on = id !== undefined ? Number(id) === marked : row.dataset.key === markedKey;
      el.classList.toggle('on', on);
    }
  };

  /**
   * Build the rows, weaving each tag's DOM into the graph tree.
   *
   * A row goes where its element is rather than where the graph made it. A child component
   * sits inside its parent's DOM, so its row goes there; a value goes inside the element it
   * writes into. The second matters for a store declared at module scope, which belongs to
   * no component but still renders somewhere.
   */
  function rowsFor(nodes: readonly TreeNode[], graph: Map<number, RNode>): Row[] {
    const byId = new Map<number, Row>();
    const build = (node: TreeNode): Row => {
      // What the tag was handed, ahead of what it produced. A prop is the other half of the
      // story a tag tells: `<For each={todos()}>` says as much through `each` as through the
      // rows it went on to render, and every component takes them.
      const written = values ? (graph.get(node.id)?.props ?? []) : [];
      const listed: Row[] = written.map((p, i) => ({
        key: `${node.id}=${i}`,
        label: p.name,
        kind: node.kind,
        children: [],
        prop: { name: p.name, ...(p.value === undefined ? {} : { value: p.value }) },
        owner: node.id,
        ...(p.at?.line === undefined
          ? {}
          : { at: { file: p.at.file ?? '', line: p.at.line, column: p.at.column ?? 0 } }),
      }));

      // One folded row rather than a prop per line. A tag with six of them otherwise buries
      // what it rendered, which is the thing the tree is for.
      const group = `${node.id}=props`;
      // Shut the first time it is met, and whatever the reader does with it after that sticks.
      if (listed.length && !defaulted.has(group)) {
        defaulted.add(group);
        shut.add(group);
      }
      const props: Row[] = listed.length
        ? [{ key: group, label: 'props', kind: node.kind, children: listed, props: true, owner: node.id }]
        : [];

      const row: Row = {
        key: String(node.id),
        label: node.label,
        kind: node.kind,
        id: node.id,
        children: [...props, ...node.children.map(build)],
        ...(node.value ? { value: true } : {}),
        ...(node.lazy ? { lazy: true } : {}),
        ...(node.badge ? { badge: node.badge } : {}),
      };
      byId.set(node.id, row);
      return row;
    };
    const roots = nodes.map(build);
    const domFor = options.domFor;
    if (!domFor) return roots;

    const placed = new Set<Row>();
    /**
     * Rows already written into the tree. A tag is reachable two ways, down the component
     * nesting and through the element it rendered, and `expand` rewrites the row it is
     * given, so without this the second arrival appends its dom all over again.
     */
    const done = new Set<Row>();

    /**
     * How many places in the dom name each tag.
     *
     * A graph read from source has one node per component *declaration*, so two `<Badge/>`
     * both point at it. Drawing only the first would take the second out of the tree, but
     * a running graph gives each use its own node, where a tag named twice really is one
     * subtree reached two ways and the second must go. Counting tells them apart.
     */
    const uses = new Map<number, number>();
    const tally = (nodes: readonly DomNode[]): void => {
      for (const node of nodes) {
        if (node.owner !== undefined) uses.set(node.owner, (uses.get(node.owner) ?? 0) + 1);
        tally(node.children);
      }
    };
    for (const row of byId.values()) if (row.id !== undefined) tally(domFor(row.id));

    /**
     * The innermost tag row that reads `id`, if one is in this tree.
     *
     * The node doing the reading is often machinery the tree never draws: `For` does not read
     * its list, `mapArray` does, and that is hidden. So climb from whatever reads it to the
     * nearest tag that is drawn, which is the `For`.
     *
     * Deepest wins, so a value read by a component inside a `For` belongs to the component.
     * `skip` keeps the tag that declared it from adopting it back.
     */
    const readerOf = (id: number, skip: Row): Row | undefined => {
      const drawn = (from: number): Row | undefined => {
        const seen = new Set<number>();
        let at: number | undefined = from;
        while (at !== undefined && !seen.has(at)) {
          seen.add(at);
          const row = byId.get(at);
          if (row && !row.value && row !== skip) return row;
          at = graph.get(at)?.createdIn;
        }
        return undefined;
      };

      let best: Row | undefined;
      let deepest = -1;
      for (const [nodeId, node] of graph) {
        if (nodeId === id || !node.deps.has(id)) continue;
        const row = drawn(nodeId);
        if (!row || row.id === undefined) continue;
        const depth = graph.get(row.id)?.depth ?? 0;
        if (depth >= deepest) {
          deepest = depth;
          best = row;
        }
      }
      return best;
    };

    /** The same row again at another place, re-keyed so the two fold independently. */
    const again = (row: Row, key: string): Row => ({
      ...row,
      key,
      children: row.children.map((child, i) => again(child, `${key}/${i}`)),
    });

    const expand = (row: Row): Row => {
      if (row.value || row.id === undefined) return row;
      if (done.has(row)) return row;
      done.add(row);
      const dom = domFor(row.id);
      if (!dom.length) {
        row.children = row.children.map(expand);
        return row;
      }

      const walk = (node: DomNode, key: string): Row | undefined => {
        const owner = node.owner === undefined ? undefined : byId.get(node.owner);
        if (owner && owner !== row) {
          if (done.has(owner)) {
            // Named from one place only, so it is already showing where it belongs and
            // drawing it here as well would be the same subtree twice.
            const count = uses.get(node.owner!) ?? 0;
            return count > 1 ? again(owner, key) : undefined;
          }
          placed.add(owner);
          return expand(owner);
        }
        const kids: Row[] = [];
        // Values first. They are the reason this element changes.
        for (const id of node.writes ?? []) {
          const value = byId.get(id);
          if (!value?.value || placed.has(value)) continue;
          placed.add(value);
          kids.push(value);
        }
        // Then tags that render in here without an element of their own, so they read as
        // being inside it rather than next to it.
        for (const id of node.inside ?? []) {
          const tag = byId.get(id);
          if (!tag || tag === row || placed.has(tag) || done.has(tag)) continue;
          placed.add(tag);
          kids.push(expand(tag));
        }
        node.children.forEach((child, i) => {
          const kid = walk(child, `${key}/${i}`);
          if (kid) kids.push(kid);
        });
        return {
          key,
          label: node.label,
          kind: 'element',
          children: kids,
          owner: row.id,
          ...(node.writes?.length ? { writes: node.writes } : {}),
          ...(node.at ? { at: node.at } : {}),
          ...(node.extra ? { extra: node.extra } : {}),
          ...(pluginElementBadge(node.extra) ? { badge: pluginElementBadge(node.extra) } : {}),
          ...(node.element ? { element: node.element } : {}),
        };
      };

      // The mount container was on the page before anything rendered, so the tag goes inside
      // it rather than the other way round.
      const mount = dom.findIndex((node) => node.container);
      if (mount !== -1) {
        const node = dom[mount]!;
        row.children = row.children.map(expand);
        return {
          key: `${row.id}:${mount}`,
          label: node.label,
          kind: 'element',
          children: [row],
          owner: row.id,
          ...(node.at ? { at: node.at } : {}),
          ...(node.element ? { element: node.element } : {}),
        };
      }

      const rendered = dom
        .map((node, i) => walk(node, `${row.id}:${i}`))
        .filter((node): node is Row => node !== undefined);
      // Anything the dom did not account for: a portal, or a value read across a tag
      // boundary rather than written into an element here.
      //
      // Above the markup, not below it. A signal a nested tag consumes writes nowhere this
      // description reaches, so it never nests beside an element, and appending it left
      // `todos` alone at the bottom of `App` well away from the `For` that reads it.
      const rest = row.children.filter((child) => !placed.has(child)).map(expand);

      // A value the dom cannot place goes under the tag that reads it.
      //
      // `draft` nests under the `<input>` it writes into, because the description names the
      // values writing to each element. `todos` writes into no element here: `For` reads it
      // and renders the rows itself, so it had nowhere to go and sat loose under `App`. The
      // tag that depends on it is the honest place, and it reads the same way as `draft`.
      const lifted: Row[] = [];
      const spare: Row[] = [];
      /** Collected per reader so several values keep their order when they go in. */
      const adopt = new Map<Row, Row[]>();
      for (const child of rest) {
        const reader = child.value && child.id !== undefined ? readerOf(child.id, row) : undefined;
        if (reader) {
          const held = adopt.get(reader);
          if (held) held.push(child);
          else adopt.set(reader, [child]);
          placed.add(child);
          continue;
        }
        (child.value || child.prop || child.props ? lifted : spare).push(child);
      }
      // Ahead of what the tag rendered. A value reads as what the tag was given, so it
      // belongs above the rows it produced rather than after them.
      for (const [reader, values] of adopt) reader.children.unshift(...values);
      // Whatever is left: what the tag was given first, then a portal, which renders
      // elsewhere and still reads as part of the markup.
      row.children = [...lifted, ...rendered, ...spare];
      return row;
    };

    // Mapped, not just visited: expanding a root can return a different row, because the
    // container it was mounted into ends up above it.
    const top = roots.map((root) => (placed.has(root) ? root : expand(root)));
    return top.filter((_, i) => !placed.has(roots[i]!));
  }

  const api: ComponentTree = {
    render(graph, selected = null) {
      last = { graph, selected };
      const roots = rowsFor(componentTree(graph, { values, filter }), graph);
      // Rebuilt only when the shape changes: this runs every frame, and replacing the markup
      // each time would drop whatever the reader was about to click.
      const next = `${values}|${filter}|${[...shut].sort().join(',')}|${roots.map(function label(n): string {
        return `${n.key}:${n.label}:${n.children.map(label).join('+')}`;
      }).join(',')}`;
      if (next !== signature) {
        signature = next;
        shown = new Map();
        const index = (list: readonly Row[]): void => {
          for (const node of list) {
            shown.set(node.key, node);
            index(node.children);
          }
        };
        index(roots);
        list.innerHTML = roots.length
          ? roots.map((node) => row(node, 0)).join('')
          : `<span class="fx-tree-empty">${escape(filter ? `nothing named ${filter}` : empty)}</span>`;
      }
      if (selected !== marked) {
        marked = selected;
        paint();
      }
    },
    clear() {
      signature = '';
      marked = null;
      shut.clear();
      list.innerHTML = `<span class="fx-tree-empty">${escape(empty)}</span>`;
    },
    destroy() {
      host.removeEventListener('click', onClick);
      host.removeEventListener('dblclick', onDouble);
      host.removeEventListener('pointermove', onOver);
      host.removeEventListener('pointerleave', onOut);
      host.innerHTML = '';
    },
  };

  return api;
}

export const TREE_CSS = `
.fx-tree-row {
  display: flex; align-items: center; gap: 4px;
  padding: 1px 6px 1px calc(6px + var(--depth, 0) * 12px);
  font-family: ui-monospace, monospace; font-size: 11.5px;
  color: var(--fx-label, #e7e9ee); cursor: pointer; white-space: nowrap;
}
.fx-tree-row:hover { background: var(--fx-hover, #1b1e26); }
.fx-tree-row.on { background: var(--fx-sel, #232838); }
.fx-tree-twist {
  width: 12px; padding: 0; border: 0; background: none; cursor: pointer;
  color: var(--fx-muted, #8a90a2); font-size: 9px; line-height: 1;
}
.fx-tree-plugin {
  font-size: 9px; color: var(--fx-accent, #5eead4);
  border: 1px solid var(--fx-line, #262a35); border-radius: 6px; padding: 0 4px;
  max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.fx-tree-lazy {
  font-size: 9px; letter-spacing: .04em; color: var(--fx-router, #7dd3fc);
  border: 1px solid var(--fx-line, #262a35); border-radius: 6px; padding: 0 4px;
}
.fx-tree-count {
  font-size: 9.5px; color: var(--fx-muted, #8a90a2);
  border: 1px solid var(--fx-line, #262a35); border-radius: 6px; padding: 0 4px;
}
${kindRules((k) => `.fx-tree-row.n-${k} .fx-tree-tag`, 'color')}
.fx-tree-bar {
  display: flex; align-items: center; gap: 5px; padding: 2px 8px 5px;
  font-size: 10.5px; color: var(--fx-muted, #8a90a2); cursor: pointer; user-select: none;
}
.fx-tree-bar:hover { color: var(--fx-label, #e7e9ee); }
.fx-tree-bar input { width: 11px; height: 11px; margin: 0; accent-color: var(--fx-accent, #5eead4); }
.fx-tree-row.n-element:hover .fx-tree-tag { color: var(--fx-label, #e7e9ee); }
/* A declared value is listed inside the tag that made it, so it reads quieter than a tag. */
.fx-tree-row.is-value .fx-tree-tag { font-style: italic; opacity: .85; }
.fx-tree-search {
  width: calc(100% - 16px); margin: 0 8px 4px; padding: 2px 6px;
  font: inherit; font-size: 10.5px;
  color: var(--fx-label, #e7e9ee); background: var(--fx-bg, #0f1115);
  border: 1px solid var(--fx-line, #262a35); border-radius: 4px;
}
.fx-tree-search:focus { outline: none; border-color: var(--fx-accent, #5eead4); }
.fx-tree-empty { display: block; padding: 8px; font-size: 11px; color: var(--fx-muted, #8a90a2); }
/* A prop reads as what was written on the tag, so it is quieter than the tag itself. */
/* The row that folds a tag's props away. Dashed, because it stands for something written
   rather than something rendered. */
.fx-tree-row.is-props .fx-tree-tag {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 0 5px; border: 1px dashed var(--fx-line, #262a35); border-radius: 3px;
  color: var(--fx-muted, #8a90a2); font-size: 10px; letter-spacing: .04em; text-transform: uppercase;
}
.fx-tree-row.is-props:hover .fx-tree-tag { border-color: var(--fx-accent, #5eead4); color: var(--fx-label, #e7e9ee); }
.fx-tree-props-count { opacity: .7; }

/* A prop is what was written on the tag above it, so it reads as an aside: the name in a
   quiet chip, the value beside it, and no marker pretending it opens. */
.fx-tree-row.is-prop .fx-tree-tag { display: inline-flex; align-items: baseline; gap: 5px; min-width: 0; }
.fx-tree-prop-name {
  flex: none; padding: 0 4px; border-radius: 3px;
  background: var(--fx-chip, rgba(138, 144, 162, .14));
  color: var(--fx-muted, #8a90a2); font-size: 10px; letter-spacing: .02em;
}
.fx-tree-row.is-prop:hover .fx-tree-prop-name { color: var(--fx-label, #e7e9ee); }
.fx-tree-prop-value {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--fx-label, #e7e9ee); opacity: .75;
}
`;
