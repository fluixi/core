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
import { withoutElements } from './dom.js';
import { observeGraph, type ObservedGraph } from './observe.js';
import { hideHighlight, showHighlight } from './highlight.js';
import { serializeGraph, type GraphEvent, type GraphSnapshot } from './wire.js';

/** A few hundred interactions' worth. */
const HISTORY = 500;

/** Kept in step with the name in @fluixi/reactive's observe.ts. */
const HOOK = '__FLUIXI_DEVTOOLS_HOOK__';

export interface DevtoolsHook {
  /**
   * Called by the runtime when it loads.
   *
   * `watch` is how the caller says it brought its own devtools. Two copies live on a page
   * routinely — a browser extension injects one at document_start and an application's own
   * agent loads another — and the first to arrive owns the hook. Without this the graph is
   * built by whichever copy got there first, which for an installed extension is a build
   * that knows nothing of the compiler that made the application.
   */
  inject(runtime: {
    observeReactiveNodes: (o: never) => () => void;
    version: string;
    watch?: (options: { observe: (o: never) => () => void }) => ObservedGraph;
  }): void;
  /** The graph, once a runtime has turned up. */
  readonly observed: ObservedGraph | null;
  /** The version of the runtime that injected, for a panel reporting what it is attached to. */
  readonly version: string | null;
  /**
   * How many copies of this module tried to install one.
   *
   * Ordinarily two: an extension's and the application's own. Worth having for a panel
   * reporting what it is attached to; which one watches is settled by `inject`.
   */
  readonly copies: number;
  /**
   * Everything, or only what moved after `since`.
   *
   * The cursor comes back on every snapshot; a consumer folding in deltas keeps it and
   * hands it back. Asking consumes nothing, so a page with a browser panel and an editor
   * panel watching at the same time gives each of them every change. Draining a shared
   * one meant whichever polled first took them.
   *
   * A cursor older than the removal log gets a full snapshot instead, since there is no
   * longer any way to say what went missing.
   */
  snapshot(options?: { partial?: boolean; since?: number }): GraphSnapshot | null;
  /**
   * Draw the overlay over something in the page, for a panel that is not in it.
   *
   * A number is a node, and covers everywhere it reaches. A string is one element, written
   * as the tree keys them: the tag's id, the index of the root it rendered, then a child
   * index per step — `12:0/1/2`. Null clears it.
   */
  highlight(target: number | string | null): void;
}

/**
 * Install the hook. Returns the existing one if something got there first, so two agents on
 * one page share a graph rather than each seeing half of it.
 */
export function installDevtoolsHook(): DevtoolsHook {
  const host = globalThis as Record<string, unknown>;
  const existing = host[HOOK] as (DevtoolsHook & { copies?: number }) | undefined;
  if (existing) {
    // Counted, not complained about. Two copies is the ordinary case — an extension injects
    // one before anything else runs and the application's agent loads another — and `inject`
    // sorts out which of them ends up watching.
    existing.copies = (existing.copies ?? 1) + 1;
    return existing;
  }

  let observed: ObservedGraph | null = null;
  /** Whether whoever is watching brought its own devtools, rather than being given this one. */
  let owned = false;
  let version: string | null = null;
  /** What has happened, for whoever asks. Bounded: nothing here is ever consumed. */
  const history: GraphEvent[] = [];

  const hook: DevtoolsHook = {
    copies: 1,
    inject(runtime) {
      version = runtime.version;
      if (!observed) {
        observed = (runtime.watch ?? observeGraph)({ observe: runtime.observeReactiveNodes } as never);
        owned = runtime.watch !== undefined;
        return;
      }
      // The runtime injects the moment it is evaluated, and it brings no devtools of its
      // own — so an extension's copy starts watching first. The application's agent runs
      // straight after, before any of its own modules have made a node, and hands over an
      // observer that matches the compiler that built it. That one takes over.
      if (owned || !runtime.watch) return;
      observed.detach();
      observed = runtime.watch({ observe: runtime.observeReactiveNodes } as never);
      owned = true;
    },
    get observed() {
      return observed;
    },
    get version() {
      return version;
    },
    highlight(target) {
      if (!observed || target === null) {
        hideHighlight();
        return;
      }
      if (typeof target === 'number') {
        const found = observed.elementsFor(target);
        if (found.length) showHighlight(found, observed.graph.get(target)?.label);
        else hideHighlight();
        return;
      }
      // Walked through the description rather than the elements, because that is what the
      // keys were built from: a tag's roots there include what it was mounted into and what
      // it writes to, neither of which it rendered.
      const [head, ...steps] = target.split('/');
      const [tag, root] = (head ?? '').split(':');
      let node = observed.domFor(Number(tag))[Number(root)];
      for (const step of steps) node = node?.children[Number(step)];
      const element = node?.element;
      if (element) showHighlight(element, element.tagName.toLowerCase());
      else hideHighlight();
    },
    snapshot({ partial = false, since } = {}) {
      if (!observed) return null;
      // Detection is shared and has to run: it is what notices anything moved at all.
      const changed = observed.sample();
      const cursor = observed.revision;
      // Kept, not handed out once. The hook can have more than one reader — a dev server
      // agent polling and a browser panel open at the same time — and draining here gave
      // each of them whichever events the other had not taken yet. Every event carries a
      // seq, so a reader keeps what is new to it.
      history.push(...observed.takeEvents());
      if (history.length > HISTORY) history.splice(0, history.length - HISTORY);
      const events = history.slice();
      // Described, not held: whoever reads this snapshot is usually not in the page, and the
      // elements would only cross as empty objects anyway.
      const dom = (id: number) => {
        const described = observed!.domFor(id);
        return described.length ? withoutElements(described) : undefined;
      };
      // The observer can be older than this hook. The application hands its own over and the
      // two are built separately, so a cursor is only offered when it can be honoured.
      const cursors = typeof observed.changedSince === 'function';
      // Everything, and the cursor to come back with. Also the answer for a consumer that
      // has fallen further behind than the log reaches.
      const whole = partial === false || since === undefined || !cursors || observed.outrun(since);
      if (whole) {
        // An older observer cannot say what was dropped after a revision, so a delta from
        // it would quietly keep nodes that are gone. Everything, every time, is correct.
        if (partial && !cursors) {
          return serializeGraph(observed.graph, Date.now(), {
            ids: changed,
            removed: observed.takeRemoved(),
            events,
            dom,
          });
        }
        return serializeGraph(observed.graph, Date.now(), { events, dom, cursor });
      }
      return serializeGraph(observed.graph, Date.now(), {
        ids: observed.changedSince(since),
        removed: observed.removedSince(since),
        events,
        dom,
        cursor,
      });
    },
  };

  host[HOOK] = hook;
  return hook;
}
