/**
 * Babel front-end: build the host-agnostic IR from a JSX AST node.
 *
 * This is the parsing-end half of the pipeline (AST -> IR); the imperative
 * backend's emit() is the codegen half (IR -> code). Keeping the JSX analysis
 * here and the code generation in the backend is what lets a future swc
 * front-end reuse the exact same backend.
 *
 * JSX can appear nested inside arbitrary expressions (render-props, ternaries,
 * `fallback={<p/>}`, `arr.map(x => <li/>)`, `() => cond && <div/>`, …). The IR
 * models prop/child *expressions* as code strings, so any JSX inside such an
 * expression is recursively compiled (build-ir -> emit) and spliced back in,
 * with the runtime symbols it uses collected into `used` for import injection.
 */
import { types as t, traverse, template } from '@babel/core';
import _generate from '@babel/generator';
import { imperativeBackend, inlineTemplates } from '../../codegen/backends/imperative.js';
import { buildIRFromLit } from './build-ir-lit.js';
import { analyzeStatic } from '../../optimize/analyze-static.js';
import {
  isLoadDirective,
  parseLoadDirective,
  LoadDirectiveError,
  type IRLoadStrategy,
} from '../../resolve/load-directive.js';
import type {
  IRNode,
  IRProp,
  IRPropKind,
} from '../../ir/nodes.js';

// @babel/generator's ESM/CJS interop default (its types aren't callable under nodenext).
const generate: any = (_generate as any).default ?? (_generate as any);

/** Stringify an AST node back to source. */
function gen(node: t.Node): string {
  return generate(node as any, { concise: true }).code;
}

/**
 * Replace every JSX node nested inside `node` with the imperative code emitted
 * for it (build-ir -> emit), so the resulting expression is plain JS. Runtime
 * symbols used by the nested code are added to `used`.
 */
function transformNestedJSX(node: t.Expression, used: Set<string>): t.Expression {
  const clone = t.cloneNode(node, true) as t.Expression;
  const file = t.file(t.program([t.expressionStatement(clone)]));
  let changed = false;
  const emitInto = (path: any, code: string, imports: string[]) => {
    for (const s of imports) used.add(s);
    // parse as TS: a hole/arrow param may carry a type annotation ((x: T) => …);
    // preset-typescript strips it downstream, but the reparse must accept it.
    path.replaceWith(template.expression(code, { placeholderPattern: false, plugins: ['typescript'] })() as t.Expression);
    path.skip(); // build-ir already handled this subtree (incl. anything nested)
    changed = true;
  };
  traverse(file, {
    'JSXElement|JSXFragment'(path: any) {
      const jsx = path.node as t.JSXElement | t.JSXFragment;
      const { code, imports, templates } = imperativeBackend.emit(buildIR(jsx, used), {} as any);
      emitInto(path, inlineTemplates(code, templates), imports);
    },
    // Nested lit templates compose: ${cond ? html`…` : html`…`},
    // ${list.map(x => html`<li>${x}</li>`)}. Compile them the same way.
    TaggedTemplateExpression(path: any) {
      const tag = path.node.tag;
      if (!t.isIdentifier(tag) || (tag.name !== 'html' && tag.name !== 'svg')) return;
      const ir = buildIRFromLit(path.node, used, { svg: tag.name === 'svg' });
      const { code, imports, templates } = imperativeBackend.emit(ir, {} as any);
      emitInto(path, inlineTemplates(code, templates), imports);
    },
  });
  return changed
    ? (file.program.body[0] as t.ExpressionStatement).expression
    : node;
}

