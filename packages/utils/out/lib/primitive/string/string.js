/**
 * String utilities collection for TypeScript
 * Provides optimized methods for common string operations
 */
import { parseJsObjectLiteral } from './parser.js';
/**
 * Trims whitespace from both ends of a string with high performance
 * @param str - The string to trim
 * @returns Trimmed string
 * @example
 * trim("  hello  ") // "hello"
 */
export const trim = (str) => {
    // Use native trim for best performance
    return str.trim();
};
/**
 * Trims whitespace from the start of a string
 * @param str - The string to trim
 * @returns Left-trimmed string
 * @example
 * trimStart("  hello") // "hello"
 */
export const trimStart = (str) => {
    return str.trimStart();
};
/**
 * Trims whitespace from the end of a string
 * @param str - The string to trim
 * @returns Right-trimmed string
 * @example
 * trimEnd("hello  ") // "hello"
 */
export const trimEnd = (str) => {
    return str.trimEnd();
};
/**
 * Converts string to camelCase
 * @param str - The string to convert
 * @returns camelCase string
 * @example
 * toCamelCase("hello-world") // "helloWorld"
 */
export const toCamelCase = (str) => {
    return str
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
        .replace(/^[A-Z]/, (chr) => chr.toLowerCase());
};
/**
 * Converts string to PascalCase
 * @param str - The string to convert
 * @returns PascalCase string
 * @example
 * toPascalCase("hello-world") // "HelloWorld"
 */
export const toPascalCase = (str) => {
    return str
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
        .replace(/^[a-z]/, (chr) => chr.toUpperCase());
};
/**
 * Converts string to kebab-case
 * @param str - The string to convert
 * @returns kebab-case string
 * @example
 * toKebabCase("helloWorld") // "hello-world"
 */
export const toKebabCase = (str) => {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[_\s]+/g, '-')
        .toLowerCase();
};
/**
 * Converts string to snake_case
 * @param str - The string to convert
 * @returns snake_case string
 * @example
 * toSnakeCase("helloWorld") // "hello_world"
 */
export const toSnakeCase = (str) => {
    return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[-\s]+/g, '_')
        .toLowerCase();
};
/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns Capitalized string
 * @example
 * capitalize("hello") // "Hello"
 */
export const capitalize = (str) => {
    if (!str)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
};
/**
 * Converts string to title case (each word capitalized)
 * @param str - The string to convert
 * @returns Title case string
 * @example
 * toTitleCase("hello world") // "Hello World"
 */
export const toTitleCase = (str) => {
    return str.replace(/\b\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
};
/**
 * Checks if string starts with a substring (case-sensitive)
 * @param str - The string to check
 * @param search - The substring to search for
 * @param position - Position to start searching (default: 0)
 * @returns True if string starts with search string
 * @example
 * startsWith("hello", "he") // true
 */
export const startsWith = (str, search, position = 0) => {
    return str.startsWith(search, position);
};
/**
 * Checks if string ends with a substring (case-sensitive)
 * @param str - The string to check
 * @param search - The substring to search for
 * @param length - Length to use (default: str.length)
 * @returns True if string ends with search string
 * @example
 * endsWith("hello", "lo") // true
 */
export const endsWith = (str, search, length) => {
    return str.endsWith(search, length);
};
/**
 * Checks if string contains a substring (case-sensitive)
 * @param str - The string to check
 * @param search - The substring to search for
 * @returns True if string contains search string
 * @example
 * includes("hello", "ell") // true
 */
export const includes = (str, search) => {
    return str.includes(search);
};
/**
 * Checks if string contains a substring (case-insensitive)
 * @param str - The string to check
 * @param search - The substring to search for
 * @returns True if string contains search string (case-insensitive)
 * @example
 * includesIgnoreCase("Hello", "hello") // true
 */
export const includesIgnoreCase = (str, search) => {
    return str.toLowerCase().includes(search.toLowerCase());
};
/**
 * Replaces all occurrences of a substring (case-sensitive)
 * @param str - The string to process
 * @param search - The substring to replace
 * @param replacement - The replacement string
 * @returns String with all occurrences replaced
 * @example
 * replaceAll("hello world", "l", "x") // "hexxo worxd"
 */
export const replaceAll = (str, search, replacement) => {
    // Use native replaceAll if available, otherwise use regex with escape
    if (typeof str.replaceAll === 'function') {
        return str.replaceAll(search, replacement);
    }
    return str.replace(new RegExp(escapeRegExp(search), 'g'), replacement);
};
/**
 * Replaces all occurrences of a substring (case-insensitive)
 * @param str - The string to process
 * @param search - The substring to replace
 * @param replacement - The replacement string
 * @returns String with all occurrences replaced (case-insensitive)
 * @example
 * replaceAllIgnoreCase("Hello World", "hello", "Hi") // "Hi World"
 */
export const replaceAllIgnoreCase = (str, search, replacement) => {
    return str.replace(new RegExp(escapeRegExp(search), 'gi'), replacement);
};
/**
 * Escapes regex special characters in a string
 * @param str - The string to escape
 * @returns Escaped string safe for use in regex
 * @example
 * escapeRegExp(".*+?^${}()|[]\\") // "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\"
 */
export const escapeRegExp = (str) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
/**
 * Escapes HTML special characters
 * @param str - The string to escape
 * @returns HTML-escaped string
 * @example
 * escapeHtml("<div>") // "&lt;div&gt;"
 */
export const escapeHtml = (str) => {
    const htmlEntities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
    };
    return str.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char);
};
/**
 * Unescapes HTML entities
 * @param str - The string to unescape
 * @returns Unescaped string
 * @example
 * unescapeHtml("&lt;div&gt;") // "<div>"
 */
