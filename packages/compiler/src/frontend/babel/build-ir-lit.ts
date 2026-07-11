/**
 * Babel front-end: build the host-agnostic IR from a lit-html `` html`...` ``
 * TaggedTemplateExpression — the SAME IR the JSX front-end (`build-ir.ts`)
 * produces, so both authoring styles run through one compiler and share the
 * imperative/jsx backends unchanged.
 *
 * The template's static HTML lives in `quasi.quasis[]`, each `${…}` hole in
 * `quasi.expressions[]`. We stitch the quasis into one string with a sentinel
 * at every hole, recursive-descent scan that into an element tree, and classify
 * each hole by where it landed:
 *   - child position          -> expr node
 *   - `name=${}` / `name="${}"`-> attr/prop/bool prop
 *   - `@event=${}`            -> event
 *   - bare `${}` in a tag     -> spread
 * A quoted value mixing static text and holes (class="a ${x}") becomes a
 * template-literal expr, matching the JSX twin that uses a template literal.
 *
 * A lit template and its JSX twin emit byte-identical code — that's the thesis.
 * Capitalized tags are components (so `<Show>`/`<For>` control flow works inside
 * `html``), raw-text elements (`script`/`style`/`textarea`/`title`) keep their
 * content verbatim, and HTML comments are dropped like JSX comments.
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

// elements whose content is text, not markup — don't descend into `<` inside them
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title']);

interface Hole {
  code: string;
  reactive: boolean;
}

/** Stitch quasis + holes into one string, holes replaced by the index sentinel. */
function stitch(quasi: t.TemplateLiteral): string {
  let s = '';
  quasi.quasis.forEach((q, i) => {
    s += q.value.cooked ?? q.value.raw;
    if (i < quasi.expressions.length) s += MARK + i + MARK_END;
  });
  return s;
}

/** A tag is a component when capitalized or a member path (`Ctx.Provider`). */
function isComponentTag(tag: string): boolean {
  return tag[0] !== tag[0].toLowerCase() || tag.includes('.');
}

