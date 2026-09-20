/**
 * The pure logic behind the plugin: which identifiers a file references ONLY
 * through `` html`` `` component tags (so TypeScript can't see them), and whether
 * a given "unused" diagnostic should therefore be suppressed.
 *
 * A `<UserCard/>` inside a template is plain text to TypeScript, it never
 * counts as a reference, so the binding gets flagged "declared but never used".
 * We reparse each template with `@fluixi/template-parser`, collect the component
 * tag roots, and treat those names as used.
 *
 * The `typescript` module is passed in (the instance tsserver hands the plugin
 * via `init({ typescript })`) rather than imported, so the plugin uses the exact
 * TS the editor is running: never a second copy resolved from node_modules.
 */
import type * as TS from 'typescript';
import type { TemplateNode } from '@fluixi/template-parser';
import { parseCached, templatesIn } from './cache.js';

/** TS "declared but never used" diagnostic codes (incl. 6192 = all imports unused). */
const UNUSED_CODES = new Set([6133, 6196, 6198, 6199, 6205, 6138, 6192]);

export function isUnusedCode(code: number): boolean {
  return UNUSED_CODES.has(code);
}

const tagCache = new WeakMap<TS.SourceFile, Set<string>>();

/**
 * Component tag roots referenced inside html``/svg`` templates in the file.
 *
 * Cached on the `SourceFile`, which TypeScript replaces on edit. It has to be: the
 * editor asks for semantic AND suggestion diagnostics on every keystroke, so an
 * uncached walk here cost two full traversals of every open file per keypress , 
 * including files with no templates at all, in any project the extension activates
 * for. Reuses `templatesIn` and `parseCached` so a file with no `` html`` `` costs
 * one cached lookup and nothing else.
 */
export function usedComponentTags(ts: typeof TS, sourceFile: TS.SourceFile): Set<string> {
  const hit = tagCache.get(sourceFile);
  if (hit) return hit;

  const tags = new Set<string>();
  for (const template of templatesIn(ts, sourceFile)) {
    collectTags(parseCached(ts, sourceFile, template.template).root.children, tags);
  }
  tagCache.set(sourceFile, tags);
  return tags;
}

/** Walk the Template AST for component tags; a member tag `Ctx.Provider` roots at `Ctx`. */
function collectTags(nodes: readonly TemplateNode[], out: Set<string>): void {
  for (const node of nodes) {
    // `<${Comp}/>` (dynamic tag, empty `tag`) is already a real JS reference to
    // TypeScript, so it never needs suppressing: only static `<Name/>` does.
    if (node.kind === 'Component' && node.tag) out.add(node.tag.split('.')[0]);
    if ('children' in node && node.children) collectTags(node.children, out);
  }
}

/**
 * Whether `diagnostic` is an "unused" report for a binding that IS used through
 * a template component tag: and should therefore be dropped.
 */
export function shouldSuppress(
  ts: typeof TS,
  sourceFile: TS.SourceFile,
  diagnostic: TS.Diagnostic,
  used: ReadonlySet<string>,
): boolean {
  if (diagnostic.start === undefined || !isUnusedCode(diagnostic.code)) return false;

  const spanText = sourceFile.text.substr(diagnostic.start, diagnostic.length ?? 0);

  // An unused import: a SINGLE named import reports 6133 with the span covering
  // the whole `import … ;` statement (not just the name); ALL-unused reports 6192.
  // Either way, resolve the declaration and check its imported names.
  const decl = importDeclarationAt(ts, sourceFile, diagnostic.start);
  if (decl) {
    const names = importedNames(ts, decl);
    // When the span is exactly one imported name (multi-import, one unused),
    // check just that name; otherwise (whole statement) check all names.
    if (names.includes(spanText)) return used.has(spanText);
    return names.some((n) => used.has(n));
  }

  // A local binding (function/const): the span is the identifier itself.
  return used.has(spanText);
}

function importDeclarationAt(ts: typeof TS, sourceFile: TS.SourceFile, pos: number): TS.ImportDeclaration | undefined {
  let found: TS.ImportDeclaration | undefined;
  const visit = (node: TS.Node): void => {
    if (found) return;
    if (ts.isImportDeclaration(node) && node.getStart(sourceFile) <= pos && node.getEnd() >= pos) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function importedNames(ts: typeof TS, decl: TS.ImportDeclaration): string[] {
  const bindings = decl.importClause?.namedBindings;
  const names: string[] = [];
  if (decl.importClause?.name) names.push(decl.importClause.name.text);
  if (bindings && ts.isNamedImports(bindings)) {
    for (const el of bindings.elements) names.push(el.name.text);
  } else if (bindings && ts.isNamespaceImport(bindings)) {
    names.push(bindings.name.text);
  }
  return names;
}
