// The agent side of the rendezvous.
//
// A browser extension or a dev-server injection runs this before the application loads. It
// leaves a global behind; when the app's copy of @fluixi/reactive is first evaluated, the
// runtime finds it and hands over its own `observeReactiveNodes`. The graph is then built
// from the app's framework rather than this bundle's — two copies of the runtime each keep
// their own nodes, so watching the wrong one shows an empty graph.
//
// The app imports nothing and knows nothing about this. It also works against a production
// build: the reporting calls are unconditional, so only the names and source locations are
// missing there.
import { observeGraph, type ObservedGraph } from './observe.js';
import { serializeGraph, type GraphSnapshot } from './wire.js';

/** Kept in step with the name in @fluixi/reactive's observe.ts. */
const HOOK = '__FLUIXI_DEVTOOLS_HOOK__';

export interface DevtoolsHook {
  /** Called by the runtime when it loads. */
  inject(runtime: { observeReactiveNodes: (o: never) => () => void; version: string }): void;
  /** The graph, once a runtime has turned up. */
  readonly observed: ObservedGraph | null;
  /** The version of the runtime that injected, for a panel reporting what it is attached to. */
  readonly version: string | null;
  /** Everything, or only what moved since the last call. */
  snapshot(options?: { partial?: boolean }): GraphSnapshot | null;
}

/**
 * Install the hook. Returns the existing one if something got there first, so two agents on
 * one page share a graph rather than each seeing half of it.
 */
export function installDevtoolsHook(): DevtoolsHook {
  const host = globalThis as Record<string, unknown>;
  const existing = host[HOOK] as DevtoolsHook | undefined;
  if (existing) return existing;

  let observed: ObservedGraph | null = null;
  let version: string | null = null;

  const hook: DevtoolsHook = {
    inject(runtime) {
      version = runtime.version;
      observed ??= observeGraph({ observe: runtime.observeReactiveNodes as never });
    },
    get observed() {
      return observed;
    },
    get version() {
      return version;
    },
    snapshot({ partial = false } = {}) {
      if (!observed) return null;
      const changed = observed.sample();
      const dropped = observed.takeRemoved();
      if (!partial) return serializeGraph(observed.graph);
      return serializeGraph(observed.graph, Date.now(), { ids: changed, removed: dropped });
    },
  };

  host[HOOK] = hook;
  return hook;
}
