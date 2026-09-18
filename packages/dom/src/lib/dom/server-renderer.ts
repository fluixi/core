// `@fluixi/dom/server`, the SSR surface. The same imperative runtime
// (insert/spread/Show/For/createComponent) builds a serializable ServerNode tree
// under server mode, which renderToString turns into HTML. Kept separate from the
// client entry so client bundles don't ship the renderer.
export * from './server/index.js';
