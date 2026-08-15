export * from './vite.js';
export { fluixiRoutesPlugin } from './fluixi-routes-plugin.js';
export type { FluixiRoutesPluginOptions } from './fluixi-routes-plugin.js';
// fluixiElementPlugin moved to @fluixi/element/plugin (wc-element repo).
// Build tooling needs the same answer the plugin gets: @fluixi/start resolves each
// route to the chunk it compiles into, and re-deriving a URL from a filename would be
// a second copy of these conventions.
export { scanRoutes } from './route-scanner.js';
export type { ScannedRoute } from './route-scanner.js';
