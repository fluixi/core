/**
 * Type errors inside `${…}` holes, checked against the MAIN program.
 *
 * A `${(it) => it.nope}` is a real expression in a real file — TypeScript has
 * already parsed and bound it. The only thing it lacks is a contextual type for
 * `it`, which is why the mistake goes unreported: `it` is implicitly `any`, and
 * every property access on `any` is allowed.
 *
 * So rather than building a parallel document to make the checker see the
 * template, we supply the missing type ourselves (the same inference hover uses)
 * and ask the checker whether each property access holds. Spans are real source
 * positions, so nothing needs mapping — and nothing is added to the program, no
 * second service exists, and the host is never touched.
 *
 * The trade-off is honest: this catches property access on an inferred parameter,
 * which is the mistake templates actually produce. It is not a general type-check
 * of hole contents.
 */
import type * as TS from 'typescript';
import type { ElementNode, ExpressionNode, TemplateNode } from '@fluixi/template-parser';
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
 * A signal read without calling it.
 *
 * `${count}` in child position renders the function object and never updates;
 * `${count()}` is what was meant — the compiler wraps a call in a reactive insert.
 * The editor's existing rule for this covers JSX only, so html`` templates had no
 * equivalent despite it being the same mistake.
 *
 * Scoped hard to keep it honest: only a bare identifier, only in the children of a
 * NATIVE element, and only when its type is callable with no required arguments.
 * A component legitimately receives accessors (`<For each=${items}>`), and a
 * render-prop child is a function on purpose — neither is touched.
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
        if (node.kind === 'Expression' && parent?.kind === 'Element') {
          const expression = holes[(node as ExpressionNode).hole];
          if (expression && ts.isIdentifier(expression) && isAccessor(ts, checker, expression)) {
            out.push({
              file: sf,
              start: expression.getStart(sf),
              length: expression.getWidth(sf),
              category: ts.DiagnosticCategory.Warning,
              code: ACCESSOR_NOT_CALLED,
              messageText:
                `'${expression.text}' is an accessor — call it (\`${expression.text}()\`). ` +
                'Left bare it renders the function and never updates.',
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

/** Callable with no required arguments, and returns something — i.e. a signal read. */
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
export function templateDiagnostics(
  ts: typeof TS,
  ls: TS.LanguageService,
  fileName: string,
): TS.Diagnostic[] {
  const program = ls.getProgram();
  const sf = program?.getSourceFile(fileName);
  if (!program || !sf) return [];

  const checker = program.getTypeChecker();
  const out: TS.Diagnostic[] = [];

  out.push(...accessorDiagnostics(ts, program, sf));

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

  return out;
}
