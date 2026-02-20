---
sidebar_position: 1
---

# Math Utilities

Comprehensive mathematical utilities library with type guards, constants, formatters, and advanced mathematical functions for TypeScript/JavaScript applications.

## Overview

The math utilities module provides a complete suite of mathematical tools including:
- Mathematical constants (π, e, φ, etc.)
- Type guards for numbers, integers, vectors, and complex numbers
- Number formatting and parsing
- Random number generation
- Vector and matrix operations
- Statistical functions
- Trigonometric utilities

## Key Features

- 🔢 **Type-Safe** - Full TypeScript support with type guards
- ⚡ **High Performance** - Optimized implementations using bitwise operations
- 🎯 **Precise** - Mathematical constants with maximum precision
- 🧮 **Comprehensive** - Covers arithmetic, geometry, statistics, and more
- 📦 **Tree-Shakable** - Import only what you need
- ✅ **Well-Tested** - Extensive test coverage

## Installation

```typescript
import {
  // Constants
  PI, E, PHI, SQRT2,
  
  // Type Guards
  isInt, isNumber, isEven, isPrime,
  
  // Formatters
  formatNumber, formatCurrency, formatPercentage,
  
  // Random
  randomInt, randomFloat, randomInRange,
  
  // ... other utilities
} from '@awc/utils/maths';
```

## Quick Start

### Mathematical Constants

Access precise mathematical constants:

```typescript
import { PI, E, PHI, SQRT2, Constants } from '@awc/utils/maths';

// Direct imports
console.log(PI);    // 3.141592653589793
console.log(E);     // 2.718281828459045
console.log(PHI);   // 1.618033988749894 (Golden Ratio)

// Or use the Constants object
console.log(Constants.PI);
console.log(Constants.DEGREES_PER_RADIAN);
```

### Type Guards

Validate and narrow types with type guards:

```typescript
import { isInt, isNumber, isPrime, isEven } from '@awc/utils/maths';

isInt(42);           // true
isInt("42");         // true (accepts string representation)
isInt(42.5);         // false

isNumber(42);        // true
isNumber("42");      // false (strict number check)
isNumber(NaN);       // false

isPrime(7);          // true
isPrime(4);          // false

isEven(4);           // true
isOdd(3);            // true
```

### Number Formatting

Format numbers for display:

```typescript
import { formatNumber, formatCurrency, formatPercentage } from '@awc/utils/maths';

formatNumber(1234567.89);
// "1,234,567.89"

formatNumber(1234567.89, { decimals: 0 });
// "1,234,568"

formatCurrency(1234.56, 'USD');
// "$1,234.56"

formatPercentage(0.1234);
// "12.34%"
```

### Random Number Generation

Generate random numbers with various distributions:

```typescript
import { randomInt, randomFloat, randomInRange } from '@awc/utils/maths';

randomInt(1, 100);           // Random integer between 1 and 100
randomFloat(0, 1);           // Random float between 0 and 1
randomInRange(10, 20);       // Random number in range [10, 20]
```

## Categories

### 1. Mathematical Constants

Pre-defined constants with maximum precision:

| Constant | Value | Description |
|----------|-------|-------------|
| `PI` | 3.141592653589793 | Circle constant (π) |
| `E` | 2.718281828459045 | Euler's number |
| `PHI` | 1.618033988749894 | Golden ratio (φ) |
| `SQRT2` | 1.414213562373095 | Square root of 2 |
| `SQRT1_2` | 0.707106781186548 | Square root of 1/2 |
| `LN2` | 0.693147180559945 | Natural log of 2 |
| `LN10` | 2.302585092994046 | Natural log of 10 |
| `LOG2E` | 1.442695040888963 | Base-2 log of e |
| `LOG10E` | 0.434294481903252 | Base-10 log of e |

**Angle Conversions:**
- `DEGREES_IN_CIRCLE` - 360
- `RADIANS_IN_CIRCLE` - 2π
- `GRADIANS_IN_CIRCLE` - 400
- `DEGREES_PER_RADIAN` - 180/π
- `RADIANS_PER_DEGREE` - π/180

### 2. Type Guards

Comprehensive type checking functions:

#### Basic Number Guards

```typescript
isInt(value)              // Check if integer
isNumber(value)           // Check if finite number
isFloat(value)            // Check if floating-point
isSafeInteger(value)      // Check if safe integer
isNumeric(value)          // Check if numeric (number or string)
isNumericString(value)    // Check if valid numeric string
```

#### Range and Sign Guards

