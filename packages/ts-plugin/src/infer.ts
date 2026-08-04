/**
 * Type inference for callback parameters inside html`` templates.
 *
 * A template is an opaque string to TypeScript, so a callback like
 * `${(it) => it.label}` (an each render fn) or `${(e) => …}` (an event handler)
 * gets no contextual type — `it`/`e` are implicit `any`. We recover the type the
 * way JSX would infer it, by understanding the template STRUCTURE:
 *
 *   - `<li each=${items}>${(it) => …}</li>`  → `it` is the element type of `items`
 *   - `<button @click=${(e) => …}>`          → `e` is the DOM event type (MouseEvent…)
 *
 * The arrow/function expression in a `${…}` is a REAL TS node (a template-span
 * expression), so once we know the role of its hole we can compute the parameter
 * type from the checker and surface it (hover now; completion/checking next).
 */
import type * as TS from 'typescript';
import { parseTemplate, type TemplateNode } from '@fluixi/template-parser';
import { parseCached, templateAtCached as templateAt } from './cache.js';

/** DOM event name → the global interface a handler's event argument has. */
const EVENT_TYPES: Record<string, string> = {
  click: 'MouseEvent', dblclick: 'MouseEvent', mousedown: 'MouseEvent', mouseup: 'MouseEvent',
  mousemove: 'MouseEvent', mouseenter: 'MouseEvent', mouseleave: 'MouseEvent', mouseover: 'MouseEvent',
  mouseout: 'MouseEvent', contextmenu: 'MouseEvent',
  keydown: 'KeyboardEvent', keyup: 'KeyboardEvent', keypress: 'KeyboardEvent',
  input: 'InputEvent', beforeinput: 'InputEvent', change: 'Event', submit: 'SubmitEvent',
  focus: 'FocusEvent', blur: 'FocusEvent', focusin: 'FocusEvent', focusout: 'FocusEvent',
  pointerdown: 'PointerEvent', pointerup: 'PointerEvent', pointermove: 'PointerEvent',
  pointerenter: 'PointerEvent', pointerleave: 'PointerEvent',
  wheel: 'WheelEvent', scroll: 'Event', drag: 'DragEvent', drop: 'DragEvent',
  touchstart: 'TouchEvent', touchend: 'TouchEvent', touchmove: 'TouchEvent',
  animationend: 'AnimationEvent', transitionend: 'TransitionEvent',
};

/** Tag name → the DOM interface an element of that tag has. */
const TAG_ELEMENTS: Record<string, string> = {
  a: 'HTMLAnchorElement', area: 'HTMLAreaElement', audio: 'HTMLAudioElement',
  br: 'HTMLBRElement', button: 'HTMLButtonElement', canvas: 'HTMLCanvasElement',
  data: 'HTMLDataElement', datalist: 'HTMLDataListElement', dialog: 'HTMLDialogElement',
  div: 'HTMLDivElement', dl: 'HTMLDListElement', embed: 'HTMLEmbedElement',
  fieldset: 'HTMLFieldSetElement', form: 'HTMLFormElement', h1: 'HTMLHeadingElement',
  h2: 'HTMLHeadingElement', h3: 'HTMLHeadingElement', h4: 'HTMLHeadingElement',
  h5: 'HTMLHeadingElement', h6: 'HTMLHeadingElement', hr: 'HTMLHRElement',
  iframe: 'HTMLIFrameElement', img: 'HTMLImageElement', input: 'HTMLInputElement',
  label: 'HTMLLabelElement', legend: 'HTMLLegendElement', li: 'HTMLLIElement',
  link: 'HTMLLinkElement', map: 'HTMLMapElement', menu: 'HTMLMenuElement',
  meter: 'HTMLMeterElement', object: 'HTMLObjectElement', ol: 'HTMLOListElement',
  optgroup: 'HTMLOptGroupElement', option: 'HTMLOptionElement', output: 'HTMLOutputElement',
  p: 'HTMLParagraphElement', picture: 'HTMLPictureElement', pre: 'HTMLPreElement',
  progress: 'HTMLProgressElement', q: 'HTMLQuoteElement', select: 'HTMLSelectElement',
  slot: 'HTMLSlotElement', source: 'HTMLSourceElement', span: 'HTMLSpanElement',
  table: 'HTMLTableElement', tbody: 'HTMLTableSectionElement', td: 'HTMLTableCellElement',
  template: 'HTMLTemplateElement', textarea: 'HTMLTextAreaElement', tfoot: 'HTMLTableSectionElement',
  th: 'HTMLTableCellElement', thead: 'HTMLTableSectionElement', time: 'HTMLTimeElement',
  tr: 'HTMLTableRowElement', track: 'HTMLTrackElement', ul: 'HTMLUListElement', video: 'HTMLVideoElement',
};

