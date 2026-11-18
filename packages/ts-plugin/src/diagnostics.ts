/**
 * Type errors inside `${...}` holes, checked against the MAIN program.
 *
 * A `${(it) => it.nope}` is a real expression in a real file, TypeScript has
 * already parsed and bound it. The only thing it lacks is a contextual type for
 * `it`, which is why the mistake goes unreported: `it` is implicitly `any`, and
 * every property access on `any` is allowed.
 *
 * So rather than building a parallel document to make the checker see the
 * template, we supply the missing type ourselves (the same inference hover uses)
 * and ask the checker whether each property access holds. Spans are real source
 * positions, so nothing needs mapping: and nothing is added to the program, no
 * second service exists, and the host is never touched.
 *
 * The trade-off is honest: this catches property access on an inferred parameter,
 * which is the mistake templates actually produce. It is not a general type-check
 * of hole contents.
 */
import type * as TS from 'typescript';
import type { ElementNode, TemplateNode } from '@fluixi/template-parser';
import { parseCached, templatesIn } from './cache.js';
import { inferParamsIn } from './infer.js';

/** The plugin's own diagnostic code for a bare accessor, shared with its fix. */
export const ACCESSOR_NOT_CALLED = 9001;

/** A type that accepts any property, so an unknown one proves nothing. */
function acceptsAnyProperty(ts: typeof TS, checker: TS.TypeChecker, type: TS.Type): boolean {
  const open =
    ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.TypeParameter | ts.TypeFlags.Never;
  if (type.flags & open) return true;
  if (checker.getIndexInfoOfType?.(type, ts.IndexKind.String)) return true;
  // A union is only checkable when every member is.
  if (type.isUnion()) return type.types.some((t) => acceptsAnyProperty(ts, checker, t));
  return false;
}

/**
 * A signal read without calling it, where that is a mistake: inside an attribute value that
 * mixes text with a hole (`class="btn ${size}"`). The compiler builds that value as a string,
 * once, so a bare accessor writes its function source and never updates. In child position
 * (`${count}`) it is fine: the insert calls the function and tracks it.
 *
 * Scoped hard to keep it honest: only an accessor-shaped read whose type is callable with no
 * required arguments.
 */
function accessorDiagnostics(
  ts: typeof TS,
  program: TS.Program,
  sf: TS.SourceFile,
): TS.Diagnostic[] {
  const checker = program.getTypeChecker();
  const out: TS.Diagnostic[] = [];

  for (const template of templatesIn(ts, sf)) {
    const tpl = template.template;
    if (ts.isNoSubstitutionTemplateLiteral(tpl)) continue;
    const holes = tpl.templateSpans.map((s) => s.expression);

    const visit = (nodes: readonly TemplateNode[], parent: TemplateNode | null): void => {
      for (const node of nodes) {
        const attributes = 'attributes' in node ? ((node as ElementNode).attributes as unknown as { value?: { kind: string; parts?: ({ text: string } | { hole: number })[] } | null }[]) : [];
        for (const attribute of attributes) {
          if (attribute.value?.kind !== 'mixed') continue;
          for (const part of attribute.value.parts ?? []) {
            if (!('hole' in part)) continue;
            const expression = holes[part.hole];
            if (!expression || !isAccessorRead(ts, expression) || !isAccessor(ts, checker, expression)) continue;
            const text = expression.getText(sf);
            out.push({
              file: sf,
              start: expression.getStart(sf),
              length: expression.getWidth(sf),
              category: ts.DiagnosticCategory.Warning,
              code: ACCESSOR_NOT_CALLED,
              messageText:
                `'${text}' is an accessor: call it (\`${text}()\`). In an attribute that mixes text ` +
                'with it, it is turned into text once, so it writes the function and never updates.',
              source: 'fluixi',
            });
          }
        }
        const children = 'children' in node ? (node.children as TemplateNode[] | undefined) : undefined;
        if (children) visit(children, node);
      }
    };

    visit(parseCached(ts, sf, tpl).root.children, null);
  }

  return out;
}

/**
 * Expression shapes that read a value and could be an accessor.
 *
 * A bare identifier isn't the only way to reach one: `signals[0]` and `props.count`
 * are the same mistake. A call is already correct, and anything else (an inline
 * function, a conditional, a template) is deliberate.
 */
