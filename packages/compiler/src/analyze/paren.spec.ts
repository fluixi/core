import { describe, expect, it } from 'vitest';
import { paren, topLevelComma } from './paren.js';

/**
 * The scanner decides from characters, so the cases that matter are a comma nested
 * inside something, and a slice it cannot read. Getting either wrong changes what
 * the emitted module means, so both directions are pinned.
 */

describe('topLevelComma', () => {
  const bare: Array<[string, string]> = [
    ['identifier', 'count'],
    ['member chain', 'props.items.length'],
    ['call', 'items()'],
    ['call with arguments', 'fn(a, b)'],
    ['new with arguments', 'new Map(a, b)'],
    ['conditional', 'a ? b : c'],
    ['logical', 'a && b'],
    ['nullish', 'a ?? b'],
    ['arithmetic', 'w() / 2'],
    ['array literal', '[1, 2, 3]'],
    ['object literal', '{ a: 1, b: 2 }'],
    ['arrow, one param', 'x => x.id'],
    ['arrow, several params', '(a, b) => a + b'],
    ['already parenthesized sequence', '(a, b)'],
    ['comma inside a double-quoted string', '"a,b"'],
    ['comma inside a single-quoted string', "'a,b'"],
    ['comma inside a template substitution', '`${fn(a, b)}`'],
    ['comma inside a nested template', '`${`${a},${b}`}`'],
    ['comma inside a regex', '/a,b/.test(s)'],
    ['comma inside a block comment', 'a /* , */ + b'],
    ['escaped quote before a comma', '"he said \\"hi\\"" + x'],
    ['optional call', 'obj?.fn?.(a, b)'],
  ];
  for (const [label, code] of bare) {
    it(`no top-level comma: ${label}`, () => {
      expect(topLevelComma(code)).toBe(false);
    });
  }

  const sequences: Array<[string, string]> = [
    ['bare sequence', 'a, b'],
    ['assignments', 'x = 1, y = 2'],
    ['after a call', 'fn(a), b'],
    ['after a string', '"a", b'],
    ['after a template', '`x${y}`, b'],
    ['after an array', '[1, 2], b'],
  ];
  for (const [label, code] of sequences) {
    it(`top-level comma: ${label}`, () => {
      expect(topLevelComma(code)).toBe(true);
    });
  }

  // Undecidable reads as "wrap it". The scanner is allowed to give up; it is not
  // allowed to guess, because a wrong `false` silently changes the emitted module.
  const undecidable: Array<[string, string]> = [
    ['unterminated call', 'fn(a'],
    ['unbalanced closer', 'a)'],
    ['unterminated string', '"abc'],
    ['unterminated template', '`abc'],
    ['unterminated block comment', 'a /* b'],
    ['line comment', 'a // trailing'],
  ];
  for (const [label, code] of undecidable) {
    it(`cannot decide: ${label}`, () => {
      expect(topLevelComma(code)).toBeNull();
    });
  }
});

describe('paren', () => {
  it('leaves a plain expression alone in value position', () => {
    expect(paren('count()', 'value')).toBe('count()');
  });

  it('leaves a plain expression alone in an arrow body', () => {
    expect(paren('count()', 'arrowBody')).toBe('count()');
  });

  it('wraps a sequence in value position', () => {
    expect(paren('a, b', 'value')).toBe('(a, b)');
  });

  it('wraps an object literal in an arrow body, where it would read as a block', () => {
    expect(paren('{ a: 1 }', 'arrowBody')).toBe('({ a: 1 })');
  });

  it('leaves an object literal alone in value position', () => {
    expect(paren('{ a: 1 }', 'value')).toBe('{ a: 1 }');
  });

  it('wraps when the scan cannot decide', () => {
    expect(paren('fn(a', 'value')).toBe('(fn(a)');
  });

  it('preserves the original spacing when it wraps', () => {
    expect(paren(' a, b ', 'value')).toBe('( a, b )');
  });
});
