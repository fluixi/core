/**
 * Rewrite destructured component props into property reads.
 *
 * `function Card({ title, size = 'md' })` becomes `function Card(props)` with `title`
 * rewritten to `props.title` wherever it's used, so the reads stay live. What can't be
 * rewritten is left alone and reported — see analyze/props-destructure for the rules.
 *
 * Source in, source out, spans spliced with magic-string, so the author's formatting
 * survives and the map comes out of the splice. It runs before templates are compiled,
 * which is what makes JSX and html`` behave the same: both end up reading `props.title`
 * from the same rewritten body, and neither one needs to know this happened.
 */
import { parse } from '@babel/parser';
import MagicString from 'magic-string';
import { planPropsDestructure, explainBail, type DestructureBail } from '../analyze/props-destructure.js';
import { moduleBindings } from './bindings.js';

interface Node {
  type: string;
  start: number;
  end: number;
  [key: string]: any;
}

export interface PropsDiagnostic {
  /** The binding we couldn't rewrite. */
  name: string;
  reason: DestructureBail;
  /** Sentence for the message. */
  message: string;
  /** Character offset of the pattern it came from. */
  start: number;
}

export interface PropsTransformOptions {
  /** Name to give the props parameter. @default 'props' */
  parameterName?: string;
  /** Module `splitProps` is imported from when a rest needs it. @default '@fluixi/dom' */
  runtimeModule?: string;
}

export interface PropsTransformResult {
  code: string;
  map: ReturnType<MagicString['generateMap']>;
  diagnostics: PropsDiagnostic[];
  /** How many bindings were rewritten. Zero means the source came back untouched. */
  rewritten: number;
}

/** One span to replace. Same shape the template transform uses for its own edits. */
export interface PropsEdit {
  start: number;
  end: number;
  code: string;
}

export interface PropsEditsResult {
  edits: PropsEdit[];
  diagnostics: PropsDiagnostic[];
  /** Runtime symbols the emitted code needs — `splitProps`, when a pattern had a rest. */
  used: Set<string>;
}

/** Walk everything under a node. Skips TS annotations, where a name isn't a value. */
function walk(root: Node | null | undefined, visit: (node: Node, parent: Node | null) => boolean | void, parent: Node | null = null): void {
  if (!root || typeof root !== 'object' || typeof root.type !== 'string') return;
  if (root.type.startsWith('TS')) return;
  if (visit(root, parent) === false) return;

  for (const key of Object.keys(root)) {
    if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
    const value = (root as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      for (const item of value) walk(item as Node, visit, root);
    } else if (value && typeof value === 'object') {
      walk(value as Node, visit, root);
    }
  }
}

/** A component by the same rule JSX uses: a capitalised name. */
function isComponentName(name: string | undefined): boolean {
  return !!name && name[0] >= 'A' && name[0] <= 'Z';
}

