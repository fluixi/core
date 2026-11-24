import { describe, it, expect } from 'vitest';
import {
  // Basic vector operations
  createVector2D,
  createVector3D,
  createVector4D,
  magnitudeSquared2D,
  magnitudeSquared3D,
  magnitudeSquared4D,
  // Normalization variants
  safeNormalize2D,
  safeNormalize3D,
  normalize4D,
  safeNormalize4D,
  // Additional vector operations
  dotProduct4D,
  addVectors3D,
  addVectors4D,
  subtractVectors3D,
  subtractVectors4D,
  scaleVector3D,
  scaleVector4D,
  // Angle calculations
  angleBetween3D,
  signedAngleBetween2D,
  // Geometry operations
  reflect2D,
  project2D,
  // Equality checks
  vectorsEqual2D,
  vectorsEqual3D,
  vectorsEqual4D,
  // Interpolation and bezier
  lerpClamped2D,
  lerpClamped3D,
  lerpClamped4D,
  slerp3D,
  smoothstepClamped2D,
  smootherstep2D,
  quadraticBezier2D,
  cubicBezier2D,
  // Midpoint and centroid
  midpoint2D,
  centroid2D,
  // Vector transformations
  negateVector2D,
  negateVector3D,
  negateVector4D,
  perpendicular2D,
  // Special vectors
  zeroVector2D,
  zeroVector3D,
  zeroVector4D,
  unitX2D,
  unitY2D,
  unitX3D,
  unitY3D,
  unitZ3D,
  // Range mapping
  mapRange,
  mapRangeClamped,
  // Helper functions
  lerp2D,
  magnitude2D,
  magnitude3D,
  magnitude4D,
  normalize2D,
  normalize3D,
  dotProduct2D,
  dotProduct3D,
  crossProduct3D,
  addVectors2D,
  subtractVectors2D,
  scaleVector2D,
  angleBetween2D,
  distance2D,
  distance3D,
  rotate2D,
} from './vector.js';
import type { Vector2D, Vector3D } from '../types/advanced.js';

