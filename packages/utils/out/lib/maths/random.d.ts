/**
 * Generates a random integer between min and max (inclusive)
 * @function randomInt
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Random integer
 * Optimized: Single Math.random call with proper scaling
 */
export declare const randomInt: (min: number, max: number) => number;
/**
 * Generates a random float between min and max (exclusive of max)
 * @function randomFloat
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive)
 * @returns Random float
 * Optimized: Single Math.random call
 */
export declare const randomFloat: (min: number, max: number) => number;
/**
 * Generates a random boolean with optional probability
 * @function randomBool
 * @param probability - Probability of returning true (default: 0.5)
 * @returns Random boolean
 * Optimized: Single comparison
 */
export declare const randomBool: (probability?: number) => boolean;
//# sourceMappingURL=random.d.ts.map