/**
 * Type-level mathematical operations that actually work.
 * These use clever TypeScript tricks to perform type-level arithmetic.
 * @module OperationTypes
 */
import { Integer, IsNegative } from "./basic.js";
import { MakeNegative } from "./negative.js";
/**
 * Creates a tuple of length N.
 * This is the foundation for all type-level arithmetic.
 */
type Tuple<N extends number, T = unknown, Acc extends T[] = []> = Acc['length'] extends N ? Acc : Tuple<N, T, [...Acc, T]>;
/**
 * Converts a number to a tuple length.
 */
type NumberToTuple<N extends number> = Tuple<N>;
/**
 * Converts a tuple to a number.
 */
type TupleToNumber<T extends unknown[]> = T['length'];
/**
 * Helper type to get the numeric value of a digit string.
 */
type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
/**
 * Adds two numbers at the type level (works up to ~50).
 */
type _Add<A extends number, B extends number> = IsNegative<A> extends true ? IsNegative<B> extends true ? Add<Absolute<A>, Absolute<B>> : Compare<Absolute<A>, Absolute<B>> extends -1 ? Subtract<B, Absolute<A>> : Subtract<Absolute<A>, B> : TupleToNumber<[...Tuple<A>, ...Tuple<B>]> & number;
/**
 * Subtracts B from A at the type level (A - B).
 */
export type Subtract<A extends number, B extends number> = Tuple<A> extends [...Tuple<B>, ...infer R] ? TupleToNumber<R> : never;
/**
 * Multiplies two numbers at the type level.
 */
type _Multiply<A extends number, B extends number> = B extends 0 ? 0 : B extends 1 ? A : MultiplyRec<A, B, 0>;
type MultiplyRec<A extends number, B extends number, Acc extends number> = B extends 0 ? Acc : MultiplyRec<A, Subtract<B, 1>, Add<Acc, A>>;
/**
 * Divides A by B at the type level (integer division).
 */
type _Divide<A extends number, B extends number> = B extends 0 ? never : DivideRec<A, B, 0>;
type DivideRec<A extends number, B extends number, Q extends number> = A extends 0 ? Q : Subtract<A, B> extends never ? Q : DivideRec<Subtract<A, B>, B, Add<Q, 1>>;
/**
 * Modulo operation at the type level (A % B).
 */
export type Mod<A extends number, B extends number> = B extends 0 ? never : Subtract<A, Multiply<Divide<A, B>, B>>;
export type Add<A extends number, B extends number> = IsNegative<A> extends true ? IsNegative<B> extends true ? MakeNegative<Add<Absolute<A>, Absolute<B>>> : Compare<Absolute<A>, Absolute<B>> extends 1 ? MakeNegative<Subtract<Absolute<A>, Absolute<B>>> : Subtract<Absolute<B>, Absolute<A>> : IsNegative<B> extends true ? Compare<A, Absolute<B>> extends 1 | 0 ? Subtract<A, Absolute<B>> : MakeNegative<Subtract<Absolute<B>, A>> : _Add<A, B>;
/**
 * Multiplies two numbers, handling signs correctly.
 */
export type Multiply<A extends number, B extends number> = (IsNegative<A> extends true ? -1 : 1) extends infer SignA ? (IsNegative<B> extends true ? -1 : 1) extends infer SignB ? SignA extends -1 ? SignB extends -1 ? _Multiply<Absolute<A>, Absolute<B>> : MakeNegative<_Multiply<Absolute<A>, Absolute<B>>> : SignB extends -1 ? MakeNegative<_Multiply<Absolute<A>, Absolute<B>>> : _Multiply<Absolute<A>, Absolute<B>> : never : never;
/**
 * Divides two numbers, handling signs correctly.
 */
export type Divide<A extends number, B extends number> = B extends 0 ? never : (IsNegative<A> extends true ? -1 : 1) extends infer SignA ? (IsNegative<B> extends true ? -1 : 1) extends infer SignB ? SignA extends -1 ? SignB extends -1 ? _Divide<Absolute<A>, Absolute<B>> : MakeNegative<_Divide<Absolute<A>, Absolute<B>>> : SignB extends -1 ? MakeNegative<_Divide<Absolute<A>, Absolute<B>>> : _Divide<Absolute<A>, Absolute<B>> : never : never;
/**
 * Compares two numbers at the type level.
 * Returns -1 if A < B, 0 if A = B, 1 if A > B.
 */
export type Compare<A extends number, B extends number> = A extends B ? 0 : Absolute<A> extends A ? Absolute<B> extends B ? Tuple<A> extends [...Tuple<B>, ...any] ? 1 : -1 : 1 : Absolute<B> extends B ? -1 : never;
/**
 * Checks if A equals B at the type level.
 */
export type Equals<A extends number, B extends number> = A extends B ? (B extends A ? true : false) : false;
/**
 * Checks if A is less than B at the type level.
 */
export type LessThan<A extends number, B extends number> = Compare<A, B> extends -1 ? true : false;
/**
 * Checks if A is greater than B at the type level.
 */
export type GreaterThan<A extends number, B extends number> = Compare<A, B> extends 1 ? true : false;
/**
 * Checks if A is less than or equal to B at the type level.
 */
export type LessThanOrEqual<A extends number, B extends number> = Compare<A, B> extends -1 | 0 ? true : false;
/**
 * Checks if A is greater than or equal to B at the type level.
 */
