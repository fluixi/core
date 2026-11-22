/**
 * Lower a parsed Template AST (`@fluixi/template-parser`) into the host-agnostic IR.
 *
 * No parser in here: the `${...}` holes arrive already described as `TemplateHole`,
 * since reading them means reading JavaScript and that belongs to a front-end.
 *
 * Pipeline:  pieces → parseTemplate → Template AST → lowerTemplate → IRNode
 */
import {
  type AttributeLikeNode,
  type AttributeNode,
  type ComponentNode,
  type EventBindingNode,
  type ElementNode,
  type Piece,
  type TemplateNode,
  type Diagnostic,
  parseTemplate,
} from '@fluixi/template-parser';
import type { HolePosition, IRNode, IRProp, IRPropKind } from '../ir/nodes.js';
import { LoadDirectiveError, parseLoadDirective } from '../resolve/load-directive.js';
import { imperativeBackend, inlineTemplates } from '../codegen/backends/imperative.js';
import { cleanTemplateText } from './text.js';
import { decodeEntities } from './entities.js';
import { paren } from '../analyze/paren.js';
import { markHole } from '../transform/source-locations.js';
import { DELEGATED_EVENTS } from './delegated-events.js';

/**
 * One `${...}` slot, as the front-end describes it. Conclusions about the
 * expression only: never a syntax tree, or the parser dependency creeps back.
 */
export interface TemplateHole {
  /** The expression source, verbatim. Anything nested inside it is already compiled. */
  code: string;
  /** Whether it must be wired reactively (see analyze/reactive-expr.ts). */
  reactive: boolean;
  /**
   * Set when the hole is a single-expression arrow, `${item => ...}`. `each` turns
   * that into `For`'s render function, so it needs the parameters and the body
   * separately rather than the arrow as written.
   */
  arrow?: { params: string[]; body: string; bodyReactive: boolean };
  /** Whether the hole is an object literal: `class=${{...}}` lowers to classList. */
  object?: boolean;
  /**
   * Where the `${...}` was written. Only kept when the host asked for source locations.
   *
   * A template is emitted as one overwrite, so every hole in it traces back through the
   * source map to the line the template opens at. Without this, every node a template makes
   * reports that one position.
   */
  at?: HolePosition;
}


