/**
 * The hierarchy of injectors: the platform (one per process), the root (one per request on the
 * server, disposed when the request ends; one per app in the browser), and the component
 * injectors `provide()` attaches to the reactive owner tree.
 */
import { getRequestContext, onRequestEnd } from '@fluixi/dom';
import { getOwner } from '@fluixi/reactive/signal';
import { Injector } from './injector.js';
import { state } from './state.js';

/** The process-wide injector: `providePlatform` services and `scope: 'platform'` tokens. */
export function platformInjector(): Injector {
  return (state.platform ??= new Injector(null, 'platform').register(state.platformProviders));
}

/**
 * The root injector: one per request during a server render (disposed when the request ends),
 * one per app in the browser.
 */
export function rootInjector(): Injector {
  const ctx = getRequestContext() as object | undefined;
  if (ctx) {
    let inj = state.requestRoots.get(ctx);
    if (!inj) {
      const root = new Injector(platformInjector(), 'root').register(state.rootProviders);
      state.requestRoots.set(ctx, root);
      onRequestEnd(() => {
        state.requestRoots.delete(ctx);
        root.dispose();
      });
      inj = root;
    }
    return inj;
  }
  return (state.clientRoot ??= new Injector(platformInjector(), 'root').register(state.rootProviders));
}

export function nearestOwnerInjector(owner: any): Injector | null {
  let o = owner;
  while (o) {
    const inj = state.ownerInjectors.get(o);
    if (inj) return inj;
    o = o.parent;
  }
  return null;
}

export function currentInjector(): Injector {
  return state.explicit ?? nearestOwnerInjector(getOwner()) ?? rootInjector();
}
