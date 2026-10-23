/**
 * Types for filtering and manipulating union string types.
 * @module FilterStringTypes
 */

// BASIC FILTER TYPES

/**
 * Filters a union of strings to only those that match a literal string.
 * 
 * @template T - Union of string types
 * @template Match - String literal to match
 * 
 * @example
* type T = FilterExact<'apple' | 'banana' | 'orange', 'apple'>; // 'apple'
*/
export type FilterExact<T extends string, Match extends string> = 
 T extends Match ? T : never;

/**
* Filters a union of strings to only those that DO NOT match a literal string.
* 
* @template T - Union of string types
* @template ExcludeMatch - String literal to exclude
* 
* @example
* type T = FilterExclude<'apple' | 'banana' | 'orange', 'apple'>; // 'banana' | 'orange'
*/
export type FilterExclude<T extends string, ExcludeMatch extends string> = 
 T extends ExcludeMatch ? never : T;

/**
* Filters a union of strings to only those that start with a prefix.
* 
* @template T - Union of string types
* @template Prefix - Prefix to match
* 
* @example
* type T = FilterStartsWith<'apple' | 'application' | 'banana' | 'app', 'app'>;
* // 'apple' | 'application' | 'app'
*/
export type FilterStartsWith<T extends string, Prefix extends string> = 
 T extends `${Prefix}${string}` ? T : never;
export type ReplaceStartsWith<T extends string, Prefix extends string> = 
 T extends `${Prefix}${infer Rest}` ? Rest : never;
 type T = FilterNotStartsWith<'apple' | 'application' | 'banana' | 'app', 'app'>;

/**
* Filters a union of strings to only those that end with a suffix.
* 
* @template T - Union of string types
* @template Suffix - Suffix to match
* 
* @example
* type T = FilterEndsWith<'apple' | 'pineapple' | 'banana', 'apple'>;
* // 'apple' | 'pineapple'
*/
export type FilterEndsWith<T extends string, Suffix extends string> = 
 T extends `${string}${Suffix}` ? T : never;

/**
* Filters a union of strings to only those that contain a substring.
* 
* @template T - Union of string types
* @template Substring - Substring to match
* 
* @example
* type T = FilterContains<'apple' | 'pineapple' | 'banana', 'apple'>;
* // 'apple' | 'pineapple'
*/
export type FilterContains<T extends string, Substring extends string> = 
 T extends `${string}${Substring}${string}` ? T : never;

/**
* Filters a union of strings to only those that match a pattern using template literals.
* 
* @template T - Union of string types
* @template Pattern - Template literal pattern
* 
* @example
* type T = FilterPattern<'user_1' | 'user_2' | 'admin_1', `user_${number}`>;
* // 'user_1' | 'user_2'
*/
export type FilterPattern<T extends string, Pattern extends string> = 
 T extends Pattern ? T : never;

// ADVANCED FILTER TYPES

/**
* Filters a union of strings to only those that match a regular expression pattern.
* Note: TypeScript can't fully validate regex at type level, but we can approximate.
* 
* @template T - Union of string types
* @template Pattern - String representation of regex pattern
* 
* @example
* type T = FilterRegex<'abc123' | 'def456' | 'xyz', `^[a-z]{3}\\d{3}$`>;
* // 'abc123' | 'def456'
*/
export type FilterRegex<T extends string, Pattern extends string> = 
 T extends string ? 
   Pattern extends `^${infer Start}${infer Rest}$` ?
     FilterRegexDetailed<T, Start, Rest> :
     never
   : never;

// Helper type for detailed regex matching
type FilterRegexDetailed<T extends string, Start extends string, Rest extends string> = 
 T extends `${infer TStart}${infer TRest}` ?
   TStart extends Start ?
     TRest extends Rest ? T : never
   : never
 : never;

/**
* Filters a union of strings by minimum length.
* 
* @template T - Union of string types
* @template MinLength - Minimum length required
* 
* @example
* type T = FilterMinLength<'a' | 'ab' | 'abc' | 'abcd', 3>;
* // 'abc' | 'abcd'
*/
export type FilterMinLength<T extends string, MinLength extends number> = 
 T extends string ? 
   Length<T> extends infer L ?
     L extends number ?
       L extends MinLength ? T :
         L extends number ?
           GreaterThanOrEqual<L, MinLength> extends true ? T : never
       : never
     : never
   : never
 : never;

/**
* Filters a union of strings by maximum length.
* 
* @template T - Union of string types
* @template MaxLength - Maximum length allowed
* 
* @example
* type T = FilterMaxLength<'a' | 'ab' | 'abc' | 'abcd', 3>;
* // 'a' | 'ab' | 'abc'
*/
export type FilterMaxLength<T extends string, MaxLength extends number> = 
 T extends string ? 
   Length<T> extends infer L ?
     L extends number ?
       L extends MaxLength ? T :
         L extends number ?
           LessThanOrEqual<L, MaxLength> extends true ? T : never
       : never
     : never
   : never
 : never;