/** Escape a static text run for embedding in a template literal. */
function escapeTemplate(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

/** The tag that carries directives and renders only its content. Never a custom element: no dash. */
const CONTAINER = 'container';

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

class Lowerer {
  constructor(
    private holes: TemplateHole[],
    private used: Set<string>,
    private sourceFile?: string,
    private positionAt?: (offset: number) => { line: number; column: number },
  ) {}

  /**
   * Where a tag is written, for the mark a component node carries.
   *
   * The parser reports offsets, and they are offsets into the file: the pieces it was given
   * carry the positions the front-end recorded. Only built when the host asked for source
   * locations, which is the only time either of these is set.
   */
  private tagAt(node: { loc?: { start: number } }): { file: string; line: number; column: number } | undefined {
    const start = node.loc?.start;
    if (!this.sourceFile || !this.positionAt || start == null) return undefined;
    const { line, column } = this.positionAt(start);
    return { file: this.sourceFile, line, column };
  }

  private hole(i: number): TemplateHole {
    // -1 marks a recovered-from missing binding; emit a harmless undefined.
    return this.holes[i] ?? { code: 'undefined', reactive: false };
  }

  /** Emit a nested IR subtree to code (for `Show` fallback / `For` children). */
  private emit(node: IRNode): string {
    const { code, imports, templates } = imperativeBackend.emit(node, {} as any);
    for (const s of imports) this.used.add(s);
    // No module scope reachable from a nested subtree, so templates are inlined;
    // `createTemplate` caches by HTML, so this is a lookup rather than a re-parse.
    return inlineTemplates(code, templates);
  }

  // content

  lowerRoot(children: TemplateNode[]): IRNode {
    const nodes = this.lowerChildren(children);
    if (nodes.length === 1) return nodes[0];
    return { kind: 'fragment', children: nodes };
  }

  /** Lower a sibling list, handling text-drop and if/else/each restructuring. */
  private lowerChildren(children: TemplateNode[]): IRNode[] {
    const out: IRNode[] = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];

      if (child.kind === 'Element' || child.kind === 'Component') {
        const ifDir = child.attributes.find((a) => a.kind === 'IfDirective');
        if (ifDir && ifDir.kind === 'IfDirective') {
          // Pair with a following `else` sibling (skipping a whitespace-only text).
          let elseIdx = i + 1;
          if (elseIdx < children.length && this.isBlankText(children[elseIdx])) elseIdx++;
          const elseNode = children[elseIdx];
          const hasElse =
            elseNode &&
            (elseNode.kind === 'Element' || elseNode.kind === 'Component') &&
            elseNode.attributes.some((a) => a.kind === 'ElseDirective');
          out.push(this.lowerIf(child, ifDir.hole, hasElse ? (elseNode as ElementNode) : null));
          if (hasElse) i = elseIdx;
          continue;
        }
      }

      const node = this.lowerNode(child);
      if (node) out.push(node);
    }
    return out;
  }

  private isBlankText(n: TemplateNode): boolean {
    return n.kind === 'Text' && !n.raw && cleanTemplateText(n.value) === '';
  }

  private lowerNode(node: TemplateNode): IRNode | null {
    switch (node.kind) {
      case 'Text': {
        if (node.raw) return { kind: 'text', value: node.value };
        // Decoded after cleaning, so an entity written as a space is kept as written.
        const cleaned = decodeEntities(cleanTemplateText(node.value));
        return cleaned ? { kind: 'text', value: cleaned } : null;
      }
      case 'Comment':
        return null; // dropped, like JSX comments
      case 'Expression': {
        const h = this.hole(node.hole);
        return { kind: 'expr', code: h.code, reactive: h.reactive, ...(h.at ? { at: h.at } : {}) };
      }
      case 'Fragment':
        return { kind: 'fragment', children: this.lowerChildren(node.children) };
      case 'Element':
        return this.lowerElement(node);
      case 'Component':
        return this.lowerComponent(node);
      default:
        return null;
    }
  }

  private lowerElement(el: ElementNode): IRNode {
    // `<component is=${C} ...>...</component>` → `<Dynamic component=${C} ...>` (a
    // reactive component swap). Dynamic reads `component` via normalizeAccessor,
    // so it must be an ACCESSOR `() => C` (a bare function would be mis-called).
    const isAttr = el.attributes.find((a): a is AttributeNode => a.kind === 'Attribute' && a.name === 'is');
    if (el.tag === 'component' && isAttr && isAttr.value && isAttr.value.kind === 'hole') {
      const rest = el.attributes.filter((a) => a !== isAttr);
      const node = this.lowerComponent({ ...el, kind: 'Component', tag: 'Dynamic', tagHole: null, attributes: rest }) as IRNode & { props: IRProp[] };
      node.props.unshift({ name: 'component', kind: 'attr', expr: `() => ${paren(this.hole(isAttr.value.hole).code, 'arrowBody')}` });
      return node;
    }
    // `each` repeats the element's content, never the element: `<ul each>` is one list.
    const each = this.lowerEach(el);
    const children = each ? [each] : this.lowerChildren(el.children);
    // A `<container>` is only what it holds. It carries the directives and is never rendered.
    if (el.tag === CONTAINER) return children.length === 1 ? children[0] : { kind: 'fragment', children };
    const at = this.tagAt(el);
    return {
      kind: 'element',
      tag: el.tag,
      svg: el.namespace === 'svg',
      props: this.lowerAttributes(el.attributes, true),
      children,
      static: false,
      ...(at ? { at } : {}),
    };
  }

  private lowerComponent(el: ComponentNode): IRNode {
    // `<${Comp} />`: the tag is an interpolated expression, use the hole's code
    // as the component identity, so `createComponent(<expr>, ...)` is emitted.
    const name = el.tagHole != null ? this.hole(el.tagHole).code : el.tag;
    const props = this.lowerAttributes(el.attributes);

    // Named slots: a child with `slot="header"` becomes `props.header` (a lazy
    // getter, like `children`); the rest stay the default `children`. This is the
    // Solid convention: the component reads `props.header` / `props.children`.
    const { slots, rest } = this.partitionSlots(el.children);
    for (const [slotName, nodes] of slots) {
      const ir = nodes.length === 1 ? nodes[0] : { kind: 'fragment' as const, children: nodes };
      const slotProp: IRProp = {
        name: slotName,
        kind: 'attr',
        expr: this.emit(ir),
        jsxElement: true,
      };
      // A slot replaces a same-named attribute rather than joining it. `<Card header>`
      // alongside `<span slot="header">` otherwise emits the key twice, valid JS where
      // the last wins, but the first is dead code and esbuild warns on it. Content is
      // the more specific intent, so the slot is what survives.
      const clash = props.findIndex((p) => p.name === slotName);
      if (clash >= 0) props[clash] = slotProp;
      else props.push(slotProp);
    }

    // `load:` is a directive, not a prop: it says when this component's module is
    // fetched. Parsed with the same helper the JSX path uses so the two cannot drift.
    const loadAttr = el.attributes.find((a) => a.kind === 'LoadDirective');
    if (loadAttr?.dynamic) {
      throw new LoadDirectiveError(
        `'load:${loadAttr.strategy}' needs a literal value, not an expression: the strategy is compile-time.`,
      );
    }
    const load = loadAttr
      ? parseLoadDirective(`load:${loadAttr.strategy}`, loadAttr.modifier)
      : undefined;

    // The parser's positions are relative to the template string, not the file, so the
    // tag itself has none to give. The first hole is the closest thing that does, and for
    // the control-flow components: `<Show when=${...}>`, `<For each=${...}>`, it is the
    // expression driving the subtree anyway.
    // A reactive one: a literal carries a position too now, and it drives nothing.
    const bindAt = props.find((p) => p.at && p.reactive)?.at;

    const at = this.tagAt(el);

    return {
      kind: 'component',
      name,
      props,
      children: this.lowerChildren(rest),
      ...(at ? { at } : {}),
      ...(bindAt ? { bindAt } : {}),
      ...(load ? { load } : {}),
      ...(el.tagHole != null ? { tagExpression: true } : {}),
    };
  }

  /** Split a component's children into named slots (`slot="x"`) and the rest. */
  private partitionSlots(children: TemplateNode[]): { slots: Map<string, IRNode[]>; rest: TemplateNode[] } {
    const slots = new Map<string, IRNode[]>();
    const rest: TemplateNode[] = [];
    for (const child of children) {
      if (child.kind === 'Element' || child.kind === 'Component') {
        const slot = child.attributes.find(
          (a): a is AttributeNode => a.kind === 'Attribute' && a.name === 'slot',
        );
        if (slot && slot.value && slot.value.kind === 'static') {
          const stripped = { ...child, attributes: child.attributes.filter((a) => a !== slot) };
          const ir = stripped.kind === 'Element' ? this.lowerElement(stripped) : this.lowerComponent(stripped);
          const bucket = slots.get(slot.value.value) ?? [];
          bucket.push(ir);
          slots.set(slot.value.value, bucket);
          continue;
        }
      }
      rest.push(child);
    }
    return { slots, rest };
  }

  // control-flow sugar

  /** `<el if=${cond}>...</el>` (+ optional `<el else>`) → `<Show when fallback>`. */
  private lowerIf(el: ElementNode | ComponentNode, condHole: number, elseEl: ElementNode | ComponentNode | null): IRNode {
    const cond = this.hole(condHole);
    const props: IRProp[] = [
      { name: 'when', kind: 'attr', expr: cond.code, reactive: cond.reactive, ...(cond.at ? { at: cond.at } : {}) },
    ];
    if (elseEl) {
      const elseIR = this.stripAndLower(elseEl, (a) => a.kind === 'ElseDirective');
      props.push({ name: 'fallback', kind: 'attr', expr: this.emit(elseIR), jsxElement: true });
    }
    const child = this.stripAndLower(el, (a) => a.kind === 'IfDirective');
    const at = this.tagAt(el);
    return { kind: 'component', name: 'Show', props, children: [child], ...(at ? { at } : {}), ...(cond.at ? { bindAt: cond.at } : {}) };
  }

  /**
   * `<el each=${items} key?>${item => ...}</el>` → `<el><For each>{item => ...}</For></el>`: the
   * content is repeated per item. Content that is not a `${item => ...}` arrow is repeated as
   * it is. Null when the element has no `each`.
   */
  private lowerEach(el: ElementNode): IRNode | null {
    const eachDir = el.attributes.find((a) => a.kind === 'EachDirective');
    if (!eachDir || eachDir.kind !== 'EachDirective') return null;
    const each = this.hole(eachDir.hole);

    const props: IRProp[] = [{ name: 'each', kind: 'attr', expr: each.code, reactive: each.reactive, ...(each.at ? { at: each.at } : {}) }];
    if (eachDir.key) {
      // `<For by>` wants a KEY FUNCTION, not a string. `key="id"` selects the
      // `id` field: `(item) => item["id"]`; `key=${fn}` passes the function.
      const by = 'static' in eachDir.key
        ? `(item) => item[${JSON.stringify(eachDir.key.static)}]`
        : this.hole(eachDir.key.hole).code;
      props.push({ name: 'by', kind: 'attr', expr: by });
    }

    const arrow = this.itemArrow(el);
    let childrenCode: string;
    if (arrow) {
      // A body that reads signals, `${(it) => it.label + count()}`, stays live: it is handed
      // back as an accessor for the runtime to bind, as it was inside the repeated element.
      const body = arrow.bodyReactive ? `() => ${paren(arrow.body, 'arrowBody')}` : paren(arrow.body, 'arrowBody');
      childrenCode = `(${arrow.params.join(', ')}) => ${body}`;
    } else {
      const content = this.lowerChildren(el.children);
      const ir: IRNode = content.length === 1 ? content[0]! : { kind: 'fragment', children: content };
      childrenCode = `() => ${paren(this.emit(ir), 'arrowBody')}`;
    }
    const children: IRNode[] = [{ kind: 'expr', code: childrenCode, reactive: false }];
    const at = this.tagAt(el);
    return { kind: 'component', name: 'For', props, children, ...(at ? { at } : {}), ...(each.at ? { bindAt: each.at } : {}) };
  }

  /** The single `${item => expr}` child arrow, if that's the element's content. */
  private itemArrow(el: ElementNode | ComponentNode): TemplateHole['arrow'] | null {
    const kids = el.children.filter((c) => !this.isBlankText(c));
    if (kids.length !== 1 || kids[0].kind !== 'Expression') return null;
    return this.hole(kids[0].hole).arrow ?? null;
  }

  /** Lower an element to IR, dropping the directive attribute matched by `drop`. */
  private stripAndLower(el: ElementNode | ComponentNode, drop: (a: AttributeLikeNode) => boolean): IRNode {
    const clone = { ...el, attributes: el.attributes.filter((a) => !drop(a)) } as ElementNode | ComponentNode;
    return clone.kind === 'Element' ? this.lowerElement(clone) : this.lowerComponent(clone);
  }

  // attributes

  /**
   * `element`: a DOM element, where each class:/style: value that moves is its own accessor.
   * A component gets the object as before, rebuilt whole when any value moves.
   */
  private lowerAttributes(attrs: AttributeLikeNode[], element = false): IRProp[] {
    let anyReactive = false;
    const entry = (name: string, h: { code: string; reactive: boolean; at?: HolePosition }) => {
      anyReactive ||= h.reactive;
      if (!element || !h.reactive) return `${JSON.stringify(name)}: ${h.code}`;
      const accessor = `() => ${paren(h.code, 'arrowBody')}`;
      // Marked like any other binding hole when positions are on.
      return `${JSON.stringify(name)}: ${h.at ? markHole(accessor, h.at.line, h.at.column) : accessor}`;
    };
    const props: IRProp[] = [];
    const classEntries: string[] = [];
    let classAt: HolePosition | undefined;
    const styleEntries: string[] = [];
    let styleAt: HolePosition | undefined;
    const usePairs: string[] = [];

    for (const a of attrs) {
      switch (a.kind) {
        case 'IfDirective':
        case 'EachDirective':
        case 'ElseDirective':
          break; // handled as control-flow at the parent level
        case 'Attribute':
          props.push(this.plainAttr(a));
          break;
        case 'PropertyBinding':
          props.push({
            name: a.name,
            kind: 'prop',
            expr: this.hole(a.hole).code,
            reactive: this.hole(a.hole).reactive,
            ...(this.hole(a.hole).at ? { at: this.hole(a.hole).at } : {}),
          });
          break;
        case 'EventBinding':
          props.push(this.eventProp(a));
          break;
        case 'RefBinding':
          props.push({
            name: 'ref',
            kind: 'ref',
            expr: this.hole(a.hole).code,
            reactive: this.hole(a.hole).reactive,
            // Which variable ends up holding the element, and where it was written.
            ...(this.hole(a.hole).at ? { at: this.hole(a.hole).at } : {}),
          });
          break;
        case 'Spread':
          props.push({ name: '', kind: 'spread', expr: this.hole(a.hole).code });
          break;
        case 'ClassDirective': {
          const h = this.hole(a.hole);
          classEntries.push(entry(a.name, h));
          classAt ??= h.at;
          break;
        }
        case 'StyleDirective': {
          const h = this.hole(a.hole);
          styleEntries.push(entry(a.name, h));
          styleAt ??= h.at;
          break;
        }
        case 'BindDirective':
          props.push(...this.bindProps(a.name, this.hole(a.hole)));
          break;
        case 'UseDirective': {
          // `use=${dir}` → [dir]; `use:name` → [name]; `use:name=${opts}` →
          // [name, () => opts]. `name` is an in-scope identifier (like Solid).
          const dir = a.name ?? (a.hole != null ? this.hole(a.hole).code : null);
          if (!dir) break;
          // parens so an object literal opts isn't read as a block body
          usePairs.push(a.name != null && a.hole != null ? `[${dir}, () => ${paren(this.hole(a.hole).code, 'arrowBody')}]` : `[${dir}]`);
          break;
        }
      }
    }

    // Merge all class:/style: directives into one classList/style prop so they
    // don't collide as duplicate keys in the emitted props object.
    // One prop covers every directive of its kind, so it carries the first hole's
    // position: a real source line beats the stack fallback, which lands in the
    // compiled file.
    if (classEntries.length > 0) {
      props.push({
        name: 'classList',
        kind: 'attr',
        expr: `{ ${classEntries.join(', ')} }`,
        reactive: !element && anyReactive,
        ...(classAt ? { at: classAt } : {}),
      });
    }
    // Each entry that moves is its own accessor, so the runtime updates that key alone.
    if (styleEntries.length > 0) {
      const entries = `{ ${styleEntries.join(', ')} }`;
      // `style=${...}` as well: it goes first, the keys after it, applied in order.
      const base = props.findIndex((p) => p.name === 'style');
      if (base === -1) props.push({ name: 'style', kind: 'attr', expr: entries, reactive: !element && anyReactive, ...(styleAt ? { at: styleAt } : {}) });
      else {
        const prop = props[base]!;
        const value = prop.expr === undefined ? JSON.stringify(prop.literal) : prop.reactive ? `() => ${paren(prop.expr, 'arrowBody')}` : prop.expr;
        props[base] = { name: 'style', kind: 'attr', expr: `[${value}, ${entries}]`, reactive: false, ...(prop.at ? { at: prop.at } : {}) };
      }
    }
    // All use: directives normalize to one `use` prop = an array of [dir, accessor?] pairs.
    if (usePairs.length > 0) {
      props.push({ name: 'use', kind: 'attr', expr: `[${usePairs.join(', ')}]` });
    }
    return props;
  }

  /**
   * Lower an event binding. Plain `@click`/`onClick` (no modifiers) stays a
   * DELEGATED handler (unchanged, byte-identical with JSX). `on:click` or any
   * modifier (`.capture`/`.once`/`.passive`/`.prevent`/`.stop`/`.self`) emits a
   * NATIVE `on:name` prop the runtime attaches via addEventListener.
   */
  private eventProp(a: EventBindingNode): IRProp {
    const dom = a.name.toLowerCase();
    const handler = this.hole(a.hole).code;
    const native = a.syntax === 'colon' || a.modifiers.length > 0;
    if (!native) {
      return {
        name: 'on' + capitalize(a.name),
        kind: 'event',
        event: { name: dom, delegated: DELEGATED_EVENTS.has(dom) },
        expr: handler,
      };
    }
    const wrapped = this.wrapHandler(handler, a.modifiers);
    const options = this.eventOptions(a.modifiers);
    const value = options ? `[${wrapped}, ${options}]` : wrapped;
    return { name: 'on:' + dom, kind: 'attr', expr: value };
  }

  /** Wrap a handler for `.prevent`/`.stop`/`.self` (no wrap when none apply). */
  private wrapHandler(handler: string, mods: string[]): string {
    const guard = mods.includes('self') ? 'if (e.target !== e.currentTarget) return; ' : '';
    const pre: string[] = [];
    if (mods.includes('prevent')) pre.push('e.preventDefault();');
    if (mods.includes('stop')) pre.push('e.stopPropagation();');
    if (!guard && pre.length === 0) return handler;
    return `(e) => { ${guard}${pre.join(' ')} return (${handler})(e); }`;
  }

  /** addEventListener options object from `.capture`/`.once`/`.passive`, or null. */
  private eventOptions(mods: string[]): string | null {
    const opts: string[] = [];
    if (mods.includes('capture')) opts.push('capture: true');
    if (mods.includes('once')) opts.push('once: true');
    if (mods.includes('passive')) opts.push('passive: true');
    return opts.length ? `{ ${opts.join(', ')} }` : null;
  }

  /** `bind:value=${sig}` → `value={read()}` + `onInput={e => write(e...value)}`. */
  private bindProps(prop: string, h: TemplateHole): IRProp[] {
    const sigCode = h.code;
    const checked = prop === 'checked';
    const evt = checked ? 'change' : 'input';
    const accessor = checked ? 'checked' : 'value';
    // Through `bindPair`, so both spellings of a signal work here: the `[get, set]`
    // pair from `createSignal` and the `{ get, set }` object from `signal`.
    // Parenthesized because the expression may be more than an identifier
    // (`[get, set] as const`, `props.model`, a call).
    this.used.add('bindPair');
    const sig = `bindPair(${sigCode})`;
    return [
      {
        name: prop,
        kind: 'attr',
        expr: `${sig}[0]()`,
        reactive: true,
        directive: `bind:${prop}`,
        ...(h.at ? { at: h.at } : {}),
      },
      {
        name: 'on' + capitalize(evt),
        kind: 'event',
        event: { name: evt, delegated: DELEGATED_EVENTS.has(evt) },
        // delegated handler: `target` is the bound element (currentTarget is the root)
        expr: `(e) => ${sig}[1](e.target.${accessor})`,
      },
    ];
  }

  /** A plain attribute (incl. html `?bool`, mixed values), old `mkProp` behavior. */
  private plainAttr(a: AttributeNode): IRProp {
    const v = a.value;
    // `class=${{...}}` (object literal) -> classList (Solid convention), so it
    // doesn't collide with a static `class="box"` (which stays className), both
    // apply. `class` -> className; `style=${{...}}` stays `style` (runtime merges).
    // `html=${x}` is the raw-HTML escape hatch -> innerHTML.
    let name = a.name;
    if (a.name === 'class') {
      name = v && v.kind === 'hole' && this.hole(v.hole).object ? 'classList' : 'className';
    } else if (a.name === 'html') {
      name = 'innerHTML';
    }
    const kind: IRPropKind = 'attr';
    const base: IRProp = { name, kind };
    if (v == null) {
      base.literal = true;
      return base;
    }
    if (v.kind === 'static') {
      base.literal = decodeEntities(v.value);
      return base;
    }
    if (v.kind === 'hole') {
      const h = this.hole(v.hole);
      base.expr = h.code;
      base.reactive = h.reactive;
      if (h.at) base.at = h.at;
      return base;
    }
    // mixed: template literal, reactive if any hole is
    let reactive = false;
    let at: HolePosition | undefined;
    const body = v.parts
      .map((p) => {
        if ('text' in p) return escapeTemplate(decodeEntities(p.text));
        const h = this.hole(p.hole);
        reactive = reactive || h.reactive;
        at ??= h.at;
        return '${' + h.code + '}';
      })
      .join('');
    base.expr = '`' + body + '`';
    base.reactive = reactive;
    if (at) base.at = at;
    return base;
  }
}

