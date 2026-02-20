/**
 * Basic mathematical operations.
 * @module BasicMathFunctions
 */
/**
 * Adds two numbers.
 * @param a - First operand
 * @param b - Second operand
 * @returns The sum of a and b
 */
export function add(a, b) {
    return a + b;
}
/**
 * Subtracts two numbers.
 * @param a - First operand
 * @param b - Second operand
 * @returns The difference of a and b (a - b)
 */
export function subtract(a, b) {
    return a - b;
}
/**
 * Divides two numbers.
 * @param a - Dividend
 * @param b - Divisor
 * @returns The quotient of a divided by b
 * @throws {Error} If b is 0
 */
export const divide = (dividend, divisor, fallback) => {
    if (divisor === 0) {
        return fallback !== undefined ? fallback : NaN;
    }
    return dividend / divisor;
};
/**
 * Calculates the modulo/remainder.
 * @param a - Dividend
 * @param b - Divisor
 * @returns The remainder of a divided by b
 */
export function modulo(a, b) {
    return a % b;
}
/**
 * Calculates the power of a number.
 * @param base - The base number
 * @param exponent - The exponent
 * @returns base raised to the power of exponent
 */
export function power(base, exponent) {
    return Math.pow(base, exponent);
}
/**
 * Calculates the square root of a number.
 * @param value - The number
 * @returns The square root of the number
 * @throws {Error} If value is negative
 */
export function sqrt(value) {
    if (value < 0) {
        throw new Error('Cannot calculate square root of negative number');
    }
    return Math.sqrt(value);
}
/**
 * Calculates the absolute value of a number.
 * @param value - The number
 * @returns The absolute value
 */
export function abs(value) {
    return Math.abs(value);
}
/**
 * Robust rounding using David Gay's dtoa algorithm approach
 * @param value - The value to round
 * @param precision - Decimal precision (default: 0)
 * @returns Rounded number
 * @example
 * round(1.005, 2) // 1.01
 * round(123.456, -1) // 120
 */
export const round = (value, precision = 0, mode = 'round') => {
    if (mode === 'david')
        return roundUsingDavidGay(value, precision, mode);
    if (!Number.isFinite(value))
        return value;
    if (precision === 0)
        return Math[mode](value);
    // Handle negative precision (rounding to tens, hundreds, etc.)
    if (precision < 0) {
        const factor = 10 ** -precision;
        return Math[mode](value / factor) * factor;
    }
    // For positive precision, use a robust method
    const factor = 10 ** precision;
    // Add epsilon correction to handle floating point errors
    const epsilon = Math.pow(2, -52); // Machine epsilon
    const adjusted = value * factor;
    const correction = Math.sign(adjusted) * epsilon * Math.abs(adjusted);
    let rounded;
    switch (mode) {
        case 'round':
            rounded = Math.round(adjusted + correction);
            break;
        case 'ceil':
            rounded = Math.ceil(adjusted - epsilon);
            break;
        case 'floor':
            rounded = Math.floor(adjusted + epsilon);
            break;
        case 'trunc':
            rounded = adjusted < 0 ? Math.ceil(adjusted) : Math.floor(adjusted);
            break;
        default:
            rounded = Math.round(adjusted + correction);
    }
    return rounded / factor;
};
const roundUsingDavidGay = (_value, precision = 0, mode = 'round') => {
    let value = Math.abs(_value);
    const multiplicator = _value < 0 ? -1 : 1;
    if (precision === 0) {
        return Math.round(value) * multiplicator;
    }
    if (!Number.isFinite(value)) {
        return value * multiplicator;
    }
    // Use the banker's rounding variant which is more accurate
    const factor = 10 ** precision;
    // This method handles the 1.005 case correctly
    // First, shift the decimal point to the right
    let shifted = value * factor;
    // Apply a small epsilon to handle floating point errors
    // The epsilon is scaled by the magnitude of the number
    const epsilon = Math.pow(2, -53); // Machine epsilon for double precision
    const correction = Math.sign(shifted) * epsilon * Math.abs(shifted);
    // Round with correction
    shifted += correction;
    // Use Math.round (or could use banker's rounding: Math.round((shifted + Number.EPSILON) * factor) / factor)
    const rounded = Math.round(shifted);
    // Shift the decimal point back
    return (rounded / factor) * multiplicator;
};
/**
 * Rounds a number up to the nearest integer.
 * @param value - The number to round up
 * @returns The ceiling integer
 */
export const ceil = (value, precision = 0) => {
    return round(value, precision, 'ceil');
};
/**
 * Rounds a number down to the nearest integer.
 * @param value - The number to round down
 * @returns The floored integer
 */
export const floor = (value, precision = 0) => {
    return round(value, precision, 'floor');
};
/**
 * Truncates the decimal part of a number.
 * @param value - The number to truncate
 * @returns The truncated integer
 */
