import type { URL_PARSER } from './types.js';

export const url_parser = (url: string) => {
  try {
    const p = new URL(url);
    return {
      hash: p.hash,
      host: p.host,
      hostname: p.hostname,
      href: p.href,
      origin: p.origin,
      pathname: p.pathname,
      port: p.port,
      search: p.search,
      searchParams: p.searchParams.toString(),
      protocol: p.protocol,
    } as URL_PARSER;
  } catch (e) {
    return null;
  }
};

/**
 * Parses a URL and returns its components
 * @param url - URL string to parse
 * @returns Parsed URL components or null if invalid
 * @example
 * parseUrl('https://example.com:8080/path?q=search#hash');
 * // { protocol: 'https:', hostname: 'example.com', port: '8080', ... }
 */
export function parseUrl(url: string): URL_PARSER | null {
  return url_parser(url);
}

/**
 * Checks if a string is a valid URL
 * @param url - String to validate
 * @returns True if valid URL
 * @example
 * isValidUrl('https://example.com'); // true
 * isValidUrl('not a url'); // false
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a URL is absolute
 * @param url - URL string to check
 * @returns True if absolute URL
 * @example
 * isAbsoluteUrl('https://example.com/path'); // true
 * isAbsoluteUrl('/path'); // false
 */
export function isAbsoluteUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a URL is relative
 * @param url - URL string to check
 * @returns True if relative URL
 * @example
 * isRelativeUrl('/path'); // true
 * isRelativeUrl('https://example.com'); // false
 */
export function isRelativeUrl(url: string): boolean {
  return !isAbsoluteUrl(url);
}

/**
 * Parses query string into an object
 * @param queryString - Query string (with or without leading ?)
 * @returns Object with parsed parameters
 * @example
 * parseQueryString('?name=John&age=30'); // { name: 'John', age: '30' }
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(queryString);

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * Parses query string into an object with array support
 * @param queryString - Query string
 * @returns Object with parsed parameters (arrays for repeated keys)
 * @example
 * parseQueryStringAdvanced('?tags=js&tags=ts'); // { tags: ['js', 'ts'] }
 */
export function parseQueryStringAdvanced(
  queryString: string
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  const searchParams = new URLSearchParams(queryString);

  searchParams.forEach((value, key) => {
    if (params[key]) {
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  });

  return params;
}

/**
 * Converts an object to a query string
 * @param params - Object with parameters
 * @param options - Serialization options
 * @returns Query string
 * @example
 * toQueryString({ name: 'John', age: 30 }); // 'name=John&age=30'
 */
export function toQueryString(
  params: Record<string, any>,
  options: { encode?: boolean; arrayFormat?: 'brackets' | 'repeat' } = {}
): string {
  const { encode = true, arrayFormat = 'repeat' } = options;
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) return;

    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (arrayFormat === 'brackets') {
          searchParams.append(`${key}[]`, String(v));
        } else {
          searchParams.append(key, String(v));
        }
      });
    } else {
      searchParams.append(key, String(value));
    }
  });

  let result = searchParams.toString();
  if (!encode) {
    result = decodeURIComponent(result);
  }

  return result;
}

/**
 * Adds or updates query parameters in a URL
 * @param url - Base URL
 * @param params - Parameters to add/update
 * @returns URL with updated parameters
 * @example
 * addQueryParams('https://example.com', { q: 'search' });
 * // 'https://example.com?q=search'
 */
export function addQueryParams(
  url: string,
  params: Record<string, any>
): string {
  try {
    const urlObj = new URL(url);

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        urlObj.searchParams.delete(key);
      } else if (Array.isArray(value)) {
        urlObj.searchParams.delete(key);
        value.forEach((v) => urlObj.searchParams.append(key, String(v)));
      } else {
        urlObj.searchParams.set(key, String(value));
      }
    });

    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Removes query parameters from a URL
 * @param url - URL to modify
 * @param keys - Parameter keys to remove
 * @returns URL without specified parameters
 * @example
 * removeQueryParams('https://example.com?a=1&b=2', 'a');
 * // 'https://example.com?b=2'
 */
