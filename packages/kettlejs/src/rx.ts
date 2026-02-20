// /**
//  * @fileoverview Reactive Primitives Export for KettleJS
//  * @module @awc/kettlejs/rx
//  *
//  * This module provides a convenient alias for importing reactive primitives.
//  * It re-exports all reactive functions from @awc/reactive/signal.
//  *
//  * Usage:
//  * ```typescript
//  * import { createSignal, createEffect, createMemo } from '@awc/kettlejs/rx';
//  * ```
//  *
//  * This is equivalent to:
//  * ```typescript
//  * import { createSignal, createEffect, createMemo } from '@awc/reactive/signal';
//  * ```
//  *
//  * Note: The Babel plugin automatically transforms '@awc/kettlejs/rx' imports
//  * to '@awc/reactive/signal' for optimal bundling.
//  */

// // Re-export all reactive primitives from @awc/reactive/signal
// export {
//   // Core signals
//   createSignal,
//   createEffect,
//   createMemo,
//   createRoot,

//   // Batching and tracking
//   batch,
//   untrack,

//   // Ownership
//   getOwner,
//   runWithOwner,

//   // Cleanup
//   onCleanup,

//   // Context
//   createContext,
//   useContext,

//   // Additional reactive primitives
//   createComputed,
//   createRenderEffect,
//   createDeferred,
//   createSelector,

//   // Utilities
//   from,
//   observable,
//   mapArray,
//   indexArray,
// } from '@awc/reactive/signal';

// // Re-export types
// export type {
//   Signal,
//   Accessor,
//   Setter,
//   SignalOptions,
//   Owner,
//   Context,
//   Effect,
//   EffectOptions,
//   Memo,
//   MemoOptions,
// } from '@awc/reactive/signal';

// /**
//  * Default export for convenience
//  */
// export default {
//   createSignal,
//   createEffect,
//   createMemo,
//   createRoot,
//   batch,
//   untrack,
//   getOwner,
//   runWithOwner,
//   onCleanup,
//   createContext,
//   useContext,
// };

// // Note: Import from '@awc/reactive/signal' directly
// import {
//   createSignal,
//   createEffect,
//   createMemo,
//   createRoot,
//   batch,
//   untrack,
//   getOwner,
//   runWithOwner,
//   onCleanup,
//   createContext,
//   useContext,
//   createComputed,
//   createRenderEffect,
//   createDeferred,
//   createSelector,
//   from,
//   observable,
//   mapArray,
//   indexArray,
// } from '@awc/reactive/signal';
