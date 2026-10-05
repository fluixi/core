/**
 * `<style>` and `<style scoped>` in a component.
 *
 * The compiler owns which component a style belongs to and the scoping; what the CSS means
 * (`@apply`, utilities, variants, theme values, nesting) is the CSS engine's, reached through
 * the `process` function the host passes in, the same engine and context the project's own CSS
 * goes through. The host gets the processed CSS back and decides where it goes; the element
 * itself leaves the template.
 *
 * Scoping marks every element the component renders with `data-fx-s="<id>"` at compile time
 * (part of the static template, so client renders, SSR and hydration all carry it) and adds
 * `[data-fx-s="<id>"]` to the last compound of each selector.
 */
import { encode } from '@jridgewell/sourcemap-codec';
/** A Babel AST node, as the rest of the compiler reads it: loosely. */
interface Node {
  type: string;
  start?: number | null;
  end?: number | null;
  loc?: { start: { line: number; column: number } } | null;
  [key: string]: any;
}

/** The engine's AST: what `processCss` from @fluixi-css returns. */
/** Where a node was written: line from 1, column from 0. */
export interface StyleLoc {
  source: string;
  line: number;
  column: number;
}

export type StyleNode =
  | { kind: 'declaration'; property: string; value: string; important: boolean; loc?: StyleLoc }
  | { kind: 'rule'; selector: string; nodes: StyleNode[]; loc?: StyleLoc }
  | { kind: 'at-rule'; name: string; params: string; nodes: StyleNode[]; loc?: StyleLoc }
  | { kind: 'raw'; text: string; loc?: StyleLoc };

/** A V3 source map. */
export interface StyleMap {
  version: 3;
  sources: string[];
  sourcesContent: string[];
  names: string[];
  mappings: string;
}

export interface StyleOptions {
  /** CSS in, flattened engine AST out: `(css, from) => processCss(css, ctx, { from }).ast`. */
  process(css: string, from: string): StyleNode[];
  minify?: boolean;
  /** Modules whose `css` export is the portable literal. Default `['@fluixi/core', '@fluixi/dom']`. */
  cssModules?: string[];
  /**
   * Style values from other modules, resolved by the build, keyed `${source}#${exportName}` as
   * the import names them. A reference not in here is reported in `styleReferences`.
   */
  imported?: Map<string, StyleNode[]>;
}

/** A `css`` value: portable, unscoped, emitted only where something uses it. */
export interface StyleLiteral {
  id: string;
  /** The variable it is bound to. */
  name: string;
  css: string;
}

/** An interpolated style value from another module, for the build to resolve. */
export interface StyleReference {
  /** The export it is, in `source`. */
  name: string;
  source: string;
  line: number;
  column: number;
}

export interface CompiledStyle {
  /** The scope id for a scoped block, the component's for a global one. */
  id: string;
  scoped: boolean;
  /** The component the block belongs to, as named in the source. */
  component: string;
  css: string;
  /** Back to the module, when the host gave its id and code. */
  map?: StyleMap;
  /** For a shadow-DOM element: adopted by its shadow root (static styles), not a page stylesheet. */
  shadow?: boolean;
  line: number;
  column: number;
}

/** A custom element class with a shadow root, and what its styles are made of. */
interface ShadowClass {
  node: Node;
  /** Its `static styles = …`, when it has one. */
  styles?: Node;
  /** Indexes in `plan.styles` of the blocks its render holds. */
  indexes: number[];
}

export interface StyleDiagnostic {
  line: number;
  column: number;
  message: string;
}

export interface StylePlan {
  /** Source ranges whose intrinsic elements get `data-fx-s`, with the value. */
  scopes: { start: number; end: number; value: string }[];
  /** `` html`` `` templates holding a `<style>`, by start offset: whose block it is. */
  templateOwners: Map<number, { id: string; component: string }>;
  /** Start offsets of the `<style>` elements to leave out of the template. */
  drop: Set<number>;
  styles: CompiledStyle[];
  diagnostics: StyleDiagnostic[];
  /** Source edits: each `css`` replaced by its handle, the `css` import taken out. */
  edits: { start: number; end: number; code: string }[];
  literals: StyleLiteral[];
  references: StyleReference[];
  shadowClasses: Map<Node, ShadowClass>;
  /** The module's `css`` names and imports, for rewriting a shadow class's `static styles`. */
  names?: { literals: Map<string, Node>; imports: Map<string, { source: string; name: string }> };
}