```typescript
isPositive(n)             // n > 0
isNegative(n)             // n < 0
isNonNegative(n)          // n >= 0
isNonPositive(n)          // n <= 0
isZero(n, epsilon?)       // |n| < epsilon
isInRange(n, min, max)    // min <= n <= max
```

#### Mathematical Properties

```typescript
isEven(n)                 // n % 2 === 0
isOdd(n)                  // n % 2 !== 0
isPrime(n)                // Check if prime number
isPowerOfTwo(n)           // Check if power of 2
approxEqual(a, b, ε)      // |a - b| < ε
```

#### Vector and Complex Guards

```typescript
isVector2D(value)         // Check { x, y }
isVector3D(value)         // Check { x, y, z }
isComplexNumber(value)    // Check { real, imag }
isFraction(value)         // Check { numerator, denominator }
isMatrix(value)           // Check matrix structure
```

### 3. Number Formatting

Format numbers for display:

```typescript
formatNumber(n, options?)
// Options: { decimals, separator, decimalSeparator }

formatCurrency(n, currency?, locale?)
// Format as currency with symbol

formatPercentage(n, decimals?)
// Format as percentage

formatCompact(n)
// Compact notation (1.2K, 1.5M, 2.3B)

formatOrdinal(n)
// Ordinal numbers (1st, 2nd, 3rd)
```

### 4. Number Parsing

Parse strings to numbers:

```typescript
parseNumber(str)          // Parse to number
parseInt(str, radix?)     // Parse to integer
parseFloat(str)           // Parse to float
safeParseNumber(str)      // Parse with error handling
```

### 5. Random Number Generation

Generate random numbers:

```typescript
random()                  // Random float [0, 1)
randomInt(min, max)       // Random integer
randomFloat(min, max)     // Random float
randomInRange(min, max)   // Random in range
randomBool()             // Random boolean
randomChoice(array)      // Random array element
randomSample(array, n)   // Random n elements
shuffle(array)           // Shuffle array
```

## Common Use Cases

### Validate User Input

```typescript
import { isInt, isInRange, isPositive } from '@awc/utils/maths';

function validateAge(input: string): number {
  if (!isInt(input)) {
    throw new Error('Age must be an integer');
  }
  
  const age = Number(input);
  
  if (!isInRange(age, 0, 150)) {
    throw new Error('Age must be between 0 and 150');
  }
  
  return age;
}

validateAge("25");  // 25
validateAge("25.5"); // throws Error
validateAge("-5");   // throws Error
```

### Format Display Values

```typescript
import { formatNumber, formatCurrency, formatPercentage } from '@awc/utils/maths';

function formatMetrics(data: {
  revenue: number;
  users: number;
  growthRate: number;
}) {
  return {
    revenue: formatCurrency(data.revenue, 'USD'),
    users: formatNumber(data.users, { decimals: 0 }),
    growth: formatPercentage(data.growthRate)
  };
}

formatMetrics({
  revenue: 1234567.89,
  users: 45678,
  growthRate: 0.1234
});
// {
//   revenue: "$1,234,567.89",
//   users: "45,678",
//   growth: "12.34%"
// }
```

### Check Prime Numbers

```typescript
import { isPrime } from '@awc/utils/maths';

function findPrimes(max: number): number[] {
  const primes: number[] = [];
  
  for (let i = 2; i <= max; i++) {
    if (isPrime(i)) {
      primes.push(i);
    }
  }
  
  return primes;
}

findPrimes(20);
// [2, 3, 5, 7, 11, 13, 17, 19]
```

### Random Selection

```typescript
import { randomInt, randomChoice, shuffle } from '@awc/utils/maths';

// Random dice roll
const diceRoll = () => randomInt(1, 6);

// Random card from deck
const deck = ['A♠', 'K♠', 'Q♠', 'J♠', '10♠', ...];
const card = randomChoice(deck);

// Shuffle deck
const shuffledDeck = shuffle(deck);

// Random team selection
const players = ['Alice', 'Bob', 'Charlie', 'Diana'];
const team1 = randomSample(players, 2);
const team2 = players.filter(p => !team1.includes(p));
```

### Angle Conversions

```typescript
import { RADIANS_PER_DEGREE, DEGREES_PER_RADIAN } from '@awc/utils/maths';

function degreesToRadians(degrees: number): number {
  return degrees * RADIANS_PER_DEGREE;
}

function radiansToDegrees(radians: number): number {
  return radians * DEGREES_PER_RADIAN;
}

degreesToRadians(90);   // π/2
radiansToDegrees(PI);   // 180
```

### Approximate Equality