export type GreaterThanOrEqual<A extends number, B extends number> = Compare<A, B> extends 1 | 0 ? true : false;
/**
 * Returns the minimum of two numbers at the type level.
 */
export type Min<A extends number, B extends number> = Compare<A, B> extends -1 | 0 ? A : B;
/**
 * Returns the maximum of two numbers at the type level.
 */
export type Max<A extends number, B extends number> = Compare<A, B> extends 1 | 0 ? A : B;
/**
 * Extracts the absolute value type from a number.
 */
export type Absolute<T extends number> = `${T}` extends `-${infer U extends number}` ? U : T;
/**
 * Represents a decimal number as a string for type manipulation.
 */
type DecimalString<N extends number> = `${N}` extends `${infer I}.${infer F}` ? [I, F] : [`${N}`, '0'];
/**
 * Rounds a number to the nearest integer at the type level.
 * This works for numbers up to 2 decimal places.
 */
export type Round<T extends number> = DecimalString<T> extends [infer I extends string, infer F extends string] ? F extends Digit ? `${F}` extends `${'5' | '6' | '7' | '8' | '9'}` ? Add<ToNumber<I>, 1> : ToNumber<I> : ToNumber<I> : T;
/**
 * Helper to convert string to number.
 */
type ToNumber<S extends string> = S extends `${infer N extends number}` ? N : never;
/**
 * Rounds a number down to the nearest integer at the type level.
 */
export type Floor<T extends number> = DecimalString<T> extends [infer I extends string, any] ? ToNumber<I> : T;
/**
 * Rounds a number up to the nearest integer at the type level.
 */
export type Ceil<T extends number> = DecimalString<T> extends [infer I extends string, infer F extends string] ? F extends '0' ? ToNumber<I> : Add<ToNumber<I>, 1> : T;
/**
 * Truncates the decimal part of a number at the type level.
 */
export type Trunc<T extends number> = Floor<T>;
/**
 * Power operation at the type level (A^B).
 */
export type Power<Base extends number, Exponent extends number> = Exponent extends 0 ? 1 : Exponent extends 1 ? Base : PowerRec<Base, Exponent, 1>;
type PowerRec<B extends number, E extends number, Acc extends number> = E extends 0 ? Acc : PowerRec<B, Subtract<E, 1>, Multiply<Acc, B>>;
/**
 * Factorial operation at the type level (n!).
 * Works for n up to ~12 due to recursion limits.
 */
export type Factorial<N extends number> = N extends 0 ? 1 : N extends 1 ? 1 : Multiply<N, Factorial<Subtract<N, 1>>>;
/**
 * Clamps a value between min and max at the type level.
 */
export type Clamp<T extends number, MinVal extends number, MaxVal extends number> = Min<Max<T, MinVal>, MaxVal>;
/**
 * Creates a range of numbers from Start to End (inclusive) at the type level.
 */
export type Range<Start extends number, End extends number> = BuildRange<Start, End, []>;
type BuildRange<S extends number, E extends number, Acc extends number[]> = GreaterThan<S, E> extends true ? Acc : BuildRange<Add<S, 1>, E, [...Acc, S]>;
/**
 * Increments a number by 1 at the type level.
 */
export type Increment<T extends number> = Add<T, 1>;
/**
 * Decrements a number by 1 at the type level.
 */
export type Decrement<T extends number> = Subtract<T, 1>;
/**
 * Checks if a number is even at the type level.
 */
export type IsEven<T extends number> = Mod<T, 2> extends 0 ? true : false;
/**
 * Checks if a number is odd at the type level.
 */
export type IsOdd<T extends number> = Mod<T, 2> extends 1 ? true : false;
/**
 * Checks if A is divisible by B at the type level.
 */
export type IsDivisible<A extends number, B extends number> = B extends 0 ? false : Mod<A, B> extends 0 ? true : false;
/**
 * Asserts that a type condition is true.
 * Useful for writing type tests.
 */
export type AssertTrue<T extends true> = T;
/**
 * Asserts that two types are equal.
 */
export type AssertEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
export type { Tuple, NumberToTuple, TupleToNumber };
/**
 * Represents an even integer.
 */
export type Even<T extends number> = T extends Integer ? `${T}` extends `${infer N extends number}` ? Mod<Absolute<N>, 2> extends 0 ? T : never : never : never;
/**
 * Represents an odd integer.
 */
export type Odd<T extends number> = T extends Integer ? `${T}` extends `${infer N extends number}` ? Mod<Absolute<N>, 2> extends 1 ? T : never : never : never;
/**
 * Extracts the sign of a number as a type.
 * Returns -1, 0, or 1 as a numeric literal type.
 */
export type SignOf<T extends number> = T extends 0 ? 0 : `${T}` extends `-${string}` ? -1 : 1;
/**
 * Type-level subtraction that always returns a negative or zero result.
 */
export type SubtractToNegative<A extends number, B extends number> = Compare<A, B> extends 1 | 0 ? MakeNegative<Subtract<A, B>> : Subtract<A, B>;
/**
 * Returns the negative absolute value (always returns a negative number or zero).
 */
export type NegativeAbsolute<T extends number> = T extends 0 ? 0 : `-${Absolute<T>}` extends `${infer N extends number}` ? N : never;
//# sourceMappingURL=operations.d.ts.map