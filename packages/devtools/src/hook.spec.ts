// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, createSignal, createMemo, observeReactiveNodes } from '@fluixi/reactive/signal';
import { installDevtoolsHook, type DevtoolsHook } from './hook.js';

const HOOK = '__FLUIXI_DEVTOOLS_HOOK__';
const host = globalThis as Record<string, unknown>;

afterEach(() => {
  (host[HOOK] as DevtoolsHook | undefined)?.observed?.detach();
  delete host[HOOK];
});

/** What the runtime does when it finds the global. */
const injectRuntime = (hook: DevtoolsHook) =>
  hook.inject({ observeReactiveNodes: observeReactiveNodes as never, version: '0.0.0-test' });

describe('installDevtoolsHook', () => {
  it('has no graph until a runtime turns up', () => {
    const hook = installDevtoolsHook();
    expect(hook.observed).toBeNull();
    expect(hook.snapshot()).toBeNull();
  });

  it('watches through the runtime that injected, not its own copy', () => {
    const hook = installDevtoolsHook();
    let registered: unknown = null;
    hook.inject({
      observeReactiveNodes: ((observer: unknown) => {
        registered = observer;
        return () => {};
      }) as never,
      version: '0.0.0-test',
    });
    expect(registered).not.toBeNull();
    expect(hook.version).toBe('0.0.0-test');
  });

  it('produces a snapshot of an app that imported nothing', () => {
    const hook = installDevtoolsHook();
    injectRuntime(hook);

    createRoot(() => {
      const [count] = createSignal(2, { name: 'count' });
      createMemo(() => count() * 2, undefined, { name: 'double' });
    });

    const snapshot = hook.snapshot()!;
    const labels = snapshot.nodes.map((n) => `${n.kind}:${n.label}=${n.value}`);
    expect(labels).toContain('state:count=2');
    expect(labels).toContain('memo:double=4');
  });

  it('sends only what changed when asked for a partial', () => {
    const hook = installDevtoolsHook();
    injectRuntime(hook);

    let set!: (n: number) => number;
    createRoot(() => {
      const [count, setCount] = createSignal(0, { name: 'count' });
      set = setCount as (n: number) => number;
      createMemo(() => count() * 2, undefined, { name: 'double' });
    });
    const first = hook.snapshot()!;

    expect(hook.snapshot({ partial: true, since: first.cursor })!.nodes).toHaveLength(0);
    set(1);
    const delta = hook.snapshot({ partial: true, since: first.cursor })!;
    expect(delta.partial).toBe(true);
    expect(delta.nodes.map((n) => n.label).sort()).toEqual(['count', 'double']);
  });

  it('gives everything to a consumer that asks for a delta without a cursor', () => {
    const hook = installDevtoolsHook();
    injectRuntime(hook);
    createRoot(() => createSignal(0, { name: 'count' }));
    // Nothing to fold a delta into, so a delta would lose whatever came before.
    const answer = hook.snapshot({ partial: true })!;
    expect(answer.partial).toBeUndefined();
    expect(answer.nodes.length).toBeGreaterThan(0);
  });

  /**
   * A page can have two of them: a browser panel and the dev server's own agent. The cursor
   * used to be shared, so whichever polled first consumed the other's changes.
   */
  it('gives every consumer every change, whatever order they poll in', () => {
    const hook = installDevtoolsHook();
    injectRuntime(hook);
    let set!: (n: number) => number;
    createRoot(() => {
      const [, setCount] = createSignal(0, { name: 'count' });
      set = setCount as (n: number) => number;
    });

    // Both start from the same place.
    let panel = hook.snapshot()!.cursor;
    let agent = hook.snapshot()!.cursor;

    set(1);
    // The panel reads first and would previously have taken it.
    const seenByPanel = hook.snapshot({ partial: true, since: panel })!;
    const seenByAgent = hook.snapshot({ partial: true, since: agent })!;
    expect(seenByPanel.nodes.map((n) => n.label)).toContain('count');
    expect(seenByAgent.nodes.map((n) => n.label)).toContain('count');

    panel = seenByPanel.cursor;
    agent = seenByAgent.cursor;
    // And neither sees it a second time.
    expect(hook.snapshot({ partial: true, since: panel })!.nodes).toHaveLength(0);
    expect(hook.snapshot({ partial: true, since: agent })!.nodes).toHaveLength(0);
  });

  it('is shared, so two agents do not each watch half a graph', () => {
    const first = installDevtoolsHook();
    expect(installDevtoolsHook()).toBe(first);
  });

  it('only offers once, so injecting twice keeps the first graph', () => {
    const hook = installDevtoolsHook();
    injectRuntime(hook);
    const graph = hook.observed;
    injectRuntime(hook);
    expect(hook.observed).toBe(graph);
  });
});

describe('two readers', () => {
  it('gives both of them the same events', () => {
    // A dev-server agent polling and a browser panel open at once. Draining meant each got
    // whichever events the other had not taken yet.
    const hook = installDevtoolsHook();
    hook.inject({ observeReactiveNodes: observeReactiveNodes as never, version: '0' });

    let set!: (n: number) => number;
    createRoot(() => {
      const [, setCount] = createSignal(0, { name: 'count' });
      set = setCount as (n: number) => number;
    });
    hook.snapshot();
    set(1);

    const first = hook.snapshot()?.events ?? [];
    const second = hook.snapshot()?.events ?? [];
    expect(first.length).toBeGreaterThan(0);
    expect(second.map((e) => e.seq)).toEqual(first.map((e) => e.seq));
  });
});

