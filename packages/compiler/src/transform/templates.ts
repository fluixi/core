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
import { avoidBindingClashes, collectIntrinsicEdits, intrinsicImports, type IntrinsicDiagnostic } from './intrinsics.js';
import { collectSourceEdits, mayHaveSourceMarks } from './source-locations.js';
import { collectStyles, finishShadowStyles, type CompiledStyle, type StyleDiagnostic, type StyleLiteral, type StyleOptions, type StylePlan, type StyleReference } from './styles.js';
import { mayHaveIntrinsic, tagIntrinsics } from '../analyze/intrinsics.js';
import { declaredNames } from '../analyze/reactive-bindings.js';
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
  format?: 'jsx' | 'html' | 'both';
  /** Tag marking a template for compilation. @default 'html' */
  htmlTag?: string;
  /** Module the emitted runtime symbols are imported from. @default '@fluixi/dom' */
  runtimeModule?: string;
  /** Where reactive primitives come from. @default '@fluixi/reactive/signal' */
  reactiveModule?: string;
  /**
   * Rewrite a component's destructured props into property reads, so
   * `function Card({ title })` keeps updating instead of reading `title` once.
   * The edits go into the same string as the template edits, so the map still points
   * at what the author wrote.
   * @default true
   */
  propsDestructure?: boolean;
  /**
   * Record where each reactive primitive was created, so the devtools graph can say where a
   * node comes from. Development tooling: leave it off for production, which then carries
   * none of it.
   * @default false
   */
  sourceLocations?: boolean;

  /**
   * Trim this prefix off the file name a source mark records, so a location reads
   * `src/app.tsx:5:16` rather than an absolute path that means nothing to whoever opens it.
   */
  sourceRoot?: string;

  /**
   * Compile the `$` reactive intrinsics: `$signal`, `$memo`, `$effect`, `$store`, into
   * the runtime calls they stand for, importing what they need.
   * @default true
   */
  intrinsics?: boolean;
  /**
   * Compile `<style>` / `<style scoped>` blocks with this CSS processor (the project's
   * @fluixi-css context). Without it, `<style>` is an ordinary element.
   */
  styles?: StyleOptions;
}

export interface UnresolvedDiagnostic {
  /** The tag nothing supplies. */
  name: string;
  message: string;
}

export interface LoadDiagnostic {
  /** The component the directive was written on. */
  name: string;
  strategy: IRLoadStrategy;
  message: string;
}

export interface TransformResult {
  code: string;
  map: ReturnType<MagicString['generateMap']>;
  /** Props patterns the rewrite refused, when `propsDestructure` is on. */
  propsDiagnostics?: PropsDiagnostic[];
  /** `$` names the module bound itself, so the intrinsic did not fire. */
  intrinsicDiagnostics?: IntrinsicDiagnostic[];
  /** `load:` directives that could not take effect, and why. */
  loadDiagnostics?: LoadDiagnostic[];
  /** Capitalised tags nothing supplies: they compile to an undefined reference. */
  unresolvedDiagnostics?: UnresolvedDiagnostic[];
  /** `<style>` blocks taken out of the templates, processed and scoped, for the host to emit. */
  styles?: CompiledStyle[];
  styleDiagnostics?: StyleDiagnostic[];
  /** `css`` values of the module, processed and unscoped, by handle id: emitted where used. */
  styleLiterals?: StyleLiteral[];
  /** Style values interpolated from other modules, for the build to resolve. */
  styleReferences?: StyleReference[];
}

// Which builtin comes from which module is published by resolve/builtins.ts , 
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
 * A direct child: `<li>` in `<ul><li/></ul>`: is not one: the builder recurses
 * into it, and compiling it separately would splice its output into the middle of
 * its parent's. JSX reached through an expression or an attribute value *is* one,
 * because the builder asks for that expression as source text and needs it
 * already compiled.
 */
function isJsxRoot(node: Node, parent: Node | null, key: string): boolean {
  if (!isJsx(node)) return false;
  return !(parent && isJsx(parent) && key === 'children');
}

