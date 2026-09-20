/**
 * Names bound at module scope.
 *
 * Injected imports are skipped when the name already exists, so a file with its
 * own `Show` keeps it. Only module scope matters: a `const insert = …` inside a
 * function shadows our import there but cannot collide with it, which is the same
 * answer `path.scope.hasBinding` gives on the Program path.
 *
 * Missing a binding emits a duplicate declaration, a syntax error. Reporting one
 * that isn't there drops an import the code needs. Both are loud, neither is
 * subtle, and the corpus in bindings.spec.ts covers the patterns that bind.
 */

interface Node {
  type: string;
  [key: string]: unknown;
}

/** Every name a destructuring pattern (or plain identifier) introduces. */
function patternNames(node: Node | null | undefined, out: Set<string>): void {
  if (!node) return;
  switch (node.type) {
    case 'Identifier':
      out.add(node.name as string);
      return;
    case 'ObjectPattern':
      for (const p of node.properties as Node[]) {
        if (p.type === 'RestElement') patternNames(p.argument as Node, out);
        else patternNames(p.value as Node, out);
      }
      return;
    case 'ArrayPattern':
      for (const e of node.elements as (Node | null)[]) patternNames(e, out);
      return;
    case 'AssignmentPattern':
      patternNames(node.left as Node, out);
      return;
    case 'RestElement':
      patternNames(node.argument as Node, out);
      return;
  }
}

function declared(node: Node, out: Set<string>): void {
  switch (node.type) {
    case 'ImportDeclaration':
      for (const s of node.specifiers as Node[]) patternNames(s.local as Node, out);
      return;
    case 'VariableDeclaration':
      for (const d of node.declarations as Node[]) patternNames(d.id as Node, out);
      return;
    case 'FunctionDeclaration':
    case 'ClassDeclaration':
      patternNames(node.id as Node, out);
      return;
    case 'ExportNamedDeclaration':
    case 'ExportDefaultDeclaration':
      // `export const x = 1` / `export function f() {}` bind too.
      if (node.declaration) declared(node.declaration as Node, out);
      return;
  }
}

/** Collect the names bound at the top level of a parsed module. */
export function moduleBindings(program: { body: unknown[] }): Set<string> {
  const names = new Set<string>();
  for (const statement of program.body as Node[]) declared(statement, names);
  return names;
}
