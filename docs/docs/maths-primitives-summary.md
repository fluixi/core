---
sidebar_position: 1
---

# Math & Primitive Utilities Summary

Complete overview of the mathematical and primitive type utilities added to the `@awc/utils` package.

## 🚀 Overview

This document summarizes the comprehensive utilities for mathematical operations and primitive type manipulations in your TypeScript/JavaScript applications.

## 📦 What's Included

### Math Utilities Module
**Location:** `packages/utils/src/lib/maths/`

A complete mathematical toolkit with:
- **Mathematical Constants** - Precise values for π, e, φ, and more
- **Type Guards** - Validate numbers, integers, vectors, complex numbers
- **Number Formatting** - Currency, percentages, compact notation
- **Number Parsing** - Safe parsing with error handling
- **Random Generation** - Random numbers, arrays, shuffling
- **Statistical Functions** - Mean, median, variance, standard deviation
- **Geometric Operations** - Vectors, matrices, complex numbers
- **Advanced Guards** - Prime numbers, powers of two, ranges

### Primitive Utilities Module
**Location:** `packages/utils/src/lib/primitive/`

Comprehensive primitive type utilities:
- **String Utilities** - 50+ functions for case conversion, validation, formatting
- **Boolean Utilities** - Parsing, validation, conversion
- **Date Utilities** - Formatting, parsing, manipulation, comparison

---

## 🔢 Math Utilities

### Installation

```typescript
import {
  // Constants
  PI, E, PHI, SQRT2, Constants,
  
  // Type Guards
  isInt, isNumber, isPrime, isEven,
  
  // Formatters
  formatNumber, formatCurrency, formatPercentage,
  
  // Random
  randomInt, randomFloat, randomInRange,
} from '@awc/utils/maths';
```

### Key Features

#### 1. Mathematical Constants (15 constants)

Pre-defined constants with maximum precision:

```typescript
import { PI, E, PHI, SQRT2, DEGREES_PER_RADIAN } from '@awc/utils/maths';

const circumference = 2 * PI * radius;        // Precise π value
const area = radius * radius * PI;
const radians = degrees * DEGREES_PER_RADIAN; // π/180

// All constants
console.log(Constants.PI);        // 3.141592653589793
console.log(Constants.E);         // 2.718281828459045
console.log(Constants.PHI);       // 1.618033988749894 (Golden Ratio)
console.log(Constants.SQRT2);     // 1.4142135623730951
```

**Available Constants:**
- `PI`, `E`, `PHI` (Golden Ratio)
- `SQRT2`, `SQRT1_2`
- `LN2`, `LN10`, `LOG2E`, `LOG10E`
- `DEGREES_IN_CIRCLE`, `RADIANS_IN_CIRCLE`, `GRADIANS_IN_CIRCLE`
- `DEGREES_PER_RADIAN`, `RADIANS_PER_DEGREE`

#### 2. Type Guards (25+ functions)

Comprehensive validation functions:

```typescript
import {
  isInt, isNumber, isFloat, isSafeInteger,
  isPrime, isEven, isOdd, isPowerOfTwo,
  isPositive, isNegative, isZero,
  isInRange, approxEqual
} from '@awc/utils/maths';

// Basic number checks
isInt(42);                    // true
isInt("42");                  // true (accepts string)
isInt(42.5);                  // false
isNumber(42);                 // true (strict number)
isFloat(42.5);               // true

// Mathematical properties
isPrime(7);                   // true
isEven(4);                    // true
isOdd(3);                     // true
isPowerOfTwo(8);             // true

// Range and sign
isPositive(5);               // true
isNegative(-5);              // true
isZero(0.0000001, 1e-5);    // true (with epsilon)
isInRange(5, 1, 10);        // true

// Approximate equality
approxEqual(0.1 + 0.2, 0.3); // true (handles floating-point errors)
```

**Vector and Complex Numbers:**

```typescript
import { isVector2D, isVector3D, isComplexNumber } from '@awc/utils/maths';

isVector2D({ x: 1, y: 2 });              // true
isVector3D({ x: 1, y: 2, z: 3 });        // true
isComplexNumber({ real: 3, imag: 4 });   // true
```

#### 3. Number Formatting

Format numbers for display:

```typescript
import { formatNumber, formatCurrency, formatPercentage } from '@awc/utils/maths';

// Number formatting
formatNumber(1234567.89);                    // "1,234,567.89"
formatNumber(1234567.89, { decimals: 0 });   // "1,234,568"

// Currency formatting
formatCurrency(1234.56, 'USD');              // "$1,234.56"
formatCurrency(1234.56, 'EUR', 'de-DE');     // "1.234,56 €"

// Percentage formatting
formatPercentage(0.1234);                    // "12.34%"
formatPercentage(0.1234, 0);                 // "12%"

// Compact notation
formatCompact(1500);                         // "1.5K"
formatCompact(1500000);                      // "1.5M"
formatCompact(1500000000);                   // "1.5B"

// Ordinal numbers
formatOrdinal(1);                            // "1st"
formatOrdinal(2);                            // "2nd"
formatOrdinal(3);                            // "3rd"
formatOrdinal(21);                           // "21st"
```