function isTemplateTag(node: Node, tags: ReadonlyMap<string, string>): boolean {
  return node.type === 'TaggedTemplateExpression' && node.tag?.type === 'Identifier' && tags.has(node.tag.name);
}

/** The edits in `list` that no other edit in `list` contains. */
function outermost(list: Edit[]): Edit[] {
  return list.filter(
    (e) =>
      !list.some(
        (o) =>
          o !== e &&
          o.start <= e.start &&
          o.end >= e.end &&
          o.end - o.start > e.end - e.start &&
          // An insertion at either edge of the container sits beside it, not inside it, so
          // it is not something the container's code already folded in. A statement can
          // start where its callee starts (`$effect(...)`) and a declarator can end where its
          // JSX ends (`const Row = () => <b/>`).
          !(e.start === e.end && (e.start === o.start || e.start === o.end)),
      ),
  );
}

/**
 * Apply edits to a slice of the source.
 *
 * Only the outermost ones: a contained edit was already folded into its
 * container's emitted code, and applying both would splice it twice, the second
 * write landing at an offset the first has already moved.
 */
function slice(code: string, start: number, end: number, edits: Edit[]): string {
  const inside = outermost(edits.filter((e) => e.start >= start && e.end <= end))
    .sort((a, b) => b.start - a.start);
  let out = code.slice(start, end);
  for (const e of inside) out = out.slice(0, e.start - start) + e.code + out.slice(e.end - start);
  return out;
}

