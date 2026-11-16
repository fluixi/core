/**
 * Build IR from a JSX tree.
 *
 * Reads `node.type` rather than a parser's helpers, and asks the caller for the
 * source of an expression through `code()`: a front-end that can slice the
 * original text returns that, one that reprints returns the printed form. Either
 * way the IR is the same, which is what keeps one builder for both.
 */
import type { IRLoadStrategy, IRNode, IRProp, IRPropKind } from '../ir/nodes.js';
import { isLoadDirective, parseLoadDirective, LoadDirectiveError } from '../resolve/load-directive.js';
import { isReactiveShape } from '../analyze/reactive-expr.js';
import { shapeOf } from '../analyze/expr-shape.js';
import { analyzeStatic } from '../optimize/analyze-static.js';
import { cleanTemplateText } from './text.js';
import { paren } from '../analyze/paren.js';
import { markHole } from '../transform/source-locations.js';
import { imperativeBackend, inlineTemplates } from '../codegen/backends/imperative.js';

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
  /** Scoped styles: intrinsic elements inside a range, and components handed a class, get `data-fx-s` set to its value. */
  scopes?: { start: number; end: number; value: string }[];
  /** Start offsets of `<style>` elements the compiler took out of the template. */
  dropStyles?: Set<number>;
  /** Inside an SVG element: children are SVG too, whatever their name, until a `<foreignObject>`. */
  inSvg?: boolean;
}

import { SVG_TAGS } from '@fluixi/template-parser';

const EVENT_RE = /^on[A-Z]/;
const DELEGATED = new Set([
  'click', 'dblclick', 'input', 'change', 'submit', 'focus', 'blur',
  'keydown', 'keyup', 'keypress', 'mousedown', 'mouseup',
]);

const isReactive = (node: Node): boolean => isReactiveShape(shapeOf(node as never));

/** The tag that carries directives and renders only its content. Never a custom element: no dash. */
const CONTAINER = 'container';

/** An intrinsic element's `if`, `else`, `each` or `key` attribute, as written. */
function directive(node: Node, name: 'if' | 'else' | 'each' | 'key'): Node | undefined {
  if (node.type !== 'JSXElement') return undefined;
  const opening = node.openingElement;
  if (opening.name.type !== 'JSXIdentifier' || opening.name.name[0] !== opening.name.name[0].toLowerCase()) return undefined;
  return opening.attributes.find((a: Node) => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === name);
}

/** The expression a directive holds: `if={cond}`. */
function directiveExpr(attr: Node): Node | undefined {
  const v = attr.value;
  return v?.type === 'JSXExpressionContainer' && v.expression?.type !== 'JSXEmptyExpression' ? v.expression : undefined;
}

/** A nested subtree as code, for `Show`'s fallback and `For`'s render function. */
function emitIR(ir: IRNode, ctx: JsxContext): string {
  const { code, imports, templates } = imperativeBackend.emit(ir, {} as any);
  for (const s of imports) ctx.used.add(s);
  return inlineTemplates(code, templates);
}

