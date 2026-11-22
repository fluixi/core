// createComponent lives here. It used to live in core and be registered through the
// slot below, which left the runtime with a fallback that re-invoked a component on
// every read, a list rebuilt every node whenever it changed, and only for consumers
// who had not loaded core. The slot stays so a host can still override it.

import { untrack, isSignal, reportReactiveProps } from '@fluixi/reactive';
import { runWithOwner } from '@fluixi/reactive/signal';
import { asComponent } from '../component/modifiers.js';
import { hydrationKeys } from './hydration-state.js';
import type { CreateComponentReturnType } from './types.js';
import { isDevelopment } from './dev-env.js';
// `__DEV__` is folded by a build that defines it, so a bundler drops the devtools reporting it
// guards; without it the check reads NODE_ENV. Written inline at each use.
declare const __DEV__: boolean | undefined;

type CreateComponentFn = (fn: () => any, props?: any) => any;

// On globalThis so every bundled copy shares the slot.
const _slotKey = '__fx_dom_create_component__';
const _slot: { fn: CreateComponentFn | null } =
  ((globalThis as any)[_slotKey] ??= { fn: null });

export interface IntegrationOptions {
  // Only createComponent is read; rest ignored (kept for old callers).
  signalSystem?: { createComponent?: CreateComponentFn } & Record<string, any>;
  storeSystem?: Record<string, any>;
}

export function registerCreateComponent(createComponent: CreateComponentFn): void {
  _slot.fn = createComponent;
}

// Old init entry, now just picks createComponent off the passed system.
export function initializeIntegration(options: IntegrationOptions = {}): void {
  const cc = options.signalSystem?.createComponent;
  if (cc) _slot.fn = cc;
}

export function createComponent<T extends (props?: any) => any, U = any>(
  Comp: T,
  props?: U | undefined,
): CreateComponentReturnType<T, U> {
  // Before anything the component builds, now or in a memo later: its hydration keys.
  const scope = hydrationKeys()?.scope() as Parameters<typeof runWithOwner>[0] | null | undefined;
  if (scope) return runWithOwner(scope, () => build(Comp, props));
  return build(Comp, props);
}

function build<T extends (props?: any) => any, U = any>(Comp: T, props?: U): CreateComponentReturnType<T, U> {
  if (_slot.fn) return _slot.fn(Comp, props);

  // Before the call, so the computation this is created inside is still the running one.
  // A property read when nobody is watching.
  if ((typeof __DEV__ !== 'undefined' ? __DEV__ : isDevelopment()) && props) reportReactiveProps(props);

  // Untracked: a component reading a signal while it is created must not make its
  // caller depend on that signal, or the caller re-runs and rebuilds the subtree.
  const component = typeof Comp === 'function' ? untrack(() => Comp(props)) : Comp;

  // Primitives cannot carry properties, and a signal must not be stamped as a
  // component or the runtime caches it as a static thunk.
  const nameable =
    component != null && (typeof component === 'function' || typeof component === 'object');
  if (nameable) {
    // The name goes on whatever came back, reactive or not. Only `asComponent` has to skip a
    // signal, the runtime would cache it as a static thunk. Nothing reads `$name` but a
    // watcher, and skipping it there hid every component that returns another one: an App
    // whose whole body is `<Router/>` was named nowhere.
    try {
      (component as any)['$name'] = (Comp as any)?.name;
    } catch {
      /* frozen or exotic object */
    }
  }
  if (nameable && !isSignal(component)) {
    return asComponent(component) as CreateComponentReturnType<T, U>;
  }
  return component as CreateComponentReturnType<T, U>;
}

export const intergartionInitialized = (): boolean => _slot.fn !== null;
export const isIntegrationInitialized = (): boolean => _slot.fn !== null;

export function resetIntegration(): void {
  _slot.fn = null;
}
