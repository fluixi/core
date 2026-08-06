import type { CodegenBackend, CodegenResult, StaticTemplate } from '../backend.js';
import type { IRNode, IRProp } from '../../ir/nodes.js';
import { isSerializable, serializeStatic } from '../serialize-static.js';
import type { CompilerOptions } from '../../options.js';
import { RUNTIME_CONTRACT_V1 } from '../contract.js';

/**
 * Imperative fine-grained backend — emits createNativeElement/insert/spread/
 * createComponent (RUNTIME_CONTRACT_V1), the runtime proven by the @fluixi/dom
 * contract tests.
 *
 * emit() consumes the host-agnostic IR and returns a code string, so any
 * front-end (babel now, swc later) that can produce IR reuses this exact codegen.
 * The output mirrors what the babel front-end emits inline today:
 *
 *   element    -> (() => { const _el$ = createNativeElement(tag);
 *                          spread({ element: _el$, props });
 *                          insert(_el$, children); return _el$; })()
 *   component  -> createMemo(() => createComponent(Name, props))
 *   fragment   -> [ ...children ]
 */

const CONTROL_COMPONENT: Record<string, string> = {
  show: 'Show',
  for: 'For',
  index: 'Index',
  switch: 'Switch',
  match: 'Match',
  dynamic: 'Dynamic',
  errorBoundary: 'ErrorBoundary',
  suspense: 'Suspense',
};

function isIdent(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}

function propKey(name: string): string {
  return isIdent(name) ? name : JSON.stringify(name);
}

function propValue(p: IRProp): string {
  if (p.expr !== undefined) {
    // Events and non-reactive expressions pass through; reactive ones become thunks
    // so the runtime (spread/insert) can wire a render effect.
    return p.reactive ? `() => (${p.expr})` : `(${p.expr})`;
  }
  return JSON.stringify(p.literal ?? true);
}

/**
 * Component props are passed as VALUES, not thunks (unlike native-element attrs).
 * The whole `createComponent(...)` call sits inside a `createMemo`, so reading a
 * signal in a prop re-evaluates when the memo re-runs — no per-prop thunk needed.
 * This matches the inline codegen; wrapping a prop like
 * `history={createMemoryHistory()}` in `() => …` would hand the component a
 * function instead of the value (e.g. `history.get is not a function`).
 */
function componentPropValue(p: IRProp): string {
  if (p.expr !== undefined) return `(${p.expr})`;
  return JSON.stringify(p.literal ?? true);
}

/** Build a props object literal (or mergeProps(...) when spreads are present). */
function emitProps(props: IRProp[], childrenExpr: string | null, used: Set<string>): string {
  const spreads = props.filter((p) => p.kind === 'spread');
  const normal = props.filter((p) => p.kind !== 'spread');
  const entries = normal.map((p) => `${propKey(p.name)}: ${propValue(p)}`);
  if (childrenExpr != null) entries.push(`children: ${childrenExpr}`);
  const obj = `{ ${entries.join(', ')} }`;
  if (spreads.length > 0) {
    used.add('mergeProps');
    return `mergeProps(${spreads.map((s) => s.expr).join(', ')}, ${obj})`;
  }
  return obj;
}

function emitChildren(children: IRNode[], used: Set<string>, templates?: StaticTemplate[]): string {
  if (children.length === 1) return emitNode(children[0], used, templates);
  return `[${children.map((c) => emitNode(c, used, templates)).join(', ')}]`;
}

function emitComponent(name: string, props: IRProp[], children: IRNode[], used: Set<string>, templates?: StaticTemplate[]): string {
  used.add('createMemo');
  used.add('createComponent');
  const spreads = props.filter((p) => p.kind === 'spread');
  const normal = props.filter((p) => p.kind !== 'spread');
  // ALL component props are emitted as getters (Solid model): reading a signal in a prop
  // eagerly inside `createMemo(() => createComponent(...))` would re-create the whole component
  // on every change (a <Portal> then piles up). As getters the component is built ONCE and
  // reactivity flows through the getter into its own effects. Static props as getters are
  // harmless (they return the same value). Matches lazyProps() in the inline codegen.
  const entries = normal.map(
    (p) => `get ${propKey(p.name)}() { return ${componentPropValue(p)}; }`,
  );
  if (children.length > 0) {
    // Children are a LAZY getter: evaluated inside the component's execution, so
    // child components are created in the component's owner scope (preserves owner
    // nesting for context/Suspense), after the component runs (correct provider
    // ordering), and lazily (ErrorBoundary can still catch a throwing child).
    entries.push(`get children() { return ${emitChildren(children, used, templates)}; }`);
  }
  let obj = `{ ${entries.join(', ')} }`;
  if (spreads.length > 0) {
    used.add('mergeProps');
    obj = `mergeProps(${spreads.map((s) => s.expr).join(', ')}, ${obj})`;
  }
  // The memo never recomputes — every prop is a getter, so this callback reads nothing
  // reactive. It is here for what it makes `insert` do, and it cannot be elided.
  //
  // A component whose return value is *itself* bare control flow (`return <Show …/>`)
  // produces a memo, which `createComponent` deliberately does not stamp as a component.
  // Without this wrapper `insert` stops re-reading it, and the subtree goes stale when a
  // sibling updates the context it depends on — see `show-context-insert.spec.ts`.
  //
  // Static props are not a sufficient condition for dropping it either: safety depends on
  // what the callee *returns*, which lives in another module and is not visible here.
  //
  // Nor can it be a plain `() => createComponent(...)` thunk. The memo also provides
  // *identity*: it runs once and caches. A thunk is re-invoked by insert's render effect
  // on every run, rebuilding the component with a fresh owner — which loses context,
  // duplicates the tree on hydration and piles up Portals. Measured: dropping the wrapper
  // fails 3 tests, replacing it with a thunk fails 14.
  //
  // Control flow does use a bare arrow, and that is not a counter-example: control flow
  // is the reactive boundary and is *meant* to re-run. A user component is meant to run
  // once.
  return `createMemo(() => createComponent(${name}, ${obj}))`;
}

