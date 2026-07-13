/**
 * Translate language-service results from the VIRTUAL document back to the real
 * source coordinates, using the per-file segment map on {@link VirtualService}.
 */
import type * as TS from 'typescript';
import type { VirtualService } from './virtual-service.js';

/** Map a virtual diagnostic's span back to source; undefined if it's scaffolding. */
export function mapDiagnostic<T extends TS.Diagnostic>(
  vs: VirtualService,
  fileName: string,
  d: T,
): T | undefined {
  if (d.start === undefined) return d;
  const start = vs.toSrc(fileName, d.start);
  if (start === -1) return undefined; // lives in generated scaffolding — not the user's code
  return { ...d, start };
}

/** Remap a QuickInfo's textSpan back to source. */
export function mapQuickInfo(
  vs: VirtualService,
  fileName: string,
  info: TS.QuickInfo | undefined,
): TS.QuickInfo | undefined {
  if (!info) return undefined;
  const start = vs.toSrc(fileName, info.textSpan.start);
  if (start === -1) return info;
  return { ...info, textSpan: { start, length: info.textSpan.length } };
}

/** Remap a completion list's replacement spans back to source. */
export function mapCompletions(
  vs: VirtualService,
  fileName: string,
  list: TS.CompletionInfo | undefined,
): TS.CompletionInfo | undefined {
  if (!list) return undefined;
  const remapSpan = (span?: TS.TextSpan): TS.TextSpan | undefined => {
    if (!span) return undefined;
    const start = vs.toSrc(fileName, span.start);
    return start === -1 ? undefined : { start, length: span.length };
  };
  return {
    ...list,
    optionalReplacementSpan: remapSpan(list.optionalReplacementSpan),
    entries: list.entries.map((e) => ({ ...e, replacementSpan: remapSpan(e.replacementSpan) })),
  };
}
