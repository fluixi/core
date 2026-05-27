/**
 * @fileoverview Main entry point for KettleJS framework
 * @module @awc/kettlejs
 */

import { ensureIntegration } from './lib/render/component.js';
// import type { JSX as KettleJSX } from '@awc/jsx-runtime';

export * from './lib/kettlejs.js';
export { default } from './lib/kettlejs.js';

ensureIntegration('kettle index');

// /**
//  * Global JSX namespace for "jsx": "preserve" mode.
//  * Applied automatically when any file imports from @awc/kettlejs.
//  * Pattern: same as SolidJS — the framework main entry carries the global augmentation.
//  */
// declare global {
//   namespace JSX {
//     type Element = KettleJSX.Element;
//     interface IntrinsicElements extends KettleJSX.IntrinsicElements {}
//     interface ElementChildrenAttribute {
//       children: {};
//     }
//     interface IntrinsicAttributes {
//       key?: string | number;
//     }
//   }
// }

