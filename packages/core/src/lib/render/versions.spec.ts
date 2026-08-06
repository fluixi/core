// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { stampVersions, versions } from './versions.js';

describe('version stamping', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reports a real version, not a marker', () => {
    // `fluixi-js="v1"` said only that Fluixi was involved. A bug report needs the build.
    for (const v of Object.values(versions)) {
      expect(v).toMatch(/^\d+\.\d+\.\d+/);
    }
  });

  it('stamps each package separately so a mismatch is visible', () => {
    const el = document.createElement('div');
    stampVersions(el);
    expect(el.getAttribute('fluixi')).toBe(versions.core);
    expect(el.getAttribute('fx-dom')).toBe(versions.dom);
    expect(el.getAttribute('fx-reactive')).toBe(versions.reactive);
  });

  it('exposes the versions on the global for the console', () => {
    stampVersions(document.createElement('div'));
    expect(globalThis.Fluixi).toEqual(versions);
  });
});

describe('version skew', () => {
  afterEach(() => vi.restoreAllMocks());

  it('says nothing when the packages agree', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { warnOnVersionSkew } = await import('./versions.js');
    warnOnVersionSkew();
    // The workspace always ships one release, so this is the normal case.
    if (new Set(Object.values(versions)).size === 1) expect(warn).not.toHaveBeenCalled();
  });
});
