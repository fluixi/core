import type { JSX as KettleJSX } from '@awc/jsx-runtime';

export * from '@awc/jsx-runtime/jsx-runtime';
// Re-export JSX namespace from the main package which has the correct IntrinsicElements
export type { JSX } from '@awc/jsx-runtime';

/**
 * Global JSX namespace augmentation for "jsx": "preserve" mode.
 *
 * TypeScript with "jsx": "preserve" uses the global JSX namespace for element type
 * checking (not jsxImportSource). This augmentation is applied automatically whenever
 * any file imports from @awc/kettlejs, because TypeScript processes declare global
 * from all transitively-loaded modules.
 *
 * Pattern: same as SolidJS — the framework's main entry carries the global augmentation.
 */
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
