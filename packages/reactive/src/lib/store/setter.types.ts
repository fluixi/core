import type { GetAtPath } from '@fluixi/utils/object';

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

/*
 * Utility Types
  */

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

/*
 * Selector Generation
  */

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
      // A nested array continues with its brackets: `[0][1]`.
      | SelectorInternal<U, U extends readonly unknown[] ? `${Prefix}[*]` : `${Prefix}[*].`, Decrement[Depth]>
      | SelectorInternal<U, U extends readonly unknown[] ? `${Prefix}[${number}]` : `${Prefix}[${number}].`, Decrement[Depth]>
  : T extends object
  ? {
      // An array value continues with its brackets, `users[0].name`, as the examples below read.
      [K in keyof T & string]:
        | `${Prefix}${K}`
        | SelectorInternal<
            T[K],
            NonNullable<T[K]> extends readonly unknown[] ? `${Prefix}${K}` : `${Prefix}${K}.`,
            Decrement[Depth]
          >;
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

/*
 * Path Resolution
  */

type NormalizePath<P extends string> =
  P extends `${infer A}[${infer B}]${infer C}`
    ? NormalizePath<`${A}.[${B}]${C}`>
    : P extends `.${infer R}`
    ? NormalizePath<R>
    : P;

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
  ? // `users[*]` before the dot is a key and then an index into it.
    Head extends `${infer Key}[${infer Index}]`
    ? _ResolvePath<ResolveSegment<Key extends '' ? T : ResolveSegment<T, Key>, `[${Index}]`>, Tail>
    : ResolveSegment<T, Head> extends infer Next
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
// What a write at `P` takes. A wildcard writes each element, so it resolves to the element type.
type ResolvePath<T, P extends string> = _ResolvePath<T, P>;
// 3. Logic for individual segments
// Through an optional step too: `wife?: Person` continues into the Person.
type ResolveSegment<T, Segment extends string> = Segment extends keyof NonNullable<T>
  ? NonNullable<T>[Segment]
  // Each element: a wildcard write runs once per element, so `set('[*]', (v) => v * 2)` gets a number.
  : Segment extends '[*]'
  ? NonNullable<T> extends readonly (infer U)[]
    ? U
    : never
  : Segment extends `[${number}]`
  ? NonNullable<T> extends readonly (infer U)[]
    ? U
    : never
  : T; // Fallback
export type PathValue<T, P extends string> = ResolvePath<T, P>;

/*
 * Update Values
  */

export type UpdateValue<V> = V extends Primitive
  ? V | ((prev: V) => V)
  : V | Partial<V> | DeepReadonly<V> | Partial<DeepReadonly<V>> | ((prev: V) => V);

/**
 * The shape a store hands back when read, which the setter also accepts.
 *
 * `set(untrackStore(other))` is a call the setter handles fine, it copies values out
 * of what it is given and never writes to it, but a mutable-only input type rejected
 * it, so every such site needed a cast.
 */
export type DeepReadonly<T> = T extends ImmutablePrimitive
  ? T
  : T extends Array<infer U>
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends Map<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T extends Set<infer M>
        ? ReadonlySet<DeepReadonly<M>>
        : { readonly [K in keyof T]: DeepReadonly<T[K]> };

/** What deep-readonly leaves alone: a value with no interior to freeze. */
type ImmutablePrimitive = Primitive | RegExp | Blob;

/*
 * Predicate
  */

export type Predicate<T> = (item: T, index: number) => boolean;

/*
 * Array Helpers
  */

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

/*
 * Setter Argument Shapes
  */

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

/*
 * Combined Setter Args
  */

export type SetterArgs<T> =
  | RootSetterArgs<T>
  | PathSetterArgs<T>
  | IndexSetterArgs<T>
  | IndicesSetterArgs<T>
  | RangeSetterArgs<T>
  | PredicateSetterArgs<T>
  | PropertySetterArgs<T>;

/*
 * Main Setter
  */

/*
 * Main Setter with Overloads
  */

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
/**
 * The methods `createStore` hangs off the setter.
 *
 * They were attached at runtime and absent from this type, so every one of them was an
 * error at the call site despite working. Each takes a dot path, or no path at all
 * where the root is the target.
 */
export interface StoreSetterMethods<T> {
  /** Read the current state without subscribing. */
  get(): T;
  /** Read a slice without subscribing. */
  select<U>(selector: (state: T) => U): U;
  /** Run `fn` on every change to the selected slice. */
  watch<U>(selector: (state: T) => U, fn: (value: U) => void): () => void;
  /** Subscribe to whole-state changes. */
  subscribe(fn: (state: T) => void): () => void;
  /** Mutate a draft; the result is applied as one change. */
  produce(recipe: (draft: T) => void): void;
  /** Merge `value` in, keeping the nodes of anything that compares equal. */
  reconcile(value: T, options?: { key?: string; merge?: boolean }): void;

  push(path: string, ...items: unknown[]): void;
  pop(path: string): unknown;
  shift(path: string): unknown;
  splice(path: string, start: number, deleteCount: number, ...items: unknown[]): unknown[];
  insert(path: string, index: number, value: unknown): void;
  removeAt(path: string, index: number): unknown[];

  /** Swap a whole value instead of merging into it. No path means the root. */
  replace(value: unknown): void;
  replace(path: string, value: unknown): void;
  /** Empty an array, or strip an object's keys. No path means the root. */
  clear(path?: string): void;

  /** The plain, non-reactive value. */
  unwrap(): T;
  toObservable(): unknown;
  /** The reactive accessor for a path. */
  $(path?: string): unknown;
}

export interface SetStoreFunction<T> extends StoreSetterMethods<T> {
  // 1. Root Object Update: set({ name: 'John' })
  (value: UpdateValue<T>): void;

  // 2. Simple Path Update (Value): set('user.name', 'John')
  <P extends string>(
    path: P & Selector<T>,
    value:
      | ResolvePath<T, P>
      | Partial<ResolvePath<T, P>>
      | DeepReadonly<ResolvePath<T, P>>
      | GetAtPath<T, P>
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

  // 6. Steps of any kind: set('user', 'address', 'city', 'Paris'), set('todos', '*', 'done', true),
  // set('user.address', 'city', 'Berlin').
  <S1 extends Step<T>, S2 extends Step<At<T, S1>>>(s1: S1, s2: S2, value: UpdateValue<At<At<T, S1>, S2>>): void;
  <S1 extends Step<T>, S2 extends Step<At<T, S1>>, S3 extends Step<At<At<T, S1>, S2>>>(
    s1: S1,
    s2: S2,
    s3: S3,
    value: UpdateValue<At<At<At<T, S1>, S2>, S3>>
  ): void;
  <
    S1 extends Step<T>,
    S2 extends Step<At<T, S1>>,
    S3 extends Step<At<At<T, S1>, S2>>,
    S4 extends Step<At<At<At<T, S1>, S2>, S3>>,
  >(
    s1: S1,
    s2: S2,
    s3: S3,
    s4: S4,
    value: UpdateValue<At<At<At<At<T, S1>, S2>, S3>, S4>>
  ): void;
}

/**
 * One step of a multi-argument write. Into an array: an index, `'*'`, several indexes, a range or a
 * predicate. Into an object: a key or a dotted path.
 */
type Step<T> =
  NonNullable<T> extends readonly (infer U)[]
    ? number | '*' | number[] | RangeSelector | Predicate<U>
    : Selector<NonNullable<T>>;

/** Where a step leads: the element for any array step, else the value at the path. */
type At<T, S> =
  NonNullable<T> extends readonly (infer U)[] ? U : S extends string ? ResolvePath<NonNullable<T>, S> : never;

export type SetStore<T> = SetStoreFunction<T> &
  (T extends readonly any[] ? ArrayStoreMethods<T> : {});
/*
 * Example
  */

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