export const unescapeHtml = (str) => {
    const htmlEntities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&#x2F;': '/',
    };
    return str.replace(/&(?:amp|lt|gt|quot|#39|#x2F);/g, (entity) => htmlEntities[entity] || entity);
};
/**
 * Truncates string to specified length with ellipsis
 * @param str - The string to truncate
 * @param length - Maximum length
 * @param ellipsis - Ellipsis string (default: "...")
 * @returns Truncated string
 * @example
 * truncate("Hello world", 8) // "Hello..."
 */
export const truncate = (str, length, ellipsis = '...') => {
    if (str.length <= length)
        return str;
    return str.slice(0, length - ellipsis.length) + ellipsis;
};
/**
 * Pads string to specified length with character
 * @param str - The string to pad
 * @param length - Target length
 * @param padChar - Character to pad with (default: " ")
 * @param side - Which side to pad: "start", "end", or "both" (default: "start")
 * @returns Padded string
 * @example
 * pad("hello", 10, "*", "both") // "**hello***"
 */
export const pad = (str, length, padChar = ' ', side = 'start') => {
    const paddingNeeded = length - str.length;
    if (paddingNeeded <= 0)
        return str;
    const padStr = padChar.repeat(paddingNeeded);
    switch (side) {
        case 'start':
            return padStr + str;
        case 'end':
            return str + padStr;
        case 'both':
            const leftPad = Math.floor(paddingNeeded / 2);
            const rightPad = paddingNeeded - leftPad;
            return padChar.repeat(leftPad) + str + padChar.repeat(rightPad);
    }
};
/**
 * Checks if string is empty or whitespace only
 * @param str - The string to check
 * @returns True if string is empty or whitespace only
 * @example
 * isEmpty("   ") // true
 * isEmpty("hello") // false
 */
export const isEmpty = (str) => {
    return str.trim().length === 0;
};
/**
 * Checks if string is a valid email address
 * @param email - The email string to validate
 * @returns True if string is a valid email
 * @example
 * isValidEmail("test@example.com") // true
 */
export const isValidEmail = (email) => {
    // RFC 5322 compliant regex (simplified but effective)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email.trim());
};
/**
 * Checks if string is a valid URL
 * @param url - The URL string to validate
 * @returns True if string is a valid URL
 * @example
 * isValidUrl("https://example.com") // true
 */
export const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
};
/**
 * Extracts domain from URL
 * @param url - The URL string
 * @returns Domain name or empty string
 * @example
 * extractDomain("https://www.example.com/path") // "example.com"
 */
export const extractDomain = (url) => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace(/^www\./, '');
    }
    catch {
        return '';
    }
};
/**
 * Generates a random string of specified length
 * @param length - Length of random string
 * @param charset - Character set to use (default: alphanumeric)
 * @returns Random string
 * @example
 * randomString(10) // "aB3xYz78pQ"
 */
export const randomString = (length = 10, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') => {
    let result = '';
    const charsetLength = charset.length;
    for (let i = 0; i < length; i++) {
        result += charset.charAt(Math.floor(Math.random() * charsetLength));
    }
    return result;
};
/**
 * Counts occurrences of substring in string
 * @param str - The string to search
 * @param search - The substring to count
 * @param caseSensitive - Whether search is case-sensitive (default: true)
 * @returns Number of occurrences
 * @example
 * countOccurrences("hello hello", "lo") // 2
 */
export const countOccurrences = (str, search, caseSensitive = true) => {
    if (!search)
        return 0;
    const source = caseSensitive ? str : str.toLowerCase();
    const target = caseSensitive ? search : search.toLowerCase();
    let count = 0;
    let position = 0;
    while ((position = source.indexOf(target, position)) !== -1) {
        count++;
        position += target.length;
    }
    return count;
};
/**
 * Removes all whitespace from string
 * @param str - The string to process
 * @returns String without whitespace
 * @example
 * removeWhitespace("hello world") // "helloworld"
 */
