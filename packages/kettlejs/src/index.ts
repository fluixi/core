/**
 * @fileoverview Main entry point for KettleJS framework
 * @module @awc/kettlejs
 */

import { ensureIntegration } from './lib/render/component.js';

export * from './lib/kettlejs.js';
export { default } from './lib/kettlejs.js';

ensureIntegration()
