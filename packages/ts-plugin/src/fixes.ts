/**
 * Quick fixes for the plugin's own diagnostics.
 *
 * A diagnostic you can't act on is half a feature: the editor shows a squiggle,
 * and the fix: which the rule already knows exactly, is left to be typed by
 * hand. Every rule that can name its remedy should offer it.
 *
 * These are keyed to the plugin's diagnostic codes, so they appear alongside
 * TypeScript's own fixes rather than replacing them.
 */
import type * as TS from 'typescript';
import { ACCESSOR_NOT_CALLED, templateDiagnostics } from './diagnostics.js';

/**
 * Fixes for a span. Returns only fixes for the plugin's codes; TypeScript's are
 * added by the caller, which leaves its own list untouched.
 */
export function templateCodeFixes(
  ts: typeof TS,
  ls: TS.LanguageService,
  fileName: string,
  start: number,
  end: number,
  errorCodes: readonly number[],
): TS.CodeFixAction[] {
  if (!errorCodes.includes(ACCESSOR_NOT_CALLED)) return [];

  const out: TS.CodeFixAction[] = [];
  for (const diagnostic of templateDiagnostics(ts, ls, fileName)) {
    if (diagnostic.code !== ACCESSOR_NOT_CALLED || diagnostic.start === undefined) continue;
    // The editor asks about a span, not a point; match anything overlapping it.
    if (diagnostic.start > end || diagnostic.start + (diagnostic.length ?? 0) < start) continue;

    const at = diagnostic.start + (diagnostic.length ?? 0);
    const name = diagnostic.file?.text.slice(diagnostic.start, at) ?? 'value';

    out.push({
      fixName: 'fluixiCallAccessor',
      description: `Call '${name}'`,
      changes: [
        {
          fileName,
          textChanges: [{ span: { start: at, length: 0 }, newText: '()' }],
        },
      ],
      // Every occurrence in the file is the same edit, so offer to do them at once.
      fixAllDescription: 'Call every uncalled accessor in this file',
    });
  }
  return out;
}

/** The same edit applied to every occurrence in the file. */
export function templateFixAll(
  ts: typeof TS,
  ls: TS.LanguageService,
  fileName: string,
  errorCodes: readonly number[],
): TS.CombinedCodeActions | undefined {
  if (!errorCodes.includes(ACCESSOR_NOT_CALLED)) return undefined;

  const textChanges: TS.TextChange[] = [];
  for (const diagnostic of templateDiagnostics(ts, ls, fileName)) {
    if (diagnostic.code !== ACCESSOR_NOT_CALLED || diagnostic.start === undefined) continue;
    const at = diagnostic.start + (diagnostic.length ?? 0);
    textChanges.push({ span: { start: at, length: 0 }, newText: '()' });
  }
  if (textChanges.length === 0) return undefined;

  // Later edits first, so applying one doesn't shift the offsets of the next.
  textChanges.sort((a, b) => b.span.start - a.span.start);
  return { changes: [{ fileName, textChanges }], commands: undefined };
}
