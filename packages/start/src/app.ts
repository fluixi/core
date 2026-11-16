/**
 * @fluixi/start/app: what an app provides, declared once.
 *
 * Root providers used to be registered by hand in both entries, and forgetting the server
 * one is silent: the SSR render throws, falls back to the client, and the page is only
 * slower. `src/app.config.ts` is the one list. The start plugin registers it before either
 * entry runs, and before any API route or server function in dev.
 *
 *   // src/app.config.ts: both sides
 *   export default defineApp({ imports: [AuthModule] });
 *
 *   // src/app.config.server.ts: SSR only, optional
 *   export default defineApp({ imports: [SessionModule], middleware: [...] });
 *
 * The server file is separate for the same reason `.server` files are elsewhere: a
 * reference to server code from a module the browser imports, even a lazy `import()`,
 * emits that code as a chunk in `dist/client`. Only the SSR build imports this one.
 *
 * A module is a named list, not a scope. Its providers are flattened into the root
 * injector: a singleton in the browser, one per request on the server. Scoping below the
 * root is what `provide()` in a component is for.
 */
import { setModuleScope, type Provider } from '@fluixi/di';
import { adoptReactiveScope, openReactiveScope, reactiveScopeOf, withReactiveScope } from '@fluixi/reactive/signal';
import type { Middleware } from './middleware.js';

const MODULE = Symbol.for('fluixi.module');

export interface ModuleDefinition {
  /** Shown in errors and warnings. */
  name: string;
  /** Modules this one needs. Each is registered once, however many modules import it. */
  imports?: ReadonlyArray<AppModule>;
  /** Root providers. */
  providers?: ReadonlyArray<Provider>;
  /**
   * Request middleware, run ahead of `src/middleware.ts` in `imports` order.
   *
   * Server only: a module carrying middleware belongs in `app.config.server.ts`.
   */
  middleware?: ReadonlyArray<Middleware>;
}

export interface AppModule extends Readonly<ModuleDefinition> {
  readonly [MODULE]: true;
}

export type AppConfig = Omit<ModuleDefinition, 'name'>;

export function defineModule(definition: ModuleDefinition): AppModule {
  return Object.freeze({ ...definition, [MODULE]: true as const });
}

/** Identity helper for `export default` in `app.config.ts` and `app.config.server.ts`. */
export function defineApp(config: AppConfig): AppModule {
  return defineModule({ name: 'app', ...config });
}

export interface CollectedApp {
  providers: Provider[];
  middleware: Middleware[];
  /** Module names in registration order, dependencies first. */
  modules: string[];
  /** Names of modules that carry middleware. */
  withMiddleware: string[];
}

/**
 * Flatten configs and their imports, dependencies first, each module once.
 *
 * Identity decides "once", so two `defineModule` calls with the same name are two
 * modules. A cycle is an error rather than a silent partial registration.
 */
export function collectApp(configs: ReadonlyArray<unknown>): CollectedApp {
  const out: CollectedApp = { providers: [], middleware: [], modules: [], withMiddleware: [] };
  const done = new Set<AppModule>();
  const path: AppModule[] = [];

  const visit = (mod: AppModule, from: string): void => {
    if (!mod || (mod as any)[MODULE] !== true) {
      throw new Error(`[fluixi/app] ${from} imports something that is not a module. Wrap it in defineModule().`);
    }
    if (done.has(mod)) return;
    if (path.includes(mod)) {
      const cycle = [...path.slice(path.indexOf(mod)), mod].map((m) => m.name).join(' → ');
      throw new Error(`[fluixi/app] module import cycle: ${cycle}`);
    }
    path.push(mod);
    // Opened before its imports are visited, so a module a devtools graph draws holds the
    // modules it imports. A module imported twice sits under the first that reached it.
    const scope = openReactiveScope({ kind: 'module', name: mod.name });
    withReactiveScope(scope, () => {
      for (const dep of mod.imports ?? []) visit(dep, `module "${mod.name}"`);
    });
    path.pop();
    done.add(mod);
    out.modules.push(mod.name);
    for (const provider of mod.providers ?? []) {
      setModuleScope(provider, scope);
      // A value built elsewhere, often at import time, whose package opened a scope for it
      // and marked it. Placed at registration: an app that imports the instance directly
      // never asks the injector for it.
      const own = 'useValue' in provider ? reactiveScopeOf(provider.useValue) : undefined;
      if (own) adoptReactiveScope(own, scope);
    }
    out.providers.push(...(mod.providers ?? []));
    if (mod.middleware?.length) {
      out.middleware.push(...mod.middleware);
      out.withMiddleware.push(mod.name);
    }
  };

  for (const config of configs) {
    if (config == null) continue;
    // The file's default export, or the module namespace when the default is missing.
    const mod = (config as any)[MODULE] ? config : (config as any).default;
    if (mod == null) continue;
    visit(mod, 'app.config');
  }
  return out;
}
