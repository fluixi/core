/**
 * Lower a parsed Template AST (`@fluixi/template-parser`) into the compiler's
 * host-agnostic IR. This is the Babel-aware half the parser deliberately is not:
 * it binds each opaque hole slot to its Babel `${…}` expression (via `genExpr`,
 * which also compiles any JSX/`` html`` `` nested inside the hole) and reproduces
 * the exact IR the old single-pass `build-ir-lit` scanner produced — the byte-
 * identity gate — while adding the new directive lowerings on top.
 *
 * Pipeline:  pieces → parseTemplate → Template AST → lowerTemplate → IRNode
 */
import { types as t } from '@babel/core';
import _generate from '@babel/generator';
import {
  type AttributeLikeNode,
  type AttributeNode,
  type ComponentNode,
  type EventBindingNode,
  type ElementNode,
  type Piece,
  type TemplateNode,
  parseTemplate,
} from '@fluixi/template-parser';
import type { IRNode, IRProp, IRPropKind } from '../../ir/nodes.js';
import { imperativeBackend } from '../../codegen/backends/imperative.js';
import { cleanJSXText, genExpr, isReactiveExpr } from './build-ir.js';

const generate: any = (_generate as any).default ?? (_generate as any);
function gen(node: t.Node): string {
  return generate(node as any, { concise: true }).code;
}

const DELEGATED = new Set([
  'click', 'dblclick', 'input', 'change', 'submit', 'focus', 'blur',
  'keydown', 'keyup', 'keypress', 'mousedown', 'mouseup',
]);

/** A hole slot resolved to its Babel expression + reactivity + code. */
interface BoundHole {
  node: t.Expression;
  code: string;
  reactive: boolean;
}

