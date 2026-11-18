// @vitest-environment jsdom
/** render() exposes the versions without replacing an API a CDN build put on `window.Fluixi`. */
import { describe, it, expect, afterEach } from 'vitest';
import { stampVersions } from './versions.js';

afterEach(() => {
  delete (globalThis as { Fluixi?: unknown }).Fluixi;
});

describe('window.Fluixi', () => {
  it('holds the versions on a page with no CDN build', () => {
    stampVersions(document.createElement('div'));
    const g = (globalThis as { Fluixi?: Record<string, unknown> }).Fluixi!;
    expect(Object.values(g).every((v) => typeof v !== 'function')).toBe(true);
  });

  it('keeps a CDN build API there and adds the versions to it', () => {
    const api = { createSignal: () => {} };
    (globalThis as { Fluixi?: unknown }).Fluixi = api;
    stampVersions(document.createElement('div'));
    expect((globalThis as { Fluixi?: unknown }).Fluixi).toBe(api);
    expect((api as { versions?: unknown }).versions).toBeTypeOf('object');
  });
});
