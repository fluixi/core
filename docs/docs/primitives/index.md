---
sidebar_position: 1
---

# Primitive Utilities

Comprehensive collection of utilities for working with JavaScript primitive types including strings, booleans, and dates with full TypeScript support.

## Overview

The primitive utilities module provides powerful tools for manipulating and transforming basic JavaScript types:
- **String Utilities** - Case conversion, trimming, validation, formatting
- **Boolean Utilities** - Parsing, validation, type guards
- **Date Utilities** - Formatting, parsing, manipulation, comparison

## Key Features

- 🎯 **Type-Safe** - Full TypeScript support with type guards
- ⚡ **High Performance** - Optimized implementations
- 🔄 **Comprehensive** - Covers common and advanced use cases
- 📦 **Tree-Shakable** - Import only what you need
- ✅ **Well-Tested** - Extensive test coverage
- 🌐 **Cross-Platform** - Works in browser, Node.js, React Native

## Installation

```typescript
import {
  // String utilities
  toCamelCase, toKebabCase, toSnakeCase,
  capitalize, truncate, slugify,
  
  // Boolean utilities
  parseBoolean, isBoolean,
  
  // Date utilities
  formatDate, parseDate, addDays,
  
  // ... other utilities
} from '@fluixi/utils/primitive';
```

## Quick Start

### String Utilities

Transform and manipulate strings:

```typescript
import {
  toCamelCase,
  toKebabCase,
  toSnakeCase,
  toPascalCase,
  capitalize,
  truncate,
  slugify
} from '@fluixi/utils/primitive';

// Case conversions
toCamelCase('hello-world');        // "helloWorld"
toKebabCase('helloWorld');         // "hello-world"
toSnakeCase('helloWorld');         // "hello_world"
toPascalCase('hello-world');       // "HelloWorld"

// String manipulation
capitalize('hello');                // "Hello"
truncate('Long text...', 10);      // "Long te..."
slugify('Hello World!');           // "hello-world"
```

### String Validation

Check string properties:

```typescript
import {
  isEmpty,
  isEmail,
  isUrl,
  isAlphanumeric,
  startsWith,
  endsWith
} from '@fluixi/utils/primitive';

isEmpty('');                        // true
isEmpty('   ');                     // true (whitespace only)

isEmail('user@example.com');        // true
isUrl('https://example.com');       // true
isAlphanumeric('abc123');          // true

startsWith('hello', 'he');         // true
endsWith('hello', 'lo');           // true
```

### String Escaping

Escape special characters:

```typescript
import { escapeHtml, escapeRegExp, unescapeHtml } from '@fluixi/utils/primitive';

escapeHtml('<div>Hello</div>');    // "&lt;div&gt;Hello&lt;/div&gt;"
unescapeHtml('&lt;div&gt;');       // "<div>"
escapeRegExp('.*+?^${}()|[]\\');   // "\\.\\*\\+\\?\\^\\$..."
```

### Boolean Utilities

Parse and validate booleans:

```typescript
import { parseBoolean, isBoolean, toBoolean } from '@fluixi/utils/primitive';

parseBoolean('true');              // true
parseBoolean('yes');               // true
parseBoolean('1');                 // true
parseBoolean('false');             // false

isBoolean(true);                   // true
isBoolean('true');                 // false (string, not boolean)

toBoolean('yes');                  // true
toBoolean(1);                      // true
toBoolean(null);                   // false
```

### Date Utilities

Format and manipulate dates:

```typescript
import {
  formatDate,
  parseDate,
  addDays,
  diffDays,
  isValidDate,
  isSameDay
} from '@fluixi/utils/primitive';

// Format dates
formatDate(new Date(), 'YYYY-MM-DD');          // "2024-01-15"
formatDate(new Date(), 'DD/MM/YYYY');          // "15/01/2024"
formatDate(new Date(), 'MMM DD, YYYY');        // "Jan 15, 2024"

// Parse dates
parseDate('2024-01-15');                       // Date object

// Date manipulation
addDays(new Date(), 7);                        // Add 7 days
diffDays(date1, date2);                        // Difference in days

// Date validation
isValidDate(new Date());                       // true
isSameDay(date1, date2);                       // true/false
```

