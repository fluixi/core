/**
 * Virtual-document type support for html`` templates.
 *
 * TypeScript can't infer or type-check the JavaScript inside an html`` template
 * because the template is one opaque string. We give it real support the way
 * Volar / ts-lit-plugin do: transform the source file into a VIRTUAL version
 * where every `` html`...` `` is replaced by typed helper calls that embed each
 * `${…}` hole VERBATIM in a context that produces the right contextual type —
 *
 *   html`<li each=${items}>${(it) => it.label}</li>`
 *     → (__fxEach(items, (it) => it.label), undefined as any)
 *
 * `__fxEach<T>(items: T[], render: (item: T) => any)` makes TS infer `it: T`
 * from `items`, type-check `it.label`, and report real errors — all on the
 * user's own expressions, which are copied byte-for-byte. A second language
 * service runs over the virtual text; a position {@link Mapper} translates
 * requests and results between the real and virtual documents.
 */
import type * as TS from 'typescript';
import { parseTemplate, type TemplateNode } from '@fluixi/template-parser';
import { templatePieces } from './pieces.js';

/** DOM event name → the `HTMLElementEventMap` key used to type the handler arg. */
const EVENT_MAP_KEYS = new Set(Object.keys({
  click: 0, dblclick: 0, mousedown: 0, mouseup: 0, mousemove: 0, mouseenter: 0, mouseleave: 0,
  mouseover: 0, mouseout: 0, contextmenu: 0, keydown: 0, keyup: 0, keypress: 0, input: 0,
  beforeinput: 0, change: 0, submit: 0, focus: 0, blur: 0, focusin: 0, focusout: 0,
  pointerdown: 0, pointerup: 0, pointermove: 0, pointerenter: 0, pointerleave: 0, wheel: 0,
  scroll: 0, drag: 0, drop: 0, touchstart: 0, touchend: 0, touchmove: 0, animationend: 0,
  transitionend: 0,
}));

/** Typed helpers the virtual document calls. Declared once at the top. */
const PRELUDE =
  'declare const __fxEach: <T>(items: ArrayLike<T> | Iterable<T> | null | undefined, render: (item: T, index: () => number) => any) => any;\n' +
  'declare const __fxIndex: <T>(items: ArrayLike<T> | Iterable<T> | null | undefined, render: (item: () => T, index: number) => any) => any;\n' +
  'declare const __fxShow: <T>(when: T, render: (value: NonNullable<T>) => any) => any;\n' +
  'declare const __fxOn: <K extends string>(name: K, handler: (event: K extends keyof HTMLElementEventMap ? HTMLElementEventMap[K] : Event) => any) => any;\n' +
  'declare const __fxExpr: (value: any) => any;\n';

/** A region that maps 1:1 between source and virtual (unchanged code, or a hole). */
export interface Segment {
  srcStart: number;
  srcEnd: number;
  genStart: number;
  genEnd: number;
  /** True for an embedded `${…}` hole (vs. copied unchanged code). */
  hole?: boolean;
}

/** True when a source offset lies inside an embedded template hole. */
export function inHole(segments: readonly Segment[], pos: number): boolean {
  return segments.some((s) => s.hole && pos >= s.srcStart && pos <= s.srcEnd);
}

export interface Virtual {
  text: string;
  segments: Segment[];
}

/** Map a source offset to the virtual offset, or -1 if it isn't in a mapped region. */
export function toGenerated(segments: readonly Segment[], pos: number): number {
  for (const s of segments) {
    if (pos >= s.srcStart && pos <= s.srcEnd) return s.genStart + (pos - s.srcStart);
  }
  return -1;
}

/** Map a virtual offset back to the source offset, or -1 if it's generated scaffolding. */
export function toSource(segments: readonly Segment[], pos: number): number {
  for (const s of segments) {
    if (pos >= s.genStart && pos <= s.genEnd) return s.srcStart + (pos - s.genStart);
  }
  return -1;
}

/**
 * Build the virtual document for a source file, or undefined when it has no
 * html`` templates (so the plugin can skip the whole machinery).
 */
export function buildVirtual(ts: typeof TS, sf: TS.SourceFile): Virtual | undefined {
  const templates = collectTemplates(ts, sf);
  if (templates.length === 0) return undefined;

  const srcText = sf.text;
  const segments: Segment[] = [];
  let gen = '';
  let src = 0;

  // copy unchanged source [src, to) into the virtual doc, recording the mapping
  const copy = (to: number): void => {
    if (to <= src) return;
    const genStart = gen.length;
    gen += srcText.slice(src, to);
    segments.push({ srcStart: src, srcEnd: to, genStart, genEnd: gen.length });
    src = to;
  };

  gen += PRELUDE;

  for (const tpl of templates) {
    copy(tpl.node.getStart(sf));
    // Replace the whole `html`...`` expression with the typed helper block.
    gen = emitTemplate(ts, sf, tpl, gen, segments, srcText);
    src = tpl.node.getEnd();
  }
  copy(srcText.length);

  return { text: gen, segments };
}

interface TemplateInfo {
  node: TS.TaggedTemplateExpression;
  holes: TS.Expression[];
}

