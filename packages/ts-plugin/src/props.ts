/**
 * Prop-name completion for component tags inside html`` templates.
 *
 * The virtual document (see ./virtual) already gives prop HOVER and value
 * type-checking via `__fxProps`, but object-literal key completion is awkward
 * for a half-typed name. So when the cursor sits in a component tag's attribute
 * area, we compute the component's prop names straight from the checker and
 * return them as completion entries: reliable and independent of the virtual
 * document.
 */
import type * as TS from 'typescript';
import { parseTemplate, type ComponentNode, type TemplateNode } from '@fluixi/template-parser';
import { parseCached, templateAtCached as templateAt } from './cache.js';
import { autoImportedSymbol } from './auto-import.js';

export function componentPropCompletions(
  ts: typeof TS,
  ls: TS.LanguageService,
  host: TS.ModuleResolutionHost,
  fileName: string,
  position: number,
): TS.CompletionEntry[] | undefined {
  const program = ls.getProgram();
  const sf = program?.getSourceFile(fileName);
  if (!program || !sf) return undefined;

  const template = templateAt(ts, sf, position);
  if (!template) return undefined;

  const comp = componentTagAtAttrArea(ts, sf, template.template, position);
  if (!comp || !comp.tag) return undefined; // dynamic `<${C}>` handled by the virtual doc

  // Control-flow components (auto-imported by the compiler) aren't in the file's
  // scope: offer their known prop names directly.
  const span = attrNameSpan(sf.text, position);

  const cf = CONTROL_FLOW_PROPS[comp.tag];
  if (cf) {
    const already = new Set(comp.attributeNames);
    return cf.filter((n) => !already.has(n)).map((name) => propEntry(ts, name, span));
  }

  const checker = program.getTypeChecker();
  const rootName = comp.tag.split('.')[0]!;
  // Resolve through scope, not the file's own statements. A component supplied by a
  // `resolve` rule has no import to find: it is a global from generated ambient
  // declarations: which is why scanning the file offered nothing for `<Stack `. This is
  // the same lookup `hover.ts` uses, so hover and completion now agree on what a tag is.
  const compType = componentTypeOf(ts, program, checker, host, sf, template.template, rootName);
  const propsType = compType && firstParamType(ts, checker, compType);
  if (!propsType) return undefined;

  const already = new Set(comp.attributeNames);
  const entries: TS.CompletionEntry[] = [];
  for (const p of propsType.getProperties()) {
    const name = p.getName();
    if (name === 'children' || already.has(name)) continue;
    entries.push(propEntry(ts, name, span));
  }
  return entries.length ? entries : undefined;
}

/**
 * Hover for a component prop NAME (e.g. the cursor on `header` in `<Card header=...>`).
 * Resolves the prop's type from the component's props for user components, or a
 * known signature for the auto-imported control-flow ones.
 */
export function componentPropHover(
  ts: typeof TS,
  ls: TS.LanguageService,
  host: TS.ModuleResolutionHost,
  fileName: string,
  position: number,
): TS.QuickInfo | undefined {
  const program = ls.getProgram();
  const sf = program?.getSourceFile(fileName);
  if (!program || !sf) return undefined;
  const template = templateAt(ts, sf, position);
  if (!template) return undefined;

  const hit = propNameAt(ts, sf, template.template, position);
  if (!hit) return undefined;

  let typeText: string | undefined;
  const cf = CONTROL_FLOW_PROP_TYPES[hit.tag];
  if (cf) {
    typeText = cf[hit.prop];
    if (!typeText) return undefined;
  } else if (hit.tag) {
    // Same scope-based resolution as completion: a component supplied by a `resolve`
    // rule has no import in the file to find.
    const checker = program.getTypeChecker();
    const root = hit.tag.split('.')[0]!;
    const compType = componentTypeOf(ts, program, checker, host, sf, template.template, root);
    const propsType = compType && firstParamType(ts, checker, compType);
    const sym = propsType && propsType.getProperty(hit.prop);
    if (!sym) return undefined;
    const at = sym.valueDeclaration ?? sym.declarations?.[0] ?? template.template;
    typeText = checker.typeToString(checker.getTypeOfSymbolAtLocation(sym, at));
  }
  if (!typeText) return undefined;

  return {
    kind: ts.ScriptElementKind.memberVariableElement,
    kindModifiers: '',
    textSpan: { start: hit.start, length: hit.prop.length },
    displayParts: [
      { text: '(', kind: 'punctuation' },
      { text: 'property', kind: 'text' },
      { text: ')', kind: 'punctuation' },
      { text: ' ', kind: 'space' },
      { text: hit.prop, kind: 'propertyName' },
      { text: ':', kind: 'punctuation' },
      { text: ' ', kind: 'space' },
      { text: typeText, kind: 'text' },
    ],
    documentation: [],
  };
}

