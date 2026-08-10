/**
 * Compile `` html`...` `` / `` svg`...` `` templates in a module.
 *
 * We own the transform here rather than running as a plugin inside someone
 * else's: parse once, find the templates, splice the emitted code over their
 * spans with magic-string. Holes are source slices, so nothing is reprinted and
 * the output keeps the author's formatting; the map comes out of the splice.
 */
import { parse } from '@babel/parser';
import MagicString from 'magic-string';
import type { Piece } from '@fluixi/template-parser';
import { compilePieces, type CompileTemplateOptions } from '../lower/compile-template.js';
import type { TemplateHole } from '../lower/template.js';
import type { IRNode } from '../ir/nodes.js';
import { isReactiveShape } from '../analyze/reactive-expr.js';
import { shapeOf } from './estree-shape.js';
import { moduleBindings } from './bindings.js';

interface Node {
  type: string;
  start: number;
  end: number;
  [key: string]: any;
}

/** An edit to make on the source, innermost first. */
interface Edit {
  start: number;
  end: number;
  code: string;
}

export interface TransformOptions extends CompileTemplateOptions {
  /** Tag marking a template for compilation. @default 'html' */
  litTag?: string;
  /** Module the emitted runtime symbols are imported from. @default '@fluixi/dom' */
  runtimeModule?: string;
  /** Where reactive primitives come from. @default '@fluixi/reactive/signal' */
  reactiveModule?: string;
}

export interface TransformResult {
  code: string;
  map: ReturnType<MagicString['generateMap']>;
}

/** Control-flow names come from the control-flow module, not the dom runtime. */
const CONTROL_FLOW = new Set([
  'Show', 'For', 'Index', 'Switch', 'Match', 'Dynamic', 'ErrorBoundary', 'Portal', 'Suspense',
]);
const REACTIVE = new Set([
  'createMemo', 'createEffect', 'createRenderEffect', 'createRoot',
  'createSignal', 'onCleanup', 'batch', 'untrack',
]);

/** Depth-first walk over a parsed module. */
function walk(node: any, visit: (n: Node) => void): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (typeof node.type === 'string') visit(node as Node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
    walk(node[key], visit);
  }
}

function isTemplateTag(node: Node, litTag: string): boolean {
  return (
    node.type === 'TaggedTemplateExpression' &&
    node.tag?.type === 'Identifier' &&
    (node.tag.name === litTag || node.tag.name === 'svg')
  );
}

/** Apply edits that fall inside [start, end) to that slice of the source. */
function slice(code: string, start: number, end: number, edits: Edit[]): string {
  const inside = edits
    .filter((e) => e.start >= start && e.end <= end)
    .sort((a, b) => b.start - a.start);
  let out = code.slice(start, end);
  for (const e of inside) out = out.slice(0, e.start - start) + e.code + out.slice(e.end - start);
  return out;
}

/** Describe one `${…}` for the lowering, substituting any template already compiled inside it. */
function bindHole(code: string, expr: Node, edits: Edit[]): TemplateHole {
  const hole: TemplateHole = {
    code: slice(code, expr.start, expr.end, edits),
    reactive: isReactiveShape(shapeOf(expr)),
  };

  if (expr.type === 'ArrowFunctionExpression' && expr.body?.type !== 'BlockStatement') {
    hole.arrow = {
      params: expr.params.map((p: Node) => slice(code, p.start, p.end, edits)),
      body: slice(code, expr.body.start, expr.body.end, edits),
      bodyReactive: isReactiveShape(shapeOf(expr.body)),
    };
  }
  if (expr.type === 'ObjectExpression') hole.object = true;

  return hole;
}

/**
 * Control-flow components the template used. They are annotated on the IR by the
 * resolve pass rather than reported as emitted symbols, so the import has to be
 * read off the tree.
 */