/** Escape a static text run for embedding in a template literal. */
function escapeTemplate(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

class Lowerer {
  constructor(private holes: BoundHole[], private used: Set<string>) {}

  private hole(i: number): BoundHole {
    // -1 marks a recovered-from missing binding; emit a harmless undefined.
    return this.holes[i] ?? { node: t.identifier('undefined'), code: 'undefined', reactive: false };
  }

  /** Emit a nested IR subtree to code (for `Show` fallback / `For` children). */
  private emit(node: IRNode): string {
    const { code, imports } = imperativeBackend.emit(node, {} as any);
    for (const s of imports) this.used.add(s);
    return code;
  }

  // --- content ------------------------------------------------------------

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
        if (child.attributes.some((a) => a.kind === 'EachDirective')) {
          out.push(this.lowerEach(child));
          continue;
        }
      }

      const node = this.lowerNode(child);
      if (node) out.push(node);
    }
    return out;
  }

  private isBlankText(n: TemplateNode): boolean {
    return n.kind === 'Text' && !n.raw && cleanJSXText(n.value) === '';
  }

  private lowerNode(node: TemplateNode): IRNode | null {
    switch (node.kind) {
      case 'Text': {
        if (node.raw) return { kind: 'text', value: node.value };
        const cleaned = cleanJSXText(node.value);
        return cleaned ? { kind: 'text', value: cleaned } : null;
      }
      case 'Comment':
        return null; // dropped, like JSX comments
      case 'Expression': {
        const h = this.hole(node.hole);
        return { kind: 'expr', code: h.code, reactive: h.reactive };
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
    return {
      kind: 'element',
      tag: el.tag,
      svg: el.namespace === 'svg',
      props: this.lowerAttributes(el.attributes),
      children: this.lowerChildren(el.children),
      static: false,
    };
  }

  private lowerComponent(el: ComponentNode): IRNode {
    // `<${Comp} />`: the tag is an interpolated expression — use the hole's code
    // as the component identity, so `createComponent(<expr>, …)` is emitted.
    const name = el.tagHole != null ? this.hole(el.tagHole).code : el.tag;
    return {
      kind: 'component',
      name,
      props: this.lowerAttributes(el.attributes),
      children: this.lowerChildren(el.children),
    };
  }

  // --- control-flow sugar -------------------------------------------------

  /** `<el if=${cond}>…</el>` (+ optional `<el else>`) → `<Show when fallback>`. */
  private lowerIf(el: ElementNode | ComponentNode, condHole: number, elseEl: ElementNode | ComponentNode | null): IRNode {
    const cond = this.hole(condHole);
    const props: IRProp[] = [
      { name: 'when', kind: 'attr', expr: cond.code, reactive: cond.reactive },
    ];
    if (elseEl) {
      const elseIR = this.stripAndLower(elseEl, (a) => a.kind === 'ElseDirective');
      props.push({ name: 'fallback', kind: 'attr', expr: this.emit(elseIR), jsxElement: true });
    }
    const child = this.stripAndLower(el, (a) => a.kind === 'IfDirective');
    return { kind: 'component', name: 'Show', props, children: [child] };
  }

  /** `<el each=${items} key?>${item => …}</el>` → `<For each>{item => <el>…</el>}</For>`. */
  private lowerEach(el: ElementNode | ComponentNode): IRNode {
    const eachDir = el.attributes.find((a) => a.kind === 'EachDirective');
    if (!eachDir || eachDir.kind !== 'EachDirective') return this.lowerNode(el)!;
    const each = this.hole(eachDir.hole);

    const props: IRProp[] = [{ name: 'each', kind: 'attr', expr: each.code, reactive: each.reactive }];
    if (eachDir.key) {
      // `<For by>` wants a KEY FUNCTION, not a string. `key="id"` selects the
      // `id` field: `(item) => item["id"]`; `key=${fn}` passes the function.
      const by = 'static' in eachDir.key
        ? `(item) => item[${JSON.stringify(eachDir.key.static)}]`
        : this.hole(eachDir.key.hole).code;
      props.push({ name: 'by', kind: 'attr', expr: by });
    }

    // The element minus its each/key, repeated per item.
    const arrow = this.itemArrow(el);
    let childrenCode: string;
    if (arrow) {
      const bodyExpr = arrow.body as t.Expression;
      const bodyIR: IRNode = { kind: 'expr', code: genExpr(bodyExpr, this.used), reactive: isReactiveExpr(bodyExpr) };
      const repeated = this.rebuildWithChildren(el, [bodyIR]);
      childrenCode = `(${arrow.params.map((p) => gen(p)).join(', ')}) => (${this.emit(repeated)})`;
    } else {
      const repeated = this.stripAndLower(el, (a) => a.kind === 'EachDirective');
      childrenCode = `() => (${this.emit(repeated)})`;
    }
    const children: IRNode[] = [{ kind: 'expr', code: childrenCode, reactive: false }];
    return { kind: 'component', name: 'For', props, children };
  }

  /** The single `${item => expr}` child arrow, if that's the element's content. */
  private itemArrow(el: ElementNode | ComponentNode): t.ArrowFunctionExpression | null {
    const kids = el.children.filter((c) => !this.isBlankText(c));
    if (kids.length !== 1 || kids[0].kind !== 'Expression') return null;
    const node = this.hole(kids[0].hole).node;
    if (t.isArrowFunctionExpression(node) && !t.isBlockStatement(node.body)) return node;
    return null;
  }

  /** Lower an element to IR, dropping the directive attribute matched by `drop`. */
  private stripAndLower(el: ElementNode | ComponentNode, drop: (a: AttributeLikeNode) => boolean): IRNode {
    const clone = { ...el, attributes: el.attributes.filter((a) => !drop(a)) } as ElementNode | ComponentNode;
    return clone.kind === 'Element' ? this.lowerElement(clone) : this.lowerComponent(clone);
  }

  /** Same element (minus each/key) but with explicit IR children. */
  private rebuildWithChildren(el: ElementNode | ComponentNode, children: IRNode[]): IRNode {
    const props = this.lowerAttributes(
      el.attributes.filter((a) => a.kind !== 'EachDirective'),
    );
    if (el.kind === 'Element') {
      return { kind: 'element', tag: el.tag, svg: el.namespace === 'svg', props, children, static: false };
    }
    return { kind: 'component', name: el.tag, props, children };
  }

  // --- attributes ---------------------------------------------------------

  private lowerAttributes(attrs: AttributeLikeNode[]): IRProp[] {
    const props: IRProp[] = [];
    const classEntries: string[] = [];
    let classReactive = false;
    const styleEntries: string[] = [];
    let styleReactive = false;
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
          props.push({ name: a.name, kind: 'prop', expr: this.hole(a.hole).code, reactive: this.hole(a.hole).reactive });
          break;
        case 'EventBinding':
          props.push(this.eventProp(a));
          break;
        case 'RefBinding':
          props.push({ name: 'ref', kind: 'ref', expr: this.hole(a.hole).code, reactive: this.hole(a.hole).reactive });
          break;
        case 'Spread':
          props.push({ name: '', kind: 'spread', expr: this.hole(a.hole).code });
          break;
        case 'ClassDirective': {
          const h = this.hole(a.hole);
          classEntries.push(`${JSON.stringify(a.name)}: ${h.code}`);
          classReactive = classReactive || h.reactive;
          break;
        }
        case 'StyleDirective': {
          const h = this.hole(a.hole);
          styleEntries.push(`${JSON.stringify(a.name)}: ${h.code}`);
          styleReactive = styleReactive || h.reactive;
          break;
        }
        case 'BindDirective':
          props.push(...this.bindProps(a.name, this.hole(a.hole).code));
          break;
        case 'UseDirective': {
          // `use=${dir}` → [dir]; `use:name` → [name]; `use:name=${opts}` →
          // [name, () => opts]. `name` is an in-scope identifier (like Solid).
          const dir = a.name ?? (a.hole != null ? this.hole(a.hole).code : null);
          if (!dir) break;
          usePairs.push(a.name != null && a.hole != null ? `[${dir}, () => ${this.hole(a.hole).code}]` : `[${dir}]`);
          break;
        }
      }
    }

    // Merge all class:/style: directives into one classList/style prop so they
    // don't collide as duplicate keys in the emitted props object.
    if (classEntries.length > 0) {
      props.push({ name: 'classList', kind: 'attr', expr: `{ ${classEntries.join(', ')} }`, reactive: classReactive });
    }
    if (styleEntries.length > 0) {
      props.push({ name: 'style', kind: 'attr', expr: `{ ${styleEntries.join(', ')} }`, reactive: styleReactive });
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
        event: { name: dom, delegated: DELEGATED.has(dom) },
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

  /** `bind:value=${sig}` → `value={sig[0]()}` + `onInput={e => sig[1](e…value)}`. */
  private bindProps(prop: string, sigCode: string): IRProp[] {
    const checked = prop === 'checked';
    const evt = checked ? 'change' : 'input';
    const accessor = checked ? 'checked' : 'value';
    // Parenthesize the signal expression — it may be more than an identifier
    // (`[get, set] as const`, `props.model`, a call), and `expr[0]()` would then
    // mis-parse (e.g. `[...] as const[0]`).
    const sig = `(${sigCode})`;
    return [
      { name: prop, kind: 'attr', expr: `${sig}[0]()`, reactive: true },
      {
        name: 'on' + capitalize(evt),
        kind: 'event',
        event: { name: evt, delegated: DELEGATED.has(evt) },
        // delegated handler: `target` is the bound element (currentTarget is the root)
        expr: `(e) => ${sig}[1](e.target.${accessor})`,
      },
    ];
  }

  /** A plain attribute (incl. lit `?bool`, mixed values) — old `mkProp` behavior. */
  private plainAttr(a: AttributeNode): IRProp {
    const v = a.value;
    // `class=${{...}}` (object literal) -> classList (Solid convention), so it
    // doesn't collide with a static `class="box"` (which stays className) — both
    // apply. `class` -> className; `style=${{...}}` stays `style` (runtime merges).
    // `html=${x}` is the raw-HTML escape hatch -> innerHTML.
    let name = a.name;
    if (a.name === 'class') {
      name = v && v.kind === 'hole' && t.isObjectExpression(this.hole(v.hole).node) ? 'classList' : 'className';
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
      base.literal = v.value;
      return base;
    }
    if (v.kind === 'hole') {
      const h = this.hole(v.hole);
      base.expr = h.code;
      base.reactive = h.reactive;
      return base;
    }
    // mixed: template literal, reactive if any hole is
    let reactive = false;
    const body = v.parts
      .map((p) => {
        if ('text' in p) return escapeTemplate(p.text);
        const h = this.hole(p.hole);
        reactive = reactive || h.reactive;
        return '${' + h.code + '}';
      })
      .join('');
    base.expr = '`' + body + '`';
    base.reactive = reactive;
    return base;
  }
}

/**
 * Build IR from a lit `` html`...` `` / `` svg`...` `` TaggedTemplateExpression.
 * Parses (Babel-free) then lowers (Babel-aware) — a drop-in for the old
 * single-pass scanner, with the same signature.
 */
export function lowerLitTemplate(
  node: t.TaggedTemplateExpression,
  used: Set<string>,
  opts: { svg?: boolean } = {},
): IRNode {
  const quasi = node.quasi;
  const holes: BoundHole[] = quasi.expressions.map((e) => {
    const expr = e as t.Expression;
    return { node: expr, code: genExpr(expr, used), reactive: isReactiveExpr(expr) };
  });

  const pieces = buildPieces(quasi);
  const { root } = parseTemplate(pieces, { svg: opts.svg });
  return new Lowerer(holes, used).lowerRoot(root.children);
}

/** Turn a Babel TemplateLiteral into position-carrying parser pieces. */
function buildPieces(quasi: t.TemplateLiteral): Piece[] {
  const pieces: Piece[] = [];
  quasi.quasis.forEach((q, i) => {
    const text = q.value.cooked ?? q.value.raw;
    pieces.push({ kind: 'static', text, start: q.start ?? 0 });
    if (i < quasi.expressions.length) {
      const e = quasi.expressions[i];
      pieces.push({ kind: 'hole', index: i, start: e.start ?? 0, end: e.end ?? 0 });
    }
  });
  return pieces;
}
