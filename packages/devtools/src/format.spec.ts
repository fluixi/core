import { describe, it, expect } from 'vitest';
import { formatValue } from './format.js';

describe('formatValue', () => {
  it('prints what JSON.stringify cannot', () => {
    expect(formatValue(new Map([['a', 1]]))).toBe('Map(1) {"a" => 1}');
    expect(formatValue(new Set([1, 2]))).toBe('Set(2) {1, 2}');
    expect(formatValue(10n)).toBe('10n');
    expect(formatValue(Symbol('s'))).toBe('Symbol(s)');
    expect(formatValue(undefined)).toBe('undefined');
    expect(formatValue(() => 1)).toMatch(/^ƒ/);
  });

  it('names a class instead of leaving [object Object]', () => {
    class Cart {
      items = [1];
    }
    expect(formatValue(new Cart())).toBe('Cart {items: [1]}');
    expect(formatValue({ a: 1 })).toBe('{a: 1}');
  });

  it('survives a value that refers to itself', () => {
    const loop: Record<string, unknown> = { name: 'x' };
    loop.self = loop;
    expect(formatValue(loop)).toBe('{name: "x", self: [circular]}');
  });

  it('survives a getter that throws', () => {
    const bad = {
      get boom(): number {
        throw new Error('no');
      },
      ok: 1,
    };
    expect(formatValue(bad)).toBe('{boom: [unreadable], ok: 1}');
  });

  it('says what it cut rather than cutting silently', () => {
    expect(formatValue({ a: { b: { c: { d: 1 } } } })).toBe('{a: {b: {c: {…}}}}');
    expect(formatValue([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe('[1, 2, 3, 4, 5, 6, 7, 8, …]');
    expect(formatValue('x'.repeat(40), 10)).toHaveLength(10);
  });

  it('keeps the dom and date shorthands the graph relied on', () => {
    expect(formatValue({ nodeType: 1, nodeName: 'DIV', tagName: 'DIV' })).toBe('<div>');
    expect(formatValue(new Date('2020-01-02T03:04:05Z'))).toBe('2020-01-02T03:04:05.000Z');
    expect(formatValue(new Error('nope'))).toBe('Error: nope');
  });
});