export const removeWhitespace = (str) => {
    return str.replace(/\s+/g, '');
};
/**
 * Reverses a string
 * @param str - The string to reverse
 * @returns Reversed string
 * @example
 * reverse("hello") // "olleh"
 */
export const reverse = (str) => {
    return str.split('').reverse().join('');
};
/**
 * Checks if string is palindrome (reads same forwards and backwards)
 * @param str - The string to check
 * @param caseSensitive - Whether comparison is case-sensitive (default: false)
 * @returns True if string is palindrome
 * @example
 * isPalindrome("racecar") // true
 */
export const isPalindrome = (str, caseSensitive = false) => {
    const normalized = caseSensitive ? str : str.toLowerCase();
    const cleaned = normalized.replace(/[^a-z0-9]/gi, '');
    return cleaned === reverse(cleaned);
};
/**
 * Generates slug from string (URL-friendly)
 * @param str - The string to convert
 * @returns URL-friendly slug
 * @example
 * slugify("Hello World!") // "hello-world"
 */
export const slugify = (str) => {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};
/**
 * Masks part of a string (e.g., for hiding sensitive data)
 * @param str - The string to mask
 * @param visibleStart - Number of characters to keep at start
 * @param visibleEnd - Number of characters to keep at end
 * @param maskChar - Character to use for masking (default: "*")
 * @returns Masked string
 * @example
 * mask("1234567890", 3, 2) // "123*****90"
 */
export const mask = (str, visibleStart = 0, visibleEnd = 0, maskChar = '*') => {
    if (visibleStart + visibleEnd >= str.length) {
        return str;
    }
    const start = str.slice(0, visibleStart);
    const end = visibleEnd > 0 ? str.slice(-visibleEnd) : '';
    const middle = maskChar.repeat(str.length - visibleStart - visibleEnd);
    return start + middle + end;
};
/**
 * Generates initials from name
 * @param name - The full name
 * @param maxInitials - Maximum number of initials (default: 2)
 * @returns Initials string
 * @example
 * getInitials("John Doe") // "JD"
 */
export const getInitials = (name, maxInitials = 2) => {
    return name
        .split(/\s+/)
        .slice(0, maxInitials)
        .map((word) => word.charAt(0).toUpperCase())
        .join('');
};
/**
 * Normalizes line endings to LF (Unix-style)
 * @param str - The string to normalize
 * @returns String with normalized line endings
 * @example
 * normalizeLineEndings("hello\r\nworld") // "hello\nworld"
 */
export const normalizeLineEndings = (str) => {
    return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};
/**
 * Wraps text to specified line length
 * @param text - The text to wrap
 * @param lineLength - Maximum line length
 * @returns Array of wrapped lines
 * @example
 * wordWrap("Hello world, this is a test.", 10)
 * // ["Hello", "world, this", "is a test."]
 */
export const wordWrap = (text, lineLength = 80) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    for (const word of words) {
        const len = currentLine.length + word.length + 1;
        if (currentLine.length + word.length <= lineLength) {
            currentLine += (currentLine ? ' ' : '') + word;
        }
        else {
            if (currentLine) {
                lines.push(currentLine);
            }
            currentLine = word;
        }
    }
    if (currentLine) {
        lines.push(currentLine);
    }
    return lines;
};
/**
 * Type guard for string values
 * @param value - Value to check
 * @returns True if value is a string
 */
export const isString = (value) => {
    return typeof value === 'string';
};
/**
 * Safely converts any value to string
 * @param value - Value to convert
 * @param fallback - Fallback value if conversion fails (default: "")
 * @returns String representation or fallback
 */
