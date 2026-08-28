/**
 * @fileoverview Server exports for Fluixi
 * @module @fluixi/core/server
 *
 * This module provides server-side rendering and hydration utilities.
 * Import from '@fluixi/core/server' for SSR functionality.
 *
 * Server Reactive Behavior
 * ====================================
 * This module maps reactive primitives to server-appropriate behavior,
 * following the SolidJS server model:
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
 * } from '@fluixi/core/server';
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
 * import { createContext, useContext } from '@fluixi/core/server';
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