/** The role a template hole plays, if it's a typed callback slot. */
type HoleRole =
  | { kind: 'each'; eachHole: number } // item is the element type
  | { kind: 'indexEach'; eachHole: number } // <Index>: item is an accessor () => T
  | { kind: 'show'; whenHole: number } // <Show>: value is the narrowed truthy `when`
  | { kind: 'event'; event: string }
  | { kind: 'refEl'; tag: string }; // ref=${(el)=>…} / use=${(el)=>…}: el is the element

/** Map every hole index that is a typed callback to its role. */
function holeRoles(nodes: readonly TemplateNode[], out: Map<number, HoleRole>): void {
  const renderChildren = (node: TemplateNode, role: HoleRole): void => {
    if ('children' in node && node.children) {
      for (const child of node.children) if (child.kind === 'Expression') out.set(child.hole, role);
    }
  };

  for (const node of nodes) {
    if (node.kind === 'Element' || node.kind === 'Component') {
      // event handlers: @click / on:click / onClick
      for (const a of node.attributes) {
        if (a.kind === 'EventBinding') out.set(a.hole, { kind: 'event', event: a.name.toLowerCase() });
        // ref / use callbacks receive the element they're attached to.
        if (node.kind === 'Element' && a.kind === 'RefBinding') out.set(a.hole, { kind: 'refEl', tag: node.tag });
        if (node.kind === 'Element' && a.kind === 'UseDirective' && a.hole != null) out.set(a.hole, { kind: 'refEl', tag: node.tag });
      }

      // `each` directive on an element → For-style item.
      const eachDir = node.attributes.find((a) => a.kind === 'EachDirective');
      if (eachDir && eachDir.kind === 'EachDirective') {
        renderChildren(node, { kind: 'each', eachHole: eachDir.hole });
      }

      // Control-flow components with a render-prop child.
      if (node.kind === 'Component') {
        const propHole = (name: string): number | undefined => {
          const a = node.attributes.find(
            (x) => x.kind === 'Attribute' && x.name === name && x.value != null && x.value.kind === 'hole',
          );
          return a && a.kind === 'Attribute' && a.value && a.value.kind === 'hole' ? a.value.hole : undefined;
        };
        const eachHole = propHole('each');
        if ((node.tag === 'For') && eachHole !== undefined) renderChildren(node, { kind: 'each', eachHole });
        if (node.tag === 'Index' && eachHole !== undefined) renderChildren(node, { kind: 'indexEach', eachHole });
        const whenHole = propHole('when');
        if (node.tag === 'Show' && whenHole !== undefined) renderChildren(node, { kind: 'show', whenHole });
      }
    }
    if ('children' in node && node.children) holeRoles(node.children, out);
  }
}

export interface ParamTypeInfo {
  paramName: string;
  /** The rendered type string, e.g. `{ id: number; label: string }` or `MouseEvent`. */
  typeText: string;
  /** The resolved type, when available — used for member completion (`param.` → members). */
  type?: TS.Type;
  /** The param identifier's span (for the hover range). */
  start: number;
  length: number;
}

/** Resolve a global type (e.g. `MouseEvent`, `HTMLInputElement`) by name. */
function resolveGlobalType(ts: typeof TS, checker: TS.TypeChecker, location: TS.Node, name: string): TS.Type | undefined {
  const sym = checker.getSymbolsInScope(location, ts.SymbolFlags.Type).find((s) => s.getName() === name);
  return sym ? checker.getDeclaredTypeOfSymbol(sym) : undefined;
}

/** Element type for a tag via `HTMLElementTagNameMap` (covers every standard tag). */
function resolveElementType(ts: typeof TS, checker: TS.TypeChecker, location: TS.Node, tag: string): TS.Type | undefined {
  const map = resolveGlobalType(ts, checker, location, 'HTMLElementTagNameMap');
  const prop = map?.getProperty(tag.toLowerCase());
  const t = prop ? checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration ?? location) : undefined;
  // Unknown/custom tags aren't in the map — use the generic element type.
  return t ?? resolveGlobalType(ts, checker, location, 'HTMLElement');
}

/**
 * If `position` is on a callback parameter inside an html`` template whose type
 * we can infer, return the parameter name + inferred type string.
 */
