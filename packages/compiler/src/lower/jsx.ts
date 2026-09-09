/**
 * Build IR from a JSX tree.
 *
 * Reads `node.type` rather than a parser's helpers, and asks the caller for the
 * source of an expression through `code()` — a front-end that can slice the
 * original text returns that, one that reprints returns the printed form. Either
 * way the IR is the same, which is what keeps one builder for both.
 */
import type { IRLoadStrategy, IRNode, IRProp, IRPropKind } from '../ir/nodes.js';
import { isLoadDirective, parseLoadDirective, LoadDirectiveError } from '../resolve/load-directive.js';
import { isReactiveShape } from '../analyze/reactive-expr.js';
import { shapeOf } from '../analyze/expr-shape.js';
import { analyzeStatic } from '../optimize/analyze-static.js';
import { cleanTemplateText } from './text.js';

interface Node {
  type: string;
  [key: string]: any;
}

export interface JsxContext {
  /** The source of an expression node, with anything nested already compiled. */
  code(node: Node): string;
  /** Runtime symbols the emitted code needs; `use:` directives register here too. */
  used: Set<string>;
  /** The file being compiled, when component usage sites are to be recorded. */
  sourceFile?: string;
}

export const SVG_TAGS = new Set([
  'svg', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline',
  'ellipse', 'g', 'defs', 'clipPath', 'text',
]);

const EVENT_RE = /^on[A-Z]/;
const DELEGATED = new Set([
  'click', 'dblclick', 'input', 'change', 'submit', 'focus', 'blur',
  'keydown', 'keyup', 'keypress', 'mousedown', 'mouseup',
]);

const isReactive = (node: Node): boolean => isReactiveShape(shapeOf(node as never));

/** Only when the host asked for source locations — the flag that records usage sites too. */
const posOf = (node: Node, ctx: JsxContext): { line: number; column: number } | undefined => {
  if (!ctx.sourceFile) return undefined;
  const at = node.loc?.start;
  return at ? { line: at.line, column: at.column } : undefined;
};

/** A literal value, or undefined when the node is not one. */
function literalOf(node: Node): string | number | boolean | undefined {
  if (node.type === 'StringLiteral' || node.type === 'NumericLiteral' || node.type === 'BooleanLiteral') {
    return node.value;
  }
  // ESTree spells all three `Literal`; regexes and null are not values we inline.
  if (node.type === 'Literal' && (typeof node.value === 'string' || typeof node.value === 'number' || typeof node.value === 'boolean')) {
    return node.value;
  }
  return undefined;
}

const isString = (node: Node | null | undefined): boolean =>
  !!node && typeof literalOf(node) === 'string';

/** A capitalized / member / namespaced tag is a component. */
function tagInfo(name: Node, ctx: JsxContext): { tag: string; component: boolean } {
  if (name.type === 'JSXIdentifier') {
    return { tag: name.name, component: name.name[0] !== name.name[0].toLowerCase() };
  }
  if (name.type === 'JSXMemberExpression') return { tag: ctx.code(name), component: true };
  if (name.type === 'JSXNamespacedName') {
    return { tag: `${name.namespace.name}:${name.name.name}`, component: false };
  }
  return { tag: 'div', component: false };
}

function attrName(name: Node): string {
  if (name.type === 'JSXIdentifier') return name.name === 'class' ? 'className' : name.name;
  if (name.type === 'JSXNamespacedName') return `${name.namespace.name}:${name.name.name}`;
  return 'unknown';
}

function buildAttr(attr: Node, ctx: JsxContext): IRProp {
  const name = attrName(attr.name);
  const isEvent = EVENT_RE.test(name);
  // on: reaches the runtime as a native listener; a handler, never reactive. `ref`
  // joins them: the runtime CALLS it with the element, so a thunk gets called
  // instead and the real ref never sees anything.
  const isHandler = isEvent || name.startsWith('on:') || name === 'ref';
  const kind: IRPropKind = isEvent ? 'event' : 'attr';
  const base: IRProp = { name, kind };
  if (isEvent) {
    const evt = name.slice(2).toLowerCase();
    base.event = { name: evt, delegated: DELEGATED.has(evt) };
  }

  const v = attr.value;
  if (v == null) {
    base.literal = true; // valueless attribute
    return base;
  }
  if (isString(v)) {
    base.literal = literalOf(v) as string;
    return base;
  }
  if (v.type === 'JSXExpressionContainer' && v.expression?.type !== 'JSXEmptyExpression') {
    const expr = v.expression as Node;
    const literal = literalOf(expr);
    if (literal !== undefined) {
      base.literal = literal;
      return base;
    }
    base.expr = ctx.code(expr);
    base.reactive = isHandler ? false : isReactive(expr);
    // Only the ones that become a binding.
    if (base.reactive) base.at = posOf(expr, ctx);
    if (expr.type === 'JSXElement' || expr.type === 'JSXFragment') base.jsxElement = true;
    return base;
  }
  base.literal = true;
  return base;
}

