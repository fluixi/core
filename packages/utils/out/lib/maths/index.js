/**
 * Complete mathematical utilities library.
 * Tree-shakable: Only import what you need!
 *
 * @example
* ```typescript
* // Import specific functions
* import { add, multiply } from './math-utils/functions';
* import type { Vector2D } from './math-utils/types';
*
* // Or import everything
* import * as MathUtils from './math-utils';
* ```
*
* @module MathUtils
*/
// Export types
export * from './types/index.js';
// Export constants
export * from './constants.js';
// Export type guards
export * from './guards.js';
// Export functions
export * from './fn/index.js';
// Export formatters
export * from './formatter.js';
// Export utilities
export * from './random.js';
export * from './parser.js';
