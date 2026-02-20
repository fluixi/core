---
sidebar_position: 1
---

# URL Utilities

Comprehensive collection of URL manipulation utilities for parsing, building, validating, and transforming URLs with full TypeScript support.

## Overview

The URL utilities module provides over 25 powerful functions for working with URLs in modern JavaScript/TypeScript applications. All utilities are designed to handle edge cases gracefully and work seamlessly in both browser and Node.js environments.

## Key Features

- 🔍 **URL Parsing** - Parse URLs into components with detailed information
- ✅ **Validation** - Validate URLs, check absolute/relative, sanitize dangerous URLs
- 🔧 **Query String Manipulation** - Parse, build, add, remove query parameters
- 🏗️ **URL Building** - Construct URLs from components with proper encoding
- 🔄 **URL Transformation** - Normalize, join, convert relative to absolute
- 🛡️ **Security** - Sanitize URLs, detect dangerous protocols
- 📊 **Information Extraction** - Extract domains, extensions, origins
- 🎯 **Pattern Matching** - Match URLs against patterns with wildcards

## Installation

```typescript
import {
  parseUrl,
  buildUrl,
  addQueryParams,
  normalizeUrl,
  isValidUrl,
  // ... other utilities
} from '@awc/utils/url';
```

## Quick Start

### Parse a URL

Extract components from a URL string:

```typescript
import { parseUrl } from '@awc/utils/url';

const parsed = parseUrl('https://example.com:8080/api/users?page=1#section');

console.log(parsed);
// {
//   protocol: 'https:',
//   hostname: 'example.com',
//   port: '8080',
//   pathname: '/api/users',
//   search: '?page=1',
//   hash: '#section',
//   origin: 'https://example.com:8080',
//   href: 'https://example.com:8080/api/users?page=1#section'
// }
```

### Build a URL

Construct URLs from components:

```typescript
import { buildUrl } from '@awc/utils/url';

const url = buildUrl({
  protocol: 'https',
  hostname: 'api.example.com',
  pathname: '/v1/users',
  query: { 
    page: 1, 
    limit: 20,
    tags: ['javascript', 'typescript']
  },
  hash: 'results'
});

console.log(url);
// 'https://api.example.com/v1/users?page=1&limit=20&tags=javascript&tags=typescript#results'
```

### Manipulate Query Parameters

Add, update, or remove query parameters:

```typescript
import { addQueryParams, removeQueryParams } from '@awc/utils/url';

// Add or update parameters
const url1 = addQueryParams('https://example.com', { 
  search: 'typescript',
  page: 1 
});
// 'https://example.com/?search=typescript&page=1'

// Remove parameters
const url2 = removeQueryParams(url1, 'page');
// 'https://example.com/?search=typescript'
```

### Parse Query Strings

Extract query parameters:

```typescript
import { parseQueryString, parseQueryStringAdvanced } from '@awc/utils/url';

// Basic parsing
const params1 = parseQueryString('?name=John&age=30');
// { name: 'John', age: '30' }

// Advanced parsing with array support
const params2 = parseQueryStringAdvanced('?tags=js&tags=ts&tags=node');
// { tags: ['js', 'ts', 'node'] }
```

### Validate URLs

Check URL validity and format:

```typescript
import { isValidUrl, isAbsoluteUrl, isRelativeUrl } from '@awc/utils/url';

isValidUrl('https://example.com');        // true
isValidUrl('not a url');                  // false

isAbsoluteUrl('https://example.com');     // true
isAbsoluteUrl('/path/to/page');           // false

isRelativeUrl('/api/users');              // true
isRelativeUrl('https://example.com');     // false
```

### Normalize URLs

Clean and standardize URLs:

```typescript
import { normalizeUrl } from '@awc/utils/url';

// Remove trailing slashes, default ports
const normalized = normalizeUrl('https://example.com:443/path/');
// 'https://example.com/path'

// Sort query parameters
const sorted = normalizeUrl('https://example.com?z=1&a=2', {
  sortQuery: true
});
// 'https://example.com?a=2&z=1'
```

## Function Categories

### URL Parsing

- **`parseUrl`** - Parse URL into components
- **`url_parser`** - Legacy parser function
- **`extractUrls`** - Extract all URLs from text

### URL Validation

- **`isValidUrl`** - Check if string is valid URL
- **`isAbsoluteUrl`** - Check if URL is absolute
- **`isRelativeUrl`** - Check if URL is relative
- **`sanitizeUrl`** - Remove dangerous protocols

### Query String Operations

- **`parseQueryString`** - Parse query string to object
- **`parseQueryStringAdvanced`** - Parse with array support
- **`toQueryString`** - Convert object to query string
- **`addQueryParams`** - Add/update query parameters
- **`removeQueryParams`** - Remove query parameters
- **`getQueryParam`** - Get single parameter value
- **`getQueryParams`** - Get all values for parameter