/** Describe one `${...}` for the lowering, substituting any template already compiled inside it. */
function bindHole(code: string, expr: Node, edits: Edit[], keepPosition = false): TemplateHole {
  const at = keepPosition ? expr.loc?.start : undefined;
  const hole: TemplateHole = {
    code: slice(code, expr.start, expr.end, edits),
    reactive: isReactiveShape(shapeOf(expr)),
    // Where the `${...}` is, so a binding made from it can say so. The source map cannot:
    // the whole template is one overwrite. Only when source locations were asked for.
    ...(at ? { at: { line: at.line, column: at.column } } : {}),
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
 * outer one is renamed its code already contains hoisted names, and with a
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
  /** Names supplied lazily, as a `deferred(() => import(...))` binding. */
  deferred: Map<string, IRComponentSource>;
  delegatedEvents: Set<string>;
  /**
   * Capitalised tags nothing supplies and nothing binds.
   *
   * These compile to a reference to an identifier that does not exist. The build
   * succeeds: the emitted `createComponent(Summary, ...)` is just a free variable, and
   * the page renders nothing where the component should be. Commenting one line out of a
   * `resolve` map is enough to cause it, which is exactly why it needs saying.
   */
  unresolved: Set<string>;
  /** Every name the file binds, in any scope: so a diagnostic doesn't fire on them. */
  declared: Set<string>;
  /**
   * Components carrying a deferring `load:` that could not be acted on, because the
   * compiler does not supply the binding.
   *
   * Deferring means the compiler *creates* the reference as a dynamic import. A name the
   * author imported is already in the module graph, and rewriting that import away is
   * not something this pass does: so the directive has no effect. Silently, which is
   * the problem: the build succeeds, the chunk ships eagerly, and the only symptom is
   * code that was never split.
   */
  ignoredLoad: Map<string, IRLoadStrategy>;
}

function collectNeeds(node: IRNode, out: Needs): void {
  if (node.kind === 'component' && node.load && !node.source && isDeferred(node.load)) {
    // One report per name, not one per usage.
    if (!out.ignoredLoad.has(node.name)) out.ignoredLoad.set(node.name, node.load);
  }
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

/**
 * An import this file wrote that we can turn into a deferred binding instead.
 *
 * `load:` on a component the author imported did nothing, because deferring means
 * *creating* the reference as a dynamic import and there was already a static one. Here we
 * take the static one away: remove the specifier, emit the `deferred()` binding, and the
 * chunk splits like any other.
 *
 * Only when the name is used **exclusively as a tag**. JSX element names are
 * `JSXIdentifier`, so a component used only in markup has zero `Identifier` references , 
 * which makes the check exact rather than a guess. Anything else (passed to a function,
 * re-exported, `Chart.displayName`) keeps its import and its warning: replacing the real
 * binding with a lazy wrapper would change what those sites see.
 */
function deferrableImport(
  program: Node,
  name: string,
): { module: string; export: string; declaration: Node; specifier: Node } | undefined {
  for (const statement of (program.body as Node[]) ?? []) {
    if (statement.type !== 'ImportDeclaration') continue;

    for (const specifier of (statement.specifiers as Node[]) ?? []) {
      if (specifier.local?.name !== name) continue;
      // A namespace import is the whole module; there is no single export to defer.
      if (specifier.type === 'ImportNamespaceSpecifier') return undefined;

      const exported =
        specifier.type === 'ImportDefaultSpecifier'
          ? 'default'
          : ((specifier.imported?.name ?? specifier.imported?.value) as string);

      return { module: statement.source.value as string, export: exported, declaration: statement, specifier };
    }
  }
  return undefined;
}

/** Whether `name` came in through `import * as name`, which has no single export. */
function hasNamespaceImport(program: Node, name: string): boolean {
  for (const statement of (program.body as Node[]) ?? []) {
    if (statement.type !== 'ImportDeclaration') continue;
    for (const specifier of (statement.specifiers as Node[]) ?? []) {
      if (specifier.type === 'ImportNamespaceSpecifier' && specifier.local?.name === name) return true;
    }
  }
  return false;
}

/** Whether `name` is referenced as a value anywhere, a tag alone does not count. */
function usedAsValue(program: Node, name: string, specifier: Node): boolean {
  let seen = false;
  walk(program, (node) => {
    if (seen || node.type !== 'Identifier' || node.name !== name) return;
    // The import specifier's own local binding is the declaration, not a use.
    if (node.start === specifier.local?.start && node.end === specifier.local?.end) return;
    seen = true;
  });
  return seen;
}

/** The strategy object a `deferred()` binding is given. */
function strategyLiteral(s: IRLoadStrategy): string {
  const parts = [`kind: ${JSON.stringify(s.kind)}`];
  if (s.kind === 'visible' && s.rootMargin) parts.push(`rootMargin: ${JSON.stringify(s.rootMargin)}`);
  if (s.kind === 'interaction') parts.push(`events: ${JSON.stringify(s.events)}`);
  if (s.kind === 'media') parts.push(`query: ${JSON.stringify(s.query)}`);
  return `{ ${parts.join(', ')} }`;
}

/**
 * Offset → line and column, built once per module.
 *
 * The parser reports offsets into this file, since the pieces it is given carry the
 * positions Babel recorded for the quasis.
 */
function positionsIn(code: string): (offset: number) => { line: number; column: number } {
  const starts = [0];
  for (let i = 0; i < code.length; i++) if (code.charCodeAt(i) === 10) starts.push(i + 1);
  return (offset) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (starts[mid] <= offset) low = mid;
      else high = mid - 1;
    }
    return { line: low + 1, column: offset - starts[low] };
  };
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
/** No path module here: this runs in the browser as well as in a bundler. */
function relativeToRoot(id: string, root?: string): string {
  if (!root) return id;
  const base = root.endsWith('/') ? root : `${root}/`;
  return id.startsWith(base) ? id.slice(base.length) : id;
}

export function transformTemplates(
  code: string,
  id: string,
  options: TransformOptions = {},
): TransformResult | null {
  const htmlTag = options.htmlTag ?? 'html';
  const format = options.format ?? 'both';
  const wantsHtml = format !== 'jsx';
  const wantsJsx = format !== 'html';
  const mayHaveTemplate = wantsHtml && (code.includes(`${htmlTag}\``) || code.includes('svg`'));
  // A module can be nothing but `$signal` calls, so the skip check has to look for those
  // too or the file is never parsed.
  const wantsIntrinsics = options.intrinsics !== false && mayHaveIntrinsic(code);
  // A module can be nothing but reactive calls and still need marking, so the skip check
  // has to look for those too when source locations are wanted.
  const wantsSources = options.sourceLocations === true && mayHaveSourceMarks(code);
  // What a mark calls this file. The declaration marks and the usage marks are read back by
  // name, so both passes have to spell it the same way.
  const sourceName = relativeToRoot(id, options.sourceRoot);
  // A module of nothing but css`` values still has literals to compile.
  const wantsStyles = options.styles !== undefined && (code.includes('<style') || code.includes('css`'));
  if (!mayHaveTemplate && !(wantsJsx && code.includes('<')) && !wantsIntrinsics && !wantsSources && !wantsStyles) return null;

  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
    errorRecovery: true,
  });

  // `html`, `svg`, and in an app `$html`/`$svg`/`$css`, which need no import.
  const intrinsicTags = options.intrinsics === false ? new Map<string, string>() : tagIntrinsics(moduleBindings(ast.program));
  const templateTags = new Map<string, string>([[htmlTag, 'html'], ['svg', 'svg']]);
  for (const [name, tag] of intrinsicTags) if (tag !== 'css') templateTags.set(name, tag);
  const cssTags = [...intrinsicTags].filter(([, tag]) => tag === 'css').map(([name]) => name);

  const found: Node[] = [];
  walk(ast.program, (n, parent, key) => {
    if (wantsHtml && isTemplateTag(n, templateTags)) found.push(n);
    else if (wantsJsx && isJsxRoot(n, parent, key)) found.push(n);
  });
  // Props first: holes are sliced out of the function body, so the rewrite has to be
  // in the edit list before any template is compiled.
  const props =
    options.propsDestructure === false
      ? { edits: [], diagnostics: [], used: new Set<string>() }
      : collectPropsEdits(ast.program, code, { runtimeModule: options.runtimeModule });

  // `$signal(...)` → `createSignal(...)`. Same edit list, so the callee is already rewritten
  // by the time a template slices a hole containing one.
  const intrinsics =
    options.intrinsics === false
      ? { edits: [], diagnostics: [], imports: new Map<string, Set<string>>() }
      : collectIntrinsicEdits(ast.program);
  if (intrinsics.edits.length) avoidBindingClashes(ast.program, intrinsics, moduleBindings(ast.program));

  // Where each reactive primitive was created, for the devtools graph. Off unless asked
  // for: it is development tooling, and production should carry none of it.
  // `wantsSources` only decides whether a module with nothing else in it is worth parsing.
  // Past that point the ast exists, and a component declaration is worth marking too.
  const sources =
    options.sourceLocations === true
      ? collectSourceEdits(ast.program, sourceName)
      : { edits: [], marked: 0 };

  // `<style>` blocks, processed by the host's CSS engine and scoped. Only when the host asked:
  // without a processor a `<style>` stays an ordinary element.
  const styles = wantsStyles ? collectStyles(ast.program as never, sourceName, options.styles, { html: templateTags, css: cssTags }, { id, code }) : undefined;

  // Nothing to emit still returns a result when there's something to say, a shadowed
  // intrinsic is a diagnostic even though the code comes back untouched.
  const silent =
    found.length === 0 &&
    props.edits.length === 0 &&
    sources.edits.length === 0 &&
    intrinsics.edits.length === 0 &&
    intrinsics.diagnostics.length === 0 &&
    props.diagnostics.length === 0 &&
    !styles?.edits.length &&
    !styles?.diagnostics.length;
  if (silent) return null;

  // Innermost first, so a nested template is already compiled by the time the
  // hole containing it is sliced.
  found.sort((a, b) => b.start - a.start || a.end - b.end);

  // Seeded with whatever the props rewrite needs, so `splitProps` joins the prologue
  // the templates build rather than getting an import of its own.
  const used = new Set<string>(props.used);
  const needs: Needs = {
    builtins: new Set(), resolved: new Map(), deferred: new Map(), delegatedEvents: new Set(),
    ignoredLoad: new Map(), unresolved: new Set(),
    declared: declaredNames(ast.program),
  };
  const hoisted = new Map<string, string>();
  const edits: Edit[] = [...props.edits, ...intrinsics.edits, ...sources.edits, ...(styles?.edits ?? [])];
  for (const node of found) {
    if (isJsx(node)) {
      edits.push({ start: node.start, end: node.end, code: compileJsx(code, node, edits, used, needs, hoisted, options, sourceName, styles) });
      continue;
    }
    const holes = node.quasi.expressions.map((e: Node) =>
      bindHole(code, e, edits, options.sourceLocations === true),
    );
    const scope = styles?.scopes.find((s) => node.start >= s.start && node.end <= s.end)?.value;
    const owner = styles?.templateOwners.get(node.start);
    const templateStyles =
      options.styles && styles && (scope || owner)
        ? {
            options: options.styles,
            ...(scope ? { scope } : {}),
            ...(owner ? { owner } : {}),
            line: node.loc?.start.line ?? 0,
            column: node.loc?.start.column ?? 0,
            styles: styles.styles,
            diagnostics: styles.diagnostics,
          }
        : undefined;
    const result = compilePieces(toPieces(node), holes, {
      ...options,
      ...(templateStyles ? { templateStyles } : {}),
      hoistTemplates: true,
      // A tag inside a template gets the same mark a JSX tag does. Without one, the nodes it
      // makes are the only ones in the module carrying no mark, and they take whichever was
      // left behind by the last declaration that did.
      ...(options.sourceLocations === true
        ? { sourceFile: sourceName, positionAt: positionsIn(code) }
        : {}),
      // Same defaults as the plugin, so moving a build over is not a rendering change.
      templateClone: options.templateClone ?? true,
      partialTemplates: options.partialTemplates ?? true,
      svg: templateTags.get(node.tag.name) === 'svg',
    });
    for (const symbol of result.imports) used.add(symbol);
    collectNeeds(result.ir, needs);
    edits.push({ start: node.start, end: node.end, code: adoptTemplates(result.code, result.templates, hoisted) });
  }

  // A shadow-DOM element's blocks and css`` values go into its `static styles`, once every
  // template has been compiled and its blocks numbered.
  if (styles && options.styles) edits.push(...finishShadowStyles(styles, code, id));

  const out = new MagicString(code);
  // Same reason as in `slice`: a nested edit is already inside its parent's code.
  for (const e of outermost(edits)) {
    // A zero-width edit is an insertion (the splitProps call), not a replacement.
    if (e.start === e.end) out.appendLeft(e.start, e.code);
    else out.overwrite(e.start, e.end, e.code);
  }

  const bound = moduleBindings(ast.program);
  // A `load:` on an import the author wrote: take the import away and let the prologue
  // emit the deferred binding, so this spelling and a `resolve` rule produce the same
  // output rather than merely equivalent output.
  const why = new Map<string, 'value' | 'namespace' | 'local' | 'unsupplied'>();

  for (const [name] of needs.ignoredLoad) {
    if (!bound.has(name)) why.set(name, 'unsupplied');
  }

  for (const [name, strategy] of [...needs.ignoredLoad]) {
    if (!bound.has(name)) continue;

    const found = deferrableImport(ast.program as never, name);
    if (!found) {
      // Bound, but not by an import we can turn into a dynamic one.
      why.set(name, hasNamespaceImport(ast.program as never, name) ? 'namespace' : 'local');
      continue;
    }
    if (usedAsValue(ast.program as never, name, found.specifier)) {
      why.set(name, 'value');
      continue;
    }

    const rest = (found.declaration.specifiers as Node[]).filter((sp) => sp !== found.specifier);
    // Take the line's newline with it when the whole statement goes, or the output keeps
    // a blank line exactly where the import used to be.
    const end =
      rest.length === 0 && code[found.declaration.end] === '\n'
        ? found.declaration.end + 1
        : found.declaration.end;
    out.overwrite(
      found.declaration.start,
      end,
      rest.length === 0
        ? ''
        : `import { ${rest.map((sp) => code.slice(sp.start, sp.end)).join(', ')} } from ` +
            `${JSON.stringify(found.declaration.source.value)};`,
    );

    needs.deferred.set(name, { module: found.module, export: found.export, origin: 'rule', loading: strategy });
    // The prologue skips names the file binds, and this one no longer does.
    bound.delete(name);
    needs.ignoredLoad.delete(name);
  }

  const prologue = buildPrologue(used, needs, hoisted, bound, options);
  if (prologue) out.prepend(prologue);
  const runtimeImports = intrinsicImports(intrinsics, bound);
  if (runtimeImports) out.prepend(runtimeImports);

  // Each of these has a different fix, so the message has to name the actual reason.
  // Saying "drop the import" to someone whose component is used as a value sends them
  // somewhere that does not work.
  const reasons: Record<string, (name: string) => string> = {
    value: (name) =>
      `${name} is used as a value here, not only as a tag, so its import has to stay — ` +
      `deferring would hand those references a lazy wrapper instead of the component. ` +
      `Defer it at the point it is rendered, or keep it eager.`,
    namespace: (name) =>
      `${name} came in through a namespace import, which has no single export to defer. ` +
      `Import ${name} by name.`,
    local: (name) =>
      `${name} is declared in this file, so there is no module to load separately. ` +
      `Move it to its own file and import it.`,
    unsupplied: (name) =>
      `nothing supplies ${name}, so there is no import to defer. Import it, or add a ` +
      `\`resolve\` rule for it.`,
  };

  const loadDiagnostics = [...needs.ignoredLoad].map(([name, strategy]) => ({
    name,
    strategy,
    message: `load:${strategy.kind} has no effect on <${name}>: ${reasons[why.get(name) ?? 'unsupplied']!(name)}`,
  }));

  const unresolvedDiagnostics = [...needs.unresolved].map((name) => ({
    name,
    message:
      `<${name}> is not defined: nothing imports it and no \`resolve\` rule supplies it. ` +
      `This compiles to a reference to a name that does not exist, so the component renders ` +
      `nothing. Import ${name}, or add a \`resolve\` rule for it.`,
  }));

  return {
    code: out.toString(),
    map: out.generateMap({ source: id, includeContent: true, hires: true }),
    ...(loadDiagnostics.length ? { loadDiagnostics } : {}),
    ...(unresolvedDiagnostics.length ? { unresolvedDiagnostics } : {}),
    ...(props.diagnostics.length ? { propsDiagnostics: props.diagnostics } : {}),
    ...(intrinsics.diagnostics.length ? { intrinsicDiagnostics: intrinsics.diagnostics } : {}),
    ...(styles?.styles.length ? { styles: styles.styles } : {}),
    ...(styles?.diagnostics.length ? { styleDiagnostics: styles.diagnostics } : {}),
    ...(styles?.literals.length ? { styleLiterals: styles.literals } : {}),
    ...(styles?.references.length ? { styleReferences: styles.references } : {}),
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
  used: Set<string>,
  needs: Needs,
  hoisted: Map<string, string>,
  options: TransformOptions,
  sourceFile?: string,
  styles?: StylePlan,
): string {
  const ir = buildJsxIR(node as never, {
    code: (n) => slice(code, (n as Node).start, (n as Node).end, edits),
    used,
    ...(styles?.scopes.length ? { scopes: styles.scopes } : {}),
    ...(styles?.drop.size ? { dropStyles: styles.drop } : {}),
    ...(options.sourceLocations === true && sourceFile ? { sourceFile } : {}),
  });
  analyzeStatic(ir);
  const report = resolveComponentSources(ir, {
    resolver: createComponentResolver(options.resolve ?? []),
    // Without this the pass calls every author-imported component unresolved, and the
    // report is unusable for diagnostics.
    isBound: (name) => needs.declared.has(name),
    modules: {
      controlFlowModule: options.controlFlowModule ?? options.runtimeModule ?? '@fluixi/dom',
      coreModule: options.coreModule ?? '@fluixi/core',
      routerModule: options.routerModule ?? '@fluixi/core/router',
    },
    strategyFor: (n) => n.load,
  });
  for (const name of report.unresolved) needs.unresolved.add(name);
  collapseStrategies(ir);
  const emitted = imperativeBackend.emit(ir, {
    templateClone: options.templateClone ?? true,
    partialTemplates: options.partialTemplates ?? true,
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
    else if (ROUTER.has(name)) add(options.routerModule ?? '@fluixi/core/router', name);
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