export const SCOPE_ATTR = 'data-fx-s';

const FUNCTIONS = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ObjectMethod', 'ClassMethod']);

/** Finds the style blocks of a module and compiles them. Without `options`, nothing happens. */
export function collectStyles(
  program: Node,
  sourceName: string,
  options: StyleOptions | undefined,
  /** Template tags by name (`html`, `$html`), and the `css` tags a module may use unimported (`$css`). */
  tags: { html: ReadonlyMap<string, string>; css?: string[] } = { html: new Map([['html', 'html']]) },
  /** The module as the host knows it, for source maps that point into it. */
  module?: { id: string; code: string },
): StylePlan {
  const plan: StylePlan = {
    scopes: [], templateOwners: new Map(), drop: new Set(), styles: [], diagnostics: [], edits: [], literals: [], references: [],
    shadowClasses: new Map(),
  };
  if (!options) return plan;
  const literalsOf = findLiterals(program, options.cssModules ?? ['@fluixi/core', '@fluixi/dom'], plan, tags.css ?? []);
  plan.names = literalsOf;
  // A class method's class, for telling whether a render belongs to a shadow-DOM element.
  const classOf = new Map<Node, Node>();
  const shadowOf = (owner: Node) => {
    const cls = classOf.get(owner);
    return cls ? plan.shadowClasses.get(cls) : undefined;
  };
  const resolved = new Map<string, StyleNode[] | null>();

  // A `css`` value's nodes: each static piece processed on its own, interpolated values put
  // in between, in order. Composition happens on the AST, so the cascade is the written one,
  // and interpolation can only stand between rules.
  const piecesToNodes = (quasis: Node[], expressions: Node[], at: { line: number; column: number }, stack: string[]): StyleNode[] | null => {
    const out: StyleNode[] = [];
    for (let i = 0; i < quasis.length; i++) {
      const text = (quasis[i]!.value.cooked ?? quasis[i]!.value.raw) as string;
      if (text.trim()) {
        try {
          // The engine's positions count from the piece; the piece starts where its quasi does.
          const start = quasis[i]!.loc?.start as { line: number; column: number } | undefined;
          out.push(...options.process(text, sourceName).map((n) => (start ? shiftLoc(n, sourceName, start) : n)));
        } catch (error) {
          plan.diagnostics.push({ ...at, message: `CSS could not be processed: ${(error as Error).message}` });
          return null;
        }
      }
      const expr = expressions[i];
      if (!expr) continue;
      const value = expr.type === 'Identifier' ? resolveLiteral(expr.name, at, stack) : undefined;
      if (value === undefined) {
        plan.diagnostics.push({
          ...at,
          message: 'Only css`` values can be interpolated into styles, and only by name: ${base}. Dynamic values go through custom properties (style:--x={...} and var(--x)).',
        });
        return null;
      }
      if (value === null) return null;
      out.push(...value);
    }
    return out;
  };

  /** A literal's nodes; `undefined` when the name is not a style value at all. */
  function resolveLiteral(name: string, at: { line: number; column: number }, stack: string[]): StyleNode[] | null | undefined {
    const imported = literalsOf.imports.get(name);
    if (imported) {
      const nodes = options?.imported?.get(`${imported.source}#${imported.name}`);
      // Their positions count from printed CSS, not from any source file.
      if (nodes) return nodes.map(dropLoc);
      plan.references.push({ name: imported.name, source: imported.source, ...at });
      // Without `imported` the host has not looked yet; with it, it looked and found nothing.
      plan.diagnostics.push({
        ...at,
        message: options?.imported
          ? `${name} from ${imported.source} is not a css\`\` value the build could find.`
          : `${name} comes from ${imported.source}: style values from another module are resolved by the build.`,
      });
      return null;
    }
    const literal = literalsOf.literals.get(name);
    if (!literal) return undefined;
    if (stack.includes(name)) {
      plan.diagnostics.push({ ...at, message: `css\`\` values include each other: ${[...stack, name].join(' → ')}.` });
      return null;
    }
    if (!resolved.has(name)) {
      resolved.set(name, piecesToNodes(literal.quasi.quasis, literal.quasi.expressions, at, [...stack, name]));
    }
    return resolved.get(name)!;
  }

  for (const [name, literal] of literalsOf.literals) {
    const at = { line: literal.loc?.start.line ?? 0, column: literal.loc?.start.column ?? 0 };
    const nodes = resolveLiteral(name, at, []);
    const id = hash(`${sourceName}:css:${name}`);
    plan.edits.push({ start: literal.start!, end: literal.end!, code: `({ $fxStyle: ${JSON.stringify(id)} })` });
    if (nodes) plan.literals.push({ id, name, css: printStyle(nodes, options.minify) });
  }
  const scopeOf = new Map<Node, string>();
  const names = new Map<string, number>();
  // `const Card = () => …`: the component's name is the variable's.
  const named = new Map<Node, string>();

  const visit = (node: Node, owners: Node[]) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init && FUNCTIONS.has(node.init.type)) {
      named.set(node.init, node.id.name);
    }
    // A custom element's `render()` belongs to the class: the element is the component.
    if ((node.type === 'ClassDeclaration' || node.type === 'ClassExpression') && node.id) {
      for (const member of node.body.body) if (member.type === 'ClassMethod') named.set(member, node.id.name);
    }
    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
      for (const member of node.body.body) if (member.type === 'ClassMethod') classOf.set(member, node);
      const shadow = staticMember(node, 'shadow');
      if (shadow?.value && !(shadow.value.type === 'BooleanLiteral' && shadow.value.value === false)) {
        plan.shadowClasses.set(node, { node, styles: staticMember(node, 'styles'), indexes: [] });
      }
    }
    if (node.type === 'TaggedTemplateExpression' && node.tag.type === 'Identifier' && tags.html.get(node.tag.name) === 'html') {
      const text = node.quasi.quasis.map((q: Node) => q.value.raw).join('');
      if (/<style[\s>]/.test(text)) {
        const at = { line: node.loc?.start.line ?? 0, column: node.loc?.start.column ?? 0 };
        const owner = owners[0];
        if (!owner) plan.diagnostics.push({ ...at, message: '<style> has to be written inside a component.' });
        else {
          const id = idFor(owner);
          const shadow = shadowOf(owner);
          plan.templateOwners.set(node.start!, { id, component: functionName(owner, named) });
          // The blocks are compiled here, from the template's own pieces, so `${base}` resolves
          // as it does in JSX; the template compile only takes the elements out.
          for (const block of templateBlocks(node.quasi)) compileBlock(block, block.scoped, owner, at);
        }
      }
    }
    const inner = FUNCTIONS.has(node.type) ? [...owners, node] : owners;
    if (node.type === 'JSXElement' && isStyle(node)) {
      handle(node, owners);
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments') continue;
      const value = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(value)) for (const v of value) visit(v as Node, inner);
      else if (value && typeof value === 'object' && 'type' in (value as object)) visit(value as Node, inner);
    }
  };

  const handle = (node: Node, owners: Node[]) => {
    const at = { line: node.loc?.start.line ?? 0, column: node.loc?.start.column ?? 0 };
    const pieces = blockPieces(node);
    if (pieces === null) {
      plan.diagnostics.push({
        ...at,
        message: '<style> needs its CSS as one template literal, <style>{`...`}</style>: JSX reads a bare `{` as an expression.',
      });
      return;
    }
    // The component is the outermost function around the block: inner callbacks (a list's
    // render function) render the same component's elements.
    const owner = owners[0];
    if (!owner) {
      plan.diagnostics.push({ ...at, message: '<style> has to be written inside a component.' });
      return;
    }
    compileBlock(pieces, isScoped(node), owner, at);
    plan.drop.add(node.start!);
  };

  const compileBlock = (
    pieces: { quasis: Node[]; expressions: Node[] },
    scoped: boolean,
    owner: Node,
    at: { line: number; column: number },
  ) => {
    const component = functionName(owner, named);
    const id = idFor(owner);
    const processed = piecesToNodes(pieces.quasis, pieces.expressions, at, []);
    if (!processed) return;
    let nodes = processed;
    const shadow = shadowOf(owner);
    // Everything in the block, composed values included, takes the one scope. A shadow root
    // needs none: its styles do not reach out, and the page's do not reach in.
    if (scoped && !shadow) {
      if (!plan.scopes.some((s) => s.value === id)) plan.scopes.push({ start: owner.start!, end: owner.end!, value: id });
      nodes = scopeNodes(nodes, id, (message) => plan.diagnostics.push({ ...at, message }));
    }
    const printed = module ? printStyleWithMap(nodes, options.minify, sourceName, module) : { css: printStyle(nodes, options.minify) };
    plan.styles.push({ id, scoped: scoped && !shadow, component, ...printed, ...(shadow ? { shadow: true } : {}), ...at });
    if (shadow) shadow.indexes.push(plan.styles.length - 1);
  };

  // One id per component: every block it has, scoped or not, JSX or template, shares it.
  function idFor(owner: Node): string {
    let id = scopeOf.get(owner);
    if (!id) {
      const component = functionName(owner, named);
      const seen = names.get(component) ?? 0;
      names.set(component, seen + 1);
      id = hash(`${sourceName}:${component}${seen ? ':' + seen : ''}`);
      scopeOf.set(owner, id);
    }
    return id;
  }

  visit(program, []);
  return plan;
}

