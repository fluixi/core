import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  createRoot,
  createSignal,
  createMemo,
  createEffect,
  createRenderEffect,
} from './compat.js';
import {
  observeReactiveNodes,
  openReactiveScope,
  withReactiveScope,
  closeReactiveScope,
  type ReactiveNodeReport,
} from './observe.js';

const HOOK = '__FLUIXI_DEVTOOLS_HOOK__';
const host = globalThis as Record<string, unknown>;

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  stop = undefined;
  delete host[HOOK];
  vi.resetModules();
});

const collect = () => {
  const created: ReactiveNodeReport[] = [];
  const ran: unknown[] = [];
  const disposed: unknown[] = [];
  stop = observeReactiveNodes({
    created: (r) => created.push(r),
    ran: (n) => ran.push(n),
    disposed: (n) => disposed.push(n),
  });
  return { created, ran, disposed };
};

describe('observeReactiveNodes', () => {
  it('reports the node, the handle and the name the call site gave', () => {
    const seen = collect();
    createRoot(() => createSignal(1, { name: 'count' }));

    expect(seen.created).toHaveLength(1);
    expect(seen.created[0]).toMatchObject({ kind: 'signal', name: 'count' });
    expect(typeof seen.created[0]!.handle).toBe('function');
    expect(seen.created[0]!.node).toBeTypeOf('object');
  });

  it('reports a recompute, which is how an effect says it did something', () => {
    const seen = collect();
    let set!: (n: number) => number;
    createRoot(() => {
      const [count, setCount] = createSignal(0);
      set = setCount as (n: number) => number;
      createEffect(() => void count());
    });
    const effect = seen.created.find((r) => r.kind === 'effect')!;
    expect(seen.ran.filter((n) => n === effect.node)).toHaveLength(1);

    set(1);
    expect(seen.ran.filter((n) => n === effect.node)).toHaveLength(2);
  });

  it('reports a render effect as plumbing, so a watcher can skip it and still use it', () => {
    const seen = collect();
    createRoot(() => {
      const [count] = createSignal(0);
      createRenderEffect(() => void count());
      createEffect(() => void count());
    });
    const effects = seen.created.filter((r) => r.kind === 'effect');
    expect(effects.map((r) => r.internal)).toEqual([true, false]);
  });

  it('reports an effect going away', () => {
    const seen = collect();
    let dispose!: () => void;
    createRoot(() => {
      dispose = createEffect(() => {});
    });
    const effect = seen.created.find((r) => r.kind === 'effect')!;
    dispose();
    expect(seen.disposed).toEqual([effect.node]);
  });

  it('reports nothing once it is stopped', () => {
    const seen = collect();
    stop?.();
    createRoot(() => createMemo(() => 1));
    expect(seen.created).toHaveLength(0);
  });

  it('hands the runtime over to a hook that was installed first', async () => {
    const injected: { version: string; observeReactiveNodes: unknown }[] = [];
    host[HOOK] = { inject: (runtime: never) => injected.push(runtime) };

    vi.resetModules();
    await import('./observe.js');

    expect(injected).toHaveLength(1);
    expect(injected[0]!.observeReactiveNodes).toBeTypeOf('function');
    expect(injected[0]!.version).toBeTypeOf('string');
  });

  it('survives a hook that throws, since that is the tool being broken', async () => {
    host[HOOK] = {
      inject() {
        throw new Error('bad tool');
      },
    };
    vi.resetModules();
    await expect(import('./observe.js')).resolves.toBeTruthy();
  });
});

describe('scopes', () => {
  it('tags what is created inside a scope, nests scopes, and reports the end', () => {
    const created: ReactiveNodeReport[] = [];
    const opened: Array<{ scope: object; name: string; parent?: object }> = [];
    const ended: object[] = [];
    stop = observeReactiveNodes({
      created: (r) => created.push(r),
      scope: (scope, info, parent) => opened.push({ scope, name: info.name, parent }),
      scopeEnded: (scope) => ended.push(scope),
    });

    const module = openReactiveScope({ kind: 'module', name: 'AuthModule' });
    let service: object | undefined;
    withReactiveScope(module, () => {
      service = openReactiveScope({ kind: 'service', name: 'AuthService', detail: 'AuthServiceToken' });
      withReactiveScope(service, () => createRoot(() => createSignal(null, { name: 'user' })));
    });
    createRoot(() => createSignal(0, { name: 'outside' }));
    closeReactiveScope(service!);

    expect(opened).toEqual([
      { scope: module, name: 'AuthModule', parent: undefined },
      { scope: service, name: 'AuthService', parent: module },
    ]);
    expect(created.find((r) => r.name === 'user')?.scope).toBe(service);
    expect(created.find((r) => r.name === 'outside')?.scope).toBeUndefined();
    expect(ended).toEqual([service]);
  });

  it('costs nothing unwatched: fn runs, nothing is kept', () => {
    const scope = openReactiveScope({ kind: 'element', name: '<fx-counter>' });
    expect(withReactiveScope(scope, () => 42)).toBe(42);
  });
});