export const toString = (value, fallback) => {
    if (value == null) {
        return fallback !== undefined ? fallback : '';
    }
    const v = value;
    if (Array.isArray(v)) {
        if (v.length === 0) {
            return fallback !== undefined ? fallback : '';
        }
    }
    else {
        if (typeof v === 'object' && Object.keys(v).length === 0) {
            return fallback !== undefined ? fallback : '';
        }
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    try {
        return String(value);
    }
    catch {
        return fallback !== undefined ? fallback : '';
    }
};
/**
 * Escapes regex special characters in a string
 * @param str - The string to escape
 * @param escape - Whether to escape the string (default: true)
 * @returns Escaped string or original if escape is false or string is in exclude list
 * @example
 * escapeString("test[123]") // "test\\[123\\]"
 * escapeString("&nbsp;", true) // "&nbsp;" (not escaped due to exclude list)
 */
export const escapeString = (str, escape = true) => {
    // Fast path: return early if escaping is disabled
    if (!escape) {
        return str;
    }
    // Use a Set for O(1) lookup instead of O(n) array search
    const exclude = new Set(['&nbsp;', '\xa0', '\xa0\xa0', '_space_']);
    // Check if string should be excluded from escaping
    if (exclude.has(str)) {
        return str;
    }
    // Optimized regex: escape only regex special characters
    // Note: Only characters that have special meaning in regex need escaping
    const regexSpecialChars = /[.*+?^${}()|[\]\\]/g;
    // Use replace with a function to handle the replacement
    return str.replace(regexSpecialChars, '\\$&');
};
/**
 * Replaces a substring by index position
 * @param {string} original - Original string
 * @param {number} startIndex - Start index (inclusive)
 * @param {number} endIndex - End index (exclusive)
 * @param {string} replacement - Replacement string
 * @returns {string} Modified string
 */
function replaceStringByIndex(original, startIndex, endIndex, replacement) {
    if (startIndex < 0 || startIndex > original.length) {
        throw new Error('Start index out of bounds');
    }
    if (endIndex < startIndex || endIndex > original.length) {
        throw new Error('End index out of bounds');
    }
    const before = original.substring(0, startIndex);
    const after = original.substring(endIndex);
    return before + replacement + after;
}
/**
 * Replaces a substring at the beginning or end of a string
 * @param originalString - The original string to modify
 * @param valueToReplace - The substring to replace
 * @param position - Position to replace: "start", "end", or "both" (default: "start")
 * @param newValue - The replacement value (default: "")
 * @returns Modified string or original if replacement not applicable
 * @example
 * replaceString("hello world", "hello", "start") // " world"
 * replaceString("hello world", "world", "end") // "hello "
 * replaceString("test.test", ".", "both", "-") // "test-test"
 */
export const replaceString = (originalString, valueToReplace, position = 'start', newValue = '') => {
    // Validate inputs
    if (!originalString ||
        !valueToReplace ||
        valueToReplace.length === 0 ||
        originalString.length < valueToReplace.length) {
        return originalString;
    }
    // Handle both positions case
    if (position === 'both') {
        let result = originalString;
        // Replace from start if applicable
        if (result.startsWith(valueToReplace)) {
            result = replaceStringByIndex(result, 0, valueToReplace.length, newValue);
            // result = result.substring(valueToReplace.length);
        }
        // Replace from end if applicable
        if (result.endsWith(valueToReplace)) {
            result = replaceStringByIndex(result, result.length - valueToReplace.length, result.length, newValue);
            // result = result.substring(0, result.length - valueToReplace.length);
        }
        // return result.length < originalString.length
        //   ? newValue + result + newValue
        //   : result;
        return result;
    }
    // Handle start or end position
    const shouldReplace = (position === 'start' && originalString.startsWith(valueToReplace)) ||
        (position === 'end' && originalString.endsWith(valueToReplace));
    if (!shouldReplace) {
        return originalString;
    }
    if (position === 'start') {
        return newValue + originalString.substring(valueToReplace.length);
    }
    else {
        return (originalString.substring(0, originalString.length - valueToReplace.length) + newValue);
    }
};
/**
 * Alternative version with regex for more complex patterns
 * Replaces a pattern at start/end using regex for more control
 * @param originalString - The original string to modify
 * @param pattern - Regex pattern or string to match
 * @param position - Position to replace: "start", "end", or "both"
 * @param newValue - The replacement value
 * @param useRegex - Whether pattern is a regex pattern
 * @returns Modified string
 */
export const replaceStringPattern = (originalString, options) => {
    let { pattern, position, newValue, useRegex = false, flags } = { ...options };
    if (!originalString) {
        return originalString;
    }
    if (!newValue) {
        newValue = '';
    }
    let regex;
    const isStart = typeof position === 'undefined' || position === 'start';
    if (useRegex && pattern instanceof RegExp) {
        regex = pattern;
        const regex_string = regex.source;
        if (position) {
            if (position === 'start') {
                pattern = `^${regex_string}`;
            }
            else if (position === 'end') {
                pattern = `${regex_string}$`;
            }
            else {
                pattern = `^${regex_string}|${regex_string}$`;
            }
            pattern = new RegExp(pattern, flags);
        }
    }
    else if (useRegex) {
        if (position) {
            if (position === 'start') {
                pattern = `^${pattern}`;
            }
            else if (position === 'end') {
                pattern = `${pattern}$`;
            }
            else if (position === 'both') {
                pattern = `^${pattern}|${pattern}$`;
            }
        }
        regex = new RegExp(pattern, flags);
    }
    else {
        const escapedPattern = pattern;
        regex = new RegExp(isStart
            ? `^${escapedPattern}`
            : position === 'end'
                ? `${escapedPattern}$`
                : position === 'both'
                    ? `^${escapedPattern}|${escapedPattern}$`
                    : `${escapedPattern}`, flags || 'g');
    }
    return originalString.replace(regex, newValue);
};
/**
 * Type for the parsed object in stringToObjectArray
 */
// type ParsedObject = Record<string, any> | string | number | boolean | null;
// /**
//  * Parses a string or string array into an array of objects or strings
//  * Supports JSON, delimited strings, and various formats
//  * @param input - The input string or array to parse
//  * @param options - Configuration options for parsing
//  * @returns Array of parsed objects or strings
//  * @example
//  * // Returns: [{value: "apple", label: "apple"}, {value: "banana", label: "banana"}]
//  * stringToObjectArray("apple|banana", {valueKey: "value", labelKey: "label"})
//  *
//  * // Returns: ["apple", "banana"]
//  * stringToObjectArray("apple,banana", {delimiters: [","]})
//  *
//  * // Returns: parsed JSON array
//  * stringToObjectArray('[{"id": 1, "name": "test"}]')
//  */
// export const stringToObjectArray = (
//   input: string | string[] | any[],
//   options: StringToObjectArrayOptions = {}
// ): ParsedObject[] => {
//   const {
//     delimiters = ['|'],
//     valueKey = 'value',
//     labelKey = 'label',
//     defaultObject = {},
//     trimItems = true,
//     filterEmpty = true,
//   } = options;
//   // Helper function to create object from string
//   const createObject = (item: string): Record<string, any> => {
//     const base = { ...defaultObject };
//     const trimmed = trimItems ? item.trim() : item;
//     // Only add value/label if they don't already exist in defaultObject
//     if (!(valueKey in base)) {
//       base[valueKey] = trimmed;
//     }
//     if (!(labelKey in base) && labelKey !== valueKey) {
//       base[labelKey] = trimmed;
//     }
//     return base;
//   };
//   // Handle array input
//   if (Array.isArray(input)) {
//     return input
//       .map((item): ParsedObject | null => {
//         if (item == null) return null;
//         if (typeof item === 'string') {
//           return valueKey ? createObject(item) : item;
//         }
//         if (typeof item === 'object') {
//           return item;
//         }
//         // Convert other types to string
//         return valueKey ? createObject(String(item)) : String(item);
//       })
//       .filter((item): item is ParsedObject => {
//         if (item == null) return false;
//         if (filterEmpty && typeof item === 'string' && item.trim() === '')
//           return false;
//         if (
//           filterEmpty &&
//           typeof item === 'object' &&
//           valueKey in item &&
//           item[valueKey]?.trim() === ''
//         )
//           return false;
//         return true;
//       });
//   }
//   // Handle string input
//   if (typeof input !== 'string') {
//     return [];
//   }
//   const str = input.trim();
//   // Return empty array for empty string
//   if (str === '') {
//     return [];
//   }
//   // Try to parse as JSON first
//   if (
//     (str.startsWith('[') && str.endsWith(']')) ||
//     (str.startsWith('{') && str.endsWith('}'))
//   ) {
//     try {
//       const parsed = JSON.parse(str);
//       if (Array.isArray(parsed)) {
//         return parsed.map((item): ParsedObject => {
//           if (typeof item === 'string' && valueKey) {
//             return createObject(item);
//           }
//           if (typeof item === 'object' && item !== null) {
//             return { ...defaultObject, ...item };
//           }
//           return valueKey ? createObject(String(item)) : String(item);
//         });
//       }
//       // Single object
//       return [{ ...defaultObject, ...parsed }];
//     } catch {
//       // Not valid JSON, continue with other methods
//     }
//   }
//   // Try to parse as array literal (handles cases like "[a, b, c]")
//   const literalResult = parseArrayLiteral(str);
//   if (Array.isArray(literalResult)) {
//     return literalResult.map((item) =>
//       valueKey ? createObject(String(item)) : String(item)
//     );
//   }
//   // Try each delimiter
//   for (const delimiter of delimiters) {
//     if (str.includes(delimiter)) {
//       const parts = str.split(delimiter);
//       const items = trimItems ? parts.map((part) => part.trim()) : parts;
//       return items
//         .filter((item) => !filterEmpty || item !== '')
//         .map((item) => (valueKey ? createObject(item) : item));
//     }
//   }
//   // Single value
//   return valueKey ? [createObject(str)] : [str];
// };
/**
 * Parses a string representation of an array literal
 * Supports formats like: [a, b, c], ["a", "b"], ['a', 'b']
 * @param str - The string to parse
 * @returns Array of strings if successful, original string otherwise
 * @example
 * parseArrayLiteral("[apple, banana, cherry]") // ["apple", "banana", "cherry"]
 * parseArrayLiteral('["apple", "banana"]') // ["apple", "banana"]
 */
export const parseArrayLiteral = (str) => {
    // Early return if not an array literal
    if (!str.startsWith('[') || !str.endsWith(']')) {
        return str;
    }
    const innerStr = str.slice(1, -1).trim();
    // Handle empty array
    if (innerStr === '') {
        return [];
    }
    // Try JSON parse first for quoted strings
    try {
        // Wrap in brackets and parse as JSON
        const jsonStr = `[${innerStr}]`;
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
            // return parsed.map(String);
            return parsed;
        }
    }
    catch {
        // Not valid JSON, continue with manual parsing
    }
    // Manual parsing for unquoted strings
    const items = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    let escaped = false;
    let depth = 0; // Handle nested brackets
    for (let i = 0; i < innerStr.length; i++) {
        const char = innerStr[i];
        // Handle escaping
        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }
        // Check for escape character
        if (char === '\\' && inQuotes) {
            escaped = true;
            continue;
        }
        // Handle quotes
        if ((char === '"' || char === "'") && !inQuotes) {
            inQuotes = true;
            quoteChar = char;
        }
        else if (char === quoteChar && inQuotes) {
            inQuotes = false;
            quoteChar = '';
        }
        // Handle nested brackets
        else if (char === '[' && !inQuotes) {
            depth++;
            current += char;
        }
        else if (char === ']' && !inQuotes) {
            depth--;
            current += char;
        }
        // Handle comma as delimiter (only when not in quotes and not in nested brackets)
        else if (char === ',' && !inQuotes && depth === 0) {
            items.push(current.trim());
            current = '';
        }
        else {
            current += char;
        }
    }
    // Add the last item
    if (current.trim()) {
        items.push(current.trim());
    }
    // Clean up items: remove surrounding quotes
    return items.map((item) => {
        const trimmed = item.trim();
        // Remove surrounding quotes if present
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            return trimmed.slice(1, -1);
        }
        return trimmed;
    });
};
/**
 * Enhanced version that handles both array literals and object literals
 * @param str - The string to parse
 * @returns Parsed array, object, or original string
 */