function collectComponents(node: IRNode, out: Set<string>): void {
  if (node.kind === 'component' && node.source?.origin === 'builtin') out.add(node.name);
  if ('children' in node && node.children) for (const c of node.children) collectComponents(c, out);
}

/** Quasis and holes as position-carrying parser pieces. */
function toPieces(node: Node): Piece[] {
  const pieces: Piece[] = [];
  node.quasi.quasis.forEach((q: Node, i: number) => {
    pieces.push({ kind: 'static', text: q.value.cooked ?? q.value.raw, start: q.start });
    if (i < node.quasi.expressions.length) {
      const e = node.quasi.expressions[i] as Node;
      pieces.push({ kind: 'hole', index: i, start: e.start, end: e.end });
    }
  });
  return pieces;
}

/**
 * Compile every template in `code`. Returns null when the module has none, so a
 * bundler can skip the file untouched.
 */
export function transformTemplates(
  code: string,
  id: string,
  options: TransformOptions = {},
): TransformResult | null {
  const litTag = options.litTag ?? 'html';
  if (!code.includes(`${litTag}\``) && !code.includes('svg`')) return null;

  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
    errorRecovery: true,
  });

  const found: Node[] = [];
  walk(ast.program, (n) => {
    if (isTemplateTag(n, litTag)) found.push(n);
  });
  if (found.length === 0) return null;

  // Innermost first, so a nested template is already compiled by the time the
  // hole containing it is sliced.
  found.sort((a, b) => b.start - a.start || a.end - b.end);

  const used = new Set<string>();
  const edits: Edit[] = [];
  for (const node of found) {
    const holes = node.quasi.expressions.map((e: Node) => bindHole(code, e, edits));
    // A template inside another template's hole is compiled without partial
    // templates, matching what the plugin does for nested emits. Marker layout
    // has to agree between server and client, so this is not the place to change it.
    const nested = found.some((o) => o !== node && o.start < node.start && o.end > node.end);
    const result = compilePieces(toPieces(node), holes, {
      ...options,
      // Same defaults as the plugin, so moving a build over is not a rendering change.
      templateClone: options.templateClone ?? true,
      partialTemplates: nested ? false : options.partialTemplates ?? true,
      svg: node.tag.name === 'svg',
    });
    for (const symbol of result.imports) used.add(symbol);
    collectComponents(result.ir, used);
    edits.push({ start: node.start, end: node.end, code: result.code });
  }

  const out = new MagicString(code);
  // Only the outermost edits are applied to the file: a nested one was already
  // folded into its parent's emitted code.
  const outermost = edits.filter(
    (e) => !edits.some((o) => o !== e && o.start <= e.start && o.end >= e.end && o.end - o.start > e.end - e.start),
  );
  for (const e of outermost) out.overwrite(e.start, e.end, e.code);

  const imports = importsFor(used, moduleBindings(ast.program), options);
  if (imports) out.prepend(imports);

  return {
    code: out.toString(),
    map: out.generateMap({ source: id, includeContent: true, hires: true }),
  };
}

/** The import statements the emitted code needs, minus anything already bound. */
function importsFor(
  used: Set<string>,
  bound: Set<string>,
  options: TransformOptions,
): string | null {
  const runtime = options.runtimeModule ?? '@fluixi/dom';
  const groups = new Map<string, string[]>();
  const add = (mod: string, name: string) => groups.set(mod, [...(groups.get(mod) ?? []), name]);

  for (const name of [...used].sort()) {
    if (bound.has(name)) continue;
    if (REACTIVE.has(name)) add(options.reactiveModule ?? '@fluixi/reactive/signal', name);
    else if (CONTROL_FLOW.has(name)) add(options.controlFlowModule ?? runtime, name);
    else add(runtime, name);
  }
  if (groups.size === 0) return null;

  return (
    [...groups]
      .map(([mod, names]) => `import { ${names.join(', ')} } from ${JSON.stringify(mod)};`)
      .join('\n') + '\n'
  );
}
