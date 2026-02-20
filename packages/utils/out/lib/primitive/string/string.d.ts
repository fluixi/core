/**
 * String utilities collection for TypeScript
 * Provides optimized methods for common string operations
 */
/**
 * Trims whitespace from both ends of a string with high performance
 * @param str - The string to trim
 * @returns Trimmed string
 * @example
 * trim("  hello  ") // "hello"
 */
export declare const trim: (str: string) => string;
/**
 * Trims whitespace from the start of a string
 * @param str - The string to trim
 * @returns Left-trimmed string
 * @example
 * trimStart("  hello") // "hello"
 */
export declare const trimStart: (str: string) => string;
/**
 * Trims whitespace from the end of a string
 * @param str - The string to trim
 * @returns Right-trimmed string
 * @example
 * trimEnd("hello  ") // "hello"
 */
export declare const trimEnd: (str: string) => string;
/**
 * Converts string to camelCase
 * @param str - The string to convert
 * @returns camelCase string
 * @example
 * toCamelCase("hello-world") // "helloWorld"
 */
export declare const toCamelCase: (str: string) => string;
/**
 * Converts string to PascalCase
 * @param str - The string to convert
 * @returns PascalCase string
 * @example
 * toPascalCase("hello-world") // "HelloWorld"
 */
export declare const toPascalCase: (str: string) => string;
/**
 * Converts string to kebab-case
 * @param str - The string to convert
 * @returns kebab-case string
 * @example
 * toKebabCase("helloWorld") // "hello-world"
 */
export declare const toKebabCase: (str: string) => string;
/**
 * Converts string to snake_case
 * @param str - The string to convert
 * @returns snake_case string
 * @example
 * toSnakeCase("helloWorld") // "hello_world"
 */
export declare const toSnakeCase: (str: string) => string;
/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns Capitalized string
 * @example
 * capitalize("hello") // "Hello"
 */
export declare const capitalize: (str: string) => string;
/**
 * Converts string to title case (each word capitalized)
 * @param str - The string to convert
 * @returns Title case string
 * @example
 * toTitleCase("hello world") // "Hello World"
 */
export declare const toTitleCase: (str: string) => string;
/**
 * Checks if string starts with a substring (case-sensitive)
 * @param str - The string to check
 * @param search - The substring to search for
 * @param position - Position to start searching (default: 0)
 * @returns True if string starts with search string
 * @example
 * startsWith("hello", "he") // true
 */
export declare const startsWith: (str: string, search: string, position?: number) => boolean;
/**
 * Checks if string ends with a substring (case-sensitive)
 * @param str - The string to check
 * @param search - The substring to search for
 * @param length - Length to use (default: str.length)
 * @returns True if string ends with search string
 * @example
 * endsWith("hello", "lo") // true
 */
export declare const endsWith: (str: string, search: string, length?: number) => boolean;
/**
 * Checks if string contains a substring (case-sensitive)
 * @param str - The string to check
 * @param search - The substring to search for
 * @returns True if string contains search string
 * @example
 * includes("hello", "ell") // true
 */
export declare const includes: (str: string, search: string) => boolean;
/**
 * Checks if string contains a substring (case-insensitive)
 * @param str - The string to check
 * @param search - The substring to search for
 * @returns True if string contains search string (case-insensitive)
 * @example
 * includesIgnoreCase("Hello", "hello") // true
 */
export declare const includesIgnoreCase: (str: string, search: string) => boolean;
/**
 * Replaces all occurrences of a substring (case-sensitive)
 * @param str - The string to process
 * @param search - The substring to replace
 * @param replacement - The replacement string
 * @returns String with all occurrences replaced
 * @example
 * replaceAll("hello world", "l", "x") // "hexxo worxd"
 */
export declare const replaceAll: (str: string, search: string, replacement: string) => string;
/**
 * Replaces all occurrences of a substring (case-insensitive)
 * @param str - The string to process
 * @param search - The substring to replace
 * @param replacement - The replacement string
 * @returns String with all occurrences replaced (case-insensitive)
 * @example
 * replaceAllIgnoreCase("Hello World", "hello", "Hi") // "Hi World"
 */
export declare const replaceAllIgnoreCase: (str: string, search: string, replacement: string) => string;
/**
 * Escapes regex special characters in a string
 * @param str - The string to escape
 * @returns Escaped string safe for use in regex
 * @example
 * escapeRegExp(".*+?^${}()|[]\\") // "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\"
 */
export declare const escapeRegExp: (str: string) => string;
/**
 * Escapes HTML special characters
 * @param str - The string to escape
 * @returns HTML-escaped string
 * @example
 * escapeHtml("<div>") // "&lt;div&gt;"
 */