### URL Building

- **`buildUrl`** - Build URL from components
- **`joinUrl`** - Join URL paths correctly
- **`toAbsoluteUrl`** - Convert relative to absolute

### URL Normalization

- **`normalizeUrl`** - Normalize URL format
- **`getDomain`** - Extract domain name
- **`getUrlExtension`** - Get file extension

### URL Comparison

- **`isSameOrigin`** - Check if URLs share origin
- **`matchesUrlPattern`** - Match against pattern

### Security

- **`sanitizeUrl`** - Remove dangerous URLs
- **`extractUrls`** - Safely extract URLs from text

## Common Use Cases

### API URL Builder

```typescript
import { buildUrl } from '@awc/utils/url';

class ApiClient {
  private baseUrl = 'https://api.example.com';

  buildEndpoint(path: string, params?: Record<string, any>) {
    return buildUrl({
      protocol: 'https',
      hostname: new URL(this.baseUrl).hostname,
      pathname: `/v1${path}`,
      query: params
    });
  }

  async getUsers(page: number, limit: number) {
    const url = this.buildEndpoint('/users', { page, limit });
    return fetch(url);
  }
}
```

### Query Parameter Manager

```typescript
import { addQueryParams, removeQueryParams, getQueryParam } from '@awc/utils/url';

class UrlManager {
  constructor(private url: string) {}

  setParam(key: string, value: any) {
    this.url = addQueryParams(this.url, { [key]: value });
    return this;
  }

  removeParam(key: string) {
    this.url = removeQueryParams(this.url, key);
    return this;
  }

  getParam(key: string) {
    return getQueryParam(this.url, key);
  }

  toString() {
    return this.url;
  }
}

// Usage
const manager = new UrlManager('https://example.com');
manager
  .setParam('page', 1)
  .setParam('search', 'typescript')
  .removeParam('utm_source');
```

### URL Sanitization for User Input

```typescript
import { sanitizeUrl, isValidUrl } from '@awc/utils/url';

function processUserUrl(input: string): string | null {
  // Validate first
  if (!isValidUrl(input)) {
    return null;
  }

  // Sanitize to remove dangerous protocols
  const sanitized = sanitizeUrl(input);
  
  if (!sanitized) {
    console.warn('Dangerous URL detected:', input);
    return null;
  }

  return sanitized;
}

// Safe usage
processUserUrl('https://example.com');          // 'https://example.com'
processUserUrl('javascript:alert(1)');          // null (dangerous)
```

### Link Extraction from Content

```typescript
import { extractUrls } from '@awc/utils/url';

function findLinksInContent(text: string) {
  const urls = extractUrls(text, { unique: true });
  
  return urls.map(url => ({
    url,
    domain: getDomain(url),
    safe: sanitizeUrl(url) !== null
  }));
}

const content = `
  Check out https://example.com and http://test.com.
  Also visit https://example.com again.
`;

const links = findLinksInContent(content);
// [
//   { url: 'https://example.com', domain: 'example.com', safe: true },
//   { url: 'http://test.com', domain: 'test.com', safe: true }
// ]
```

### URL Path Builder

```typescript
import { joinUrl } from '@awc/utils/url';

class ResourceUrlBuilder {
  constructor(private baseUrl: string) {}

  user(userId: string) {
    return joinUrl(this.baseUrl, 'users', userId);
  }

  userPosts(userId: string) {
    return joinUrl(this.baseUrl, 'users', userId, 'posts');
  }

  post(postId: string) {
    return joinUrl(this.baseUrl, 'posts', postId);
  }
}

const builder = new ResourceUrlBuilder('https://api.example.com/v1');
builder.user('123');           // 'https://api.example.com/v1/users/123'
builder.userPosts('123');      // 'https://api.example.com/v1/users/123/posts'
```

### URL Comparison and Origin Checking

```typescript
import { isSameOrigin, getDomain } from '@awc/utils/url';

function canMakeRequest(targetUrl: string): boolean {
  const currentOrigin = window.location.origin;
  const targetOrigin = new URL(targetUrl).origin;

  // Check if same origin
  if (isSameOrigin(currentOrigin, targetUrl)) {
    return true;
  }

  // Check if allowed domain
  const allowedDomains = ['api.example.com', 'cdn.example.com'];
  const targetDomain = getDomain(targetUrl);
  
  return allowedDomains.includes(targetDomain || '');
}
```

### URL Pattern Matching

