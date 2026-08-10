/**
 * The CLI commands.
 *
 * Kept off the package root deliberately: these reach the dev server, the build
 * and the prerenderer, and a module that only wants `defineMiddleware` should not
 * be able to pull a bundler in behind it. That matters at build time — a deploy
 * adapter inlines everything the entry can reach, and reaching this would put
 * vite in a worker.
 */
export { dev } from './dev.js';
export { build } from './build.js';
export { start } from './start.js';
export { prerender } from './prerender.js';
