// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { env, clientOnly, isClient } from './index.js';

describe('universal env utilities', () => {
  it('env.window / env.document return the real globals on the client', () => {
    expect(env.window).toBe(window);
    expect(env.document).toBe(document);
  });

  it('clientOnly runs the fn on the client and returns its value', () => {
    expect(isClient()).toBe(true);
    expect(clientOnly(() => 42, 0)).toBe(42);
  });
});
