import type { CodegenBackend, CodegenResult, StaticTemplate } from '../backend.js';
import type { HolePosition, IRNode, IRProp } from '../../ir/nodes.js';
import { planPartialTemplate } from '../partial-template.js';
import {
  isSerializable,
  serializeStatic,
  templatePositions,
  isPlainLiteralAttr,
  htmlAttrName,
} from '../serialize-static.js';
import type { CompilerOptions } from '../../options.js';
import { RUNTIME_CONTRACT_V1 } from '../contract.js';
import { markHole, markProps, SOURCE_MARKER } from '../../transform/source-locations.js';
import { paren } from '../../analyze/paren.js';

/**
 * Imperative fine-grained backend: emits createNativeElement/insert/spread/
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
    // A ref is not reactive, but which variable ends up holding the element is worth
    // saying, so it carries its own text and position.
    if (p.name === 'ref' && p.at)
      return markHole(paren(p.expr, 'value'), p.at.line, p.at.column, p.expr);
    // Events and non-reactive expressions pass through; reactive ones become thunks
    // so the runtime (spread/insert) can wire a render effect.
    if (!p.reactive) return paren(p.expr, 'value');
    const accessor = `() => ${paren(p.expr, 'arrowBody')}`;
    // `at` is the gate: a production build carries no marker.
    return p.at ? markHole(accessor, p.at.line, p.at.column, p.directive) : accessor;
  }
  return JSON.stringify(p.literal ?? true);
}

/**
 * Component props are passed as VALUES, not thunks (unlike native-element attrs).
 * The whole `createComponent(...)` call sits inside a `createMemo`, so reading a
 * signal in a prop re-evaluates when the memo re-runs, no per-prop thunk needed.
 * This matches the inline codegen; wrapping a prop like
 * `history={createMemoryHistory()}` in `() => …` would hand the component a
 * function instead of the value (e.g. `history.get is not a function`).
 */