## String Utilities Reference

### Case Conversion

Convert between different casing styles:

| Function | Input | Output | Use Case |
|----------|-------|--------|----------|
| `toCamelCase` | `"hello-world"` | `"helloWorld"` | JavaScript variables |
| `toPascalCase` | `"hello-world"` | `"HelloWorld"` | Class names |
| `toKebabCase` | `"helloWorld"` | `"hello-world"` | URLs, CSS classes |
| `toSnakeCase` | `"helloWorld"` | `"hello_world"` | Database columns |
| `capitalize` | `"hello"` | `"Hello"` | Sentences |
| `toTitleCase` | `"hello world"` | `"Hello World"` | Titles |

**Example:**

```typescript
const apiEndpoint = toCamelCase('user-profile');  // "userProfile"
const className = toPascalCase('button-primary'); // "ButtonPrimary"
const cssClass = toKebabCase('headerNav');        // "header-nav"
const dbColumn = toSnakeCase('firstName');        // "first_name"
```

### String Trimming

Remove whitespace and characters:

```typescript
trim('  hello  ');                 // "hello"
trimStart('  hello');              // "hello"
trimEnd('hello  ');                // "hello"
trimChar('__hello__', '_');        // "hello"
```

### String Validation

Check string properties:

```typescript
isEmpty('');                       // true
isBlank('   ');                    // true (empty or whitespace)
isNotEmpty('hello');               // true

isEmail('user@example.com');       // true
isUrl('https://example.com');      // true
isAlphanumeric('abc123');         // true
isAlpha('abc');                    // true
isNumeric('123');                  // true

hasUpperCase('Hello');             // true
hasLowerCase('Hello');             // true
hasDigit('abc123');               // true
hasSpecialChar('hello!');         // true
```

### String Manipulation

Transform and modify strings:

```typescript
// Truncate
truncate('Long text here', 10);                    // "Long te..."
truncate('Short', 10);                             // "Short"

// Pad
padStart('5', 3, '0');                             // "005"
padEnd('5', 3, '0');                               // "500"

// Repeat
repeat('abc', 3);                                  // "abcabcabc"

// Reverse
reverse('hello');                                  // "olleh"

// Slugify (URL-friendly)
slugify('Hello World! 123');                       // "hello-world-123"

// Remove accents
removeAccents('café');                             // "cafe"

// Word count
wordCount('Hello world');                          // 2

// Character count
charCount('hello', 'l');                          // 2
```

### String Search and Replace

Find and replace content:

```typescript
// Case-sensitive
includes('hello world', 'world');                  // true
startsWith('hello', 'he');                        // true
endsWith('hello', 'lo');                          // true

// Case-insensitive
includesIgnoreCase('Hello', 'hello');             // true
startsWithIgnoreCase('Hello', 'hello');           // true
endsWithIgnoreCase('Hello', 'HELLO');             // true

// Replace
replaceAll('hello world', 'l', 'x');              // "hexxo worxd"
replaceAllIgnoreCase('Hello', 'hello', 'Hi');     // "Hi"
replaceFirst('hello', 'l', 'x');                  // "hexlo"
replaceLast('hello', 'l', 'x');                   // "helxo"
```

### String Extraction

Extract parts of strings:

```typescript
// Substring operations
substring('hello', 1, 4);                         // "ell"
slice('hello', -2);                               // "lo"

// Extract between delimiters
between('Hello [world]', '[', ']');               // "world"
beforeFirst('one-two-three', '-');                // "one"
afterFirst('one-two-three', '-');                 // "two-three"
beforeLast('one-two-three', '-');                 // "one-two"
afterLast('one-two-three', '-');                  // "three"
```