export const parseLiteral = (str) => {
    const trimmed = str.trim();
    // Try to parse as array literal
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const result = parseArrayLiteral(trimmed);
        return Array.isArray(result) ? result : trimmed;
    }
    // Try to parse as object literal
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
            return JSON.parse(trimmed);
        }
        catch {
            // Try to fix common issues
            const p = parseJsObjectLiteral(trimmed);
            if (p !== undefined) {
                return p;
            }
            const fixed = trimmed
                .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3') // Add quotes to unquoted keys
                .replace(/:\s*'([^']*)'/g, ':"$1"'); // Convert single quotes to double quotes
            try {
                return JSON.parse(fixed);
            }
            catch {
                return trimmed;
            }
        }
    }
    // Try to parse as JSON (might be a number, boolean, or null)
    try {
        return JSON.parse(trimmed);
    }
    catch {
        return trimmed;
    }
};
/**
 * Type guard to check if a value is a string array
 * @param value - Value to check
 * @returns True if value is a string array
 */
export const isStringArray = (value) => {
    return (Array.isArray(value) && value.every((item) => typeof item === 'string'));
};
/**
 * Parses a string or string array into an array of objects or primitive values
 * Supports JSON, delimited strings, and various formats
 * @param input - The input string or array to parse
 * @param options - Configuration options for parsing
 * @returns Array of parsed objects or primitive values
 * @example
 * // Returns primitive array: ["apple", "banana"]
 * stringToObjectArray("apple|banana")
 *
 * // Returns object array: [{value: "apple", label: "apple"}, {value: "banana", label: "banana"}]
 * stringToObjectArray("apple|banana", {valueKey: "value", labelKey: "label"})
 *
 * // Returns object array with defaults: [{id: "apple", name: "apple", type: "fruit"}, ...]
 * stringToObjectArray("apple|banana", {valueKey: "id", labelKey: "name", defaultObject: {type: "fruit"}})
 *
 * // Returns parsed primitives: [1, 2, 3]
 * stringToObjectArray("1|2|3", {parsePrimitives: true})
 */