#### 4. Random Number Generation

Generate random values:

```typescript
import {
  random, randomInt, randomFloat,
  randomBool, randomChoice, randomSample,
  shuffle
} from '@awc/utils/maths';

// Basic random
random();                              // Random float [0, 1)
randomInt(1, 100);                     // Random integer 1-100
randomFloat(0, 10);                    // Random float 0-10
randomBool();                          // true or false

// Array operations
randomChoice([1, 2, 3, 4, 5]);        // Random element
randomSample([1, 2, 3, 4, 5], 3);     // 3 random elements
shuffle([1, 2, 3, 4, 5]);             // Shuffled array
```

---

## 📝 Primitive Utilities

### Installation

```typescript
import {
  // String utilities
  toCamelCase, toKebabCase, toSnakeCase,
  capitalize, truncate, slugify,
  isEmail, isUrl,
  
  // Boolean utilities
  parseBoolean, isBoolean,
  
  // Date utilities
  formatDate, parseDate, addDays,
} from '@awc/utils/primitive';
```

### String Utilities (50+ functions)

#### Case Conversion

```typescript
import {
  toCamelCase, toPascalCase,
  toKebabCase, toSnakeCase,
  capitalize, toTitleCase
} from '@awc/utils/primitive';

toCamelCase('hello-world');           // "helloWorld"
toPascalCase('hello-world');          // "HelloWorld"
toKebabCase('helloWorld');            // "hello-world"
toSnakeCase('helloWorld');            // "hello_world"
capitalize('hello');                  // "Hello"
toTitleCase('hello world');           // "Hello World"
```

#### String Validation

```typescript
import {
  isEmpty, isEmail, isUrl,
  isAlphanumeric, isAlpha, isNumeric,
  startsWith, endsWith, includes
} from '@awc/utils/primitive';

isEmpty('');                          // true
isEmail('user@example.com');          // true
isUrl('https://example.com');         // true
isAlphanumeric('abc123');            // true

startsWith('hello', 'he');           // true
endsWith('hello', 'lo');             // true
includes('hello', 'ell');            // true
```

#### String Manipulation

```typescript
import {
  truncate, slugify, reverse,
  removeAccents, wordCount
} from '@awc/utils/primitive';

truncate('Long text here', 10);      // "Long te..."
slugify('Hello World! 2024');        // "hello-world-2024"
reverse('hello');                    // "olleh"
removeAccents('café');               // "cafe"
wordCount('Hello world');            // 2
```

#### String Escaping

```typescript
import {
  escapeHtml, unescapeHtml,
  escapeRegExp, escapeUnicode
} from '@awc/utils/primitive';

escapeHtml('<div>Hello</div>');      // "&lt;div&gt;Hello&lt;/div&gt;"
unescapeHtml('&lt;div&gt;');         // "<div>"
escapeRegExp('.*+?^$');              // "\\.\\*\\+\\?\\^\\$"
```

### Boolean Utilities

```typescript
import { parseBoolean, isBoolean, toBoolean } from '@awc/utils/primitive';

// Parse various boolean representations
parseBoolean('true');                // true
parseBoolean('yes');                 // true
parseBoolean('1');                   // true
parseBoolean('on');                  // true
parseBoolean('false');               // false

// Validate
isBoolean(true);                     // true
isBoolean('true');                   // false (string)

// Convert
toBoolean('yes');                    // true
toBoolean(1);                        // true
toBoolean('');                       // false
```

### Date Utilities

#### Date Formatting

```typescript
import { formatDate } from '@awc/utils/primitive';

const date = new Date('2024-01-15T10:30:00');

formatDate(date, 'YYYY-MM-DD');              // "2024-01-15"
formatDate(date, 'DD/MM/YYYY');              // "15/01/2024"
formatDate(date, 'MMM DD, YYYY');            // "Jan 15, 2024"
formatDate(date, 'MMMM DD, YYYY');           // "January 15, 2024"
formatDate(date, 'dddd, MMMM DD, YYYY');     // "Monday, January 15, 2024"
formatDate(date, 'YYYY-MM-DD HH:mm:ss');     // "2024-01-15 10:30:00"
```

#### Date Manipulation