export function removeQueryParams(url: string, ...keys: string[]): string {
  try {
    const urlObj = new URL(url);
    keys.forEach((key) => urlObj.searchParams.delete(key));
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Gets a specific query parameter from a URL
 * @param url - URL to parse
 * @param key - Parameter key
 * @returns Parameter value or null
 * @example
 * getQueryParam('https://example.com?name=John', 'name'); // 'John'
 */
export function getQueryParam(url: string, key: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get(key);
  } catch {
    return null;
  }
}

/**
 * Gets all values for a query parameter (for repeated parameters)
 * @param url - URL to parse
 * @param key - Parameter key
 * @returns Array of parameter values
 * @example
 * getQueryParams('https://example.com?tags=js&tags=ts', 'tags');
 * // ['js', 'ts']
 */
export function getQueryParams(url: string, key: string): string[] {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.getAll(key);
  } catch {
    return [];
  }
}

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
export function buildUrl(components: {
  protocol?: string;
  hostname: string;
  port?: string | number;
  pathname?: string;
  query?: Record<string, any>;
  hash?: string;
}): string {
  const {
    protocol = 'https',
    hostname,
    port,
    pathname = '',
    query,
    hash,
  } = components;

  let url = `${protocol}://${hostname}`;

  if (port) {
    url += `:${port}`;
  }

  if (pathname) {
    url += pathname.startsWith('/') ? pathname : `/${pathname}`;
  }

  if (query && Object.keys(query).length > 0) {
    url += `?${toQueryString(query)}`;
  }

  if (hash) {
    url += hash.startsWith('#') ? hash : `#${hash}`;
  }

  return url;
}

/**
 * Joins URL paths, handling slashes correctly
 * @param base - Base URL or path
 * @param paths - Path segments to join
 * @returns Joined URL
 * @example
 * joinUrl('https://example.com', 'api', 'users', '123');
 * // 'https://example.com/api/users/123'
 */
export function joinUrl(base: string, ...paths: string[]): string {
  try {
    const url = new URL(base);
    // Get base pathname and filter out root slash if it's the only path
    const basePath = url.pathname === '/' ? '' : url.pathname;
    const pathParts = [basePath, ...paths]
      .filter(Boolean)
      .map((part) => part.replace(/^\/+|\/+$/g, ''));

    url.pathname = '/' + pathParts.filter(Boolean).join('/');
    return url.toString();
  } catch {
    // If not a valid URL, treat as path
    const parts = [base, ...paths]
      .filter(Boolean)
      .map((part) => part.replace(/^\/+|\/+$/g, ''));
    return '/' + parts.join('/');
  }
}

/**
 * Normalizes a URL (removes default ports, trailing slashes, etc.)
 * @param url - URL to normalize
 * @param options - Normalization options
 * @returns Normalized URL
 * @example
 * normalizeUrl('https://example.com:443/path/'); // 'https://example.com/path'
 */
export function normalizeUrl(
  url: string,
  options: {
    removeTrailingSlash?: boolean;
    removeDefaultPort?: boolean;
    sortQuery?: boolean;
  } = {}
): string {
  const {
    removeTrailingSlash = true,
    removeDefaultPort = true,
    sortQuery = false,
  } = options;

  try {
    const urlObj = new URL(url);

    if (removeDefaultPort) {
      if (
        (urlObj.protocol === 'http:' && urlObj.port === '80') ||
        (urlObj.protocol === 'https:' && urlObj.port === '443')
      ) {
        urlObj.port = '';
      }
    }

    // Remove trailing slash
    if (
      removeTrailingSlash &&
      urlObj.pathname.endsWith('/') &&
      urlObj.pathname !== '/'
    ) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }

    // Sort query parameters
    if (sortQuery) {
      const params = Array.from(urlObj.searchParams.entries());
      params.sort((a, b) => a[0].localeCompare(b[0]));
      urlObj.search = new URLSearchParams(params).toString();
    }

    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Extracts the domain from a URL
 * @param url - URL to parse
 * @param options - Extraction options
 * @returns Domain name
 * @example
 * getDomain('https://subdomain.example.com/path'); // 'example.com'
 */
export function getDomain(
  url: string,
  options: { includeSubdomain?: boolean } = {}
): string | null {
  const { includeSubdomain = false } = options;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (includeSubdomain) {
      return hostname;
    }

    // Extract root domain (simplified - doesn't handle all TLDs perfectly)
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }

    return hostname;
  } catch {
    return null;
  }
}

