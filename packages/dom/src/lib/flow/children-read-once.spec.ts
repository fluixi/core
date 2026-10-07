// @vitest-environment jsdom
/**
 * A `children` getter builds its content on every read. Control flow reads it once per
 * render: a second read built a second copy, which under hydration meant the server's nodes
 * went to the first build while the second, the one shown, was made new beside them.
 */
import { describe, it, expect } from 'vitest';
import { createRoot, createSignal } from '@fluixi/reactive/signal';
import { ErrorBoundary } from './error-boundary.js';
import { Match, Switch } from './switch.js';

const read = (out: unknown): unknown => (typeof out === 'function' ? (out as () => unknown)() : out);

describe('children are built once per render', () => {
  it('Switch builds the matching branch once', () => {
    let builds = 0;
    const [on] = createSignal(true);
    createRoot(() => {
      const view = Switch({
        children: [
          Match({
            when: () => on(),
            get children() {
              builds += 1;
              return 'branch';
            },
          }),
        ],
      } as never);
      expect(read(view)).toBe('branch');
    });
    expect(builds).toBe(1);
  });

  it('ErrorBoundary builds its children once', () => {
    let builds = 0;
    createRoot(() => {
      const view = ErrorBoundary({
        fallback: 'failed',
        get children() {
          builds += 1;
          return 'content';
        },
      });
      expect(read(view)).toBe('content');
    });
    expect(builds).toBe(1);
  });
});
