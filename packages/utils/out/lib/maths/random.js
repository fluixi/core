/**
 * Generates a random integer between min and max (inclusive)
 * @function randomInt
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Random integer
 * Optimized: Single Math.random call with proper scaling
 */
export const randomInt = (min, max) => {
    // Ensure min <= max
    const [realMin, realMax] = min <= max ? [min, max] : [max, min];
    // Use crypto.getRandomValues if available for better randomness
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const range = realMax - realMin + 1;
        const maxSafe = 0xFFFFFFFF; // Max value for Uint32
        const byteArray = new Uint32Array(1);
        // Generate until we get a value in the safe range
        let randomValue;
        do {
            crypto.getRandomValues(byteArray);
            randomValue = byteArray[0] / (maxSafe + 1);
        } while (randomValue >= 1 - (1 % range) / 1);
        return Math.floor(randomValue * range) + realMin;
    }
    // Fallback to Math.random
    return Math.floor(Math.random() * (realMax - realMin + 1)) + realMin;
};
/**
 * Generates a random float between min and max (exclusive of max)
 * @function randomFloat
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (exclusive)
 * @returns Random float
 * Optimized: Single Math.random call
 */
export const randomFloat = (min, max) => {
    const [realMin, realMax] = min <= max ? [min, max] : [max, min];
    return Math.random() * (realMax - realMin) + realMin;
};
/**
 * Generates a random boolean with optional probability
 * @function randomBool
 * @param probability - Probability of returning true (default: 0.5)
 * @returns Random boolean
 * Optimized: Single comparison
 */
export const randomBool = (probability = 0.5) => {
    return Math.random() < probability;
};
