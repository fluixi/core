/**
 * Safely converts any value to a number with fallback
 * @param value - The value to convert
 * @param fallback - Fallback value if conversion fails (default: NaN)
 * @returns The converted number or fallback
 * @example
* toNumber("42") // 42
* toNumber("abc", 0) // 0
* toNumber(null, 100) // 100
*/
export declare const toNumber: <T = number>(value: unknown, fallback?: T) => number | T;
/**
 * Parses a string to integer with validation
 * Optimized: Regex check before parsing
 * @param value - String to parse
 * @param radix - Numeric base (default: 10)
 * @returns Parsed integer or fallback
 */
export declare const parseIntSafe: <T = number>(value: string, radix?: number, fallback?: T) => number | T;
//# sourceMappingURL=parser.d.ts.map