```typescript
import { addDays, addMonths, subtractDays } from '@awc/utils/primitive';

const date = new Date('2024-01-15');

addDays(date, 7);                    // 2024-01-22
addMonths(date, 2);                  // 2024-03-15
subtractDays(date, 7);               // 2024-01-08
```

#### Date Comparison

```typescript
import {
  isBefore, isAfter, isSameDay,
  isToday, isFuture, isPast
} from '@awc/utils/primitive';

isBefore(date1, date2);              // true/false
isAfter(date2, date1);               // true/false
isSameDay(date1, date2);             // true/false
isToday(new Date());                 // true
isFuture(date);                      // true/false
isPast(date);                        // true/false
```

#### Date Calculation

```typescript
import { diffDays, diffHours, calculateAge } from '@awc/utils/primitive';

const date1 = new Date('2024-01-15');
const date2 = new Date('2024-01-22');

diffDays(date1, date2);              // 7
diffHours(date1, date2);             // 168
calculateAge(new Date('1990-01-15')); // Age in years
```

---

## 🎯 Common Use Cases

### Use Case 1: Form Validation

```typescript
import { isInt, isInRange } from '@awc/utils/maths';
import { isEmail, isEmpty, trim } from '@awc/utils/primitive';

function validateRegistrationForm(data: {
  email: string;
  age: string;
  username: string;
}) {
  const errors: string[] = [];

  // Validate email
  const email = trim(data.email);
  if (isEmpty(email)) {
    errors.push('Email is required');
  } else if (!isEmail(email)) {
    errors.push('Invalid email format');
  }

  // Validate age
  if (!isInt(data.age)) {
    errors.push('Age must be an integer');
  } else {
    const age = Number(data.age);
    if (!isInRange(age, 13, 120)) {
      errors.push('Age must be between 13 and 120');
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### Use Case 2: Display Formatting

```typescript
import { formatCurrency, formatPercentage } from '@awc/utils/maths';
import { formatDate } from '@awc/utils/primitive';

function formatDashboardMetrics(data: {
  revenue: number;
  growthRate: number;
  lastUpdated: Date;
}) {
  return {
    revenue: formatCurrency(data.revenue, 'USD'),
    growth: formatPercentage(data.growthRate),
    updated: formatDate(data.lastUpdated, 'MMM DD, YYYY HH:mm')
  };
}

// Usage
formatDashboardMetrics({
  revenue: 1234567.89,
  growthRate: 0.1234,
  lastUpdated: new Date()
});
// {
//   revenue: "$1,234,567.89",
//   growth: "12.34%",
//   updated: "Jan 15, 2024 10:30"
// }
```

### Use Case 3: URL Slug Generation

```typescript
import { slugify, truncate } from '@awc/utils/primitive';

function generateSlug(title: string, maxLength = 50): string {
  const slug = slugify(title);
  return truncate(slug, maxLength, '');
}

generateSlug('Hello World! 2024');           // "hello-world-2024"
generateSlug('Café in Paris - Great Food!'); // "cafe-in-paris-great-food"
generateSlug('Very Long Title That Needs To Be Truncated', 30);
// "very-long-title-that-needs-to"
```

### Use Case 4: Random Selection

```typescript
import { randomInt, randomChoice, shuffle } from '@awc/utils/maths';

// Random dice roll
function rollDice(sides: number = 6): number {
  return randomInt(1, sides);
}

// Random card selection
const deck = ['A♠', 'K♠', 'Q♠', 'J♠', '10♠', /* ... */];
const drawnCard = randomChoice(deck);

// Shuffle array
const shuffledDeck = shuffle(deck);

// Random team assignment
const players = ['Alice', 'Bob', 'Charlie', 'Diana'];
const shuffledPlayers = shuffle(players);
const team1 = shuffledPlayers.slice(0, 2);
const team2 = shuffledPlayers.slice(2);
```

### Use Case 5: Safe Content Rendering

```typescript
import { escapeHtml } from '@awc/utils/primitive';

function renderComment(comment: string, author: string): string {
  // Escape user-provided content to prevent XSS
  const safeComment = escapeHtml(comment);
  const safeAuthor = escapeHtml(author);
  
  return `
    <div class="comment">
      <p class="author">${safeAuthor}</p>
      <p class="content">${safeComment}</p>
    </div>
  `;
}

// Safe rendering
renderComment('<script>alert("xss")</script>', '<b>Hacker</b>');
// Output has all HTML escaped
```

### Use Case 6: Relative Time Display

```typescript
import { diffDays, diffHours, diffMinutes } from '@awc/utils/primitive';
import { formatDate } from '@awc/utils/primitive';