interface PropHit { tag: string; prop: string; start: number; }

/** If `position` sits on a component prop NAME, return the tag + prop name + span. */
function propNameAt(ts: typeof TS, sf: TS.SourceFile, tpl: TS.TemplateLiteral, position: number): PropHit | undefined {
  const { root } = parseCached(ts, sf, tpl);
  let hit: PropHit | undefined;
  const walk = (nodes: readonly TemplateNode[]): void => {
    for (const node of nodes) {
      if (node.kind === 'Component') {
        const c = node as ComponentNode;
        for (const a of c.attributes) {
          if ((a.kind === 'Attribute' || a.kind === 'PropertyBinding' || a.kind === 'BindDirective') && 'loc' in a) {
            const start = a.loc.start;
            if (position >= start && position <= start + a.name.length) hit = { tag: c.tag, prop: a.name, start };
          }
        }
      }
      if (!hit && 'children' in node && node.children) walk(node.children);
      if (hit) return;
    }
  };
  walk(root.children);
  return hit;
}

/** Hover text (the prop's type) for the auto-imported control-flow components. */
const CONTROL_FLOW_PROP_TYPES: Record<string, Record<string, string>> = {
  Show: { when: 'T', fallback: 'JSX.Element', keyed: 'boolean' },
  For: { each: 'readonly T[] | undefined | null', fallback: 'JSX.Element', by: '(item: T) => unknown' },
  Index: { each: 'readonly T[] | undefined | null', fallback: 'JSX.Element' },
  Switch: { fallback: 'JSX.Element' },
  Match: { when: 'T' },
  Suspense: { fallback: 'JSX.Element' },
  SuspenseList: { revealOrder: '"forwards" | "backwards" | "together"', tail: '"collapsed" | "hidden"' },
  Portal: { mount: 'Node', useShadow: 'boolean', isSVG: 'boolean' },
  ErrorBoundary: { fallback: 'JSX.Element | ((err: unknown, reset: () => void) => JSX.Element)' },
  Dynamic: { component: 'Component | string' },
  Await: { value: 'Promise<T> | (() => Promise<T>)', fallback: 'JSX.Element' },
};

/** Known prop names for the auto-imported control-flow components. */
const CONTROL_FLOW_PROPS: Record<string, string[]> = {
  Show: ['when', 'fallback', 'keyed'],
  For: ['each', 'fallback', 'by'],
  Index: ['each', 'fallback'],
  Switch: ['fallback'],
  Match: ['when'],
  Suspense: ['fallback'],
  SuspenseList: ['revealOrder', 'tail'],
  Portal: ['mount', 'useShadow', 'isSVG'],
  ErrorBoundary: ['fallback'],
  Dynamic: ['component'],
  Await: ['value', 'fallback'],
};

function propEntry(ts: typeof TS, name: string, replacementSpan?: TS.TextSpan): TS.CompletionEntry {
  return {
    name,
    kind: ts.ScriptElementKind.memberVariableElement,
    kindModifiers: '',
    sortText: '0_' + name,
    insertText: name,
    // Without a span the editor filters these against whatever word *it* computes at the
    // cursor, and inside a template literal that is not the attribute name, so the list
    // showed in full until the first keystroke and then emptied. Saying exactly which
    // characters are being replaced makes filtering match what is typed.
    replacementSpan,
  };
}