/**
 * Lower a parsed template to IR. `pieces` are the static runs and hole slots as
 * the parser wants them; `holes` describes each `${...}` in the same order. `used`
 * collects the runtime symbols the emitted code imports.
 */
export function lowerTemplate(
  pieces: Piece[],
  holes: TemplateHole[],
  used: Set<string>,
  opts: {
    svg?: boolean;
    sourceFile?: string;
    positionAt?: (offset: number) => { line: number; column: number };
    /** Warnings the parser and the accessibility checks raised, for the caller to report. */
    onDiagnostic?: (diagnostic: Diagnostic) => void;
  } = {},
): IRNode {
  const { root, diagnostics } = parseTemplate(pieces, { svg: opts.svg });
  // A template the parser had to repair (an unclosed tag, a stray close) builds into
  // something other than what was written, and the browser runtime throws on the same
  // source: an error, as a JSX syntax error is. Warnings go back to be printed.
  // The parser's diagnostics include its accessibility checks.
  for (const d of diagnostics) {
    if (d.severity === 'error') {
      const at = opts.positionAt?.(d.loc.start);
      throw new Error(`html template${at ? ` (${at.line}:${at.column + 1})` : ''}: ${d.message}`);
    }
    opts.onDiagnostic?.(d);
  }
  return new Lowerer(holes, used, opts.sourceFile, opts.positionAt).lowerRoot(root.children);
}