/** Component functions in a module, paired with the name they were declared under. */
function componentFunctions(program: Node): Node[] {
  const found: Node[] = [];

  walk(program, (node) => {
    if (node.type === 'FunctionDeclaration' && isComponentName(node.id?.name)) {
      found.push(node);
      return;
    }
    if (node.type === 'VariableDeclarator' && isComponentName(node.id?.name)) {
      const init = node.init as Node | null;
      if (init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')) found.push(init);
    }
  });

  return found;
}

/** Names used anywhere in a function, so the parameter we introduce doesn't collide. */
function usedNames(fn: Node): Set<string> {
  const names = new Set<string>();
  walk(fn, (node) => {
    if (node.type === 'Identifier') names.add(node.name as string);
  });
  return names;
}

/**
 * Positions where an identifier isn't a reference to the binding: a property name, a
 * non-computed object key, a label. A shorthand property is handled by the caller,
 * since it needs the key written out.
 */
function isReferencePosition(node: Node, parent: Node | null): boolean {
  if (!parent) return true;
  switch (parent.type) {
    case 'MemberExpression':
    case 'OptionalMemberExpression':
      return !(parent.property === node && !parent.computed);
    case 'ObjectProperty':
    case 'ObjectMethod':
    case 'ClassProperty':
    case 'ClassMethod':
      return !(parent.key === node && !parent.computed);
    case 'LabeledStatement':
    case 'BreakStatement':
    case 'ContinueStatement':
      return parent.label !== node;
    case 'ImportSpecifier':
    case 'ExportSpecifier':
      return false;
    default:
      return true;
  }
}

/**
 * Work out the edits without applying them, so a caller that already has the source in a
 * MagicString can fold them into its own. That's how the template transform picks this
 * up: one string, one map, and holes get the rewrite because it slices them with the
 * edits applied.
 */
export function collectPropsEdits(
  program: unknown,
  code: string,
  options: PropsTransformOptions = {},
): PropsEditsResult {
  const edits: PropsEdit[] = [];
  const diagnostics: PropsDiagnostic[] = [];
  const used = new Set<string>();

  for (const fn of componentFunctions(program as Node)) {
    const pattern = (fn.params as Node[])?.[0];
    if (pattern?.type !== 'ObjectPattern') continue;

    const plan = planPropsDestructure(pattern as never, fn.body as never);
    for (const b of plan.bails) {
      diagnostics.push({ name: b.name, reason: b.reason, message: explainBail(b.reason), start: pattern.start });
    }
    // Whole function or nothing: half a rewrite would read as if the rest were fine too.
    if (plan.bails.length > 0) continue;
    if (plan.reads.length === 0 && !plan.rest) continue;

    const taken = usedNames(fn);
    let parameter = options.parameterName ?? 'props';
    while (taken.has(parameter)) parameter = `_${parameter}`;

    const replacement = new Map<string, string>();
    for (const read of plan.reads) {
      const access = `${parameter}.${read.path.join('.')}`;
      const fallback = read.fallback as Node | undefined;
      // A default only applies to `undefined`, so this can't collapse to `??`.
      replacement.set(
        read.name,
        fallback ? `(${access} === undefined ? ${code.slice(fallback.start, fallback.end)} : ${access})` : access,
      );
    }

    // The pattern's range covers its type annotation, so overwriting the whole span
    // would take `: { title: string }` with it. Stop at the annotation and the type
    // stays exactly as written.
    const annotation = pattern.typeAnnotation as Node | undefined;
    edits.push({ start: pattern.start, end: annotation?.start ?? pattern.end, code: parameter });

    // `...rest` becomes the splitProps call the author would have written. splitProps
    // carries the getters over instead of reading them, which is the whole reason a
    // plain rest can't be rewritten — so this hands the job to the runtime helper that
    // does it properly rather than refusing the pattern.
    if (plan.rest) {
      const keys = plan.rest.keys.map((k) => JSON.stringify(k)).join(', ');
      const body = fn.body as Node;
      edits.push({
        start: body.start + 1,
        end: body.start + 1,
        code: `\n  const [, ${plan.rest.name}] = splitProps(${parameter}, [${keys}]);`,
      });
      used.add('splitProps');
    }

    // Collect first, rewrite after: turning a node into a member below gives it new
    // children, and a walk still in progress would descend into them and match again.
    const matches: { node: Node; parent: Node | null; text: string; property: string }[] = [];
    walk(fn.body as Node, (node, parent): boolean | void => {
      if (node.type !== 'Identifier') return undefined;
      const text = replacement.get(node.name as string);
      if (!text) return undefined;

      const shorthand = parent?.type === 'ObjectProperty' && parent.shorthand && parent.value === node;
      if (!shorthand && !isReferencePosition(node, parent)) return undefined;

      const path = plan.reads.find((r) => r.name === node.name)!.path;
      matches.push({ node, parent: shorthand ? parent : null, text, property: path[path.length - 1] as string });
      return undefined;
    });

    for (const match of matches) {
      if (match.parent) {
        // `{ name }` needs the key spelled out, or the result isn't an object literal.
        edits.push({ start: match.parent.start, end: match.parent.end, code: `${(match.node as Node).name}: ${match.text}` });
      } else {
        edits.push({ start: match.node.start, end: match.node.end, code: match.text });
      }

      // Say it in the AST too, not only in the text. Whether a hole is wired reactively
      // is decided from the expression's shape, and a bare identifier is not reactive —
      // so leaving the node as an Identifier emits `props.text` read once, which is the
      // bug this whole pass exists to remove. A member read is reactive, which is what
      // the emitted code now is.
      asMemberRead(match.node, parameter, match.property);
    }
  }

  return { edits, diagnostics, used };
}

/**
 * Rewrite an identifier node into `<parameter>.<property>` in place, keeping its span so
 * the text it maps to is unchanged. The synthetic children are zero-width at the node's
 * own edges: nothing slices them, and they exist so shape analysis sees a member.
 */
function asMemberRead(node: Node, parameter: string, property: string): void {
  node.type = 'MemberExpression';
  node.computed = false;
  node.optional = false;
  node.object = { type: 'Identifier', name: parameter, start: node.start, end: node.start };
  node.property = { type: 'Identifier', name: property, start: node.end, end: node.end };
  delete (node as Record<string, unknown>)['name'];
}

/** Run the rewrite on its own. The template transform folds the edits in instead. */
export function transformProps(
  code: string,
  filename = 'module.tsx',
  options: PropsTransformOptions = {},
): PropsTransformResult {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
    errorRecovery: true,
  }) as unknown as { program: unknown };

  const { edits, diagnostics, used } = collectPropsEdits(ast.program, code, options);
  const source = new MagicString(code);
  for (const e of edits) {
    if (e.start === e.end) source.appendLeft(e.start, e.code);
    else source.overwrite(e.start, e.end, e.code);
  }

  // Standalone, there's no prologue to join, so the import goes in here — unless the
  // module already has the name bound.
  if (used.has('splitProps') && !moduleBindings(ast.program as { body: unknown[] }).has('splitProps')) {
    source.prepend(`import { splitProps } from ${JSON.stringify(options.runtimeModule ?? '@fluixi/dom')};\n`);
  }

  return {
    code: source.toString(),
    map: source.generateMap({ source: filename, includeContent: true, hires: true }),
    diagnostics,
    rewritten: edits.filter((e) => e.code !== (options.parameterName ?? 'props')).length,
  };
}
