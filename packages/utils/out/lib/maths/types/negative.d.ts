/**
 * Types for working with negative numbers.
 * @module NegativeTypes
 */
/**
 * Makes a positive number negative at the type level.
 * Returns N unchanged if it's already negative.
 */
export type MakeNegative<T extends number> = `${T}` extends `-${string}` ? T : T extends 0 ? 0 : `-${T}` extends `${infer N extends number}` ? N : never;
/**
 * Makes a negative number positive at the type level.
 * Returns N unchanged if it's already positive.
 */
export type MakePositive<T extends number> = `${T}` extends `-${infer U extends number}` ? U : T;
/**
 * Type-level negation: returns -N.
 */
export type Negate<T extends number> = T extends 0 ? 0 : `${T}` extends `-${infer U extends number}` ? U : `-${T}` extends `${infer N extends number}` ? N : never;
/**
 * Checks if a number is negative at the type level.
 */
export type IsNegative<T extends number> = T extends 0 ? false : `${T}` extends `-${string}` ? true : false;
/**
 * Checks if a number is non-negative (positive or zero) at the type level.
 */
export type IsNonNegative<T extends number> = T extends 0 ? true : `${T}` extends `-${string}` ? false : true;
/**
 * Checks if a number is non-positive (negative or zero) at the type level.
 */
export type IsNonPositive<T extends number> = T extends 0 ? true : `${T}` extends `-${string}` ? true : false;
/**
 * Ensures a number is negative. Returns the number if negative, never otherwise.
 */
export type EnsureNegative<T extends number> = IsNegative<T> extends true ? T : never;
/**
 * Ensures a number is positive. Returns the number if positive, never otherwise.
 */
export type EnsurePositive<T extends number> = T extends 0 ? never : IsNegative<T> extends false ? T : never;
/**
 * Returns the opposite sign of a number (negation without zero change).
 */
export type OppositeSign<T extends number> = T extends 0 ? 0 : Negate<T>;
/**
 * Type for representing strictly negative numbers (excluding zero).
 */
export type StrictlyNegative<T extends number> = IsNegative<T> extends true ? T : never;
/**
 * Type for representing strictly positive numbers (excluding zero).
 */
export type StrictlyPositive<T extends number> = T extends 0 ? never : IsNegative<T> extends false ? T : never;
//# sourceMappingURL=negative.d.ts.map