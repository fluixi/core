export { VERSION } from './version.generated.js';
/**
 * @module fluixi
 */

import { ensureIntegration } from './lib/render/component.js';
// import type { JSX as FluixiJSX } from '@fluixi/jsx';

export * from './lib/core.js';
export { default } from './lib/core.js';


// /**
//  * Global JSX namespace for "jsx": "preserve" mode.
//  * Applied automatically when any file imports from fluixi.
//  * Pattern: same as SolidJS, the framework main entry carries the global augmentation.
//  */
// declare global {
//   namespace JSX {