export declare const escapeHtml: (str: string) => string;
/**
 * Unescapes HTML entities
 * @param str - The string to unescape
 * @returns Unescaped string
 * @example
 * unescapeHtml("&lt;div&gt;") // "<div>"
 */
export declare const unescapeHtml: (str: string) => string;
/**
 * Truncates string to specified length with ellipsis
 * @param str - The string to truncate
 * @param length - Maximum length
 * @param ellipsis - Ellipsis string (default: "...")
 * @returns Truncated string
 * @example
 * truncate("Hello world", 8) // "Hello..."
 */
export declare const truncate: (str: string, length: number, ellipsis?: string) => string;
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
export declare const pad: (str: string, length: number, padChar?: string, side?: "start" | "end" | "both") => string;
/**
 * Checks if string is empty or whitespace only
 * @param str - The string to check
 * @returns True if string is empty or whitespace only
 * @example
 * isEmpty("   ") // true
 * isEmpty("hello") // false
 */
export declare const isEmpty: (str: string) => boolean;
/**
 * Checks if string is a valid email address
 * @param email - The email string to validate
 * @returns True if string is a valid email
 * @example
 * isValidEmail("test@example.com") // true
 */
export declare const isValidEmail: (email: string) => boolean;
/**
 * Checks if string is a valid URL
 * @param url - The URL string to validate
 * @returns True if string is a valid URL
 * @example
 * isValidUrl("https://example.com") // true
 */
export declare const isValidUrl: (url: string) => boolean;
/**
 * Extracts domain from URL
 * @param url - The URL string
 * @returns Domain name or empty string
 * @example
 * extractDomain("https://www.example.com/path") // "example.com"
 */
export declare const extractDomain: (url: string) => string;
/**
 * Generates a random string of specified length
 * @param length - Length of random string
 * @param charset - Character set to use (default: alphanumeric)
 * @returns Random string
 * @example
 * randomString(10) // "aB3xYz78pQ"
 */
export declare const randomString: (length?: number, charset?: string) => string;
/**
 * Counts occurrences of substring in string
 * @param str - The string to search
 * @param search - The substring to count
 * @param caseSensitive - Whether search is case-sensitive (default: true)
 * @returns Number of occurrences
 * @example
 * countOccurrences("hello hello", "lo") // 2
 */
export declare const countOccurrences: (str: string, search: string, caseSensitive?: boolean) => number;
/**
 * Removes all whitespace from string
 * @param str - The string to process
 * @returns String without whitespace
 * @example
 * removeWhitespace("hello world") // "helloworld"
 */
export declare const removeWhitespace: (str: string) => string;
/**
 * Reverses a string
 * @param str - The string to reverse
 * @returns Reversed string
 * @example
 * reverse("hello") // "olleh"
 */
export declare const reverse: (str: string) => string;
/**
 * Checks if string is palindrome (reads same forwards and backwards)
 * @param str - The string to check
 * @param caseSensitive - Whether comparison is case-sensitive (default: false)
 * @returns True if string is palindrome
 * @example
 * isPalindrome("racecar") // true
 */
export declare const isPalindrome: (str: string, caseSensitive?: boolean) => boolean;
/**
 * Generates slug from string (URL-friendly)
 * @param str - The string to convert
 * @returns URL-friendly slug
 * @example
 * slugify("Hello World!") // "hello-world"
 */
export declare const slugify: (str: string) => string;
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
export declare const mask: (str: string, visibleStart?: number, visibleEnd?: number, maskChar?: string) => string;
/**
 * Generates initials from name
 * @param name - The full name
 * @param maxInitials - Maximum number of initials (default: 2)
 * @returns Initials string
 * @example
 * getInitials("John Doe") // "JD"
 */
export declare const getInitials: (name: string, maxInitials?: number) => string;
/**
 * Normalizes line endings to LF (Unix-style)
 * @param str - The string to normalize
 * @returns String with normalized line endings
 * @example
 * normalizeLineEndings("hello\r\nworld") // "hello\nworld"
 */
export declare const normalizeLineEndings: (str: string) => string;
/**
 * Wraps text to specified line length
 * @param text - The text to wrap
 * @param lineLength - Maximum line length
 * @returns Array of wrapped lines
 * @example
 * wordWrap("Hello world, this is a test.", 10)
 * // ["Hello", "world, this", "is a test."]
 */
export declare const wordWrap: (text: string, lineLength?: number) => string[];
/**
 * Type guard for string values
 * @param value - Value to check
 * @returns True if value is a string
 */