function componentPropValue(p: IRProp): string {
  // Sits in a `return`, where a top-level comma would read as a sequence.
  if (p.expr !== undefined) return paren(p.expr, 'value');
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

/**
 * The memo a component lowers to is an accessor, so it takes the same hole mark as any
 * other reactive binding. Without it, the insert that places the subtree reports whatever
 * the runtime stack says: a position in the compiled file.
 */
function markBind(code: string, at?: HolePosition): string {
  return at ? markHole(code, at.line, at.column) : code;
}

function emitChildren(children: IRNode[], used: Set<string>, templates?: StaticTemplate[]): string {
  if (children.length === 1) return emitNode(children[0], used, templates);
  return `[${children.map((c) => emitNode(c, used, templates)).join(', ')}]`;
}

function emitComponent(
  name: string,
  props: IRProp[],
  children: IRNode[],
  used: Set<string>,
  templates?: StaticTemplate[],
  at?: { file: string; line: number; column: number },
): string {
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
  // Every prop is a getter, so none of them can carry a position. The map rides alongside,
  // and a build that recorded no locations emits nothing.
  const propAt: Record<string, [number, number]> = {};
  for (const p of normal) if (p.at) propAt[p.name] = [p.at.line, p.at.column];
  if (Object.keys(propAt).length) obj = markProps(obj, propAt);
  // The memo never recomputes: every prop is a getter, so this callback reads nothing
  // reactive. It is here for what it makes `insert` do, and it cannot be elided.
  //
  // A component whose return value is *itself* bare control flow (`return <Show …/>`)
  // produces a memo, which `createComponent` deliberately does not stamp as a component.
  // Without this wrapper `insert` stops re-reading it, and the subtree goes stale when a
  // sibling updates the context it depends on: see `show-context-insert.spec.ts`.
  //
  // Static props are not a sufficient condition for dropping it either: safety depends on
  // what the callee *returns*, which lives in another module and is not visible here.
  //
  // Nor can it be a plain `() => createComponent(...)` thunk. The memo also provides
  // *identity*: it runs once and caches. A thunk is re-invoked by insert's render effect
  // on every run, rebuilding the component with a fresh owner, which loses context,
  // duplicates the tree on hydration and piles up Portals. Measured: dropping the wrapper
  // fails 3 tests, replacing it with a thunk fails 14.
  //
  // Control flow does use a bare arrow, and that is not a counter-example: control flow
  // is the reactive boundary and is *meant* to re-run. A user component is meant to run
  // once.
  // The mark goes inside the call, where it runs before createMemo makes the node and so
  // is the one the node takes. Devtools installs the global; without it this is a no-op.
  const mark = at
    ? `globalThis.${SOURCE_MARKER}?.(${JSON.stringify(at.file)},${at.line},${at.column},${JSON.stringify(name)}), `
    : '';
  // The mark makes this a sequence, which has to stay wrapped to pass as one argument.
  // Without one there is nothing to wrap, and a production build never has one.
  return `createMemo(${paren(`${mark}() => createComponent(${name}, ${obj})`, 'value')})`;
}

/** `el.setAttribute("class", "card")` for a compile-time constant. */
function staticAttrAssignment(el: string, prop: IRProp): string {
  const name = htmlAttrName(prop.name);
  const value = prop.literal;
  // A valueless attribute is `true` in the IR and the empty string in the DOM.
  if (value === true || value === undefined) return `${el}.setAttribute(${JSON.stringify(name)}, "");`;
  if (value === false || value === null) return '';
  return `${el}.setAttribute(${JSON.stringify(name)}, ${JSON.stringify(String(value))});`;
}

let partial = false;

function emitNode(node: IRNode, used: Set<string>, templates?: StaticTemplate[]): string {
  switch (node.kind) {
    case 'text':
      return JSON.stringify(node.value);

    case 'expr': {
      if (!node.reactive) return paren(node.code, 'value');
      const accessor = `() => ${paren(node.code, 'arrowBody')}`;
      return node.at ? markHole(accessor, node.at.line, node.at.column) : accessor;
    }

    case 'fragment':
      if (node.children.length === 0) return 'null';
      return emitChildren(node.children, used, templates);

    case 'component':
      // No reactive prop means no `bindAt`, which is most tags. The insert that places the
      // subtree still has to report somewhere, and the tag itself is where it was written , 
      // without this it reports whatever the runtime stack says, a line in the compiled file.
      return markBind(emitComponent(node.name, node.props, node.children, used, templates, node.at), node.bindAt ?? node.at);

    case 'control': {
      const name = CONTROL_COMPONENT[node.control] ?? node.control;
      used.add(name);
      return markBind(emitComponent(name, node.props, node.children, used, templates), node.bindAt);
    }

    case 'element': {
      // A static subtree is parsed once into a <template> and cloned per instance:
      // one cloneNode instead of an createNativeElement + spread per element.
      // SVG is excluded: the runtime wraps SVG template HTML in an <svg> host and
      // `cloneTemplate(t, true)` returns that wrapper, not the serialized element, so
      // cloning would hand back the wrong node. Correctness first, SVG keeps the
      // imperative path until the runtime grows an unwrapping clone.
      if (templates && node.static && !node.svg && isSerializable(node)) {
        used.add('templateNode');
        const id = `_tmpl$${templates.length}`;
        templates.push({ id, html: serializeStatic(node), tag: node.tag, svg: false });
        // The positions ride along so devtools can name the line each element was written
        // on; the template string itself maps back to the root and nothing finer.
        const at = templatePositions(node);
        return at
          ? `templateNode(${id}, ${JSON.stringify(node.tag)}, false, false, ${JSON.stringify(at)})`
          : `templateNode(${id}, ${JSON.stringify(node.tag)})`;
      }
      // Structure static, contents dynamic: the common shape. One template for the
      // structure, then each hole filled through a reference into the clone. Every
      // reference is read before any insertion, since inserting shifts later positions.
      if (templates && partial) {
        const plan = planPartialTemplate(node);
        if (plan) {
          used.add('templateNode');
          used.add('insert');
          used.add('holeEnd');
          used.add('holeContent');
          used.add('holeScope');
          const id = `_tmpl$${templates.length}`;
          templates.push({ id, html: plan.html, tag: plan.tag, svg: false });

          const at = templatePositions(node);
          const lines = [
            `const _el$ = templateNode(${id}, ${JSON.stringify(plan.tag)}, true${
              at ? `, false, ${JSON.stringify(at)}` : ''
            });`,
          ];
          // Every reference first: inserting shifts what follows, so the walk has to be
          // complete before any content goes in.
          for (const step of plan.steps) lines.push(`const ${step.ref} = ${step.expr};`);
          for (const hole of plan.holes) {
            // The fourth argument is what the hole already holds, nothing on a fresh
            // clone, the server's content when hydrating. `insert` reconciles against it,
            // so hydration reuses those nodes rather than building new ones.
            // `holeScope` places the hydration cursor at what the server rendered for
            // this hole, so anything the content builds internally adopts too.
            lines.push(
              `insert(${hole.parentRef}, holeScope(${hole.startRef}, () => ` +
                `${paren(emitNode(hole.node, used, templates), 'arrowBody')}), ` +
                `${hole.endRef}, holeContent(${hole.startRef}, ${hole.endRef}));`,
            );
          }
          lines.push('return _el$;');
          return `(() => { ${lines.join(' ')} })()`;
        }
      }

      used.add('createNativeElement');
      const tag = JSON.stringify(node.tag);
      const el = '_el$';
      const parts: string[] = [];
      // The third argument is where the tag was written. An element built this way is not
      // in a template, so nothing else records it.
      const createArgs = node.at
        ? `${tag}, ${node.svg}, ${JSON.stringify(node.at)}`
        : node.svg
          ? `${tag}, true`
          : tag;
      parts.push(`const ${el} = createNativeElement(${createArgs});`);

      if (node.props.length > 0) {
        // Literal attributes are written straight on. `spread` is a generic helper that
        // walks every prop checking for reactivity, events, refs, class/style objects and
        // namespaces: none of which a compile-time constant needs. Same predicate the
        // template serializer uses, so the two agree on what a plain attribute is.
        if (!node.svg && node.props.every(isPlainLiteralAttr)) {
          for (const p of node.props) parts.push(staticAttrAssignment(el, p));
        } else {
          used.add('spread');
          const svgFlag = node.svg ? ', isSVG: true' : '';
          // A dash in the tag is what makes it a custom element, and the tag is known
          // here, so the runtime does not have to read it back off the node. It falls
          // back to that check when the flag is absent, which is how a hand-written
          // `spread` call still behaves.
          const customFlag = node.tag.includes('-') ? ', isCustomElement: true' : '';
          parts.push(
            `spread({ element: ${el}, props: ${emitProps(node.props, null, used)}${svgFlag}${customFlag} });`,
          );
        }
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
 * For hosts that cannot hoist: nested JSX lowered inside an expression, where there is
 * no module scope to reach. `createTemplate` caches by HTML string, so this costs a Map
 * lookup per instantiation rather than a re-parse, and is still far cheaper than
 * building the subtree element by element.
 */
export function inlineTemplates(code: string, templates: StaticTemplate[] | undefined): string {
  if (!templates || templates.length === 0) return code;
  const byId = new Map(templates.map((t) => [t.id, JSON.stringify(t.html)]));
  // Single pass, for the same reason `adoptTemplates` needs one.
  return code.replace(/_tmpl\$\d+/g, (id) => byId.get(id) ?? id);
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
    partial = options?.partialTemplates === true;
    const code = emitNode(node, used, templates);
    return { code, imports: Array.from(used), templates };
  },
};