// ─── `` html`` `` templates ──────────────────────────────────────────────────

/** What a template's compile needs to know about styles, and where it reports them. */
export interface TemplateStyles {
  options: StyleOptions;
  /** Stamp every element of the template with this scope. */
  scope?: string;
  /** Whose `<style>` blocks this template holds: they were compiled with the module. */
  owner?: { id: string; component: string };
  line: number;
  column: number;
  styles: CompiledStyle[];
  diagnostics: StyleDiagnostic[];
}

interface IRLike {
  kind: string;
  tag?: string;
  props?: { name: string; kind: string; literal?: unknown }[];
  children?: IRLike[];
  value?: string;
}

/**
 * The template form: after lowering, a `<style>` is an element with raw text. It is taken out,
 * compiled like a JSX block, and the template's other elements get the scope.
 */
export function applyTemplateStyles(ir: IRLike, t: TemplateStyles): void {
  const walk = (node: IRLike) => {
    const children = node.children;
    if (children) {
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i]!;
        if (child.kind === 'element' && child.tag === 'style' && t.owner) children.splice(i, 1);
        else walk(child);
      }
    }
    if (t.scope && node.kind === 'element' && node.tag !== 'style' && node.props && !node.props.some((p) => p.name === SCOPE_ATTR)) {
      node.props.unshift({ name: SCOPE_ATTR, kind: 'attr', literal: t.scope });
    }
  };
  walk(ir);
}

