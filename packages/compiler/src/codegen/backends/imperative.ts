import type { CodegenBackend, CodegenResult, StaticTemplate } from '../backend.js';
import type { HolePosition, IRNode, IRProp } from '../../ir/nodes.js';
import { containsCustomElement, planPartialTemplate, type TemplateBinding } from '../partial-template.js';
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
 * `history={createMemoryHistory()}` in `() => ...` would hand the component a
 * function instead of the value (e.g. `history.get is not a function`).
 */
function componentPropValue(p: IRProp): string {
  // Sits in a `return`, where a top-level comma would read as a sequence.
  if (p.expr !== undefined) return paren(p.expr, 'value');
  return JSON.stringify(p.literal ?? true);
}

/** A number, string, boolean or `null` written as is: the same on every read. */
const CONSTANT = /^(?:-?\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|true|false|null)$/;

function isConstantProp(p: IRProp): boolean {
  return p.expr === undefined || CONSTANT.test(p.expr.trim());
}

/**
 * A spread's argument as `mergeProps` takes it: a plain name (`props`, `others.rest`) as it is,
 * anything computed (`attributes()`, a condition) as a function, read where the props are applied.
 */
function spreadSource(expr: string | undefined): string {
  if (expr === undefined) return String(expr);
  return /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(expr.trim()) ? expr : `() => (${expr})`;
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
    return `mergeProps(${spreads.map((s) => spreadSource(s.expr)).join(', ')}, ${obj})`;
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
  // An element is built, and while hydrating claims its server node, when the array literal
  // runs; a component, control flow or reactive expression is read later, when the array is
  // placed. An element after one of those would claim first and take the server node that
  // belongs to it, so from the first one on elements are deferred too (`deferElement`: built in
  // order when the array is placed, once, in the owner the array was written in).
  let deferred = false;
  const items = children.map((child) => {
    const code = emitNode(child, used, templates);
    if (child.kind === 'element' && deferred) {
      used.add('deferElement');
      return `deferElement(() => ${paren(code, 'arrowBody')})`;
    }
    if (child.kind === 'component' || (child.kind === 'expr' && child.reactive)) deferred = true;
    return code;
  });
  return `[${items.join(', ')}]`;
}

function emitComponent(
  name: string,
  props: IRProp[],
  children: IRNode[],
  used: Set<string>,
  templates?: StaticTemplate[],
  at?: { file: string; line: number; column: number },
): string {
  used.add('createComponent');
  const spreads = props.filter((p) => p.kind === 'spread');
  const normal = props.filter((p) => p.kind !== 'spread');
  // Component props are emitted as getters (Solid model): reading a signal in a prop
  // eagerly inside `createMemo(() => createComponent(...))` would re-create the whole component
  // on every change (a <Portal> then piles up). As getters the component is built ONCE and
  // reactivity flows through the getter into its own effects.
  // A literal (`step={1}`, `label="Count"`) cannot change, so it goes in as a plain value.
  // Each body emitted once: emitting children registers their templates.
  const plain: [string, string][] = [];
  const bodies: [string, string][] = [];
  for (const p of normal) (isConstantProp(p) ? plain : bodies).push([p.name, componentPropValue(p)]);
  if (children.length > 0) {
    // Children are a LAZY getter: evaluated inside the component's execution, so
    // child components are created in the component's owner scope (preserves owner
    // nesting for context/Suspense), after the component runs (correct provider
    // ordering), and lazily (ErrorBoundary can still catch a throwing child).
    bodies.push(['children', emitChildren(children, used, templates)]);
  }
  const values = plain.map(([name, value]) => `${propKey(name)}: ${value}`);
  let obj = `{ ${[...values, ...bodies.map(([name, body]) => `get ${propKey(name)}() { return ${body}; }`)].join(', ')} }`;
  // A getter is a method: `this` inside it is the props object. Written in a class method
  // (a custom element's render), `title={() => this.name}` then read the props, not the
  // element. Arrows keep the enclosing `this`, so those props go out as arrow thunks and the
  // getters call them. Only when some prop mentions `this`; everything else is unchanged.
  if (bodies.some(([, body]) => /\bthis\b/.test(body))) {
    // Parenthesised: an object literal body would otherwise parse as a block.
    const thunks = bodies.map(([name, body]) => `${JSON.stringify(name)}: () => (${body})`);
    const getters = bodies.map(([name]) => `get ${propKey(name)}() { return _$t[${JSON.stringify(name)}](); }`);
    obj = `((_$t) => ({ ${[...values, ...getters].join(', ')} }))({ ${thunks.join(', ')} })`;
  }
  if (spreads.length > 0) {
    used.add('mergeProps');
    obj = `mergeProps(${spreads.map((s) => spreadSource(s.expr)).join(', ')}, ${obj})`;
  }
  // A getter cannot carry a position, nor can a plain value. The map rides alongside,
  // and a build that recorded no locations emits nothing.
  const propAt: Record<string, [number, number]> = {};
  for (const p of normal) if (p.at) propAt[p.name] = [p.at.line, p.at.column];
  if (Object.keys(propAt).length) obj = markProps(obj, propAt);
  // Devtools installs the global; without it the mark is a no-op.
  const mark = at
    ? `globalThis.${SOURCE_MARKER}?.(${JSON.stringify(at.file)},${at.line},${at.column},${JSON.stringify(name)}), `
    : '';
  // Called where it is written, as Solid does: the component builds now, once. Only the result
  // of control flow it returns stays reactive, and `insert` tracks that. The mark goes just
  // before the call: in development the component runs in a memo of its own, the next node
  // made, which takes it.
  return mark ? `(${mark}createComponent(${name}, ${obj}))` : `createComponent(${name}, ${obj})`;
}

