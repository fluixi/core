/**
 * Vector operations for 2D, 3D, and 4D vectors.
 * @module VectorFunctions
 */
// Constants
// const EPSILON = Math.E;
// const DEG_TO_RAD = Math.PI / 180;
// const RAD_TO_DEG = 180 / Math.PI;
/**
 * Validates that a value is a finite number.
 * @param value - The value to validate
 * @param name - Name of the value for error messages
 * @throws {Error} If value is not a finite number
 */
function validateNumber(value, name) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`${name} must be a finite number, got ${value}`);
    }
}
/**
 * Checks if a value is approximately zero within epsilon.
 * @param value - The value to check
 * @returns True if the value is effectively zero
 */
function isApproximatelyZero(value) {
    return Math.abs(value) < 1e-9;
}
/**
 * Checks if two numbers are approximately equal.
 * @param a - First number
 * @param b - Second number
 * @returns True if numbers are approximately equal
 */
function approximatelyEqual(a, b) {
    return Math.abs(a - b) < 1e-6;
}
/**
 * Validates a 2D vector.
 * @param vector - The vector to validate
 * @param name - Name for error messages
 * @throws {Error} If vector is invalid
 */
function validateVector2D(vector, name = 'Vector2D') {
    if (!vector || typeof vector !== 'object') {
        throw new Error(`${name} must be an object`);
    }
    validateNumber(vector.x, `${name}.x`);
    validateNumber(vector.y, `${name}.y`);
}
/**
 * Validates a 3D vector.
 * @param vector - The vector to validate
 * @param name - Name for error messages
 * @throws {Error} If vector is invalid
 */
function validateVector3D(vector, name = 'Vector3D') {
    if (!vector || typeof vector !== 'object') {
        throw new Error(`${name} must be an object`);
    }
    validateNumber(vector.x, `${name}.x`);
    validateNumber(vector.y, `${name}.y`);
    validateNumber(vector.z, `${name}.z`);
}
/**
 * Validates a 4D vector.
 * @param vector - The vector to validate
 * @param name - Name for error messages
 * @throws {Error} If vector is invalid
 */
function validateVector4D(vector, name = 'Vector4D') {
    if (!vector || typeof vector !== 'object') {
        throw new Error(`${name} must be an object`);
    }
    validateNumber(vector.x, `${name}.x`);
    validateNumber(vector.y, `${name}.y`);
    validateNumber(vector.z, `${name}.z`);
    validateNumber(vector.w, `${name}.w`);
}
/**
 * Creates a 2D vector with validation.
 * @param x - X component
 * @param y - Y component
 * @returns Validated 2D vector
 */
export function createVector2D(x, y) {
    validateNumber(x, 'x');
    validateNumber(y, 'y');
    return { x, y };
}
/**
 * Creates a 3D vector with validation.
 * @param x - X component
 * @param y - Y component
 * @param z - Z component
 * @returns Validated 3D vector
 */
export function createVector3D(x, y, z) {
    validateNumber(x, 'x');
    validateNumber(y, 'y');
    validateNumber(z, 'z');
    return { x, y, z };
}
/**
 * Creates a 4D vector with validation.
 * @param x - X component
 * @param y - Y component
 * @param z - Z component
 * @param w - W component
 * @returns Validated 4D vector
 */
export function createVector4D(x, y, z, w) {
    validateNumber(x, 'x');
    validateNumber(y, 'y');
    validateNumber(z, 'z');
    validateNumber(w, 'w');
    return { x, y, z, w };
}
/**
 * Calculates the magnitude (length) of a 2D vector.
 * @param vector - The 2D vector
 * @returns The magnitude of the vector (non-negative)
 */
export function magnitude2D(vector) {
    validateVector2D(vector);
    const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    return isApproximatelyZero(magnitude) ? 0 : magnitude;
}
/**
 * Calculates the squared magnitude of a 2D vector (faster, no sqrt).
 * @param vector - The 2D vector
 * @returns The squared magnitude
 */
export function magnitudeSquared2D(vector) {
    validateVector2D(vector);
    return vector.x * vector.x + vector.y * vector.y;
}
/**
 * Calculates the magnitude (length) of a 3D vector.
 * @param vector - The 3D vector
 * @returns The magnitude of the vector (non-negative)
 */
