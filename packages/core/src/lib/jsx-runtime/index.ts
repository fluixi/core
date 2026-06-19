import type { JSX as FluixiJSX } from '@fluixi/jsx';

export * from '@fluixi/jsx/jsx-runtime';
// Re-export JSX namespace from the main package which has the correct IntrinsicElements
export type { JSX } from '@fluixi/jsx';

/**
 * Global JSX namespace augmentation for "jsx": "preserve" mode.
 *
 * TypeScript with "jsx": "preserve" uses the global JSX namespace for element type
 * checking (not jsxImportSource). This augmentation is applied automatically whenever
 * any file imports from @fluixi/core, because TypeScript processes declare global
 * from all transitively-loaded modules.
 *
 * Pattern: same as SolidJS — the framework's main entry carries the global augmentation.
 */
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