export function inferParamAt(
  ts: typeof TS,
  program: TS.Program,
  sf: TS.SourceFile,
  position: number,
): ParamTypeInfo | undefined {
  const template = templateAt(ts, sf, position);
  if (!template || ts.isNoSubstitutionTemplateLiteral(template.template)) return undefined;
  const spans = template.template.templateSpans;
  const holeExprs = spans.map((s) => s.expression);

  // Which hole's expression contains the cursor?
  const holeIndex = holeExprs.findIndex((e) => position >= e.getStart(sf) && position <= e.getEnd());
  if (holeIndex === -1) return undefined;

  const roles = new Map<number, HoleRole>();
  holeRoles(parseCached(ts, sf, template.template).root.children, roles);
  const role = roles.get(holeIndex);
  if (!role) return undefined;

  // The hole must be an arrow/function whose first param is under (or the target of) the cursor.
  const fn = holeExprs[holeIndex];
  if (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) return undefined;
  const param = fn.parameters[0];
  if (!param || !ts.isIdentifier(param.name) || param.type) return undefined; // already typed → leave it
  const paramName = param.name.text;

  // Only answer when the cursor is actually on this parameter (its decl or a use).
  const id = identifierAt(ts, sf, position);
  if (!id || id.text !== paramName || !contains(fn, id)) return undefined;

  const checker = program.getTypeChecker();
  let typeText: string | undefined;
  let type: TS.Type | undefined;
  if (role.kind === 'event') {
    const name = EVENT_TYPES[role.event] ?? 'Event';
    typeText = name;
    type = resolveGlobalType(ts, checker, fn, name);
  } else if (role.kind === 'refEl') {
    // Resolve via HTMLElementTagNameMap[tag] so EVERY tag is covered; fall back
    // to the static name map / HTMLElement when the lib isn't present.
    type = resolveElementType(ts, checker, fn, role.tag);
    typeText = type ? checker.typeToString(type) : (TAG_ELEMENTS[role.tag.toLowerCase()] ?? 'HTMLElement');
    if (!type) type = resolveGlobalType(ts, checker, fn, typeText);
  } else if (role.kind === 'show') {
    // <Show when=${cond}>${(value) => …}: value is the narrowed truthy `when`.
    type = checker.getNonNullableType(checker.getTypeAtLocation(holeExprs[role.whenHole]));
    typeText = checker.typeToString(type);
  } else if (role.kind === 'indexEach') {
    // <Index>: item is an accessor () => T.
    const elem = checker.getTypeAtLocation(holeExprs[role.eachHole]).getNumberIndexType();
    if (elem) typeText = `() => ${checker.typeToString(elem)}`;
  } else {
    // each / For: item is the element type.
    type = checker.getTypeAtLocation(holeExprs[role.eachHole]).getNumberIndexType();
    if (type) typeText = checker.typeToString(type);
  }
  if (!typeText) return undefined;
  return { paramName, typeText, type, start: id.getStart(sf), length: id.getWidth(sf) };
}

/** Build a QuickInfo for an inferred callback parameter, or undefined. */
export function paramQuickInfo(
  ts: typeof TS,
  ls: TS.LanguageService,
  fileName: string,
  position: number,
): TS.QuickInfo | undefined {
  const program = ls.getProgram();
  const sf = program?.getSourceFile(fileName);
  if (!program || !sf) return undefined;
  const info = inferParamAt(ts, program, sf, position);
  if (!info) return undefined;
  return {
    kind: ts.ScriptElementKind.parameterElement,
    kindModifiers: '',
    textSpan: { start: info.start, length: info.length },
    displayParts: [
      { text: '(', kind: 'punctuation' },
      { text: 'parameter', kind: 'text' },
      { text: ')', kind: 'punctuation' },
      { text: ' ', kind: 'space' },
      { text: info.paramName, kind: 'parameterName' },
      { text: ':', kind: 'punctuation' },
      { text: ' ', kind: 'space' },
      { text: info.typeText, kind: 'text' },
    ],
    documentation: [{ text: 'Inferred by Fluixi from the html`` template.', kind: 'text' }],
  };
}

function identifierAt(ts: typeof TS, sf: TS.SourceFile, pos: number): TS.Identifier | undefined {
  let found: TS.Identifier | undefined;
  const visit = (node: TS.Node): void => {
    if (found) return;
    if (pos >= node.getStart(sf) && pos <= node.getEnd()) {
      if (ts.isIdentifier(node)) found = node;
      node.forEachChild(visit);
    }
  };
  sf.forEachChild(visit);
  return found;
}

function contains(outer: TS.Node, inner: TS.Node): boolean {
  return inner.getStart() >= outer.getStart() && inner.getEnd() <= outer.getEnd();
}