export const stringToObjectArray = (input, options = {}) => {
    const { delimiters = ['|'], valueKey, labelKey, defaultObject, trimItems = true, filterEmpty = true, returnObjects, parsePrimitives = false, preserveNullUndefined = false, } = options;
    // Auto-detect if we should return objects
    // Return objects if: returnObjects is true OR valueKey/labelKey/defaultObject is provided
    const shouldReturnObjects = returnObjects ??
        (valueKey !== undefined ||
            labelKey !== undefined ||
            defaultObject !== undefined);
    // Helper function to create object from string
    const createObject = (item) => {
        const base = defaultObject ? { ...defaultObject } : {};
        const trimmed = trimItems ? item.trim() : item;
        // Only add value if valueKey is provided
        if (valueKey !== undefined) {
            base[valueKey] = parsePrimitives ? parsePrimitiveValue(trimmed) : trimmed;
        }
        if (valueKey !== labelKey ||
            (valueKey === undefined && labelKey === undefined)) {
            // Only add label if labelKey is provided and different from valueKey
            let label;
            if (valueKey === undefined && labelKey === undefined) {
                label = returnObjects ? 'label' : valueKey;
            }
            else {
                label = labelKey;
            }
            if (label !== undefined) {
                base[label] = trimmed;
            }
        }
        return base;
    };
    // Helper function to parse primitive value
    const parsePrimitiveValue = (str) => {
        const trimmed = str.trim();
        if (trimmed === '') {
            return preserveNullUndefined ? null : '';
        }
        // Parse null
        if (trimmed.toLowerCase() === 'null') {
            return preserveNullUndefined ? null : 'null';
        }
        // Parse undefined
        if (trimmed.toLowerCase() === 'undefined') {
            return preserveNullUndefined ? null : 'undefined';
        }
        // Parse boolean
        if (trimmed.toLowerCase() === 'true')
            return true;
        if (trimmed.toLowerCase() === 'false')
            return false;
        // Parse number (integers and floats)
        if (/^-?\d+$/.test(trimmed)) {
            const num = parseInt(trimmed, 10);
            return isNaN(num) ? (trimItems ? trimmed : str) : num;
        }
        if (/^-?\d+\.\d+$/.test(trimmed)) {
            const num = parseFloat(trimmed);
            return isNaN(num) ? (trimItems ? trimmed : str) : num;
        }
        if (!trimItems)
            return str;
        // Return string as-is
        return trimmed;
    };
    // Helper function to process a single item
    const processItem = (item) => {
        // Handle null/undefined
        if (item == null) {
            return preserveNullUndefined ? item : null;
        }
        // Process string items
        if (typeof item === 'string') {
            const processed = trimItems ? item.trim() : item;
            if (item === 'null')
                return (preserveNullUndefined ? null : null);
            if (item === 'undefined')
                return (preserveNullUndefined ? undefined : 'undefined');
            if (item === '')
                return (preserveNullUndefined ? null : '');
            // Filter empty strings if needed
            if (filterEmpty && processed === '') {
                return preserveNullUndefined ? processed : null;
            }
            if (shouldReturnObjects) {
                return createObject(processed);
            }
            else {
                return (parsePrimitives ? parsePrimitiveValue(processed) : processed);
            }
        }
        // Process number/boolean
        if (typeof item === 'number' || typeof item === 'boolean') {
            if (shouldReturnObjects) {
                const base = defaultObject ? { ...defaultObject } : {};
                if (valueKey !== undefined)
                    base[valueKey] = item;
                if (labelKey !== undefined && labelKey !== valueKey)
                    base[labelKey] = String(item);
                return base;
            }
            else {
                return item;
            }
        }
        // Process existing objects
        if (typeof item === 'object' && !Array.isArray(item)) {
            if (shouldReturnObjects) {
                // Merge with defaultObject if provided
                return defaultObject
                    ? { ...defaultObject, ...item }
                    : item;
            }
            else {
                // Try to extract value from object
                if (valueKey && item[valueKey] !== undefined) {
                    return item[valueKey];
                }
                // Fallback to string representation
                return item;
            }
        }
        // Process arrays (convert to string)
        if (Array.isArray(item)) {
            const str = JSON.stringify(item);
            if (shouldReturnObjects) {
                return createObject(str);
            }
            else {
                return str;
            }
        }
        // Default: convert to string
        const str = String(item);
        if (shouldReturnObjects) {
            return createObject(str);
        }
        else {
            return str;
        }
    };
    // Handle array input
    if (Array.isArray(input)) {
        const result = input.map(processItem);
        if (preserveNullUndefined) {
            return result;
        }
        return result.filter((item) => item !== null);
    }
    // Handle string input
    if (typeof input !== 'string') {
        // Try to convert to string
        if (input == null)
            return [];
        return processItem(String(input))
            ? [processItem(String(input))]
            : [];
    }
    const str = input.trim();
    // Return empty array for empty string
    if (str === '') {
        return [];
    }
    // Try to parse as JSON first
    if ((str.startsWith('[') && str.endsWith(']')) ||
        (str.startsWith('{') && str.endsWith('}'))) {
        try {
            const parsed = JSON.parse(str);
            if (Array.isArray(parsed)) {
                const result = parsed.map(processItem);
                if (preserveNullUndefined) {
                    return result;
                }
                return result.filter((item) => item !== null);
            }
            // Single object or value
            const processed = processItem(parsed);
            return processed ? [processed] : [];
        }
        catch {
            // Not valid JSON, continue with other methods
        }
    }
    // Try to parse as array literal (handles cases like "[a, b, c]")
    const literalResult = parseArrayLiteral(str);
    if (Array.isArray(literalResult)) {
        const result = literalResult.map((item) => {
            const processed = processItem(item);
            return processed;
        });
        if (preserveNullUndefined) {
            return result;
        }
        return result.filter((item) => item !== null);
    }
    // Try each delimiter
    for (const delimiter of delimiters) {
        if (str.includes(delimiter)) {
            const parts = (trimItems ? str : input).split(delimiter);
            const result = parts.map((part) => processItem(part));
            if (preserveNullUndefined) {
                return result;
            }
            return result.filter((item) => item !== null && (!filterEmpty || item !== ''));
        }
    }
    // Single value
    const processed = processItem(str);
    return processed ? [processed] : [];
};
/**
 * Simplified version that always returns primitive values
 * @param input - The input string or array to parse
 * @param options - Configuration options (delimiters, trim, etc.)
 * @returns Array of primitive values
 * @example
 * stringToPrimitiveArray("apple|banana") // ["apple", "banana"]
 * stringToPrimitiveArray("1,2,3", {delimiters: [","], parsePrimitives: true}) // [1, 2, 3]
 */