export function magnitude3D(vector) {
    validateVector3D(vector);
    const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    return isApproximatelyZero(magnitude) ? 0 : magnitude;
}
/**
 * Calculates the squared magnitude of a 3D vector (faster, no sqrt).
 * @param vector - The 3D vector
 * @returns The squared magnitude
 */
export function magnitudeSquared3D(vector) {
    validateVector3D(vector);
    return vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;
}
/**
 * Calculates the magnitude (length) of a 4D vector.
 * @param vector - The 4D vector
 * @returns The magnitude of the vector (non-negative)
 */
export function magnitude4D(vector) {
    validateVector4D(vector);
    const magnitude = Math.sqrt(vector.x * vector.x +
        vector.y * vector.y +
        vector.z * vector.z +
        vector.w * vector.w);
    return isApproximatelyZero(magnitude) ? 0 : magnitude;
}
/**
 * Calculates the squared magnitude of a 4D vector (faster, no sqrt).
 * @param vector - The 4D vector
 * @returns The squared magnitude
 */
export function magnitudeSquared4D(vector) {
    validateVector4D(vector);
    return (vector.x * vector.x +
        vector.y * vector.y +
        vector.z * vector.z +
        vector.w * vector.w);
}
/**
 * Normalizes a 2D vector (makes it unit length).
 * @param vector - The 2D vector to normalize
 * @returns The normalized vector (unit vector)
 * @throws {Error} If the vector has zero or near-zero magnitude
 */
export function normalize2D(vector) {
    validateVector2D(vector);
    const mag = magnitude2D(vector);
    if (isApproximatelyZero(mag)) {
        throw new Error('Cannot normalize zero or near-zero vector');
    }
    return {
        x: vector.x / mag,
        y: vector.y / mag,
    };
}
/**
 * Safely normalizes a 2D vector, returns zero vector if magnitude is near zero.
 * @param vector - The 2D vector to normalize
 * @returns The normalized vector or zero vector
 */
export function safeNormalize2D(vector) {
    validateVector2D(vector);
    const mag = magnitude2D(vector);
    if (isApproximatelyZero(mag)) {
        return { x: 0, y: 0 };
    }
    return {
        x: vector.x / mag,
        y: vector.y / mag,
    };
}
/**
 * Normalizes a 3D vector (makes it unit length).
 * @param vector - The 3D vector to normalize
 * @returns The normalized vector (unit vector)
 * @throws {Error} If the vector has zero or near-zero magnitude
 */
export function normalize3D(vector) {
    validateVector3D(vector);
    const mag = magnitude3D(vector);
    if (isApproximatelyZero(mag)) {
        throw new Error('Cannot normalize zero or near-zero vector');
    }
    return {
        x: vector.x / mag,
        y: vector.y / mag,
        z: vector.z / mag,
    };
}
/**
 * Safely normalizes a 3D vector, returns zero vector if magnitude is near zero.
 * @param vector - The 3D vector to normalize
 * @returns The normalized vector or zero vector
 */
export function safeNormalize3D(vector) {
    validateVector3D(vector);
    const mag = magnitude3D(vector);
    if (isApproximatelyZero(mag)) {
        return { x: 0, y: 0, z: 0 };
    }
    return {
        x: vector.x / mag,
        y: vector.y / mag,
        z: vector.z / mag,
    };
}
/**
 * Normalizes a 4D vector (makes it unit length).
 * @param vector - The 4D vector to normalize
 * @returns The normalized vector (unit vector)
 * @throws {Error} If the vector has zero or near-zero magnitude
 */
export function normalize4D(vector) {
    validateVector4D(vector);
    const mag = magnitude4D(vector);
    if (isApproximatelyZero(mag)) {
        throw new Error('Cannot normalize zero or near-zero vector');
    }
    return {
        x: vector.x / mag,
        y: vector.y / mag,
        z: vector.z / mag,
        w: vector.w / mag,
    };
}
/**
 * Safely normalizes a 4D vector, returns zero vector if magnitude is near zero.
 * @param vector - The 4D vector to normalize
 * @returns The normalized vector or zero vector
 */