function staticMember(cls: Node, name: string): Node | undefined {
  return cls.body.body.find(
    (m: Node) => m.type === 'ClassProperty' && m.static && ((m.key.type === 'Identifier' && m.key.name === name) || (m.key.type === 'StringLiteral' && m.key.value === name)),
  );
}

/**
 * A shadow-DOM element's styles: once every block is compiled, each class's blocks and the
 * `css`` values named in its `static styles` become `?inline` imports of their processed CSS
 * (the text `static styles` takes), and the class's `static styles` lists them.
 */
/**
 * Where a component's style blocks and css`` values are served: next to the component, a path
 * ending in `.css`. Every CSS tool in the bundler then sees CSS, and none sees TSX: Vite 8
 * matches its transforms on the path without the query, so `card.tsx?…` would read as a .tsx.
 * `?inline` (Vite's own) asks for the CSS as a string, for a shadow root.
 */
export const styleIds = {
  block: (owner: string, index: number) => `${owner}.fx-${index}.css`,
  inline: (owner: string, index: number) => `${owner}.fx-${index}.css?inline`,
  literal: (owner: string, name: string) => `${owner}.fx-literal-${name}.css?inline`,
};

export function finishShadowStyles(plan: StylePlan, code: string, moduleId: string): { start: number; end: number; code: string }[] {
  const edits: { start: number; end: number; code: string }[] = [];
  const imports: string[] = [];
  let next = 0;
  const importOf = (specifier: string) => {
    const local = `__fxShadow${next++}`;
    imports.push(`import ${local} from ${JSON.stringify(specifier)};\n`);
    return local;
  };
  for (const shadow of plan.shadowClasses.values()) {
    const blocks = shadow.indexes.map((i) => importOf(styleIds.inline(moduleId, i)));
    let value: string | undefined;
    const prop = shadow.styles;
    if (prop?.value) {
      // `css`` values named in it become their CSS; anything else is left as written.
      const start = prop.value.start as number;
      let text = code.slice(start, prop.value.end as number);
      const replacements: { at: number; length: number; with: string }[] = [];
      walkIdentifiers(prop.value, (id) => {
        const local = plan.names?.literals.has(id.name)
          ? importOf(styleIds.literal(moduleId, id.name))
          : plan.names?.imports.has(id.name) && !/\.css(\?|$)/.test(plan.names.imports.get(id.name)!.source)
            ? importOf(styleIds.literal(plan.names.imports.get(id.name)!.source, plan.names.imports.get(id.name)!.name))
            : undefined;
        if (local) replacements.push({ at: (id.start as number) - start, length: id.name.length, with: local });
      });
      for (const r of replacements.sort((a, b) => b.at - a.at)) text = text.slice(0, r.at) + r.with + text.slice(r.at + r.length);
      value = text;
    }
    if (!blocks.length && value === undefined) continue;
    if (prop?.value) {
      const merged = blocks.length ? `[${value}, ${blocks.join(', ')}]` : value!;
      edits.push({ start: prop.value.start as number, end: prop.value.end as number, code: merged });
    } else if (blocks.length) {
      const open = (shadow.node.body.start as number) + 1;
      edits.push({ start: open, end: open, code: ` static styles = [${blocks.join(', ')}];` });
    }
  }
  if (imports.length) edits.push({ start: 0, end: 0, code: imports.join('') });
  return edits;
}