### String Splitting

Split strings into arrays:

```typescript
split('a,b,c', ',');                              // ["a", "b", "c"]
splitLines('line1\nline2');                       // ["line1", "line2"]
splitWords('hello world');                        // ["hello", "world"]
splitCamelCase('helloWorld');                     // ["hello", "World"]
```

### String Escaping

Escape special characters:

```typescript
// HTML escaping
escapeHtml('<div>Hello</div>');                   // "&lt;div&gt;Hello&lt;/div&gt;"
unescapeHtml('&lt;div&gt;');                      // "<div>"

// Regex escaping
escapeRegExp('.*+?^$');                           // "\\.\\*\\+\\?\\^\\$"

// Unicode escaping
escapeUnicode('hello');                           // "\\u0068\\u0065\\u006c..."

// URL encoding
encodeUrl('hello world');                         // "hello%20world"
decodeUrl('hello%20world');                       // "hello world"
```

## Boolean Utilities Reference

### Boolean Parsing

Parse various inputs to boolean:

```typescript
parseBoolean('true');              // true
parseBoolean('yes');               // true
parseBoolean('1');                 // true
parseBoolean('on');                // true
parseBoolean('false');             // false
parseBoolean('no');                // false
parseBoolean('0');                 // false
parseBoolean('off');               // false

// With default value
parseBooleanSafe('invalid', false);                // false
```

### Boolean Validation

Check boolean types:

```typescript
isBoolean(true);                   // true
isBoolean(false);                  // true
isBoolean('true');                 // false (string)
isBoolean(1);                      // false (number)

isTruthy('yes');                   // true
isFalsy('');                       // true
```

### Boolean Conversion

Convert values to boolean:

```typescript
toBoolean('yes');                  // true
toBoolean(1);                      // true
toBoolean('');                     // false
toBoolean(null);                   // false

toBooleanStrict('true');           // true
toBooleanStrict('1');              // throws (strict mode)
```

## Date Utilities Reference

### Date Formatting

Format dates in various styles:

```typescript
const date = new Date('2024-01-15T10:30:00');

// Common formats
formatDate(date, 'YYYY-MM-DD');              // "2024-01-15"
formatDate(date, 'DD/MM/YYYY');              // "15/01/2024"
formatDate(date, 'MM/DD/YYYY');              // "01/15/2024"
formatDate(date, 'YYYY-MM-DD HH:mm:ss');     // "2024-01-15 10:30:00"

// Readable formats
formatDate(date, 'MMM DD, YYYY');            // "Jan 15, 2024"
formatDate(date, 'MMMM DD, YYYY');           // "January 15, 2024"
formatDate(date, 'ddd, MMM DD');             // "Mon, Jan 15"
formatDate(date, 'dddd, MMMM DD, YYYY');     // "Monday, January 15, 2024"

// Time formats
formatDate(date, 'HH:mm');                   // "10:30"
formatDate(date, 'hh:mm A');                 // "10:30 AM"
```

### Date Parsing

Parse various date formats:

```typescript
parseDate('2024-01-15');                     // Date object
parseDate('01/15/2024');                     // Date object
parseDate('Jan 15, 2024');                   // Date object

parseDateSafe('invalid');                    // null (safe parsing)
parseDateSafe('2024-01-15', new Date());     // Date or fallback
```

### Date Manipulation

Add or subtract time:

```typescript
const date = new Date('2024-01-15');

addYears(date, 1);                           // 2025-01-15
addMonths(date, 2);                          // 2024-03-15
addWeeks(date, 1);                           // 2024-01-22
addDays(date, 7);                            // 2024-01-22
addHours(date, 24);                          // 2024-01-16
addMinutes(date, 60);                        // Add 60 minutes
addSeconds(date, 3600);                      // Add 3600 seconds

subtractDays(date, 7);                       // 2024-01-08
subtractMonths(date, 1);                     // 2023-12-15
```

