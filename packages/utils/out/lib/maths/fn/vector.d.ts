/**
 * Vector operations for 2D, 3D, and 4D vectors.
 * @module VectorFunctions
 */
import type { Vector2D, Vector3D, Vector4D } from '../types/advanced.js';
/**
 * Creates a 2D vector with validation.
 * @param x - X component
 * @param y - Y component
 * @returns Validated 2D vector
 */
export declare function createVector2D(x: number, y: number): Vector2D;
/**
 * Creates a 3D vector with validation.
 * @param x - X component
 * @param y - Y component
 * @param z - Z component
 * @returns Validated 3D vector
 */
export declare function createVector3D(x: number, y: number, z: number): Vector3D;
/**
 * Creates a 4D vector with validation.
 * @param x - X component
 * @param y - Y component
 * @param z - Z component
 * @param w - W component
 * @returns Validated 4D vector
 */
export declare function createVector4D(x: number, y: number, z: number, w: number): Vector4D;
/**
 * Calculates the magnitude (length) of a 2D vector.
 * @param vector - The 2D vector
 * @returns The magnitude of the vector (non-negative)
 */
export declare function magnitude2D(vector: Vector2D): number;
/**
 * Calculates the squared magnitude of a 2D vector (faster, no sqrt).
 * @param vector - The 2D vector
 * @returns The squared magnitude
 */
export declare function magnitudeSquared2D(vector: Vector2D): number;
/**
 * Calculates the magnitude (length) of a 3D vector.
 * @param vector - The 3D vector
 * @returns The magnitude of the vector (non-negative)
 */
export declare function magnitude3D(vector: Vector3D): number;
/**
 * Calculates the squared magnitude of a 3D vector (faster, no sqrt).
 * @param vector - The 3D vector
 * @returns The squared magnitude
 */
export declare function magnitudeSquared3D(vector: Vector3D): number;
/**
 * Calculates the magnitude (length) of a 4D vector.
 * @param vector - The 4D vector
 * @returns The magnitude of the vector (non-negative)
 */
export declare function magnitude4D(vector: Vector4D): number;
/**
 * Calculates the squared magnitude of a 4D vector (faster, no sqrt).
 * @param vector - The 4D vector
 * @returns The squared magnitude
 */
export declare function magnitudeSquared4D(vector: Vector4D): number;
/**
 * Normalizes a 2D vector (makes it unit length).
 * @param vector - The 2D vector to normalize
 * @returns The normalized vector (unit vector)
 * @throws {Error} If the vector has zero or near-zero magnitude
 */
export declare function normalize2D(vector: Vector2D): Vector2D;
/**
 * Safely normalizes a 2D vector, returns zero vector if magnitude is near zero.
 * @param vector - The 2D vector to normalize
 * @returns The normalized vector or zero vector
 */
export declare function safeNormalize2D(vector: Vector2D): Vector2D;
/**
 * Normalizes a 3D vector (makes it unit length).
 * @param vector - The 3D vector to normalize
 * @returns The normalized vector (unit vector)
 * @throws {Error} If the vector has zero or near-zero magnitude
 */
export declare function normalize3D(vector: Vector3D): Vector3D;
/**
 * Safely normalizes a 3D vector, returns zero vector if magnitude is near zero.
 * @param vector - The 3D vector to normalize
 * @returns The normalized vector or zero vector
 */
export declare function safeNormalize3D(vector: Vector3D): Vector3D;
/**
 * Normalizes a 4D vector (makes it unit length).
 * @param vector - The 4D vector to normalize
 * @returns The normalized vector (unit vector)
 * @throws {Error} If the vector has zero or near-zero magnitude
 */
export declare function normalize4D(vector: Vector4D): Vector4D;
/**
 * Safely normalizes a 4D vector, returns zero vector if magnitude is near zero.
 * @param vector - The 4D vector to normalize
 * @returns The normalized vector or zero vector
 */
export declare function safeNormalize4D(vector: Vector4D): Vector4D;
/**
 * Calculates the dot product of two 2D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The dot product (scalar)
 */
export declare function dotProduct2D(a: Vector2D, b: Vector2D): number;
/**
 * Calculates the dot product of two 3D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The dot product (scalar)
 */
export declare function dotProduct3D(a: Vector3D, b: Vector3D): number;
/**
 * Calculates the dot product of two 4D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The dot product (scalar)
 */