/** Stringify an expression, compiling any JSX nested inside it first. */
export function genExpr(node: t.Expression, used: Set<string>): string {
  return gen(transformNestedJSX(node, used));
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

/** A JSX tag is a component when its name is capitalized / a member / namespaced. */
function tagInfo(name: t.JSXOpeningElement['name']): { tag: string; component: boolean } {
  if (t.isJSXIdentifier(name)) {
    const isComponent = name.name[0] !== name.name[0].toLowerCase();
    return { tag: name.name, component: isComponent };
  }
  if (t.isJSXMemberExpression(name)) return { tag: gen(name as any), component: true };
  if (t.isJSXNamespacedName(name)) {
    return { tag: `${name.namespace.name}:${name.name.name}`, component: false };
  }
  return { tag: 'div', component: false };
}

function attrName(name: t.JSXAttribute['name']): string {
  if (t.isJSXIdentifier(name)) return name.name === 'class' ? 'className' : name.name;
  if (t.isJSXNamespacedName(name)) return `${name.namespace.name}:${name.name.name}`;
  return 'unknown';
}

/**
 * Reactivity heuristic, aligned with the babel transform: calls and member
 * accesses (e.g. `count()`, `store.value`) are wired reactively; bare
 * identifiers and literals are passed through as-is.
 */
export function isReactiveExpr(node: t.Expression): boolean {
  if (t.isCallExpression(node) || t.isOptionalCallExpression(node)) return true;
  if (t.isMemberExpression(node) || t.isOptionalMemberExpression(node)) {
    // `props.children` (any `.children` access) is a stable subtree reference,
    // not a reactive value. Compiling it to a `() => props.children` thunk adds
    // an insert layer that fully unwraps the children's Suspense/memo to a static
    // node, severing the reactive binding — so a nested lazy/Suspense that
    // resolves later never propagates up through the component-children hop.
    // Passing it through non-reactive (insert(el, props.children)) keeps the
    // child's memo intact so insert binds to it (mirrors a direct <Outlet/>).
    if (!node.computed && t.isIdentifier(node.property, { name: 'children' })) return false;
    return true;
  }
  if (t.isConditionalExpression(node)) {
    return isReactiveExpr(node.test) || isReactiveExpr(node.consequent) || isReactiveExpr(node.alternate);
  }
  if (t.isLogicalExpression(node) || t.isBinaryExpression(node)) {
    return isReactiveExpr(node.left as t.Expression) || isReactiveExpr(node.right as t.Expression);
  }
  if (t.isTemplateLiteral(node)) return node.expressions.some((e) => isReactiveExpr(e as t.Expression));
  // Object/array literals are reactive when any value inside is — so
  // `class=${{ active: active() }}` / `style=${{ width: w() }}` react per update.
  if (t.isObjectExpression(node)) {
    return node.properties.some(
      (p) => t.isObjectProperty(p) && !p.computed && isReactiveExpr(p.value as t.Expression),
    );
  }
  if (t.isArrayExpression(node)) {
    return node.elements.some((e) => e != null && !t.isSpreadElement(e) && isReactiveExpr(e as t.Expression));
  }
  return false;
}

function buildAttr(attr: t.JSXAttribute, used: Set<string>): IRProp {
  const name = attrName(attr.name);
  const isEvent = EVENT_RE.test(name);
  // on: passes through to the runtime as a native listener; a handler, never reactive.
  // `ref` joins them: the runtime CALLS it with the element, so wrapping it in a thunk
  // means the thunk gets called and the real ref never sees the element — the callback
  // silently does nothing, along with everything that depended on it.
  const isHandler = isEvent || name.startsWith('on:') || name === 'ref';
  const kind: IRPropKind = isEvent ? 'event' : 'attr';
  const base: IRProp = { name, kind };
  if (isEvent) {
    base.event = { name: name.slice(2).toLowerCase(), delegated: DELEGATED.has(name.slice(2).toLowerCase()) };
  }

  const v = attr.value;
  if (v == null) {
    base.literal = true; // valueless attribute
    return base;
  }
  if (t.isStringLiteral(v)) {
    base.literal = v.value;
    return base;
  }
  if (t.isJSXExpressionContainer(v) && !t.isJSXEmptyExpression(v.expression)) {
    const expr = v.expression as t.Expression;
    if (t.isStringLiteral(expr) || t.isNumericLiteral(expr) || t.isBooleanLiteral(expr)) {
      base.literal = expr.value;
      return base;
    }
    base.expr = genExpr(expr, used);
    base.reactive = isHandler ? false : isReactiveExpr(expr);
    if (t.isJSXElement(expr) || t.isJSXFragment(expr)) base.jsxElement = true;
    return base;
  }
  base.literal = true;
  return base;
}

/** Attribute value as JS code (expr or string), or null when valueless. */
function attrExprCode(attr: t.JSXAttribute, used: Set<string>): string | null {
  const v = attr.value;
  if (v == null) return null;
  if (t.isStringLiteral(v)) return JSON.stringify(v.value);
  if (t.isJSXExpressionContainer(v) && !t.isJSXEmptyExpression(v.expression)) {
    return genExpr(v.expression as t.Expression, used);
  }
  return null;
}

function buildProps(
  attrs: Array<t.JSXAttribute | t.JSXSpreadAttribute>,
  used: Set<string>,
): IRProp[] {
  const props: IRProp[] = [];
  const usePairs: string[] = []; // Solid `use:name` directives → one `use` prop
  for (const a of attrs) {
    if (t.isJSXSpreadAttribute(a)) {
      props.push({ name: '', kind: 'spread', expr: genExpr(a.argument as t.Expression, used) });
      continue;
    }
    if (!t.isJSXAttribute(a)) continue;
    // `load:` is a directive, not a prop — the resolve pass reads it off the node.
    if (isLoadDirective(attrName(a.name))) continue;

    const ns = t.isJSXNamespacedName(a.name) ? a.name.namespace.name : null;
    // use:name / use:name={opts} -> [dir, () => opts] pair; dir is an in-scope fn
    if (ns === 'use') {
      const dir = (a.name as t.JSXNamespacedName).name.name;
      used.add(dir); // keep the import
      const opts = attrExprCode(a, used);
      // parens around the body so an object literal isn't read as a block
      usePairs.push(opts != null ? `[${dir}, () => (${opts})]` : `[${dir}]`);
      continue;
    }
    // oncapture:name -> native on:name with { capture: true }
    if (ns === 'oncapture') {
      const evt = (a.name as t.JSXNamespacedName).name.name.toLowerCase();
      const h = attrExprCode(a, used) ?? 'undefined';
      props.push({ name: 'on:' + evt, kind: 'attr', expr: `[${h}, { capture: true }]` });
      continue;
    }

    props.push(buildAttr(a, used));
  }
  // one `use` prop = array of [dir, accessor?] pairs
  if (usePairs.length > 0) props.push({ name: 'use', kind: 'attr', expr: `[${usePairs.join(', ')}]` });
  return props;
}

/** Canonical JSX text cleaning — kept identical to plugin.ts cleanJSXText. */
export function cleanJSXText(value: string): string {
  const lines = value.split(/\r\n|\n|\r/);
  let lastNonEmpty = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/[^ \t]/.test(lines[i])) lastNonEmpty = i;
  }
  let out = '';
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/\t/g, ' ');
    if (i !== 0) line = line.replace(/^ +/, '');
    if (i !== lines.length - 1) line = line.replace(/ +$/, '');
    if (!line) continue;
    if (i !== lastNonEmpty) line += ' ';
    out += line;
  }
  return out;
}

