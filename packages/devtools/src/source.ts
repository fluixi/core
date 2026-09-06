/**
 * Where a reactive node was created.
 *
 * The compiler marks each creation site in development (`sourceLocations`) by calling the
 * global installed here, just before the statement that makes the node. The instrumented
 * primitive takes the mark and keeps it on the graph node.
 *
 * A single slot, not a stack: in `signal(compute(signal(1)))` the inner call takes the mark
 * and the outer gets none, rather than claiming a location that is not its own.
 */

/** Where in the author's source a node was created. Every field is optional. */
export interface ReactiveSourceLocation {
  file?: string;
  line?: number;
  column?: number;
}

/** A location, plus the variable name the source gave it when there was one. */
export interface ReactiveSourceMetadata {
  name?: string;
  location?: ReactiveSourceLocation;
}

/** Kept in step with SOURCE_MARKER and COMPONENT_MARKER in the compiler. */
const MARKER = '__fx_source';
const COMPONENT_MARKER = '__fx_component';

let pending: ReactiveSourceMetadata | null = null;

/**
 * Where each component was declared, by name.
 *
 * The graph sees the memo the compiler wraps a component in, and all that memo carries back
 * is the name stamped on what the component returned — so name is the only key available.
 * Two components sharing a name are recorded as ambiguous and reported as unknown, since a
 * location pointing at the wrong file is worse than none.
 */
const components = new Map<string, ReactiveSourceLocation | null>();

/**
 * Record where the next node is about to be created. The compiler calls this; call it
 * yourself only for a node the compiler cannot see, immediately before the primitive.
 */
export function markReactiveSource(file?: string, line?: number, column?: number, name?: string): void {
  pending = { name, location: { file, line, column } };
}

/** Record where a component was declared. The compiler calls this. */
export function markComponentSource(name: string, file?: string, line?: number, column?: number): void {
  const seen = components.get(name);
  const next: ReactiveSourceLocation = { file, line, column };
  if (seen === undefined) {
    components.set(name, next);
    return;
  }
  if (!seen || seen.file !== file || seen.line !== line) components.set(name, null);
}

/** Where a component of this name was declared, when exactly one was. */
export function componentSource(name: string): ReactiveSourceLocation | undefined {
  return components.get(name) ?? undefined;
}

/** Reading clears it: one mark, one node. */
export function takeReactiveSource(): ReactiveSourceMetadata | null {
  const mark = pending;
  pending = null;
  return mark;
}

/** Never replaces an existing marker: two copies of devtools would each hold half the marks. */
export function installSourceMarker(): void {
  const host = globalThis as Record<string, unknown>;
  if (typeof host[MARKER] !== 'function') host[MARKER] = markReactiveSource;
  if (typeof host[COMPONENT_MARKER] !== 'function') host[COMPONENT_MARKER] = markComponentSource;
}
