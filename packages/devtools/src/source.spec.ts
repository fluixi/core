import { describe, it, expect } from 'vitest';
import { markReactiveSource, takeReactiveSource } from './source.js';

describe('two copies of this module in one page', () => {
  it('share the mark, so the one watching reads what the other was given', () => {
    // A browser extension's agent and a dev server's both bundle this file, and only one
    // wins installSourceMarker. The marks used to land in that copy's own slot.
    const shared = (globalThis as Record<string, unknown>)['__FLUIXI_DEVTOOLS_MARKS__'] as {
      pending: unknown;
    };
    expect(shared).toBeDefined();

    markReactiveSource('src/App.tsx', 3, 8, 'count');
    expect(shared.pending).toMatchObject({ name: 'count' });

    // What the other copy would do: read straight off the shared object.
    expect(takeReactiveSource()).toMatchObject({ name: 'count' });
    expect(shared.pending).not.toMatchObject({ name: 'count' });
  });
});
