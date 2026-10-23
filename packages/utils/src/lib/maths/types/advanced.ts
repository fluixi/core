/**
 * Advanced mathematical type definitions.
 * @module AdvancedMathTypes
 */

import { Positive } from "./basic.js";
import { GreaterThan, Max } from "./operations.js";

/**
 * Represents a 2D vector with x and y components.
 */
export type Vector2D = {
  readonly x: number;
  readonly y: number;
};

/**
 * Represents a 3D vector with x, y, and z components.
 */
export type Vector3D = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

/**
 * Represents a 4D vector (e.g., for quaternions or RGBA).
 */
export type Vector4D = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
};

/**
 * Represents an n-dimensional vector.
 */
export type Vector<N extends number, T = number> = {
  readonly components: readonly T[];
  readonly length: N;
};

/**
 * Represents a mathematical matrix with rows and columns.
 */
export type Matrix<Rows extends number, Cols extends number, T = number> = {
  readonly rows: Rows;
  readonly columns: Cols;
  readonly data: readonly (readonly T[])[];
};

/**
 * Represents a square matrix (rows = columns).
 */
export type SquareMatrix<N extends number, T = number> = Matrix<N, N, T>;

/**
 * Represents a complex number with real and imaginary parts.
 */
export type ComplexNumber = {
  readonly real: number;
  readonly imag: number;
};

/**
 * Represents a quaternion (4D complex number).
 */
export type Quaternion = {
  readonly w: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

/**
 * Represents a mathematical range [start, end].
 */
export type RangeInclusive<Start extends number, End extends number> = 
  readonly [start: Start, end: End];

/**
 * Represents an open interval (start, end).
 */
export type OpenInterval<Start extends number, End extends number> = {
  readonly start: Start;
  readonly end: End;
  readonly inclusiveStart: false;
  readonly inclusiveEnd: false;
};

/**
 * Represents a closed interval [start, end].
 */
export type ClosedInterval<Start extends number, End extends number> = {
  readonly start: Start;
  readonly end: End;
  readonly inclusiveStart: true;
  readonly inclusiveEnd: true;
};

/**
 * Represents a half-open interval (start, end] or [start, end).
 */
export type HalfOpenInterval<Start extends number, End extends number> = {
  readonly start: Start;
  readonly end: End;
  readonly inclusiveStart: boolean;
  readonly inclusiveEnd: boolean;
} & (
  | { readonly inclusiveStart: true; readonly inclusiveEnd: false }
  | { readonly inclusiveStart: false; readonly inclusiveEnd: true }
);

/**
 * Union type for all interval types.
 */
export type Interval<Start extends number = number, End extends number = number> = 
  | OpenInterval<Start, End>
  | ClosedInterval<Start, End>
  | HalfOpenInterval<Start, End>;

/**
 * Represents a mathematical fraction with numerator and denominator.
 */
export type Fraction<N extends number = number, D extends number = number> = 
  D extends 0 ? never : {
    readonly numerator: N;
    readonly denominator: D;
  };

/**
 * Represents a simplified fraction in lowest terms.
 */
export type SimplifiedFraction<N extends number = number, D extends number = number> = 
  Fraction<N, D> & { readonly __brand: 'SimplifiedFraction' };

/**
 * Represents a polynomial of degree n with coefficients.
 */
export type Polynomial<Degree extends number = number, Coeff = number> = {
  readonly degree: Degree;
  readonly coefficients: readonly Coeff[];
};

/**
 * Represents a 2x2 matrix as a tuple.
 */
export type Matrix2x2 = [
  [number, number],
  [number, number]
];

/**
 * Represents a 3x3 matrix as a tuple.
 */
export type Matrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

/**
 * Represents a 4x4 matrix as a tuple.
 */
export type Matrix4x4 = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number]
];

/**
 * Represents a point in 2D space.
 */
export type Point2D = readonly [x: number, y: number];

/**
 * Represents a point in 3D space.
 */
export type Point3D = readonly [x: number, y: number, z: number];

/**
 * Represents a line segment between two points.
 */
export type LineSegment2D = {
  readonly start: Point2D;
  readonly end: Point2D;
};

/**
 * Represents a line segment in 3D space.
 */
export type LineSegment3D = {
  readonly start: Point3D;
  readonly end: Point3D;
};

/**
 * Represents a circle with center and radius.
 */
export type Circle = {
  readonly center: Point2D;
  readonly radius: number;
};

/**
 * Represents a rectangle with position and dimensions.
 */
export type Rectangle = {
  readonly x: number;
  readonly y: number;
  readonly width: Positive<number>;
  readonly height: Positive<number>;
};

/**
 * Represents a triangle defined by three points.
 */
export type Triangle = {
  readonly a: Point2D;
  readonly b: Point2D;
  readonly c: Point2D;
};

/**
 * Represents a 2D transformation matrix for affine transformations.
 */
export type Transform2D = {
  readonly a: number;  // Scale X
  readonly b: number;  // Shear Y
  readonly c: number;  // Shear X
  readonly d: number;  // Scale Y
  readonly e: number;  // Translate X
  readonly f: number;  // Translate Y
};

/**
 * Represents a 3D transformation matrix.
 */
export type Transform3D = Matrix4x4;

/**
 * Represents a color in RGB format.
 */
export type RGBColor = {
  readonly r: number;  // 0-255
  readonly g: number;  // 0-255
  readonly b: number;  // 0-255
};

/**
 * Represents a color in RGBA format.
 */
export type RGBAColor = RGBColor & {
  readonly a: number;  // 0-1
};

/**
 * Represents a color in HSL format.
 */
export type HSLColor = {
  readonly h: number;  // 0-360
  readonly s: number;  // 0-100
  readonly l: number;  // 0-100
};

export type StatisticalSample<T = number> = {
  readonly values: readonly T[];
  readonly size: number;
};

/**
 * Represents a normal distribution with mean and standard deviation.
 */
export type NormalDistribution = {
  readonly mean: number;
  readonly stdDev: Positive<number>;
};

/**
 * Represents a uniform distribution between min and max.
 */

/**
 * Represents a bezier curve with control points.
 */
export type BezierCurve<N extends number> = {
  readonly degree: N;
  readonly controlPoints: readonly Point2D[];
};

/**
 * Represents a quadratic bezier curve (degree 2).
 */
export type QuadraticBezier = BezierCurve<2>;

/**
 * Represents a cubic bezier curve (degree 3).
 */
export type CubicBezier = BezierCurve<3>;

/**
 * Represents a 2D plane equation: ax + by + cz + d = 0.
 */
export type PlaneEquation = {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
};

/**
 * Represents a sphere with center and radius.
 */
export type Sphere = {
  readonly center: Point3D;
  readonly radius: Positive<number>;
};

/**
 * Represents a cylinder with base center, axis, and dimensions.
 */
export type Cylinder = {
  readonly baseCenter: Point3D;
  readonly axis: Vector3D;
  readonly radius: Positive<number>;
  readonly height: Positive<number>;
};

/**
 * Represents a cone with apex, axis, and dimensions.
 */
export type Cone = {
  readonly apex: Point3D;
  readonly axis: Vector3D;
  readonly baseRadius: Positive<number>;
  readonly height: Positive<number>;
};

export type ParametricFunction<T = number, U = number> = {
  (t: T): U;
};

export type DifferentialEquation<Y extends number = number, X extends number = number> = {
  (x: X, y: Y): number;
};

/**
 * Represents an integral with bounds.
 */
export type Integral<F extends (x: number) => number> = {
  readonly f: F;
  readonly lowerBound: number;
  readonly upperBound: number;
};