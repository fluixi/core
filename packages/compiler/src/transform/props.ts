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
}

export interface PropsTransformResult {
  code: string;
  map: ReturnType<MagicString['generateMap']>;
  diagnostics: PropsDiagnostic[];
  /** How many bindings were rewritten. Zero means the source came back untouched. */
  rewritten: number;
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

export function transformProps(
  code: string,
  filename = 'module.tsx',
  options: PropsTransformOptions = {},
): PropsTransformResult {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
    errorRecovery: true,
  }) as unknown as { program: Node };

  const source = new MagicString(code);
  const diagnostics: PropsDiagnostic[] = [];
  let rewritten = 0;

  for (const fn of componentFunctions(ast.program)) {
    const pattern = (fn.params as Node[])?.[0];
    if (pattern?.type !== 'ObjectPattern') continue;

    const plan = planPropsDestructure(pattern as never, fn.body as never);
    for (const b of plan.bails) {
      diagnostics.push({ name: b.name, reason: b.reason, message: explainBail(b.reason), start: pattern.start });
    }
    if (plan.reads.length === 0) continue;

    // A rest element keeps the pattern, so splitProps is still the answer there and we
    // leave the whole function alone rather than half-rewriting it.
    if (plan.bails.some((b) => b.reason === 'rest')) continue;
    if (plan.bails.length > 0) continue;

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
    source.overwrite(pattern.start, annotation?.start ?? pattern.end, parameter);

    walk(fn.body as Node, (node, parent): boolean | void => {
      if (node.type !== 'Identifier') return undefined;
      const text = replacement.get(node.name as string);
      if (!text) return undefined;

      // `{ name }` needs the key spelled out, or the result isn't an object literal.
      if (parent?.type === 'ObjectProperty' && parent.shorthand && parent.value === node) {
        source.overwrite(parent.start, parent.end, `${node.name}: ${text}`);
        rewritten++;
        return false;
      }

      if (!isReferencePosition(node, parent)) return undefined;
      source.overwrite(node.start, node.end, text);
      rewritten++;
      return undefined;
    });
  }

  return {
    code: source.toString(),
    map: source.generateMap({ source: filename, includeContent: true, hires: true }),
    diagnostics,
    rewritten,
  };
}
