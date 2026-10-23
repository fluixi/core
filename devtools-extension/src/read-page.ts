/**
 * Reading the graph out of the inspected page.
 *
 * `inspectedWindow.eval` runs in the page's own world, which is where the agent left the
 * hook: so the panel asks the page directly and there is no relay, no service worker and no
 * message protocol between them. What comes back is json: the eval boundary only carries
 * structured values, and the graph holds sets and live nodes.
 *
 * The expression is a string because it is evaluated in the page, not here. It is written
 * defensively for the same reason: a page with no Fluixi in it, or one still loading, has to
 * answer rather than throw.
 */
import type { GraphSnapshot } from '@fluixi/devtools/wire';

/** Kept in step with the name in @fluixi/reactive's observe.ts. */
const HOOK = '__FLUIXI_DEVTOOLS_HOOK__';

export type PageState =
  | { kind: 'graph'; snapshot: GraphSnapshot; version: string | null }
  /** The hook is there and no runtime has claimed it: not a Fluixi page, or not loaded yet. */
  | { kind: 'waiting' }
  /** The agent never ran: a page opened before the extension, or a restricted url. */
  | { kind: 'absent' }
  | { kind: 'error'; message: string };

const read = (since?: number): string => `(() => {
  try {
    const hook = window['${HOOK}'];
    if (!hook || typeof hook.snapshot !== 'function') return JSON.stringify({ kind: 'absent' });
    const snapshot = hook.snapshot(${since === undefined ? '{}' : `{ partial: true, since: ${since} }`});
    if (!snapshot) return JSON.stringify({ kind: 'waiting' });
    return JSON.stringify({ kind: 'graph', snapshot: snapshot, version: hook.version || null });
  } catch (e) {
    return JSON.stringify({ kind: 'error', message: String((e && e.message) || e) });
  }
})()`;

/**
 * One read of the page.
 *
 * Without a cursor this asks for everything. The panel is re-created whenever devtools is
 * closed and reopened, and a delta stream that began before it existed has nothing to fold
 * into. With one it asks for what came after, which is the difference between a few hundred
 * bytes and the whole graph four times a second.
 *
 * The cursor belongs to this panel alone. The dev server's own agent watches the same hook
 * and keeps its own, so neither takes the other's changes.
 */
export function readPage(since?: number): Promise<PageState> {
  return new Promise((resolve) => {
    chrome.devtools.inspectedWindow.eval(read(since), (result, error) => {
      if (error) {
        // A navigation mid-eval, or a page the extension is not allowed into.
        const message = (error as { value?: string; description?: string }).description
          ?? (error as { value?: string }).value
          ?? 'the page could not be read';
        resolve({ kind: 'error', message });
        return;
      }
      try {
        resolve(JSON.parse(result as string) as PageState);
      } catch {
        resolve({ kind: 'error', message: 'the page answered with something unreadable' });
      }
    });
  });
}