/**
 * Gets the file extension from a URL
 * @param url - URL to parse
 * @returns File extension (without dot) or null
 * @example
 * getUrlExtension('https://example.com/image.jpg'); // 'jpg'
 */
export function getUrlExtension(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const lastDot = pathname.lastIndexOf('.');
    const lastSlash = pathname.lastIndexOf('/');

    if (lastDot > lastSlash && lastDot < pathname.length - 1) {
      return pathname.slice(lastDot + 1);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Checks if URLs are from the same origin
 * @param url1 - First URL
 * @param url2 - Second URL
 * @returns True if same origin
 * @example
 * isSameOrigin('https://example.com/a', 'https://example.com/b'); // true
 */
export function isSameOrigin(url1: string, url2: string): boolean {
  try {
    const urlObj1 = new URL(url1);
    const urlObj2 = new URL(url2);
    return urlObj1.origin === urlObj2.origin;
  } catch {
    return false;
  }
}

/**
 * Converts a relative URL to absolute using a base URL
 * @param relativeUrl - Relative URL
 * @param baseUrl - Base URL
 * @returns Absolute URL
 * @example
 * toAbsoluteUrl('/path', 'https://example.com'); // 'https://example.com/path'
 */
export function toAbsoluteUrl(relativeUrl: string, baseUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).toString();
  } catch {
    return relativeUrl;
  }
}

/**
 * Sanitizes a URL by removing dangerous protocols and characters
 * @param url - URL to sanitize
 * @returns Sanitized URL or null if dangerous
 * @example
 * sanitizeUrl('javascript:alert(1)'); // null
 * sanitizeUrl('https://example.com'); // 'https://example.com'
 */
export function sanitizeUrl(url: string): string | null {
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];

  try {
    const urlObj = new URL(url);

    if (dangerousProtocols.some((proto) => urlObj.protocol === proto)) {
      return null;
    }

    // Return original URL to preserve format
    return url;
  } catch {
    // Check for protocol in string
    const lower = url.toLowerCase().trim();
    if (dangerousProtocols.some((proto) => lower.startsWith(proto))) {
      return null;
    }

    return url;
  }
}

/**
 * Extracts all URLs from a text string
 * @param text - Text to search
 * @param options - Extraction options
 * @returns Array of found URLs
 * @example
 * extractUrls('Check out https://example.com and http://test.com');
 * // ['https://example.com', 'http://test.com']
 */
export function extractUrls(
  text: string,
  options: { unique?: boolean } = {}
): string[] {
  const { unique = true } = options;

  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\]]+/gi;
  const matches = text.match(urlRegex) || [];

  return unique ? Array.from(new Set(matches)) : matches;
}

/**
 * Checks if a URL matches a pattern (with wildcard support)
 * @param url - URL to test
 * @param pattern - Pattern with wildcards (* and **)
 * @returns True if matches
 * @example
 * matchesUrlPattern('https://example.com/api/users/123', 'https://example.com/api/*'); // true
 */
export function matchesUrlPattern(url: string, pattern: string): boolean {
  try {
    const urlObj = new URL(url);
    const patternObj = new URL(pattern);

    // Check protocol
    if (
      patternObj.protocol !== '*:' &&
      urlObj.protocol !== patternObj.protocol
    ) {
      return false;
    }

    // Check hostname
    if (
      patternObj.hostname !== '*' &&
      urlObj.hostname !== patternObj.hostname
    ) {
      return false;
    }

    // Check pathname with wildcards
    const pathPattern = patternObj.pathname
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&');

    const pathRegex = new RegExp(`^${pathPattern}$`);
    return pathRegex.test(urlObj.pathname);
  } catch {
    return false;
  }
}
