/**
 * Compile the `$` intrinsics into the runtime calls they stand for.
 *
 *   const [count, setCount] = $signal(0);
 *   → const [count, setCount] = createSignal(0);   + the import
 *
 * Only the callee is rewritten, so arguments keep the author's text and the span stays
 * put: `$signal(0)` and `createSignal(0)` map to the same place. Imports are collected
 * from what the module actually used, so a file with one `$signal` gets one import.
 *
 * A module that binds `$signal` itself keeps its own meaning and is reported instead;
 * the compiler quietly rewriting code that means something else is the one outcome
 * worth failing over.
 */
import { INTRINSICS, isIntrinsicName } from '../analyze/intrinsics.js';
import { resolveReactiveBindings } from '../analyze/reactive-bindings.js';

interface Node {
  type: string;
  start: number;
  end: number;
  [key: string]: any;
}

export interface IntrinsicEdit {
  start: number;
  end: number;
  code: string;
}

export interface IntrinsicDiagnostic {
  /** The `$` name the module bound itself. */
  name: string;
  message: string;
  start: number;
}

export interface IntrinsicsResult {
  edits: IntrinsicEdit[];
  diagnostics: IntrinsicDiagnostic[];
  /** Runtime exports the rewritten code needs, by module. */
  imports: Map<string, Set<string>>;
  /** Runtime exports imported under another name, because the module binds theirs. */
  aliases?: Map<string, string>;
}

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

/** Find the `$` calls in a module and say what they compile to. */
export function collectIntrinsicEdits(program: unknown): IntrinsicsResult {
  const edits: IntrinsicEdit[] = [];
  const diagnostics: IntrinsicDiagnostic[] = [];
  const imports = new Map<string, Set<string>>();
  const reported = new Set<string>();

  const { shadowed } = resolveReactiveBindings(program);

  walk(program as Node, (node) => {
    if (node.type !== 'CallExpression') return;
    const callee = node.callee as Node;
    if (callee?.type !== 'Identifier') return;

    const name = callee.name as string;
    if (!isIntrinsicName(name)) return;

    if (shadowed.has(name)) {
      if (!reported.has(name)) {
        reported.add(name);
        diagnostics.push({
          name,
          message: `${name} is reserved for the compiler, and this module binds it. The call keeps your binding's meaning; rename it to use the intrinsic.`,
          start: callee.start,
        });
      }
      return;
    }

    const intrinsic = INTRINSICS[name]!;
    // The callee only. Arguments are untouched, so a template or JSX inside one is still
    // compiled by the pass that owns it.
    edits.push({ start: callee.start, end: callee.end, code: intrinsic.export });

    const forModule = imports.get(intrinsic.module) ?? new Set<string>();
    forModule.add(intrinsic.export);
    imports.set(intrinsic.module, forModule);
  });

  return { edits, diagnostics, imports };
}

/**
 * Point a rewritten call past a local binding of the same name.
 *
 * `$env('X')` becomes `env('X')`, and the import of `env` used to be skipped when the module
 * already bound `env`, on the assumption that it was the same import. A config module with its
 * own `const env = {…}` is common, and there the call reached the app's object instead. Such a
 * name is now imported under a private alias. A module that imports that very export from that
 * very module keeps the old behaviour: the binding is the runtime already.
 */
export function avoidBindingClashes(program: unknown, result: IntrinsicsResult, bound: Set<string>): void {
  const importedAsIs = new Set<string>();
  for (const stmt of ((program as Node).body as Node[]) ?? []) {
    if (stmt.type !== 'ImportDeclaration') continue;
    const module = (stmt.source as Node).value as string;
    for (const spec of (stmt.specifiers as Node[]) ?? []) {
      if (spec.type !== 'ImportSpecifier') continue;
      const imported = ((spec.imported as Node).name ?? (spec.imported as Node).value) as string;
      if (imported === (spec.local as Node).name && result.imports.get(module)?.has(imported)) {
        importedAsIs.add(imported);
      }
    }
  }

  const aliases = new Map<string, string>();
  for (const names of result.imports.values()) {
    for (const name of names) if (bound.has(name) && !importedAsIs.has(name)) aliases.set(name, `__fx_${name}`);
  }
  if (!aliases.size) return;
  for (const edit of result.edits) {
    const alias = aliases.get(edit.code);
    if (alias) edit.code = alias;
  }
  result.aliases = aliases;
}

/** The import statements a result needs, minus anything the module already binds. */
export function intrinsicImports(result: IntrinsicsResult, bound: Set<string>): string {
  const lines: string[] = [];
  for (const [module, names] of [...result.imports].sort(([a], [b]) => a.localeCompare(b))) {
    const wanted = [...names]
      .filter((name) => result.aliases?.has(name) || !bound.has(name))
      .sort()
      .map((name) => (result.aliases?.has(name) ? `${name} as ${result.aliases.get(name)}` : name));
    if (wanted.length) lines.push(`import { ${wanted.join(', ')} } from ${JSON.stringify(module)};`);
  }
  return lines.length ? `${lines.join('\n')}\n` : '';
}