/** Escape a static text run for embedding in a template literal. */
function escapeTemplate(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

/** One piece of a quoted attribute value: literal text or a hole. */
type ValuePart = { text: string } | { hole: number };

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
  private isTagStart(): boolean {
    // `<` opens an element only when a name char follows; a bare `<` is text.
    return this.peek() === '<' && /[A-Za-z]/.test(this.src[this.pos + 1] ?? '');
  }

  /** Parse sibling nodes until EOF or the parent's `</` close tag. */
  parseNodes(): IRNode[] {
    const out: IRNode[] = [];
    while (this.pos < this.src.length) {
      if (this.startsWith('</')) break; // parent close — caller consumes it
      if (this.startsWith('<!--')) {
        this.skipComment();
        continue;
      }
      if (this.isTagStart()) {
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
      // text run up to the next tag/comment/hole
      let text = '';
      while (
        this.pos < this.src.length &&
        !this.isTagStart() &&
        !this.startsWith('</') &&
        !this.startsWith('<!--') &&
        !this.startsWith(MARK)
      ) {
        text += this.src[this.pos++];
      }
      const cleaned = cleanJSXText(text);
      if (cleaned) out.push({ kind: 'text', value: cleaned });
    }
    return out;
  }

  private skipComment(): void {
    this.pos += 4; // '<!--'
    const end = this.src.indexOf('-->', this.pos);
    this.pos = end === -1 ? this.src.length : end + 3;
  }

  private parseElement(): IRNode {
    this.pos++; // consume '<'
    const tag = this.readName();
    const props = this.parseAttributes();
    this.skipWs();

    const component = isComponentTag(tag);
    if (this.startsWith('/>')) {
      this.pos += 2;
      return this.mkElement(tag, component, props, []);
    }
    this.pos++; // consume '>'

    const children = RAW_TEXT.has(tag.toLowerCase())
      ? this.parseRawText(tag)
      : this.parseNodes();

    if (this.startsWith('</')) {
      this.pos += 2;
      this.readName();
      this.skipWs();
      if (this.peek() === '>') this.pos++;
    }
    return this.mkElement(tag, component, props, children);
  }

  private mkElement(tag: string, component: boolean, props: IRProp[], children: IRNode[]): IRNode {
    if (component) return { kind: 'component', name: tag, props, children };
    return { kind: 'element', tag, svg: SVG_TAGS.has(tag), props, children, static: false };
  }

  /** Read a raw-text element body (only holes break the text run). */
  private parseRawText(tag: string): IRNode[] {
    const out: IRNode[] = [];
    const close = '</' + tag;
    let text = '';
    const flush = () => {
      if (text) out.push({ kind: 'text', value: text });
      text = '';
    };
    while (this.pos < this.src.length) {
      if (this.src.slice(this.pos, this.pos + close.length).toLowerCase() === close.toLowerCase()) {
        break;
      }
      const hole = this.holeAt();
      if (hole) {
        flush();
        this.pos += hole.length;
        const h = this.holes[hole.index];
        out.push({ kind: 'expr', code: h.code, reactive: h.reactive });
        continue;
      }
      text += this.src[this.pos++];
    }
    flush();
    return out;
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

      // bare `${obj}` in tag position is a spread
      const spread = this.holeAt();
      if (spread) {
        this.pos += spread.length;
        props.push({ name: '', kind: 'spread', expr: this.holes[spread.index].code });
        continue;
      }

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
    // unquoted single hole: `value=${x}`
    const hole = this.holeAt();
    if (hole) {
      this.pos += hole.length;
      return this.mkPropFromHole(rawName, this.holes[hole.index]);
    }
    const quote = this.peek();
    if (quote === '"' || quote === "'") {
      return this.mkPropFromParts(rawName, this.readQuotedParts(quote));
    }
    // unquoted literal
    let val = '';
    while (this.pos < this.src.length && !/[\s>]/.test(this.peek())) val += this.src[this.pos++];
    return this.mkProp(rawName, { literal: val });
  }

  /** Split a quoted value into static-text and hole parts. */
  private readQuotedParts(quote: string): ValuePart[] {
    this.pos++; // open quote
    const parts: ValuePart[] = [];
    let text = '';
    while (this.pos < this.src.length && this.peek() !== quote) {
      const hole = this.holeAt();
      if (hole) {
        if (text) { parts.push({ text }); text = ''; }
        parts.push({ hole: hole.index });
        this.pos += hole.length;
        continue;
      }
      text += this.src[this.pos++];
    }
    if (text) parts.push({ text });
    this.pos++; // close quote
    return parts;
  }

  private mkPropFromParts(rawName: string, parts: ValuePart[]): IRProp {
    const holes = parts.filter((p): p is { hole: number } => 'hole' in p);
    if (holes.length === 0) {
      const literal = parts.map((p) => ('text' in p ? p.text : '')).join('');
      return this.mkProp(rawName, { literal });
    }
    // single hole, no surrounding text: `value="${x}"` === `value=${x}`
    if (parts.length === 1) {
      return this.mkPropFromHole(rawName, this.holes[holes[0].hole]);
    }
    // mixed text + holes -> a template literal, reactive if any hole is
    const body = parts
      .map((p) => ('text' in p ? escapeTemplate(p.text) : '${' + this.holes[p.hole].code + '}'))
      .join('');
    const reactive = holes.some((h) => this.holes[h.hole].reactive);
    return this.mkProp(rawName, { expr: '`' + body + '`', reactive });
  }

  private mkPropFromHole(rawName: string, h: Hole): IRProp {
    return this.mkProp(rawName, { expr: h.code, reactive: h.reactive, isHole: true });
  }

  /** Map a lit attribute name + value to an IRProp identical to the JSX path. */
  private mkProp(
    rawName: string,
    v: { literal?: string | boolean; expr?: string; reactive?: boolean; isHole?: boolean },
  ): IRProp {
    // lit binding prefixes: @event, ?boolean, .property
    if (rawName[0] === '@') {
      const evt = rawName.slice(1).toLowerCase();
      const name = 'on' + evt.charAt(0).toUpperCase() + evt.slice(1);
      const base: IRProp = {
        name,
        kind: 'event',
        event: { name: evt, delegated: DELEGATED.has(evt) },
      };
      if (v.expr !== undefined) base.expr = v.expr; // events are never reactive-wrapped
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
    if (v.expr !== undefined) {
      base.expr = v.expr;
      base.reactive = v.reactive ?? false;
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
