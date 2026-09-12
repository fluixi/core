/**
 * What the page is made of, as a tree.
 *
 * The graph answers which value depends on which. It does not answer what the page is built
 * from, and that is the question a tree is for: `<Router>` holding a `<Counter>` and an
 * `<Another>`, each openable to see what it holds.
 *
 * Both are drawn from the same nodes. A component's place in the tree is `createdIn` — the
 * node whose run made it — lifted through everything that is not itself a tag, since the
 * compiler wraps each component in a memo and that memo is not something anyone wrote.
 */
import type { NodeKind, RNode } from './instrument.js';

/** Kinds that are tags in the source, and so have a place in a tree of them. */
export const TREE_KINDS: ReadonlySet<NodeKind> = new Set<NodeKind>([
  'component',
  'control',
  'router',
  'handler',
]);

export interface TreeNode {
  id: number;
  label: string;
  kind: NodeKind;
  children: TreeNode[];
  /** A value the author declared rather than a tag they wrote. */
  value?: boolean;
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
}

/** `div.row`, `button`, `span.num` — an element as a tag, with what distinguishes it. */
function describeElement(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = [...element.classList].slice(0, 2).map((c) => `.${c}`).join('');
  return `${tag}${id}${classes}`;
}

/** How many element rows one tag may contribute, so a large page stays a tree and not a dump. */
const ELEMENT_BUDGET = 200;

function elementRow(element: Element, key: string, budget: { left: number }): Row {
  const children: Row[] = [];
  for (let i = 0; i < element.children.length && budget.left > 0; i++) {
    budget.left -= 1;
    children.push(elementRow(element.children[i]!, `${key}/${i}`, budget));
  }
  return { key, label: describeElement(element), kind: 'element', element, children };
}

/**
 * The tags in `graph`, each under the tag that made it.
 *
 * Ordered by id, which is creation order, so siblings read down the page the way they were
 * rendered. A node whose ancestors are all untagged is a root.
 */
export interface TreeOptions {
  /**
   * Also list the reactive values each tag made — the signals and memos the author wrote
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

export function componentTree(graph: Map<number, RNode>, options: TreeOptions = {}): TreeNode[] {
  const wanted = (node: RNode): boolean =>
    TREE_KINDS.has(node.kind) || (options.values === true && node.authored !== false);

  const tagged = [...graph.values()].filter(wanted).sort((a, b) => a.id - b.id);

  const made = new Map<number, TreeNode>();
  for (const node of tagged) {
    made.set(node.id, {
      id: node.id,
      label: node.label,
      kind: node.kind,
      children: [],
      ...(TREE_KINDS.has(node.kind) ? {} : { value: true }),
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
  /** Clicking a row. The host decides what selecting means — usually the inspector. */
  onSelect?: (id: number) => void;
  /** Double-clicking a row, for a host that can open the file it came from. */
  onReveal?: (id: number) => void;
  /**
   * The row under the pointer, and null on the way out. For a host that can reach the page
   * and show where the node writes. An element row gives the element itself, which needs no
   * looking up.
   */
  onHover?: (id: number | null, element?: Element) => void;
  /**
   * What each tag rendered, for listing the dom underneath it. Omitted draws tags only,
   * which is what a panel reading a snapshot from elsewhere can offer.
   */
  domFor?: (id: number) => readonly Element[];
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
  let marked: number | null = null;
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
  box.addEventListener('change', () => {
    values = box.checked;
    signature = '';
  });

  const row = (node: Row, depth: number): string => {
    const has = node.children.length > 0;
    const open = has && !shut.has(node.key);
    const twist = has ? (open ? '▾' : '▸') : '·';
    const tag = node.value
      ? escape(node.label)
      : has
        ? `&lt;${escape(node.label)}&gt;`
        : `&lt;${escape(node.label)} /&gt;`;
    const count = has && !open ? `<span class="fx-tree-count">${node.children.length}</span>` : '';
    return (
      `<div class="fx-tree-row n-${node.kind}${node.value ? ' is-value' : ''}"` +
      ` data-key="${escape(node.key)}"${node.id !== undefined ? ` data-id="${node.id}"` : ''}` +
      ` style="--depth:${depth}">` +
      `<button type="button" class="fx-tree-twist" data-twist="${escape(node.key)}"${has ? '' : ' tabindex="-1"'}>${twist}</button>` +
      `<span class="fx-tree-tag">${tag}</span>${count}` +
      `</div>` +
      (open ? node.children.map((child) => row(child, depth + 1)).join('') : '')
    );
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
    if (rowEl?.dataset.id) options.onSelect?.(Number(rowEl.dataset.id));
  };