function buildChildren(children: t.JSXElement['children'], used: Set<string>): IRNode[] {
  const out: IRNode[] = [];
  for (const child of children) {
    if (t.isJSXText(child)) {
      // Canonical JSX whitespace (kept in sync with plugin.ts cleanJSXText):
      // drop whitespace-only text spanning a newline so a lone child stays lone
      // (an array insert won't reactively bind a memo/component inside it).
      const text = cleanJSXText(child.value);
      if (text) out.push({ kind: 'text', value: text });
    } else if (t.isJSXExpressionContainer(child)) {
      if (!t.isJSXEmptyExpression(child.expression)) {
        const expr = child.expression as t.Expression;
        out.push({ kind: 'expr', code: genExpr(expr, used), reactive: isReactiveExpr(expr) });
      }
    } else if (t.isJSXElement(child)) {
      out.push(buildIRNode(child, used));
    } else if (t.isJSXFragment(child)) {
      out.push(buildIRNode(child, used));
    } else if (t.isJSXSpreadChild(child)) {
      out.push({ kind: 'expr', code: genExpr(child.expression as t.Expression, used), reactive: false });
    }
  }
  return out;
}

/**
 * Build IR from a JSXElement or JSXFragment. `used` accumulates the runtime
 * symbols emitted for any JSX nested inside expressions (so the caller can
 * inject the right imports).
 */
export function buildIR(node: t.JSXElement | t.JSXFragment, used: Set<string> = new Set()): IRNode {
  const ir = buildIRNode(node, used);
  // `static` is decided by one shared pass rather than at construction, because it is a
  // property of a whole subtree: an element is only inert once its children are known.
  analyzeStatic(ir);
  return ir;
}

function buildIRNode(node: t.JSXElement | t.JSXFragment, used: Set<string>): IRNode {
  if (t.isJSXFragment(node)) {
    return { kind: 'fragment', children: buildChildren(node.children, used) };
  }
  const { tag, component } = tagInfo(node.openingElement.name);
  const props = buildProps(node.openingElement.attributes, used);
  const children = buildChildren(node.children, used);

  if (component) {
    const load = readLoad(node.openingElement.attributes);
    return { kind: 'component', name: tag, props, children, ...(load ? { load } : {}) };
  }
  return { kind: 'element', tag, svg: SVG_TAGS.has(tag), props, children, static: false };
}

/** The `load:` strategy written on a component tag, if any. */
function readLoad(
  attrs: Array<t.JSXAttribute | t.JSXSpreadAttribute>,
): IRLoadStrategy | undefined {
  for (const a of attrs) {
    if (!t.isJSXAttribute(a)) continue;
    const name = attrName(a.name);
    if (!isLoadDirective(name)) continue;
    if (a.value && !t.isStringLiteral(a.value)) {
      throw new LoadDirectiveError(
        `'${name}' needs a literal value, not an expression — the strategy is compile-time.`,
      );
    }
    return parseLoadDirective(name, a.value ? a.value.value : null);
  }
  return undefined;
}
