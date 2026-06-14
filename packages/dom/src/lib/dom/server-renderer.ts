/**
 * Deprecated. The original content here was a standalone walker over old
 * `jsx`-backend vnodes ({type, props, children}); it never integrated the
 * reactive runtime and could not render the imperative backend every app now
 * uses. It has been replaced by the universal string renderer in ./server,
 * where the same runtime (insert/spread/Show/For/createComponent) builds a
 * serializable ServerNode tree under server mode.
 *
 * Kept as a re-export so any direct import of this path resolves to the real
 * renderer. Prefer importing renderToString from '@fluixi/dom'.
 */
export { renderToString, serializeNode, isServer, setServerMode } from './server/index.js';
