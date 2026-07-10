/**
 * Babel front-end (spike): build the host-agnostic IR from a lit-html
 * `` html`...` `` TaggedTemplateExpression — the SAME IR the JSX front-end
 * (`build-ir.ts`) produces, so both authoring styles flow through one compiler
 * and reuse the imperative/jsx backends unchanged.
 *
 * The template's static HTML lives in `quasi.quasis[]` and each `${…}` hole in
 * `quasi.expressions[]`. We stitch the quasis into one HTML string with a sentinel
 * marker at every hole, scan that into an element tree, and classify each hole by
 * where it landed (child text, `attr=${}`, `@event=${}`, `?bool=${}`, `.prop=${}`),
 * mapping it to the matching IR node/prop.
 *
 * SPIKE SCOPE: elements (incl. nested + self-closing), static/dynamic attributes,
 * `@event` bindings, child-position holes, text. Enough to prove the thesis — a
 * lit template and its JSX twin emit byte-identical code. Not yet: spreads,
 * mixed text+hole attribute values, boolean/property parts as reactive, control
 * flow, `<!-- -->`, or full HTML edge cases.
 */
import { types as t } from '@babel/core';
import type { IRNode, IRProp, IRPropKind } from '../../ir/nodes.js';
import { genExpr, isReactiveExpr, cleanJSXText, SVG_TAGS } from './build-ir.js';

const MARK = '\x00'; // control-char sentinels; a hole becomes `\x00<index>\x01`
const MARK_END = '\x01';
const HOLE_RE = /^\x00(\d+)\x01/;

const DELEGATED = new Set([
  'click', 'dblclick', 'input', 'change', 'submit', 'focus', 'blur',
  'keydown', 'keyup', 'keypress', 'mousedown', 'mouseup',
]);

interface Hole {
  code: string;
  reactive: boolean;
  isEvent?: boolean;
}

/** Stitch quasis + holes into one string, holes replaced by `i`. */
function stitch(quasi: t.TemplateLiteral): string {
  let s = '';
  quasi.quasis.forEach((q, i) => {
    s += q.value.cooked ?? q.value.raw;
    if (i < quasi.expressions.length) s += MARK + i + MARK_END;
  });
  return s;
}

/** Recursive-descent scan of the stitched HTML string into IR. */
class Scanner {
  private pos = 0;
  constructor(private src: string, private holes: Hole[]) {}