export const stringToPrimitiveArray = (input, options = {}) => {
    return stringToObjectArray(input, {
        ...options,
        returnObjects: false,
    });
};
/**
 * Simplified version that always returns objects
 * @param input - The input string or array to parse
 * @param options - Configuration options including valueKey, labelKey, etc.
 * @returns Array of objects
 * @example
 * stringToObjectArray("apple|banana", {valueKey: "id"}) // [{id: "apple"}, {id: "banana"}]
 */
export const stringToObjectArrayOnly = (input, options = {}) => {
    return stringToObjectArray(input, {
        ...options,
        returnObjects: true,
    });
};
/**
 * Type guard to check if parsed result is primitive array
 */
export const isPrimitiveArray = (arr) => {
    return arr.every((item) => item == null ||
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'boolean');
};
// Helper function used internally
export const parsePrimitiveValue = (str) => {
    const trimmed = str.trim();
    if (trimmed === '')
        return null;
    if (trimmed.toLowerCase() === 'null')
        return null;
    if (trimmed.toLowerCase() === 'undefined')
        return undefined;
    if (trimmed.toLowerCase() === 'true')
        return true;
    if (trimmed.toLowerCase() === 'false')
        return false;
    // Try integer
    if (/^-?\d+$/.test(trimmed)) {
        const num = parseInt(trimmed, 10);
        return isNaN(num) ? trimmed : num;
    }
    // Try float
    if (/^-?\d+\.\d+$/.test(trimmed)) {
        const num = parseFloat(trimmed);
        return isNaN(num) ? trimmed : num;
    }
    // Try scientific notation
    if (/^-?\d+(?:\.\d+)?[eE][+-]?\d+$/.test(trimmed)) {
        const num = parseFloat(trimmed);
        return isNaN(num) ? trimmed : num;
    }
    return trimmed;
};
// Export all utilities
export default {
    trim,
    trimStart,
    trimEnd,
    toCamelCase,
    toPascalCase,
    toKebabCase,
    toSnakeCase,
    capitalize,
    toTitleCase,
    startsWith,
    endsWith,
    includes,
    includesIgnoreCase,
    replaceStringByIndex,
    replaceAll,
    replaceAllIgnoreCase,
    escapeRegExp,
    escapeHtml,
    unescapeHtml,
    truncate,
    pad,
    isEmpty,
    isValidEmail,
    isValidUrl,
    extractDomain,
    randomString,
    countOccurrences,
    removeWhitespace,
    reverse,
    isPalindrome,
    slugify,
    mask,
    getInitials,
    normalizeLineEndings,
    wordWrap,
    isString,
    toString,
    escapeString,
    replaceString,
    replaceStringPattern,
    stringToObjectArray,
    parseArrayLiteral,
    parseLiteral,
    isStringArray,
    stringToPrimitiveArray,
    stringToObjectArrayOnly,
    isPrimitiveArray,
    parsePrimitiveValue,
};
