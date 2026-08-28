/**
 * The file-system route tree.
 *
 * ```ts
 * import { routes } from '@fluixi/core/routes';
 * ```
 *
 * This module is a **typed stand-in**. `fluixiRoutesPlugin` intercepts the specifier and
 * serves the generated tree in its place, so what you import at runtime is the real thing
 * scanned from `src/routes`.
 *
 * It exists as a real module so the types come from this package rather than from an
 * ambient `declare module` the plugin writes into your `src/`. That generated file could
 * drift, raised a gitignore question, and left `virtual:fluixi-routes` invisible to
 * anything not running the Vite plugin — plain `tsc`, an editor, a test runner.
 *
 * `virtual:fluixi-routes` still resolves, so existing apps keep working.
 */
import type { RouteDefinition } from './lib/router/index.js';

/**
 * Reaching this code means the plugin did not replace the module.
 *
 * The alternative — exporting an empty array — is worse than it looks: the app builds, the
 * router mounts, and every route 404s with nothing to explain why. A virtual specifier at
 * least failed loudly when the plugin was missing, and giving that up for better types
 * should not also give up the error. TypeScript never evaluates this, so type-checking is
 * unaffected.
 */
function missingPlugin(): never {
  throw new Error(
    "[fluixi] '@fluixi/core/routes' was imported but fluixiRoutesPlugin did not replace it, " +
      'so there is no route tree. Add the plugin to your Vite config — or, in a @fluixi/start ' +
      'app, build with `fluixi build`/`fluixi dev` rather than calling vite directly.',
  );
}

/** Routes discovered under the configured routes directory (default `src/routes`). */
export const routes: RouteDefinition[] = new Proxy([] as RouteDefinition[], {
  get: (target, key) =>
    // `then` is probed by any `await`; answering undefined keeps this from looking thenable.
    key === 'then' ? undefined : missingPlugin(),
});
