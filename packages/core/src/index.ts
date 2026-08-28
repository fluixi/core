export { VERSION } from './version.generated.js';
/**
 * @fileoverview Main entry point for Fluixi framework
 * @module fluixi
 */

import { ensureIntegration } from './lib/render/component.js';
// import type { JSX as FluixiJSX } from '@fluixi/jsx';

export * from './lib/core.js';
export { default } from './lib/core.js';

ensureIntegration('fluixi index');

// /**
//  * Global JSX namespace for "jsx": "preserve" mode.
//  * Applied automatically when any file imports from fluixi.
//  * Pattern: same as SolidJS — the framework main entry carries the global augmentation.
//  */
// declare global {
//   namespace JSX {
//     type Element = FluixiJSX.Element;
//     interface IntrinsicElements extends FluixiJSX.IntrinsicElements {}
//     interface ElementChildrenAttribute {
//       children: {};
//     }
//     interface IntrinsicAttributes {
//       key?: string | number;
//     }
//   }
// }