### Date Comparison

Compare dates:

```typescript
const date1 = new Date('2024-01-15');
const date2 = new Date('2024-01-20');

isBefore(date1, date2);                      // true
isAfter(date2, date1);                       // true
isSameDay(date1, date1);                     // true
isSameMonth(date1, new Date('2024-01-20'));  // true
isSameYear(date1, new Date('2024-12-31'));   // true

isToday(new Date());                         // true
isYesterday(subtractDays(new Date(), 1));    // true
isTomorrow(addDays(new Date(), 1));          // true

isFuture(date2);                             // true/false (depends on now)
isPast(date1);                               // true/false (depends on now)
```

### Date Calculation

Calculate differences:

```typescript
const date1 = new Date('2024-01-15');
const date2 = new Date('2024-01-22');

diffYears(date1, date2);                     // 0
diffMonths(date1, date2);                    // 0
diffWeeks(date1, date2);                     // 1
diffDays(date1, date2);                      // 7
diffHours(date1, date2);                     // 168
diffMinutes(date1, date2);                   // 10080
diffSeconds(date1, date2);                   // 604800

// Age calculation
calculateAge(new Date('1990-01-15'));        // 34 (example)

// Duration format
formatDuration(3665);                        // "1h 1m 5s"
```

### Date Validation

Validate dates:

```typescript
isValidDate(new Date());                     // true
isValidDate(new Date('invalid'));            // false
isValidDate('2024-01-15');                   // false (string)

isLeapYear(2024);                            // true
isLeapYear(2023);                            // false

isWeekend(new Date('2024-01-13'));          // true (Saturday)
isWeekday(new Date('2024-01-15'));          // true (Monday)
```

### Date Utilities

Get date components and information:

```typescript
const date = new Date('2024-01-15T10:30:00');

getYear(date);                               // 2024
getMonth(date);                              // 0 (January is 0)
getDay(date);                                // 15
getDayOfWeek(date);                          // 1 (Monday)
getHours(date);                              // 10
getMinutes(date);                            // 30

getMonthName(date);                          // "January"
getDayName(date);                            // "Monday"

getDaysInMonth(date);                        // 31
getWeekOfYear(date);                         // 3

startOfDay(date);                            // 2024-01-15T00:00:00
endOfDay(date);                              // 2024-01-15T23:59:59
startOfWeek(date);                           // Previous Monday
endOfWeek(date);                             // Following Sunday
startOfMonth(date);                          // 2024-01-01
endOfMonth(date);                            // 2024-01-31
```

## Common Use Cases

### Form Validation

```typescript
import { isEmail, isEmpty, isAlphanumeric } from '@fluixi/utils/primitive';

function validateForm(data: {
  email: string;
  username: string;
  password: string;
}) {
  const errors: string[] = [];

  if (isEmpty(data.email)) {
    errors.push('Email is required');
  } else if (!isEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (isEmpty(data.username)) {
    errors.push('Username is required');
  } else if (!isAlphanumeric(data.username)) {
    errors.push('Username must be alphanumeric');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### URL Slug Generation

```typescript
import { slugify, truncate } from '@fluixi/utils/primitive';

function generateSlug(title: string): string {
  // Remove special chars, convert to lowercase, replace spaces
  const slug = slugify(title);
  
  // Limit length
  return truncate(slug, 50, '');
}

generateSlug('Hello World! 2024');  // "hello-world-2024"
generateSlug('Café français');      // "cafe-francais"
```

### Safe HTML Rendering

```typescript
import { escapeHtml } from '@fluixi/utils/primitive';

function renderComment(comment: string): string {
  // Escape HTML to prevent XSS
  const safe = escapeHtml(comment);
  return `<div class="comment">${safe}</div>`;
}

renderComment('<script>alert("xss")</script>');
// "<div class="comment">&lt;script&gt;alert("xss")&lt;/script&gt;</div>"
```

### Date Range Display

```typescript
import { formatDate, diffDays } from '@fluixi/utils/primitive';