  private peek(): string {
    return this.src[this.pos];
  }
  private startsWith(str: string): boolean {
    return this.src.startsWith(str, this.pos);
  }
  private holeAt(): { index: number; length: number } | null {
    const m = HOLE_RE.exec(this.src.slice(this.pos));
    return m ? { index: Number(m[1]), length: m[0].length } : null;
  }
  private skipWs(): void {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) this.pos++;
  }

  /** Parse sibling nodes until EOF or the parent's `</` close tag. */
  parseNodes(): IRNode[] {
    const out: IRNode[] = [];
    while (this.pos < this.src.length) {
      if (this.startsWith('</')) break; // parent close — caller consumes it
      if (this.peek() === '<') {
        out.push(this.parseElement());
        continue;
      }
      const hole = this.holeAt();
      if (hole) {
        this.pos += hole.length;
        const h = this.holes[hole.index];
        out.push({ kind: 'expr', code: h.code, reactive: h.reactive });
        continue;
      }
      // text run up to the next `<` or hole marker
      let text = '';
      while (this.pos < this.src.length && this.peek() !== '<' && !this.startsWith(MARK)) {
        text += this.src[this.pos++];
      }
      const cleaned = cleanJSXText(text);
      if (cleaned) out.push({ kind: 'text', value: cleaned });
    }
    return out;
  }

  private parseElement(): IRNode {
    this.pos++; // consume '<'
    const tag = this.readName();
    const props = this.parseAttributes();
    this.skipWs();

    if (this.startsWith('/>')) {
      this.pos += 2;
      return { kind: 'element', tag, svg: SVG_TAGS.has(tag), props, children: [], static: false };
    }
    this.pos++; // consume '>'
    const children = this.parseNodes();
    if (this.startsWith('</')) {
      this.pos += 2;
      this.readName();
      this.skipWs();
      if (this.peek() === '>') this.pos++;
    }
    return { kind: 'element', tag, svg: SVG_TAGS.has(tag), props, children, static: false };
  }

  private readName(): string {
    let name = '';
    while (this.pos < this.src.length && /[A-Za-z0-9\-_:@.?]/.test(this.peek())) {
      name += this.src[this.pos++];
    }
    return name;
  }

  private parseAttributes(): IRProp[] {
    const props: IRProp[] = [];
    while (this.pos < this.src.length) {
      this.skipWs();
      const c = this.peek();
      if (c === '>' || this.startsWith('/>')) break;
      const rawName = this.readName();
      if (!rawName) {
        this.pos++; // guard against stalls on stray chars
        continue;
      }
      this.skipWs();
      if (this.peek() === '=') {
        this.pos++; // consume '='
        this.skipWs();
        props.push(this.parseAttrValue(rawName));
      } else {
        props.push(this.mkProp(rawName, { literal: true }));
      }
    }
    return props;
  }

  private parseAttrValue(rawName: string): IRProp {
    const hole = this.holeAt();
    if (hole) {
      this.pos += hole.length;
      const h = this.holes[hole.index];
      return this.mkProp(rawName, { hole: h });
    }
    const quote = this.peek();
    if (quote === '"' || quote === "'") {
      this.pos++; // open quote
      let val = '';
      while (this.pos < this.src.length && this.peek() !== quote) val += this.src[this.pos++];
      this.pos++; // close quote
      return this.mkProp(rawName, { literal: val });
    }
    // unquoted literal
    let val = '';
    while (this.pos < this.src.length && !/[\s>]/.test(this.peek())) val += this.src[this.pos++];
    return this.mkProp(rawName, { literal: val });
  }

  /** Map a lit attribute name + value to an IRProp identical to the JSX path. */
  private mkProp(rawName: string, v: { literal?: string | boolean; hole?: Hole }): IRProp {
    // lit binding prefixes: @event, ?boolean, .property
    if (rawName[0] === '@') {
      const evt = rawName.slice(1).toLowerCase();
      const name = 'on' + evt.charAt(0).toUpperCase() + evt.slice(1);
      const base: IRProp = {
        name,
        kind: 'event',
        event: { name: evt, delegated: DELEGATED.has(evt) },
      };
      if (v.hole) base.expr = v.hole.code; // events are never reactive-wrapped
      return base;
    }

    let name = rawName;
    let kind: IRPropKind = 'attr';
    if (rawName[0] === '?') name = rawName.slice(1);
    else if (rawName[0] === '.') {
      name = rawName.slice(1);
      kind = 'prop';
    }
    if (name === 'class') name = 'className';

    const base: IRProp = { name, kind };
    if (v.hole) {
      base.expr = v.hole.code;
      base.reactive = v.hole.reactive;
    } else {
      base.literal = v.literal as string | boolean;
    }
    return base;
  }
}

/**
 * Build IR from a lit `` html`...` `` TaggedTemplateExpression. `used` collects
 * runtime symbols emitted for any JSX nested inside a hole expression.
 */
export function buildIRFromLit(
  node: t.TaggedTemplateExpression,
  used: Set<string> = new Set(),
): IRNode {
  const quasi = node.quasi;
  const holes: Hole[] = quasi.expressions.map((e) => {
    const expr = e as t.Expression;
    return { code: genExpr(expr, used), reactive: isReactiveExpr(expr) };
  });

  const scanner = new Scanner(stitch(quasi), holes);
  const nodes = scanner.parseNodes();
  if (nodes.length === 1) return nodes[0];
  return { kind: 'fragment', children: nodes };
}