```typescript
import { approxEqual } from '@awc/utils/maths';

function compareFloats(a: number, b: number): boolean {
  return approxEqual(a, b, 1e-10);
}

compareFloats(0.1 + 0.2, 0.3);  // true (handles floating-point errors)
compareFloats(1.0000000001, 1.0); // true (within epsilon)
```

## Vector Operations

Work with 2D and 3D vectors:

```typescript
import { isVector2D, isVector3D } from '@awc/utils/maths';
import type { Vector2D, Vector3D } from '@awc/utils/maths';

const v2: Vector2D = { x: 1, y: 2 };
const v3: Vector3D = { x: 1, y: 2, z: 3 };

if (isVector2D(v2)) {
  console.log(`Vector: (${v2.x}, ${v2.y})`);
}

if (isVector3D(v3)) {
  console.log(`Vector: (${v3.x}, ${v3.y}, ${v3.z})`);
}
```

## Complex Numbers

Work with complex numbers:

```typescript
import { isComplexNumber } from '@awc/utils/maths';
import type { ComplexNumber } from '@awc/utils/maths';

const complex: ComplexNumber = { real: 3, imag: 4 };

if (isComplexNumber(complex)) {
  const magnitude = Math.sqrt(
    complex.real ** 2 + complex.imag ** 2
  );
  console.log(`Magnitude: ${magnitude}`); // 5
}
```

## Performance Considerations

### Optimized Type Guards

The module uses optimized implementations for performance:

```typescript
// isEven uses bitwise operation
isEven(n)  // (n & 1) === 0  (faster than n % 2 === 0)

// isPowerOfTwo uses bitwise trick
isPowerOfTwo(n)  // n > 0 && (n & (n - 1)) === 0
```

### Fast Integer Checking

```typescript
// Fast path for numbers
isInt(42)  // Uses Number.isInteger()

// Fast path for strings
isInt("42")  // Uses regex + Number.isInteger()
```

## TypeScript Support

Full TypeScript support with type guards:

```typescript
import { isInt, isNumber, isVector2D } from '@awc/utils/maths';
import type { Vector2D } from '@awc/utils/maths';

function processValue(value: unknown) {
  if (isInt(value)) {
    // TypeScript knows value is number
    const doubled: number = value * 2;
  }
  
  if (isNumber(value)) {
    // TypeScript knows value is number
    const result: number = Math.sqrt(value);
  }
}

function processVector(value: unknown) {
  if (isVector2D(value)) {
    // TypeScript knows value is Vector2D
    const distance = Math.sqrt(value.x ** 2 + value.y ** 2);
  }
}
```

## Best Practices

### 1. Use Appropriate Type Guards

```typescript
// ✅ Good: Use specific guards
if (isInt(value)) {
  // Process integer
}

if (isPositive(value)) {
  // Process positive number
}

// ❌ Avoid: Generic checks
if (typeof value === 'number') {
  // May include NaN, Infinity
}
```

### 2. Handle Edge Cases

```typescript
import { isNumber, isSafeInteger } from '@awc/utils/maths';

function processNumber(value: unknown) {
  // Check if valid number
  if (!isNumber(value)) {
    throw new Error('Invalid number');
  }
  
  // Check if safe for calculations
  if (!isSafeInteger(value)) {
    console.warn('Number may lose precision');
  }
  
  return value * 2;
}
```

### 3. Use Constants for Precision

```typescript
import { PI, RADIANS_PER_DEGREE } from '@awc/utils/maths';

// ✅ Good: Use precise constants
const circumference = 2 * PI * radius;
const radians = degrees * RADIANS_PER_DEGREE;

// ❌ Avoid: Hardcoded values
const circumference = 2 * 3.14 * radius;  // Less precise
const radians = degrees * 0.0174533;      // Less precise
```

### 4. Use Approximate Equality for Floats

```typescript
import { approxEqual } from '@awc/utils/maths';

// ✅ Good: Handle floating-point errors
if (approxEqual(0.1 + 0.2, 0.3)) {
  console.log('Equal');
}

// ❌ Avoid: Direct comparison
if (0.1 + 0.2 === 0.3) {  // false!
  console.log('Equal');
}
```

## Browser Support

All utilities work in:
- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Node.js 14+
- ✅ React Native
- ✅ Electron

## Documentation

- [API Reference](./api-reference.md) - Complete function documentation
- [Examples](./examples.md) - Real-world use cases
- [Type Definitions](./types.md) - TypeScript types reference

## Next Steps

- Check out the [API Reference](./api-reference.md) for detailed documentation
- See [Examples](./examples.md) for more real-world usage patterns
- Review [Type Definitions](./types.md) for TypeScript types