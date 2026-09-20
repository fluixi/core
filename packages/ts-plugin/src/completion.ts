/**
 * Member completion for inferred callback params inside html`` templates.
 *
 * At `${(it) => it.|}` TypeScript sees `it` as implicit `any`, so its own
 * completion offers nothing useful. We infer `it`'s type from the template
 * (each item, event, ref/use element, …) and return that type's members, the
 * same list JSX would show. Runs entirely on the main language service.
 */
import type * as TS from 'typescript';
import { inferParamAt } from './infer.js';

export function paramMemberCompletions(
  ts: typeof TS,
  ls: TS.LanguageService,
  fileName: string,
  position: number,
): TS.CompletionEntry[] | undefined {
  const program = ls.getProgram();
  const sf = program?.getSourceFile(fileName);
  if (!program || !sf) return undefined;

  // A member access `expr.name` (possibly incomplete: `expr.`) under the cursor.
  const access = propertyAccessAt(ts, sf, position);
  if (!access || !ts.isIdentifier(access.expression)) return undefined;

  // Is the accessed identifier an inferred callback param? Infer at its position.
  const info = inferParamAt(ts, program, sf, access.expression.getStart(sf));
  if (!info || info.paramName !== access.expression.text || !info.type) return undefined;

  const checker = program.getTypeChecker();
  const already = new Set<string>();
  const entries: TS.CompletionEntry[] = [];
  for (const p of checker.getApparentType(info.type).getProperties()) {
    const name = p.getName();
    if (already.has(name) || name.startsWith('__')) continue;
    already.add(name);
    entries.push({
      name,
      kind: memberKind(ts, p),
      kindModifiers: '',
      sortText: '0_' + name,
      insertText: name,
    });
  }
  return entries.length ? entries : undefined;
}

function memberKind(ts: typeof TS, sym: TS.Symbol): TS.ScriptElementKind {
  if (sym.flags & ts.SymbolFlags.Method) return ts.ScriptElementKind.memberFunctionElement;
  return ts.ScriptElementKind.memberVariableElement;
}

/** The property-access expression whose `.` sits just before `position`, if any. */
function propertyAccessAt(ts: typeof TS, sf: TS.SourceFile, position: number): TS.PropertyAccessExpression | undefined {
  let found: TS.PropertyAccessExpression | undefined;
  const visit = (node: TS.Node): void => {
    if (position < node.getFullStart() || position > node.getEnd()) return;
    if (ts.isPropertyAccessExpression(node) && position > node.expression.getEnd() && position <= node.getEnd()) {
      found = node;
    }
    node.forEachChild(visit);
  };
  sf.forEachChild(visit);
  return found;
}