export function safeNormalize4D(vector) {
    validateVector4D(vector);
    const mag = magnitude4D(vector);
    if (isApproximatelyZero(mag)) {
        return { x: 0, y: 0, z: 0, w: 0 };
    }
    return {
        x: vector.x / mag,
        y: vector.y / mag,
        z: vector.z / mag,
        w: vector.w / mag,
    };
}
/**
 * Calculates the dot product of two 2D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The dot product (scalar)
 */
export function dotProduct2D(a, b) {
    validateVector2D(a, 'First vector');
    validateVector2D(b, 'Second vector');
    return a.x * b.x + a.y * b.y;
}
/**
 * Calculates the dot product of two 3D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The dot product (scalar)
 */
export function dotProduct3D(a, b) {
    validateVector3D(a, 'First vector');
    validateVector3D(b, 'Second vector');
    return a.x * b.x + a.y * b.y + a.z * b.z;
}
/**
 * Calculates the dot product of two 4D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The dot product (scalar)
 */
export function dotProduct4D(a, b) {
    validateVector4D(a, 'First vector');
    validateVector4D(b, 'Second vector');
    return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
}
/**
 * Calculates the cross product of two 3D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The cross product vector (orthogonal to both inputs)
 */
export function crossProduct3D(a, b) {
    validateVector3D(a, 'First vector');
    validateVector3D(b, 'Second vector');
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    };
}
/**
 * Adds two 2D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The sum vector
 */
export function addVectors2D(a, b) {
    validateVector2D(a, 'First vector');
    validateVector2D(b, 'Second vector');
    return {
        x: a.x + b.x,
        y: a.y + b.y,
    };
}
/**
 * Adds two 3D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The sum vector
 */
export function addVectors3D(a, b) {
    validateVector3D(a, 'First vector');
    validateVector3D(b, 'Second vector');
    return {
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z,
    };
}
/**
 * Adds two 4D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The sum vector
 */
export function addVectors4D(a, b) {
    validateVector4D(a, 'First vector');
    validateVector4D(b, 'Second vector');
    return {
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z,
        w: a.w + b.w,
    };
}
/**
 * Subtracts two 2D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The difference vector (a - b)
 */
export function subtractVectors2D(a, b) {
    validateVector2D(a, 'First vector');
    validateVector2D(b, 'Second vector');
    return {
        x: a.x - b.x,
        y: a.y - b.y,
    };
}
/**
 * Subtracts two 3D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The difference vector (a - b)
 */
export function subtractVectors3D(a, b) {
    validateVector3D(a, 'First vector');
    validateVector3D(b, 'Second vector');
    return {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z,
    };
}
/**
 * Subtracts two 4D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The difference vector (a - b)
 */
export function subtractVectors4D(a, b) {
    validateVector4D(a, 'First vector');
    validateVector4D(b, 'Second vector');
    return {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z,
        w: a.w - b.w,
    };
}
/**
 * Multiplies a 2D vector by a scalar.
 * @param vector - The vector
 * @param scalar - The scalar
 * @returns The scaled vector
 */
export function scaleVector2D(vector, scalar) {
    validateVector2D(vector);
    validateNumber(scalar, 'scalar');
    return {
        x: vector.x * scalar,
        y: vector.y * scalar,
    };
}
/**
 * Multiplies a 3D vector by a scalar.
 * @param vector - The vector
 * @param scalar - The scalar
 * @returns The scaled vector
 */
export function scaleVector3D(vector, scalar) {
    validateVector3D(vector);
    validateNumber(scalar, 'scalar');
    return {
        x: vector.x * scalar,
        y: vector.y * scalar,
        z: vector.z * scalar,
    };
}
/**
 * Multiplies a 4D vector by a scalar.
 * @param vector - The vector
 * @param scalar - The scalar
 * @returns The scaled vector
 */
export function scaleVector4D(vector, scalar) {
    validateVector4D(vector);
    validateNumber(scalar, 'scalar');
    return {
        x: vector.x * scalar,
        y: vector.y * scalar,
        z: vector.z * scalar,
        w: vector.w * scalar,
    };
}
/**
 * Calculates the angle between two 2D vectors in radians.
 * @param a - First vector
 * @param b - Second vector
 * @returns The angle in radians [0, π]
 * @throws {Error} If either vector has zero or near-zero magnitude
 */
