import { describe, expectTypeOf, it } from 'vitest';
import type {
  Numeric,
  Integer,
  Positive,
  Negative,
  NonNegative,
  NonPositive,
  Even,
  Odd,
  Prime,
  Absolute,
  SignOf,
  Add,
  Subtract,
  Min,
  Max,
  Compare,
  LessThan,
  GreaterThan,
  Round,
  Floor,
  Ceil,
  Trunc,
  Vector2D,
  Vector3D,
  Matrix,
  ComplexNumber,
  Fraction,
  Polynomial,
  ClosedInterval,
  RGBColor,
  HSLColor,
  NormalDistribution,
} from './index.js';

describe('math types', () => {
  it('resolve to the documented types', () => {
    // Basic Type Tests
    // Numeric should accept number and bigint
    expectTypeOf<Numeric>().toEqualTypeOf<number | bigint>();
    // Integer should accept any number
    expectTypeOf<Integer>().toEqualTypeOf<number>();
    // Positive should only accept positive numbers
    expectTypeOf<Positive<5>>().toEqualTypeOf<5>();
    expectTypeOf<Positive<0>>().toEqualTypeOf<never>();
    expectTypeOf<Positive<-5>>().toEqualTypeOf<never>();
    // Negative should only accept negative numbers
    expectTypeOf<Negative<-5>>().toEqualTypeOf<-5>();
    expectTypeOf<Negative<0>>().toEqualTypeOf<never>();
    expectTypeOf<Negative<5>>().toEqualTypeOf<never>();
    // NonNegative should accept 0 and positive numbers
    expectTypeOf<NonNegative<0>>().toEqualTypeOf<0>();
    expectTypeOf<NonNegative<5>>().toEqualTypeOf<5>();
    expectTypeOf<NonNegative<-5>>().toEqualTypeOf<never>();
    // NonPositive should accept 0 and negative numbers
    expectTypeOf<NonPositive<0>>().toEqualTypeOf<0>();
    expectTypeOf<NonPositive<-5>>().toEqualTypeOf<-5>();
    expectTypeOf<NonPositive<5>>().toEqualTypeOf<never>();
    // Even should only accept even numbers
    expectTypeOf<Even<2>>().toEqualTypeOf<2>();
    expectTypeOf<Even<3>>().toEqualTypeOf<never>();
    expectTypeOf<Even<0>>().toEqualTypeOf<0>();
    // Odd should only accept odd numbers
    expectTypeOf<Odd<3>>().toEqualTypeOf<3>();
    expectTypeOf<Odd<2>>().toEqualTypeOf<never>();
    expectTypeOf<Odd<1>>().toEqualTypeOf<1>();
    // Prime should only accept prime numbers
    expectTypeOf<Prime<7>>().toEqualTypeOf<7>();
    expectTypeOf<Prime<4>>().toEqualTypeOf<never>();
    expectTypeOf<Prime<13>>().toEqualTypeOf<13>();

    // Operation Type Tests
    // Absolute should convert negative to positive
    expectTypeOf<Absolute<5>>().toEqualTypeOf<5>();
    expectTypeOf<Absolute<-5>>().toEqualTypeOf<5>();
    expectTypeOf<Absolute<0>>().toEqualTypeOf<0>();
    // SignOf should return -1, 0, or 1
    expectTypeOf<SignOf<5>>().toEqualTypeOf<1>();
    expectTypeOf<SignOf<-5>>().toEqualTypeOf<-1>();
    expectTypeOf<SignOf<0>>().toEqualTypeOf<0>();
    // Add should add two numbers (limited to small numbers)
    expectTypeOf<Add<2, 3>>().toEqualTypeOf<5>();
    expectTypeOf<Add<0, 5>>().toEqualTypeOf<5>();
    expectTypeOf<Add<-12, 3>>().toEqualTypeOf<-9>();
    // Subtract should subtract two numbers
    expectTypeOf<Subtract<5, 3>>().toEqualTypeOf<2>();
    expectTypeOf<Subtract<3, 5>>().toEqualTypeOf<never>();
    expectTypeOf<Add<3, -5>>().toEqualTypeOf<-2>();
    // Min should return the smaller number
    expectTypeOf<Min<5, 10>>().toEqualTypeOf<5>();
    expectTypeOf<Min<5, 15>>().toEqualTypeOf<5>();
    expectTypeOf<Min<0, 0>>().toEqualTypeOf<0>();
    // Max should return the larger number
    expectTypeOf<Max<5, 10>>().toEqualTypeOf<10>();
    expectTypeOf<Max<-5, 5>>().toEqualTypeOf<5>();
    expectTypeOf<Max<0, 0>>().toEqualTypeOf<0>();
    // Compare should compare two numbers
    expectTypeOf<Compare<5, 10>>().toEqualTypeOf<-1>(); // 5 < 10
    expectTypeOf<Compare<10, 5>>().toEqualTypeOf<1>(); // 10 > 5
    expectTypeOf<Compare<5, 5>>().toEqualTypeOf<0>(); // 5 = 5
    // LessThan should check if A < B
    expectTypeOf<LessThan<5, 10>>().toEqualTypeOf<true>();
    expectTypeOf<LessThan<10, 5>>().toEqualTypeOf<false>();
    expectTypeOf<LessThan<5, 5>>().toEqualTypeOf<false>();
    // GreaterThan should check if A > B
    expectTypeOf<GreaterThan<10, 5>>().toEqualTypeOf<true>();
    expectTypeOf<GreaterThan<5, 10>>().toEqualTypeOf<false>();
    expectTypeOf<GreaterThan<5, 5>>().toEqualTypeOf<false>();
    // Round should round to nearest integer
    expectTypeOf<Round<5.4>>().toEqualTypeOf<5>();
    expectTypeOf<Round<5.6>>().toEqualTypeOf<6>();
    expectTypeOf<Round<5.5>>().toEqualTypeOf<6>();
    // Floor should round down
    expectTypeOf<Floor<5.9>>().toEqualTypeOf<5>();
    expectTypeOf<Floor<5.1>>().toEqualTypeOf<5>();
    expectTypeOf<Floor<-1.5>>().toEqualTypeOf<-2>();
    // Ceil should round up
    expectTypeOf<Ceil<5.1>>().toEqualTypeOf<6>();
    expectTypeOf<Ceil<5.9>>().toEqualTypeOf<6>();
    expectTypeOf<Ceil<-1.5>>().toEqualTypeOf<-1>();
    // Trunc should truncate decimal part
    expectTypeOf<Trunc<5.9>>().toEqualTypeOf<5>();
    expectTypeOf<Trunc<5.1>>().toEqualTypeOf<5>();
    expectTypeOf<Trunc<-1.5>>().toEqualTypeOf<-1>();
  });

  it('describe the shapes they name', () => {
    ({ x: 1, y: 2 }) satisfies Vector2D;
    ({ x: 1, y: 2, z: 3 }) satisfies Vector3D;
    ({ rows: 2, columns: 3, data: [[1, 2, 3], [4, 5, 6]] }) satisfies Matrix<2, 3>;
    ({ real: 1, imag: 2 }) satisfies ComplexNumber;
    ({ numerator: 1, denominator: 2 }) satisfies Fraction<1, 2>;
    ({ degree: 2, coefficients: [1, 2, 3] }) satisfies Polynomial<2>;
    ({ start: 0, end: 1, inclusiveStart: true, inclusiveEnd: true }) satisfies ClosedInterval<0, 1>;
    ({ r: 255, g: 128, b: 0 }) satisfies RGBColor;
    ({ h: 30, s: 100, l: 50 }) satisfies HSLColor;
    ({ mean: 0, stdDev: 1 }) satisfies NormalDistribution;
  });
});