function isAccessorRead(ts: typeof TS, node: TS.Expression): boolean {
  return (
    ts.isIdentifier(node) ||
    ts.isPropertyAccessExpression(node) ||
    ts.isElementAccessExpression(node)
  );
}

/** Callable with no required arguments, and returns something, i.e. a signal read. */
function isAccessor(ts: typeof TS, checker: TS.TypeChecker, node: TS.Expression): boolean {
  const signatures = checker.getTypeAtLocation(node).getCallSignatures();
  if (signatures.length !== 1) return false;
  const signature = signatures[0]!;
  if (signature.getParameters().some((p) => !isOptional(ts, p))) return false;
  const returned = signature.getReturnType();
  return !(returned.flags & (ts.TypeFlags.Void | ts.TypeFlags.Never));
}

function isOptional(ts: typeof TS, symbol: TS.Symbol): boolean {
  const declaration = symbol.valueDeclaration;
  return !!declaration && ts.isParameter(declaration) && (!!declaration.questionToken || !!declaration.initializer || !!declaration.dotDotDotToken);
}

/**
 * Report property accesses on an inferred callback parameter that the parameter's
 * type doesn't have.
 */
const cache = new WeakMap<TS.SourceFile, TS.Diagnostic[]>();

/** The plugin's code for what the template parser reports (a repaired tag, a missing `alt`). */
export const TEMPLATE_PARSE = 9002;

/**
 * What the template parser found in each html`` template: the same errors that fail a build
 * and the warnings it prints, accessibility ones included. The pieces carry source offsets,
 * so the parser's spans are file positions as they are.
 */
function parserDiagnostics(ts: typeof TS, sf: TS.SourceFile): TS.Diagnostic[] {
  const out: TS.Diagnostic[] = [];
  for (const template of templatesIn(ts, sf)) {
    for (const d of parseCached(ts, sf, template.template).diagnostics) {
      out.push({
        file: sf,
        start: d.loc.start,
        length: Math.max(0, d.loc.end - d.loc.start),
        category: d.severity === 'error' ? ts.DiagnosticCategory.Error : ts.DiagnosticCategory.Warning,
        code: TEMPLATE_PARSE,
        messageText: d.message,
        source: 'fluixi',
      });
    }
  }
  return out;
}

export function templateDiagnostics(
  ts: typeof TS,
  ls: TS.LanguageService,
  fileName: string,
): TS.Diagnostic[] {
  const program = ls.getProgram();
  const sf = program?.getSourceFile(fileName);
  if (!program || !sf) return [];

  // Keyed on the SourceFile, which TypeScript replaces on edit. Without this the
  // whole analysis re-ran for every quick-fix request, and the editor asks for
  // code actions on every cursor move, not just when something is wrong.
  const hit = cache.get(sf);
  if (hit) return hit;

  const checker = program.getTypeChecker();
  const out: TS.Diagnostic[] = [];

  out.push(...accessorDiagnostics(ts, program, sf));
  out.push(...parserDiagnostics(ts, sf));

  for (const { fn, paramName, type } of inferParamsIn(ts, program, sf)) {
    if (acceptsAnyProperty(ts, checker, type)) continue;

    const visit = (node: TS.Node): void => {
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === paramName &&
        ts.isIdentifier(node.name)
      ) {
        // Only when the identifier really is the parameter, not a shadowing local.
        const symbol = checker.getSymbolAtLocation(node.expression);
        const declaredHere = symbol?.declarations?.some((d) => d.parent === fn);
        if (declaredHere && !checker.getPropertyOfType(type, node.name.text)) {
          out.push({
            file: sf,
            start: node.name.getStart(sf),
            length: node.name.getWidth(sf),
            category: ts.DiagnosticCategory.Error,
            code: 2339,
            messageText: `Property '${node.name.text}' does not exist on type '${checker.typeToString(type)}'.`,
            source: 'fluixi',
          });
        }
      }
      ts.forEachChild(node, visit);
    };

    if (fn.body) visit(fn.body);
  }

  cache.set(sf, out);
  return out;
}
