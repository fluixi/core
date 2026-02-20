import type { URL_PARSER } from './types.js';
export declare const url_parser: (url: string) => URL_PARSER | null;
/**
 * Parses a URL and returns its components
 * @param url - URL string to parse
 * @returns Parsed URL components or null if invalid
 * @example
 * parseUrl('https://example.com:8080/path?q=search#hash');
 * // { protocol: 'https:', hostname: 'example.com', port: '8080', ... }
 */
export declare function parseUrl(url: string): URL_PARSER | null;
/**
 * Checks if a string is a valid URL
 * @param url - String to validate
 * @returns True if valid URL
 * @example
 * isValidUrl('https://example.com'); // true
 * isValidUrl('not a url'); // false
 */
export declare function isValidUrl(url: string): boolean;
/**
 * Checks if a URL is absolute
 * @param url - URL string to check
 * @returns True if absolute URL
 * @example
 * isAbsoluteUrl('https://example.com/path'); // true
 * isAbsoluteUrl('/path'); // false
 */
export declare function isAbsoluteUrl(url: string): boolean;
/**
 * Checks if a URL is relative
 * @param url - URL string to check
 * @returns True if relative URL
 * @example
 * isRelativeUrl('/path'); // true
 * isRelativeUrl('https://example.com'); // false
 */
export declare function isRelativeUrl(url: string): boolean;
/**
 * Parses query string into an object
 * @param queryString - Query string (with or without leading ?)
 * @returns Object with parsed parameters
 * @example
 * parseQueryString('?name=John&age=30'); // { name: 'John', age: '30' }
 */
export declare function parseQueryString(queryString: string): Record<string, string>;
/**
 * Parses query string into an object with array support
 * @param queryString - Query string
 * @returns Object with parsed parameters (arrays for repeated keys)
 * @example
 * parseQueryStringAdvanced('?tags=js&tags=ts'); // { tags: ['js', 'ts'] }
 */
export declare function parseQueryStringAdvanced(queryString: string): Record<string, string | string[]>;
/**
 * Converts an object to a query string
 * @param params - Object with parameters
 * @param options - Serialization options
 * @returns Query string
 * @example
 * toQueryString({ name: 'John', age: 30 }); // 'name=John&age=30'
 */
export declare function toQueryString(params: Record<string, any>, options?: {
    encode?: boolean;
    arrayFormat?: 'brackets' | 'repeat';
}): string;
/**
 * Adds or updates query parameters in a URL
 * @param url - Base URL
 * @param params - Parameters to add/update
 * @returns URL with updated parameters
 * @example
 * addQueryParams('https://example.com', { q: 'search' });
 * // 'https://example.com?q=search'
 */
export declare function addQueryParams(url: string, params: Record<string, any>): string;
/**
 * Removes query parameters from a URL
 * @param url - URL to modify
 * @param keys - Parameter keys to remove
 * @returns URL without specified parameters
 * @example
 * removeQueryParams('https://example.com?a=1&b=2', 'a');
 * // 'https://example.com?b=2'
 */
export declare function removeQueryParams(url: string, ...keys: string[]): string;
/**
 * Gets a specific query parameter from a URL
 * @param url - URL to parse
 * @param key - Parameter key
 * @returns Parameter value or null
 * @example
 * getQueryParam('https://example.com?name=John', 'name'); // 'John'
 */
export declare function getQueryParam(url: string, key: string): string | null;
/**
 * Gets all values for a query parameter (for repeated parameters)
 * @param url - URL to parse
 * @param key - Parameter key
 * @returns Array of parameter values
 * @example
 * getQueryParams('https://example.com?tags=js&tags=ts', 'tags');
 * // ['js', 'ts']
 */
export declare function getQueryParams(url: string, key: string): string[];
/**
 * Builds a URL from components
 * @param components - URL components
 * @returns Built URL
 * @example
 * buildUrl({
 *   protocol: 'https',
 *   hostname: 'example.com',
 *   pathname: '/path',
 *   query: { q: 'search' }
 * }); // 'https://example.com/path?q=search'
 */
export declare function buildUrl(components: {
    protocol?: string;
    hostname: string;
    port?: string | number;
    pathname?: string;
    query?: Record<string, any>;
    hash?: string;
}): string;
/**
 * Joins URL paths, handling slashes correctly
 * @param base - Base URL or path
 * @param paths - Path segments to join
 * @returns Joined URL
 * @example
 * joinUrl('https://example.com', 'api', 'users', '123');
 * // 'https://example.com/api/users/123'
 */
export declare function joinUrl(base: string, ...paths: string[]): string;
/**
 * Normalizes a URL (removes default ports, trailing slashes, etc.)
 * @param url - URL to normalize
 * @param options - Normalization options
 * @returns Normalized URL
 * @example
 * normalizeUrl('https://example.com:443/path/'); // 'https://example.com/path'
 */
export declare function normalizeUrl(url: string, options?: {
    removeTrailingSlash?: boolean;
    removeDefaultPort?: boolean;
    sortQuery?: boolean;
}): string;
/**
 * Extracts the domain from a URL
 * @param url - URL to parse
 * @param options - Extraction options
 * @returns Domain name
 * @example
 * getDomain('https://subdomain.example.com/path'); // 'example.com'
 */
export declare function getDomain(url: string, options?: {
    includeSubdomain?: boolean;
}): string | null;
/**
 * Gets the file extension from a URL
 * @param url - URL to parse
 * @returns File extension (without dot) or null
 * @example
 * getUrlExtension('https://example.com/image.jpg'); // 'jpg'
 */
export declare function getUrlExtension(url: string): string | null;
/**
 * Checks if URLs are from the same origin
 * @param url1 - First URL
 * @param url2 - Second URL
 * @returns True if same origin
 * @example
 * isSameOrigin('https://example.com/a', 'https://example.com/b'); // true
 */
export declare function isSameOrigin(url1: string, url2: string): boolean;
/**
 * Converts a relative URL to absolute using a base URL
 * @param relativeUrl - Relative URL
 * @param baseUrl - Base URL
 * @returns Absolute URL
 * @example
 * toAbsoluteUrl('/path', 'https://example.com'); // 'https://example.com/path'
 */
export declare function toAbsoluteUrl(relativeUrl: string, baseUrl: string): string;
/**
 * Sanitizes a URL by removing dangerous protocols and characters
 * @param url - URL to sanitize
 * @returns Sanitized URL or null if dangerous
 * @example
 * sanitizeUrl('javascript:alert(1)'); // null
 * sanitizeUrl('https://example.com'); // 'https://example.com'
 */
export declare function sanitizeUrl(url: string): string | null;
/**
 * Extracts all URLs from a text string
 * @param text - Text to search
 * @param options - Extraction options
 * @returns Array of found URLs
 * @example
 * extractUrls('Check out https://example.com and http://test.com');
 * // ['https://example.com', 'http://test.com']
 */
export declare function extractUrls(text: string, options?: {
    unique?: boolean;
}): string[];
/**
 * Checks if a URL matches a pattern (with wildcard support)
 * @param url - URL to test
 * @param pattern - Pattern with wildcards (* and **)
 * @returns True if matches
 * @example
 * matchesUrlPattern('https://example.com/api/users/123', 'https://example.com/api/*'); // true
 */
export declare function matchesUrlPattern(url: string, pattern: string): boolean;
//# sourceMappingURL=parser.d.ts.map