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
import { templateAt, templatePieces } from './pieces.js';

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

/** The role a template hole plays, if it's a typed callback slot. */
type HoleRole =
  | { kind: 'each'; eachHole: number }
  | { kind: 'event'; event: string };

/** Map every hole index that is a typed callback to its role. */
function holeRoles(nodes: readonly TemplateNode[], out: Map<number, HoleRole>): void {
  for (const node of nodes) {
    if (node.kind === 'Element' || node.kind === 'Component') {
      // event handlers: @click / on:click / onClick
      for (const a of node.attributes) {
        if (a.kind === 'EventBinding') out.set(a.hole, { kind: 'event', event: a.name.toLowerCase() });
      }
      // each render callback: the single Expression child of an element with `each`
      const each = node.attributes.find((a) => a.kind === 'EachDirective');
      if (each && each.kind === 'EachDirective') {
        for (const child of node.children) {
          if (child.kind === 'Expression') out.set(child.hole, { kind: 'each', eachHole: each.hole });
        }
      }
    }
    if ('children' in node && node.children) holeRoles(node.children, out);
  }
}

export interface ParamTypeInfo {
  paramName: string;
  /** The rendered type string, e.g. `{ id: number; label: string }` or `MouseEvent`. */
  typeText: string;
  /** The param identifier's span (for the hover range). */
  start: number;
  length: number;
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
  holeRoles(parseTemplate(templatePieces(ts, template.template, sf)).root.children, roles);
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
  if (role.kind === 'event') {
    typeText = EVENT_TYPES[role.event] ?? 'Event';
  } else {
    const arrType = checker.getTypeAtLocation(holeExprs[role.eachHole]);
    const elem = arrType.getNumberIndexType();
    if (elem) typeText = checker.typeToString(elem);
  }
  if (!typeText) return undefined;
  return { paramName, typeText, start: id.getStart(sf), length: id.getWidth(sf) };
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