/**
 * The first copy to load owns the graph. A browser extension injects at document_start, so
 * it wins over the application's own agent, and every panel then reads what that build
 * decided — silently, which is how a stale extension came to look like a bug in the graph.
 */
describe('two copies on one page', () => {
  it('keeps the one already watching, and counts the rest', () => {
    const first = installDevtoolsHook();
    expect(first.copies).toBe(1);
    const second = installDevtoolsHook();
    expect(second).toBe(first);
    expect(first.copies).toBe(2);
  });

  it('counts from an older build that kept no count of its own', () => {
    // What is actually on the page when an extension injected first.
    (host as Record<string, unknown>)[HOOK] = { snapshot: () => null } as unknown as DevtoolsHook;
    const hook = installDevtoolsHook();
    expect(hook.copies).toBe(2);
  });

  const warnings = (run: () => void): string => {
    const said: string[] = [];
    const was = console.warn;
    console.warn = (line: string) => said.push(line);
    try {
      run();
    } finally {
      console.warn = was;
    }
    return said.join(' ');
  };

  it('says nothing about it, since a second copy is the ordinary case', () => {
    // An extension injects one before anything else runs and the application's agent loads
    // another. Warning on every page for something `inject` then sorts out is noise.
    const first = installDevtoolsHook();
    first.inject({ observeReactiveNodes, version: '0.0.0' } as never);
    expect(warnings(() => installDevtoolsHook())).toBe('');
  });

  it('hands over to an agent that arrives after the runtime', () => {
    // What actually happens on a page: an extension installs the hook, the runtime injects
    // the moment it is evaluated and brings no devtools, then the application's own agent
    // loads and brings one.
    const hook = installDevtoolsHook();
    hook.inject({ observeReactiveNodes, version: '0.0.0' } as never);
    const first = hook.observed;
    expect(first).not.toBeNull();

    let detached = 0;
    (first as unknown as { detach: () => void }).detach = () => (detached += 1);
    const mine = { graph: new Map(), sample: () => [], takeRemoved: () => [], takeEvents: () => [],
      elementsFor: () => [], nodeAt: () => undefined, setValue: () => false, detach: () => {} };
    hook.inject({ observeReactiveNodes, version: '0.0.0', watch: () => mine } as never);

    expect(hook.observed).toBe(mine);
    expect(detached).toBe(1);
  });

  it('keeps the agent that already brought its own, whatever injects later', () => {
    const hook = installDevtoolsHook();
    const mine = { graph: new Map(), sample: () => [], takeRemoved: () => [], takeEvents: () => [],
      elementsFor: () => [], nodeAt: () => undefined, setValue: () => false, detach: () => {} };
    hook.inject({ observeReactiveNodes, version: '0.0.0', watch: () => mine } as never);
    hook.inject({ observeReactiveNodes, version: '0.0.0', watch: () => ({ ...mine }) } as never);
    expect(hook.observed).toBe(mine);
  });

  it('watches with the observer the caller brought', () => {
    let asked = 0;
    const hook = installDevtoolsHook();
    const mine = { graph: new Map(), sample: () => [], takeRemoved: () => [], takeEvents: () => [],
      elementsFor: () => [], nodeAt: () => undefined, setValue: () => false, detach: () => {} };
    hook.inject({
      observeReactiveNodes,
      version: '0.0.0',
      watch: () => ((asked += 1), mine),
    } as never);
    // The application ships its own devtools; the hook may belong to an extension.
    expect(asked).toBe(1);
    expect(hook.observed).toBe(mine);
  });
});

/**
 * A panel outside the page cannot hold elements, so it asks the hook to draw instead. The
 * string form is how the tree keys an element: tag id, which root it rendered, then a child
 * index per step.
 */
describe('highlighting from outside the page', () => {
  const asDom = (element: Element): { label: string; children: unknown[]; element: Element } => ({
    label: element.tagName.toLowerCase(),
    children: [...element.children].map(asDom),
    element,
  });

  it('resolves an element path against what the tag rendered', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p></p><section><b></b><i></i></section>';
    document.body.append(root);

    const hook = installDevtoolsHook();
    const drawn: Element[] = [];
    hook.inject({
      observeReactiveNodes,
      version: '0.0.0',
      watch: () => ({
        graph: new Map(),
        sample: () => [],
        takeRemoved: () => [],
        takeEvents: () => [],
        elementsFor: () => [],
        renderedFor: (id: number) => (id === 12 ? [root] : []),
        nodeAt: () => undefined,
        setValue: () => false,
        // What the real one builds out of what the tag rendered. A stub answering nothing
        // here would let a path resolve that the tree could never have keyed.
        domFor: (id: number) => (id === 12 ? [asDom(root)] : []),
        detach: () => {},
      }),
    } as never);

    // 12:0/1/0 — node 12, its first root, second child, first child of that.
    hook.highlight('12:0/1/0');
    const layer = document.getElementById('fx-highlight-layer');
    expect(layer).not.toBeNull();
    expect(layer!.textContent).toBe('b');
    drawn.length = 0;
  });

  it('clears on null', () => {
    const hook = installDevtoolsHook();
    hook.highlight(null);
    const layer = document.getElementById('fx-highlight-layer');
    expect(layer === null || layer.style.display === 'none').toBe(true);
  });

  it('says nothing for a path that no longer resolves', () => {
    const hook = installDevtoolsHook();
    expect(() => hook.highlight('99:0/4/4')).not.toThrow();
  });
});