/** Attribute value as JS code, or null when valueless. */
function attrExprCode(attr: Node, ctx: JsxContext): string | null {
  const v = attr.value;
  if (v == null) return null;
  if (isString(v)) return JSON.stringify(literalOf(v));
  if (v.type === 'JSXExpressionContainer' && v.expression?.type !== 'JSXEmptyExpression') {
    return ctx.code(v.expression as Node);
  }
  return null;
}

function buildProps(attrs: Node[], ctx: JsxContext): IRProp[] {
  const props: IRProp[] = [];
  const usePairs: string[] = []; // use:name directives collapse into one `use` prop
  for (const a of attrs) {
    if (a.type === 'JSXSpreadAttribute') {
      props.push({ name: '', kind: 'spread', expr: ctx.code(a.argument as Node) });
      continue;
    }
    if (a.type !== 'JSXAttribute') continue;
    // load: is a directive, not a prop — the resolve pass reads it off the node.
    if (isLoadDirective(attrName(a.name))) continue;

    const ns = a.name.type === 'JSXNamespacedName' ? a.name.namespace.name : null;
    // use:name / use:name={opts} -> [dir, () => opts]; dir is an in-scope fn
    if (ns === 'use') {
      const dir = a.name.name.name as string;
      ctx.used.add(dir); // keep the import
      const opts = attrExprCode(a, ctx);
      // parens round the body so an object literal is not read as a block
      usePairs.push(opts != null ? `[${dir}, () => (${opts})]` : `[${dir}]`);
      continue;
    }
    // oncapture:name -> native on:name with { capture: true }
    if (ns === 'oncapture') {
      const evt = (a.name.name.name as string).toLowerCase();
      const h = attrExprCode(a, ctx) ?? 'undefined';
      props.push({ name: 'on:' + evt, kind: 'attr', expr: `[${h}, { capture: true }]` });
      continue;
    }

    props.push(buildAttr(a, ctx));
  }
  if (usePairs.length > 0) props.push({ name: 'use', kind: 'attr', expr: `[${usePairs.join(', ')}]` });
  return props;
}

function buildChildren(children: Node[], ctx: JsxContext): IRNode[] {
  const out: IRNode[] = [];
  for (const child of children) {
    if (child.type === 'JSXText') {
      // Drop whitespace-only text spanning a newline so a lone child stays lone —
      // an array insert will not reactively bind a memo/component inside it.
      const text = cleanTemplateText(child.value);
      if (text) out.push({ kind: 'text', value: text });
    } else if (child.type === 'JSXExpressionContainer') {
      if (child.expression?.type !== 'JSXEmptyExpression') {
        const expr = child.expression as Node;
        const reactive = isReactive(expr);
        out.push({
          kind: 'expr',
          code: ctx.code(expr),
          reactive,
          ...(reactive ? { at: posOf(expr, ctx) } : {}),
        });
      }
    } else if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
      out.push(buildNode(child, ctx));
    } else if (child.type === 'JSXSpreadChild') {
      out.push({ kind: 'expr', code: ctx.code(child.expression as Node), reactive: false });
    }
  }
  return out;
}

/** The load: strategy written on a component tag, if any. */
function readLoad(attrs: Node[]): IRLoadStrategy | undefined {
  for (const a of attrs) {
    if (a.type !== 'JSXAttribute') continue;
    const name = attrName(a.name);
    if (!isLoadDirective(name)) continue;
    if (a.value && !isString(a.value)) {
      throw new LoadDirectiveError(
        `'${name}' needs a literal value, not an expression — the strategy is compile-time.`,
      );
    }
    return parseLoadDirective(name, a.value ? (literalOf(a.value) as string) : null);
  }
  return undefined;
}

function buildNode(node: Node, ctx: JsxContext): IRNode {
  if (node.type === 'JSXFragment') {
    return { kind: 'fragment', children: buildChildren(node.children, ctx) };
  }
  const { tag, component } = tagInfo(node.openingElement.name, ctx);
  const props = buildProps(node.openingElement.attributes, ctx);
  const children = buildChildren(node.children, ctx);

  if (component) {
    const load = readLoad(node.openingElement.attributes);
    const at = ctx.sourceFile && node.loc?.start
      ? { file: ctx.sourceFile, line: node.loc.start.line as number, column: node.loc.start.column as number }
      : undefined;
    return { kind: 'component', name: tag, props, children, ...(load ? { load } : {}), ...(at ? { at } : {}) };
  }
  return { kind: 'element', tag, svg: SVG_TAGS.has(tag), props, children, static: false };
}

/** Build IR from a JSXElement or JSXFragment. */
export function buildJsxIR(node: Node, ctx: JsxContext): IRNode {
  const ir = buildNode(node, ctx);
  // `static` is a property of a whole subtree, so one pass decides it rather than
  // each node at construction.
  analyzeStatic(ir);
  return ir;
}
