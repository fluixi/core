// import type { Observable } from "../observable.js";

// export type AddEventListenerOptions = typeof globalThis extends undefined ? never : globalThis.AddEventListenerOptions;
// export type UnaryFunction<T, R> = (source: T) => R;
// // export type OperatorFunction<T, R> = UnaryFunction<Observable<T>, Observable<R>>;

// /**
//  * Comparator function for min/max operations
//  */
export type Comparator<T> = (a: T, b: T) => number;
