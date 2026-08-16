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
import type { StaticTemplate } from '../codegen/backend.js';
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
import { imperativeBackend } from '../codegen/backends/imperative.js';
import { moduleBindings } from './bindings.js';
import { collectPropsEdits, type PropsDiagnostic } from './props.js';
import { DOM_CONTROL_FLOW, CORE_CONTROL_FLOW, ROUTER_COMPONENTS } from '../resolve/builtins.js';

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
  /**
   * Which authoring syntaxes to compile. Both lower to the same IR, so this is
   * about which source forms are touched, not about output.
   * @default 'both'
   */
  format?: 'jsx' | 'lit' | 'both';
  /** Tag marking a template for compilation. @default 'html' */
  litTag?: string;
  /** Module the emitted runtime symbols are imported from. @default '@fluixi/dom' */
  runtimeModule?: string;
  /** Where reactive primitives come from. @default '@fluixi/reactive/signal' */
  reactiveModule?: string;
  /**
   * Rewrite a component's destructured props into property reads, so
   * `function Card({ title })` keeps updating instead of reading `title` once.
   * The edits go into the same string as the template edits, so the map still points
   * at what the author wrote.
   * @default false
   */
  propsDestructure?: boolean;
}

export interface TransformResult {
  code: string;
  map: ReturnType<MagicString['generateMap']>;
  /** Props patterns the rewrite refused, when `propsDestructure` is on. */
  propsDiagnostics?: PropsDiagnostic[];
}

// Which builtin comes from which module is published by resolve/builtins.ts —
// the same lists the resolve pass and the TS plugin read. Restating them here is
// how `Await` ended up imported from the dom runtime, which does not export it.
const CONTROL_FLOW = new Set<string>(DOM_CONTROL_FLOW);
const CORE_ONLY = new Set<string>(CORE_CONTROL_FLOW);
const ROUTER = new Set<string>(ROUTER_COMPONENTS);

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

/** The edits in `list` that no other edit in `list` contains. */
function outermost(list: Edit[]): Edit[] {
  return list.filter(
    (e) => !list.some((o) => o !== e && o.start <= e.start && o.end >= e.end && o.end - o.start > e.end - e.start),
  );
}

/**
 * Apply edits to a slice of the source.
 *
 * Only the outermost ones: a contained edit was already folded into its
 * container's emitted code, and applying both would splice it twice — the second
 * write landing at an offset the first has already moved.
 */
function slice(code: string, start: number, end: number, edits: Edit[]): string {
  const inside = outermost(edits.filter((e) => e.start >= start && e.end <= end))
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
/**
 * Static templates hoisted to module scope, keyed by their HTML so two components
 * with the same markup share one string.
 *
 * Hoisted names deliberately do not use the backend's `_tmpl$N` namespace. Roots
 * are emitted innermost first and spliced into their parent, so by the time the
 * outer one is renamed its code already contains hoisted names — and with a
 * shared prefix the rename rewrites those too, pointing two templates at one
 * string. A separate prefix makes the two impossible to confuse.
 */
function adoptTemplates(code: string, templates: StaticTemplate[] | undefined, hoisted: Map<string, string>): string {
  if (!templates || templates.length === 0) return code;
  const rename = new Map<string, string>();
  for (const tpl of templates) {
    const key = `${tpl.svg ? 'svg:' : ''}${tpl.html}`;
    let name = hoisted.get(key);
    if (!name) {
      name = `_fxTmpl$${hoisted.size}`;
      hoisted.set(key, name);
    }
    rename.set(tpl.id, name);
  }
  return code.replace(/_tmpl\$\d+/g, (id) => rename.get(id) ?? id);
}

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
  const format = options.format ?? 'both';
  const wantsLit = format !== 'jsx';
  const wantsJsx = format !== 'lit';
  const mayHaveTemplate = wantsLit && (code.includes(`${litTag}\``) || code.includes('svg`'));
  if (!mayHaveTemplate && !(wantsJsx && code.includes('<'))) return null;

  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
    errorRecovery: true,
  });

  const found: Node[] = [];
  walk(ast.program, (n, parent, key) => {
    if (wantsLit && isTemplateTag(n, litTag)) found.push(n);
    else if (wantsJsx && isJsxRoot(n, parent, key)) found.push(n);
  });
  // Props first: holes are sliced out of the function body, so the rewrite has to be
  // in the edit list before any template is compiled.
  const props = options.propsDestructure
    ? collectPropsEdits(ast.program, code, {})
    : { edits: [], diagnostics: [] };

  if (found.length === 0 && props.edits.length === 0) return null;

  // Innermost first, so a nested template is already compiled by the time the
  // hole containing it is sliced.
  found.sort((a, b) => b.start - a.start || a.end - b.end);

  const used = new Set<string>();
  const needs: Needs = {
    builtins: new Set(), resolved: new Map(), deferred: new Map(), delegatedEvents: new Set(),
  };
  const hoisted = new Map<string, string>();
  const edits: Edit[] = [...props.edits];
  for (const node of found) {
    // A root inside another root's hole is emitted without partial templates,
    // matching what the plugin does for nested emits. Marker layout has to agree
    // between server and client, so this is not the place to change it.
    const nested = found.some(
      (o) => o !== node && o.start <= node.start && o.end >= node.end && o.end - o.start > node.end - node.start,
    );
    if (isJsx(node)) {
      edits.push({ start: node.start, end: node.end, code: compileJsx(code, node, edits, nested, used, needs, hoisted, options) });
      continue;
    }
    const holes = node.quasi.expressions.map((e: Node) => bindHole(code, e, edits));
    const result = compilePieces(toPieces(node), holes, {
      ...options,
      hoistTemplates: true,
      // Same defaults as the plugin, so moving a build over is not a rendering change.
      templateClone: options.templateClone ?? true,
      partialTemplates: nested ? false : options.partialTemplates ?? true,
      svg: node.tag.name === 'svg',
    });
    for (const symbol of result.imports) used.add(symbol);
    collectNeeds(result.ir, needs);
    edits.push({ start: node.start, end: node.end, code: adoptTemplates(result.code, result.templates, hoisted) });
  }

  const out = new MagicString(code);
  // Same reason as in `slice`: a nested edit is already inside its parent's code.
  for (const e of outermost(edits)) out.overwrite(e.start, e.end, e.code);

  const bound = moduleBindings(ast.program);
  const prologue = buildPrologue(used, needs, hoisted, bound, options);
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
    ...(props.diagnostics.length ? { propsDiagnostics: props.diagnostics } : {}),
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
  hoisted: Map<string, string>,
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
  return adoptTemplates(emitted.code, emitted.templates, hoisted);
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
  hoisted: Map<string, string>,
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
  // Just the HTML: parsing is deferred to `templateNode`, which knows whether this
  // is a server render, a hydration or a fresh client render. A module-scope
  // `createTemplate` would touch `document` at import time and break SSR.
  for (const [key, name] of hoisted) {
    lines.push(`const ${name} = ${JSON.stringify(key.startsWith('svg:') ? key.slice(4) : key)};`);
  }
  if (needs.delegatedEvents.size > 0) {
    lines.push(`delegateEvents(${JSON.stringify([...needs.delegatedEvents])});`);
  }
  return lines.length > 0 ? lines.join('\n') + '\n' : null;
}