/**
* Filters a union of strings to only those with a specific length.
* 
* @template T - Union of string types
* @template Len - Exact length required
* 
* @example
* type T = FilterLength<'a' | 'ab' | 'abc', 2>;
* // 'ab'
*/
export type FilterLength<T extends string, Len extends number> = 
 T extends string ? 
   Length<T> extends Len ? T : never
 : never;

// NEGATION FILTER TYPES

/**
* Filters a union of strings to only those that DO NOT start with a prefix.
* 
* @template T - Union of string types
* @template Prefix - Prefix to avoid
* 
* @example
* type T = FilterNotStartsWith<'apple' | 'banana' | 'apricot', 'ap'>;
* // 'banana'
*/
export type FilterNotStartsWith<T extends string, Prefix extends string> = 
 T extends `${Prefix}${string}` ? never : T;

/**
* Filters a union of strings to only those that DO NOT end with a suffix.
* 
* @template T - Union of string types
* @template Suffix - Suffix to avoid
* 
* @example
* type T = FilterNotEndsWith<'apple' | 'banana' | 'pineapple', 'apple'>;
* // 'banana'
*/
export type FilterNotEndsWith<T extends string, Suffix extends string> = 
 T extends `${string}${Suffix}` ? never : T;

/**
* Filters a union of strings to only those that DO NOT contain a substring.
* 
* @template T - Union of string types
* @template Substring - Substring to avoid
* 
* @example
* type T = FilterNotContains<'apple' | 'banana' | 'pineapple', 'apple'>;
* // 'banana'
*/
export type FilterNotContains<T extends string, Substring extends string> = 
 T extends `${string}${Substring}${string}` ? never : T;

// CASE-SENSITIVE FILTER TYPES

/**
* Filters a union of strings case-insensitively.
* 
* @template T - Union of string types
* @template Match - String to match (case-insensitive)
* 
* @example
* type T = FilterCaseInsensitive<'Apple' | 'banana' | 'APPLE', 'apple'>;
* // 'Apple' | 'APPLE'
*/
export type FilterCaseInsensitive<T extends string, Match extends string> = 
 T extends string ? 
   Uppercase<T> extends Uppercase<Match> ? T : never
 : never;

/**
* Filters a union of strings to only lowercase strings.
* 
* @template T - Union of string types
* 
* @example
* type T = FilterLowercase<'apple' | 'BANANA' | 'Apple'>;
* // 'apple'
*/
export type FilterLowercase<T extends string> = 
 T extends Lowercase<T> ? T : never;

/**
* Filters a union of strings to only uppercase strings.
* 
* @template T - Union of string types
* 
* @example
* type T = FilterUppercase<'APPLE' | 'banana' | 'Apple'>;
* // 'APPLE'
*/
export type FilterUppercase<T extends string> = 
 T extends Uppercase<T> ? T : never;

// TRANSFORMATION FILTER TYPES

/**
* Extracts the prefix from strings that match a pattern.
* 
* @template T - Union of string types
* @template Prefix - Prefix to extract
* 
* @example
* type T = ExtractPrefix<'apple_pie' | 'banana_split' | 'apple_juice', 'apple_'>;
* // 'apple_pie' | 'apple_juice'
*/
export type ExtractPrefix<T extends string, Prefix extends string> = 
 FilterStartsWith<T, Prefix>;

/**
* Extracts the suffix from strings that match a pattern.
* 
* @template T - Union of string types
* @template Suffix - Suffix to extract
* 
* @example
* type T = ExtractSuffix<'apple_pie' | 'banana_split' | 'cherry_pie', '_pie'>;
* // 'apple_pie' | 'cherry_pie'
*/
export type ExtractSuffix<T extends string, Suffix extends string> = 
 FilterEndsWith<T, Suffix>;

/**
* Removes a prefix from matching strings and returns the rest.
* 
* @template T - Union of string types
* @template Prefix - Prefix to remove
* 
* @example
* type T = RemovePrefix<'apple_pie' | 'banana_split' | 'apple_juice', 'apple_'>;
* // 'pie' | 'juice'
*/
export type RemovePrefix<T extends string, Prefix extends string> = 
 T extends `${Prefix}${infer Rest}` ? Rest : never;

/**
* Removes a suffix from matching strings and returns the rest.
* 
* @template T - Union of string types
* @template Suffix - Suffix to remove
* 
* @example
* type T = RemoveSuffix<'apple_pie' | 'banana_split' | 'cherry_pie', '_pie'>;
* // 'apple' | 'cherry'
*/
export type RemoveSuffix<T extends string, Suffix extends string> = 
 T extends `${infer Rest}${Suffix}` ? Rest : never;

// SET OPERATION TYPES

/**
* Intersection of two string unions.
* 
* @template A - First union of strings
* @template B - Second union of strings
* 
* @example
* type T = StringIntersection<'a' | 'b' | 'c', 'b' | 'c' | 'd'>;
* // 'b' | 'c'
*/
export type StringIntersection<A extends string, B extends string> = 
 A extends B ? A : never;

