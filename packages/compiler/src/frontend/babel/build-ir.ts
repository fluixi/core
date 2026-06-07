/**
 * Babel front-end: build the host-agnostic IR from a JSX AST node.
 *
 * This is the parsing-end half of the pipeline (AST -> IR); the imperative
 * backend's emit() is the codegen half (IR -> code). Keeping the JSX analysis
 * here and the code generation in the backend is what lets a future swc
 * front-end reuse the exact same backend.
 */
import { types as t } from '@babel/core';
import _generate from '@babel/generator';
import type {
  IRNode,
  IRProp,
  IRPropKind,
} from '../../ir/nodes.js';

// @babel/generator's ESM/CJS interop default (its types aren't callable under nodenext).
const generate: any = (_generate as any).default ?? (_generate as any);

/** Stringify an expression AST node back to source. */
function gen(node: t.Node): string {
  return generate(node as any, { concise: true }).code;
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

function buildAttr(attr: t.JSXAttribute): IRProp {
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
    base.expr = gen(expr);
    base.reactive = isEvent ? false : isReactiveExpr(expr);
    return base;
  }
  base.literal = true;
  return base;
}

function buildProps(
  attrs: Array<t.JSXAttribute | t.JSXSpreadAttribute>,
): IRProp[] {
  const props: IRProp[] = [];
  for (const a of attrs) {
    if (t.isJSXSpreadAttribute(a)) {
      props.push({ name: '', kind: 'spread', expr: gen(a.argument) });
    } else if (t.isJSXAttribute(a)) {
      props.push(buildAttr(a));
    }
  }
  return props;
}

function buildChildren(children: t.JSXElement['children']): IRNode[] {
  const out: IRNode[] = [];
  for (const child of children) {
    if (t.isJSXText(child)) {
      const text = child.value.replace(/\s+/g, ' ');
      if (text && text !== ' ') out.push({ kind: 'text', value: text });
      else if (text === ' ' && out.length > 0) out.push({ kind: 'text', value: ' ' });
    } else if (t.isJSXExpressionContainer(child)) {
      if (!t.isJSXEmptyExpression(child.expression)) {
        const expr = child.expression as t.Expression;
        out.push({ kind: 'expr', code: gen(expr), reactive: isReactiveExpr(expr) });
      }
    } else if (t.isJSXElement(child)) {
      out.push(buildIR(child));
    } else if (t.isJSXFragment(child)) {
      out.push(buildIR(child));
    } else if (t.isJSXSpreadChild(child)) {
      out.push({ kind: 'expr', code: gen(child.expression), reactive: false });
    }
  }
  return out;
}

/** Build IR from a JSXElement or JSXFragment. */
export function buildIR(node: t.JSXElement | t.JSXFragment): IRNode {
  if (t.isJSXFragment(node)) {
    return { kind: 'fragment', children: buildChildren(node.children) };
  }
  const { tag, component } = tagInfo(node.openingElement.name);
  const props = buildProps(node.openingElement.attributes);
  const children = buildChildren(node.children);

  if (component) {
    return { kind: 'component', name: tag, props, children };
  }
  return { kind: 'element', tag, svg: SVG_TAGS.has(tag), props, children, static: false };
}