function formatDateRange(start: Date, end: Date): string {
  const days = diffDays(start, end);
  
  if (days === 0) {
    return formatDate(start, 'MMM DD, YYYY');
  }
  
  if (days < 7) {
    return `${formatDate(start, 'MMM DD')} - ${formatDate(end, 'DD, YYYY')}`;
  }
  
  return `${formatDate(start, 'MMM DD')} - ${formatDate(end, 'MMM DD, YYYY')}`;
}
```

### Relative Time Display

```typescript
import { diffDays, diffHours, diffMinutes } from '@fluixi/utils/primitive';

function timeAgo(date: Date): string {
  const now = new Date();
  const days = diffDays(date, now);
  
  if (days > 30) return formatDate(date, 'MMM DD, YYYY');
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  
  const hours = diffHours(date, now);
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  
  const minutes = diffMinutes(date, now);
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  
  return 'Just now';
}
```

## TypeScript Support

Full TypeScript support with type guards and strict typing:

```typescript
import { isEmail, parseBoolean, isValidDate } from '@fluixi/utils/primitive';

function processInput(value: unknown) {
  if (typeof value === 'string') {
    if (isEmail(value)) {
      // TypeScript knows this is a valid email string
      console.log('Email:', value);
    }
  }
  
  if (typeof value === 'boolean') {
    // TypeScript knows this is a boolean
    console.log('Boolean:', value);
  }
  
  if (value instanceof Date && isValidDate(value)) {
    // TypeScript knows this is a valid Date
    console.log('Date:', value);
  }
}
```

## Best Practices

### 1. Validate User Input

```typescript
import { isEmail, trim, isEmpty } from '@fluixi/utils/primitive';

// ✅ Good: Validate and sanitize
function processEmail(input: string): string {
  const cleaned = trim(input);
  
  if (isEmpty(cleaned)) {
    throw new Error('Email is required');
  }
  
  if (!isEmail(cleaned)) {
    throw new Error('Invalid email format');
  }
  
  return cleaned.toLowerCase();
}
```

### 2. Escape User Content

```typescript
import { escapeHtml } from '@fluixi/utils/primitive';

// ✅ Good: Always escape user content
function renderUserComment(comment: string) {
  return `<div>${escapeHtml(comment)}</div>`;
}

// ❌ Avoid: Directly inserting user content
function unsafeRender(comment: string) {
  return `<div>${comment}</div>`;  // XSS vulnerability!
}
```

### 3. Use Consistent Case Conventions

```typescript
import { toCamelCase, toKebabCase } from '@fluixi/utils/primitive';

// ✅ Good: Consistent naming
const apiFields = ['first_name', 'last_name'].map(toCamelCase);
// ["firstName", "lastName"]

const cssClasses = ['headerNav', 'footerLinks'].map(toKebabCase);
// ["header-nav", "footer-links"]
```

### 4. Handle Date Edge Cases

```typescript
import { isValidDate, parseDateSafe } from '@fluixi/utils/primitive';

// ✅ Good: Validate dates
function processDate(input: string): Date {
  const date = parseDateSafe(input);
  
  if (!date || !isValidDate(date)) {
    throw new Error('Invalid date');
  }
  
  return date;
}
```

## Browser Support

All utilities work in:
- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Node.js 14+
- ✅ React Native
- ✅ Electron
- ✅ Deno

## Documentation

- [String API Reference](./string.md) - Complete string utilities
- [Boolean API Reference](./boolean.md) - Boolean utilities
- [Date API Reference](./date.md) - Date utilities
- [Examples](./examples.md) - Real-world use cases

## Next Steps

- Check out the [String Utilities](./string.md) for detailed string operations
- See [Date Utilities](./date.md) for advanced date manipulation
- Review [Examples](./examples.md) for more real-world patterns