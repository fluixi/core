// @ts-ignore
/**
 * Type tests for mathematical types.
 * These are compile-time tests that verify type correctness.
 */

import type {
  // Basic types
  Numeric,
  Integer,
  Positive,
  Negative,
  NonNegative,
  NonPositive,
  Even,
  Odd,
  Prime,

  // Operation types
  Absolute,
  SignOf,
  Add,
  Subtract,
  Multiply,
  Divide,
  Min,
  Max,
  Compare,
  LessThan,
  GreaterThan,
  Round,
  Floor,
  Ceil,
  Trunc,

  // Advanced types
  Vector2D,
  Vector3D,
  Matrix,
  ComplexNumber,
  Fraction,
  Polynomial,
  Interval,
  RGBColor,
  HSLColor,
  NormalDistribution,
  HalfOpenInterval,
  ClosedInterval,
  OpenInterval,
} from './index.js';

// Basic Type Tests

// Numeric should accept number and bigint
// @ts-ignore
type TestNumeric1 = Numeric; // number | bigint

// Integer should accept any number
type TestInteger1 = Integer; // number

// Positive should only accept positive numbers
type TestPositive1 = Positive<5>; // 5
type TestPositive2 = Positive<0>; // never
type TestPositive3 = Positive<-5>; // never
// type Multi = Multiply<5, -1>;
type DivideType = Divide<50, 2>;

// Negative should only accept negative numbers
type TestNegative1 = Negative<-5>; // -5
type TestNegative2 = Negative<0>; // never
type TestNegative3 = Negative<5>; // never

// NonNegative should accept 0 and positive numbers
type TestNonNegative1 = NonNegative<0>; // 0
type TestNonNegative2 = NonNegative<5>; // 5
type TestNonNegative3 = NonNegative<-5>; // never

// NonPositive should accept 0 and negative numbers
type TestNonPositive1 = NonPositive<0>; // 0
type TestNonPositive2 = NonPositive<-5>; // -5
type TestNonPositive3 = NonPositive<5>; // never

// Even should only accept even numbers
type TestEven1 = Even<2>; // 2
type TestEven2 = Even<3>; // never
type TestEven3 = Even<0>; // 0

// Odd should only accept odd numbers
type TestOdd1 = Odd<3>; // 3
type TestOdd2 = Odd<2>; // never
type TestOdd3 = Odd<1>; // 1

// Prime should only accept prime numbers
type TestPrime1 = Prime<7>; // 7
type TestPrime2 = Prime<4>; // never
type TestPrime3 = Prime<13>; // 13

// Operation Type Tests

// Absolute should convert negative to positive
type TestAbsolute1 = Absolute<5>; // 5
type TestAbsolute2 = Absolute<-5>; // 5
type TestAbsolute3 = Absolute<0>; // 0

// SignOf should return -1, 0, or 1
type TestSignOf1 = SignOf<5>; // 1
type TestSignOf2 = SignOf<-5>; // -1
type TestSignOf3 = SignOf<0>; // 0

// Add should add two numbers (limited to small numbers)
type TestAdd1 = Add<2, 3>; // 5
type TestAdd2 = Add<0, 5>; // 5
type TestAdd3 = Add<-12, 3>; // 1 (string manipulation makes this trickier)

// Subtract should subtract two numbers
type TestSubtract1 = Subtract<5, 3>; // 2
type TestSubtract2 = Subtract<3, 5>; // -2 (may not work perfectly)

// Min should return the smaller number
type TestMin1 = Min<5, 10>; // 5
type TestMin2 = Min<5, 15>; // -5
type TestMin3 = Min<0, 0>; // 0

// Max should return the larger number
type TestMax1 = Max<5, 10>; // 10
type TestMax2 = Max<-5, 5>; // 5
type TestMax3 = Max<0, 0>; // 0

// Compare should compare two numbers
type TestCompare1 = Compare<5, 10>; // -1 (5 < 10)
type TestCompare2 = Compare<10, 5>; // 1 (10 > 5)
type TestCompare3 = Compare<5, 5>; // 0 (5 = 5)

// LessThan should check if A < B
type TestLessThan1 = LessThan<5, 10>; // true
type TestLessThan2 = LessThan<10, 5>; // false
type TestLessThan3 = LessThan<5, 5>; // false

// GreaterThan should check if A > B
type TestGreaterThan1 = GreaterThan<10, 5>; // true
type TestGreaterThan2 = GreaterThan<5, 10>; // false
type TestGreaterThan3 = GreaterThan<5, 5>; // false

// Round should round to nearest integer
type TestRound1 = Round<5.4>; // 5
type TestRound2 = Round<5.6>; // 6
type TestRound3 = Round<5.5>; // 6

// Floor should round down
type TestFloor1 = Floor<5.9>; // 5
type TestFloor2 = Floor<5.1>; // 5
type TestFloor3 = Floor<-1.5>; // -1 (needs implementation adjustment)