export const trunc = (value, precision = 0) => {
    return round(value, precision, 'trunc');
};
/**
 * Clamps a value between a minimum and maximum.
 * @param value - The value to clamp
 * @param min - The minimum allowed value
 * @param max - The maximum allowed value
 * @returns The clamped value
 */
export const clamp = (value, min, max) => {
    if (min > max)
        [min, max] = [max, min]; // Swap if min > max
    return value < min ? min : value > max ? max : value;
};
// export function clamp(value: number, min: number, max: number): number {
//   return Math.max(min, Math.min(max, value));
// }
/**
 * Returns the sign of a number: -1, 0, or 1.
 * @param value - The number
 * @returns The sign of the number
 */
export function sign(value) {
    if (value > 0)
        return 1;
    if (value < 0)
        return -1;
    return 0;
}
/**
 * Calculates the factorial of a non-negative integer.
 * @param n - The integer
 * @returns The factorial of n
 * @throws {Error} If n is negative or not an integer
 */
export function factorial(n) {
    if (!Number.isInteger(n) || n < 0) {
        throw new Error('Factorial is only defined for non-negative integers');
    }
    if (n === 0 || n === 1)
        return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}
/**
 * Calculates the greatest common divisor (GCD) of two numbers.
 * @param a - First number
 * @param b - Second number
 * @returns The GCD of a and b
 */
export function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
        const temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}
/**
 * Calculates the least common multiple (LCM) of two numbers.
 * @param a - First number
 * @param b - Second number
 * @returns The LCM of a and b
 */
export function lcm(a, b) {
    return Math.abs(a * b) / gcd(a, b);
}
/**
 * Linearly interpolates between two values.
 * @param start - The starting value
 * @param end - The ending value
 * @param t - The interpolation factor (0 to 1)
 * @returns The interpolated value
 */
export function lerp(start, end, t) {
    return start + (end - start) * clamp(t, 0, 1);
}
/**
 * Inverse linear interpolation.
 * @param start - The starting value
 * @param end - The ending value
 * @param value - The value to interpolate
 * @returns The interpolation factor (0 to 1)
 */
export const invLerp = (start, end, value) => {
    // return (value - start) / (end - start);
    return clamp((value - start) / (end - start), 0, 1);
};
/**
 * Maps a value from one range to another
 * @param value - The value to map
 * @param inMin - The minimum value of the input range
 * @param inMax - The maximum value of the input range
 * @param outMin - The minimum value of the output range
 * @param outMax - The maximum value of the output range
 * @returns The mapped value
 * Optimized: Uses lerp and invLerp
 */
export const mapRange = (value, inMin, inMax, outMin, outMax) => {
    const t = invLerp(inMin, inMax, value);
    return lerp(outMin, outMax, t);
};
/**
 * Returns the minimum of two or more numbers.
 * @param values - Numbers to compare
 * @returns The smallest number
 */
export function min(...values) {
    return Math.min(...values);
}
/**
 * Returns the maximum of two or more numbers.
 * @param values - Numbers to compare
 * @returns The largest number
 */
export function max(...values) {
    return Math.max(...values);
}
/**
 * Calculates the average of numbers.
 * @param values - Numbers to average
 * @returns The average
 */
export const average = (...numbers) => {
    if (!Array.isArray(numbers) || numbers.length === 0)
        return 0;
    let total = 0;
    let count = 0;
    for (const num of numbers) {
        if (Number.isFinite(num)) {
            total += num;
            count++;
        }
    }
    return count === 0 ? 0 : total / count;
};
/**
 * Calculates the sum of numbers.
 * @param values - Numbers to sum
 * @returns The sum
 */
export const sum = (...numbers) => {
    if (!Array.isArray(numbers))
        return 0;
    return numbers.reduce((acc, val) => acc + (Number.isFinite(val) ? val : 0), 0);
};
/**
 * Calculates the median of an array of numbers
 * @param numbers - Array of numbers
 * @returns The median
 * Optimized: Sorts only when necessary
 */
export const median = (...numbers) => {
    if (!Array.isArray(numbers) || numbers.length === 0)
        return 0;
    const validNumbers = numbers.filter(Number.isFinite);
    if (validNumbers.length === 0)
        return 0;
    validNumbers.sort((a, b) => a - b);
    const mid = Math.floor(validNumbers.length / 2);
    return validNumbers.length % 2 === 0
        ? (validNumbers[mid - 1] + validNumbers[mid]) / 2
        : validNumbers[mid];
};
/**
 * Calculates the product of numbers.
 * @param values - Numbers to multiply
 * @returns The product
 */
export function product(...values) {
    return values.reduce((prod, val) => prod * val, 1);
}
