/**
 * Record where each reactive primitive was created, for the devtools graph.
 *
 *   const count = signal(0);
 *   → globalThis.__fx_source?.("src/App.ts",1,14,"count"); const count = signal(0);
 *
 * A statement in front of the one that creates the node, not a wrapper round the call: the
 * call may already be being rewritten: `$signal` becomes `signal`, and two passes editing
 * one span is a splice over a splice.
 *
 * A global rather than an import, so the author's modules do not each take a dependency on
 * @fluixi/devtools to carry a debug string. Nothing installs it by default.
 *
 * Positions come from the original source, before any pass moves anything.
 *
 * Development only, and one mark per statement: the runtime keeps a single slot, so
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

/**
 * Where a class that extends another was declared, keyed by the class itself: a custom
 * element's definition, which the runtime can only reach through `element.constructor`.
 */
export const CLASS_MARKER = '__fx_class';

/**
 * Where one reactive hole was written. This one wraps: the position has to travel with the
 * accessor to wherever the dom wires it up. A template is emitted as one overwrite, so the
 * source map has a single entry for the root and every hole traces back to it.
 *
 * `?? (f => f)` and not `?.()`: the value is the accessor, and returning undefined would
 * delete the binding.
 */
export const HOLE_MARKER = '__fx_hole';

/**
 * `_(() => x(), 9, 25)`, or the accessor untouched when nothing is watching.
 *
 * `name` is the source text the value came from, for a `ref` where knowing which variable
 * holds the element is the whole question.
 */
export const markHole = (
  accessor: string,
  line: number,
  column: number,
  name?: string,
): string =>
  `(globalThis.${HOLE_MARKER} ?? ((f) => f))(${accessor},${line},${column}${
    name === undefined ? '' : `,${JSON.stringify(name)}`
  })`;

/**
 * Where each prop of a component tag was written.
 *
 * The props object is built as getters, so nothing in it can carry a position of its own.
 * The marker takes the object and a name-to-position map, and hands the object straight
 * back: devtools keeps the map, and a build without it passes the object through.
 */
export const PROPS_MARKER = '__fx_props';

/** `_({ get a() {...} }, {"a":[9,25]})`, or the object untouched when nothing is watching. */
export const markProps = (object: string, at: Record<string, [number, number]>): string =>
  `(globalThis.${PROPS_MARKER} ?? ((p) => p))(${object},${JSON.stringify(at)})`;

/** The runtime names that make a node. */
const RUNTIME_PRIMITIVES = new Set([
  'signal', 'memo', 'effect', 'store', 'resource', 'watch',
  'createSignal', 'createMemo', 'createEffect', 'createStore', 'createResource',
]);