export function angleBetween2D(a, b) {
    validateVector2D(a, 'First vector');
    validateVector2D(b, 'Second vector');
    const dot = dotProduct2D(a, b);
    const magA = magnitude2D(a);
    const magB = magnitude2D(b);
    if (isApproximatelyZero(magA) || isApproximatelyZero(magB)) {
        throw new Error('Cannot calculate angle with zero or near-zero vector');
    }
    // Clamp to [-1, 1] to avoid floating-point errors
    const cosTheta = Math.max(-1, Math.min(1, dot / (magA * magB)));
    return Math.acos(cosTheta);
}
/**
 * Calculates the angle between two 3D vectors in radians.
 * @param a - First vector
 * @param b - Second vector
 * @returns The angle in radians [0, π]
 * @throws {Error} If either vector has zero or near-zero magnitude
 */
export function angleBetween3D(a, b) {
    validateVector3D(a, 'First vector');
    validateVector3D(b, 'Second vector');
    const dot = dotProduct3D(a, b);
    const magA = magnitude3D(a);
    const magB = magnitude3D(b);
    if (isApproximatelyZero(magA) || isApproximatelyZero(magB)) {
        throw new Error('Cannot calculate angle with zero or near-zero vector');
    }
    // Clamp to [-1, 1] to avoid floating-point errors
    const cosTheta = Math.max(-1, Math.min(1, dot / (magA * magB)));
    return Math.acos(cosTheta);
}
/**
 * Calculates the signed angle between two 2D vectors in radians.
 * @param a - First vector
 * @param b - Second vector
 * @returns The signed angle in radians (-π to π)
 * @throws {Error} If either vector has zero or near-zero magnitude
 */
export function signedAngleBetween2D(a, b) {
    validateVector2D(a, 'First vector');
    validateVector2D(b, 'Second vector');
    const angle = angleBetween2D(a, b);
    const cross = a.x * b.y - a.y * b.x; // 2D cross product (scalar)
    // Return signed angle
    return cross >= 0 ? angle : -angle;
}
/**
 * Calculates the distance between two 2D points.
 * @param a - First point
 * @param b - Second point
 * @returns The Euclidean distance (non-negative)
 */
export function distance2D(a, b) {
    validateVector2D(a, 'First point');
    validateVector2D(b, 'Second point');
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return isApproximatelyZero(distance) ? 0 : distance;
}
/**
 * Calculates the squared distance between two 2D points (faster, no sqrt).
 * @param a - First point
 * @param b - Second point
 * @returns The squared Euclidean distance
 */
export function distanceSquared2D(a, b) {
    validateVector2D(a, 'First point');
    validateVector2D(b, 'Second point');
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return dx * dx + dy * dy;
}
/**
 * Calculates the distance between two 3D points.
 * @param a - First point
 * @param b - Second point
 * @returns The Euclidean distance (non-negative)
 */
export function distance3D(a, b) {
    validateVector3D(a, 'First point');
    validateVector3D(b, 'Second point');
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return isApproximatelyZero(distance) ? 0 : distance;
}
/**
 * Calculates the squared distance between two 3D points (faster, no sqrt).
 * @param a - First point
 * @param b - Second point
 * @returns The squared Euclidean distance
 */
export function distanceSquared3D(a, b) {
    validateVector3D(a, 'First point');
    validateVector3D(b, 'Second point');
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return dx * dx + dy * dy + dz * dz;
}
/**
 * Calculates the distance between two 4D points.
 * @param a - First point
 * @param b - Second point
 * @returns The Euclidean distance (non-negative)
 */
export function distance4D(a, b) {
    validateVector4D(a, 'First point');
    validateVector4D(b, 'Second point');
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const dw = b.w - a.w;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
    return isApproximatelyZero(distance) ? 0 : distance;
}
/**
 * Calculates the squared distance between two 4D points (faster, no sqrt).
 * @param a - First point
 * @param b - Second point
 * @returns The squared Euclidean distance
 */
