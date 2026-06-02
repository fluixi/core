// /**
//  * @fileoverview Reactive Primitives Export for KettleJS
//  * @module @fluixi/kettlejs/rx
//  *
//  * This module provides a convenient alias for importing reactive primitives.
//  * It re-exports all reactive functions from @fluixi/reactive/signal.
//  *
//  * Usage:
//  * ```typescript
//  * import { createSignal, createEffect, createMemo } from '@fluixi/kettlejs/rx';
//  * ```
//  *
//  * This is equivalent to:
//  * ```typescript
//  * import { createSignal, createEffect, createMemo } from '@fluixi/reactive/signal';
//  * ```
//  *
//  * Note: The Babel plugin automatically transforms '@fluixi/kettlejs/rx' imports
//  * to '@fluixi/reactive/signal' for optimal bundling.
//  */

// // Re-export all reactive primitives from @fluixi/reactive/signal
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
// } from '@fluixi/reactive/signal';

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
// } from '@fluixi/reactive/signal';

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

// // Note: Import from '@fluixi/reactive/signal' directly
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
// } from '@fluixi/reactive/signal';
