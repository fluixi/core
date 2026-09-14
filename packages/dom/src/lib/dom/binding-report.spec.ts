// @vitest-environment jsdom
//
// The dom half of the devtools binding contract. Devtools tests that it turns these reports
// into named targets; this tests that the reports are made at all — the two halves are in
// different packages, and a binding that quietly stopped reporting would break neither suite
// on its own.
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, createSignal, createMemo, observeReactiveNodes } from '@fluixi/reactive/signal';
import { applyUse, handleRef, holeScope, insert, setDynamicAttribute, setDynamicProperty } from './runtime.js';
import { createComponent } from './integration.js';
import { hydration } from './hydration-state.js';

interface Bound {
  target: unknown;
  kind: string;
  name?: string;
}

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  stop = undefined;
});

/** Watch, and collect only what the dom said it was binding. */
function watch(): Bound[] {
  const seen: Bound[] = [];
  stop = observeReactiveNodes({
    created() {},
    bound(_node, target, kind, name) {
      seen.push({ target, kind, name });
    },
  });
  return seen;
}

describe('a dom binding says what it writes', () => {
  it('reports the element and the attribute name', () => {
    const seen = watch();
    const el = document.createElement('div');
    createRoot(() => {
      const [title] = createSignal('hi');
      setDynamicAttribute(el, 'title', title);
    });
    expect(seen).toContainEqual({ target: el, kind: 'attribute', name: 'title' });
  });

  it('reports a property binding as a property', () => {
    const seen = watch();
    const el = document.createElement('input');
    createRoot(() => {
      const [value] = createSignal('a');
      setDynamicProperty(el, 'value', value);
    });
    expect(seen).toContainEqual({ target: el, kind: 'property', name: 'value' });
  });

  it('reports where content goes, so a text hole can be found', () => {
    const seen = watch();
    const parent = document.createElement('p');
    createRoot(() => {
      const [text] = createSignal('one');
      insert(parent, text);
    });
    // The marker or the parent, depending on how the hole was set up; either locates it.
    expect(seen.some((b) => b.kind === 'content')).toBe(true);
  });

  it('says nothing when a binding is not reactive', () => {
    const seen = watch();
    const el = document.createElement('div');
    // A static attribute never becomes an effect, so there is nothing to attribute.
    setDynamicAttribute(el, 'title', 'fixed');
    expect(seen).toEqual([]);
  });

  it('costs nothing when nobody is watching', () => {
    const el = document.createElement('div');
    createRoot(() => {
      const [title] = createSignal('hi');
      // No observer registered: this must not throw and must not need one.
      expect(() => setDynamicAttribute(el, 'title', title)).not.toThrow();
    });
    expect(el.getAttribute('title')).toBe('hi');
  });
});

describe('a hole keeps where it was written', () => {
  function hole(): Node {
    const host = document.createElement('div');
    host.innerHTML = '<!--fx--><!--fx/-->';
    return host.firstChild!;
  }

  it('carries the tag onto the accessor hydration wraps', () => {
    const accessor = () => 'x';
    (accessor as Record<string, unknown>)['__fx_at'] = { line: 11, column: 11 };

    hydration.active = true;
    try {
      const out = holeScope(hole(), () => accessor);
      // A different function, or the cursor could not be replaced when it is read.
      expect(out).not.toBe(accessor);
      expect((out as Record<string, unknown>)['__fx_at']).toEqual({ line: 11, column: 11 });
    } finally {
      hydration.active = false;
    }
  });

  it('leaves an untagged accessor alone', () => {
    const accessor = () => 'x';
    hydration.active = true;
    try {
      const out = holeScope(hole(), () => accessor);
      expect('__fx_at' in (out as object)).toBe(false);
    } finally {
      hydration.active = false;
    }
  });
});

/**
 * The other half of what a watcher needs about a component: what it was handed. Reported
 * from `createComponent`, where the computation it belongs to is still the running one.
 */
describe('a component says what it was given', () => {
  it('reports the props object, before the component runs', () => {
    const seen: { node: unknown; props: unknown }[] = [];
    let ranWith: unknown;
    stop = observeReactiveNodes({
      created() {},
      props(node, props) {
        seen.push({ node, props });
      },
    });

    createRoot(() => {
      const [name] = createSignal('Ada');
      // The memo is what a watcher draws the component as, so the report has to land inside
      // it — that is the node the props belong to.
      createMemo(() =>
        createComponent((p: any) => {
          ranWith = p;
          return null;
        }, { get text() { return name(); }, size: 'lg' }),
      )();
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]!.props).toBe(ranWith);
    expect(Object.keys(seen[0]!.props as object).sort()).toEqual(['size', 'text']);
  });

  it('reads nothing itself', () => {
    let reads = 0;
    stop = observeReactiveNodes({ created() {}, props() {} });
    createRoot(() => {
      createMemo(() =>
        createComponent(() => null, {
          get text() {
            reads++;
            return 'x';
          },
        }),
      )();
    });
    // The report holds the object. Reading a getter here would run the caller's expression
    // and subscribe whatever is running to it.
    expect(reads).toBe(0);
  });

  it('costs nothing when nobody is watching', () => {
    expect(() => createComponent(() => null, { a: 1 })).not.toThrow();
  });
});

describe('a directive says it was applied', () => {
  it('names the directive and the element it went on', () => {
    const seen: { kind: string; name: string }[] = [];
    stop = observeReactiveNodes({
      created() {},
      directive(_node, _target, kind, name) {
        seen.push({ kind, name });
      },
    });
    const el = document.createElement('div');
    function tooltip() {}
    createRoot(() => {
      createMemo(() => {
        applyUse(el, [[tooltip]]);
        return 1;
      })();
    });
    expect(seen).toEqual([{ kind: 'use', name: 'tooltip' }]);
  });

  it('still applies the directive when nobody is watching', () => {
    const el = document.createElement('div');
    let got: Element | null = null;
    applyUse(el, [[(node: Element) => (got = node)]]);
    expect(got).toBe(el);
  });
});

describe('a ref says which variable holds it', () => {
  it('takes the name the compiler marked on the value', () => {
    const seen: { kind: string; name: string }[] = [];
    stop = observeReactiveNodes({
      created() {},
      directive(_node, _target, kind, name) {
        seen.push({ kind, name });
      },
    });
    const el = document.createElement('input');
    const box = { current: null as Element | null };
    // What `__fx_hole` leaves on the value when the build records locations.
    (box as Record<string, unknown>)['__fx_at'] = { line: 12, column: 9, name: 'boxRef' };

    createRoot(() => {
      createMemo(() => {
        handleRef(box, el);
        return 1;
      })();
    });
    expect(seen).toEqual([{ kind: 'ref', name: 'boxRef' }]);
    expect(box.current).toBe(el);
  });

  it('falls back to the function name when nothing marked it', () => {
    const seen: string[] = [];
    stop = observeReactiveNodes({
      created() {},
      directive(_node, _target, _kind, name) {
        seen.push(name);
      },
    });
    const el = document.createElement('input');
    function keepEl() {}
    createRoot(() => {
      createMemo(() => {
        handleRef(keepEl, el);
        return 1;
      })();
    });
    expect(seen).toEqual(['keepEl']);
  });
});