/** Only when the host asked for source locations, the flag that records usage sites too. */
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
    base.at = posOf(attr, ctx);
    return base;
  }
  if (isString(v)) {
    base.literal = literalOf(v) as string;
    base.at = posOf(v, ctx);
    return base;
  }
  if (v.type === 'JSXExpressionContainer' && v.expression?.type !== 'JSXEmptyExpression') {
    const expr = v.expression as Node;
    const literal = literalOf(expr);
    if (literal !== undefined) {
      base.literal = literal;
      base.at = posOf(expr, ctx);
      return base;
    }
    base.expr = ctx.code(expr);
    base.reactive = isHandler ? false : isReactive(expr);
    // Every prop, not only the ones that move: a panel names the line for each of them.
    // Nothing treats this as a binding position: that asks for `reactive` as well.
    base.at = posOf(expr, ctx);
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

/**
 * `element`: the tag is a DOM element. Only there are class:/style: and a style object taken
 * apart; a component gets its props as written.
 */
function buildProps(attrs: Node[], ctx: JsxContext, element = false): IRProp[] {
  const props: IRProp[] = [];
  const usePairs: string[] = []; // use:name directives collapse into one `use` prop
  // class:x and style:x collapse into one classList / style object, as in templates; each
  // value that moves is an accessor in it, so the runtime updates that one key.
  const classEntries: string[] = [];
  const styleEntries: string[] = [];
  let styleAt: IRProp['at'];
  for (const a of attrs) {
    if (a.type === 'JSXSpreadAttribute') {
      props.push({ name: '', kind: 'spread', expr: ctx.code(a.argument as Node) });
      continue;
    }
    if (a.type !== 'JSXAttribute') continue;
    // load: is a directive, not a prop: the resolve pass reads it off the node.
    if (isLoadDirective(attrName(a.name))) continue;

    const ns = a.name.type === 'JSXNamespacedName' ? a.name.namespace.name : null;
    // use:name / use:name={opts} -> [dir, () => opts]; dir is an in-scope fn
    if (ns === 'use') {
      const dir = a.name.name.name as string;
      ctx.used.add(dir); // keep the import
      const opts = attrExprCode(a, ctx);
      // parens round the body so an object literal is not read as a block
      usePairs.push(opts != null ? `[${dir}, () => ${paren(opts, 'arrowBody')}]` : `[${dir}]`);
      continue;
    }
    if (element && (ns === 'class' || ns === 'style')) {
      const key = JSON.stringify(a.name.name.name);
      const v = a.value;
      let value: string;
      if (v == null) value = 'true';
      else if (isString(v)) value = JSON.stringify(literalOf(v));
      else if (v.type === 'JSXExpressionContainer' && v.expression?.type !== 'JSXEmptyExpression') {
        value = keyValue(v.expression as Node, ctx);
        if (ns === 'style') styleAt ??= posOf(v.expression as Node, ctx);
      } else continue;
      (ns === 'class' ? classEntries : styleEntries).push(`${key}: ${value}`);
      continue;
    }
    // style={{ ... }}: one entry per property, so `--gap` moving does not rewrite `margin`.
    if (element && a.name.type === 'JSXIdentifier' && a.name.name === 'style' && a.value?.type === 'JSXExpressionContainer') {
      const entries = objectEntries(a.value.expression as Node, ctx);
      if (entries) {
        styleEntries.unshift(...entries);
        styleAt = posOf(a.value.expression as Node, ctx);
        continue;
      }
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
  if (classEntries.length > 0) props.push({ name: 'classList', kind: 'attr', expr: `{ ${classEntries.join(', ')} }`, reactive: false });
  if (styleEntries.length > 0) {
    const entries = `{ ${styleEntries.join(', ')} }`;
    // A style the object form could not take apart (a string, a variable) goes first, and
    // the keys after it: the runtime applies an array in order.
    const base = props.findIndex((p) => p.name === 'style' && p.kind === 'attr');
    if (base === -1) props.push({ name: 'style', kind: 'attr', expr: entries, reactive: false, ...(styleAt ? { at: styleAt } : {}) });
    else {
      const prop = props[base]!;
      const value = prop.literal !== undefined ? JSON.stringify(prop.literal) : prop.reactive ? `() => ${paren(prop.expr!, 'arrowBody')}` : prop.expr!;
      props[base] = { name: 'style', kind: 'attr', expr: `[${value}, ${entries}]`, reactive: false, ...(prop.at ? { at: prop.at } : {}) };
    }
  }
  if (usePairs.length > 0) props.push({ name: 'use', kind: 'attr', expr: `[${usePairs.join(', ')}]` });
  return props;
}

/** A value inside a classList / style object: an accessor when it moves. */
function keyValue(expr: Node, ctx: JsxContext): string {
  const code = ctx.code(expr);
  if (!isReactive(expr)) return code;
  const accessor = `() => ${paren(code, 'arrowBody')}`;
  const at = posOf(expr, ctx);
  return at ? markHole(accessor, at.line, at.column) : accessor;
}

/** `{ a: x, '--b': y }` as object entries; null for anything with a spread or a method. */
function objectEntries(expr: Node, ctx: JsxContext): string[] | null {
  if (expr?.type !== 'ObjectExpression') return null;
  const entries: string[] = [];
  for (const p of expr.properties as Node[]) {
    if (p.type !== 'ObjectProperty') return null;
    const key = p.computed
      ? `[${ctx.code(p.key)}]`
      : p.key.type === 'Identifier'
        ? JSON.stringify(p.key.name)
        : JSON.stringify(String(p.key.value));
    entries.push(`${key}: ${keyValue(p.value, ctx)}`);
  }
  return entries;
}

function buildChildren(children: Node[], ctx: JsxContext): IRNode[] {
  const out: IRNode[] = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;
    if (directive(child, 'if')) {
      // The next element, past whitespace, is the fallback when it says `else`.
      let next = i + 1;
      while (next < children.length && children[next]!.type === 'JSXText' && !cleanTemplateText(children[next]!.value)) next++;
      const fallback = directive(children[next] as Node, 'else') ? (children[next] as Node) : null;
      out.push(buildIf(child, fallback, ctx));
      if (fallback) i = next;
      continue;
    }
    if (child.type === 'JSXText') {
      // Drop whitespace-only text spanning a newline so a lone child stays lone , 
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
      // A `<style>` the compiler took out leaves no child behind, not even an empty insert.
      if (ctx.dropStyles?.has(child.start)) continue;
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
        `'${name}' needs a literal value, not an expression: the strategy is compile-time.`,
      );
    }
    return parseLoadDirective(name, a.value ? (literalOf(a.value) as string) : null);
  }
  return undefined;
}

/** `<el if={cond}>` and an optional `<el else>` after it → `<Show when fallback>`. */
function buildIf(node: Node, fallback: Node | null, ctx: JsxContext): IRNode {
  const cond = directiveExpr(directive(node, 'if')!);
  const props: IRProp[] = [
    cond
      ? { name: 'when', kind: 'attr', expr: ctx.code(cond), reactive: isReactive(cond), at: posOf(cond, ctx) }
      : { name: 'when', kind: 'attr', literal: true },
  ];
  if (fallback) {
    props.push({ name: 'fallback', kind: 'attr', expr: emitIR(buildElement(fallback, ctx, ['else']), ctx), jsxElement: true });
  }
  return { kind: 'component', name: 'Show', props, children: [buildElement(node, ctx, ['if'])] };
}

/**
 * `<el each={items} key?>{(item) => ...}</el>` → `<el><For each by>{...}</For></el>`: the
 * content repeats, the element does not. Null when there is no `each`.
 */
function buildEach(node: Node, ctx: JsxContext): IRNode | null {
  const attr = directive(node, 'each');
  if (!attr) return null;
  const list = directiveExpr(attr);
  const props: IRProp[] = [
    list
      ? { name: 'each', kind: 'attr', expr: ctx.code(list), reactive: isReactive(list), at: posOf(list, ctx) }
      : { name: 'each', kind: 'attr', expr: '[]' },
  ];
  const key = directive(node, 'key');
  if (key) {
    const keyExpr = directiveExpr(key);
    const by = isString(key.value)
      ? `(item) => item[${JSON.stringify(literalOf(key.value))}]`
      : keyExpr
        ? ctx.code(keyExpr)
        : undefined;
    if (by) props.push({ name: 'by', kind: 'attr', expr: by });
  }

  const content = node.children.filter((c: Node) => !(c.type === 'JSXText' && !cleanTemplateText(c.value)));
  const only = content.length === 1 && content[0].type === 'JSXExpressionContainer' ? content[0].expression : null;
  let render: string;
  if (only && (only.type === 'ArrowFunctionExpression' || only.type === 'FunctionExpression')) {
    const fn = ctx.code(only);
    // A body that reads signals, `{(it) => it.label + count()}`, is handed back as an
    // accessor so the runtime binds it; a body that builds elements needs nothing.
    const live = only.type === 'ArrowFunctionExpression' && only.body.type !== 'BlockStatement' && isReactive(only.body);
    render = live ? `(...args) => () => (${fn})(...args)` : fn;
  } else {
    const built = buildChildren(node.children, ctx);
    const ir: IRNode = built.length === 1 ? built[0]! : { kind: 'fragment', children: built };
    render = `() => ${paren(emitIR(ir, ctx), 'arrowBody')}`;
  }
  return { kind: 'component', name: 'For', props, children: [{ kind: 'expr', code: render, reactive: false }] };
}

/** An element, with the directives already handled by the caller left out. */
function buildElement(node: Node, ctx: JsxContext, handled: string[]): IRNode {
  const skip = new Set(handled);
  // `key` is only a directive beside `each`; anywhere else it is an ordinary attribute.
  const directives = new Set(['if', 'else', 'each', ...(directive(node, 'each') ? ['key'] : [])]);
  const attributes = node.openingElement.attributes.filter(
    (a: Node) => !(a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && (skip.has(a.name.name) || directives.has(a.name.name))),
  );
  const { tag } = tagInfo(node.openingElement.name, ctx);
  const svg = SVG_TAGS.has(tag) || ctx.inSvg === true;
  // `<foreignObject>` is SVG, its content HTML again.
  const inner = svg !== (ctx.inSvg === true) || tag === 'foreignObject' ? { ...ctx, inSvg: svg && tag !== 'foreignObject' } : ctx;
  const each = buildEach(node, inner);
  const children = each ? [each] : buildChildren(node.children, inner);
  if (tag === CONTAINER) return children.length === 1 ? children[0]! : { kind: 'fragment', children };
  const at = ctx.sourceFile && node.loc?.start
    ? { file: ctx.sourceFile, line: node.loc.start.line as number, column: node.loc.start.column as number }
    : undefined;
  const props = buildProps(attributes, ctx, true);
  // A scoped style's mark: a static attribute, so it is part of the template itself and
  // every render carries it, on the client, from the server and through hydration.
  const scope = ctx.scopes?.find((s) => node.start >= s.start && node.end <= s.end);
  if (scope) props.unshift({ name: 'data-fx-s', kind: 'attr', literal: scope.value });
  return { kind: 'element', tag, svg, props, children, static: false, ...(at ? { at } : {}) };
}

function buildNode(node: Node, ctx: JsxContext): IRNode {
  if (node.type === 'JSXFragment') {
    return { kind: 'fragment', children: buildChildren(node.children, ctx) };
  }
  if (directive(node, 'if')) return buildIf(node, null, ctx);
  // Its CSS went to the host; nothing of the element is rendered.
  if (ctx.dropStyles?.has(node.start)) return { kind: 'fragment', children: [] };
  const { tag, component } = tagInfo(node.openingElement.name, ctx);
  if (!component) return buildElement(node, ctx, []);
  const props = buildProps(node.openingElement.attributes, ctx);
  // A component draws its own elements, so it takes no scope, except when handed a class: the
  // element it passes the class to then matches this component's scoped rule for that class.
  const scope = ctx.scopes?.find((s) => node.start >= s.start && node.end <= s.end);
  if (scope && props.some((p) => p.name === 'class' || p.name === 'className' || p.name === 'classList')) {
    props.unshift({ name: 'data-fx-s', kind: 'attr', literal: scope.value });
  }
  const children = buildChildren(node.children, ctx);
  const at = ctx.sourceFile && node.loc?.start
    ? { file: ctx.sourceFile, line: node.loc.start.line as number, column: node.loc.start.column as number }
    : undefined;

  const load = readLoad(node.openingElement.attributes);
  return { kind: 'component', name: tag, props, children, ...(load ? { load } : {}), ...(at ? { at } : {}) };
}

/** Build IR from a JSXElement or JSXFragment. */
export function buildJsxIR(node: Node, ctx: JsxContext): IRNode {
  const ir = buildNode(node, ctx);
  // `static` is a property of a whole subtree, so one pass decides it rather than
  // each node at construction.
  analyzeStatic(ir);
  return ir;
}