/**
* Difference between two string unions (A - B).
* 
* @template A - First union of strings
* @template B - Second union of strings to subtract
* 
* @example
* type T = StringDifference<'a' | 'b' | 'c', 'b' | 'c' | 'd'>;
* // 'a'
*/
export type StringDifference<A extends string, B extends string> = 
 A extends B ? never : A;

/**
* Union of two string unions (deduplicated).
* 
* @template A - First union of strings
* @template B - Second union of strings
* 
* @example
* type T = StringUnion<'a' | 'b', 'b' | 'c'>;
* // 'a' | 'b' | 'c'
*/
export type StringUnion<A extends string, B extends string> = 
 A | B;

/**
* Symmetric difference between two string unions (elements in A or B but not both).
* 
* @template A - First union of strings
* @template B - Second union of strings
* 
* @example
* type T = StringSymmetricDifference<'a' | 'b' | 'c', 'b' | 'c' | 'd'>;
* // 'a' | 'd'
*/
export type StringSymmetricDifference<A extends string, B extends string> = 
 StringUnion<StringDifference<A, B>, StringDifference<B, A>>;

 type Tuple<N extends number, T = unknown, Acc extends T[] = []> = 
 Acc['length'] extends N ? Acc : Tuple<N, T, [...Acc, T]>;
 type TupleToNumber<T extends unknown[]> = T['length'];
type Add<A extends number, B extends number> = TupleToNumber<[...Tuple<A>, ...Tuple<B>]> & number;
// HELPER TYPES


// Helper to get length of a string (up to 45 characters for practical purposes)
type Length<S extends string, Depth extends number = 0> = Depth extends 0 ? never : 
 S extends `${string}${string}${string}${string}${string}${string}${string}${string}${string}${string}${infer Rest}` ?
   Add<10, Length<Rest, Decrement<Depth>>> :
 S extends `${string}${string}${string}${string}${string}` ?
   Add<5, Length<DropFirstN<S, 5>, Decrement<Depth>>> :
 S extends `${string}${string}` ?
   Add<2, Length<DropFirstN<S, 2>, Decrement<Depth>>> :
 S extends `${string}` ? 1 : 0;

// Helper to drop first N characters
type DropFirstN<S extends string, N extends number, Acc extends string = ''> = 
 N extends 0 ? `${Acc}${S}` :
 S extends `${infer First}${infer Rest}` ?
   DropFirstN<Rest, Decrement<N>, `${Acc}`> :
   Acc;

// Simple number comparison types
type LessThanOrEqual<A extends number, B extends number> = 
 A extends B ? true :
 A extends number ? B extends number ? 
   `${A}` extends `-${infer NA}` ?
     `${B}` extends `-${infer NB}` ?
       NA extends NB ? true :
       never
     : true
   : `${B}` extends `-${string}` ? false :
     never
 : never : never;

type GreaterThanOrEqual<A extends number, B extends number> = 
 A extends B ? true :
 LessThanOrEqual<B, A>;

// Simple arithmetic helpers

type Decrement<N extends number> = 
 N extends 0 ? 0 :
 N extends 1 ? 0 :
 N extends 2 ? 1 :
 N extends 3 ? 2 :
 N extends 4 ? 3 :
 N extends 5 ? 4 :
 N extends 6 ? 5 :
 N extends 7 ? 6 :
 N extends 8 ? 7 :
 N extends 9 ? 8 :
 N extends 10 ? 9 : number;

// Array type helper
type Array<N extends number, T = any, Result extends T[] = []> = 
 Result['length'] extends N ? Result : Array<N, T, [...Result, T]>;

// UTILITY TYPES

/**
* Checks if a string union is empty (never).
* 
* @template T - Union of strings to check
* 
* @example
* type T = IsEmptyUnion<'a' | 'b'>; // false
* type U = IsEmptyUnion<never>; // true
*/
export type IsEmptyUnion<T> = 
 [T] extends [never] ? true : false;

/**
* Converts a string union to a tuple type (preserves order as much as possible).
* 
* @template T - Union of strings
* 
* @example
* type T = UnionToTuple<'a' | 'b' | 'c'>;
* // ['a', 'b', 'c'] or some permutation
*/
export type UnionToTuple<T extends string> = 
 UnionToTupleRec<T, []>;

type UnionToTupleRec<T extends string, Acc extends string[]> = 
 IsEmptyUnion<T> extends true ? Acc :
 T extends infer U extends string ?
   UnionToTupleRec<Exclude<T, U>, [...Acc, U]>
 : never;

/**
* Gets the first string in a union.
* 
* @template T - Union of strings
* 
* @example
* type T = FirstInUnion<'a' | 'b' | 'c'>; // 'a'
*/
export type FirstInUnion<T extends string> = 
 UnionToTuple<T>[0] extends infer First extends string ? First : never;

/**
* Gets the last string in a union.
* 
* @template T - Union of strings
* 
* @example
* type T = LastInUnion<'a' | 'b' | 'c'>; // 'c'
*/
export type LastInUnion<T extends string> = 
 UnionToTuple<T> extends [...any[], infer Last extends string] ? Last : never;