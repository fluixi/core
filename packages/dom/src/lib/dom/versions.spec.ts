import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from './runtime.js';
import { hydrate } from './hydration.js';
import { registerCoreVersion, versionMark, versions } from './versions.js';

describe('version stamping', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('stamps the runtime versions on render', () => {
    const container = document.createElement('div');
    document.body.append(container);

    render(() => document.createTextNode('hi'), container);

    // One attribute, the convention for marking which framework mounted an element.
    expect(container.getAttribute('data-fluixi')).toBe(versions.core ?? versions.dom);
    for (const old of ['fluixi', 'fx-dom', 'fx-reactive']) expect(container.hasAttribute(old)).toBe(false);
  });

  // The bug this file exists for: only core's render stamped, so every app that reached
  // the DOM through startClient -> hydrate had no version attributes at all.
  it('stamps on hydrate too', () => {
    const container = document.createElement('div');
    container.innerHTML = '<span>hi</span>';
    document.body.append(container);

    hydrate(() => document.createTextNode('hi'), container);

    expect(container.getAttribute('data-fluixi')).toBe(versions.core ?? versions.dom);
  });

  it('stamps the core version once core has registered it', () => {
    // Core sits above this package, so it pushes its version down rather than being
    // imported, the alternative is a dependency cycle.
    registerCoreVersion('9.9.9-test');
    const container = document.createElement('div');
    document.body.append(container);

    render(() => document.createTextNode('hi'), container);

    expect(container.getAttribute('data-fluixi')).toBe('9.9.9-test');
    expect(globalThis.Fluixi?.core).toBe('9.9.9-test');
  });
});

describe('the version mark in production', () => {
  const previous = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = previous;
    delete (globalThis as { __DEV__?: boolean }).__DEV__;
  });

  it('marks the element without publishing the release', () => {
    process.env.NODE_ENV = 'production';
    // What a production build defines; the NODE_ENV fallback is read once per page.
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    expect(versionMark()).toBe('');
    delete globalThis.Fluixi;
    const container = document.createElement('div');
    document.body.append(container);
    render(() => document.createTextNode('hi'), container);
    expect(container.getAttribute('data-fluixi')).toBe('');
    // Nor on the global: the versions are a development aid.
    expect(globalThis.Fluixi).toBeUndefined();
  });
});
