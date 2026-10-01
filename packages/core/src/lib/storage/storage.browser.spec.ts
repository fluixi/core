// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { hydrateStorage, useStorage } from './index.js';

describe('useStorage in the browser', () => {
  afterEach(() => {
    delete (globalThis as { __FX_DATA__?: unknown }).__FX_DATA__;
    localStorage.clear();
  });

  it('uses localStorage by default and document.cookie for the cookie scope', () => {
    useStorage<{ n: number }>({ namespace: 'app' }).set('n', 1);
    expect(localStorage.getItem('app:n')).toContain('"value":1');
    useStorage<{ theme: string }>({ scope: 'cookie', namespace: 'ui', cookie: { secure: false } }).set('theme', 'dark');
    expect(document.cookie).toMatch(/ui%3Atheme=/);
    expect(useStorage<{ theme: string }>({ scope: 'cookie', namespace: 'ui', cookie: { secure: false } }).get('theme')).toBe('dark');
  });

  it('seeds hydrated keys once from the page data', () => {
    (globalThis as { __FX_DATA__?: unknown }).__FX_DATA__ = { '__storage:ed:': { a: { value: 1, createdAt: 5 } } };
    const scratch = useStorage<{ a: number }>({ scope: 'request', namespace: 'ed' });
    hydrateStorage(scratch, ['a']);
    expect(scratch.getEntry('a')).toEqual({ value: 1, createdAt: 5 });
    scratch.set('a', 2);
    hydrateStorage(scratch, ['a']);
    expect(scratch.get('a')).toBe(2);
  });
});
