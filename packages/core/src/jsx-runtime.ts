export *  from './lib/jsx-runtime/index.js';
export type {JSX} from "@fluixi/jsx"
/**
 * Global JSX namespace for "jsx": "preserve" mode.
 * Applied automatically when any file imports from @fluixi/core.
 */
// declare global {
//   namespace JSX {
//     // type Element = FluixiJSX.Element;
//     interface IntrinsicElements extends JSX.IntrinsicElements {}
//     interface ElementChildrenAttribute {
//       children: {};
//     }
//     interface IntrinsicAttributes {
//       key?: string | number;
//     }
//   }
// }