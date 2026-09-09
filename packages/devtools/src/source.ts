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
  /**
   * The node came from a dependency rather than from the project. Only ever set when the
   * compiler was told to mark dependencies too; otherwise they carry no location at all.
   */
  external?: boolean;
  /**
   * Where this is in the compiled output, when the location above came from a source map.
   *
   * Both are worth having. The original says which component and which file; the compiled one
   * says which of that component's bindings, because a template's holes all map back to the
   * position the template opens at — one entry per emitted root is all the map has. Until
   * that changes, the compiled line is the only thing that tells two bindings apart.
   */
  compiled?: { line?: number; column?: number };
}

/** A location, plus the variable name the source gave it when there was one. */
export interface ReactiveSourceMetadata {
  name?: string;
  location?: ReactiveSourceLocation;
}

/** Kept in step with SOURCE_MARKER and COMPONENT_MARKER in the compiler. */
const MARKER = '__fx_source';
const COMPONENT_MARKER = '__fx_component';
const HOLE_MARKER = '__fx_hole';

let pending: ReactiveSourceMetadata | null = null;
let expiring = false;

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
  const location = locate(file, line, column);
  // With dependencies marked, `signal()` in the framework marks its own `createSignal` line
  // in between the application's mark and the node it asked for. The call site is the useful
  // location, so a dependency never takes a mark the project has already left unclaimed.
  if (pending && location.external && !pending.location?.external) return;
  pending = { name, location };
  expiring = false;
}

/**
 * A project file is named relative to the project root, so anything absolute or under
 * node_modules came from a dependency. Derived here rather than sent, so the mark the
 * compiler emits stays the four arguments it has always been.
 */
function locate(file?: string, line?: number, column?: number): ReactiveSourceLocation {
  const external = !!file && (/^([a-zA-Z]:)?[\\/]/.test(file) || file.includes('node_modules/'));
  return external ? { file, line, column, external } : { file, line, column };
}

/** Record where a component was declared. The compiler calls this. */
export function markComponentSource(name: string, file?: string, line?: number, column?: number): void {
  const seen = components.get(name);
  const next = locate(file, line, column);
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

/**
 * Reading keeps it for the rest of the turn.
 *
 * One statement can make several nodes: `createStore({ a, b })` builds a signal per key
 * inside the framework, and all of them belong to the line that asked for the store. So the
 * mark survives the read and is dropped on the next microtask, which is the end of the
 * statement that left it as far as anything synchronous is concerned.
 */
export function takeReactiveSource(): ReactiveSourceMetadata | null {
  const mark = pending;
  if (mark) {
    // The variable name belongs to the node the author was declaring, not to the ones the
    // framework built underneath it — `cart`, then two unnamed signals at the same line.
    if (mark.name !== undefined) pending = { location: mark.location };
    if (!expiring) {
      expiring = true;
      queueMicrotask(() => {
        expiring = false;
        pending = null;
      });
    }
  }
  return mark;
}

/** Never replaces an existing marker: two copies of devtools would each hold half the marks. */
/**
 * Where each hole was written, by the accessor the compiler stamped. Keyed by the function,
 * not a slot: it is built and read at different moments.
 */
const HOLES = new WeakMap<object, ReactiveSourceLocation>();

/** Returns the accessor, not a wrapper: it is the binding's value. */
function markHole<T>(accessor: T, line: number, column: number): T {
  if (accessor && (typeof accessor === 'object' || typeof accessor === 'function')) {
    HOLES.set(accessor as object, { line, column });
  }
  return accessor;
}

/** The hole an accessor came from, when the compiler marked it. */
export function holeLocation(accessor: unknown): ReactiveSourceLocation | undefined {
  return accessor && (typeof accessor === 'object' || typeof accessor === 'function')
    ? HOLES.get(accessor as object)
    : undefined;
}

export function installSourceMarker(): void {
  const host = globalThis as Record<string, unknown>;
  if (typeof host[MARKER] !== 'function') host[MARKER] = markReactiveSource;
  if (typeof host[COMPONENT_MARKER] !== 'function') host[COMPONENT_MARKER] = markComponentSource;
  if (typeof host[HOLE_MARKER] !== 'function') host[HOLE_MARKER] = markHole;
}
