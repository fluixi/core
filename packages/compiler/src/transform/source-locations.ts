/**
 * Record where each reactive primitive was created, for the devtools graph.
 *
 *   const count = signal(0);
 *   → globalThis.__fx_source?.("src/App.ts",1,14,"count"); const count = signal(0);
 *
 * A statement in front of the one that creates the node, not a wrapper round the call: the
 * call may already be being rewritten — `$signal` becomes `signal` — and two passes editing
 * one span is a splice over a splice.
 *
 * A global rather than an import, so the author's modules do not each take a dependency on
 * @fluixi/devtools to carry a debug string. Nothing installs it by default.
 *
 * Positions come from the original source, before any pass moves anything.
 *
 * Development only, and one mark per statement — the runtime keeps a single slot, so
 * marking two calls in one statement would hand the first node the second's location.
 */
import { INTRINSICS, isIntrinsicName } from '../analyze/intrinsics.js';
import { resolveReactiveBindings } from '../analyze/reactive-bindings.js';

interface Node {
  type: string;
  start: number;
  end: number;
  loc?: { start: { line: number; column: number } };
  [key: string]: any;
}

export interface SourceEdit {
  start: number;
  end: number;
  code: string;
}

export interface SourceLocationsResult {
  edits: SourceEdit[];
  /** How many creation sites were marked. */
  marked: number;
}

/** Installed by @fluixi/devtools; undefined everywhere else. */
export const SOURCE_MARKER = '__fx_source';

/** Where a component was declared. Keyed by name, since that is all the runtime carries. */
export const COMPONENT_MARKER = '__fx_component';

/** The runtime names that make a node. */
const RUNTIME_PRIMITIVES = new Set([
  'signal', 'memo', 'effect', 'store', 'resource', 'watch',
  'createSignal', 'createMemo', 'createEffect', 'createStore', 'createResource',
]);

/** Cheap enough to run before parsing. */
export function mayHaveReactiveCall(code: string): boolean {
  for (const name of RUNTIME_PRIMITIVES) {
    if (code.includes(name)) return true;
  }
  return code.includes('$signal') || code.includes('$memo') || code.includes('$effect') || code.includes('$store');
}

function isStatement(node: Node): boolean {
  return node.type.endsWith('Statement') || node.type === 'VariableDeclaration';
}

function walk(node: Node | null | undefined, visit: (n: Node, stack: Node[]) => void, stack: Node[] = []): void {
  if (!node || typeof node.type !== 'string') return;
  visit(node, stack);
  stack.push(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'parent') continue;
    const value = (node as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      for (const child of value) walk(child as Node, visit, stack);
    } else if (value && typeof (value as Node).type === 'string') {
      walk(value as Node, visit, stack);
    }
  }
  stack.pop();
}

/**
 *   const count = signal(0)      → count
 *   const [count, setCount] = …  → count, the accessor rather than the setter
 *   effect(() => …)              → nothing
 */
function nameFor(stack: Node[]): string | undefined {
  const declarator = stack[stack.length - 1];
  if (declarator?.type !== 'VariableDeclarator') return undefined;
  const id = declarator.id as Node;
  if (id?.type === 'Identifier') return id.name as string;
  if (id?.type === 'ArrayPattern') {
    const first = (id.elements as (Node | null)[])?.[0];
    if (first?.type === 'Identifier') return first.name as string;
  }
  return undefined;
}

/** A capitalised function is how JSX tells a component from an element. */
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

export function collectSourceEdits(program: unknown, filename: string): SourceLocationsResult {
  const edits: SourceEdit[] = [];
  // A single slot cannot describe more than the first primitive in a statement.
  const claimed = new Set<number>();

  const { primitives, shadowed } = resolveReactiveBindings(program);

  walk(program as Node, (node, stack) => {
    // The compiler wraps every component in a memo, and the memo is what the graph sees. It
    // has no way back to the declaration, so the declaration says where it is by name.
    const component = componentName(node);
    if (component) {
      const at = node.loc?.start;
      // After the whole statement, not after the function: `const Row = () => <b/>` ends
      // where its jsx ends, and an insertion on that boundary is inside the span the
      // template pass overwrites.
      let end = node.end;
      for (let i = stack.length - 1; i >= 0; i--) {
        const up = stack[i]!;
        if (isStatement(up) || up.type === 'ExportNamedDeclaration' || up.type === 'ExportDefaultDeclaration') {
          end = up.end;
          break;
        }
      }
      if (at) {
        edits.push({
          start: end,
          end,
          code: `;globalThis.${COMPONENT_MARKER}?.(${JSON.stringify(component)},${JSON.stringify(filename)},${at.line},${at.column});`,
        });
      }
    }

    if (node.type !== 'CallExpression') return;
    const callee = node.callee as Node;
    if (callee?.type !== 'Identifier') return;

    const name = callee.name as string;

    // The same test the intrinsics pass makes, so the two agree on what is a primitive.
    const intrinsic = isIntrinsicName(name) && !shadowed.has(name) ? INTRINSICS[name] : undefined;
    // resolveReactiveBindings has followed the import, so `signal as state` is covered and
    // a local function of the same name is not.
    const imported = primitives.has(name) || RUNTIME_PRIMITIVES.has(name);
    if (!intrinsic && !imported) return;

    const position = node.loc?.start;
    if (!position) return;

    // The mark goes in front of the statement, clear of any span another pass rewrites.
    let statement: Node | undefined;
    for (let i = stack.length - 1; i >= 0; i--) {
      if (isStatement(stack[i]!)) {
        statement = stack[i];
        break;
      }
    }
    if (!statement || claimed.has(statement.start)) return;
    claimed.add(statement.start);

    const label = nameFor(stack);
    const args = [
      JSON.stringify(filename),
      String(position.line),
      String(position.column),
      label ? JSON.stringify(label) : undefined,
    ]
      .filter((a) => a !== undefined)
      .join(',');

    edits.push({
      start: statement.start,
      end: statement.start,
      code: `globalThis.${SOURCE_MARKER}?.(${args});`,
    });
  });

  return { edits, marked: edits.length };
}