/**
 * The span of the attribute name being typed at `position`, possibly empty.
 *
 * Empty when the cursor sits after whitespace, which is a valid insertion point, the
 * editor needs a zero-length span there rather than none at all.
 */
function attrNameSpan(text: string, position: number): TS.TextSpan {
  const isNameChar = (c: string | undefined): boolean => !!c && /[A-Za-z0-9_$:@?.\-]/.test(c);
  let start = position;
  while (start > 0 && isNameChar(text[start - 1])) start--;
  let end = position;
  while (end < text.length && isNameChar(text[end])) end++;
  return { start, length: end - start };
}

/** Find a top-level declaration of `name` (function/class/const/import) in the file. */
/**
 * The type of the component `name` refers to at `template`.
 *
 * Scope first, so imports, locals and ambient globals all resolve, then the compiler's
 * own auto-imported names (`Show`, `Outlet`, ...) which have no binding anywhere.
 * `getTypeOfSymbolAtLocation` is used rather than `getTypeAtLocation` on a declaration
 * because the generated globals are alias declarations, and an alias has to be followed
 * to reach the function type.
 */
function componentTypeOf(
  ts: typeof TS,
  program: TS.Program,
  checker: TS.TypeChecker,
  host: TS.ModuleResolutionHost,
  sf: TS.SourceFile,
  template: TS.Node,
  name: string,
): TS.Type | undefined {
  const flags =
    ts.SymbolFlags.Value | ts.SymbolFlags.Function | ts.SymbolFlags.Class | ts.SymbolFlags.Alias;
  const symbol =
    checker.getSymbolsInScope(template, flags).find((s) => s.name === name) ??
    autoImportedSymbol(ts, program, host, sf, name);
  if (!symbol) return undefined;
  const resolved =
    symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const decl = resolved.valueDeclaration ?? resolved.declarations?.[0];
  return decl ? checker.getTypeOfSymbolAtLocation(resolved, decl) : undefined;
}


/** The props type = the type of a component's first parameter. */
function firstParamType(ts: typeof TS, checker: TS.TypeChecker, type: TS.Type): TS.Type | undefined {
  for (const sig of checker.getSignaturesOfType(type, ts.SignatureKind.Call)) {
    const p = sig.getParameters()[0];
    if (p) return checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? sig.getDeclaration());
  }
  return undefined;
}

interface TagHit {
  tag: string;
  attributeNames: string[];
}

/** If `position` is inside a component tag's attribute area, return that tag. */
function componentTagAtAttrArea(
  ts: typeof TS,
  sf: TS.SourceFile,
  tpl: TS.TemplateLiteral,
  position: number,
): TagHit | undefined {
  const { root } = parseCached(ts, sf, tpl);
  let hit: TagHit | undefined;
  const walk = (nodes: readonly TemplateNode[]): void => {
    for (const node of nodes) {
      if (node.kind === 'Component') {
        const c = node as ComponentNode;
        // attribute area: after `<Tag` up to the first `>` (loc covers the element).
        const openStart = c.loc.start + 1 + (c.tag ? c.tag.length : 0);
        const openEnd = firstChildOrCloseStart(c);
        // `<` end-exclusive: `openEnd` is where the tag's content begins, so including
        // it offered props with the cursor already past `>`.
        if (position > openStart && position < openEnd) {
          hit = { tag: c.tag, attributeNames: attributeNames(c) };
        }
      }
      if (!hit && 'children' in node && node.children) walk(node.children);
      if (hit) return;
    }
  };
  walk(root.children);
  return hit;
}

function firstChildOrCloseStart(c: ComponentNode): number {
  if (c.selfClosing) return c.loc.end;
  const first = c.children[0];
  return first ? first.loc.start : c.loc.end;
}

function attributeNames(c: ComponentNode): string[] {
  const out: string[] = [];
  for (const a of c.attributes) {
    if (a.kind === 'Attribute' || a.kind === 'PropertyBinding' || a.kind === 'BindDirective') out.push(a.name);
  }
  return out;
}
