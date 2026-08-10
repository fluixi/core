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
import type { IRNode } from '../../ir/nodes.js';
import { buildJsxIR } from '../../lower/jsx.js';
import { isReactiveShape } from '../../analyze/reactive-expr.js';
import { shapeOf } from '../../analyze/expr-shape.js';

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
function transformNestedJSX(node: t.Expression, used: Set<string>, onNested?: NestedHook): t.Expression {
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
      // Resolve before emitting: the emitted call refers to the component by name,
      // and whoever injects the import has to have seen it.
      const nestedIR = buildIR(jsx, used, onNested);
      onNested?.(nestedIR);
      const { code, imports, templates } = imperativeBackend.emit(nestedIR, {} as any);
      emitInto(path, inlineTemplates(code, templates), imports);
    },
    // Nested lit templates compose: ${cond ? html`…` : html`…`},
    // ${list.map(x => html`<li>${x}</li>`)}. Compile them the same way.
    TaggedTemplateExpression(path: any) {
      const tag = path.node.tag;
      if (!t.isIdentifier(tag) || (tag.name !== 'html' && tag.name !== 'svg')) return;
      const ir = buildIRFromLit(path.node, used, { svg: tag.name === 'svg', onNested });
      onNested?.(ir);
      const { code, imports, templates } = imperativeBackend.emit(ir, {} as any);
      emitInto(path, inlineTemplates(code, templates), imports);
    },
  });
  return changed
    ? (file.program.body[0] as t.ExpressionStatement).expression
    : node;
}

/** Stringify an expression, compiling any JSX nested inside it first. */
export function genExpr(node: t.Expression, used: Set<string>, onNested?: NestedHook): string {
  return gen(transformNestedJSX(node, used, onNested));
}

/**
 * Called with the IR of JSX (or a template) found inside an expression.
 *
 * That IR is compiled and thrown away during the walk, so anything the module
 * needs because of it — a component import, a delegated event — has to be taken
 * off it here or it is lost. Without this, `{(b) => <Input/>}` emitted a
 * reference to `Input` that nothing imported.
 */
export type NestedHook = (ir: IRNode) => void;

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

export function isReactiveExpr(node: t.Expression): boolean {
  return isReactiveShape(shapeOf(node as never));
}

/**
 * Build IR from a JSX node. The builder is shared (lower/jsx.ts); what this
 * front-end supplies is how an expression becomes source — `genExpr`, which also
 * compiles any JSX or `` html`` `` nested inside it.
 */
export function buildIR(
  node: t.JSXElement | t.JSXFragment,
  used: Set<string> = new Set(),
  onNested?: NestedHook,
): IRNode {
  const ir = buildJsxIR(node as never, {
    code: (n) =>
      // A member-expression tag (`<ns.Foo/>`) is not an Expression, so it cannot go
      // through the nested-JSX compile — it only ever needs printing.
      (n as t.Node).type === 'JSXMemberExpression'
        ? gen(n as t.Node)
        : genExpr(n as never, used, onNested),
    used,
  });
  return ir;
}
