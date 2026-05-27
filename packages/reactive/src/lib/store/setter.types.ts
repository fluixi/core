import { GetAtPath, IValueOfKey } from '@awc/utils/object';

export type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | Function;

export type AnyObject = Record<string, any>;

export type Callback<T> = (prev: T) => T;

export interface RangeSelector {
  from?: number;
  to?: number;
  by?: number;
}

/* ============================================================
 * Utility Types
 * ============================================================ */

type Decrement = [never, 0, 1, 2, 3, 4, 5, 6];

type Expand<T> = T extends object ? { [K in keyof T]: T[K] } : T;

type ArrayElement<T> = T extends readonly (infer U)[]
  ? U
  : T extends (infer U)[]
  ? U
  : never;

type IsArray<T> = T extends readonly any[]
  ? true
  : T extends any[]
  ? true
  : false;

/* ============================================================
 * Selector Generation
 * ============================================================ */

type SelectorInternal<
  T,
  Prefix extends string = '',
  Depth extends number = 4
> = Depth extends 0
  ? never
  : T extends Primitive
  ? never
  : T extends readonly (infer U)[]
  ?
      | `${Prefix}[*]`
      | `${Prefix}[${number}]`
      | SelectorInternal<U, `${Prefix}[*].`, Decrement[Depth]>
  : T extends object
  ? {
      [K in keyof T & string]:
        | `${Prefix}${K}`
        | SelectorInternal<T[K], `${Prefix}${K}.`, Decrement[Depth]>;
    }[keyof T & string]
  : never;

/**
 * Cached selector type.
 *
 * Examples:
 *
 * users
 * users[*]
 * users[0]
 * users[*].name
 * users[*].posts[*].title
 */
export type Selector<T> = SelectorInternal<T>;

/* ============================================================
 * Path Resolution
 * ============================================================ */

type NormalizePath<P extends string> =
  P extends `${infer A}[${infer B}]${infer C}`
    ? NormalizePath<`${A}.[${B}]${C}`>
    : P extends `.${infer R}`
    ? NormalizePath<R>
    : P;

// type ResolvePath<
//   T,
//   P extends string
// > = NormalizePath<P> extends `${infer Head}.${infer Tail}`
//   ? ResolveSegment<T, Head, Tail>
//   : ResolveSegment<T, NormalizePath<P>, never>;

// type ResolveSegment<T, Segment extends string, Tail> = Segment extends keyof T
//   ? Tail extends string
//     ? ResolvePath<T[Segment], Tail>
//     : T[Segment]
//   : Segment extends '[*]'
//   ? T extends readonly (infer U)[]
//     ? Tail extends string
//       ? ResolvePath<U[], Tail>
//       : U[]
//     : never
//   : Segment extends `[${number}]`
//   ? T extends readonly (infer U)[]
//     ? Tail extends string
//       ? ResolvePath<U, Tail>
//       : U
//     : never
//   : never;

// 1. Clean the path and split it into a union of segments
type SplitPath<P extends string> =
  P extends `${infer Head}[${infer Index}]${infer Tail}`
    ? Head extends ''
      ? `[${Index}]` | SplitPath<Tail>
      : Head | `[${Index}]` | SplitPath<Tail>
    : P extends `${infer Head}.${infer Tail}`
    ? Head | SplitPath<Tail>
    : P extends ''
    ? never
    : P;

// 2. The recursive resolver that consumes the path segment by segment
type _ResolvePath<T, P extends string> = P extends `${infer Head}.${infer Tail}`
  ? ResolveSegment<T, Head> extends infer Next
    ? _ResolvePath<Next, Tail>
    : never
  : P extends `${infer Left}[${infer Index}]${infer Right}`
  ? Left extends ''
    ? ResolveSegment<T, `[${Index}]`> extends infer Next
      ? _ResolvePath<Next, Right extends `.${infer R}` ? R : Right>
      : never
    : ResolveSegment<T, Left> extends infer Next
    ? _ResolvePath<Next, `[${Index}]${Right}`>
    : never
  : ResolveSegment<T, P>;
type ResolvePath<T, P extends string> = _ResolvePath<T, P> & GetAtPath<T,P>;
// 3. Logic for individual segments
type ResolveSegment<T, Segment extends string> = Segment extends keyof T
  ? T[Segment]
  : Segment extends '[*]'
  ? T extends readonly (infer U)[]
    ? U[]
    : never
  : Segment extends `[${number}]`
  ? T extends readonly (infer U)[]
    ? U
    : never
  : T; // Fallback
export type PathValue<T, P extends string> = ResolvePath<T, P>;

/* ============================================================
 * Update Values
 * ============================================================ */

// export type UpdateValue<T> = T extends Primitive
//   ? T | Callback<T>
//   : Expand<T> | Partial<Expand<T>> | Callback<Expand<T>>;
export type UpdateValue<V> = V extends Primitive
  ? V | ((prev: V) => V)
  : V | Partial<V> | ((prev: V) => V);

/* ============================================================
 * Predicate
 * ============================================================ */

export type Predicate<T> = (item: T, index: number) => boolean;

/* ============================================================
 * Array Helpers
 * ============================================================ */

export type ArrayStoreMethods<T extends readonly any[]> = {
  push(...items: ArrayElement<T>[]): void;

  pop(): ArrayElement<T> | undefined;

  shift(): ArrayElement<T> | undefined;

  unshift(...items: ArrayElement<T>[]): void;

  insert(index: number, value: ArrayElement<T>): void;

  remove(index: number): void;

  move(from: number, to: number): void;

  reverse(): void;

  sort(compareFn?: (a: ArrayElement<T>, b: ArrayElement<T>) => number): void;

  splice(
    start: number,
    deleteCount?: number,
    ...items: ArrayElement<T>[]
  ): ArrayElement<T>[];
};

