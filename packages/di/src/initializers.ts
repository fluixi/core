/**
 * Work that has to finish before the app renders: loading remote settings, warming a cache,
 * restoring a session.
 *
 * @module
 */
import { beforeFirstRender, renderStarted } from '@fluixi/dom';
import { rootInjector } from './hierarchy.js';
import { runInInjectionContext } from './inject.js';
import { state } from './state.js';
import type { Injector } from './injector.js';
import type { Provider } from './provider.js';
import { injectionToken, type Token } from './token.js';

/**
 * The functions given to {@link provideAppInitializer}, as a `multi` token: `inject(APP_INITIALIZER)`
 * answers them in registration order. Read by {@link runAppInitializers}; rarely used directly.
 */
export const APP_INITIALIZER: Token<Array<() => unknown>> = injectionToken<Array<() => unknown>>('AppInitializer');

/**
 * A provider that runs `fn` before the app renders. List it with the app's root providers; the
 * framework calls {@link runAppInitializers} before the first render. `fn` runs in the root's
 * injection context, so it may call `inject()`.
 *
 * @param fn - The work to run. May return a promise, which is awaited before the next initializer.
 * @returns A provider to pass to `provideRoot()` or an app module's providers.
 *
 * @example
 * ```ts
 * provideRoot([
 *   provideAppInitializer(async () => {
 *     await inject(Settings).load();
 *   }),
 * ]);
 * ```
 */
export function provideAppInitializer(fn: () => unknown): Provider<() => unknown> {
  return { provide: APP_INITIALIZER as unknown as Token<() => unknown>, useValue: fn, multi: true };
}

/**
 * Run every app initializer `injector` holds, one after another in registration order, awaiting
 * each. The first that throws or rejects stops the rest, and the returned promise rejects with
 * its error: an app that could not initialize should not render as if it had.
 *
 * @param injector - Whose initializers to run. Defaults to the current root.
 * @returns A promise settled when every initializer has finished.
 */
export async function runAppInitializers(injector: Injector = rootInjector()): Promise<void> {
  for (const run of injector.get(APP_INITIALIZER, { optional: true }) ?? []) await runInInjectionContext(injector, run);
}

// Before the app's first render: in each request's root on the server, in the page's root in the
// browser. Without initializers nothing runs, and a request builds no root for them.
beforeFirstRender(() => {
  if (!state.rootProviders.some(isInitializer)) return;
  return runAppInitializers();
});

const isInitializer = (p: Provider): boolean => p.provide.id === APP_INITIALIZER.id;

// Read as written, not behind `typeof process`: bundlers replace `process.env.NODE_ENV` in
// browser code, where `process` itself does not exist.
declare const process: { env: Record<string, string | undefined> };
function production(): boolean {
  try {
    return process.env.NODE_ENV === 'production';
  } catch {
    return false;
  }
}

/**
 * Warn, outside production, about an initializer registered once the app has started rendering:
 * from a module a route imports, typically. It missed that render, and the page's in the browser.
 */
export function warnLateInitializers(providers: ReadonlyArray<Provider>): void {
  // Asked of dom, not kept here: this module may load only after the render began (imported by a
  // route's chunk), and then its own first-render hook never ran to say so.
  if (!renderStarted() || !providers.some(isInitializer) || production()) return;
  console.warn(
    '[fluixi/di] provideAppInitializer() was registered after the app started rendering, so it did not run before ' +
      'this render, and in the browser it never runs. Register it in an app module (app.config.ts) or the entry.',
  );
}
