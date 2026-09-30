/**
 * Registration, which is global and happens once.
 *
 * `customElements.define` throws on a repeated name, and a module that registers on
 * import gets evaluated more than once more often than people expect: two bundles on
 * a page, a dev server round trip, a test file importing the module twice. The throw
 * is a `NotSupportedError` that surfaces far from its cause.
 *
 * Registration is also the one part of this package that cannot run on a server. The
 * guard is `isServer()` from @fluixi/dom rather than a `typeof window` test, because
 * that flag is a realm singleton the server renderer sets. Four copies of a local
 * `isServer` was the alpha.83 SSR bug, and this package does not add a fifth.
 */
import { isServer } from '@fluixi/dom';

export interface DefineOptions {
  /** Extend a built-in, as `is="..."`. Safari does not implement this. */
  extends?: string;
}

/** Names this module has defined, so a second call is a no-op rather than a throw. */
const defined = new Map<string, CustomElementConstructor>();

function registry(): CustomElementRegistry | null {
  return typeof customElements === 'undefined' ? null : customElements;
}

/**
 * Register a constructor under a name, at most once.
 *
 * Returns the constructor actually registered, which is the previously registered one
 * when the name is already taken. That matters for a standalone bundle: two copies of
 * the same component on a page should agree on which class the tag upgrades to, and
 * the first to load wins.
 */
export function defineCustomElement(
  name: string,
  constructor: CustomElementConstructor,
  options: DefineOptions = {},
): CustomElementConstructor {
  // A server render in a browser-like realm (a jsdom test) must not define for real. On Node
  // the stand-in registry takes it, so the server renderer can find the element by its tag.
  if (isServer() && typeof HTMLElement !== 'undefined') return constructor;

  const registered = defined.get(name);
  if (registered) return registered;

  const ce = registry();
  // No registry means a non-browser realm that is not the server renderer either,
  // such as a worker. Nothing to register into, and nothing to warn about.
  if (!ce) return constructor;

  const existing = ce.get(name);
  if (existing) {
    // Another bundle got here first. Remember it so this module stops asking.
    defined.set(name, existing);
    return existing;
  }

  ce.define(name, constructor, options.extends ? { extends: options.extends } : undefined);
  defined.set(name, constructor);
  return constructor;
}

/** Whether a name has been claimed, by this module or anyone else. */
export function isDefined(name: string): boolean {
  return defined.has(name) || registry()?.get(name) !== undefined;
}

/**
 * Register only once the tag is actually in the document.
 *
 * A component that costs something to load should not cost it on a page that never
 * uses the tag. The observer disconnects after the first match, so the scan is paid
 * for once.
 */
export function defineWhenUsed(
  name: string,
  load: () => CustomElementConstructor | Promise<CustomElementConstructor>,
  options: DefineOptions = {},
): void {
  if (isServer() || typeof document === 'undefined') return;

  let started = false;
  const start = async (): Promise<void> => {
    if (started) return;
    started = true;
    defineCustomElement(name, await load(), options);
  };

  if (document.querySelector(name)) {
    void start();
    return;
  }

  if (typeof MutationObserver === 'undefined') {
    void start();
    return;
  }

  const observer = new MutationObserver(() => {
    if (!document.querySelector(name)) return;
    observer.disconnect();
    void start();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

/** Test seam: forget what this module has registered. The registry itself is permanent. */
export function resetRegistryTracking(): void {
  defined.clear();
}