function walkIdentifiers(node: Node, visit: (id: Node) => void): void {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'Identifier') return visit(node);
  if (node.type === 'MemberExpression') return walkIdentifiers(node.object, visit);
  if (node.type === 'ObjectProperty') return walkIdentifiers(node.value, visit);
  for (const key of Object.keys(node)) {
    if (key === 'loc') continue;
    const value = (node as Record<string, unknown>)[key];
    if (Array.isArray(value)) for (const v of value) walkIdentifiers(v as Node, visit);
    else if (value && typeof value === 'object' && 'type' in (value as object)) walkIdentifiers(value as Node, visit);
  }
}

function isStyle(node: Node): boolean {
  const name = node.openingElement.name;
  return name.type === 'JSXIdentifier' && name.name === 'style';
}

function isScoped(node: Node): boolean {
  return node.openingElement.attributes.some((a: Node) => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === 'scoped');
}

/** The block's template pieces, a string counting as one piece; `null` when it is anything else. */
/**
 * The `<style>` blocks of an html`` template, as pieces of its quasis: the CSS between the
 * tags, with the `${…}` that stand in it. Each piece keeps the position it starts at.
 */
function templateBlocks(quasi: Node): { quasis: Node[]; expressions: Node[]; scoped: boolean }[] {
  const blocks: { quasis: Node[]; expressions: Node[]; scoped: boolean }[] = [];
  let open: { quasis: Node[]; expressions: Node[]; scoped: boolean } | null = null;
  quasi.quasis.forEach((q: Node, i: number) => {
    const raw = q.value.raw as string;
    let from = 0;
    while (from <= raw.length) {
      if (!open) {
        const tag = /<style\b([^>]*)>/g;
        tag.lastIndex = from;
        const m = tag.exec(raw);
        if (!m) break;
        open = { quasis: [], expressions: [], scoped: /\bscoped\b/.test(m[1]!) };
        from = m.index + m[0].length;
      }
      const close = raw.indexOf('</style', from);
      open.quasis.push(slicePiece(q, raw, from, close === -1 ? raw.length : close));
      if (close === -1) break;
      blocks.push(open);
      open = null;
      from = close;
    }
    const expr = quasi.expressions[i];
    if (open && expr) open.expressions.push(expr);
  });
  return blocks;
}