describe('Vector Functions', () => {
  describe('magnitude2D', () => {
    it('should calculate magnitude of 2D vector', () => {
      expect(magnitude2D({ x: 3, y: 4 })).toBe(5);
      expect(magnitude2D({ x: 0, y: 0 })).toBe(0);
      expect(magnitude2D({ x: 1, y: 0 })).toBe(1);
      expect(magnitude2D({ x: 0, y: 1 })).toBe(1);
    });

    it('should handle negative components', () => {
      expect(magnitude2D({ x: -3, y: -4 })).toBe(5);
      expect(magnitude2D({ x: -5, y: 0 })).toBe(5);
    });

    it('should handle decimal values', () => {
      expect(magnitude2D({ x: 1.5, y: 2 })).toBeCloseTo(2.5);
      expect(magnitude2D({ x: 0.6, y: 0.8 })).toBeCloseTo(1);
    });

    it('should calculate magnitude for unit vectors', () => {
      expect(magnitude2D({ x: 1, y: 0 })).toBe(1);
      expect(magnitude2D({ x: 0, y: 1 })).toBe(1);
    });
  });

  describe('magnitude3D', () => {
    it('should calculate magnitude of 3D vector', () => {
      expect(magnitude3D({ x: 2, y: 3, z: 6 })).toBe(7);
      expect(magnitude3D({ x: 0, y: 0, z: 0 })).toBe(0);
      expect(magnitude3D({ x: 1, y: 0, z: 0 })).toBe(1);
    });

    it('should handle negative components', () => {
      expect(magnitude3D({ x: -2, y: -3, z: -6 })).toBe(7);
      expect(magnitude3D({ x: -1, y: 0, z: 0 })).toBe(1);
    });

    it('should handle decimal values', () => {
      expect(magnitude3D({ x: 1, y: 2, z: 2 })).toBe(3);
      expect(magnitude3D({ x: 0.5, y: 0.5, z: 0.5 })).toBeCloseTo(0.866025);
    });

    it('should calculate magnitude for unit vectors', () => {
      expect(magnitude3D({ x: 1, y: 0, z: 0 })).toBe(1);
      expect(magnitude3D({ x: 0, y: 1, z: 0 })).toBe(1);
      expect(magnitude3D({ x: 0, y: 0, z: 1 })).toBe(1);
    });
  });

  describe('magnitude4D', () => {
    it('should calculate magnitude of 4D vector', () => {
      expect(magnitude4D({ x: 0, y: 0, z: 0, w: 0 })).toBe(0);
      expect(magnitude4D({ x: 1, y: 0, z: 0, w: 0 })).toBe(1);
    });

    it('should handle negative components', () => {
      expect(magnitude4D({ x: -1, y: -2, z: -2, w: -1 })).toBeCloseTo(3.16227);
    });

    it('should handle decimal values', () => {
      expect(magnitude4D({ x: 0.5, y: 0.5, z: 0.5, w: 0.5 })).toBe(1);
    });

    it('should calculate magnitude for unit vectors', () => {
      expect(magnitude4D({ x: 1, y: 0, z: 0, w: 0 })).toBe(1);
      expect(magnitude4D({ x: 0, y: 1, z: 0, w: 0 })).toBe(1);
      expect(magnitude4D({ x: 0, y: 0, z: 1, w: 0 })).toBe(1);
      expect(magnitude4D({ x: 0, y: 0, z: 0, w: 1 })).toBe(1);
    });
  });

  describe('normalize2D', () => {
    it('should normalize 2D vector to unit length', () => {
      const result = normalize2D({ x: 3, y: 4 });
      expect(result.x).toBeCloseTo(0.6);
      expect(result.y).toBeCloseTo(0.8);
      expect(magnitude2D(result)).toBeCloseTo(1);
    });

    it('should handle already normalized vectors', () => {
      const result = normalize2D({ x: 1, y: 0 });
      expect(result.x).toBe(1);
      expect(result.y).toBe(0);
    });

    it('should throw error for zero vector', () => {
      expect(() => normalize2D({ x: 0, y: 0 })).toThrow(
        'Cannot normalize zero or near-zero vector'
      );
    });

    it('should handle negative components', () => {
      const result = normalize2D({ x: -3, y: -4 });
      expect(result.x).toBeCloseTo(-0.6);
      expect(result.y).toBeCloseTo(-0.8);
      expect(magnitude2D(result)).toBeCloseTo(1);
    });

    it('should produce unit vector', () => {
      const vectors: Vector2D[] = [
        { x: 5, y: 12 },
        { x: -7, y: 24 },
        { x: 1, y: 1 },
      ];

      vectors.forEach((v) => {
        const normalized = normalize2D(v);
        expect(magnitude2D(normalized)).toBeCloseTo(1);
      });
    });
  });

  describe('normalize3D', () => {
    it('should normalize 3D vector to unit length', () => {
      const result = normalize3D({ x: 2, y: 3, z: 6 });
      expect(result.x).toBeCloseTo(2 / 7);
      expect(result.y).toBeCloseTo(3 / 7);
      expect(result.z).toBeCloseTo(6 / 7);
      expect(magnitude3D(result)).toBeCloseTo(1);
    });

    it('should handle already normalized vectors', () => {
      const result = normalize3D({ x: 1, y: 0, z: 0 });
      expect(result.x).toBe(1);
      expect(result.y).toBe(0);
      expect(result.z).toBe(0);
    });

    it('should throw error for zero vector', () => {
      expect(() => normalize3D({ x: 0, y: 0, z: 0 })).toThrow(
        'Cannot normalize zero or near-zero vector'
      );
    });

    it('should handle negative components', () => {
      const result = normalize3D({ x: -1, y: -2, z: -2 });
      expect(magnitude3D(result)).toBeCloseTo(1);
    });

    it('should produce unit vector', () => {
      const vectors: Vector3D[] = [
        { x: 1, y: 2, z: 2 },
        { x: -3, y: 4, z: 0 },
        { x: 1, y: 1, z: 1 },
      ];

      vectors.forEach((v) => {
        const normalized = normalize3D(v);
        expect(magnitude3D(normalized)).toBeCloseTo(1);
      });
    });
  });

  describe('dotProduct2D', () => {
    it('should calculate dot product of 2D vectors', () => {
      expect(dotProduct2D({ x: 1, y: 2 }, { x: 3, y: 4 })).toBe(11);
      expect(dotProduct2D({ x: 2, y: 3 }, { x: 4, y: 5 })).toBe(23);
    });

    it('should return zero for perpendicular vectors', () => {
      expect(dotProduct2D({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(0);
      expect(dotProduct2D({ x: 1, y: 1 }, { x: -1, y: 1 })).toBe(0);
    });

    it('should handle negative components', () => {
      expect(dotProduct2D({ x: -1, y: 2 }, { x: 3, y: -4 })).toBe(-11);
    });

    it('should return squared magnitude for same vector', () => {
      const v: Vector2D = { x: 3, y: 4 };
      expect(dotProduct2D(v, v)).toBe(25);
    });

    it('should handle zero vectors', () => {
      expect(dotProduct2D({ x: 0, y: 0 }, { x: 5, y: 10 })).toBe(0);
    });
  });

  describe('dotProduct3D', () => {
    it('should calculate dot product of 3D vectors', () => {
      expect(dotProduct3D({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 })).toBe(32);
      expect(dotProduct3D({ x: 2, y: 3, z: 4 }, { x: 1, y: 0, z: -1 })).toBe(
        -2
      );
    });

    it('should return zero for perpendicular vectors', () => {
      expect(dotProduct3D({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toBe(0);
      expect(dotProduct3D({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 })).toBe(0);
    });

    it('should handle negative components', () => {
      expect(dotProduct3D({ x: -1, y: 2, z: -3 }, { x: 4, y: -5, z: 6 })).toBe(
        -32
      );
    });

    it('should return squared magnitude for same vector', () => {
      const v: Vector3D = { x: 2, y: 3, z: 6 };
      expect(dotProduct3D(v, v)).toBe(49);
    });

    it('should handle zero vectors', () => {
      expect(dotProduct3D({ x: 0, y: 0, z: 0 }, { x: 5, y: 10, z: 15 })).toBe(
        0
      );
    });
  });

  describe('crossProduct3D', () => {
    it('should calculate cross product of 3D vectors', () => {
      const result = crossProduct3D({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(1);
    });

    it('should return zero vector for parallel vectors', () => {
      const result = crossProduct3D({ x: 1, y: 2, z: 3 }, { x: 2, y: 4, z: 6 });
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(0);
    });

    it('should be anti-commutative', () => {
      const a: Vector3D = { x: 1, y: 2, z: 3 };
      const b: Vector3D = { x: 4, y: 5, z: 6 };
      const ab = crossProduct3D(a, b);
      const ba = crossProduct3D(b, a);

      expect(ab.x).toBeCloseTo(-ba.x);
      expect(ab.y).toBeCloseTo(-ba.y);
      expect(ab.z).toBeCloseTo(-ba.z);
    });

    it('should be perpendicular to both input vectors', () => {
      const a: Vector3D = { x: 1, y: 2, z: 3 };
      const b: Vector3D = { x: 4, y: 5, z: 6 };
      const c = crossProduct3D(a, b);

      expect(dotProduct3D(a, c)).toBeCloseTo(0);
      expect(dotProduct3D(b, c)).toBeCloseTo(0);
    });

    it('should handle standard basis vectors', () => {
      const i: Vector3D = { x: 1, y: 0, z: 0 };
      const j: Vector3D = { x: 0, y: 1, z: 0 };
      const k: Vector3D = { x: 0, y: 0, z: 1 };

      const ij = crossProduct3D(i, j);
      expect(ij).toEqual(k);

      const jk = crossProduct3D(j, k);
      expect(jk).toEqual(i);

      const ki = crossProduct3D(k, i);
      expect(ki).toEqual(j);
    });
  });

  describe('addVectors2D', () => {
    it('should add two 2D vectors', () => {
      const result = addVectors2D({ x: 1, y: 2 }, { x: 3, y: 4 });
      expect(result).toEqual({ x: 4, y: 6 });
    });

    it('should handle negative components', () => {
      const result = addVectors2D({ x: 5, y: 3 }, { x: -2, y: -1 });
      expect(result).toEqual({ x: 3, y: 2 });
    });

    it('should handle zero vectors', () => {
      const result = addVectors2D({ x: 5, y: 10 }, { x: 0, y: 0 });
      expect(result).toEqual({ x: 5, y: 10 });
    });

    it('should be commutative', () => {
      const a: Vector2D = { x: 1, y: 2 };
      const b: Vector2D = { x: 3, y: 4 };
      const ab = addVectors2D(a, b);
      const ba = addVectors2D(b, a);
      expect(ab).toEqual(ba);
    });
  });

  describe('subtractVectors2D', () => {
    it('should subtract two 2D vectors', () => {
      const result = subtractVectors2D({ x: 5, y: 7 }, { x: 2, y: 3 });
      expect(result).toEqual({ x: 3, y: 4 });
    });

    it('should handle negative components', () => {
      const result = subtractVectors2D({ x: 1, y: 2 }, { x: -3, y: -4 });
      expect(result).toEqual({ x: 4, y: 6 });
    });

    it('should return zero vector when subtracting from itself', () => {
      const v: Vector2D = { x: 5, y: 10 };
      const result = subtractVectors2D(v, v);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should handle zero vectors', () => {
      const result = subtractVectors2D({ x: 5, y: 10 }, { x: 0, y: 0 });
      expect(result).toEqual({ x: 5, y: 10 });
    });
  });

  describe('scaleVector2D', () => {
    it('should scale 2D vector by scalar', () => {
      const result = scaleVector2D({ x: 2, y: 3 }, 3);
      expect(result).toEqual({ x: 6, y: 9 });
    });

    it('should handle negative scalar', () => {
      const result = scaleVector2D({ x: 2, y: 3 }, -2);
      expect(result).toEqual({ x: -4, y: -6 });
    });

    it('should handle zero scalar', () => {
      const result = scaleVector2D({ x: 5, y: 10 }, 0);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should handle scalar of 1', () => {
      const result = scaleVector2D({ x: 5, y: 10 }, 1);
      expect(result).toEqual({ x: 5, y: 10 });
    });

    it('should handle decimal scalar', () => {
      const result = scaleVector2D({ x: 4, y: 6 }, 0.5);
      expect(result).toEqual({ x: 2, y: 3 });
    });
  });

  describe('angleBetween2D', () => {
    it('should calculate angle between two vectors', () => {
      const angle = angleBetween2D({ x: 1, y: 0 }, { x: 0, y: 1 });
      expect(angle).toBeCloseTo(Math.PI / 2);
    });

    it('should return 0 for parallel vectors', () => {
      const angle = angleBetween2D({ x: 1, y: 1 }, { x: 2, y: 2 });
      expect(angle).toBeCloseTo(0);
    });

    it('should return π for opposite vectors', () => {
      const angle = angleBetween2D({ x: 1, y: 0 }, { x: -1, y: 0 });
      expect(angle).toBeCloseTo(Math.PI);
    });

    it('should throw error for zero vector', () => {
      expect(() => angleBetween2D({ x: 0, y: 0 }, { x: 1, y: 1 })).toThrow(
        'Cannot calculate angle with zero or near-zero vector'
      );
      expect(() => angleBetween2D({ x: 1, y: 1 }, { x: 0, y: 0 })).toThrow(
        'Cannot calculate angle with zero or near-zero vector'
      );
    });

    it('should handle 45-degree angle', () => {
      const angle = angleBetween2D({ x: 1, y: 0 }, { x: 1, y: 1 });
      expect(angle).toBeCloseTo(Math.PI / 4);
    });

    it('should always return positive angle', () => {
      const angle1 = angleBetween2D({ x: 1, y: 1 }, { x: 1, y: -1 });
      const angle2 = angleBetween2D({ x: 1, y: -1 }, { x: 1, y: 1 });
      expect(angle1).toBeGreaterThanOrEqual(0);
      expect(angle2).toBeGreaterThanOrEqual(0);
      expect(angle1).toBeCloseTo(angle2);
    });
  });

  describe('distance2D', () => {
    it('should calculate distance between two 2D points', () => {
      expect(distance2D({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
      expect(distance2D({ x: 1, y: 1 }, { x: 4, y: 5 })).toBe(5);
    });

    it('should return 0 for same point', () => {
      expect(distance2D({ x: 5, y: 10 }, { x: 5, y: 10 })).toBe(0);
    });

    it('should be symmetric', () => {
      const a: Vector2D = { x: 1, y: 2 };
      const b: Vector2D = { x: 4, y: 6 };
      expect(distance2D(a, b)).toBe(distance2D(b, a));
    });

    it('should handle negative coordinates', () => {
      expect(distance2D({ x: -1, y: -1 }, { x: 2, y: 3 })).toBe(5);
    });

    it('should handle decimal coordinates', () => {
      expect(distance2D({ x: 0.5, y: 0.5 }, { x: 1.5, y: 1.5 })).toBeCloseTo(
        1.414213
      );
    });
  });

  describe('distance3D', () => {
    it('should calculate distance between two 3D points', () => {
      expect(distance3D({ x: 0, y: 0, z: 0 }, { x: 2, y: 3, z: 6 })).toBe(7);
      expect(distance3D({ x: 1, y: 2, z: 3 }, { x: 4, y: 6, z: 3 })).toBe(5);
    });

    it('should return 0 for same point', () => {
      expect(distance3D({ x: 5, y: 10, z: 15 }, { x: 5, y: 10, z: 15 })).toBe(
        0
      );
    });

    it('should be symmetric', () => {
      const a: Vector3D = { x: 1, y: 2, z: 3 };
      const b: Vector3D = { x: 4, y: 6, z: 8 };
      expect(distance3D(a, b)).toBe(distance3D(b, a));
    });

    it('should handle negative coordinates', () => {
      expect(
        distance3D({ x: -1, y: -2, z: -3 }, { x: 1, y: 2, z: 3 })
      ).toBeCloseTo(7.483314);
    });

    it('should handle decimal coordinates', () => {
      expect(
        distance3D({ x: 0.5, y: 0.5, z: 0.5 }, { x: 1.5, y: 1.5, z: 1.5 })
      ).toBeCloseTo(1.73205);
    });
  });

  describe('lerp2D', () => {
    it('should interpolate between two 2D vectors', () => {
      const start: Vector2D = { x: 0, y: 0 };
      const end: Vector2D = { x: 10, y: 20 };

      const result0 = lerp2D(start, end, 0);
      expect(result0).toEqual({ x: 0, y: 0 });

      const result1 = lerp2D(start, end, 1);
      expect(result1).toEqual({ x: 10, y: 20 });

      const result05 = lerp2D(start, end, 0.5);
      expect(result05).toEqual({ x: 5, y: 10 });
    });

    it('should handle negative coordinates', () => {
      const result = lerp2D({ x: -10, y: -20 }, { x: 10, y: 20 }, 0.5);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should handle t outside [0, 1]', () => {
      const start: Vector2D = { x: 0, y: 0 };
      const end: Vector2D = { x: 10, y: 10 };

      const resultNeg = lerp2D(start, end, -0.5);
      expect(resultNeg).toEqual({ x: -5, y: -5 });

      const resultOver = lerp2D(start, end, 1.5);
      expect(resultOver).toEqual({ x: 15, y: 15 });
    });

    it('should handle decimal t values', () => {
      const result = lerp2D({ x: 0, y: 0 }, { x: 100, y: 200 }, 0.25);
      expect(result).toEqual({ x: 25, y: 50 });
    });

    it('should return start when vectors are same', () => {
      const v: Vector2D = { x: 5, y: 10 };
      const result = lerp2D(v, v, 0.7);
      expect(result).toEqual(v);
    });
  });

  describe('rotate2D', () => {
    it('should rotate vector by 90 degrees', () => {
      const result = rotate2D({ x: 1, y: 0 }, Math.PI / 2);
      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(1);
    });

    it('should rotate vector by 180 degrees', () => {
      const result = rotate2D({ x: 1, y: 0 }, Math.PI);
      expect(result.x).toBeCloseTo(-1);
      expect(result.y).toBeCloseTo(0);
    });

    it('should rotate vector by 270 degrees', () => {
      const result = rotate2D({ x: 1, y: 0 }, (3 * Math.PI) / 2);
      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(-1);
    });

    it('should rotate vector by 360 degrees', () => {
      const result = rotate2D({ x: 1, y: 0 }, 2 * Math.PI);
      expect(result.x).toBeCloseTo(1);
      expect(result.y).toBeCloseTo(0);
    });

    it('should preserve magnitude', () => {
      const v: Vector2D = { x: 3, y: 4 };
      const originalMag = magnitude2D(v);
      const rotated = rotate2D(v, Math.PI / 3);
      expect(magnitude2D(rotated)).toBeCloseTo(originalMag);
    });

    it('should handle negative angles', () => {
      const result = rotate2D({ x: 1, y: 0 }, -Math.PI / 2);
      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(-1);
    });

    it('should rotate zero vector', () => {
      const result = rotate2D({ x: 0, y: 0 }, Math.PI / 4);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should handle 45-degree rotation', () => {
      const result = rotate2D({ x: 1, y: 0 }, Math.PI / 4);
      expect(result.x).toBeCloseTo(Math.sqrt(2) / 2);
      expect(result.y).toBeCloseTo(Math.sqrt(2) / 2);
    });
  });

  describe('createVector2D', () => {
    it('should create a valid 2D vector', () => {
      const v = createVector2D(3, 4);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => createVector2D(NaN, 4)).toThrow();
      expect(() => createVector2D(3, Infinity)).toThrow();
    });
  });

  describe('createVector3D', () => {
    it('should create a valid 3D vector', () => {
      const v = createVector3D(1, 2, 3);
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
      expect(v.z).toBe(3);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => createVector3D(1, NaN, 3)).toThrow();
    });
  });

  describe('createVector4D', () => {
    it('should create a valid 4D vector', () => {
      const v = createVector4D(1, 2, 3, 4);
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
      expect(v.z).toBe(3);
      expect(v.w).toBe(4);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => createVector4D(1, 2, 3, 'invalid' as any)).toThrow();
    });
  });

  describe('magnitudeSquared2D', () => {
    it('should calculate squared magnitude', () => {
      expect(magnitudeSquared2D({ x: 3, y: 4 })).toBe(25);
      expect(magnitudeSquared2D({ x: 1, y: 1 })).toBe(2);
      expect(magnitudeSquared2D({ x: 0, y: 0 })).toBe(0);
    });
  });

  describe('magnitudeSquared3D', () => {
    it('should calculate squared magnitude', () => {
      expect(magnitudeSquared3D({ x: 2, y: 3, z: 6 })).toBe(49);
      expect(magnitudeSquared3D({ x: 1, y: 1, z: 1 })).toBe(3);
    });
  });

  describe('magnitudeSquared4D', () => {
    it('should calculate squared magnitude', () => {
      expect(magnitudeSquared4D({ x: 1, y: 2, z: 3, w: 4 })).toBe(30);
      expect(magnitudeSquared4D({ x: 1, y: 0, z: 0, w: 0 })).toBe(1);
    });
  });

  describe('safeNormalize2D', () => {
    it('should normalize valid vectors', () => {
      const v = { x: 3, y: 4 };
      const normalized = safeNormalize2D(v);
      expect(magnitude2D(normalized)).toBeCloseTo(1);
      expect(normalized.x).toBeCloseTo(0.6);
      expect(normalized.y).toBeCloseTo(0.8);
    });

    it('should return zero vector for zero input', () => {
      const result = safeNormalize2D({ x: 0, y: 0 });
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should handle near-zero vectors', () => {
      const v = { x: 1e-15, y: 1e-15 };
      const result = safeNormalize2D(v);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });
  });

  describe('safeNormalize3D', () => {
    it('should normalize valid vectors', () => {
      const v = { x: 2, y: 3, z: 6 };
      const normalized = safeNormalize3D(v);
      expect(magnitude3D(normalized)).toBeCloseTo(1);
    });

    it('should return zero vector for zero input', () => {
      const result = safeNormalize3D({ x: 0, y: 0, z: 0 });
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(0);
    });
  });

  describe('normalize4D', () => {
    it('should normalize 4D vector', () => {
      const v = { x: 1, y: 2, z: 2, w: 1 };
      const normalized = normalize4D(v);
      expect(magnitude4D(normalized)).toBeCloseTo(1);
    });

    it('should throw error for zero vector', () => {
      expect(() => normalize4D({ x: 0, y: 0, z: 0, w: 0 })).toThrow(
        'Cannot normalize zero or near-zero vector'
      );
    });
  });

  describe('safeNormalize4D', () => {
    it('should normalize valid 4D vectors', () => {
      const v = { x: 1, y: 1, z: 1, w: 1 };
      const normalized = safeNormalize4D(v);
      expect(magnitude4D(normalized)).toBeCloseTo(1);
      expect(normalized.x).toBeCloseTo(0.5);
    });

    it('should return zero for zero vector', () => {
      const result = safeNormalize4D({ x: 0, y: 0, z: 0, w: 0 });
      expect(result).toEqual({ x: 0, y: 0, z: 0, w: 0 });
    });
  });

  describe('dotProduct4D', () => {
    it('should calculate 4D dot product', () => {
      const a = { x: 1, y: 2, z: 3, w: 4 };
      const b = { x: 5, y: 6, z: 7, w: 8 };
      expect(dotProduct4D(a, b)).toBe(70); // 1*5 + 2*6 + 3*7 + 4*8 = 5+12+21+32=70
    });

    it('should return zero for perpendicular vectors', () => {
      const a = { x: 1, y: 0, z: 0, w: 0 };
      const b = { x: 0, y: 1, z: 0, w: 0 };
      expect(dotProduct4D(a, b)).toBe(0);
    });
  });

  describe('addVectors3D', () => {
    it('should add 3D vectors', () => {
      const a = { x: 1, y: 2, z: 3 };
      const b = { x: 4, y: 5, z: 6 };
      const result = addVectors3D(a, b);
      expect(result).toEqual({ x: 5, y: 7, z: 9 });
    });
  });

  describe('addVectors4D', () => {
    it('should add 4D vectors', () => {
      const a = { x: 1, y: 2, z: 3, w: 4 };
      const b = { x: 5, y: 6, z: 7, w: 8 };
      const result = addVectors4D(a, b);
      expect(result).toEqual({ x: 6, y: 8, z: 10, w: 12 });
    });
  });

  describe('subtractVectors3D', () => {
    it('should subtract 3D vectors', () => {
      const a = { x: 5, y: 7, z: 9 };
      const b = { x: 1, y: 2, z: 3 };
      const result = subtractVectors3D(a, b);
      expect(result).toEqual({ x: 4, y: 5, z: 6 });
    });
  });

  describe('subtractVectors4D', () => {
    it('should subtract 4D vectors', () => {
      const a = { x: 10, y: 20, z: 30, w: 40 };
      const b = { x: 1, y: 2, z: 3, w: 4 };
      const result = subtractVectors4D(a, b);
      expect(result).toEqual({ x: 9, y: 18, z: 27, w: 36 });
    });
  });

  describe('scaleVector3D', () => {
    it('should scale 3D vector', () => {
      const v = { x: 1, y: 2, z: 3 };
      const result = scaleVector3D(v, 2);
      expect(result).toEqual({ x: 2, y: 4, z: 6 });
    });

    it('should handle negative scalar', () => {
      const v = { x: 1, y: 2, z: 3 };
      const result = scaleVector3D(v, -1);
      expect(result).toEqual({ x: -1, y: -2, z: -3 });
    });
  });

  describe('scaleVector4D', () => {
    it('should scale 4D vector', () => {
      const v = { x: 1, y: 2, z: 3, w: 4 };
      const result = scaleVector4D(v, 3);
      expect(result).toEqual({ x: 3, y: 6, z: 9, w: 12 });
    });
  });

  describe('angleBetween3D', () => {
    it('should calculate angle between 3D vectors', () => {
      const a = { x: 1, y: 0, z: 0 };
      const b = { x: 0, y: 1, z: 0 };
      const angle = angleBetween3D(a, b);
      expect(angle).toBeCloseTo(Math.PI / 2);
    });

    it('should return 0 for parallel vectors', () => {
      const a = { x: 1, y: 2, z: 3 };
      const b = { x: 2, y: 4, z: 6 };
      const angle = angleBetween3D(a, b);
      expect(angle).toBeCloseTo(0);
    });

    it('should throw for zero vectors', () => {
      expect(() =>
        angleBetween3D({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
      ).toThrow();
    });
  });

  describe('signedAngleBetween2D', () => {
    it('should return positive angle for counterclockwise rotation', () => {
      const a = { x: 1, y: 0 };
      const b = { x: 0, y: 1 };
      const angle = signedAngleBetween2D(a, b);
      expect(angle).toBeCloseTo(Math.PI / 2);
      expect(angle).toBeGreaterThan(0);
    });

    it('should return negative angle for clockwise rotation', () => {
      const a = { x: 1, y: 0 };
      const b = { x: 0, y: -1 };
      const angle = signedAngleBetween2D(a, b);
      expect(angle).toBeCloseTo(-Math.PI / 2);
      expect(angle).toBeLessThan(0);
    });

    it('should return 0 for same direction', () => {
      const a = { x: 1, y: 0 };
      const b = { x: 2, y: 0 };
      expect(signedAngleBetween2D(a, b)).toBeCloseTo(0);
    });
  });

  describe('reflect2D', () => {
    it('should reflect vector across normal', () => {
      const v = { x: 1, y: -1 };
      const normal = { x: 0, y: 1 }; // Unit vector pointing up
      const reflected = reflect2D(v, normal);

      // Reflection of (1, -1) across (0, 1) should be (1, 1)
      expect(reflected.x).toBeCloseTo(1);
      expect(reflected.y).toBeCloseTo(1);
    });

    it('should throw if normal is not unit length', () => {
      const v = { x: 1, y: 0 };
      const normal = { x: 2, y: 0 }; // Not unit length
      expect(() => reflect2D(v, normal)).toThrow(
        'Normal vector must be unit length'
      );
    });
  });

  describe('project2D', () => {
    it('should project vector onto another', () => {
      const a = { x: 4, y: 3 };
      const b = { x: 2, y: 0 };
      const projection = project2D(a, b);

      // Projection of (4, 3) onto (2, 0) should be (4, 0)
      expect(projection.x).toBeCloseTo(4);
      expect(projection.y).toBeCloseTo(0);
    });

    it('should throw when projecting onto zero vector', () => {
      expect(() => project2D({ x: 1, y: 1 }, { x: 0, y: 0 })).toThrow();
    });
  });

  describe('vectorsEqual2D', () => {
    it('should return true for equal vectors', () => {
      const a = { x: 1.0000001, y: 2.0000001 };
      const b = { x: 1.0, y: 2.0 };
      expect(vectorsEqual2D(a, b)).toBe(true);
    });

    it('should return false for different vectors', () => {
      const a = { x: 1, y: 2 };
      const b = { x: 1.1, y: 2.1 };
      expect(vectorsEqual2D(a, b)).toBe(false);
    });
  });

  describe('vectorsEqual3D', () => {
    it('should return true for approximately equal 3D vectors', () => {
      const a = { x: 1, y: 2, z: 3 };
      const b = { x: 1.0000001, y: 2.0000001, z: 3.0000001 };
      expect(vectorsEqual3D(a, b)).toBe(true);
    });
  });

  describe('vectorsEqual4D', () => {
    it('should return true for approximately equal 4D vectors', () => {
      const a = { x: 1, y: 2, z: 3, w: 4 };
      const b = { x: 1.0000001, y: 2.0000001, z: 3.0000001, w: 4.0000001 };
      expect(vectorsEqual4D(a, b)).toBe(true);
    });
  });

  describe('midpoint2D', () => {
    it('should calculate midpoint', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 4, y: 6 };
      const mid = midpoint2D(a, b);
      expect(mid.x).toBe(2);
      expect(mid.y).toBe(3);
    });
  });

  describe('centroid2D', () => {
    it('should calculate centroid of points', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 3 },
        { x: 4, y: 3 },
      ];
      const centroid = centroid2D(points);
      expect(centroid.x).toBe(2);
      expect(centroid.y).toBe(1.5);
    });

    it('should throw for empty array', () => {
      expect(() => centroid2D([])).toThrow('Points array must not be empty');
    });
  });

  describe('negateVector2D', () => {
    it('should negate 2D vector', () => {
      const v = { x: 3, y: -4 };
      const negated = negateVector2D(v);
      expect(negated.x).toBe(-3);
      expect(negated.y).toBe(4);
    });
  });

  describe('negateVector3D', () => {
    it('should negate 3D vector', () => {
      const v = { x: 1, y: 2, z: 3 };
      const negated = negateVector3D(v);
      expect(negated.x).toBe(-1);
      expect(negated.y).toBe(-2);
      expect(negated.z).toBe(-3);
    });
  });

  describe('negateVector4D', () => {
    it('should negate 4D vector', () => {
      const v = { x: 1, y: 2, z: 3, w: 4 };
      const negated = negateVector4D(v);
      expect(negated.x).toBe(-1);
      expect(negated.y).toBe(-2);
      expect(negated.z).toBe(-3);
      expect(negated.w).toBe(-4);
    });
  });

  describe('perpendicular2D', () => {
    it('should return clockwise perpendicular', () => {
      const v = { x: 1, y: 0 };
      const perp = perpendicular2D(v, true);
      expect(perp.x).toBeCloseTo(0);
      expect(perp.y).toBeCloseTo(-1);
    });

    it('should return counterclockwise perpendicular', () => {
      const v = { x: 1, y: 0 };
      const perp = perpendicular2D(v, false);
      expect(perp.x).toBeCloseTo(0);
      expect(perp.y).toBeCloseTo(1);
    });
  });

  describe('zeroVector2D', () => {
    it('should return zero vector', () => {
      const zero = zeroVector2D();
      expect(zero.x).toBe(0);
      expect(zero.y).toBe(0);
    });
  });

  describe('zeroVector3D', () => {
    it('should return zero vector', () => {
      const zero = zeroVector3D();
      expect(zero.x).toBe(0);
      expect(zero.y).toBe(0);
      expect(zero.z).toBe(0);
    });
  });

  describe('zeroVector4D', () => {
    it('should return zero vector', () => {
      const zero = zeroVector4D();
      expect(zero.x).toBe(0);
      expect(zero.y).toBe(0);
      expect(zero.z).toBe(0);
      expect(zero.w).toBe(0);
    });
  });

  describe('unitX2D', () => {
    it('should return unit X vector', () => {
      const unit = unitX2D();
      expect(unit.x).toBe(1);
      expect(unit.y).toBe(0);
    });
  });

  describe('unitY2D', () => {
    it('should return unit Y vector', () => {
      const unit = unitY2D();
      expect(unit.x).toBe(0);
      expect(unit.y).toBe(1);
    });
  });

  describe('unitX3D', () => {
    it('should return unit X vector in 3D', () => {
      const unit = unitX3D();
      expect(unit.x).toBe(1);
      expect(unit.y).toBe(0);
      expect(unit.z).toBe(0);
    });
  });

  describe('unitY3D', () => {
    it('should return unit Y vector in 3D', () => {
      const unit = unitY3D();
      expect(unit.x).toBe(0);
      expect(unit.y).toBe(1);
      expect(unit.z).toBe(0);
    });
  });

  describe('unitZ3D', () => {
    it('should return unit Z vector', () => {
      const unit = unitZ3D();
      expect(unit.x).toBe(0);
      expect(unit.y).toBe(0);
      expect(unit.z).toBe(1);
    });
  });

  describe('lerpClamped2D', () => {
    it('should interpolate within range', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 10, y: 20 };

      const result0 = lerpClamped2D(start, end, 0);
      expect(result0).toEqual({ x: 0, y: 0 });

      const result1 = lerpClamped2D(start, end, 1);
      expect(result1).toEqual({ x: 10, y: 20 });

      const result05 = lerpClamped2D(start, end, 0.5);
      expect(result05).toEqual({ x: 5, y: 10 });
    });

    it('should clamp t values outside [0, 1]', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 10, y: 10 };

      const resultNeg = lerpClamped2D(start, end, -0.5);
      expect(resultNeg).toEqual({ x: 0, y: 0 }); // Clamped to start

      const resultOver = lerpClamped2D(start, end, 1.5);
      expect(resultOver).toEqual({ x: 10, y: 10 }); // Clamped to end
    });
  });

  describe('lerpClamped3D', () => {
    it('should interpolate 3D vectors with clamping', () => {
      const start = { x: 0, y: 0, z: 0 };
      const end = { x: 10, y: 20, z: 30 };

      const result = lerpClamped3D(start, end, 0.3);
      expect(result.x).toBe(3);
      expect(result.y).toBe(6);
      expect(result.z).toBe(9);
    });
  });

  describe('lerpClamped4D', () => {
    it('should interpolate 4D vectors with clamping', () => {
      const start = { x: 0, y: 0, z: 0, w: 0 };
      const end = { x: 10, y: 20, z: 30, w: 40 };

      const result = lerpClamped4D(start, end, 0.25);
      expect(result.x).toBe(2.5);
      expect(result.y).toBe(5);
      expect(result.z).toBe(7.5);
      expect(result.w).toBe(10);
    });
  });

  describe('slerp3D', () => {
    it('should interpolate between unit vectors', () => {
      const start = { x: 1, y: 0, z: 0 };
      const end = { x: 0, y: 1, z: 0 };

      const result = slerp3D(start, end, 0.5);

      // Should be unit vector at 45 degrees
      expect(magnitude3D(result)).toBeCloseTo(1);
      expect(result.x).toBeCloseTo(Math.sqrt(2) / 2);
      expect(result.y).toBeCloseTo(Math.sqrt(2) / 2);
      expect(result.z).toBeCloseTo(0);
    });

    it('should throw if vectors are not unit length', () => {
      const start = { x: 2, y: 0, z: 0 };
      const end = { x: 0, y: 1, z: 0 };

      expect(() => slerp3D(start, end, 0.5)).toThrow(
        'SLERP requires unit vectors'
      );
    });
  });

  describe('smoothstep2D', () => {
    it('should apply smoothstep interpolation', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 10, y: 10 };

      const result = smoothstepClamped2D(start, end, 0.5);
      // smoothstep(0.5) = 0.5 * 0.5 * (3 - 2 * 0.5) = 0.25 * 2 = 0.5
      expect(result.x).toBe(5);
      expect(result.y).toBe(5);
    });

    it('should provide smoother interpolation at extremes', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };

      const nearStart = smoothstepClamped2D(start, end, 0.1);
      const nearEnd = smoothstepClamped2D(start, end, 0.9);

      // Smoothstep starts and ends more gradually than linear
      expect(nearStart.x).toBeLessThan(10); // Would be 10 with linear
      expect(nearEnd.x).toBeGreaterThan(90); // Would be 90 with linear
    });
  });

  describe('smootherstep2D', () => {
    it('should apply smootherstep interpolation', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };

      const result = smootherstep2D(start, end, 0.5);
      // smootherstep(0.5) = 6*(0.5)^5 - 15*(0.5)^4 + 10*(0.5)^3 = 0.5
      expect(result.x).toBe(50);
      expect(result.y).toBe(50);
    });
  });

  describe('quadraticBezier2D', () => {
    it('should calculate quadratic bezier curve point', () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 50, y: 100 };
      const p2 = { x: 100, y: 0 };

      // At t=0.5, quadratic bezier should be at the peak
      const result = quadraticBezier2D(p0, p1, p2, 0.5);
      expect(result.x).toBe(50);
      expect(result.y).toBe(50); // Midpoint of control point's y
    });
  });

  describe('cubicBezier2D', () => {
    it('should calculate cubic bezier curve point', () => {
      const p0 = { x: 0, y: 0 };
      const p1 = { x: 25, y: 100 };
      const p2 = { x: 75, y: 100 };
      const p3 = { x: 100, y: 0 };

      const result = cubicBezier2D(p0, p1, p2, p3, 0.5);
      expect(result.x).toBe(50);
      // Y should be symmetrical around the midpoint
    });
  });

  describe('mapRange', () => {
    it('should map value from one range to another', () => {
      // Map 5 from [0, 10] to [0, 100]
      expect(mapRange(5, 0, 10, 0, 100)).toBe(50);

      // Map 3 from [0, 5] to [10, 20]
      expect(mapRange(3, 0, 5, 10, 20)).toBe(16);
    });

    it('should handle negative ranges', () => {
      // Map from [-10, 10] to [0, 100]
      expect(mapRange(0, -10, 10, 0, 100)).toBe(50);
      expect(mapRange(-10, -10, 10, 0, 100)).toBe(0);
      expect(mapRange(10, -10, 10, 0, 100)).toBe(100);
    });

    it('should handle single point range', () => {
      expect(mapRange(5, 5, 5, 0, 100)).toBe(0);
    });
  });

  describe('mapRangeClamped', () => {
    it('should map and clamp values', () => {
      // Map 15 from [0, 10] to [0, 100] with clamping
      expect(mapRangeClamped(15, 0, 10, 0, 100)).toBe(100); // Clamped

      // Map -5 from [0, 10] to [0, 100] with clamping
      expect(mapRangeClamped(-5, 0, 10, 0, 100)).toBe(0); // Clamped

      // Map 5 from [0, 10] to [0, 100]
      expect(mapRangeClamped(5, 0, 10, 0, 100)).toBe(50); // Within range
    });
  });

  describe('Edge Cases', () => {
    it('should handle near-zero magnitudes correctly', () => {
      const tiny = { x: 1e-15, y: 1e-15 };
      expect(magnitude2D(tiny)).toBeLessThan(1e-14);
    });

    it('should handle large numbers', () => {
      const large = { x: 1e6, y: 2e6 };
      expect(magnitude2D(large)).toBeCloseTo(Math.sqrt(5e12));
    });

    it('should maintain precision for normalized vectors', () => {
      const v = { x: 1, y: 1 };
      const normalized = safeNormalize2D(v);
      const mag = magnitude2D(normalized);
      expect(mag).toBeCloseTo(1, 10); // 10 decimal places precision
    });
  });
});