// Ceil should round up
type TestCeil1 = Ceil<5.1>; // 6
type TestCeil2 = Ceil<5.9>; // 6
type TestCeil3 = Ceil<-1.5>; // -1 (needs implementation adjustment)

// Trunc should truncate decimal part
type TestTrunc1 = Trunc<5.9>; // 5
type TestTrunc2 = Trunc<5.1>; // 5
type TestTrunc3 = Trunc<-1.5>; // -1

// Advanced Type Tests

// Vector2D should have x and y properties
type TestVector2D = Vector2D;
const vector2D: Vector2D = { x: 1, y: 2 };

// Vector3D should have x, y, and z properties
type TestVector3D = Vector3D;
const vector3D: Vector3D = { x: 1, y: 2, z: 3 };

// Matrix should have rows, columns, and data
type TestMatrix = Matrix<2, 3>;
const matrix: Matrix<2, 3> = {
  rows: 2,
  columns: 3,
  data: [
    [1, 2, 3],
    [4, 5, 6],
  ],
};

// ComplexNumber should have real and imag properties
type TestComplexNumber = ComplexNumber;
const complex: ComplexNumber = { real: 1, imag: 2 };

// Fraction should have numerator and denominator
type TestFraction = Fraction<1, 2>;
const fraction: Fraction<1, 2> = { numerator: 1, denominator: 2 };

// Polynomial should have degree and coefficients
type TestPolynomial = Polynomial<2>;
const polynomial: Polynomial<2> = {
  degree: 2,
  coefficients: [1, 2, 3], // 1x² + 2x + 3
};

type TestClosedInterval = ClosedInterval<0, 1>;
type TestOpenInterval = OpenInterval<0, 1>;
type TestHalfOpenInterval = HalfOpenInterval<0, 1>;

const closedInterval: ClosedInterval<0, 1> = {
  start: 0,
  end: 1,
  inclusiveStart: true,
  inclusiveEnd: true,
};

// RGBColor should have r, g, b properties
type TestRGBColor = RGBColor;
const rgbColor: RGBColor = { r: 255, g: 128, b: 0 };

// HSLColor should have h, s, l properties
type TestHSLColor = HSLColor;
const hslColor: HSLColor = { h: 30, s: 100, l: 50 };

// NormalDistribution should have mean and stdDev
type TestNormalDistribution = NormalDistribution;
const normalDist: NormalDistribution = { mean: 0, stdDev: 1 };

// Type Constraint Tests

// These should cause TypeScript errors if uncommented:
// type Error1 = Positive<-5>; // Should error: negative number
// type Error2 = Negative<5>; // Should error: positive number
// type Error3 = Fraction<1, 0>; // Should error: denominator cannot be 0
// type Error4 = Even<3>; // Should error: 3 is odd
// type Error5 = Prime<4>; // Should error: 4 is not prime

// Type Utility Tests

// Test type inference with conditional types
type TestIsPositive1 = Positive<5> extends never ? false : true; // true
type TestIsPositive2 = Positive<-5> extends never ? false : true; // false

// Test type composition
type TestVectorOperation = {
  vector: Vector2D;
  magnitude: number;
};

const vectorOp: TestVectorOperation = {
  vector: { x: 3, y: 4 },
  magnitude: 5,
};

type TestRecursiveType = {
  value: number;
  next?: TestRecursiveType;
};

const recursive: TestRecursiveType = {
  value: 1,
  next: {
    value: 2,
    next: {
      value: 3,
    },
  },
};

// Test mapped types
type ReadonlyVector2D = Readonly<Vector2D>;

// Test intersection types
type ColoredVector2D = Vector2D & { color: RGBColor };

const coloredVector: ColoredVector2D = {
  x: 1,
  y: 2,
  color: { r: 255, g: 0, b: 0 },
};

// Test union types
type NumberOrVector = number | Vector2D;

const numberOrVector1: NumberOrVector = 42;
const numberOrVector2: NumberOrVector = { x: 1, y: 2 };

// Export Test Types (for external verification)

export type TypeTests = {
  // Basic types
  TestPositive1: TestPositive1;
  TestNegative1: TestNegative1;
  TestEven1: TestEven1;
  TestOdd1: TestOdd1;

  // Operation types
  TestAbsolute1: TestAbsolute1;
  TestSignOf1: TestSignOf1;
  TestAdd1: TestAdd1;
  TestMin1: TestMin1;
  TestMax1: TestMax1;

  // Comparison types
  TestLessThan1: TestLessThan1;
  TestGreaterThan1: TestGreaterThan1;

  // Rounding types
  TestRound1: TestRound1;
  TestFloor1: TestFloor1;
  TestCeil1: TestCeil1;

  // Advanced types
  TestVector2D: TestVector2D;
  TestComplexNumber: TestComplexNumber;
  TestRGBColor: TestRGBColor;
};
