/**
 * The reactive primitives the compiler knows by name, in one place.
 *
 * Two ways to write the same thing. The runtime call, which needs an import and works
 * without us:
 *
 *   import { createSignal } from '@fluixi/reactive/signal';
 *   const count = createSignal(0);
 *
 * And the intrinsic, which the compiler resolves and imports for you:
 *
 *   const count = $signal(0);
 *
 * They are not two reactive systems. `$signal` compiles to the same `createSignal` call,
 * so there's one graph, one lifecycle, one SSR story. The `$` form is authoring sugar
 * the compiler understands; the runtime form stays public, because a library that never
 * runs this compiler still has to be able to write reactive code.
 *
 * Everything the compiler needs to know about a primitive lives in this table rather
 * than spread across passes, so adding one is an entry, not a new code path.
 */

/** What a binding holds, once we know where it came from. */
export type ReactiveKind =
  | 'plain'
  /** `signal(0)` — one object, read with `.get()` and written with `.set()`. */
  | 'signal-handle'
  /** `memo(fn)` — read-only, so `.get()` only. */
  | 'memo-handle'
  /** The accessor half of the tuple form, `const [count] = createSignal(0)`. */
  | 'signal-accessor'
  | 'signal-setter'
  | 'memo-accessor'
  | 'effect'
  | 'reactive-object';

export interface Intrinsic {
  /** Runtime export this compiles to. */
  export: string;
  /** Module it comes from. */
  module: string;
  /**
   * What the call yields. A tuple means the call is destructured into that many
   * bindings — `createSignal` gives an accessor and a setter, in that order.
   */
  returns: ReactiveKind | readonly ReactiveKind[];
}

/** Module the reactive primitives are imported from when the compiler adds the import. */
export const REACTIVE_MODULE = '@fluixi/reactive/signal';

/**
 * `$name` → the runtime it stands for.
 *
 * The `$` prefix is reserved. A local binding of the same name wins — it has to, or the
 * compiler would rewrite code that means something else — and that's reported rather
 * than done quietly.
 */
export const INTRINSICS: Readonly<Record<string, Intrinsic>> = {
  $signal: { export: 'signal', module: REACTIVE_MODULE, returns: 'signal-handle' },
  $memo: { export: 'memo', module: REACTIVE_MODULE, returns: 'memo-handle' },
  $effect: { export: 'effect', module: REACTIVE_MODULE, returns: 'effect' },
  $store: { export: 'createStore', module: '@fluixi/reactive/store', returns: 'reactive-object' },
};

/**
 * The runtime names, for the other direction: source that imports `createSignal` gets
 * classified the same way as source that writes `$signal`, so later passes see one
 * vocabulary whichever form the author used.
 */
export const RUNTIME_PRIMITIVES: Readonly<Record<string, Intrinsic['returns']>> = {
  signal: 'signal-handle',
  memo: 'memo-handle',
  effect: 'effect',
  createSignal: ['signal-accessor', 'signal-setter'],
  createMemo: 'memo-accessor',
  createEffect: 'effect',
  createRenderEffect: 'effect',
  createStore: 'reactive-object',
};

/** Modules whose exports count as reactive primitives. */
export const PRIMITIVE_MODULES: readonly string[] = [
  '@fluixi/reactive',
  '@fluixi/reactive/signal',
  '@fluixi/reactive/signal-next',
  '@fluixi/reactive/store',
  '@fluixi/core',
  '@fluixi/core/rx',
];

/**
 * Cheap text check for the file-skipping fast path: a module with no `$` call never
 * needs parsing. Non-global, so it has no lastIndex to carry between calls.
 */
const INTRINSIC_CALL = new RegExp(`\\$(?:${Object.keys(INTRINSICS).map((n) => n.slice(1)).join('|')})\\s*\\(`);

export function mayHaveIntrinsic(code: string): boolean {
  return INTRINSIC_CALL.test(code);
}

export function isIntrinsicName(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(INTRINSICS, name);
}

/** Whether a module path exports the reactive primitives. */
export function isPrimitiveModule(source: string): boolean {
  return PRIMITIVE_MODULES.includes(source);
}
