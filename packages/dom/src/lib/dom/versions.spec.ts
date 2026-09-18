import { describe, it, expect, beforeEach } from 'vitest';
import { render } from './runtime.js';
import { hydrate } from './hydration.js';
import { registerCoreVersion, versions } from './versions.js';

describe('version stamping', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('stamps the runtime versions on render', () => {
    const container = document.createElement('div');
    document.body.append(container);

    render(() => document.createTextNode('hi'), container);

    expect(container.getAttribute('fx-dom')).toBe(versions.dom);
    expect(container.getAttribute('fx-reactive')).toBe(versions.reactive);
  });

  // The bug this file exists for: only core's render stamped, so every app that reached
  // the DOM through startClient -> hydrate had no version attributes at all.
  it('stamps on hydrate too', () => {
    const container = document.createElement('div');
    container.innerHTML = '<span>hi</span>';
    document.body.append(container);

    hydrate(() => document.createTextNode('hi'), container);

    expect(container.getAttribute('fx-dom')).toBe(versions.dom);
    expect(container.getAttribute('fx-reactive')).toBe(versions.reactive);
  });

  it('stamps the core version once core has registered it', () => {
    // Core sits above this package, so it pushes its version down rather than being
    // imported, the alternative is a dependency cycle.
    registerCoreVersion('9.9.9-test');
    const container = document.createElement('div');
    document.body.append(container);

    render(() => document.createTextNode('hi'), container);

    expect(container.getAttribute('fluixi')).toBe('9.9.9-test');
    expect(globalThis.Fluixi?.core).toBe('9.9.9-test');
  });
});