```typescript
import { matchesUrlPattern } from '@awc/utils/url';

const patterns = [
  'https://example.com/api/*',
  'https://example.com/public/**',
  'https://*.example.com/assets/*'
];

function isAllowedUrl(url: string): boolean {
  return patterns.some(pattern => matchesUrlPattern(url, pattern));
}

isAllowedUrl('https://example.com/api/users');        // true
isAllowedUrl('https://example.com/public/docs/file'); // true
isAllowedUrl('https://cdn.example.com/assets/img');   // true
isAllowedUrl('https://other.com/api/data');           // false
```

## React Integration

### URL State Management Hook

```typescript
import { useSearchParams } from 'react-router-dom';
import { addQueryParams, removeQueryParams } from '@awc/utils/url';

function useUrlParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const setParam = (key: string, value: any) => {
    const currentUrl = window.location.href;
    const newUrl = addQueryParams(currentUrl, { [key]: value });
    const newParams = new URL(newUrl).searchParams;
    setSearchParams(newParams);
  };

  const removeParam = (key: string) => {
    const currentUrl = window.location.href;
    const newUrl = removeQueryParams(currentUrl, key);
    const newParams = new URL(newUrl).searchParams;
    setSearchParams(newParams);
  };

  return { setParam, removeParam };
}

// Usage in component
function SearchComponent() {
  const { setParam } = useUrlParams();

  const handleSearch = (query: string) => {
    setParam('q', query);
  };

  return <input onChange={(e) => handleSearch(e.target.value)} />;
}
```

## TypeScript Support

All URL utilities have full TypeScript support:

```typescript
import { parseUrl, buildUrl, addQueryParams } from '@awc/utils/url';

// Type-safe URL parsing
const parsed = parseUrl('https://example.com');
if (parsed) {
  const protocol: string = parsed.protocol;
  const hostname: string = parsed.hostname;
}

// Type-safe URL building
const url = buildUrl({
  protocol: 'https',    // Must be valid protocol
  hostname: 'example.com',
  port: 8080,          // number or string
  pathname: '/path',
  query: {
    key: 'value',      // Record<string, any>
    array: [1, 2, 3]
  }
});

// Type inference
const newUrl: string = addQueryParams(url, { page: 1 });
```

## Performance Considerations

### URL Parsing Performance

```typescript
// ✅ Good: Parse once, use multiple times
const parsed = parseUrl(url);
const protocol = parsed?.protocol;
const hostname = parsed?.hostname;
const pathname = parsed?.pathname;

// ❌ Avoid: Parsing multiple times
const protocol = parseUrl(url)?.protocol;
const hostname = parseUrl(url)?.hostname;
const pathname = parseUrl(url)?.pathname;
```

### Query String Caching

```typescript
// For frequently accessed URLs, cache query parameters
const queryCache = new Map<string, Record<string, string>>();

function getCachedParams(url: string) {
  if (!queryCache.has(url)) {
    const params = parseQueryString(new URL(url).search);
    queryCache.set(url, params);
  }
  return queryCache.get(url)!;
}
```

## Security Best Practices

### Always Sanitize User-Provided URLs

```typescript
import { sanitizeUrl, isValidUrl } from '@awc/utils/url';

function processExternalLink(url: string) {
  // 1. Validate format
  if (!isValidUrl(url)) {
    throw new Error('Invalid URL format');
  }

  // 2. Sanitize to remove dangerous protocols
  const safe = sanitizeUrl(url);
  if (!safe) {
    throw new Error('Dangerous URL detected');
  }

  // 3. Additional checks
  const domain = getDomain(safe);
  if (isBlockedDomain(domain)) {
    throw new Error('Domain not allowed');
  }

  return safe;
}
```

### Validate Before Redirecting

```typescript
function safeRedirect(url: string) {
  // Only allow same-origin or whitelisted domains
  const currentOrigin = window.location.origin;
  
  if (isSameOrigin(currentOrigin, url)) {
    window.location.href = url;
    return;
  }

  const allowedDomains = ['trusted1.com', 'trusted2.com'];
  const domain = getDomain(url);
  
  if (domain && allowedDomains.includes(domain)) {
    window.location.href = url;
  } else {
    console.warn('Redirect to untrusted domain blocked:', url);
  }
}
```

## Browser Support

All utilities work in:
- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Node.js 14+
- ✅ React Native (with URL polyfill)
- ✅ Electron

## Documentation

- [API Reference](./api-reference.md) - Complete function documentation
- [Examples](./examples.md) - Real-world use cases
- [Best Practices](./best-practices.md) - Security and optimization tips

## Next Steps

- Check out the [API Reference](./api-reference.md) for detailed function documentation
- See [Examples](./examples.md) for more real-world usage patterns
- Review [Best Practices](./best-practices.md) for security and performance tips