export function distanceSquared4D(a, b) {
    validateVector4D(a, 'First point');
    validateVector4D(b, 'Second point');
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const dw = b.w - a.w;
    return dx * dx + dy * dy + dz * dz + dw * dw;
}
/**
 * Linearly interpolates between two 2D vectors.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (unclamped, can extrapolate)
 * @returns The interpolated vector
 */
export function lerp2D(start, end, t) {
    validateVector2D(start, 'Start vector');
    validateVector2D(end, 'End vector');
    validateNumber(t, 't');
    // Linear interpolation without clamping (allows extrapolation)
    return {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
    };
}
/**
 * Linearly interpolates between two 2D vectors with clamping.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (clamped to [0, 1])
 * @returns The interpolated vector within the segment
 */
export function lerpClamped2D(start, end, t) {
    validateVector2D(start, 'Start vector');
    validateVector2D(end, 'End vector');
    validateNumber(t, 't');
    // Clamp t to [0, 1]
    const clampedT = Math.max(0, Math.min(1, t));
    return {
        x: start.x + (end.x - start.x) * clampedT,
        y: start.y + (end.y - start.y) * clampedT,
    };
}
/**
 * Linearly interpolates between two 3D vectors.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (unclamped, can extrapolate)
 * @returns The interpolated vector
 */
export function lerp3D(start, end, t) {
    validateVector3D(start, 'Start vector');
    validateVector3D(end, 'End vector');
    validateNumber(t, 't');
    return {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
        z: start.z + (end.z - start.z) * t,
    };
}
/**
 * Linearly interpolates between two 3D vectors with clamping.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (clamped to [0, 1])
 * @returns The interpolated vector within the segment
 */
export function lerpClamped3D(start, end, t) {
    validateVector3D(start, 'Start vector');
    validateVector3D(end, 'End vector');
    validateNumber(t, 't');
    const clampedT = Math.max(0, Math.min(1, t));
    return {
        x: start.x + (end.x - start.x) * clampedT,
        y: start.y + (end.y - start.y) * clampedT,
        z: start.z + (end.z - start.z) * clampedT,
    };
}
/**
 * Linearly interpolates between two 4D vectors.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (unclamped, can extrapolate)
 * @returns The interpolated vector
 */
export function lerp4D(start, end, t) {
    validateVector4D(start, 'Start vector');
    validateVector4D(end, 'End vector');
    validateNumber(t, 't');
    return {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
        z: start.z + (end.z - start.z) * t,
        w: start.w + (end.w - start.w) * t,
    };
}
/**
 * Linearly interpolates between two 4D vectors with clamping.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (clamped to [0, 1])
 * @returns The interpolated vector within the segment
 */
export function lerpClamped4D(start, end, t) {
    validateVector4D(start, 'Start vector');
    validateVector4D(end, 'End vector');
    validateNumber(t, 't');
    const clampedT = Math.max(0, Math.min(1, t));
    return {
        x: start.x + (end.x - start.x) * clampedT,
        y: start.y + (end.y - start.y) * clampedT,
        z: start.z + (end.z - start.z) * clampedT,
        w: start.w + (end.w - start.w) * clampedT,
    };
}
/**
 * Spherically interpolates between two 3D vectors (SLERP).
 * @param start - Starting unit vector
 * @param end - Ending unit vector
 * @param t - Interpolation factor (clamped to [0, 1])
 * @returns The interpolated unit vector
 * @throws {Error} If vectors are not unit length or have near-zero magnitude
 */
export function slerp3D(start, end, t) {
    validateVector3D(start, 'Start vector');
    validateVector3D(end, 'End vector');
    validateNumber(t, 't');
    // Ensure vectors are normalized
    const startMag = magnitude3D(start);
    const endMag = magnitude3D(end);
    if (Math.abs(startMag - 1) > 1e-8 || Math.abs(endMag - 1) > 1e-8) {
        throw new Error('SLERP requires unit vectors');
    }
    const clampedT = Math.max(0, Math.min(1, t));
    const dot = dotProduct3D(start, end);
    // Clamp dot product to handle floating-point errors
    const clampedDot = Math.max(-1, Math.min(1, dot));
    // If vectors are nearly identical, use linear interpolation
    if (clampedDot > 0.9995) {
        return normalize3D(lerp3D(start, end, clampedT));
    }
    const theta = Math.acos(clampedDot);
    const sinTheta = Math.sin(theta);
    const factor1 = Math.sin((1 - clampedT) * theta) / sinTheta;
    const factor2 = Math.sin(clampedT * theta) / sinTheta;
    return addVectors3D(scaleVector3D(start, factor1), scaleVector3D(end, factor2));
}
/**
 * Smoothly interpolates between two vectors using cubic Hermite interpolation.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (unclamped)
 * @returns The interpolated vector
 */