function collectTemplates(ts: typeof TS, sf: TS.SourceFile): TemplateInfo[] {
  const out: TemplateInfo[] = [];
  const visit = (node: TS.Node): void => {
    if (
      ts.isTaggedTemplateExpression(node) &&
      ts.isIdentifier(node.tag) &&
      (node.tag.text === 'html' || node.tag.text === 'svg')
    ) {
      const tpl = node.template;
      const holes = ts.isTemplateExpression(tpl) ? tpl.templateSpans.map((s) => s.expression) : [];
      out.push({ node, holes });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** Roles that give a hole a contextual type. */
type Role =
  | { kind: 'eachRender'; arrayHole: number }
  | { kind: 'indexRender'; arrayHole: number }
  | { kind: 'showRender'; whenHole: number }
  | { kind: 'event'; event: string };

/** Walk the parsed AST → per-hole role, and which holes are "consumed" as partners. */
function analyze(nodes: readonly TemplateNode[], roles: Map<number, Role>, consumed: Set<number>): void {
  const renderChild = (node: TemplateNode): number | undefined => {
    if (!('children' in node) || !node.children) return undefined;
    const expr = node.children.find((c) => c.kind === 'Expression');
    return expr && expr.kind === 'Expression' ? expr.hole : undefined;
  };
  for (const node of nodes) {
    if (node.kind === 'Element' || node.kind === 'Component') {
      for (const a of node.attributes) {
        if (a.kind === 'EventBinding') roles.set(a.hole, { kind: 'event', event: a.name.toLowerCase() });
      }
      const eachDir = node.attributes.find((a) => a.kind === 'EachDirective');
      const propHole = (name: string): number | undefined => {
        const a = node.attributes.find(
          (x) => x.kind === 'Attribute' && x.name === name && x.value != null && x.value.kind === 'hole',
        );
        return a && a.kind === 'Attribute' && a.value && a.value.kind === 'hole' ? a.value.hole : undefined;
      };
      const wire = (arrayHole: number, kind: 'eachRender' | 'indexRender') => {
        const r = renderChild(node);
        if (r !== undefined) { roles.set(r, { kind, arrayHole }); consumed.add(arrayHole); }
      };
      if (eachDir && eachDir.kind === 'EachDirective') wire(eachDir.hole, 'eachRender');
      else if (node.kind === 'Component' && node.tag === 'For') { const h = propHole('each'); if (h !== undefined) wire(h, 'eachRender'); }
      else if (node.kind === 'Component' && node.tag === 'Index') { const h = propHole('each'); if (h !== undefined) wire(h, 'indexRender'); }
      else if (node.kind === 'Component' && node.tag === 'Show') {
        const w = propHole('when');
        const r = renderChild(node);
        if (w !== undefined && r !== undefined) { roles.set(r, { kind: 'showRender', whenHole: w }); consumed.add(w); }
      }
    }
    if ('children' in node && node.children) analyze(node.children, roles, consumed);
  }
}

/** Emit the typed helper block for one template; returns the new `gen`. */
function emitTemplate(
  ts: typeof TS,
  sf: TS.SourceFile,
  tpl: TemplateInfo,
  gen: string,
  segments: Segment[],
  srcText: string,
): string {
  const roles = new Map<number, Role>();
  const consumed = new Set<number>();
  const { root } = parseTemplate(templatePieces(ts, tpl.node.template, sf));
  analyze(root.children, roles, consumed);

  const holeSrc = (i: number): [number, number] => [tpl.holes[i].getStart(sf), tpl.holes[i].getEnd()];

  // append a hole's verbatim source, recording its mapping
  const putHole = (i: number): void => {
    const [s, e] = holeSrc(i);
    const genStart = gen.length;
    gen += srcText.slice(s, e);
    segments.push({ srcStart: s, srcEnd: e, genStart, genEnd: gen.length, hole: true });
  };

  const calls: Array<() => void> = [];
  for (let i = 0; i < tpl.holes.length; i++) {
    if (consumed.has(i)) continue;
    const role = roles.get(i);
    if (role && role.kind === 'eachRender') {
      calls.push(() => { gen += '__fxEach('; putHole(role.arrayHole); gen += ', '; putHole(i); gen += ')'; });
    } else if (role && role.kind === 'indexRender') {
      calls.push(() => { gen += '__fxIndex('; putHole(role.arrayHole); gen += ', '; putHole(i); gen += ')'; });
    } else if (role && role.kind === 'showRender') {
      calls.push(() => { gen += '__fxShow('; putHole(role.whenHole); gen += ', '; putHole(i); gen += ')'; });
    } else if (role && role.kind === 'event') {
      const key = EVENT_MAP_KEYS.has(role.event) ? role.event : role.event;
      calls.push(() => { gen += `__fxOn(${JSON.stringify(key)}, `; putHole(i); gen += ')'; });
    } else {
      calls.push(() => { gen += '__fxExpr('; putHole(i); gen += ')'; });
    }
  }

  gen += '(';
  calls.forEach((emit, idx) => { if (idx > 0) gen += ', '; emit(); });
  gen += calls.length > 0 ? ', undefined as any)' : 'undefined as any)';
  return gen;
}
