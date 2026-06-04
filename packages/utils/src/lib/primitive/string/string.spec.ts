import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
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
  stringToPrimitiveArray,
  stringToObjectArrayOnly,
  parseArrayLiteral,
  parseLiteral,
  isStringArray,
  parsePrimitiveValue,
} from './string.js';

describe('String Utilities', () => {
  describe('trim', () => {
    it('should trim whitespace from both ends', () => {
      expect(trim('  hello  ')).toBe('hello');
      expect(trim('\t\nhello\t\n')).toBe('hello');
      expect(trim('hello')).toBe('hello');
      expect(trim('')).toBe('');
    });
  });

  describe('trimStart', () => {
    it('should trim whitespace from start only', () => {
      expect(trimStart('  hello  ')).toBe('hello  ');
      expect(trimStart('\t\nhello')).toBe('hello');
      expect(trimStart('hello')).toBe('hello');
    });
  });

  describe('trimEnd', () => {
    it('should trim whitespace from end only', () => {
      expect(trimEnd('  hello  ')).toBe('  hello');
      expect(trimEnd('hello\t\n')).toBe('hello');
      expect(trimEnd('hello')).toBe('hello');
    });
  });

  describe('toCamelCase', () => {
    it('should convert to camelCase', () => {
      expect(toCamelCase('hello-world')).toBe('helloWorld');
      expect(toCamelCase('hello_world')).toBe('helloWorld');
      expect(toCamelCase('hello world')).toBe('helloWorld');
      expect(toCamelCase('HelloWorld')).toBe('helloWorld');
      expect(toCamelCase('hello')).toBe('hello');
    });
  });

  describe('toPascalCase', () => {
    it('should convert to PascalCase', () => {
      expect(toPascalCase('hello-world')).toBe('HelloWorld');
      expect(toPascalCase('hello_world')).toBe('HelloWorld');
      expect(toPascalCase('hello world')).toBe('HelloWorld');
      expect(toPascalCase('helloWorld')).toBe('HelloWorld');
      expect(toPascalCase('hello')).toBe('Hello');
    });
  });

  describe('toKebabCase', () => {
    it('should convert to kebab-case', () => {
      expect(toKebabCase('helloWorld')).toBe('hello-world');
      expect(toKebabCase('HelloWorld')).toBe('hello-world');
      expect(toKebabCase('hello_world')).toBe('hello-world');
      expect(toKebabCase('hello world')).toBe('hello-world');
      expect(toKebabCase('hello')).toBe('hello');
    });
  });

  describe('toSnakeCase', () => {
    it('should convert to snake_case', () => {
      expect(toSnakeCase('helloWorld')).toBe('hello_world');
      expect(toSnakeCase('HelloWorld')).toBe('hello_world');
      expect(toSnakeCase('hello-world')).toBe('hello_world');
      expect(toSnakeCase('hello world')).toBe('hello_world');
      expect(toSnakeCase('hello')).toBe('hello');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('HELLO')).toBe('HELLO');
      expect(capitalize('')).toBe('');
      expect(capitalize('h')).toBe('H');
      expect(capitalize('hello world')).toBe('Hello world');
    });
  });

  describe('toTitleCase', () => {
    it('should convert to title case', () => {
      expect(toTitleCase('hello world')).toBe('Hello World');
      expect(toTitleCase('HELLO WORLD')).toBe('Hello World');
      expect(toTitleCase('hello-world')).toBe('Hello-World');
      expect(toTitleCase('')).toBe('');
      expect(toTitleCase('a quick brown fox')).toBe('A Quick Brown Fox');
    });
  });

  describe('startsWith', () => {
    it('should check if string starts with substring', () => {
      expect(startsWith('hello', 'he')).toBe(true);
      expect(startsWith('hello', 'lo')).toBe(false);
      expect(startsWith('hello', 'he', 0)).toBe(true);
      expect(startsWith('hello', 'lo', 3)).toBe(true);
      expect(startsWith('', '')).toBe(true);
    });
  });

  describe('endsWith', () => {
    it('should check if string ends with substring', () => {
      expect(endsWith('hello', 'lo')).toBe(true);
      expect(endsWith('hello', 'he')).toBe(false);
      expect(endsWith('hello', 'lo', 5)).toBe(true);
      expect(endsWith('hello', 'el', 3)).toBe(true);
      expect(endsWith('', '')).toBe(true);
    });
  });

  describe('includes', () => {
    it('should check if string contains substring', () => {
      expect(includes('hello', 'ell')).toBe(true);
      expect(includes('hello', 'ELL')).toBe(false);
      expect(includes('', '')).toBe(true);
      expect(includes('hello', '')).toBe(true);
    });
  });

  describe('includesIgnoreCase', () => {
    it('should check if string contains substring (case-insensitive)', () => {
      expect(includesIgnoreCase('hello', 'ELL')).toBe(true);
      expect(includesIgnoreCase('HELLO', 'ell')).toBe(true);
      expect(includesIgnoreCase('hello', 'world')).toBe(false);
      expect(includesIgnoreCase('', '')).toBe(true);
    });
  });

  describe('replaceAll', () => {
    it('should replace all occurrences', () => {
      expect(replaceAll('hello world', 'l', 'x')).toBe('hexxo worxd');
      expect(replaceAll('aaa', 'a', 'b')).toBe('bbb');
      expect(replaceAll('hello', 'x', 'y')).toBe('hello');
      expect(replaceAll('', 'a', 'b')).toBe('');
    });
  });

  describe('replaceAllIgnoreCase', () => {
    it('should replace all occurrences (case-insensitive)', () => {
      expect(replaceAllIgnoreCase('Hello World', 'hello', 'Hi')).toBe(
        'Hi World'
      );
      expect(replaceAllIgnoreCase('HELLO hello', 'he', 'X')).toBe('XLLO Xllo');
      expect(replaceAllIgnoreCase('test', 'TEST', 'passed')).toBe('passed');
    });
  });

  describe('escapeRegExp', () => {
    it('should escape regex special characters', () => {
      expect(escapeRegExp('.*+?^${}()|[]\\')).toBe(
        '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\'
      );
      expect(escapeRegExp('test[123]')).toBe('test\\[123\\]');
      expect(escapeRegExp('^start$')).toBe('\\^start\\$');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
      expect(escapeHtml('"test"')).toBe('&quot;test&quot;');
      expect(escapeHtml("'test'")).toBe('&#39;test&#39;');
      expect(escapeHtml('&')).toBe('&amp;');
      expect(escapeHtml('test')).toBe('test');
    });
  });

  describe('unescapeHtml', () => {
    it('should unescape HTML entities', () => {
      expect(unescapeHtml('&lt;div&gt;')).toBe('<div>');
      expect(unescapeHtml('&quot;test&quot;')).toBe('"test"');
      expect(unescapeHtml('&#39;test&#39;')).toBe("'test'");
      expect(unescapeHtml('&amp;')).toBe('&');
      expect(unescapeHtml('test')).toBe('test');
    });
  });

  describe('truncate', () => {
    it('should truncate string with ellipsis', () => {
      expect(truncate('Hello world', 8)).toBe('Hello...');
      expect(truncate('Hello world', 11)).toBe('Hello world');
      expect(truncate('Hello world', 5, '..')).toBe('Hel..');
      expect(truncate('', 5)).toBe('');
    });
  });

  describe('pad', () => {
    it('should pad string from start', () => {
      expect(pad('hello', 10, '*')).toBe('*****hello');
      expect(pad('hello', 3, '*')).toBe('hello');
      expect(pad('', 5, '*')).toBe('*****');
    });

    it('should pad string from end', () => {
      expect(pad('hello', 10, '*', 'end')).toBe('hello*****');
    });

    it('should pad string from both sides', () => {
      expect(pad('hello', 10, '*', 'both')).toBe('**hello***');
      expect(pad('hello', 11, '*', 'both')).toBe('***hello***');
    });
  });

  describe('isEmpty', () => {
    it('should check if string is empty or whitespace', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty('\t\n')).toBe(true);
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty('  hello  ')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should validate email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('  test@example.com  ')).toBe(true); // trims
    });
  });

  describe('isValidUrl', () => {
    it('should validate URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('ftp://files.example.com')).toBe(true);
      expect(isValidUrl('invalid')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('://example.com')).toBe(false);
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from URL', () => {
      expect(extractDomain('https://www.example.com/path')).toBe('example.com');
      expect(extractDomain('http://example.com')).toBe('example.com');
      expect(extractDomain('https://sub.domain.co.uk')).toBe(
        'sub.domain.co.uk'
      );
      expect(extractDomain('invalid')).toBe('');
      expect(extractDomain('')).toBe('');
    });
  });

  // describe('randomString', () => {
  //   beforeEach(() => {
  //     vi.spyOn(Math, 'random').mockReturnValue(0.5);
  //   });

  //   afterEach(() => {
  //     vi.restoreAllMocks();
  //   });

  //   it('should generate random strings', () => {
  //     vi.spyOn(Math, 'random').mockReturnValue(0.5);
  //     expect(randomString(10)).toBe('NNNNN'); // N is at position 13 in default charset

  //     expect(randomString(0)).toBe('');

  //     // Test custom charset
  //     expect(randomString(3, 'ABC')).toBe('BBB');
  //   });
  // });

  describe('countOccurrences', () => {
    it('should count occurrences (case-sensitive)', () => {
      expect(countOccurrences('hello hello', 'lo')).toBe(2);
      expect(countOccurrences('hello hello', 'LO')).toBe(0);
      expect(countOccurrences('aaa', 'aa')).toBe(1); // non-overlapping
      expect(countOccurrences('', 'a')).toBe(0);
      expect(countOccurrences('test', '')).toBe(0);
    });

    it('should count occurrences (case-insensitive)', () => {
      expect(countOccurrences('Hello hello', 'lo', false)).toBe(2);
      expect(countOccurrences('Hello hello', 'LO', false)).toBe(2);
    });
  });

  describe('removeWhitespace', () => {
    it('should remove all whitespace', () => {
      expect(removeWhitespace('hello world')).toBe('helloworld');
      expect(removeWhitespace('  hello  world  ')).toBe('helloworld');
      expect(removeWhitespace('hello\n\tworld')).toBe('helloworld');
      expect(removeWhitespace('')).toBe('');
    });
  });

  describe('reverse', () => {
    it('should reverse string', () => {
      expect(reverse('hello')).toBe('olleh');
      expect(reverse('')).toBe('');
      expect(reverse('a')).toBe('a');
      expect(reverse('racecar')).toBe('racecar');
    });
  });

  describe('isPalindrome', () => {
    it('should check if string is palindrome', () => {
      expect(isPalindrome('racecar')).toBe(true);
      expect(isPalindrome('hello')).toBe(false);
      expect(isPalindrome('')).toBe(true);
      expect(isPalindrome('a')).toBe(true);
      expect(isPalindrome('A man a plan a canal Panama')).toBe(true);
    });

    it('should handle case sensitivity', () => {
      expect(isPalindrome('Racecar', true)).toBe(false);
      expect(isPalindrome('Racecar', false)).toBe(true);
    });
  });

  describe('slugify', () => {
    it('should generate URL-friendly slugs', () => {
      expect(slugify('Hello World!')).toBe('hello-world');
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
      expect(slugify('Special & Characters #1')).toBe('special-characters-1');
      expect(slugify('already-slug')).toBe('already-slug');
      expect(slugify('')).toBe('');
    });
  });

  describe('mask', () => {
    it('should mask parts of string', () => {
      expect(mask('1234567890', 3, 2)).toBe('123*****90');
      expect(mask('1234567890', 0, 4)).toBe('******7890');
      expect(mask('1234567890', 4, 0)).toBe('1234******');
      expect(mask('123', 3, 2)).toBe('123'); // No masking needed
      expect(mask('1234567890', 3, 2, '#')).toBe('123#####90');
    });
  });

  describe('getInitials', () => {
    it('should extract initials from name', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('john doe')).toBe('JD');
      expect(getInitials('John Michael Doe')).toBe('JM');
      expect(getInitials('John Michael Doe', 3)).toBe('JMD');
      expect(getInitials('Single')).toBe('S');
      expect(getInitials('')).toBe('');
    });
  });

  describe('normalizeLineEndings', () => {
    it('should normalize line endings to LF', () => {
      expect(normalizeLineEndings('hello\r\nworld')).toBe('hello\nworld');
      expect(normalizeLineEndings('hello\rworld')).toBe('hello\nworld');
      expect(normalizeLineEndings('hello\nworld')).toBe('hello\nworld');
      expect(normalizeLineEndings('hello\r\n\r\nworld')).toBe('hello\n\nworld');
    });
  });

  describe('wordWrap', () => {
    it('should wrap text to specified line length', () => {
      expect(wordWrap('Hello world, this is a test.', 10)).toEqual([
        'Hello',
        'world, this',
        'is a test.',
      ]);

      expect(wordWrap('Short text', 20)).toEqual(['Short text']);
      expect(wordWrap('', 10)).toEqual([]);
      expect(wordWrap('Verylongwordthatexceedslimit', 10)).toEqual([
        'Verylongwordthatexceedslimit',
      ]);
    });
  });

  describe('isString', () => {
    it('should check if value is a string', () => {
      expect(isString('hello')).toBe(true);
      expect(isString('')).toBe(true);
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });

    it('should act as a type guard', () => {
      const value: unknown = 'test';
      if (isString(value)) {
        expect(value.toUpperCase()).toBe('TEST');
      }
    });
  });

  describe('toString', () => {
    it('should safely convert values to string', () => {
      expect(toString('hello')).toBe('hello');
      expect(toString(123)).toBe('123');
      expect(toString(true)).toBe('true');
      expect(toString(false)).toBe('false');
      expect(toString(null)).toBe('');
      expect(toString(undefined)).toBe('');
      expect(toString([])).toBe('');
      expect(toString({})).toBe('');
    });

    it('should use fallback when conversion fails', () => {
      // Create an object that throws when stringified
      const obj = {
        toString: () => {
          throw new Error();
        },
      };

      expect(toString(obj, 'fallback')).toBe('fallback');
      expect(toString(null, 'default')).toBe('default');
      expect(toString(undefined, 0)).toBe(0);
    });
  });

  // TODO: wall-clock micro-benchmarks — flaky on shared CI runners; not correctness tests.
  describe.skip('Performance tests', () => {
    it('trim should be performant', () => {
      const start = performance.now();

      for (let i = 0; i < 100000; i++) {
        trim('  test string  ');
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(50);
    });

    it('replaceAll should be performant', () => {
      const start = performance.now();

      for (let i = 0; i < 100000; i++) {
        replaceAll('hello world hello', 'hello', 'hi');
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty strings', () => {
      expect(trim('')).toBe('');
      expect(capitalize('')).toBe('');
      expect(toCamelCase('')).toBe('');
      expect(isEmpty('')).toBe(true);
      expect(reverse('')).toBe('');
      expect(isPalindrome('')).toBe(true);
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      expect(trim(longString)).toBe(longString);
      expect(reverse(longString)).toBe(longString);
      expect(countOccurrences(longString, 'a')).toBe(10000);
    });

    it('should handle special characters and Unicode', () => {
      expect(trim('  café  ')).toBe('café');
      expect(capitalize('éclair')).toBe('Éclair');
      expect(reverse('café')).toBe('éfac');
      expect(isPalindrome('été')).toBe(true);
    });
  });

  describe('TypeScript type tests', () => {
    it('should have proper type inference for isString', () => {
      const value: unknown = 'test';

      //// @ts-expect-error - value is unknown
      // value.toUpperCase();

      if (isString(value)) {
        expect(value.toUpperCase()).toBe('TEST');
      }
    });

    it('should have proper type inference for toString with generic fallback', () => {
      const result1 = toString(123);
      // result1 should be string

      const result2 = toString(null, 'fallback');
      // result2 should be string | "fallback"

      const result3 = toString(undefined, 0);
      // result3 should be string | 0

      expect(typeof result1 === 'string').toBe(true);
      expect(typeof result2 === 'string' || result2 === 'fallback').toBe(true);
      expect(typeof result3 === 'string' || result3 === 0).toBe(true);
    });
  });
  describe('escapeString', () => {
    it('should escape regex special characters', () => {
      expect(escapeString('test[123]')).toBe('test\\[123\\]');
      expect(escapeString('a.b')).toBe('a\\.b');
      expect(escapeString('a*b')).toBe('a\\*b');
      expect(escapeString('a+b')).toBe('a\\+b');
      expect(escapeString('a?b')).toBe('a\\?b');
      expect(escapeString('a^b')).toBe('a\\^b');
      expect(escapeString('a$b')).toBe('a\\$b');
      expect(escapeString('a(b)')).toBe('a\\(b\\)');
      expect(escapeString('a{b}')).toBe('a\\{b\\}');
      expect(escapeString('a|b')).toBe('a\\|b');
      expect(escapeString('a\\b')).toBe('a\\\\b');
    });

    it('should not escape non-regex special characters', () => {
      expect(escapeString('test!123')).toBe('test!123');
      expect(escapeString('test#123')).toBe('test#123');
      expect(escapeString('test:123')).toBe('test:123');
      expect(escapeString('test;123')).toBe('test;123');
      expect(escapeString('test,123')).toBe('test,123');
      expect(escapeString('test/123')).toBe('test/123');
      expect(escapeString('test"123')).toBe('test"123');
      expect(escapeString("test'123")).toBe("test'123");
    });

    it('should not escape excluded strings', () => {
      expect(escapeString('&nbsp;')).toBe('&nbsp;');
      expect(escapeString('\xa0')).toBe('\xa0');
      expect(escapeString('\xa0\xa0')).toBe('\xa0\xa0');
      expect(escapeString('_space_')).toBe('_space_');
      expect(escapeString('&nbsp;', true)).toBe('&nbsp;');
    });

    it('should not escape when escape flag is false', () => {
      expect(escapeString('test[123]', false)).toBe('test[123]');
      expect(escapeString('a.b', false)).toBe('a.b');
      expect(escapeString('&nbsp;', false)).toBe('&nbsp;');
    });

    it('should handle empty string', () => {
      expect(escapeString('')).toBe('');
      expect(escapeString('', false)).toBe('');
    });
  });

  describe('replaceString', () => {
    it('should replace substring at start', () => {
      expect(replaceString('hello world', 'hello', 'start')).toBe(' world');
      expect(replaceString('hello world', 'hello', 'start', 'hi')).toBe(
        'hi world'
      );
      expect(replaceString('test test', 'test', 'start', '')).toBe(' test');
    });

    it('should replace substring at end', () => {
      expect(replaceString('hello world', 'world', 'end')).toBe('hello ');
      expect(replaceString('hello world', 'world', 'end', 'there')).toBe(
        'hello there'
      );
      expect(replaceString('test test', 'test', 'end', '')).toBe('test ');
    });

    it('should replace substring at both ends', () => {
      expect(replaceString('testtesttest', 'test', 'both')).toBe('test');
      expect(replaceString('testtesttest', 'test', 'both', 'X')).toBe('XtestX');
      expect(replaceString('hello world', 'hello', 'both')).toBe(' world');
      expect(replaceString('hello world', 'world', 'both')).toBe('hello ');
      expect(replaceString('test', 'test', 'both', 'new')).toBe('new');
    });

    it('should not replace when substring not found', () => {
      expect(replaceString('hello world', 'xyz', 'start')).toBe('hello world');
      expect(replaceString('hello world', 'xyz', 'end')).toBe('hello world');
      expect(replaceString('hello world', 'xyz', 'both')).toBe('hello world');
    });

    it('should handle empty strings', () => {
      expect(replaceString('', 'test', 'start')).toBe('');
      expect(replaceString('hello', '', 'start')).toBe('hello');
      expect(replaceString('', '', 'start')).toBe('');
    });

    it('should handle exact matches', () => {
      expect(replaceString('test', 'test', 'start')).toBe('');
      expect(replaceString('test', 'test', 'end')).toBe('');
      expect(replaceString('test', 'test', 'both')).toBe('');
    });
  });

  describe('replaceStringPattern', () => {
    // it('should replace regex pattern at start', () => {
    //   expect(replaceStringPattern('123abc', '\\d+', 'start', 'X')).toBe('Xabc');
    //   expect(replaceStringPattern('hello world', '^hello', 'start', 'hi')).toBe('hi world');
    // });

    // it('should replace regex pattern at end', () => {
    //   expect(replaceStringPattern('abc123', '\\d+', 'end', 'X')).toBe('abcX');
    //   expect(replaceStringPattern('hello world', 'world$', 'end', 'there')).toBe('hello there');
    // });

    // it('should replace regex pattern at both ends', () => {
    //   expect(replaceStringPattern('123abc123', '\\d+', 'both', 'X')).toBe('XabcX');
    //   expect(replaceStringPattern('testtest', 'test', 'both', 'X')).toBe('XX');
    // });

    // it('should handle string patterns', () => {
    //   expect(replaceStringPattern('hello world', 'hello', 'start', 'hi', false)).toBe('hi world');
    //   expect(replaceStringPattern('hello world', 'world', 'end', 'there', false)).toBe('hello there');
    // });

    // it('should handle complex regex patterns', () => {
    //   expect(replaceStringPattern('abc 123 def', '\\s+\\d+\\s+', 'both', ' | ', true)).toBe('abc | def');
    //   expect(replaceStringPattern('test1 test2', 'test\\d', 'both', 'X', true)).toBe('X X');
    // });

    it('should replace regex pattern at start', () => {
      expect(
        replaceStringPattern('123abc', {
          pattern: '\\d+',
          newValue: 'X',
          position: 'start',
        })
      ).toBe('Xabc');
      expect(
        replaceStringPattern('hello world', {
          pattern: '^hello',
          newValue: 'hi',
        })
      ).toBe('hi world');
    });

    it('should replace regex pattern at end', () => {
      expect(
        replaceStringPattern('abc123', {
          pattern: '\\d+',
          position: 'end',
          newValue: 'X',
        })
      ).toBe('abcX');
      expect(
        replaceStringPattern('hello world', {
          pattern: 'world$',
          position: 'end',
          newValue: 'there',
        })
      ).toBe('hello there');
    });

    it('should replace regex pattern at both ends', () => {
      expect(
        replaceStringPattern('123abc123', {
          pattern: '\\d+',
          position: 'both',
          newValue: 'X',
        })
      ).toBe('XabcX');
      expect(
        replaceStringPattern('testtest', {
          pattern: 'test',
          position: 'both',
          newValue: 'X',
        })
      ).toBe('XX');
    });

    it('should handle string patterns', () => {
      expect(
        replaceStringPattern('hello world', {
          pattern: 'hello',
          position: 'start',
          newValue: 'hi',
          useRegex: false,
        })
      ).toBe('hi world');
      expect(
        replaceStringPattern('hello world', {
          pattern: 'world',
          position: 'end',
          newValue: 'there',
          useRegex: false,
        })
      ).toBe('hello there');
    });

    it('should handle complex regex patterns', () => {
      expect(
        replaceStringPattern('abc 123 def', {
          pattern: '\\s+\\d+\\s+',
          position: 'alone',
          newValue: ' | ',
          useRegex: true,
        })
      ).toBe('abc | def');
      // expect(replaceStringPattern('test1 test2', {pattern: 'test\\d', position: 'both', newValue: 'X', useRegex: true})).toBe('X X');
    });
  });

  describe('parsePrimitiveValue', () => {
    it('should parse numbers', () => {
      expect(parsePrimitiveValue('123')).toBe(123);
      expect(parsePrimitiveValue('-123')).toBe(-123);
      expect(parsePrimitiveValue('123.45')).toBe(123.45);
      expect(parsePrimitiveValue('-123.45')).toBe(-123.45);
      expect(parsePrimitiveValue('1.23e5')).toBe(123000);
      expect(parsePrimitiveValue('1.23E5')).toBe(123000);
    });

    it('should parse booleans', () => {
      expect(parsePrimitiveValue('true')).toBe(true);
      expect(parsePrimitiveValue('false')).toBe(false);
      expect(parsePrimitiveValue('TRUE')).toBe(true);
      expect(parsePrimitiveValue('FALSE')).toBe(false);
    });

    it('should parse null and undefined', () => {
      expect(parsePrimitiveValue('null')).toBe(null);
      expect(parsePrimitiveValue('undefined')).toBe(undefined);
      expect(parsePrimitiveValue('NULL')).toBe(null);
      expect(parsePrimitiveValue('UNDEFINED')).toBe(undefined);
    });

    it('should return strings for non-parsable values', () => {
      expect(parsePrimitiveValue('hello')).toBe('hello');
      expect(parsePrimitiveValue('123abc')).toBe('123abc');
      expect(parsePrimitiveValue('')).toBe(null);
      expect(parsePrimitiveValue('   ')).toBe(null);
    });

    it('should handle edge cases', () => {
      expect(parsePrimitiveValue('0123')).toBe(123); // Leading zeros
      expect(parsePrimitiveValue('0')).toBe(0);
      expect(parsePrimitiveValue('0.0')).toBe(0);
    });
  });

  describe('stringToObjectArray - Primitive Mode', () => {
    it('should return string array by default', () => {
      const result = stringToObjectArray('apple|banana|cherry');
      expect(result).toEqual(['apple', 'banana', 'cherry']);
      expect(isStringArray(result)).toBe(true);
    });

    it('should parse primitive values when parsePrimitives is true', () => {
      const result = stringToObjectArray('1|2.5|true|false|null|hello', {
        parsePrimitives: true,
        preserveNullUndefined: true,
      });
      expect(result).toEqual([1, 2.5, true, false, null, 'hello']);
    });

    it('should handle different delimiters', () => {
      expect(stringToObjectArray('a,b,c', { delimiters: [','] })).toEqual([
        'a',
        'b',
        'c',
      ]);
      expect(stringToObjectArray('a;b;c', { delimiters: [';'] })).toEqual([
        'a',
        'b',
        'c',
      ]);
      expect(stringToObjectArray('a b c', { delimiters: [' '] })).toEqual([
        'a',
        'b',
        'c',
      ]);
    });

    it('should handle JSON array input', () => {
      expect(stringToObjectArray('["apple", "banana"]')).toEqual([
        'apple',
        'banana',
      ]);
      expect(
        stringToObjectArray('[1, 2, 3]', { parsePrimitives: true })
      ).toEqual([1, 2, 3]);
      expect(
        stringToObjectArray('[true, false]', { parsePrimitives: true })
      ).toEqual([true, false]);
    });

    it('should handle array literal input', () => {
      expect(stringToObjectArray('[apple, banana]')).toEqual([
        'apple',
        'banana',
      ]);
      expect(stringToObjectArray('["apple", "banana"]')).toEqual([
        'apple',
        'banana',
      ]);
      expect(stringToObjectArray("['apple', 'banana']")).toEqual([
        'apple',
        'banana',
      ]);
    });

    it('should trim and filter by default', () => {
      expect(stringToObjectArray('  apple  |  banana  |  ')).toEqual([
        'apple',
        'banana',
      ]);
      expect(stringToObjectArray('a||b|c', { filterEmpty: true })).toEqual([
        'a',
        'b',
        'c',
      ]);
      expect(stringToObjectArray('a||b|c', { filterEmpty: false })).toEqual([
        'a',
        '',
        'b',
        'c',
      ]);
    });

    it('should handle array input', () => {
      expect(stringToObjectArray(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
      expect(stringToObjectArray([1, 2, 3], { parsePrimitives: true })).toEqual(
        [1, 2, 3]
      );
    });
  });

  describe('stringToObjectArray - Object Mode', () => {
    it('should create objects when valueKey is provided', () => {
      const result = stringToObjectArray('apple|banana', { valueKey: 'id' });
      expect(result).toEqual([{ id: 'apple' }, { id: 'banana' }]);
      // expect(isObjectArray(result)).toBe(true);
    });

    it('should create objects with both valueKey and labelKey', () => {
      const result = stringToObjectArray('apple|banana', {
        valueKey: 'value',
        labelKey: 'label',
      });
      expect(result).toEqual([
        { value: 'apple', label: 'apple' },
        { value: 'banana', label: 'banana' },
      ]);
    });

    it('should merge with defaultObject', () => {
      const result = stringToObjectArray('apple|banana', {
        valueKey: 'name',
        defaultObject: { type: 'fruit', color: 'red' },
      });
      expect(result).toEqual([
        { name: 'apple', type: 'fruit', color: 'red' },
        { name: 'banana', type: 'fruit', color: 'red' },
      ]);
    });

    it('should handle parsePrimitives in object mode', () => {
      const result = stringToObjectArray('1|2|3', {
        valueKey: 'id',
        parsePrimitives: true,
      });
      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('should auto-detect object mode based on options', () => {
      // No object options → primitive mode
      expect(stringToObjectArray('a|b')).toEqual(['a', 'b']);

      // With valueKey → object mode
      expect(stringToObjectArray('a|b', { valueKey: 'x' })).toEqual([
        { x: 'a' },
        { x: 'b' },
      ]);

      // With labelKey → object mode
      expect(stringToObjectArray('a|b', { labelKey: 'x' })).toEqual([
        { x: 'a' },
        { x: 'b' },
      ]);

      // With defaultObject → object mode
      expect(
        stringToObjectArray('a|b', { defaultObject: { type: 'test' } })
      ).toEqual([{ type: 'test' }, { type: 'test' }]);
    });

    it('should force primitive mode with returnObjects: false', () => {
      const result = stringToObjectArray('a|b', {
        valueKey: 'id',
        returnObjects: false,
      });
      expect(result).toEqual(['a', 'b']);
    });

    it('should force object mode with returnObjects: true', () => {
      const result = stringToObjectArray('a|b', {
        returnObjects: true,
      });
      expect(result).toEqual([{ label: 'a' }, { label: 'b' }]);
    });

    it('should handle JSON object array input', () => {
      const json = '[{"id": 1, "name": "a"}, {"id": 2, "name": "b"}]';
      const result = stringToObjectArray(json, { valueKey: 'id' });
      expect(result).toEqual([
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ]);
    });
  });

  describe('stringToPrimitiveArray', () => {
    it('should always return primitive array', () => {
      expect(stringToPrimitiveArray('a|b|c')).toEqual(['a', 'b', 'c']);
      expect(
        stringToPrimitiveArray('1|2|3', { parsePrimitives: true })
      ).toEqual([1, 2, 3]);
    });

    it('should ignore object-related options', () => {
      // Even with valueKey in options (should be ignored)
      const result = stringToPrimitiveArray('a|b', {
        parsePrimitives: true,
        delimiters: ['|'],
      });
      expect(result).toEqual(['a', 'b']);
    });

    it('should handle edge cases', () => {
      expect(stringToPrimitiveArray('')).toEqual([]);
      expect(stringToPrimitiveArray('   ')).toEqual([]);
      expect(stringToPrimitiveArray('a||b', { filterEmpty: false })).toEqual([
        'a',
        '',
        'b',
      ]);
    });
  });

  describe('stringToObjectArrayOnly', () => {
    it('should always return object array', () => {
      const result = stringToObjectArrayOnly('a|b', { valueKey: 'key' });
      expect(result).toEqual([{ key: 'a' }, { key: 'b' }]);
      // expect(isObjectArray(result)).toBe(true);
    });

    it('should require object-related options', () => {
      // Without valueKey/labelKey, will create objects with label key
      const result = stringToObjectArrayOnly('a|b');
      expect(result).toEqual([{ label: 'a' }, { label: 'b' }]);
    });

    it('should handle default object', () => {
      const result = stringToObjectArrayOnly('a|b', {
        valueKey: 'name',
        defaultObject: { type: 'test' },
      });
      expect(result).toEqual([
        { name: 'a', type: 'test' },
        { name: 'b', type: 'test' },
      ]);
    });
  });

  describe('parseArrayLiteral', () => {
    it('should parse unquoted array literals', () => {
      expect(parseArrayLiteral('[apple, banana, cherry]')).toEqual([
        'apple',
        'banana',
        'cherry',
      ]);
      expect(parseArrayLiteral('[  apple  ,  banana  ]')).toEqual([
        'apple',
        'banana',
      ]);
      expect(parseArrayLiteral('[a]')).toEqual(['a']);
    });

    it('should parse quoted array literals', () => {
      expect(parseArrayLiteral('["apple", "banana"]')).toEqual([
        'apple',
        'banana',
      ]);
      expect(parseArrayLiteral("['apple', 'banana']")).toEqual([
        'apple',
        'banana',
      ]);
      expect(parseArrayLiteral('["a", \'b\', "c"]')).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty array', () => {
      expect(parseArrayLiteral('[]')).toEqual([]);
      expect(parseArrayLiteral('[ ]')).toEqual([]);
    });

    it('should handle escaped quotes', () => {
      expect(parseArrayLiteral('["a\\"b", "c"]')).toEqual(['a"b', 'c']);
      expect(parseArrayLiteral("['a\\'b', 'c']")).toEqual(["a'b", 'c']);
    });

    it('should handle nested brackets', () => {
      expect(parseArrayLiteral('[a, [b, c], d]')).toEqual(['a', '[b, c]', 'd']);
      expect(parseArrayLiteral('[a, {b: c}, d]')).toEqual(['a', '{b: c}', 'd']);
    });

    it('should return original string if not array literal', () => {
      expect(parseArrayLiteral('not an array')).toBe('not an array');
      expect(parseArrayLiteral('{key: "value"}')).toBe('{key: "value"}');
      expect(parseArrayLiteral('')).toBe('');
    });

    it('should handle trailing commas', () => {
      // Note: JSON doesn't allow trailing commas, but our parser does
      expect(parseArrayLiteral('[a, b, ]')).toEqual(['a', 'b']);
      expect(parseArrayLiteral('[a,]')).toEqual(['a']);
    });
  });

  describe('parseLiteral', () => {
    it('should parse array literals', () => {
      expect(parseLiteral('[1, 2, 3]')).toEqual([1, 2, 3]);
      expect(parseLiteral('["a", "b"]')).toEqual(['a', 'b']);
      expect(parseLiteral('[true, false]')).toEqual([true, false]);
    });

    it('should parse object literals', () => {
      expect(parseLiteral('{"key": "value"}')).toEqual({ key: 'value' });
      expect(parseLiteral('{"a": 1, "b": true}')).toEqual({ a: 1, b: true });
      expect(parseLiteral('{}')).toEqual({});
    });

    it('should parse primitive literals', () => {
      expect(parseLiteral('123')).toBe(123);
      expect(parseLiteral('3.14')).toBe(3.14);
      expect(parseLiteral('true')).toBe(true);
      expect(parseLiteral('false')).toBe(false);
      expect(parseLiteral('null')).toBe(null);
      expect(parseLiteral('"hello"')).toBe('hello');
    });

    it('should fix common JSON issues', () => {
      // Unquoted keys
      expect(parseLiteral('{key: "value"}')).toEqual({ key: 'value' });
      // Single quotes
      expect(parseLiteral("{'key': 'value'}")).toEqual({ key: 'value' });
      // Mixed quotes
      expect(parseLiteral('{key: "value", "another": \'test\'}')).toEqual({
        key: 'value',
        another: 'test',
      });
    });

    it('should return string for invalid JSON', () => {
      expect(parseLiteral('{invalid json}')).toBe('{invalid json}');
      expect(parseLiteral('not a literal')).toBe('not a literal');
      expect(parseLiteral('')).toBe('');
    });
  });

  describe('Type Guards', () => {
    describe('isStringArray', () => {
      it('should return true for string arrays', () => {
        expect(isStringArray(['a', 'b', 'c'])).toBe(true);
        expect(isStringArray([])).toBe(true);
        expect(isStringArray([''])).toBe(true);
      });

      it('should return false for non-string arrays', () => {
        expect(isStringArray([1, 2, 3])).toBe(false);
        expect(isStringArray([true, false])).toBe(false);
        expect(isStringArray([{}])).toBe(false);
        expect(isStringArray(['a', 1])).toBe(false);
        expect(isStringArray(null)).toBe(false);
        expect(isStringArray(undefined)).toBe(false);
        expect(isStringArray('not an array')).toBe(false);
        expect(isStringArray({})).toBe(false);
      });

      it('should act as a type guard', () => {
        const value: unknown = ['a', 'b', 'c'];
        if (isStringArray(value)) {
          // TypeScript knows value is string[]
          expect(value.map((s) => s.toUpperCase())).toEqual(['A', 'B', 'C']);
        }
      });
    });

    // describe('isObjectArray', () => {
    //   it('should return true for object arrays', () => {
    //     expect(isObjectArray([{}])).toBe(true);
    //     expect(isObjectArray([{ a: 1 }, { b: 2 }])).toBe(true);
    //     expect(isObjectArray([])).toBe(true);
    //   });

    //   it('should return false for non-object arrays', () => {
    //     expect(isObjectArray(['a', 'b'])).toBe(false);
    //     expect(isObjectArray([1, 2, 3])).toBe(false);
    //     expect(isObjectArray([[]])).toBe(false);
    //     expect(isObjectArray([null])).toBe(false);
    //     expect(isObjectArray([undefined])).toBe(false);
    //     expect(isObjectArray([{}, []])).toBe(false);
    //     expect(isObjectArray(null)).toBe(false);
    //     expect(isObjectArray(undefined)).toBe(false);
    //     expect(isObjectArray('not an array')).toBe(false);
    //     expect(isObjectArray({})).toBe(false);
    //   });

    //   it('should act as a type guard', () => {
    //     const value: unknown = [{ id: 1 }, { id: 2 }];
    //     if (isObjectArray(value)) {
    //       // TypeScript knows value is Record<string, any>[]
    //       expect(value.map((obj) => obj.id)).toEqual([1, 2]);
    //     }
    //   });
    // });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined input for stringToObjectArray', () => {
      expect(stringToObjectArray(null as any)).toEqual([]);
      expect(stringToObjectArray(undefined as any)).toEqual([]);
      expect(stringToObjectArray('')).toEqual([]);
      expect(stringToObjectArray('   ')).toEqual([]);
    });

    it('should handle preserveNullUndefined option', () => {
      expect(
        stringToObjectArray('a||b', {
          filterEmpty: false,
          preserveNullUndefined: true,
        })
      ).toEqual(['a', null, 'b']);

      expect(
        stringToObjectArray('null|undefined', {
          parsePrimitives: true,
          preserveNullUndefined: true,
        })
      ).toEqual([null, undefined]);
    });

    it('should handle trimItems option', () => {
      expect(stringToObjectArray('  a  |  b  ', { trimItems: true })).toEqual([
        'a',
        'b',
      ]);
      expect(stringToObjectArray('  a  |  b  ', { trimItems: false })).toEqual([
        '  a  ',
        '  b  ',
      ]);
    });

    it('should handle mixed input types', () => {
      // Input array with mixed types
      expect(
        stringToObjectArray(['a', 1, true, null, { x: 1 }], {
          parsePrimitives: true,
          preserveNullUndefined: true,
        })
      ).toEqual(['a', 1, true, null, { x: 1 }]);

      // String with mixed delimiters (should use first matching delimiter)
      expect(stringToObjectArray('a,b|c', { delimiters: [',', '|'] })).toEqual([
        'a',
        'b|c',
      ]);
    });

    it('should handle large strings efficiently', () => {
      const longString = 'a'.repeat(1000) + '|' + 'b'.repeat(1000);
      const result = stringToObjectArray(longString) as string[];
      expect(result.length).toBe(2);
      expect(result[0]!.length).toBe(1000);
      expect(result[1]!.length).toBe(1000);
    });

    it('should handle special characters in delimiters', () => {
      expect(stringToObjectArray('a*b*c', { delimiters: ['*'] })).toEqual([
        'a',
        'b',
        'c',
      ]);
      expect(stringToObjectArray('a.b.c', { delimiters: ['.'] })).toEqual([
        'a',
        'b',
        'c',
      ]);
      expect(stringToObjectArray('a\\b\\c', { delimiters: ['\\'] })).toEqual([
        'a',
        'b',
        'c',
      ]);
    });
  });

  // TODO: wall-clock micro-benchmarks — flaky on shared CI runners; not correctness tests.
  describe.skip('Performance Tests', () => {
    it('stringToObjectArray should be performant', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        stringToObjectArray('a|b|c|d|e|f|g|h|i|j');
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('parseArrayLiteral should be performant', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        parseArrayLiteral('[a, b, c, d, e, f, g, h, i, j]');
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('escapeString should be performant', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        escapeString('test[123].*+?^{}()|[]\\');
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(50);
    });
  });

  describe('TypeScript Type Tests', () => {
    it('should have proper type inference for stringToObjectArray', () => {
      // Primitive mode
      const primitives = stringToObjectArray('a|b|c');
      // Type should be string[]
      expect(primitives.every((p) => typeof p === 'string')).toBe(true);

      // Object mode
      const objects = stringToObjectArray('a|b', { valueKey: 'id' });
      // Type should be { id: string }[]
      expect(objects.every((o) => typeof o === 'object')).toBe(true);

      // Generic type
      const explicit = stringToObjectArray<false>('1|2|3', {
        parsePrimitives: true,
      });
      // Type should be (string | number | boolean | null)[]
      expect(explicit.some((v) => typeof v === 'number')).toBe(true);
    });

    it('should have proper type inference for stringToPrimitiveArray', () => {
      const result = stringToPrimitiveArray('1|2|3', { parsePrimitives: true });
      // Type should be (string | number | boolean | null)[]
      expect(
        result.every(
          (v) =>
            v === null ||
            typeof v === 'string' ||
            typeof v === 'number' ||
            typeof v === 'boolean'
        )
      ).toBe(true);
    });

    it('should have proper type inference for stringToObjectArrayOnly', () => {
      const result = stringToObjectArrayOnly('a|b', { valueKey: 'key' });
      // Type should be Record<string, any>[]
      expect(result.every((o) => typeof o === 'object')).toBe(true);
    });
  });
});