export function smoothstep2D(start, end, t) {
    validateVector2D(start, 'Start vector');
    validateVector2D(end, 'End vector');
    validateNumber(t, 't');
    // Apply smoothstep function: 3t² - 2t³
    const smoothedT = t * t * (3 - 2 * t);
    return {
        x: start.x + (end.x - start.x) * smoothedT,
        y: start.y + (end.y - start.y) * smoothedT,
    };
}
/**
 * Smoothly interpolates with clamping.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (clamped to [0, 1])
 * @returns The interpolated vector
 */
export function smoothstepClamped2D(start, end, t) {
    validateVector2D(start, 'Start vector');
    validateVector2D(end, 'End vector');
    validateNumber(t, 't');
    const clampedT = Math.max(0, Math.min(1, t));
    const smoothedT = clampedT * clampedT * (3 - 2 * clampedT);
    return {
        x: start.x + (end.x - start.x) * smoothedT,
        y: start.y + (end.y - start.y) * smoothedT,
    };
}
/**
 * Smoother interpolation using quintic function.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (unclamped)
 * @returns The interpolated vector
 */
export function smootherstep2D(start, end, t) {
    validateVector2D(start, 'Start vector');
    validateVector2D(end, 'End vector');
    validateNumber(t, 't');
    // Apply smootherstep function: 6t⁵ - 15t⁴ + 10t³
    const smootherT = t * t * t * (t * (t * 6 - 15) + 10);
    return {
        x: start.x + (end.x - start.x) * smootherT,
        y: start.y + (end.y - start.y) * smootherT,
    };
}
/**
 * Interpolates between three vectors (quadratic bezier).
 * @param p0 - Start point
 * @param p1 - Control point
 * @param p2 - End point
 * @param t - Interpolation factor
 * @returns The interpolated vector
 */
export function quadraticBezier2D(p0, p1, p2, t) {
    validateVector2D(p0, 'Start point');
    validateVector2D(p1, 'Control point');
    validateVector2D(p2, 'End point');
    validateNumber(t, 't');
    const oneMinusT = 1 - t;
    // Quadratic Bezier formula: (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
    const x = oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x;
    const y = oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y;
    return { x, y };
}
/**
 * Interpolates between four vectors (cubic bezier).
 * @param p0 - Start point
 * @param p1 - First control point
 * @param p2 - Second control point
 * @param p3 - End point
 * @param t - Interpolation factor
 * @returns The interpolated vector
 */
export function cubicBezier2D(p0, p1, p2, p3, t) {
    validateVector2D(p0, 'Start point');
    validateVector2D(p1, 'First control point');
    validateVector2D(p2, 'Second control point');
    validateVector2D(p3, 'End point');
    validateNumber(t, 't');
    const oneMinusT = 1 - t;
    const oneMinusT2 = oneMinusT * oneMinusT;
    const oneMinusT3 = oneMinusT2 * oneMinusT;
    const t2 = t * t;
    const t3 = t2 * t;
    // Cubic Bezier formula:
    // (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
    const x = oneMinusT3 * p0.x +
        3 * oneMinusT2 * t * p1.x +
        3 * oneMinusT * t2 * p2.x +
        t3 * p3.x;
    const y = oneMinusT3 * p0.y +
        3 * oneMinusT2 * t * p1.y +
        3 * oneMinusT * t2 * p2.y +
        t3 * p3.y;
    return { x, y };
}
/**
 * Maps a value from one range to another range.
 * @param value - The value to map
 * @param inMin - Minimum of input range
 * @param inMax - Maximum of input range
 * @param outMin - Minimum of output range
 * @param outMax - Maximum of output range
 * @returns The mapped value
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
    validateNumber(value, 'value');
    validateNumber(inMin, 'inMin');
    validateNumber(inMax, 'inMax');
    validateNumber(outMin, 'outMin');
    validateNumber(outMax, 'outMax');
    // Avoid division by zero
    if (approximatelyEqual(inMin, inMax)) {
        return outMin;
    }
    return outMin + ((outMax - outMin) * (value - inMin)) / (inMax - inMin);
}
/**
 * Maps and clamps a value from one range to another.
 * @param value - The value to map
 * @param inMin - Minimum of input range
 * @param inMax - Maximum of input range
 * @param outMin - Minimum of output range
 * @param outMax - Maximum of output range
 * @returns The mapped value, clamped to output range
 */
