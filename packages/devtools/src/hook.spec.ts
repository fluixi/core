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
    hook.snapshot();

    expect(hook.snapshot({ partial: true })!.nodes).toHaveLength(0);
    set(1);
    const delta = hook.snapshot({ partial: true })!;
    expect(delta.partial).toBe(true);
    expect(delta.nodes.map((n) => n.label).sort()).toEqual(['count', 'double']);
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
