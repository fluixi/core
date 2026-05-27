export *  from './lib/jsx-runtime/index.js';
export type {JSX} from "@awc/jsx-runtime"
/**
 * Global JSX namespace for "jsx": "preserve" mode.
 * Applied automatically when any file imports from @awc/kettlejs.
 */
// declare global {
//   namespace JSX {
//     // type Element = KettleJSX.Element;
//     interface IntrinsicElements extends JSX.IntrinsicElements {}
//     interface ElementChildrenAttribute {
//       children: {};
//     }
//     interface IntrinsicAttributes {
//       key?: string | number;
//     }
//   }
// }