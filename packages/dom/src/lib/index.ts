/**
 * @fileoverview Main entry point for @awc/dom package
 * @module @awc/dom
 *
 * This package provides a comprehensive reactive DOM runtime with fine-grained updates
 * similar to SolidJS's dom-expressions. It includes:
 * - Core DOM manipulation utilities
 * - Reactive rendering with signal/store support
 * - Control flow components (Show, For, Switch, etc.)
 * - Event delegation
 * - Template caching and optimization
 * - Integration with signal and store systems
 */

export * from './dom/index.js';
export * from './dom/integration.js';
export * from './shared/types.js';
export * from './lit/index.js';
export * from './component/index.js';

export type {
  SignalSystem,
  StoreSystem,
  ComponentObserver,
} from './dom/types.js';

import { initializeIntegration, autoInitialize } from './dom/integration.js';
import * as runtime from './dom/index.js';

// Try to auto-initialize with available reactive systems
if (typeof window !== 'undefined') {
  // Browser environment - delay initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      autoInitialize();
    });
  } else {
    autoInitialize();
  }
} else {
  // Node environment - initialize immediately
  autoInitialize();
}

export default {
  ...runtime,
  initializeIntegration,
  autoInitialize,
};