function slicePiece(q: Node, raw: string, from: number, to: number): Node {
  const text = raw.slice(from, to);
  const start = q.loc?.start as { line: number; column: number } | undefined;
  if (!start) return { type: 'TemplateElement', value: { raw: text, cooked: text } } as Node;
  const before = raw.slice(0, from).split('\n');
  const line = start.line + before.length - 1;
  const column = before.length > 1 ? before[before.length - 1]!.length : start.column + from;
  return { type: 'TemplateElement', value: { raw: text, cooked: text }, loc: { start: { line, column } } } as Node;
}

function blockPieces(node: Node): { quasis: Node[]; expressions: Node[] } | null {
  const meaningful = node.children.filter((c: Node) => !(c.type === 'JSXText' && !c.value.trim()));
  if (meaningful.length === 0) return { quasis: [], expressions: [] };
  if (meaningful.length !== 1) return null;
  const only = meaningful[0]!;
  if (only.type !== 'JSXExpressionContainer') return null;
  const expr = only.expression;
  if (expr.type === 'StringLiteral') return { quasis: [{ type: 'TemplateElement', value: { raw: expr.value, cooked: expr.value } }], expressions: [] };
  if (expr.type === 'TemplateLiteral') return { quasis: expr.quasis, expressions: expr.expressions };
  return null;
}

/**
 * The module's `css` binding and its `css`` declarations. The import is rewritten without
 * `css`: every use is compiled away, and the engine has no business in a browser bundle.
 */
function findLiterals(
  program: Node,
  modules: string[],
  plan: StylePlan,
  intrinsic: string[],
): { literals: Map<string, Node>; imports: Map<string, { source: string; name: string }> } {
  const literals = new Map<string, Node>();
  // Local name → where it comes from and the export it is (`import { base as b }`: b → base).
  const imports = new Map<string, { source: string; name: string }>();
  const tags = new Set(intrinsic);
  for (const statement of program.body ?? []) {
    if (statement.type !== 'ImportDeclaration') continue;
    const source = statement.source.value as string;
    const specifiers = statement.specifiers as Node[];
    for (const sp of specifiers) {
      if (sp.type === 'ImportSpecifier') imports.set(sp.local.name, { source, name: sp.imported.name ?? sp.imported.value });
    }
    if (!modules.includes(source)) continue;
    const css = specifiers.find((sp) => sp.type === 'ImportSpecifier' && (sp.imported.name ?? sp.imported.value) === 'css');
    if (!css) continue;
    const local = css.local.name as string;
    tags.add(local);
    imports.delete(local);
    plan.edits.push({ start: statement.start!, end: statement.end!, code: importWithout(statement, css) });
  }
  // A component that only composes imported values has no `css` import of its own: its
  // imports still name where those values come from.
  if (tags.size === 0) return { literals, imports };
  const visit = (node: Node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init?.type === 'TaggedTemplateExpression' && node.init.tag.type === 'Identifier' && tags.has(node.init.tag.name)) {
      literals.set(node.id.name, node.init);
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc') continue;
      const value = (node as Record<string, unknown>)[key];
      if (Array.isArray(value)) for (const v of value) visit(v as Node);
      else if (value && typeof value === 'object' && 'type' in (value as object)) visit(value as Node);
    }
  };
  visit(program);
  return { literals, imports };
}

function importWithout(statement: Node, removed: Node): string {
  const rest = (statement.specifiers as Node[]).filter((sp) => sp !== removed);
  const source = JSON.stringify(statement.source.value);
  if (rest.length === 0) return '';
  const def = rest.find((sp) => sp.type === 'ImportDefaultSpecifier');
  const ns = rest.find((sp) => sp.type === 'ImportNamespaceSpecifier');
  const named = rest.filter((sp) => sp.type === 'ImportSpecifier').map((sp) => {
    const imported = sp.imported.name ?? JSON.stringify(sp.imported.value);
    return imported === sp.local.name ? imported : `${imported} as ${sp.local.name}`;
  });
  const parts = [def?.local.name, ns ? `* as ${ns.local.name}` : undefined, named.length ? `{ ${named.join(', ')} }` : undefined].filter(Boolean);
  return `import ${parts.join(', ')} from ${source};`;
}

