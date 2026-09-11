import { describe, it, expect } from 'vitest';
import { installSourceMarker, markReactiveSource, takeReactiveSource } from './source.js';

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

describe('how long a mark lasts', () => {
  /** What the compiler emits: a mark, then the call it belongs to. */
  const declare = (name: string, line: number): void => {
    markReactiveSource('src/App.ts', line, 4, name);
  };

  it('survives the call that took it, so what a store builds inside keeps its line', () => {
    declare('cart', 12);
    expect(takeReactiveSource()).toMatchObject({ name: 'cart', location: { line: 12 } });
    // The key signals the store makes underneath, at the same statement.
    expect(takeReactiveSource()).toMatchObject({ location: { line: 12 } });
    expect(takeReactiveSource()?.name).toBeUndefined();
  });

  it('is spent once the template starts building', () => {
    installSourceMarker();
    const hole = (globalThis as Record<string, unknown>)['__fx_hole'] as
      | (<T>(f: T, line: number, column: number) => T)
      | undefined;
    expect(hole).toBeTypeOf('function');

    declare('shown', 41);
    expect(takeReactiveSource()).toMatchObject({ name: 'shown' });

    // A component body is one synchronous run: the template goes up after the signals are
    // declared, and every memo it makes used to claim the last one's position.
    hole!(() => 1, 55, 70);
    expect(takeReactiveSource()).toBeNull();
  });
});
