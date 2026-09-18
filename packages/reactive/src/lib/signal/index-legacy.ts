/**
 * The legacy (pre-TC39) reactive core: available only at `@fluixi/reactive/signal-legacy`.
 *
 * `@fluixi/reactive/signal` (and the relative `./index.js`) now resolve to the TC39 core
 * (see ./index.ts). This module keeps the original implementation intact as an explicit
 * opt-out / fallback. Nothing here is changed; it is the former contents of ./index.ts.
 */
export * from './signal.js';
export * from './utilities.js';
export * from './cached-resource.js';
export * from './list.js';
