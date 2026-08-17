/**
 * Which names in a module hold reactive values, and what kind.
 *
 * Resolved from where a name came from, never from how it reads. This has to hold:
 *
 *   import { createSignal as useState } from '@fluixi/reactive/signal';
 *   const count = useState(0);          // a signal
 *
 *   function createSignal() { return 42; }
 *   const value = createSignal();       // not a signal
 *
 * A name tells you nothing; the binding it resolves to tells you everything. So this
 * walks the imports first, then the declarations that call them, and a local
 * declaration always wins over anything the compiler would otherwise assume.
 *
 * Babel-free by the rule in no-babel-in-core: nodes are read structurally.
 */
import {
  INTRINSICS,
  RUNTIME_PRIMITIVES,
  isPrimitiveModule,
  type Intrinsic,
  type ReactiveKind,
} from './intrinsics.js';

interface Node {
  type: string;
  [key: string]: any;
}

export interface ReactiveBindings {
  /** Local name → what it holds. */
  kinds: Map<string, ReactiveKind>;
  /** Local name → the primitive it calls, for names imported from the runtime. */
  primitives: Map<string, Intrinsic['returns']>;
  /** `$name`s the module shadows with its own binding, so the intrinsic must not fire. */
  shadowed: Set<string>;
}

/** Every name a binding pattern introduces. */
function patternNames(node: Node | null | undefined, out: Set<string>): void {
  if (!node) return;
  switch (node.type) {
    case 'Identifier':
      out.add(node.name as string);
      return;
    case 'ObjectPattern':
      for (const p of (node.properties as Node[]) ?? []) {
        if (p.type === 'RestElement') patternNames(p.argument as Node, out);
        else patternNames(p.value as Node, out);
      }
      return;
    case 'ArrayPattern':
      for (const e of (node.elements as (Node | null)[]) ?? []) patternNames(e, out);
      return;
    case 'AssignmentPattern':
      patternNames(node.left as Node, out);
      return;
    case 'RestElement':
      patternNames(node.argument as Node, out);
      return;
  }
}

/** Walk everything under a node. */
function walk(root: Node | null | undefined, visit: (node: Node) => void): void {
  if (!root || typeof root !== 'object' || typeof root.type !== 'string') return;
  visit(root);
  for (const key of Object.keys(root)) {
    if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
    const value = (root as Record<string, unknown>)[key];
    if (Array.isArray(value)) for (const item of value) walk(item as Node, visit);
    else if (value && typeof value === 'object') walk(value as Node, visit);
  }
}

/** The primitive a call expression resolves to, if it resolves to one at all. */
function calledPrimitive(node: Node, bindings: ReactiveBindings): Intrinsic['returns'] | undefined {
  if (node.type !== 'CallExpression') return undefined;
  const callee = node.callee as Node;
  if (callee?.type !== 'Identifier') return undefined;

  const name = callee.name as string;
  const imported = bindings.primitives.get(name);
  if (imported) return imported;

  // `$signal(…)`, unless the module bound that name itself.
  const intrinsic = INTRINSICS[name];
  if (intrinsic && !bindings.shadowed.has(name)) return intrinsic.returns;
  return undefined;
}

/** Record what a declaration's pattern holds, given what the call returns. */
function classify(id: Node, returns: Intrinsic['returns'], kinds: Map<string, ReactiveKind>): void {
  if (Array.isArray(returns)) {
    // `const [count, setCount] = $signal(0)` — position decides which is which.
    if (id.type === 'ArrayPattern') {
      (id.elements as (Node | null)[]).forEach((element, index) => {
        const kind = returns[index];
        if (element?.type === 'Identifier' && kind) kinds.set(element.name as string, kind);
      });
    }
    return;
  }
  if (id.type === 'Identifier') kinds.set(id.name as string, returns as ReactiveKind);
}

/**
 * Every name the module binds, in any scope.
 *
 * Deliberately scope-blind: it answers "does this file declare this name anywhere", which
 * is the question a diagnostic needs. A component declared inside a function
 * (`const Row = () => …`) is bound just as much as an import, and warning about it would
 * be noise. Over-permissive on purpose — missing a warning beats inventing one.
 */
export function declaredNames(program: unknown): Set<string> {
  const names = new Set<string>();

  walk(program as Node, (node) => {
    switch (node.type) {
      case 'VariableDeclarator':
        patternNames(node.id as Node, names);
        return;
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        patternNames(node.id as Node, names);
        for (const p of (node.params as Node[]) ?? []) patternNames(p, names);
        return;
      case 'ClassDeclaration':
      case 'ClassExpression':
        patternNames(node.id as Node, names);
        return;
      case 'ImportSpecifier':
      case 'ImportDefaultSpecifier':
      case 'ImportNamespaceSpecifier':
        patternNames(node.local as Node, names);
        return;
      case 'CatchClause':
        patternNames(node.param as Node, names);
        return;
    }
  });

  return names;
}

/**
 * Read a module's reactive bindings.
 *
 * Two passes, because a call can only be classified once its callee is known: imports
 * and local declarations first, then the declarations that call them.
 */
export function resolveReactiveBindings(program: unknown): ReactiveBindings {
  const bindings: ReactiveBindings = { kinds: new Map(), primitives: new Map(), shadowed: new Set() };
  const root = program as Node;

  // Anything the module declares under a `$` name shadows the intrinsic. Checked across
  // the whole module, not just the top level: a nested `const $signal = …` still means
  // the call at that point isn't ours, and refusing the rewrite there is the safe answer.
  walk(root, (node) => {
    const names = new Set<string>();
    if (node.type === 'VariableDeclarator') patternNames(node.id as Node, names);
    else if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') patternNames(node.id as Node, names);
    else if (node.type === 'ImportDefaultSpecifier' || node.type === 'ImportNamespaceSpecifier') patternNames(node.local as Node, names);
    else if (node.type === 'ImportSpecifier') patternNames(node.local as Node, names);
    else if (
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression' ||
      node.type === 'FunctionDeclaration'
    ) {
      for (const p of (node.params as Node[]) ?? []) patternNames(p, names);
    }
    for (const name of names) if (INTRINSICS[name]) bindings.shadowed.add(name);
  });

  // Imported primitives, under whatever local name they were given.
  for (const statement of (root.body as Node[]) ?? []) {
    if (statement.type !== 'ImportDeclaration') continue;
    if (!isPrimitiveModule(statement.source?.value as string)) continue;

    for (const specifier of (statement.specifiers as Node[]) ?? []) {
      if (specifier.type !== 'ImportSpecifier') continue;
      const importedNode = specifier.imported as Node;
      const imported = (importedNode.type === 'Identifier' ? importedNode.name : importedNode.value) as string;
      const returns = RUNTIME_PRIMITIVES[imported];
      if (returns) bindings.primitives.set(specifier.local.name as string, returns);
    }
  }

  // What the declarations that call them hold.
  walk(root, (node) => {
    if (node.type !== 'VariableDeclarator' || !node.init) return;
    const returns = calledPrimitive(node.init as Node, bindings);
    if (returns) classify(node.id as Node, returns, bindings.kinds);
  });

  return bindings;
}