export declare function dotProduct4D(a: Vector4D, b: Vector4D): number;
/**
 * Calculates the cross product of two 3D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The cross product vector (orthogonal to both inputs)
 */
export declare function crossProduct3D(a: Vector3D, b: Vector3D): Vector3D;
/**
 * Adds two 2D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The sum vector
 */
export declare function addVectors2D(a: Vector2D, b: Vector2D): Vector2D;
/**
 * Adds two 3D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The sum vector
 */
export declare function addVectors3D(a: Vector3D, b: Vector3D): Vector3D;
/**
 * Adds two 4D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The sum vector
 */
export declare function addVectors4D(a: Vector4D, b: Vector4D): Vector4D;
/**
 * Subtracts two 2D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The difference vector (a - b)
 */
export declare function subtractVectors2D(a: Vector2D, b: Vector2D): Vector2D;
/**
 * Subtracts two 3D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The difference vector (a - b)
 */
export declare function subtractVectors3D(a: Vector3D, b: Vector3D): Vector3D;
/**
 * Subtracts two 4D vectors.
 * @param a - First vector
 * @param b - Second vector
 * @returns The difference vector (a - b)
 */
export declare function subtractVectors4D(a: Vector4D, b: Vector4D): Vector4D;
/**
 * Multiplies a 2D vector by a scalar.
 * @param vector - The vector
 * @param scalar - The scalar
 * @returns The scaled vector
 */
export declare function scaleVector2D(vector: Vector2D, scalar: number): Vector2D;
/**
 * Multiplies a 3D vector by a scalar.
 * @param vector - The vector
 * @param scalar - The scalar
 * @returns The scaled vector
 */
export declare function scaleVector3D(vector: Vector3D, scalar: number): Vector3D;
/**
 * Multiplies a 4D vector by a scalar.
 * @param vector - The vector
 * @param scalar - The scalar
 * @returns The scaled vector
 */
export declare function scaleVector4D(vector: Vector4D, scalar: number): Vector4D;
/**
 * Calculates the angle between two 2D vectors in radians.
 * @param a - First vector
 * @param b - Second vector
 * @returns The angle in radians [0, π]
 * @throws {Error} If either vector has zero or near-zero magnitude
 */
export declare function angleBetween2D(a: Vector2D, b: Vector2D): number;
/**
 * Calculates the angle between two 3D vectors in radians.
 * @param a - First vector
 * @param b - Second vector
 * @returns The angle in radians [0, π]
 * @throws {Error} If either vector has zero or near-zero magnitude
 */
export declare function angleBetween3D(a: Vector3D, b: Vector3D): number;
/**
 * Calculates the signed angle between two 2D vectors in radians.
 * @param a - First vector
 * @param b - Second vector
 * @returns The signed angle in radians (-π to π)
 * @throws {Error} If either vector has zero or near-zero magnitude
 */
export declare function signedAngleBetween2D(a: Vector2D, b: Vector2D): number;
/**
 * Calculates the distance between two 2D points.
 * @param a - First point
 * @param b - Second point
 * @returns The Euclidean distance (non-negative)
 */
export declare function distance2D(a: Vector2D, b: Vector2D): number;
/**
 * Calculates the squared distance between two 2D points (faster, no sqrt).
 * @param a - First point
 * @param b - Second point
 * @returns The squared Euclidean distance
 */
export declare function distanceSquared2D(a: Vector2D, b: Vector2D): number;
/**
 * Calculates the distance between two 3D points.
 * @param a - First point
 * @param b - Second point
 * @returns The Euclidean distance (non-negative)
 */
export declare function distance3D(a: Vector3D, b: Vector3D): number;
/**
 * Calculates the squared distance between two 3D points (faster, no sqrt).
 * @param a - First point
 * @param b - Second point
 * @returns The squared Euclidean distance
 */
export declare function distanceSquared3D(a: Vector3D, b: Vector3D): number;
/**
 * Calculates the distance between two 4D points.
 * @param a - First point
 * @param b - Second point
 * @returns The Euclidean distance (non-negative)
 */
export declare function distance4D(a: Vector4D, b: Vector4D): number;
/**
 * Calculates the squared distance between two 4D points (faster, no sqrt).
 * @param a - First point
 * @param b - Second point
 * @returns The squared Euclidean distance
 */
