export declare const hasLength: (data: any) => boolean;
/**
 * The isEqual function compares two objects and returns true if they are equal.
 *
 *
 * @param compare1: T Define the type of object that will be passed into the function
 * @param compare2: T Compare the two objects
 *
 * @return A boolean value
 *
 * @docauthor Ibrahima Touré
 */
export declare const isDeepEqual: <T extends string | any>(compare1: T, compare2: T, keys?: string[]) => boolean;
/**
 * Checks if two objects are deeply equal
 * @param obj1 - First object
 * @param obj2 - Second object
 * @returns True if objects are deeply equal
 * @example
 * deepEqual({a: 1, b: {c: 2}}, {a: 1, b: {c: 2}}) // true
 * deepEqual({a: 1}, {a: 1, b: 2}) // false
 */
export declare const deepEqual: (obj1: any, obj2: any) => boolean;
/**
 * Checks if two values are equal
 * @param a - The first value to compare
 * @param b - The second value to compare
 * @returns True if values are equal
 * @example
 * isEqual(1, 1) // true
 * isEqual(1, '1') // false
 * isEqual(null, undefined) // false
 */
export declare function isEqual<T>(a: T, b: T): boolean;
//# sourceMappingURL=comparators.d.ts.map