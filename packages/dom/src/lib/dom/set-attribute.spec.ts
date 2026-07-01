// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { setAttribute } from './utils.js';

describe('setAttribute', () => {
  it('removes the attribute for null/undefined/false', () => {
    const el = document.createElement('div');
    el.setAttribute('data-x', 'seed');

    setAttribute(el, 'data-x', undefined as unknown as string);
    expect(el.hasAttribute('data-x')).toBe(false);

    el.setAttribute('data-x', 'seed');
    setAttribute(el, 'data-x', null as unknown as string);
    expect(el.hasAttribute('data-x')).toBe(false);

    el.setAttribute('data-x', 'seed');
    setAttribute(el, 'data-x', false);
    expect(el.hasAttribute('data-x')).toBe(false);
  });

  it('true renders as the empty string', () => {
    const el = document.createElement('div');
    setAttribute(el, 'data-x', true);
    expect(el.getAttribute('data-x')).toBe('');
  });

  it('keeps the empty string as an empty (present) attribute', () => {
    const el = document.createElement('div');
    setAttribute(el, 'data-x', '');
    expect(el.getAttribute('data-x')).toBe('');
  });

  it('sets string and number values', () => {
    const el = document.createElement('div');
    setAttribute(el, 'aria-y', 'v');
    expect(el.getAttribute('aria-y')).toBe('v');
    setAttribute(el, 'data-n', 0 as unknown as string);
    expect(el.getAttribute('data-n')).toBe('0');
  });

  it('never renders the literal string "undefined"', () => {
    const el = document.createElement('div');
    setAttribute(el, 'aria-orientation', (false ? 'vertical' : undefined) as unknown as string);
    expect(el.getAttribute('aria-orientation')).not.toBe('undefined');
    expect(el.hasAttribute('aria-orientation')).toBe(false);
  });

  it('serializes an object value to JSON', () => {
    const el = document.createElement('div');
    setAttribute(el, 'data-obj', { a: 1 } as unknown as string);
    expect(el.getAttribute('data-obj')).toBe('{"a":1}');
  });
});