export declare function distanceSquared4D(a: Vector4D, b: Vector4D): number;
/**
 * Linearly interpolates between two 2D vectors.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (unclamped, can extrapolate)
 * @returns The interpolated vector
 */
export declare function lerp2D(start: Vector2D, end: Vector2D, t: number): Vector2D;
/**
 * Linearly interpolates between two 2D vectors with clamping.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (clamped to [0, 1])
 * @returns The interpolated vector within the segment
 */
export declare function lerpClamped2D(start: Vector2D, end: Vector2D, t: number): Vector2D;
/**
 * Linearly interpolates between two 3D vectors.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (unclamped, can extrapolate)
 * @returns The interpolated vector
 */
export declare function lerp3D(start: Vector3D, end: Vector3D, t: number): Vector3D;
/**
 * Linearly interpolates between two 3D vectors with clamping.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (clamped to [0, 1])
 * @returns The interpolated vector within the segment
 */
export declare function lerpClamped3D(start: Vector3D, end: Vector3D, t: number): Vector3D;
/**
 * Linearly interpolates between two 4D vectors.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (unclamped, can extrapolate)
 * @returns The interpolated vector
 */
export declare function lerp4D(start: Vector4D, end: Vector4D, t: number): Vector4D;
/**
 * Linearly interpolates between two 4D vectors with clamping.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (clamped to [0, 1])
 * @returns The interpolated vector within the segment
 */
export declare function lerpClamped4D(start: Vector4D, end: Vector4D, t: number): Vector4D;
/**
 * Spherically interpolates between two 3D vectors (SLERP).
 * @param start - Starting unit vector
 * @param end - Ending unit vector
 * @param t - Interpolation factor (clamped to [0, 1])
 * @returns The interpolated unit vector
 * @throws {Error} If vectors are not unit length or have near-zero magnitude
 */
export declare function slerp3D(start: Vector3D, end: Vector3D, t: number): Vector3D;
/**
 * Smoothly interpolates between two vectors using cubic Hermite interpolation.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (unclamped)
 * @returns The interpolated vector
 */
export declare function smoothstep2D(start: Vector2D, end: Vector2D, t: number): Vector2D;
/**
 * Smoothly interpolates with clamping.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (clamped to [0, 1])
 * @returns The interpolated vector
 */
export declare function smoothstepClamped2D(start: Vector2D, end: Vector2D, t: number): Vector2D;
/**
 * Smoother interpolation using quintic function.
 * @param start - Starting vector
 * @param end - Ending vector
 * @param t - Interpolation factor (unclamped)
 * @returns The interpolated vector
 */
export declare function smootherstep2D(start: Vector2D, end: Vector2D, t: number): Vector2D;
/**
 * Interpolates between three vectors (quadratic bezier).
 * @param p0 - Start point
 * @param p1 - Control point
 * @param p2 - End point
 * @param t - Interpolation factor
 * @returns The interpolated vector
 */
export declare function quadraticBezier2D(p0: Vector2D, p1: Vector2D, p2: Vector2D, t: number): Vector2D;
/**
 * Interpolates between four vectors (cubic bezier).
 * @param p0 - Start point
 * @param p1 - First control point
 * @param p2 - Second control point
 * @param p3 - End point
 * @param t - Interpolation factor
 * @returns The interpolated vector
 */
export declare function cubicBezier2D(p0: Vector2D, p1: Vector2D, p2: Vector2D, p3: Vector2D, t: number): Vector2D;
/**
 * Maps a value from one range to another range.
 * @param value - The value to map
 * @param inMin - Minimum of input range
 * @param inMax - Maximum of input range
 * @param outMin - Minimum of output range
 * @param outMax - Maximum of output range
 * @returns The mapped value
 */
export declare function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number;
/**
 * Maps and clamps a value from one range to another.
 * @param value - The value to map
 * @param inMin - Minimum of input range
 * @param inMax - Maximum of input range
 * @param outMin - Minimum of output range
 * @param outMax - Maximum of output range
 * @returns The mapped value, clamped to output range
 */