/* ============================================================
 * Setter Argument Shapes
 * ============================================================ */

type RootSetterArgs<T> = [value: UpdateValue<T>];

type PathSetterArgs<T> = [
  key: Selector<T>,
  value: UpdateValue<PathValue<T, Selector<T>>>
];

type IndexSetterArgs<T> = [key: Selector<T>, index: number, value: any];

type IndicesSetterArgs<T> = [
  key: Selector<T>,
  indices: readonly number[],
  value: any
];

type RangeSetterArgs<T> = [key: Selector<T>, range: RangeSelector, value: any];

type PredicateSetterArgs<T> = [
  key: Selector<T>,
  predicate: Predicate<any>,
  value: any
];

type PropertySetterArgs<T> = [
  key: Selector<T>,
  index: number,
  property: string,
  value: any
];

/* ============================================================
 * Combined Setter Args
 * ============================================================ */

export type SetterArgs<T> =
  | RootSetterArgs<T>
  | PathSetterArgs<T>
  | IndexSetterArgs<T>
  | IndicesSetterArgs<T>
  | RangeSetterArgs<T>
  | PredicateSetterArgs<T>
  | PropertySetterArgs<T>;

/* ============================================================
 * Main Setter
 * ============================================================ */

// export type SetStoreFunction<T> = (<A extends SetterArgs<T>>(
//   ...args: A
// ) => void) &
//   (T extends readonly any[] ? ArrayStoreMethods<T> : {});

/* ============================================================
 * Main Setter with Overloads
 * ============================================================ */

// export type SetStoreFunction<T> = {
//   // Option A: Single Object Update
//   (value: UpdateValue<T>): void;

//   // Option B: Path-based Updates using a "Distributed" tuple
//   <P extends string>(
//     ...args: P extends Selector<T>
//       ? [path: P, value: UpdateValue<ResolvePath<T, P>>]
//       : never
//   ): void;

//   // Option C: Array-specific methods (Index, Predicate, etc.)
//   <P extends string>(
//     ...args: P extends Selector<T>
//       ? ResolvePath<T, P> extends readonly (infer U)[]
//         ? [
//             path: P,
//             index: number | number[] | RangeSelector | Predicate<U>,
//             value: UpdateValue<U>
//           ]
//         : never
//       : never
//   ): void;
// } & (T extends readonly any[] ? ArrayStoreMethods<T> : {});

// Merge Array methods if T is an array
export interface SetStoreFunction<T> {
  // 1. Root Object Update: set({ name: 'John' })
  (value: UpdateValue<T>): void;

  // 2. Simple Path Update (Value): set('user.name', 'John')
  <P extends string>(
    path: P & Selector<T>,
    value: ResolvePath<T, P> | Partial<ResolvePath<T, P>> | GetAtPath<T,P>
  ): void;

  // 2b. Simple Path Update (Callback): set('user.age', v => v + 1)
  // Separated to ensure `prev` is correctly inferred from the resolved path.
  <P extends string>(
    path: P & Selector<T>,
    updater: (prev: ResolvePath<T, P>) => ResolvePath<T, P>
  ): void;

  // 3. Nested Array Property: set('users', 0, 'name', 'John')
  // This is the classic SolidJS pattern where the index is a separate argument.
  <P extends string, K extends keyof ArrayElement<ResolvePath<T, P>>>(
    path: P & Selector<T>,
    index:
      | number
      | number[]
      | RangeSelector
      | Predicate<ArrayElement<ResolvePath<T, P>>>,
    column: K,
    value: UpdateValue<ArrayElement<ResolvePath<T, P>>[K]>
  ): void;

  // 4. Array Index Update: set('users', 0, { name: 'John' })
  <P extends string>(
    path: P & Selector<T>,
    index:
      | number
      | number[]
      | RangeSelector
      | Predicate<ArrayElement<ResolvePath<T, P>>>,
    value: UpdateValue<ArrayElement<ResolvePath<T, P>>>
  ): void;

  // 5. Deep Multi-Argument (The "Solid" Dozen)
  // To support set('a', 'b', 'c', value), you technically need
  // one overload for each depth, or a recursive tuple.
  <K1 extends keyof T, K2 extends keyof T[K1], V extends T[K1][K2]>(
    k1: K1,
    k2: K2,
    value: UpdateValue<V>
  ): void;
  //   <K extends any[]>(...args: [...K, UpdateValue<any>]): void;
}

export type SetStore<T> = SetStoreFunction<T> &
  (T extends readonly any[] ? ArrayStoreMethods<T> : {});
/* ============================================================
 * Example
 * ============================================================ */

/*

type State = {
  users: {
    id: number;
    name: string;
    posts: {
      title: string;
    }[];
  }[];

  count: number;
};

declare const set: SetStoreFunction<State>;

set({
  count: 5
});

set(
  "count",
  5
);

set(
  "users[*].name",
  "John"
);

set(
  "users[0].posts[*].title",
  "Hello"
);

set(
  "users",
  0,
  {
    id: 1,
    name: "John"
  }
);

set(
  "users",
  [0, 2, 4],
  {
    name: "Updated"
  }
);

set(
  "users",
  (user) => user.id > 5,
  {
    name: "Filtered"
  }
);

*/
