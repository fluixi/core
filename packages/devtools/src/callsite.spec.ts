import { describe, it, expect } from 'vitest';
import { callSite } from './callsite.js';

/** What a browser hands back while a package is creating a signal for the caller. */
const STACK = `Error
    at reportReactiveNode (http://localhost:5175/@fs/repo/packages/reactive/src/lib/signal/graph/observe.ts:97:14)
    at createSignal (http://localhost:5175/@fs/repo/packages/reactive/src/lib/signal/graph/compat.ts:87:3)
    at locale (http://localhost:5175/@fs/repo/packages/core/src/lib/i18n/index.ts:111:42)
    at Counter (http://localhost:5175/src/App.tsx:6:16)
    at http://localhost:5175/src/main.tsx:5:23`;

describe('callSite', () => {
  it('skips the framework and names the line that asked', () => {
    expect(callSite(STACK, 'http://localhost:5175')).toEqual({
      location: { file: 'src/App.tsx', line: 6, column: 16 },
      external: false,
    });
  });

  it('drops a dev server cache buster', () => {
    const stack = `Error\n    at Counter (http://localhost:5175/src/App.tsx?t=1712345:6:16)`;
    expect(callSite(stack, 'http://localhost:5175')?.location.file).toBe('src/App.tsx');
  });

  it('falls back to the package when no application frame is above it', () => {
    // A node made while a package was loading: nothing of the application is on the stack,
    // and the package's own line is the only thing that can explain the node.
    const stack = [
      'Error',
      '    at reportReactiveNode (/repo/packages/reactive/src/lib/signal/graph/observe.ts:97:14)',
      '    at createSignal (/repo/packages/reactive/src/lib/signal/graph/compat.ts:87:3)',
      '    at /repo/packages/core/src/lib/router/data.ts:118:33',
    ].join('\n');
    expect(callSite(stack)).toEqual({
      location: { file: 'repo/packages/core/src/lib/router/data.ts', line: 118, column: 33, external: true },
      external: true,
    });
  });

  it('has nothing to say when the whole stack is the reporting itself', () => {
    const stack = `Error\n    at reportReactiveNode (/repo/packages/reactive/src/lib/signal/graph/observe.ts:97:14)`;
    expect(callSite(stack)).toBeUndefined();
  });

  it('ignores a stack it cannot read', () => {
    expect(callSite(undefined)).toBeUndefined();
    expect(callSite('no frames here')).toBeUndefined();
  });
});