function timeAgo(date: Date): string {
  const now = new Date();
  const days = diffDays(date, now);
  
  if (days > 30) {
    return formatDate(date, 'MMM DD, YYYY');
  }
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  
  const hours = diffHours(date, now);
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  const minutes = diffMinutes(date, now);
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  
  return 'Just now';
}
```

---

## 📊 Statistics

### Math Utilities
- **15 Mathematical Constants** - Maximum precision
- **25+ Type Guards** - Comprehensive validation
- **10+ Formatters** - Number, currency, percentage, compact
- **8+ Random Functions** - Generation, sampling, shuffling
- **Vector/Matrix Support** - 2D, 3D vectors, complex numbers

### Primitive Utilities
- **50+ String Functions** - Case, validation, manipulation, escaping
- **8+ Boolean Functions** - Parsing, validation, conversion
- **40+ Date Functions** - Formatting, parsing, manipulation, comparison

**Total:** 140+ utility functions across both modules!

---

## 🎨 TypeScript Support

Full TypeScript support with intelligent type inference:

```typescript
import { isInt, isVector2D } from '@awc/utils/maths';
import { isEmail } from '@awc/utils/primitive';

function processValue(value: unknown) {
  // Type guards narrow types
  if (isInt(value)) {
    const doubled: number = value * 2; // TypeScript knows value is number
  }
  
  if (typeof value === 'string' && isEmail(value)) {
    const email: string = value.toLowerCase(); // TypeScript knows it's string
  }
}

function processVector(value: unknown) {
  if (isVector2D(value)) {
    // TypeScript knows value is Vector2D
    const distance = Math.sqrt(value.x ** 2 + value.y ** 2);
  }
}
```

---

## ⚡ Performance

Both modules are optimized for performance:

### Math Utilities
- **Bitwise operations** for `isEven`, `isPowerOfTwo`
- **Fast paths** for common cases in type guards
- **Regex optimization** in validators

### Primitive Utilities
- **Native methods** where possible (trim, etc.)
- **Efficient regex patterns** for validation
- **Cached computations** where beneficial

---

## 🔒 Security

### String Utilities
- ✅ HTML escaping to prevent XSS
- ✅ Regex escaping for safe patterns
- ✅ URL encoding/decoding
- ✅ Unicode handling

### Validation
- ✅ Email validation
- ✅ URL validation
- ✅ Safe number parsing
- ✅ Date validation

---

## 📚 Documentation

### Math Utilities
- **Location:** `docs/docs/maths/`
- **Files:**
  - `index.md` - Overview and quick start
  - Examples for constants, type guards, formatting
  - TypeScript integration examples
  - Performance tips

### Primitive Utilities
- **Location:** `docs/docs/primitives/`
- **Files:**
  - `index.md` - Complete guide
  - String, boolean, and date utilities
  - Real-world examples
  - Security best practices

---

## 🌟 Best Practices

### 1. Use Type Guards

```typescript
// ✅ Good: Use specific type guards
if (isInt(value) && isPositive(value)) {
  // Process valid positive integer
}

// ❌ Avoid: Generic checks
if (typeof value === 'number') {
  // May include NaN, Infinity, negative, floats
}
```

### 2. Escape User Content

```typescript
// ✅ Good: Always escape
const safe = escapeHtml(userInput);

// ❌ Avoid: Direct insertion
const unsafe = `<div>${userInput}</div>`; // XSS risk!
```

### 3. Use Constants for Precision

```typescript
// ✅ Good: Use precise constants
const circumference = 2 * PI * radius;

// ❌ Avoid: Hardcoded approximations
const circumference = 2 * 3.14 * radius;
```

### 4. Validate Dates

```typescript
// ✅ Good: Validate before use
if (isValidDate(date)) {
  const formatted = formatDate(date, 'YYYY-MM-DD');
}

// ❌ Avoid: Assume validity
const formatted = formatDate(date, 'YYYY-MM-DD'); // May fail
```

---

## 🚀 Browser Support

All utilities work in:
- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Node.js 14+
- ✅ React Native
- ✅ Electron
- ✅ Deno

---

## 📖 Next Steps

1. **Explore the documentation:**
   - [Math Utilities](./maths/index.md)
   - [Primitive Utilities](./primitives/index.md)

2. **Try the examples:**
   - Check test files for usage patterns
   - Review documentation examples

3. **Integrate into your app:**
   - Import utilities as needed
   - Follow security best practices
   - Use TypeScript types for safety

---

## 📝 Summary

**Total Utilities:** 140+
- Math: 60+ functions
- String: 50+ functions
- Boolean: 8+ functions
- Date: 40+ functions

**Documentation:** Comprehensive guides with real-world examples
**TypeScript:** Full type safety and inference
**Testing:** Extensive test coverage
**Production Ready:** Optimized and secure ✅

---

**Happy coding with @awc/utils!** 🎉