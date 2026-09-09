/**
 * The reactive graph of a project, read out of the source instead of run.
 *
 * An approximation: a dependency means "this memo's body names that signal". It cannot know
 * values, run counts or which branch ran, but it answers with nothing started.
 *
 * Shaped like the snapshot @fluixi/devtools puts on the wire so the same renderer draws both.
 * Nothing here imports that package.
 */
import { parse } from '@babel/parser';
import { INTRINSICS, isIntrinsicName } from './intrinsics.js';
import { resolveReactiveBindings } from './reactive-bindings.js';
import { CORE_CONTROL_FLOW, DOM_CONTROL_FLOW, ROUTER_COMPONENTS } from '../resolve/builtins.js';

interface Node {
  type: string;
  start: number;
  end: number;
  loc?: { start: { line: number; column: number } };
  [key: string]: any;
}

export type StaticNodeKind =
  | 'state'
  | 'memo'
  | 'effect'
  | 'store'
  | 'resource'
  | 'component'
  /** Control flow the framework supplies: `Show`, `For`, `Switch`, `Suspense`, `Await`. */
  | 'control'
  /** The router's own tags: `Router`, `Outlet`, `Link`, `Redirect`. */
  | 'router'
  /** A server route handler — `GET`, `POST` in an api file. Not a component. */
  | 'handler';

export interface StaticNode {
  id: number;
  label: string;
  kind: StaticNodeKind;
  /** Ids this one names in its body. */
  deps: number[];
  writes: number[];
  /** Never run, so never pulsed. A renderer reads this as "nothing has happened yet". */
  runs: number;
  lastPulse: number;
  source: { file: string; line: number; column: number };
  /** The component whose body declares it. */
  createdIn?: number;
  /** Where this value is written into the document. */
  targets?: StaticDomTarget[];
}

/** Where a value reaches the document, read from the jsx rather than from a running page. */
export interface StaticDomTarget {
  /** `content` for a hole between tags, `attribute` for one in a prop. */
  kind: 'content' | 'attribute';
  /** The attribute name, when it is one. */
  name?: string;
  /** The element as written: `span.num`, `div#root`. */
  element: string;
  /** Where the hole is, in the author's file. */
  source: { file: string; line: number; column: number };
}

export interface StaticGraph {
  t: number;
  nodes: StaticNode[];
  /** Says what this graph is, for a panel that draws both kinds. */
  static: true;
}

export interface StaticGraphFile {
  path: string;
  code: string;
}

/** What each runtime primitive produces. */
const PRIMITIVE_KIND: Record<string, StaticNodeKind> = {
  signal: 'state',
  createSignal: 'state',
  memo: 'memo',
  createMemo: 'memo',
  effect: 'effect',
  createEffect: 'effect',
  store: 'store',
  createStore: 'store',
  resource: 'resource',
  createResource: 'resource',
};

/** A kind that reads something, and so can have dependencies. */
const READS = new Set<StaticNodeKind>(['memo', 'effect', 'resource']);

/**
 * `<Show when={ready()}>` is a memo over `ready` at runtime, so it is a node here too.
 * Nothing declares these names locally, so without the set every branch and list is invisible.
 * Taken from the resolver rather than copied, so the two cannot drift.
 */
const DIRECTIVES: ReadonlySet<string> = new Set<string>([
  ...DOM_CONTROL_FLOW,
  ...CORE_CONTROL_FLOW,
  // The router is supplied without an import too. Without these, an app whose root renders
  // `<Router>` has a root component connected to nothing at all.
  ...ROUTER_COMPONENTS,
]);

/**
 * The one prop each tracks. `fallback` and `children` are content: counting them would make a
 * branch depend on everything inside it. A name absent here reads nothing of its own.
 */
const TRACKED_PROP: Record<string, string> = {
  Router: 'routes',
  Link: 'href',
  Redirect: 'to',
  Show: 'when',
  Match: 'when',
  For: 'each',
  Index: 'each',
  Dynamic: 'component',
  Portal: 'mount',
  Await: 'value',
};