export declare const isString: (value: unknown) => value is string;
/**
 * Safely converts any value to string
 * @param value - Value to convert
 * @param fallback - Fallback value if conversion fails (default: "")
 * @returns String representation or fallback
 */
export declare const toString: <T = string>(value: unknown, fallback?: T) => string | T;
/**
 * Escapes regex special characters in a string
 * @param str - The string to escape
 * @param escape - Whether to escape the string (default: true)
 * @returns Escaped string or original if escape is false or string is in exclude list
 * @example
 * escapeString("test[123]") // "test\\[123\\]"
 * escapeString("&nbsp;", true) // "&nbsp;" (not escaped due to exclude list)
 */
export declare const escapeString: (str: string, escape?: boolean) => string;
/**
 * Replaces a substring by index position
 * @param {string} original - Original string
 * @param {number} startIndex - Start index (inclusive)
 * @param {number} endIndex - End index (exclusive)
 * @param {string} replacement - Replacement string
 * @returns {string} Modified string
 */
declare function replaceStringByIndex(original: string, startIndex: number, endIndex: number, replacement: string): string;
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
export declare const replaceString: (originalString: string, valueToReplace: string, position?: "start" | "end" | "both", newValue?: string) => string;
interface ReplaceString {
    pattern: string | RegExp;
    /**
     * Position to replace: "start", "end", or "both"
     * @default "start"
     */
    position?: 'start' | 'end' | 'both' | 'alone';
    newValue?: string;
    useRegex?: boolean;
    flags?: string;
}
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
export declare const replaceStringPattern: (originalString: string, options: ReplaceString) => string;
/**
 * Options for parsing strings to object arrays
 */
interface StringToObjectArrayOptions {
    /** Delimiters to split string (default: ["|"]) */
    delimiters?: string[];
    /** Key name for value when creating objects (default: "value") */
    valueKey?: string;
    /** Key name for label when creating objects (default: "label") */
    labelKey?: string;
    /** Default object properties to merge with each item */
    defaultObject?: Record<string, any>;
    /** Whether to trim whitespace from items (default: true) */
    trimItems?: boolean;
    /** Whether to filter out empty strings (default: true) */
    filterEmpty?: boolean;
}
/**
 * Type for the parsed object in stringToObjectArray
 */
/**
 * Parses a string representation of an array literal
 * Supports formats like: [a, b, c], ["a", "b"], ['a', 'b']
 * @param str - The string to parse
 * @returns Array of strings if successful, original string otherwise
 * @example
 * parseArrayLiteral("[apple, banana, cherry]") // ["apple", "banana", "cherry"]
 * parseArrayLiteral('["apple", "banana"]') // ["apple", "banana"]
 */
export declare const parseArrayLiteral: (str: string) => string[] | string;
/**
 * Enhanced version that handles both array literals and object literals
 * @param str - The string to parse
 * @returns Parsed array, object, or original string
 */
export declare const parseLiteral: (str: string) => any;
/**
 * Type guard to check if a value is a string array
 * @param value - Value to check
 * @returns True if value is a string array
 */
export declare const isStringArray: (value: any) => value is string[];
/**
 * Type for the parsed result in stringToObjectArray
 * Can be either primitive values or objects
 */
type ParsedResult<T extends boolean> = T extends true ? Record<string, any> : string | number | boolean | null;
/**
 * Options for parsing strings to arrays
 */
interface StringToObjectArrayOptions<T extends boolean = boolean> {
    /** Delimiters to split string (default: ["|"]) */
    delimiters?: string[];
    /** Key name for value when creating objects (default: "value") */
    valueKey?: string;
    /** Key name for label when creating objects (default: "label") */
    labelKey?: string;
    /** Default object properties to merge with each item */
    defaultObject?: Record<string, any>;
    /** Whether to trim whitespace from items (default: true) */
    trimItems?: boolean;
    /** Whether to filter out empty strings (default: true) */
    filterEmpty?: boolean;
    /** Whether to return objects (true) or primitive values (false) (default: auto-detected) */
    returnObjects?: T;
    /** Whether to attempt parsing numbers and booleans from strings (default: false) */
    parsePrimitives?: boolean;
    /** Whether to preserve null/undefined values (default: false) */
    preserveNullUndefined?: boolean;
}
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
export declare const stringToObjectArray: <T extends boolean = boolean>(input: string | string[] | any[], options?: StringToObjectArrayOptions<T>) => ParsedResult<T>[];
/**
 * Simplified version that always returns primitive values
 * @param input - The input string or array to parse
 * @param options - Configuration options (delimiters, trim, etc.)
 * @returns Array of primitive values
 * @example
 * stringToPrimitiveArray("apple|banana") // ["apple", "banana"]
 * stringToPrimitiveArray("1,2,3", {delimiters: [","], parsePrimitives: true}) // [1, 2, 3]
 */