function functionName(fn: Node, named: Map<Node, string>): string {
  if ((fn.type === 'FunctionDeclaration' || fn.type === 'FunctionExpression') && fn.id) return fn.id.name;
  return named.get(fn) ?? 'anonymous';
}

/** FNV-1a, 32 bits, base 36: short, stable for the same file and component everywhere. */
export function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// ─── Scoping ─────────────────────────────────────────────────────────────────

// Selectors of these at-rules are not element selectors (`from`, `50%`) or there are none.
const OPAQUE = /(^|-)keyframes$|^font-face$|^property$|^counter-style$|^page$|^font-feature-values$/;

/** Adds the scope to every selector, through grouping at-rules; keyframes and the like are left. */
export function scopeNodes(nodes: StyleNode[], id: string, warn: (message: string) => void = () => {}): StyleNode[] {
  return nodes.map((node) => {
    if (node.kind === 'rule') return { ...node, selector: scopeSelector(node.selector, id, warn) };
    if (node.kind === 'at-rule' && !OPAQUE.test(node.name)) return { ...node, nodes: scopeNodes(node.nodes, id, warn) };
    return node;
  });
}

/** Scopes a selector list: each complex selector gets the scope on its last compound. */
export function scopeSelector(selector: string, id: string, warn: (message: string) => void = () => {}): string {
  return splitTop(selector, ',')
    .map((complex) => scopeComplex(complex.trim(), `[${SCOPE_ATTR}="${id}"]`, warn))
    .join(', ');
}

function scopeComplex(selector: string, attr: string, warn: (message: string) => void): string {
  if (/:host\b|::slotted\(/.test(selector)) {
    warn(`\`${selector}\` only means something in a shadow root; in a light-DOM component it is left as written.`);
    return selector;
  }
  const parts = compounds(selector);
  // `:deep(x)` scopes what comes before it and leaves `x` free; `:global(x)` is never scoped.
  const deep = parts.findIndex((p) => p.text.startsWith(':deep('));
  if (deep !== -1) {
    const inner = unwrap(parts[deep]!.text, ':deep(');
    const before = parts.slice(0, deep);
    if (before.length === 0) return `${attr} ${inner}`;
    const scopedBefore = scopeAt(before, before.length - 1, attr);
    return `${join(scopedBefore)} ${inner}`;
  }
  let target = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!parts[i]!.text.startsWith(':global(')) {
      target = i;
      break;
    }
  }
  const out = target === -1 ? parts : scopeAt(parts, target, attr);
  return join(out.map((p) => (p.text.startsWith(':global(') ? { ...p, text: unwrap(p.text, ':global(') } : p)));
}

interface Compound {
  /** The combinator before it (' ', '>', '+', '~'), empty for the first. */
  combinator: string;
  text: string;
}

function scopeAt(parts: Compound[], index: number, attr: string): Compound[] {
  return parts.map((p, i) => (i === index ? { ...p, text: insertAttr(p.text, attr) } : p));
}

/** Puts the attribute before the compound's pseudo-elements and pseudo-classes: `a[s]:hover::before`. */
function insertAttr(compound: string, attr: string): string {
  let depth = 0;
  let quote = '';
  for (let i = 0; i < compound.length; i++) {
    const c = compound[i]!;
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '\\') {
      i++;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ':' && depth === 0 && i > 0) return compound.slice(0, i) + attr + compound.slice(i);
  }
  return compound + attr;
}

function compounds(selector: string): Compound[] {
  const out: Compound[] = [];
  let depth = 0;
  let quote = '';
  let current = '';
  let combinator = '';
  const push = () => {
    if (current.trim()) out.push({ combinator: out.length ? combinator || ' ' : '', text: current.trim() });
    current = '';
    combinator = '';
  };
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i]!;
    if (quote) {
      current += c;
      if (c === '\\') current += selector[++i] ?? '';
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '\\') {
      current += c + (selector[++i] ?? '');
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    if (c === '(' || c === '[') depth++;
    if (c === ')' || c === ']') depth--;
    if (depth === 0 && (c === '>' || c === '+' || c === '~')) {
      push();
      combinator = c;
      continue;
    }
    if (depth === 0 && /\s/.test(c)) {
      if (current.trim()) {
        const keep = combinator;
        push();
        combinator = keep;
      }
      continue;
    }
    current += c;
  }
  push();
  return out;
}