/** Whether a module has anything to mark: a primitive call or a subclass. Cheap enough to run before parsing. */
export function mayHaveSourceMarks(code: string): boolean {
  for (const name of RUNTIME_PRIMITIVES) {
    if (code.includes(name)) return true;
  }
  if (code.includes('$signal') || code.includes('$memo') || code.includes('$effect') || code.includes('$store')) return true;
  // A subclass gets a declaration mark, so an element with no signal of its own is still found.
  return /\bclass\b[^{;]*\bextends\b/.test(code);
}

/** Positions where the grammar allows exactly one statement, so a second one changes it. */
const SINGLE_STATEMENT_PARENTS = new Set([
  'IfStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement',
  'WhileStatement', 'DoWhileStatement', 'LabeledStatement', 'WithStatement',
]);

function isLoneBranch(statement: Node, parent?: Node): boolean {
  if (!parent || statement.type === 'BlockStatement') return false;
  return SINGLE_STATEMENT_PARENTS.has(parent.type);
}

function isExport(node: Node): boolean {
  return node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration';
}

/** Where a class holds a per-instance initializer: the value of a field. */
const CLASS_FIELDS = new Set(['PropertyDefinition', 'ClassProperty', 'ClassPrivateProperty', 'AccessorProperty']);

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
 *   const [count, setCount] = ...  → count, the accessor rather than the setter
 *   effect(() => ...)              → nothing
 */
function nameFor(stack: Node[]): string | undefined {
  const declarator = stack[stack.length - 1];
  // `#count = signal(0)` and `count = signal(0)`: the field's name, without the `#`.
  if (declarator && CLASS_FIELDS.has(declarator.type)) {
    const key = declarator.key as Node | undefined;
    if (key?.type === 'Identifier' || key?.type === 'PrivateIdentifier' || key?.type === 'PrivateName') {
      const name = (key.name ?? (key.id as Node | undefined)?.name) as string | undefined;
      return name;
    }
    return undefined;
  }
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
      // After the whole declaration, not after the function: `const Row = () => <b/>` ends
      // where its jsx ends, and an insertion on that boundary is inside the span the
      // template pass overwrites.
      //
      // Only through what wraps a declaration. Anything else above it is a block or an
      // argument list, and a statement appended there lands outside the grammar , 
      // `function Page(){}` inside `it('...', () => { ... })` ended up between the `}` and the
      // `)`, which is a syntax error in a file that compiled a moment earlier.
      let end = node.end;
      for (let i = stack.length - 1; i >= 0; i--) {
        const up = stack[i]!;
        if (
          up.type !== 'VariableDeclaration' &&
          up.type !== 'ExportNamedDeclaration' &&
          up.type !== 'ExportDefaultDeclaration'
        ) {
          break;
        }
        end = up.end;
      }
      if (at) {
        edits.push({
          start: end,
          end,
          code: `;globalThis.${COMPONENT_MARKER}?.(${JSON.stringify(component)},${JSON.stringify(filename)},${at.line},${at.column});`,
        });
      }
    }

    // A static block at the top of the body runs once, when the class is defined, with `this`
    // bound to the class. Only a subclass: that covers every custom element and keeps the mark
    // off plain classes. An ambient `declare class` has no body to run.
    if ((node.type === 'ClassDeclaration' || node.type === 'ClassExpression') && node.superClass && !node.declare) {
      const at = node.loc?.start;
      const body = node.body as Node | undefined;
      if (at && body) {
        edits.push({
          start: body.start + 1,
          end: body.start + 1,
          code: `static{globalThis.${CLASS_MARKER}?.(this,${JSON.stringify(filename)},${at.line},${at.column});}`,
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

    // A class field (`#count = signal(0)`) runs once per instance, and the class body has no
    // statement to put the mark in front of. Hoisting it before the class runs it once, at
    // definition, and the next node created anywhere took its name and line; inside a function
    // (a mixin) the nearest statement was the function's body block, and the mark landed in
    // front of the `{`. The call itself carries the mark instead, so it runs right before the
    // node it describes.
    for (let i = stack.length - 1; i >= 0; i--) {
      const up = stack[i]!;
      if (isStatement(up)) break;
      if (CLASS_FIELDS.has(up.type)) {
        if (claimed.has(node.start)) return;
        claimed.add(node.start);
        const label = nameFor(stack);
        // An instance field also hands over `this`: the constructor runs before a custom
        // element opens its scope, and the instance is what ties the node to it later.
        const own = !(up as { static?: boolean }).static;
        const args = [
          JSON.stringify(filename),
          String(position.line),
          String(position.column),
          label ? JSON.stringify(label) : own ? 'undefined' : undefined,
          own ? 'this' : undefined,
        ]
          .filter((a) => a !== undefined)
          .join(',');
        edits.push({ start: node.start, end: node.start, code: `(globalThis.${SOURCE_MARKER}?.(${args}),` });
        edits.push({ start: node.end, end: node.end, code: ')' });
        return;
      }
    }

    // The mark goes in front of the statement, clear of any span another pass rewrites.
    let statement: Node | undefined;
    let parent: Node | undefined;
    let index = -1;
    for (let i = stack.length - 1; i >= 0; i--) {
      if (isStatement(stack[i]!) || isExport(stack[i]!)) {
        statement = stack[i];
        parent = stack[i - 1];
        index = i;
        break;
      }
    }
    if (!statement) return;

    // `export const [cart] = createStore(...)` finds the declaration, which starts after the
    // keyword: a mark there splits `export` from what it exports.
    let start = statement.start;
    let end = statement.end;
    for (let i = index - 1; i >= 0; i--) {
      if (!isExport(stack[i]!)) break;
      start = stack[i]!.start;
      end = stack[i]!.end;
      parent = stack[i - 1];
    }

    if (claimed.has(start)) return;
    claimed.add(start);

    const label = nameFor(stack);
    const args = [
      JSON.stringify(filename),
      String(position.line),
      String(position.column),
      label ? JSON.stringify(label) : undefined,
    ]
      .filter((a) => a !== undefined)
      .join(',');

    const mark = `globalThis.${SOURCE_MARKER}?.(${args});`;

    // `if (c) effect(...)` has one statement where the grammar allows one statement, so
    // putting the mark in front of it moves the branch body out of the branch. Braces are
    // added around both rather than skipping the mark.
    if (isLoneBranch(statement, parent)) {
      edits.push({ start, end: start, code: `{${mark}` });
      edits.push({ start: end, end, code: '}' });
      return;
    }

    edits.push({ start, end: start, code: mark });
  });

  return { edits, marked: edits.length };
}
