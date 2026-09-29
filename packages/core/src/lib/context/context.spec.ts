// @vitest-environment jsdom
//
// The context users actually import is this one, not the reactive primitive underneath it.
// These check that what they write is what a watcher sees.
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, createMemo, observeReactiveNodes } from '@fluixi/reactive/signal';
import { composeProviders, createContext, requireContext, useContext } from './context.js';

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  stop = undefined;
});

/** Only what the context reports, in order. */
function watch(): { kind: string; name: string }[] {
  const seen: { kind: string; name: string }[] = [];
  stop = observeReactiveNodes({
    created() {},
    context(_node: unknown, id: symbol, kind: string) {
      seen.push({ kind, name: String(id.description) });
    },
  } as never);
  return seen;
}

describe('the context a user writes', () => {
  it('reports a provide through the public createContext', () => {
    const seen = watch();
    const theme = createContext('light', 'theme');
    createRoot(() => {
      createMemo(() => {
        theme.Provider({ value: 'dark', children: null });
        return 1;
      })();
    });
    expect(seen).toContainEqual({ kind: 'provide', name: 'theme' });
  });

  it('reports a read, and gives back the provided value', () => {
    const seen = watch();
    const theme = createContext('light', 'theme');
    let got: string | undefined;
    createRoot(() => {
      createMemo(() => {
        theme.Provider({
          value: 'dark',
          get children() {
            got = useContext(theme);
            return null;
          },
        });
        return 1;
      })();
    });
    expect(got).toBe('dark');
    expect(seen).toContainEqual({ kind: 'read', name: 'theme' });
  });

  it('reports a read that found nothing, and answers with the default', () => {
    const seen = watch();
    const theme = createContext('light', 'theme');
    let got: string | undefined;
    createRoot(() => {
      createMemo(() => {
        got = useContext(theme);
        return 1;
      })();
    });
    expect(got).toBe('light');
    expect(seen).toContainEqual({ kind: 'read', name: 'theme' });
  });

  it('names the context it was given, not the primitive default', () => {
    const seen = watch();
    const anon = createContext('x');
    createRoot(() => {
      createMemo(() => {
        anon.Provider({ value: 'y', children: null });
        return 1;
      })();
    });
    expect(seen[0]!.name).toBe('context');
  });
});

describe('composeProviders', () => {
  it('nests the Providers outermost first, reading accessors, with children lazy', () => {
    const A = createContext('a0', 'a');
    const B = createContext('b0', 'b');
    let reads = 0;
    const seen = createRoot(() =>
      composeProviders([[A, 'outer'], [B, () => 'from accessor'], [A, 'inner']], {
        get children() {
          reads++;
          return [useContext(A), useContext(B)];
        },
      }),
    );
    expect(seen).toEqual(['inner', 'from accessor']);
    expect(reads).toBe(1);
  });

  it('hands the children straight back with no Providers', () => {
    expect(createRoot(() => composeProviders([], { children: 'plain' }))).toBe('plain');
  });
});

describe('requireContext', () => {
  const Tabs = createContext<string | null>(null, 'tabs');

  it('throws with no Provider above, naming the context', () => {
    expect(() => createRoot(() => requireContext(Tabs))).toThrow(/No Provider for tabs/);
  });

  it('returns the provided value, even when it equals the default', () => {
    const value = createRoot(() => Tabs.Provider({ value: null, get children() { return requireContext(Tabs); } }));
    expect(value).toBeNull();
  });
});