/**
 * A framework tag is never one of the author's components.
 *
 * The two groups come from the resolver, so a name added there is drawn as framework here
 * without this list having to be remembered.
 */
const ROUTER: ReadonlySet<string> = new Set<string>(ROUTER_COMPONENTS);
const directiveKind = (tag: string): StaticNodeKind => (ROUTER.has(tag) ? 'router' : 'control');

/**
 * An http method name is a route handler, not a component.
 *
 * They are capitalised, which is the only thing telling a component from a helper, so an api
 * file arrived in the graph as two components called GET and POST.
 */
const HTTP_METHODS: ReadonlySet<string> = new Set([
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS',
]);

function walk(node: Node | null | undefined, visit: (n: Node, stack: Node[]) => void, stack: Node[] = []): void {
  if (!node || typeof node.type !== 'string') return;
  visit(node, stack);
  stack.push(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'parent') continue;
    const value = node[key];
    if (Array.isArray(value)) for (const child of value) walk(child as Node, visit, stack);
    else if (value && typeof (value as Node).type === 'string') walk(value as Node, visit, stack);
  }
  stack.pop();
}

/** `const count = signal(0)` → count; `const [count] = createSignal(0)` → count. */
function declaredName(stack: Node[]): string | undefined {
  const declarator = [...stack].reverse().find((n) => n.type === 'VariableDeclarator');
  const id = declarator?.id as Node | undefined;
  if (id?.type === 'Identifier') return id.name as string;
  if (id?.type === 'ArrayPattern') {
    const first = (id.elements as (Node | null)[])?.[0];
    if (first?.type === 'Identifier') return first.name as string;
  }
  return undefined;
}

/** A capitalised function is what tells a component from a helper. */
function componentName(node: Node): string | undefined {
  if (node.type === 'FunctionDeclaration') {
    const name = (node.id as Node | undefined)?.name as string | undefined;
    return name && name[0] === name[0]?.toUpperCase() ? name : undefined;
  }
  if (node.type === 'VariableDeclarator') {
    const id = node.id as Node;
    const init = node.init as Node | undefined;
    if (id?.type !== 'Identifier' || !init) return undefined;
    if (init.type !== 'ArrowFunctionExpression' && init.type !== 'FunctionExpression') return undefined;
    const name = id.name as string;
    return name[0] === name[0]?.toUpperCase() ? name : undefined;
  }
  return undefined;
}

/** Every identifier a subtree mentions, which is as close to "reads" as reading gets. */
function mentions(node: Node): Set<string> {
  const names = new Set<string>();
  walk(node, (n, stack) => {
    if (n.type !== 'Identifier') return;
    const parent = stack[stack.length - 1];
    // `props.count` names props, not count; `{ count: 1 }` names neither.
    if (parent?.type === 'MemberExpression' && parent.property === n && !parent.computed) return;
    if (parent?.type === 'ObjectProperty' && parent.key === n && !parent.computed) return;
    names.add(n.name as string);
  });
  return names;
}

/** `<Show when={ready()}>` → the `ready()` expression, or nothing when the prop is static. */
/**
 * `span.num`, `div#root` — the element as written.
 *
 * Static attributes only: a class computed at runtime is not something the source can name,
 * and guessing would put a lie on the card.
 */
function describeJsx(opening: Node): string {
  const tag = ((opening.name as Node)?.name as string) ?? 'element';
  let id = '';
  const classes: string[] = [];
  for (const attr of (opening.attributes as Node[]) ?? []) {
    if (attr.type !== 'JSXAttribute') continue;
    const name = (attr.name as Node)?.name as string;
    const value = attr.value as Node | undefined;
    if (value?.type !== 'StringLiteral') continue;
    if (name === 'id') id = `#${value.value}`;
    else if (name === 'class' || name === 'className') {
      classes.push(...String(value.value).split(/\s+/).filter(Boolean).slice(0, 2));
    }
  }
  return `${tag}${id}${classes.map((c) => `.${c}`).join('')}`;
}