export declare function mapRangeClamped(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number;
/**
 * Rotates a 2D vector by an angle (in radians).
 * @param vector - The vector to rotate
 * @param angle - The angle in radians
 * @returns The rotated vector
 */
export declare function rotate2D(vector: Vector2D, angle: number): Vector2D;
/**
 * Rotates a 2D vector by an angle (in degrees).
 * @param vector - The vector to rotate
 * @param degrees - The angle in degrees
 * @returns The rotated vector
 */
export declare function rotate2DDegrees(vector: Vector2D, degrees: number): Vector2D;
/**
 * Reflects a 2D vector across a normal vector.
 * @param vector - The vector to reflect
 * @param normal - The normal vector (must be unit length)
 * @returns The reflected vector
 * @throws {Error} If normal is not unit length
 */
export declare function reflect2D(vector: Vector2D, normal: Vector2D): Vector2D;
/**
 * Projects vector a onto vector b.
 * @param a - The vector to project
 * @param b - The vector to project onto
 * @returns The projection of a onto b
 * @throws {Error} If b has zero or near-zero magnitude
 */
export declare function project2D(a: Vector2D, b: Vector2D): Vector2D;
/**
 * Checks if two 2D vectors are approximately equal.
 * @param a - First vector
 * @param b - Second vector
 * @returns True if vectors are approximately equal
 */
export declare function vectorsEqual2D(a: Vector2D, b: Vector2D): boolean;
/**
 * Checks if two 3D vectors are approximately equal.
 * @param a - First vector
 * @param b - Second vector
 * @returns True if vectors are approximately equal
 */
export declare function vectorsEqual3D(a: Vector3D, b: Vector3D): boolean;
/**
 * Checks if two 4D vectors are approximately equal.
 * @param a - First vector
 * @param b - Second vector
 * @returns True if vectors are approximately equal
 */
export declare function vectorsEqual4D(a: Vector4D, b: Vector4D): boolean;
/**
 * Calculates the midpoint between two 2D points.
 * @param a - First point
 * @param b - Second point
 * @returns The midpoint
 */
export declare function midpoint2D(a: Vector2D, b: Vector2D): Vector2D;
/**
 * Calculates the centroid of multiple 2D points.
 * @param points - Array of points
 * @returns The centroid
 * @throws {Error} If points array is empty
 */
export declare function centroid2D(points: Vector2D[]): Vector2D;
/**
 * Negates a 2D vector (reverses its direction).
 * @param vector - The vector to negate
 * @returns The negated vector
 */
export declare function negateVector2D(vector: Vector2D): Vector2D;
/**
 * Negates a 3D vector (reverses its direction).
 * @param vector - The vector to negate
 * @returns The negated vector
 */
export declare function negateVector3D(vector: Vector3D): Vector3D;
/**
 * Negates a 4D vector (reverses its direction).
 * @param vector - The vector to negate
 * @returns The negated vector
 */
export declare function negateVector4D(vector: Vector4D): Vector4D;
/**
 * Calculates the perpendicular 2D vector (90° rotation).
 * @param vector - The vector
 * @param clockwise - True for clockwise rotation, false for counterclockwise
 * @returns The perpendicular vector
 */
export declare function perpendicular2D(vector: Vector2D, clockwise?: boolean): Vector2D;
/**
 * Creates a zero 2D vector.
 * @returns Zero vector
 */
export declare function zeroVector2D(): Vector2D;
/**
 * Creates a zero 3D vector.
 * @returns Zero vector
 */
export declare function zeroVector3D(): Vector3D;
/**
 * Creates a zero 4D vector.
 * @returns Zero vector
 */
export declare function zeroVector4D(): Vector4D;
/**
 * Creates a 2D unit vector along the X axis.
 * @returns Unit vector (1, 0)
 */
export declare function unitX2D(): Vector2D;
/**
 * Creates a 2D unit vector along the Y axis.
 * @returns Unit vector (0, 1)
 */
export declare function unitY2D(): Vector2D;
/**
 * Creates a 3D unit vector along the X axis.
 * @returns Unit vector (1, 0, 0)
 */
export declare function unitX3D(): Vector3D;
/**
 * Creates a 3D unit vector along the Y axis.
 * @returns Unit vector (0, 1, 0)
 */
export declare function unitY3D(): Vector3D;
/**
 * Creates a 3D unit vector along the Z axis.
 * @returns Unit vector (0, 0, 1)
 */
export declare function unitZ3D(): Vector3D;
//# sourceMappingURL=vector.d.ts.map