export declare const stringToPrimitiveArray: (input: string | string[] | any[], options?: Omit<StringToObjectArrayOptions<false>, "valueKey" | "labelKey" | "defaultObject" | "returnObjects">) => Array<string | number | boolean | null>;
/**
 * Simplified version that always returns objects
 * @param input - The input string or array to parse
 * @param options - Configuration options including valueKey, labelKey, etc.
 * @returns Array of objects
 * @example
 * stringToObjectArray("apple|banana", {valueKey: "id"}) // [{id: "apple"}, {id: "banana"}]
 */
export declare const stringToObjectArrayOnly: (input: string | string[] | any[], options?: Omit<StringToObjectArrayOptions<true>, "returnObjects">) => Record<string, any>[];
/**
 * Type guard to check if parsed result is primitive array
 */
export declare const isPrimitiveArray: (arr: any[]) => arr is Array<string | number | boolean | null>;
export declare const parsePrimitiveValue: (str: string) => string | number | boolean | null | undefined;
declare const _default: {
    trim: (str: string) => string;
    trimStart: (str: string) => string;
    trimEnd: (str: string) => string;
    toCamelCase: (str: string) => string;
    toPascalCase: (str: string) => string;
    toKebabCase: (str: string) => string;
    toSnakeCase: (str: string) => string;
    capitalize: (str: string) => string;
    toTitleCase: (str: string) => string;
    startsWith: (str: string, search: string, position?: number) => boolean;
    endsWith: (str: string, search: string, length?: number) => boolean;
    includes: (str: string, search: string) => boolean;
    includesIgnoreCase: (str: string, search: string) => boolean;
    replaceStringByIndex: typeof replaceStringByIndex;
    replaceAll: (str: string, search: string, replacement: string) => string;
    replaceAllIgnoreCase: (str: string, search: string, replacement: string) => string;
    escapeRegExp: (str: string) => string;
    escapeHtml: (str: string) => string;
    unescapeHtml: (str: string) => string;
    truncate: (str: string, length: number, ellipsis?: string) => string;
    pad: (str: string, length: number, padChar?: string, side?: "start" | "end" | "both") => string;
    isEmpty: (str: string) => boolean;
    isValidEmail: (email: string) => boolean;
    isValidUrl: (url: string) => boolean;
    extractDomain: (url: string) => string;
    randomString: (length?: number, charset?: string) => string;
    countOccurrences: (str: string, search: string, caseSensitive?: boolean) => number;
    removeWhitespace: (str: string) => string;
    reverse: (str: string) => string;
    isPalindrome: (str: string, caseSensitive?: boolean) => boolean;
    slugify: (str: string) => string;
    mask: (str: string, visibleStart?: number, visibleEnd?: number, maskChar?: string) => string;
    getInitials: (name: string, maxInitials?: number) => string;
    normalizeLineEndings: (str: string) => string;
    wordWrap: (text: string, lineLength?: number) => string[];
    isString: (value: unknown) => value is string;
    toString: <T = string>(value: unknown, fallback?: T) => string | T;
    escapeString: (str: string, escape?: boolean) => string;
    replaceString: (originalString: string, valueToReplace: string, position?: "start" | "end" | "both", newValue?: string) => string;
    replaceStringPattern: (originalString: string, options: ReplaceString) => string;
    stringToObjectArray: <T extends boolean = boolean>(input: string | string[] | any[], options?: StringToObjectArrayOptions<T>) => ParsedResult<T>[];
    parseArrayLiteral: (str: string) => string[] | string;
    parseLiteral: (str: string) => any;
    isStringArray: (value: any) => value is string[];
    stringToPrimitiveArray: (input: string | string[] | any[], options?: Omit<StringToObjectArrayOptions<false>, "valueKey" | "labelKey" | "defaultObject" | "returnObjects">) => Array<string | number | boolean | null>;
    stringToObjectArrayOnly: (input: string | string[] | any[], options?: Omit<StringToObjectArrayOptions<true>, "returnObjects">) => Record<string, any>[];
    isPrimitiveArray: (arr: any[]) => arr is Array<string | number | boolean | null>;
    parsePrimitiveValue: (str: string) => string | number | boolean | null | undefined;
};
export default _default;
//# sourceMappingURL=string.d.ts.map