function trackedExpression(opening: Node, prop: string): Node | undefined {
  for (const attr of (opening.attributes as Node[]) ?? []) {
    if (attr.type !== 'JSXAttribute' || (attr.name as Node)?.name !== prop) continue;
    const value = attr.value as Node | undefined;
    return value?.type === 'JSXExpressionContainer' ? (value.expression as Node) : undefined;
  }
  return undefined;
}

/** A tag, resolved to a declaration once every file has been read. */
interface Usage {
  tag: string;
  file: string;
  owner: number;
}

/**
 * `{ path: '/', component: RootLayout }` — a component named by a route table.
 *
 * A route is the one place a component is used without ever being written as a tag. The table
 * is usually a module-level constant, so the owner is not known where the reference is: it is
 * whichever component passes the table to a router. Recorded against the constant's name and
 * resolved when something mentions it.
 */
interface RouteRef {
  /** The variable holding the table. */
  via: string;
  tag: string;
  file: string;
}

interface Pending {
  node: StaticNode;
  /** The names its body mentions, resolved to ids once every file has been read. */
  reads: Set<string>;
  file: string;
}

/**
 * Files are analysed independently, then joined: an imported name resolves to the node the
 * exporting file declared under it, which connects a store to the memo reading it elsewhere.
 */
export function analyzeReactiveGraph(files: readonly StaticGraphFile[]): StaticGraph {
  const pending: Pending[] = [];
  /** file → exported name → id, for resolving an import. */
  const exported = new Map<string, Map<string, number>>();
  /** file → local name → id, for resolving a reference in the same file. */
  const locals = new Map<string, Map<string, number>>();
  /** file → local name → the file it was imported from. */
  const imports = new Map<string, Map<string, string>>();
  /** Component tags, resolved after every file: a tag may name a component read later. */
  const usages: Usage[] = [];
  const routeRefs: RouteRef[] = [];
  /** Holes, resolved to the nodes they name once every file has been read. */
  const holes: { file: string; name: string; target: StaticDomTarget }[] = [];
  /**
   * What each component's body names. Kept apart from `reads`, which becomes dependency
   * edges — a component mentioning a route table does not depend on it reactively.
   */
  const componentMentions = new Map<number, Set<string>>();
  let seq = 0;

  for (const file of files) {
    if (!/\.(tsx?|jsx?)$/.test(file.path)) continue;

    let program: Node;
    try {
      program = parse(file.code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
        errorRecovery: true,
      }).program as unknown as Node;
    } catch {
      // A file that does not parse is one being typed in.
      continue;
    }

    const { primitives, shadowed } = resolveReactiveBindings(program);
    const here = new Map<string, number>();
    const sold = new Map<string, number>();
    const from = new Map<string, string>();
    locals.set(file.path, here);
    exported.set(file.path, sold);
    imports.set(file.path, from);

    /** The component a node sits inside, by the id of its declaration. */
    const components = new Map<Node, number>();

    // Components first: a primitive needs the id of the body it sits in.
    walk(program, (node, stack) => {
      const name = componentName(node);
      const at = node.loc?.start;
      if (!name || !at) return;
      const id = seq++;
      components.set(node, id);
      here.set(name, id);
      componentMentions.set(id, mentions(node));
      pending.push({
        node: {
          id,
          label: name,
          kind: HTTP_METHODS.has(name) ? 'handler' : 'component',
          deps: [],
          writes: [],
          runs: 0,
          lastPulse: 0,
          source: { file: file.path, line: at.line, column: at.column },
        },
        reads: new Set(),
        file: file.path,
      });
    });

    walk(program, (node, stack) => {
      if (node.type === 'ImportDeclaration') {
        const source = (node.source as Node)?.value as string;
        for (const spec of (node.specifiers as Node[]) ?? []) {
          const local = (spec.local as Node)?.name as string;
          if (local && source?.startsWith('.')) from.set(local, source);
        }
        return;
      }

      if (node.type !== 'CallExpression') return;
      const callee = node.callee as Node;
      if (callee?.type !== 'Identifier') return;

      const name = callee.name as string;
      // A local function called `effect` is not one of ours.
      const intrinsic = name.startsWith('$') && isIntrinsicName(name) && !shadowed.has(name);
      if (!intrinsic && !primitives.has(name)) return;
      const kind = PRIMITIVE_KIND[intrinsic ? name.slice(1) : name];
      const at = node.loc?.start;
      if (!kind || !at) return;

      const id = seq++;
      const label = declaredName(stack) ?? `${kind}${id}`;
      here.set(label, id);

      // The nearest enclosing component owns it, the way the runtime's does.
      let owner: number | undefined;
      for (let i = stack.length - 1; i >= 0; i--) {
        const found = components.get(stack[i]!);
        if (found !== undefined) {
          owner = found;
          break;
        }
      }

      pending.push({
        node: {
          id,
          label,
          kind,
          deps: [],
          writes: [],
          runs: 0,
          lastPulse: 0,
          source: { file: file.path, line: at.line, column: at.column },
          ...(owner !== undefined ? { createdIn: owner } : {}),
        },
        // Only what reads can read: a signal's initial value is not a dependency.
        reads: READS.has(kind) ? mentions(node.arguments?.[0] as Node) : new Set<string>(),
        file: file.path,
      });
    });

    // A component used inside another belongs to it, as the running graph shows it.
    walk(program, (node, stack) => {
      if (node.type !== 'JSXOpeningElement') return;
      const tag = (node.name as Node)?.name as string | undefined;
      if (!tag || tag[0] !== tag[0]?.toUpperCase()) return;

      // Nearest enclosing body, so a <Match> sits under its <Switch>.
      let owner: number | undefined;
      for (let i = stack.length - 1; i >= 0; i--) {
        const found = components.get(stack[i]!);
        if (found !== undefined) {
          owner = found;
          break;
        }
      }

      // A locally declared or relatively imported name is that component, not control flow.
      const own = here.has(tag) || from.has(tag);
      if (!own && DIRECTIVES.has(tag)) {
        const at = node.loc?.start;
        if (!at) return;
        const id = seq++;
        const prop = TRACKED_PROP[tag];
        const tracked = prop ? trackedExpression(node, prop) : undefined;
        // Nested directives look this up by the element that contains this tag.
        const element = stack[stack.length - 1];
        if (element?.type === 'JSXElement') components.set(element, id);
        pending.push({
          node: {
            id,
            label: tag,
            kind: directiveKind(tag),
            deps: [],
            writes: [],
            runs: 0,
            lastPulse: 0,
            source: { file: file.path, line: at.line, column: at.column },
            ...(owner !== undefined ? { createdIn: owner } : {}),
          },
          reads: tracked ? mentions(tracked) : new Set<string>(),
          file: file.path,
        });
        return;
      }

      if (owner !== undefined) usages.push({ tag, file: file.path, owner });
    });

    // Where each value reaches the document. The live graph gets this from the dom layer as
    // it wires the binding; the source has it written down.
    walk(program, (node, stack) => {
      if (node.type !== 'JSXExpressionContainer') return;
      const expr = node.expression as Node;
      if (!expr || expr.type === 'JSXEmptyExpression') return;
      const at = expr.loc?.start;
      if (!at) return;

      const parent = stack[stack.length - 1];
      const attribute = parent?.type === 'JSXAttribute' ? ((parent.name as Node)?.name as string) : undefined;
      // The tag this sits in: its own for an attribute, the enclosing one for a hole.
      const holder = [...stack]
        .reverse()
        .find((n) => n.type === 'JSXElement' || n.type === 'JSXOpeningElement');
      const opening =
        holder?.type === 'JSXOpeningElement' ? holder : (holder?.openingElement as Node | undefined);
      if (!opening) return;

      const target: StaticDomTarget = {
        kind: attribute ? 'attribute' : 'content',
        ...(attribute ? { name: attribute } : {}),
        element: describeJsx(opening),
        source: { file: file.path, line: at.line, column: at.column },
      };
      for (const name of mentions(expr)) holes.push({ file: file.path, name, target });
    });

    // A route table names its components rather than writing them as tags.
    walk(program, (node, stack) => {
      if (node.type !== 'ObjectProperty' || node.computed) return;
      const key = (node.key as Node)?.name ?? (node.key as Node)?.value;
      if (key !== 'component' && key !== 'Component') return;
      const value = node.value as Node;
      if (value?.type !== 'Identifier') return;
      const holder = [...stack].reverse().find((n) => n.type === 'VariableDeclarator');
      const via = (holder?.id as Node | undefined)?.name as string | undefined;
      if (via) routeRefs.push({ via, tag: value.name as string, file: file.path });
    });

    // What a module exports under a name is what another module gets by importing it.
    walk(program, (node) => {
      if (node.type !== 'ExportNamedDeclaration' && node.type !== 'ExportDefaultDeclaration') return;
      for (const name of here.keys()) sold.set(name, here.get(name)!);
    });
  }

  // A name into an id, in the file that used it and then in the file it imported it from.
  const resolve = (file: string, name: string): number | undefined => {
    const local = locals.get(file)?.get(name);
    if (local !== undefined) return local;
    const source = imports.get(file)?.get(name);
    if (!source) return undefined;
    for (const [path, names] of exported) {
      if (!sameModule(file, source, path)) continue;
      const id = names.get(name);
      if (id !== undefined) return id;
    }
    return undefined;
  };

  for (const entry of pending) {
    const deps = new Set<number>();
    for (const name of entry.reads) {
      const id = resolve(entry.file, name);
      if (id !== undefined && id !== entry.node.id) deps.add(id);
    }
    entry.node.deps = [...deps];
  }

  // Last, so a component used before its own file was read still finds it.
  // `resolve` config and auto-import mean a tag can have no import to follow. One declaration
  // of the name is unambiguous; two is a guess, and a wrong owner is worse than none.
  const unique = new Map<string, number | null>();
  for (const names of exported.values()) {
    for (const [name, id] of names) unique.set(name, unique.has(name) ? null : id);
  }

  const byId = new Map(pending.map((p) => [p.node.id, p.node]));

  for (const hole of holes) {
    const id = resolve(hole.file, hole.name);
    const node = id !== undefined ? byId.get(id) : undefined;
    // Only what the graph draws a value for: a tag is not a binding.
    if (!node || node.kind === 'component') continue;
    (node.targets ??= []).push(hole.target);
  }

  // A component that mentions the table is the one that renders what the table names.
  for (const ref of routeRefs) {
    const named = resolve(ref.file, ref.tag) ?? unique.get(ref.tag) ?? undefined;
    if (named === undefined) continue;
    const holder = pending.find(
      (p) =>
        p.file === ref.file &&
        (p.node.kind === 'component' || p.node.kind === 'handler') &&
        p.node.id !== named &&
        componentMentions.get(p.node.id)?.has(ref.via),
    )?.node.id;
    const node = byId.get(named);
    if (node && node.createdIn === undefined && holder !== undefined) node.createdIn = holder;
  }

  for (const use of usages) {
    const id = resolve(use.file, use.tag) ?? unique.get(use.tag) ?? undefined;
    if (id === undefined || id === use.owner) continue;
    const node = byId.get(id);
    // First use wins: a component used twice is one declaration either way.
    if (node && node.kind === 'component' && node.createdIn === undefined) node.createdIn = use.owner;
  }

  return { t: Date.now(), nodes: pending.map((p) => p.node), static: true };
}

/**
 * `./cart` from `src/app.tsx` is `src/cart.ts`. Both sides lose their extension: ESM wants
 * `./cart.js` for a file written `cart.ts`, so as written they never match.
 */
const withoutExtension = (path: string): string => path.replace(/\.(tsx?|jsx?|mts|cts|mjs|cjs)$/, '');

function sameModule(importer: string, specifier: string, candidate: string): boolean {
  const base = importer.includes('/') ? importer.slice(0, importer.lastIndexOf('/')) : '';
  const parts = (base ? base.split('/') : []).concat(specifier.split('/'));
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  const resolved = withoutExtension(stack.join('/'));
  const target = withoutExtension(candidate);
  // A directory import: `./cart` is `src/cart/index.ts`.
  return target === resolved || target === `${resolved}/index`;
}
