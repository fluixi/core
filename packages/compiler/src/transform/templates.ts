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
import type { IRComponentSource, IRLoadStrategy, IRNode } from '../ir/nodes.js';
import { isDeferred } from '../resolve/load-directive.js';
import { isReactiveShape } from '../analyze/reactive-expr.js';
import { shapeOf } from '../analyze/expr-shape.js';
import { buildJsxIR } from '../lower/jsx.js';
import { analyzeStatic } from '../optimize/analyze-static.js';
import { collapseStrategies } from '../optimize/collapse-strategies.js';
import { resolveComponentSources } from '../resolve/resolve-ir.js';
import { createComponentResolver } from '../resolve/component-resolver.js';
import { imperativeBackend, inlineTemplates } from '../codegen/backends/imperative.js';
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
const CORE_ONLY = new Set(['Suspense', 'SuspenseList', 'Portal', 'ErrorBoundary']);
const ROUTER = new Set(['Router', 'Outlet', 'Link', 'Form', 'Navigate']);
const REACTIVE = new Set([
  'createMemo', 'createEffect', 'createRenderEffect', 'createRoot',
  'createSignal', 'onCleanup', 'batch', 'untrack',
]);

/** Depth-first walk, carrying the parent and the field the node came from. */
function walk(
  node: any,
  visit: (n: Node, parent: Node | null, key: string) => void,
  parent: Node | null = null,
  key = '',
): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit, parent, key);
    return;
  }
  if (typeof node.type === 'string') visit(node as Node, parent, key);
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments') continue;
    walk(node[k], visit, typeof node.type === 'string' ? (node as Node) : parent, k);
  }
}

const isJsx = (node: Node): boolean => node.type === 'JSXElement' || node.type === 'JSXFragment';

/**
 * A JSX node the transform compiles on its own.
 *
 * A direct child — `<li>` in `<ul><li/></ul>` — is not one: the builder recurses
 * into it, and compiling it separately would splice its output into the middle of
 * its parent's. JSX reached through an expression or an attribute value *is* one,
 * because the builder asks for that expression as source text and needs it
 * already compiled.
 */
function isJsxRoot(node: Node, parent: Node | null, key: string): boolean {
  if (!isJsx(node)) return false;
  return !(parent && isJsx(parent) && key === 'children');
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
 * What the emitted code needs beyond the runtime symbols the backend reports:
 * component references the resolve pass annotated, and the events it wants
 * delegated. Both live on the IR rather than in the emit result.
 */
interface Needs {
  /** Built-in control-flow / router names, imported from their own modules. */
  builtins: Set<string>;
  /** Names supplied by a resolve rule, as a static import. */
  resolved: Map<string, IRComponentSource>;
  /** Names supplied lazily, as a `deferred(() => import(…))` binding. */
  deferred: Map<string, IRComponentSource>;
  delegatedEvents: Set<string>;
}

function collectNeeds(node: IRNode, out: Needs): void {
  if (node.kind === 'component' && node.source) {
    const src = node.source;
    if (src.origin === 'builtin') out.builtins.add(node.name);
    else if (isDeferred(src.loading) && !out.resolved.has(node.name)) out.deferred.set(node.name, src);
    else {
      out.deferred.delete(node.name);
      out.resolved.set(node.name, src);
    }
  }
  if ('props' in node && node.props) {
    for (const p of node.props) {
      if (p.kind === 'event' && p.event?.delegated) out.delegatedEvents.add(p.event.name);
    }
  }
  if ('children' in node && node.children) for (const c of node.children) collectNeeds(c, out);
}

/** The strategy object a `deferred()` binding is given. */
function strategyLiteral(s: IRLoadStrategy): string {
  const parts = [`kind: ${JSON.stringify(s.kind)}`];
  if (s.kind === 'visible' && s.rootMargin) parts.push(`rootMargin: ${JSON.stringify(s.rootMargin)}`);
  if (s.kind === 'interaction') parts.push(`events: ${JSON.stringify(s.events)}`);
  if (s.kind === 'media') parts.push(`query: ${JSON.stringify(s.query)}`);
  return `{ ${parts.join(', ')} }`;
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
  const mayHaveTemplate = code.includes(`${litTag}\``) || code.includes('svg`');
  if (!mayHaveTemplate && !code.includes('<')) return null;

  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
    errorRecovery: true,
  });

  const found: Node[] = [];
  walk(ast.program, (n, parent, key) => {
    if (isTemplateTag(n, litTag) || isJsxRoot(n, parent, key)) found.push(n);
  });
  if (found.length === 0) return null;

  // Innermost first, so a nested template is already compiled by the time the
  // hole containing it is sliced.
  found.sort((a, b) => b.start - a.start || a.end - b.end);

  const used = new Set<string>();
  const needs: Needs = {
    builtins: new Set(), resolved: new Map(), deferred: new Map(), delegatedEvents: new Set(),
  };
  const edits: Edit[] = [];
  for (const node of found) {
    // A root inside another root's hole is emitted without partial templates,
    // matching what the plugin does for nested emits. Marker layout has to agree
    // between server and client, so this is not the place to change it.
    const nested = found.some(
      (o) => o !== node && o.start <= node.start && o.end >= node.end && o.end - o.start > node.end - node.start,
    );
    if (isJsx(node)) {
      edits.push({ start: node.start, end: node.end, code: compileJsx(code, node, edits, nested, used, needs, options) });
      continue;
    }
    const holes = node.quasi.expressions.map((e: Node) => bindHole(code, e, edits));
    const result = compilePieces(toPieces(node), holes, {
      ...options,
      // Same defaults as the plugin, so moving a build over is not a rendering change.
      templateClone: options.templateClone ?? true,
      partialTemplates: nested ? false : options.partialTemplates ?? true,
      svg: node.tag.name === 'svg',
    });
    for (const symbol of result.imports) used.add(symbol);
    collectNeeds(result.ir, needs);
    edits.push({ start: node.start, end: node.end, code: result.code });
  }

  const out = new MagicString(code);
  // Only the outermost edits are applied to the file: a nested one was already
  // folded into its parent's emitted code.
  const outermost = edits.filter(
    (e) => !edits.some((o) => o !== e && o.start <= e.start && o.end >= e.end && o.end - o.start > e.end - e.start),
  );
  for (const e of outermost) out.overwrite(e.start, e.end, e.code);

  const bound = moduleBindings(ast.program);
  const prologue = buildPrologue(used, needs, bound, options);
  if (prologue) out.prepend(prologue);
  // `@fluixi/core/rx` is the client alias for the reactive primitives.
  for (const node of ast.program.body as Node[]) {
    if (node.type === 'ImportDeclaration' && node.source?.value === '@fluixi/core/rx') {
      out.overwrite(node.source.start, node.source.end, JSON.stringify('@fluixi/reactive'));
    }
  }

  return {
    code: out.toString(),
    map: out.generateMap({ source: id, includeContent: true, hires: true }),
  };
}

