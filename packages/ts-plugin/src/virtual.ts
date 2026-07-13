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
  // Control-flow component prop types, declared inline so they ALWAYS resolve
  // (no dependency on @fluixi/core being importable from the virtual document).
  // Prop shapes drive hover + value checking on when/each/fallback/mount/…;
  // render-prop children are typed separately by __fxEach/__fxShow.
  'declare const __fxCF: {\n' +
  '  Show: <T>(props: { when: T; fallback?: unknown; children?: unknown }) => any;\n' +
  '  For: <T>(props: { each: readonly T[] | undefined | null; fallback?: unknown; by?: (item: T) => unknown; children?: unknown }) => any;\n' +
  '  Index: <T>(props: { each: readonly T[] | undefined | null; fallback?: unknown; children?: unknown }) => any;\n' +
  '  Switch: (props: { fallback?: unknown; children?: unknown }) => any;\n' +
  '  Match: <T>(props: { when: T; children?: unknown }) => any;\n' +
  '  Suspense: (props: { fallback?: unknown; children?: unknown }) => any;\n' +
  '  SuspenseList: (props: { revealOrder: "forwards" | "backwards" | "together"; children?: unknown }) => any;\n' +
  '  Portal: (props: { mount?: Node; useShadow?: boolean; children?: unknown }) => any;\n' +
  '  ErrorBoundary: (props: { fallback?: unknown; children?: unknown }) => any;\n' +
  '  Dynamic: (props: { component: unknown; [k: string]: unknown }) => any;\n' +
  '  Await: <T>(props: { value: Promise<T> | (() => Promise<T>); fallback?: unknown; children?: unknown }) => any;\n' +
  '};\n' +
  'declare const __fxEach: <T>(items: ArrayLike<T> | Iterable<T> | null | undefined, render: (item: T, index: () => number) => any) => any;\n' +
  'declare const __fxIndex: <T>(items: ArrayLike<T> | Iterable<T> | null | undefined, render: (item: () => T, index: number) => any) => any;\n' +
  'declare const __fxShow: <T>(when: T, render: (value: NonNullable<T>) => any) => any;\n' +
  'declare const __fxOn: <K extends string>(name: K, handler: (event: K extends keyof HTMLElementEventMap ? HTMLElementEventMap[K] : Event) => any) => any;\n' +
  // ref callback on an element: `el` is the element type for that tag.
  'declare const __fxRef: <K extends string>(tag: K, ref: (el: K extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[K] : HTMLElement) => any) => any;\n' +
  'declare const __fxExpr: (value: any) => any;\n' +
  // Check a props object against a component's parameter type P. `NoInfer` keeps
  // P inferred ONLY from the component (not the props arg), giving real prop
  // name completion + hover + value checking.
  'declare function __fxProps<P>(comp: (props: P, ...rest: any[]) => any, props: NoInfer<P>): any;\n';

/** Components that live in the control-flow namespace, referenced as __fxCF.X. */
const CONTROL_FLOW = new Set([
  'Show', 'For', 'Index', 'Switch', 'Match', 'Dynamic', 'ErrorBoundary', 'Suspense', 'SuspenseList', 'Await', 'Portal',
]);

/** A region that maps 1:1 between source and virtual (unchanged code, or a hole). */
export interface Segment {
  srcStart: number;
  srcEnd: number;
  genStart: number;
  genEnd: number;
  /** True for an embedded `${…}` hole (vs. copied unchanged code). */
  hole?: boolean;
  /** True for a component prop-name key (mapped for hover, not for completion). */
  key?: boolean;
}

/** True when a source offset lies inside an embedded template hole. */
export function inHole(segments: readonly Segment[], pos: number): boolean {
  return segments.some((s) => s.hole && pos >= s.srcStart && pos <= s.srcEnd);
}

/** True when a source offset lies on a mapped component prop-name key. */
export function inKey(segments: readonly Segment[], pos: number): boolean {
  return segments.some((s) => s.key && pos >= s.srcStart && pos <= s.srcEnd);
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

/** True when a hole expression is an inline function (arrow/function). */
function isFn(ts: typeof TS, node: TS.Expression): boolean {
  return ts.isArrowFunction(node) || ts.isFunctionExpression(node);
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
  | { kind: 'event'; event: string }
  | { kind: 'ref'; tag: string };

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
        // ref + use callbacks on an element both receive the element as first arg.
        if (a.kind === 'RefBinding' && node.kind === 'Element') roles.set(a.hole, { kind: 'ref', tag: node.tag });
        if (a.kind === 'UseDirective' && a.hole != null && node.kind === 'Element') roles.set(a.hole, { kind: 'ref', tag: node.tag });
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

  const isIdent = (t: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(t);
  // emit an object key from source, mapped when it's a plain identifier
  const putKey = (start: number, text: string): void => {
    const genStart = gen.length;
    if (isIdent(text)) {
      gen += text;
      segments.push({ srcStart: start, srcEnd: start + text.length, genStart, genEnd: gen.length, key: true });
    } else {
      gen += JSON.stringify(text);
    }
  };

  const calls: Array<() => void> = [];

  // Per-component props object → prop name completion + hover + value checking.
  const walkComponents = (nodes: readonly TemplateNode[]): void => {
    for (const node of nodes) {
      if (node.kind === 'Component') calls.push(componentPropsEmitter(node));
      if ('children' in node && node.children) walkComponents(node.children);
    }
  };

  function componentPropsEmitter(node: Extract<TemplateNode, { kind: 'Component' }>): () => void {
    return () => {
      gen += '__fxProps(';
      if (node.tagHole != null) putHole(node.tagHole);
      else if (CONTROL_FLOW.has(node.tag)) gen += `__fxCF.${node.tag}`;
      else gen += node.tag; // user component / member path in the file's scope
      gen += ', { ';
      let first = true;
      const entry = (keyStart: number, keyText: string, emitValue: () => void) => {
        if (!first) gen += ', ';
        first = false;
        putKey(keyStart, keyText);
        gen += ': ';
        emitValue();
      };
      for (const a of node.attributes) {
        if (a.kind === 'Attribute') {
          const keyStart = a.boolean ? a.loc.start + 1 : a.loc.start;
          const v = a.value;
          entry(keyStart, a.name, () => {
            if (!v) { gen += 'true'; }
            else if (v.kind === 'static') { gen += JSON.stringify(v.value); }
            else if (v.kind === 'hole') { putHole(v.hole); }
            else { gen += 'undefined as any'; } // mixed value
          });
        } else if (a.kind === 'PropertyBinding') {
          entry(a.loc.start + 1, a.name, () => putHole(a.hole));
        }
        // events/spreads/directives are not modelled as component props here
      }
      gen += ' })';
    };
  }
  walkComponents(root.children);

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
    } else if (role && role.kind === 'ref' && isFn(ts, tpl.holes[i])) {
      const tag = role.tag;
      calls.push(() => { gen += `__fxRef(${JSON.stringify(tag)}, `; putHole(i); gen += ')'; });
    } else {
      calls.push(() => { gen += '__fxExpr('; putHole(i); gen += ')'; });
    }
  }

  gen += '(';
  calls.forEach((emit, idx) => { if (idx > 0) gen += ', '; emit(); });
  gen += calls.length > 0 ? ', undefined as any)' : 'undefined as any)';
  return gen;
}