export function mapRangeClamped(value, inMin, inMax, outMin, outMax) {
    validateNumber(value, 'value');
    validateNumber(inMin, 'inMin');
    validateNumber(inMax, 'inMax');
    validateNumber(outMin, 'outMin');
    validateNumber(outMax, 'outMax');
    // Avoid division by zero
    if (approximatelyEqual(inMin, inMax)) {
        return outMin;
    }
    const t = (value - inMin) / (inMax - inMin);
    const clampedT = Math.max(0, Math.min(1, t));
    return outMin + (outMax - outMin) * clampedT;
}
/**
 * Rotates a 2D vector by an angle (in radians).
 * @param vector - The vector to rotate
 * @param angle - The angle in radians
 * @returns The rotated vector
 */
export function rotate2D(vector, angle) {
    validateVector2D(vector);
    validateNumber(angle, 'angle');
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: vector.x * cos - vector.y * sin,
        y: vector.x * sin + vector.y * cos,
    };
}
/**
 * Rotates a 2D vector by an angle (in degrees).
 * @param vector - The vector to rotate
 * @param degrees - The angle in degrees
 * @returns The rotated vector
 */
export function rotate2DDegrees(vector, degrees) {
    return rotate2D(vector, degrees * (Math.PI / 180));
}
/**
 * Reflects a 2D vector across a normal vector.
 * @param vector - The vector to reflect
 * @param normal - The normal vector (must be unit length)
 * @returns The reflected vector
 * @throws {Error} If normal is not unit length
 */
export function reflect2D(vector, normal) {
    validateVector2D(vector, 'Vector');
    validateVector2D(normal, 'Normal');
    // Ensure normal is unit vector
    const normalMag = magnitude2D(normal);
    if (Math.abs(normalMag - 1) > 1e-10) {
        throw new Error('Normal vector must be unit length for reflection');
    }
    const dot = dotProduct2D(vector, normal);
    return {
        x: vector.x - 2 * dot * normal.x,
        y: vector.y - 2 * dot * normal.y,
    };
}
/**
 * Projects vector a onto vector b.
 * @param a - The vector to project
 * @param b - The vector to project onto
 * @returns The projection of a onto b
 * @throws {Error} If b has zero or near-zero magnitude
 */
export function project2D(a, b) {
    validateVector2D(a, 'First vector');
    validateVector2D(b, 'Second vector');
    const bMagSquared = magnitudeSquared2D(b);
    if (isApproximatelyZero(bMagSquared)) {
        throw new Error('Cannot project onto zero or near-zero vector');
    }
    const scale = dotProduct2D(a, b) / bMagSquared;
    return {
        x: b.x * scale,
        y: b.y * scale,
    };
}
/**
 * Checks if two 2D vectors are approximately equal.
 * @param a - First vector
 * @param b - Second vector
 * @returns True if vectors are approximately equal
 */
export function vectorsEqual2D(a, b) {
    validateVector2D(a, 'First vector');
    validateVector2D(b, 'Second vector');
    return approximatelyEqual(a.x, b.x) && approximatelyEqual(a.y, b.y);
}
/**
 * Checks if two 3D vectors are approximately equal.
 * @param a - First vector
 * @param b - Second vector
 * @returns True if vectors are approximately equal
 */