/**
 * A JSX root, emitted the same way a template is. Expressions are source slices
 * with anything already compiled inside them folded in, so nested JSX and nested
 * `` html`` `` both come along for free.
 */
function compileJsx(
  code: string,
  node: Node,
  edits: Edit[],
  nested: boolean,
  used: Set<string>,
  needs: Needs,
  options: TransformOptions,
): string {
  const ir = buildJsxIR(node as never, {
    code: (n) => slice(code, (n as Node).start, (n as Node).end, edits),
    used,
  });
  analyzeStatic(ir);
  resolveComponentSources(ir, {
    resolver: createComponentResolver(options.resolve ?? []),
    modules: {
      controlFlowModule: options.controlFlowModule ?? options.runtimeModule ?? '@fluixi/dom',
      coreModule: options.coreModule ?? '@fluixi/core',
      routerModule: options.routerModule ?? '@fluixi/core/router-next',
    },
    strategyFor: (n) => n.load,
  });
  collapseStrategies(ir);
  const emitted = imperativeBackend.emit(ir, {
    templateClone: options.templateClone ?? true,
    partialTemplates: nested ? false : options.partialTemplates ?? true,
  } as never);
  for (const symbol of emitted.imports) used.add(symbol);
  collectNeeds(ir, needs);
  return inlineTemplates(emitted.code, emitted.templates);
}

/**
 * Everything the emitted code needs at the top of the module: runtime imports,
 * imports for components a resolve rule supplied, `deferred()` bindings for the
 * lazy ones, and the delegateEvents call. A name already bound in the file wins,
 * so enabling resolution can never change what an existing module means.
 */
function buildPrologue(
  used: Set<string>,
  needs: Needs,
  bound: Set<string>,
  options: TransformOptions,
): string | null {
  const runtime = options.runtimeModule ?? '@fluixi/dom';
  const core = options.coreModule ?? '@fluixi/core';
  const groups = new Map<string, string[]>();
  const add = (mod: string, name: string) => groups.set(mod, [...(groups.get(mod) ?? []), name]);

  const wanted = new Set(used);
  for (const name of needs.builtins) wanted.add(name);
  if (needs.delegatedEvents.size > 0) wanted.add('delegateEvents');

  for (const name of [...wanted].sort()) {
    if (bound.has(name)) continue;
    if (REACTIVE.has(name)) add(options.reactiveModule ?? '@fluixi/reactive/signal', name);
    else if (ROUTER.has(name)) add(options.routerModule ?? '@fluixi/core/router-next', name);
    else if (CORE_ONLY.has(name)) add(core, name);
    else if (CONTROL_FLOW.has(name)) add(options.controlFlowModule ?? runtime, name);
    else add(runtime, name);
  }
  for (const [name, src] of needs.resolved) {
    if (!bound.has(name)) add(src.module, src.export === 'default' ? `default as ${name}` : name === src.export ? name : `${src.export} as ${name}`);
  }

  const lines: string[] = [];
  for (const [mod, names] of groups) {
    lines.push(`import { ${names.join(', ')} } from ${JSON.stringify(mod)};`);
  }
  // A literal import() is what lets the bundler split and hash the chunk, so the
  // deferred component is an ordinary binding rather than an integration.
  const lazy = [...needs.deferred].filter(([name]) => !bound.has(name));
  if (lazy.length > 0) {
    if (!bound.has('deferred')) lines.push(`import { deferred } from ${JSON.stringify(core)};`);
    for (const [name, src] of lazy) {
      lines.push(
        `const ${name} = deferred(() => import(${JSON.stringify(src.module)}), ` +
          `{ strategy: ${strategyLiteral(src.loading)}, export: ${JSON.stringify(src.export)} });`,
      );
    }
  }
  if (needs.delegatedEvents.size > 0) {
    lines.push(`delegateEvents(${JSON.stringify([...needs.delegatedEvents])});`);
  }
  return lines.length > 0 ? lines.join('\n') + '\n' : null;
}