function join(parts: Compound[]): string {
  return parts.map((p, i) => (i === 0 ? p.text : p.combinator === ' ' ? ` ${p.text}` : ` ${p.combinator} ${p.text}`)).join('');
}

function unwrap(text: string, prefix: string): string {
  return text.slice(prefix.length, text.lastIndexOf(')')).trim() + text.slice(text.lastIndexOf(')') + 1);
}

function splitTop(selector: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i]!;
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '\\') i++;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === separator && depth === 0) {
      parts.push(selector.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(selector.slice(start));
  return parts.filter((p) => p.trim());
}

// ─── Printing ────────────────────────────────────────────────────────────────

function shiftLoc(node: StyleNode, source: string, start: { line: number; column: number }): StyleNode {
  const loc = node.loc && node.loc.source === source
    ? { source, line: start.line + node.loc.line - 1, column: node.loc.line === 1 ? start.column + node.loc.column : node.loc.column }
    : node.loc;
  if (node.kind === 'rule' || node.kind === 'at-rule') return { ...node, loc, nodes: node.nodes.map((n) => shiftLoc(n, source, start)) };
  return { ...node, loc } as StyleNode;
}

function dropLoc(node: StyleNode): StyleNode {
  const { loc: _loc, ...rest } = node;
  if (rest.kind === 'rule' || rest.kind === 'at-rule') return { ...rest, nodes: rest.nodes.map(dropLoc) } as StyleNode;
  return rest as StyleNode;
}

/**
 * Prints like `printStyle`, with a map from each rule and declaration back to where it was
 * written in the module: the browser's devtools then show the `.tsx` line, not the generated CSS.
 */
export function printStyleWithMap(
  nodes: StyleNode[],
  minify: boolean | undefined,
  sourceName: string,
  module: { id: string; code: string },
): { css: string; map: StyleMap } {
  const lines: [number, number, number, number][][] = [[]];
  let css = '';
  let column = 0;
  const emit = (text: string) => {
    for (const ch of text) {
      css += ch;
      if (ch === '\n') {
        lines.push([]);
        column = 0;
      } else column++;
    }
  };
  const mark = (loc: StyleLoc | undefined) => {
    if (loc && loc.source === sourceName) lines[lines.length - 1]!.push([column, 0, loc.line - 1, loc.column]);
  };
  const write = (node: StyleNode, depth: number) => {
    const pad = minify ? '' : '  '.repeat(depth);
    const nl = minify ? '' : '\n';
    const sp = minify ? '' : ' ';
    emit(pad);
    mark(node.loc);
    if (node.kind === 'declaration') {
      emit(`${node.property}:${sp}${node.value}${node.important ? `${sp}!important` : ''};${nl}`);
    } else if (node.kind === 'raw') {
      emit(`${node.text}${nl}`);
    } else {
      emit(`${node.kind === 'rule' ? node.selector : `@${node.name}${node.params ? ' ' + node.params : ''}`}${sp}{${nl}`);
      for (const child of node.nodes) write(child, depth + 1);
      emit(`${pad}}${nl}`);
    }
  };
  for (const node of nodes) write(node, 0);
  return { css, map: { version: 3, sources: [module.id], sourcesContent: [module.code], names: [], mappings: encode(lines) } };
}

export function printStyle(nodes: StyleNode[], minify = false): string {
  const out: string[] = [];
  const write = (node: StyleNode, depth: number) => {
    const pad = minify ? '' : '  '.repeat(depth);
    const nl = minify ? '' : '\n';
    const sp = minify ? '' : ' ';
    if (node.kind === 'declaration') {
      out.push(`${pad}${node.property}:${sp}${node.value}${node.important ? `${sp}!important` : ''};${nl}`);
    } else if (node.kind === 'raw') {
      out.push(`${pad}${node.text}${nl}`);
    } else {
      const header = node.kind === 'rule' ? node.selector : `@${node.name}${node.params ? ' ' + node.params : ''}`;
      out.push(`${pad}${header}${sp}{${nl}`);
      for (const child of node.nodes) write(child, depth + 1);
      out.push(`${pad}}${nl}`);
    }
  };
  for (const node of nodes) write(node, 0);
  return out.join('');
}
