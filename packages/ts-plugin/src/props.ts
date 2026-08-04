/**
 * Prop-name completion for component tags inside html`` templates.
 *
 * The virtual document (see ./virtual) already gives prop HOVER and value
 * type-checking via `__fxProps`, but object-literal key completion is awkward
 * for a half-typed name. So when the cursor sits in a component tag's attribute
 * area, we compute the component's prop names straight from the checker and
 * return them as completion entries — reliable and independent of the virtual
 * document.
 */
import type * as TS from 'typescript';
import { parseTemplate, type ComponentNode, type TemplateNode } from '@fluixi/template-parser';
import { parseCached, templateAtCached as templateAt } from './cache.js';

export function componentPropCompletions(
  ts: typeof TS,
  ls: TS.LanguageService,
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
  // scope — offer their known prop names directly.
  const cf = CONTROL_FLOW_PROPS[comp.tag];
  if (cf) {
    const already = new Set(comp.attributeNames);
    return cf.filter((n) => !already.has(n)).map((name) => propEntry(ts, name));
  }

  const checker = program.getTypeChecker();
  const rootName = comp.tag.split('.')[0];
  const decl = findDeclaration(ts, sf, rootName);
  if (!decl) return undefined;
  const compType = checker.getTypeAtLocation(decl);
  const propsType = firstParamType(ts, checker, compType);
  if (!propsType) return undefined;

  const already = new Set(comp.attributeNames);
  const entries: TS.CompletionEntry[] = [];
  for (const p of propsType.getProperties()) {
    const name = p.getName();
    if (name === 'children' || already.has(name)) continue;
    entries.push(propEntry(ts, name));
  }
  return entries.length ? entries : undefined;
}

/**
 * Hover for a component prop NAME (e.g. the cursor on `header` in `<Card header=…>`).
 * Resolves the prop's type from the component's props for user components, or a
 * known signature for the auto-imported control-flow ones.
 */
export function componentPropHover(
  ts: typeof TS,
  ls: TS.LanguageService,
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
    const checker = program.getTypeChecker();
    const decl = findDeclaration(ts, sf, hit.tag.split('.')[0]);
    const propsType = decl && firstParamType(ts, checker, checker.getTypeAtLocation(decl));
    const sym = propsType && propsType.getProperty(hit.prop);
    if (!sym) return undefined;
    typeText = checker.typeToString(checker.getTypeOfSymbolAtLocation(sym, sym.valueDeclaration ?? decl!));
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

function propEntry(ts: typeof TS, name: string): TS.CompletionEntry {
  return { name, kind: ts.ScriptElementKind.memberVariableElement, kindModifiers: '', sortText: '0_' + name, insertText: name };
}

/** Find a top-level declaration of `name` (function/class/const/import) in the file. */
function findDeclaration(ts: typeof TS, sf: TS.SourceFile, name: string): TS.Node | undefined {
  for (const stmt of sf.statements) {
    if ((ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) && stmt.name?.text === name) return stmt.name;
    if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.name.text === name) return d.name;
      }
    }
    if (ts.isImportDeclaration(stmt)) {
      const b = stmt.importClause?.namedBindings;
      if (b && ts.isNamedImports(b)) {
        for (const el of b.elements) if (el.name.text === name) return el.name;
      }
      if (stmt.importClause?.name?.text === name) return stmt.importClause.name;
    }
  }
  return undefined;
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
        if (position > openStart && position <= openEnd) {
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
