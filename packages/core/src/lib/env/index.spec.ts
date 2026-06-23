// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { storage, createMemoryStorage, env, clientOnly, isClient } from './index.js';

describe('universal env utilities', () => {
  it('storage round-trips like localStorage (jsdom → real localStorage)', () => {
    storage.setItem('k', 'v');
    expect(storage.getItem('k')).toBe('v');
    storage.removeItem('k');
    expect(storage.getItem('k')).toBeNull();
  });

  it('createMemoryStorage implements the Storage surface (server fallback)', () => {
    const s = createMemoryStorage();
    expect(s.getItem('x')).toBeNull();
    s.setItem('x', '1');
    s.setItem('y', '2');
    expect(s.getItem('x')).toBe('1');
    expect(s.length).toBe(2);
    expect(s.key(0)).toBe('x');
    s.removeItem('x');
    expect(s.length).toBe(1);
    s.clear();
    expect(s.length).toBe(0);
  });

  it('env.window / env.document return the real globals on the client', () => {
    expect(env.window).toBe(window);
    expect(env.document).toBe(document);
  });

  it('clientOnly runs the fn on the client and returns its value', () => {
    expect(isClient).toBe(true);
    expect(clientOnly(() => 42, 0)).toBe(42);
  });
});
