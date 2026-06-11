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
import { imperativeBackend } from '../../codegen/backends/imperative.js';
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
  traverse(file, {
    'JSXElement|JSXFragment'(path: any) {
      const jsx = path.node as t.JSXElement | t.JSXFragment;
      const { code, imports } = imperativeBackend.emit(buildIR(jsx, used), {} as any);
      for (const s of imports) used.add(s);
      const replacement = template.expression(code, { placeholderPattern: false })() as t.Expression;
      path.replaceWith(replacement);
      path.skip(); // build-ir already handled this subtree (incl. its nested JSX)
      changed = true;
    },
  });
  return changed
    ? (file.program.body[0] as t.ExpressionStatement).expression
    : node;
}

/** Stringify an expression, compiling any JSX nested inside it first. */
function genExpr(node: t.Expression, used: Set<string>): string {
  return gen(transformNestedJSX(node, used));
}

const SVG_TAGS = new Set([
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
function isReactiveExpr(node: t.Expression): boolean {
  if (t.isCallExpression(node) || t.isOptionalCallExpression(node)) return true;
  if (t.isMemberExpression(node) || t.isOptionalMemberExpression(node)) return true;
  if (t.isConditionalExpression(node)) {
    return isReactiveExpr(node.test) || isReactiveExpr(node.consequent) || isReactiveExpr(node.alternate);
  }
  if (t.isLogicalExpression(node) || t.isBinaryExpression(node)) {
    return isReactiveExpr(node.left as t.Expression) || isReactiveExpr(node.right as t.Expression);
  }
  if (t.isTemplateLiteral(node)) return node.expressions.some((e) => isReactiveExpr(e as t.Expression));
  return false;
}

function buildAttr(attr: t.JSXAttribute, used: Set<string>): IRProp {
  const name = attrName(attr.name);
  const isEvent = EVENT_RE.test(name);
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
    base.reactive = isEvent ? false : isReactiveExpr(expr);
    return base;
  }
  base.literal = true;
  return base;
}

function buildProps(
  attrs: Array<t.JSXAttribute | t.JSXSpreadAttribute>,
  used: Set<string>,
): IRProp[] {
  const props: IRProp[] = [];
  for (const a of attrs) {
    if (t.isJSXSpreadAttribute(a)) {
      props.push({ name: '', kind: 'spread', expr: genExpr(a.argument as t.Expression, used) });
    } else if (t.isJSXAttribute(a)) {
      props.push(buildAttr(a, used));
    }
  }
  return props;
}

function buildChildren(children: t.JSXElement['children'], used: Set<string>): IRNode[] {
  const out: IRNode[] = [];
  for (const child of children) {
    if (t.isJSXText(child)) {
      const text = child.value.replace(/\s+/g, ' ');
      if (text && text !== ' ') out.push({ kind: 'text', value: text });
      else if (text === ' ' && out.length > 0) out.push({ kind: 'text', value: ' ' });
    } else if (t.isJSXExpressionContainer(child)) {
      if (!t.isJSXEmptyExpression(child.expression)) {
        const expr = child.expression as t.Expression;
        out.push({ kind: 'expr', code: genExpr(expr, used), reactive: isReactiveExpr(expr) });
      }
    } else if (t.isJSXElement(child)) {
      out.push(buildIR(child, used));
    } else if (t.isJSXFragment(child)) {
      out.push(buildIR(child, used));
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
  if (t.isJSXFragment(node)) {
    return { kind: 'fragment', children: buildChildren(node.children, used) };
  }
  const { tag, component } = tagInfo(node.openingElement.name);
  const props = buildProps(node.openingElement.attributes, used);
  const children = buildChildren(node.children, used);

  if (component) {
    return { kind: 'component', name: tag, props, children };
  }
  return { kind: 'element', tag, svg: SVG_TAGS.has(tag), props, children, static: false };
}
