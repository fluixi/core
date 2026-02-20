/**
 * @fileoverview Directives for KettleJS
 * @module @awc/kettlejs/directives
 *
 * This module provides custom directives for enhanced template functionality.
 */

// Ref directive
export { ref, createRef } from './ref.js';
export type { RefCallback, RefObject } from './ref.js';

// Signal directive
export {
  signal,
  signalTransform,
  signalWhen,
  combineSignals,
} from './signal.js';

// Re-export useful Lit directives
export { classMap } from 'lit/directives/class-map.js';
export { styleMap } from 'lit/directives/style-map.js';
export { ifDefined } from 'lit/directives/if-defined.js';
export { cache } from 'lit/directives/cache.js';
export { guard } from 'lit/directives/guard.js';
export { repeat } from 'lit/directives/repeat.js';
export { until } from 'lit/directives/until.js';
export { asyncAppend } from 'lit/directives/async-append.js';
export { asyncReplace } from 'lit/directives/async-replace.js';
export { live } from 'lit/directives/live.js';
export { map } from 'lit/directives/map.js';
export { range } from 'lit/directives/range.js';
export { join } from 'lit/directives/join.js';
export { when } from 'lit/directives/when.js';
export { choose } from 'lit/directives/choose.js';

export type { ClassInfo } from 'lit/directives/class-map.js';
export type { StyleInfo } from 'lit/directives/style-map.js';

// html is now exported from the main barrel (index.ts) via @awc/dom
