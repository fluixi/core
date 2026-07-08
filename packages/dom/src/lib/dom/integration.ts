// createComponent lives in @fluixi/core, not the reactive core, so the runtime
// can't import it — core registers it here at startup. Everything else the runtime
// needs comes straight from @fluixi/reactive (shared globalThis graph, no bridge).

import type { CreateComponentReturnType } from './types.js';

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

// Old init entry — now just picks createComponent off the passed system.
export function initializeIntegration(options: IntegrationOptions = {}): void {
  const cc = options.signalSystem?.createComponent;
  if (cc) _slot.fn = cc;
}

export function createComponent<T extends (props?: any) => any, U = any>(
  Comp: T,
  props?: U | undefined,
): CreateComponentReturnType<T, U> {
  if (_slot.fn) return _slot.fn(Comp, props);
  return (() => Comp(props)) as any;
}

export const intergartionInitialized = (): boolean => _slot.fn !== null;
export const isIntegrationInitialized = (): boolean => _slot.fn !== null;

export function resetIntegration(): void {
  _slot.fn = null;
}
