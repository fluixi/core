export interface ReconcileOptions {
  /** Merge instead of replace (default: false) */
  merge?: boolean;
  /** Key for array reconciliation (default: 'id') */
  key?: string;
}

export type Producer<T> = (draft: T) => void;

export type Primitive =
  | string
  | number
  | boolean
  | undefined
  | null
  | symbol
  | bigint;

/** Convert a dot-path "a.b.0.c" → ["a","b",0,"c"] */
export type SinglePath<
  T,
  Prev extends string = '',
  Depth extends number = 4
> = Depth extends 0
  ? never
  : T extends Primitive
  ? Prev
  : T extends Array<infer U>
  ? SinglePath<U, Prev, Decrement[Depth]> // recurse into array element, same prefix
  : {
      [K in keyof T]: SinglePath<
        T[K],
        Prev extends ''
          ? `${Extract<K, string>}`
          : `${Prev}.${Extract<K, string>}`,
        Decrement[Depth]
      >;
    }[keyof T];
type Decrement = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
export type Path<T> = SinglePath<T> | SinglePath<T>[];

export type UnionToIntersection<U extends any> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type GetResult<
  T extends Record<string, any>,
  P extends Path<T>
> = CreateMutable<UnionToIntersection<_GetResult<T, P>>>;

type TupleOf<T, N extends number, R extends any[] = []> = R['length'] extends N
  ? R
  : TupleOf<T, N, [...R, T]>;

// Add two numbers using tuple length
type Add<A extends number, B extends number> = [
  ...TupleOf<0, A>,
  ...TupleOf<0, B>
]['length'] &
  number;

export type CreateMutable<T extends any> = ExpandRecursively<{
  [K in keyof T]: T[K] extends object
    ? CreateMutable<T[K]>
    : T[K] extends readonly (infer R)[]
    ? R[]
    : T[K] extends (infer R)[]
    ? R[]
    : T[K] extends []
    ? T[K]
    : T[K];
}>;

export type ExpandRecursively<
  T extends any,
  level extends number = 0
> = T extends object
  ? level extends 6
    ? // ? T extends (...args: any[]) => any
      T extends () => any
      ? T
      : { [K in keyof T]: ExpandRecursively<T[K], Add<level, 1>> }
    : T
  : T;
type PickPath<T, P extends string> = P extends keyof T
  ? { [K in P]: T[P] }
  : P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? T[Key] extends (infer U)[]
      ? { [K in Key as `${K}`]: PickPath<U, Rest>[] }
      : {
          [K in Key]: T[K] extends (infer V)[]
            ? PickPath<V, Rest>
            : PickPath<T[Key], Rest>;
        }
    : T extends Record<string, any>
    ? {
        [K1 in keyof T as K1 extends Key ? K1 : never]: K1 extends Key
          ? PickPath<T[K1], Rest>
          : never;
      }
    : never
  : T extends Record<any, any>
  ? {
      [K in keyof T as K extends P ? K : never]: K extends P
        ? T[K] extends Array<infer U>
          ? { [V in K]: PickPath<U, V>[] }
          : T[K]
        : never;
    }
  : never;

type ValueOf<T> = T extends Record<string, any> ? T[keyof T] : never;
type _GetResult<
  T extends Record<string, any>,
  P extends Path<T>
> = T extends Record<string, any>
  ? P extends string
    ? PickPath<T, P>
    : P extends (infer U)[]
    ? U extends string
      ? PickPath<T, U>
      : never
    : never
  : never;

export type PathValue<T, P = SinglePath<T>> = P extends string
  ? P extends `${infer K}.${infer Rest}`
    ? K extends Keys<T>
      ? T[K] extends (infer U)[]
        ? U extends Record<string, any>
          ? PathValue<U, Rest>[]
          : never
        : T extends Record<string, any>
        ? PathValue<T[K], Rest>
        : never
      : K extends Keys<T>
      ? PathValue<T[K], Rest>
      : K extends Keys<T>
      ? PathValue<T[K], Rest>
      : false
    : // : Keys<{[K1 in keyof T as K1 extends K ? K : never]: K1 extends K ? Rest extends keyof T[K1] ? T[K1][Rest] : PathValue<T[K1], Rest> : never}>
    P extends Keys<T>
    ? ValueOf<{ [K1 in keyof T as K1 extends P ? K1 : never]: T[K1] }>
    : never
  : never;
type _Keys<T> = T extends Record<string, any>
  ? NonNullable<{ [K in keyof T]: K }>[keyof T]
  : never;

export type Keys<T> = NonNullable<_Keys<T>> extends string
  ? NonNullable<_Keys<T>>
  : never;

export interface ReconcileOptions {
  /** Merge instead of replace (default: false) */
  merge?: boolean;
  /** Key for array reconciliation (default: 'id') */
  key?: string;
}