/** The attribute a binding writes: a forced name stripped, a plain name in its HTML spelling. */
function bindingTarget(binding: TemplateBinding): string {
  const name = binding.prop.name;
  if (binding.kind === 'boolAttr') return name.slice('bool:'.length);
  if (name.startsWith('prop:')) return name.slice('prop:'.length);
  if (name.startsWith('attr:')) return name.slice('attr:'.length);
  return htmlAttrName(name);
}

/**
 * One attribute bound on a walked template node, through the same helper
 * `spread` applies for that prop. A binding replaces the generic walk over
 * every prop: what it does is decided here, once, instead of per element
 * at runtime.
 */
function bindingStatement(binding: TemplateBinding, used: Set<string>): string {
  const { ref, prop, kind } = binding;
  const value = propValue(prop);
  switch (kind) {
    case 'class':
      used.add('setClassName');
      return `setClassName(${ref}, ${value});`;
    case 'classList':
      used.add('setClassList');
      return `setClassList(${ref}, ${value}, []);`;
    case 'classListDynamic':
      used.add('setDynamicClassList');
      return `setDynamicClassList(${ref}, ${value});`;
    case 'style':
      used.add('setStyle');
      return `setStyle(${ref}, ${value}, []);`;
    case 'styleDynamic':
      used.add('setDynamicStyle');
      return `setDynamicStyle(${ref}, ${value});`;
    case 'attr':
      used.add('setDynamicAttribute');
      return `setDynamicAttribute(${ref}, ${JSON.stringify(bindingTarget(binding))}, ${value});`;
    case 'property':
      used.add('setDynamicProperty');
      return `setDynamicProperty(${ref}, ${JSON.stringify(bindingTarget(binding))}, ${value});`;
    case 'boolAttr':
      used.add('setDynamicBoolAttribute');
      return `setDynamicBoolAttribute(${ref}, ${JSON.stringify(bindingTarget(binding))}, ${value});`;
    case 'event':
      // The delegated listener reads `$$name` off the element; the module registers the event
      // with `delegateEvents([...])`, so the assignment is all a bubbling event needs.
      if (assignEvents && prop.event!.delegated) return `${ref}.$$${prop.event!.name} = ${value};`;
      used.add('addDelegatedEventListener');
      return `addDelegatedEventListener(${ref}, ${JSON.stringify(prop.event!.name)}, ${value});`;
    case 'nativeEvent':
      used.add('addNativeEventListener');
      return `addNativeEventListener(${ref}, ${JSON.stringify(prop.name.slice(3))}, ${value});`;
    case 'ref':
      used.add('handleRef');
      // A variable gets the element assigned; a function or `{ current }` in it still wins.
      // The target is the expression as written: `value` may carry the devtools' wrapper.
      return prop.assign ? `handleRef(${value}, ${ref}, (_v) => (${prop.expr} = _v));` : `handleRef(${value}, ${ref});`;
    case 'use':
      used.add('applyUse');
      return `applyUse(${ref}, ${value});`;
  }
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
/** Output for code that only renders in the browser: no hydration markers, cloned templates. */
let client = false;
/** Set by a caller that registers delegated events at module level (`transformTemplates`). */
let assignEvents = false;

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

    case 'element': {
      // A static subtree is parsed once into a <template> and cloned per instance:
      // one cloneNode instead of an createNativeElement + spread per element.
      // SVG is excluded: the runtime wraps SVG template HTML in an <svg> host and
      // `cloneTemplate(t, true)` returns that wrapper, not the serialized element, so
      // cloning would hand back the wrong node. Correctness first, SVG keeps the
      // imperative path until the runtime grows an unwrapping clone.
      if (templates && node.static && !node.svg && isSerializable(node) && !containsCustomElement(node)) {
        const id = `_tmpl$${templates.length}`;
        templates.push({ id, html: serializeStatic(node), tag: node.tag, svg: false });
        // The positions ride along so devtools can name the line each element was written
        // on; the template string itself maps back to the root and nothing finer.
        const at = templatePositions(node);
        if (client) return `${id}(${at ? JSON.stringify(at) : ''})`;
        used.add('templateNode');
        return at
          ? `templateNode(${id}, ${JSON.stringify(node.tag)}, false, false, ${JSON.stringify(at)})`
          : `templateNode(${id}, ${JSON.stringify(node.tag)})`;
      }
      // Structure static, contents dynamic: the common shape. One template for the
      // structure, then each hole filled through a reference into the clone. Every
      // reference is read before any insertion, since inserting shifts later positions.
      if (templates && partial) {
        const plan = planPartialTemplate(node, client);
        if (plan && client) {
          used.add('insert');
          const id = `_tmpl$${templates.length}`;
          templates.push({ id, html: plan.html, tag: plan.tag, svg: false });
          const at = templatePositions(node);
          const lines = [`const _el$ = ${id}(${at ? JSON.stringify(at) : ''});`];
          for (const step of plan.steps) lines.push(`const ${step.ref} = ${step.expr};`);
          for (const binding of plan.bindings) lines.push(bindingStatement(binding, used));
          for (const hole of plan.holes) {
            const anchor = hole.anchorRef ? `, ${hole.anchorRef}` : '';
            lines.push(`insert(${hole.parentRef}, ${emitNode(hole.node, used, templates)}${anchor});`);
          }
          lines.push('return _el$;');
          return `(() => { ${lines.join(' ')} })()`;
        }
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
          // Attributes next, as spread applies props before children are inserted.
          for (const binding of plan.bindings) lines.push(bindingStatement(binding, used));
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
          // For a custom element it also names the props wrapped as accessors: any other
          // function is a property value (an action, a callback) and must not be called.
          const accessors = node.props
            .filter((p) => p.kind !== 'spread' && p.expr !== undefined && p.reactive && p.name !== 'ref')
            .map((p) => p.name);
          const customFlag = node.tag.includes('-') ? `, isCustomElement: true, accessors: ${JSON.stringify(accessors)}` : '';
          // The element's own JSX children win: spread `children` are then left out, as in Solid.
          const childrenFlag = node.children.length > 0 ? ', skipChildren: true' : '';
          parts.push(
            `spread({ element: ${el}, props: ${emitProps(node.props, null, used)}${svgFlag}${customFlag}${childrenFlag} });`,
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
        // `null` asks insert for an anchor of its own, which holds the child's place among
        // its siblings. Every child whose content can change needs one: an expression the
        // classifier calls opaque (an arrow, a function passed by name) may still be one.
        // Only a literal never changes, and it goes straight in.
        const anchored =
          (child.kind === 'expr' && (child.reactive || !isLiteralCode(child.code))) ||
          child.kind === 'component';
        parts.push(anchored ? `insert(${el}, ${childCode}, null);` : `insert(${el}, ${childCode});`);
      }
      parts.push(`return ${el};`);
      return `(() => { ${parts.join(' ')} })()`;
    }
  }
}

/** A string, number, boolean or nullish literal: an expression that never renders anything else. */
const LITERAL = /^\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`[^`$]*`|-?\d[\d_.eE+-]*|true|false|null|undefined)\s*$/;
const isLiteralCode = (code: string): boolean => LITERAL.test(code);

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
    assignEvents = (options as { assignEvents?: boolean } | undefined)?.assignEvents === true;
    client = (options as { client?: boolean } | undefined)?.client === true;
    const code = emitNode(node, used, templates);
    return { code, imports: Array.from(used), templates };
  },
};