  const onDouble = (event: Event): void => {
    const rowEl = (event.target as HTMLElement | null)?.closest?.('.fx-tree-row') as HTMLElement | null;
    if (rowEl?.dataset.id) options.onReveal?.(Number(rowEl.dataset.id));
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
    options.onHover?.(found.id ?? null, found.element);
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
      const id = (el as HTMLElement).dataset.id;
      el.classList.toggle('on', id !== undefined && Number(id) === marked);
    }
  };

  /**
   * The graph tree, with each tag's rendered dom woven into it.
   *
   * A row goes where its element is, not where the graph happened to make it. A child
   * component's root element sits inside its parent's dom, so its row goes there; a value
   * goes inside the element it writes into. That matters most for a value declared at module
   * scope — a store shared between files belongs to no component, and listing it as a root
   * says nothing about the heading it renders.
   */
  function rowsFor(nodes: readonly TreeNode[]): Row[] {
    const build = (node: TreeNode): Row => ({
      key: String(node.id),
      label: node.label,
      kind: node.kind,
      id: node.id,
      children: node.children.map(build),
      ...(node.value ? { value: true } : {}),
    });
    const roots = nodes.map(build);
    const domFor = options.domFor;
    if (!domFor) return roots;

    // Every row by the elements it covers, so the walk can hand over to any of them rather
    // than only to a child of whatever it is currently inside.
    const owners = new Map<Element, Row>();
    const written = new Map<Element, Row[]>();
    const index = (row: Row): void => {
      if (row.id !== undefined) {
        for (const element of domFor(row.id)) {
          if (row.value) {
            const held = written.get(element);
            if (held) held.push(row);
            else written.set(element, [row]);
          } else if (!owners.has(element)) {
            owners.set(element, row);
          }
        }
      }
      row.children.forEach(index);
    };
    roots.forEach(index);

    const placed = new Set<Row>();
    const expand = (row: Row): Row => {
      if (row.value || row.id === undefined) return row;
      const rendered = [...domFor(row.id)];
      if (!rendered.length) {
        row.children = row.children.map(expand);
        return row;
      }

      const budget = { left: ELEMENT_BUDGET };
      const walk = (element: Element, key: string): Row => {
        const owner = owners.get(element);
        // A tag starts here, so it stands for this element and everything under it.
        if (owner && owner !== row && !placed.has(owner)) {
          placed.add(owner);
          return expand(owner);
        }
        const kids: Row[] = [];
        // The values first: they are why this element changes at all.
        for (const value of written.get(element) ?? []) {
          if (placed.has(value)) continue;
          placed.add(value);
          kids.push(value);
        }
        for (let i = 0; i < element.children.length && budget.left > 0; i++) {
          budget.left -= 1;
          kids.push(walk(element.children[i]!, `${key}/${i}`));
        }
        return { key, label: describeElement(element), kind: 'element', element, children: kids };
      };

      const dom = rendered.map((element, i) => walk(element, `${row.id}:${i}`));
      // Whatever the dom did not account for — a portal, a value writing nowhere visible —
      // is still this row's, and is kept rather than lost.
      const rest = row.children.filter((child) => !placed.has(child)).map(expand);
      row.children = [...dom, ...rest];
      return row;
    };

    for (const root of roots) if (!placed.has(root)) expand(root);
    // A root that turned out to belong inside another is no longer a root.
    return roots.filter((root) => !placed.has(root));
  }

  return {
    render(graph, selected = null) {
      const roots = rowsFor(componentTree(graph, { values, filter }));
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
.fx-tree-count {
  font-size: 9.5px; color: var(--fx-muted, #8a90a2);
  border: 1px solid var(--fx-line, #262a35); border-radius: 6px; padding: 0 4px;
}
.fx-tree-row.n-control .fx-tree-tag { color: var(--fx-control, #c4b5fd); }
.fx-tree-row.n-router .fx-tree-tag { color: var(--fx-router, #7dd3fc); }
.fx-tree-row.n-handler .fx-tree-tag { color: var(--fx-write, #fb7185); }
.fx-tree-bar {
  display: flex; align-items: center; gap: 5px; padding: 2px 8px 5px;
  font-size: 10.5px; color: var(--fx-muted, #8a90a2); cursor: pointer; user-select: none;
}
.fx-tree-bar:hover { color: var(--fx-label, #e7e9ee); }
.fx-tree-bar input { width: 11px; height: 11px; margin: 0; accent-color: var(--fx-accent, #5eead4); }
.fx-tree-row.n-element .fx-tree-tag { color: var(--fx-muted, #8a90a2); }
.fx-tree-row.n-element:hover .fx-tree-tag { color: var(--fx-label, #e7e9ee); }
.fx-tree-row.is-value .fx-tree-tag { color: var(--fx-muted, #8a90a2); font-style: italic; }
.fx-tree-row.is-value.n-state .fx-tree-tag { color: var(--fx-state, #6ee7b7); font-style: normal; }
.fx-tree-row.is-value.n-memo .fx-tree-tag { color: var(--fx-memo, #a5b4fc); font-style: normal; }
.fx-tree-search {
  width: calc(100% - 16px); margin: 0 8px 4px; padding: 2px 6px;
  font: inherit; font-size: 10.5px;
  color: var(--fx-label, #e7e9ee); background: var(--fx-bg, #0f1115);
  border: 1px solid var(--fx-line, #262a35); border-radius: 4px;
}
.fx-tree-search:focus { outline: none; border-color: var(--fx-accent, #5eead4); }
.fx-tree-empty { display: block; padding: 8px; font-size: 11px; color: var(--fx-muted, #8a90a2); }
`;
