// @vitest-environment jsdom
/** A text the client renders differently from the server is reported in dev, then corrected. */
import { describe, it, expect, vi } from 'vitest';
import { createNativeElement, hydrate, insert } from '../index.js';

describe('hydrating a differing text', () => {
  it('warns, and writes the client text', () => {
    const warned = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const container = document.createElement('div');
    container.innerHTML = '<p>server</p>';
    hydrate(() => {
      const p = createNativeElement('p');
      insert(p, 'client');
      return p;
    }, container);
    expect(container.textContent).toBe('client');
    expect(warned).toHaveBeenCalledWith(expect.stringMatching(/hydration mismatch: expected text "client" but the server DOM has text "server"/));
    warned.mockRestore();
  });
});
