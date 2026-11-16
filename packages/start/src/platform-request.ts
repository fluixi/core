/**
 * The request being answered, available to the render without the entry passing it on.
 *
 * Middleware writes to the locals of the platform request (the signed-in user, a request
 * id) and the render reads them back, but only when the entry forwards `request` to the
 * render. The scaffolded entry did not, so every page rendered as a visitor nobody had
 * signed in. Running the entry inside this scope lets `@fluixi/dom` adopt the request
 * itself; an entry that does forward it is unaffected.
 *
 * The store sits in the global registry, keyed the way `@fluixi/dom` reads it, so a server
 * bundle with its own copy of that package still finds it.
 */
import { endRequestScope } from '@fluixi/server';

type Store = { getStore(): object | undefined; run<R>(request: object, fn: () => R): R };
type ALSCtor = new () => Store;

const KEY = Symbol.for('fluixi.platformRequest');

/** AsyncLocalStorage without importing `node:async_hooks`, so edge builds stay clean. */
function resolveALS(): ALSCtor | undefined {
  const g = (globalThis as { AsyncLocalStorage?: ALSCtor }).AsyncLocalStorage;
  if (g) return g;
  const proc = (globalThis as { process?: { getBuiltinModule?: (id: string) => { AsyncLocalStorage?: ALSCtor } } })
    .process;
  try {
    return proc?.getBuiltinModule?.('node:async_hooks')?.AsyncLocalStorage;
  } catch {
    return undefined;
  }
}

/**
 * Without AsyncLocalStorage: the request is set for the synchronous part of `fn`, which is
 * where a render creates its context, and restored afterwards.
 */
function syncStore(): Store {
  let current: object | undefined;
  return {
    getStore: () => current,
    run(request, fn) {
      const previous = current;
      current = request;
      try {
        return fn();
      } finally {
        current = previous;
      }
    },
  };
}

function store(): Store {
  const registry = globalThis as Record<symbol, Store | undefined>;
  if (!registry[KEY]) {
    const ALS = resolveALS();
    registry[KEY] = ALS ? new ALS() : syncStore();
  }
  return registry[KEY]!;
}

/** Run `fn`, typically the entry's render, with `request` as the one being answered. */
export function withPlatformRequest<R>(request: object, fn: () => R): R {
  return store().run(request, fn);
}

/**
 * Answer `request` inside its own scope, from the first middleware to the response, then end
 * it: middleware and the handler behind it share per-request state (the root injector), and
 * what was registered for the request is released once the response exists.
 */
export async function answerRequest(request: Request, fn: () => Promise<Response>): Promise<Response> {
  return withPlatformRequest(request, async () => {
    try {
      return await fn();
    } finally {
      endRequestScope(request);
    }
  });
}
