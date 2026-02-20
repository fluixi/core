/**
 * @fileoverview Server exports for KettleJS
 * @module @awc/kettlejs/server
 *
 * This module provides server-side rendering and hydration utilities.
 * Import from '@awc/kettlejs/server' for SSR functionality.
 *
 * IMPORTANT: Server Reactive Behavior
 * ====================================
 * This module maps reactive primitives to server-appropriate behavior,
 * following SolidJS pattern and GEMINI.md Section 4 (SERVER MODE):
 *
 * - createSignal: Returns snapshot value (no reactivity)
 * - createEffect: Runs once, no tracking, no scheduling
 * - createMemo: Computes once, returns static accessor
 * - createContext: Lookup-based, no subscriptions
 * - batch: Executes immediately (no batching)
 * - untrack: Just runs function (already untracked)
 *
 * Use these instead of client reactive primitives in server code:
 *
 * @example Server-Side Rendering
 * ```typescript
 * import {
 *   renderToString,
 *   createSignal,
 *   createEffect,
 *   setHydrationData
 * } from '@awc/kettlejs/server';
 *
 * // Server: Signals are snapshots, effects run once
 * const App = () => {
 *   const [count, setCount] = createSignal(0);
 *
 *   createEffect(() => {
 *     console.log('Runs once:', count());
 *   });
 *
 *   setHydrationData('initial-count', count());
 *
 *   return html`<div>Count: ${count()}</div>`;
 * };
 *
 * const html = await renderToString(() => App());
 * ```
 *
 * @example Context on Server
 * ```typescript
 * import { createContext, useContext } from '@awc/kettlejs/server';
 *
 * const ThemeContext = createContext('light');
 *
 * // Server: Context lookup, no subscriptions
 * const App = () => {
 *   return html`
 *     <${ThemeContext.Provider} value="dark">
 *       <${Child} />
 *     </${ThemeContext.Provider}>
 *   `;
 * };
 * ```
 */

export * from './lib/server/index.js';