export function vectorsEqual3D(a, b) {
    validateVector3D(a, 'First vector');
    validateVector3D(b, 'Second vector');
    return (approximatelyEqual(a.x, b.x) &&
        approximatelyEqual(a.y, b.y) &&
        approximatelyEqual(a.z, b.z));
}
/**
 * Checks if two 4D vectors are approximately equal.
 * @param a - First vector
 * @param b - Second vector
 * @returns True if vectors are approximately equal
 */
export function vectorsEqual4D(a, b) {
    validateVector4D(a, 'First vector');
    validateVector4D(b, 'Second vector');
    return (approximatelyEqual(a.x, b.x) &&
        approximatelyEqual(a.y, b.y) &&
        approximatelyEqual(a.z, b.z) &&
        approximatelyEqual(a.w, b.w));
}
/**
 * Calculates the midpoint between two 2D points.
 * @param a - First point
 * @param b - Second point
 * @returns The midpoint
 */
export function midpoint2D(a, b) {
    validateVector2D(a, 'First point');
    validateVector2D(b, 'Second point');
    return {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
    };
}
/**
 * Calculates the centroid of multiple 2D points.
 * @param points - Array of points
 * @returns The centroid
 * @throws {Error} If points array is empty
 */
export function centroid2D(points) {
    if (!Array.isArray(points) || points.length === 0) {
        throw new Error('Points array must not be empty');
    }
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < points.length; i++) {
        validateVector2D(points[i], `points[${i}]`);
        sumX += points[i].x;
        sumY += points[i].y;
    }
    return {
        x: sumX / points.length,
        y: sumY / points.length,
    };
}
/**
 * Negates a 2D vector (reverses its direction).
 * @param vector - The vector to negate
 * @returns The negated vector
 */
export function negateVector2D(vector) {
    validateVector2D(vector);
    return { x: -vector.x, y: -vector.y };
}
/**
 * Negates a 3D vector (reverses its direction).
 * @param vector - The vector to negate
 * @returns The negated vector
 */
export function negateVector3D(vector) {
    validateVector3D(vector);
    return { x: -vector.x, y: -vector.y, z: -vector.z };
}
/**
 * Negates a 4D vector (reverses its direction).
 * @param vector - The vector to negate
 * @returns The negated vector
 */
export function negateVector4D(vector) {
    validateVector4D(vector);
    return { x: -vector.x, y: -vector.y, z: -vector.z, w: -vector.w };
}
/**
 * Calculates the perpendicular 2D vector (90° rotation).
 * @param vector - The vector
 * @param clockwise - True for clockwise rotation, false for counterclockwise
 * @returns The perpendicular vector
 */
export function perpendicular2D(vector, clockwise = true) {
    validateVector2D(vector);
    if (clockwise) {
        return { x: vector.y, y: -vector.x }; // 90° clockwise
    }
    else {
        return { x: -vector.y, y: vector.x }; // 90° counterclockwise
    }
}
/**
 * Creates a zero 2D vector.
 * @returns Zero vector
 */
export function zeroVector2D() {
    return { x: 0, y: 0 };
}
/**
 * Creates a zero 3D vector.
 * @returns Zero vector
 */
export function zeroVector3D() {
    return { x: 0, y: 0, z: 0 };
}
/**
 * Creates a zero 4D vector.
 * @returns Zero vector
 */
export function zeroVector4D() {
    return { x: 0, y: 0, z: 0, w: 0 };
}
/**
 * Creates a 2D unit vector along the X axis.
 * @returns Unit vector (1, 0)
 */
export function unitX2D() {
    return { x: 1, y: 0 };
}
/**
 * Creates a 2D unit vector along the Y axis.
 * @returns Unit vector (0, 1)
 */
export function unitY2D() {
    return { x: 0, y: 1 };
}
/**
 * Creates a 3D unit vector along the X axis.
 * @returns Unit vector (1, 0, 0)
 */
export function unitX3D() {
    return { x: 1, y: 0, z: 0 };
}
/**
 * Creates a 3D unit vector along the Y axis.
 * @returns Unit vector (0, 1, 0)
 */
export function unitY3D() {
    return { x: 0, y: 1, z: 0 };
}
/**
 * Creates a 3D unit vector along the Z axis.
 * @returns Unit vector (0, 0, 1)
 */
export function unitZ3D() {
    return { x: 0, y: 0, z: 1 };
}