function emitNode(node: IRNode, used: Set<string>, templates?: StaticTemplate[]): string {
  switch (node.kind) {
    case 'text':
      return JSON.stringify(node.value);

    case 'expr':
      return node.reactive ? `() => (${node.code})` : `(${node.code})`;

    case 'fragment':
      if (node.children.length === 0) return 'null';
      return emitChildren(node.children, used, templates);

    case 'component':
      return emitComponent(node.name, node.props, node.children, used, templates);

    case 'control': {
      const name = CONTROL_COMPONENT[node.control] ?? node.control;
      used.add(name);
      return emitComponent(name, node.props, node.children, used, templates);
    }

    case 'element': {
      // A static subtree is parsed once into a <template> and cloned per instance:
      // one cloneNode instead of an createNativeElement + spread per element.
      // SVG is excluded: the runtime wraps SVG template HTML in an <svg> host and
      // `cloneTemplate(t, true)` returns that wrapper, not the serialized element, so
      // cloning would hand back the wrong node. Correctness first — SVG keeps the
      // imperative path until the runtime grows an unwrapping clone.
      if (templates && node.static && !node.svg && isSerializable(node)) {
        used.add('templateNode');
        const id = `_tmpl$${templates.length}`;
        templates.push({ id, html: serializeStatic(node), tag: node.tag, svg: false });
        return `templateNode(${id}, ${JSON.stringify(node.tag)})`;
      }
      used.add('createNativeElement');
      const tag = JSON.stringify(node.tag);
      const el = '_el$';
      const parts: string[] = [];
      const createArgs = node.svg ? `${tag}, true` : tag;
      parts.push(`const ${el} = createNativeElement(${createArgs});`);

      if (node.props.length > 0) {
        used.add('spread');
        const svgFlag = node.svg ? ', isSVG: true' : '';
        parts.push(`spread({ element: ${el}, props: ${emitProps(node.props, null, used)}${svgFlag} });`);
      }
      // Insert each child individually (like the jsx runtime's applyProps), so a
      // reactive/component child that isn't the only child still gets its own
      // reactive binding. A single insert(el, [array]) does NOT bind function
      // elements sitting inside the array.
      for (const child of node.children) {
        used.add('insert');
        const childCode = emitNode(child, used, templates);
        const isFn =
          (child.kind === 'expr' && child.reactive) ||
          child.kind === 'component' ||
          child.kind === 'control';
        parts.push(isFn ? `insert(${el}, ${childCode}, null);` : `insert(${el}, ${childCode});`);
      }
      parts.push(`return ${el};`);
      return `(() => { ${parts.join(' ')} })()`;
    }
  }
}

/**
 * Substitute template declarations into the code as inline `createTemplate` calls.
 *
 * For hosts that cannot hoist — nested JSX lowered inside an expression, where there is
 * no module scope to reach. `createTemplate` caches by HTML string, so this costs a Map
 * lookup per instantiation rather than a re-parse, and is still far cheaper than
 * building the subtree element by element.
 */
export function inlineTemplates(code: string, templates: StaticTemplate[] | undefined): string {
  if (!templates || templates.length === 0) return code;
  let out = code;
  for (const tpl of templates) {
    out = out.split(tpl.id).join(JSON.stringify(tpl.html));
  }
  return out;
}

export const imperativeBackend: CodegenBackend = {
  name: 'imperative',
  contract: RUNTIME_CONTRACT_V1,
  emit(node: IRNode, options: CompilerOptions): CodegenResult {
    const used = new Set<string>();
    // Off by default: `createTemplate` builds real DOM nodes, so on the server they
    // land in a ServerElement tree and clash, and during hydration a clone creates a
    // fresh node where the existing one must be adopted. Both need runtime support
    // that does not exist yet, so the client-only win stays opt-in until it does.
    const templates: StaticTemplate[] | undefined = options?.templateClone !== false
      ? []
      : undefined;
    const code = emitNode(node, used, templates);
    return { code, imports: Array.from(used), templates };
  },
};
