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
export const toNumber = (value, fallback) => {
    // Fast path: already a number
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : (fallback !== undefined ? fallback : NaN);
    }
    // Fast path: null/undefined
    if (value == null) {
        return fallback !== undefined ? fallback : NaN;
    }
    // Fast path: boolean
    if (typeof value === 'boolean') {
        return value ? 1 : 0;
    }
    // Fast path: string
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') {
            return fallback !== undefined ? fallback : NaN;
        }
        // Use Number() for conversion (faster than parseFloat for our use case)
        const num = Number(trimmed);
        return Number.isFinite(num) ? num : (fallback !== undefined ? fallback : NaN);
    }
    // For other types, attempt conversion
    const num = Number(value);
    return Number.isFinite(num) ? num : (fallback !== undefined ? fallback : NaN);
};
/**
 * Parses a string to integer with validation
 * Optimized: Regex check before parsing
 * @param value - String to parse
 * @param radix - Numeric base (default: 10)
 * @returns Parsed integer or fallback
 */
export const parseIntSafe = (value, radix = 10, fallback) => {
    const trimmed = value.trim();
    if (trimmed === '') {
        return fallback !== undefined ? fallback : NaN;
    }
    // Allow hex digits for radix 16
    if (radix === 16) {
        // Allow hex format: optional 0x prefix, then hex digits
        const hexRegex = /^(-?)0?x?([0-9a-fA-F]+)$/;
        const match = trimmed.match(hexRegex);
        if (match) {
            const sign = match[1] ? -1 : 1;
            const hexStr = match[2];
            const parsed = parseInt(hexStr, 16);
            return !isNaN(parsed) ? sign * parsed : (fallback !== undefined ? fallback : NaN);
        }
    }
    // For other radices, use standard parseInt with validation
    const parsed = parseInt(trimmed, radix);
    if (isNaN(parsed)) {
        return fallback !== undefined ? fallback : NaN;
    }
    // Validate that the entire string was consumed for the given radix
    // (except for hex which we already handled)
    if (radix !== 16 && radix !== 10) {
        // For other radices, ensure the string only contains valid digits
        const validDigits = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, radix);
        const pattern = new RegExp(`^[-+]?[${validDigits}]+$`, 'i');
        if (!pattern.test(trimmed)) {
            return fallback !== undefined ? fallback : NaN;
        }
    }
    return parsed;
};
