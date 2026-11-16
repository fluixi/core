/**
 * The hierarchy of injectors: the platform (one per process), the root (one per request on the
 * server, disposed when the request ends; one per app in the browser), and the component
 * injectors `provide()` attaches to the reactive owner tree.
 */
import { onRequestEnd, requestScope } from '@fluixi/dom';
import { getOwner } from '@fluixi/reactive/signal';
import { Injector } from './injector.js';
import { state } from './state.js';

/** The process-wide injector: `providePlatform` services and `scope: 'platform'` tokens. */
export function platformInjector(): Injector {
  return (state.platform ??= new Injector(null, 'platform').register(state.platformProviders));
}

/**
 * The root injector: one per request on the server (disposed when the request ends), one per
 * app in the browser. Keyed by the request scope rather than a render's context, so middleware
 * and the page, route or function behind it get the same instances.
 */
export function rootInjector(): Injector {
  const scope = requestScope();
  if (scope) {
    let inj = state.requestRoots.get(scope);
    if (!inj) {
      const root = new Injector(platformInjector(), 'root').register(state.rootProviders);
      state.requestRoots.set(scope, root);
      onRequestEnd(() => {
        state.requestRoots.delete(scope);
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
  if (state.explicit) return state.explicit;
  const owner = getOwner();
  if (owner) return nearestOwnerInjector(owner) ?? rootInjector();
  // A server request is a context of its own: its root is the request's.
  if (requestScope()) return rootInjector();
  // No component, request or explicit injector: after an `await`, in an event handler, at
  // module load. Falling back to the root here returned its instance in place of the one a
  // component provided, with no sign of it.
  throw new Error(
    '[fluixi/di] inject() called outside an injection context (after an await? in an event handler?). ' +
      'Inject during setup and keep the value, or keep the injector (getInjector()) and use runInInjectionContext().',
  );
}
