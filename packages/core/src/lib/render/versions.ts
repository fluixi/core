/**
 * Register this package's version with the DOM runtime, which owns the stamping.
 *
 * It used to be owned here, and stamped only by core's `render` — so an app that reached
 * the DOM any other way (`startClient` → `hydrate` → the dom runtime's `render`) got no
 * version attributes at all. Every SSR app is in that position, including the docs site.
 *
 * The stamping therefore moved down to `@fluixi/dom`, which both paths pass through. The
 * core version cannot be imported from there — core depends on dom, and reversing that is
 * a cycle — so it is pushed down instead, on import.
 *
 * Read from a generated constant rather than `package.json`: bundlers and ESM resolvers
 * treat a manifest import inconsistently, and it would pull the whole file into the bundle
 * for one string.
 */
import { registerCoreVersion } from '@fluixi/dom';
import { VERSION as CORE } from '../../version.generated.js';

registerCoreVersion(CORE);

// Re-exported so existing importers keep working, and so core's own `render` — which does
// not delegate to the dom runtime's `render` — can still stamp.
export { stampVersions, warnOnVersionSkew, versions, type FluixiVersions } from '@fluixi/dom';
