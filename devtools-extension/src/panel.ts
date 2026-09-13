/**
 * The panel.
 *
 * Everything drawn here comes from @fluixi/devtools — the same graph view, inspector, timeline
 * and detail panel the playground and the editor use. What this file owns is the polling, the
 * toolbar and the two splitters.
 */
import {
  applySnapshot,
  createDetailPanel,
  createGraphView,
  createComponentTree,
  type ElementPick,
  createInspector,
  createKindFilter,
  makeFloatable,
  createTimeline,
  copyText,
  graphToJson,
  CHANGE_CSS,
  DETAIL_PANEL_CSS,
  DEVTOOLS_CSS,
  INSPECTOR_CSS,
  FLOAT_CSS,
  KIND_FILTER_CSS,
  TREE_CSS,
  TIMELINE_CSS,
  type GraphDirection,
  type RNode,
} from '@fluixi/devtools';
import { readPage } from './read-page.js';

/** Fast enough to watch a propagation, slow enough to leave the page alone. */
const INTERVAL = 250;

function injectStyles(): void {
  const style = document.createElement('style');
  style.textContent = [DEVTOOLS_CSS, INSPECTOR_CSS, TIMELINE_CSS, DETAIL_PANEL_CSS, CHANGE_CSS, KIND_FILTER_CSS, TREE_CSS, FLOAT_CSS].join('\n');
  document.head.appendChild(style);
}

/** Said only when it changes: rewriting the line four times a second makes it unselectable. */
function setStatus(text: string, tone: 'info' | 'error' = 'info'): void {
  const el = document.getElementById('status');
  if (!el || (el.textContent === text && el.dataset.tone === tone)) return;
  el.textContent = text;
  el.dataset.tone = tone;
}

/**
 * One drag, for both handles.
 *
 * Capture keeps it alive across whatever is underneath; `lostpointercapture` ends it too,
 * since capture can be taken away without a release.
 */
function drag(handle: HTMLElement, onMove: (e: PointerEvent) => void): void {
  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    handle.classList.add('dragging');

    const move = (e: Event): void => onMove(e as PointerEvent);
    const stop = (): void => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', stop);
      handle.removeEventListener('pointercancel', stop);
      handle.removeEventListener('lostpointercapture', stop);
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      handle.classList.remove('dragging');
    };

    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
    handle.addEventListener('lostpointercapture', stop);
  });
}

function main(): void {
  injectStyles();
  const svg = document.querySelector('svg') as SVGSVGElement;
  let graph: Map<number, RNode> = new Map();
  let selected: number | null = null;
  /** An element row, which is not a node and so cannot be held as an id. */
  let picked: ElementPick | null = null;

  /**
   * Open a file in the Sources panel.
   *
   * The graph carries a path, and Sources wants a url. A path the compiler marked is
   * relative to the page's own root, so the inspected window's origin completes it; a
   * package path is already absolute and is tried as a file url.
   */
  const openSource = (where: { file?: string; line?: number; column?: number }): void => {
    if (!where.file) return;
    const line = Math.max(0, (where.line ?? 1) - 1);
    const open = (url: string): void => chrome.devtools.panels.openResource(url, line, () => {});
    if (where.file.startsWith('/') || /^(Users|home|var|opt|private)\//.test(where.file)) {
      open(`file://${where.file.startsWith('/') ? '' : '/'}${where.file}`);
      return;
    }
    chrome.devtools.inspectedWindow.eval('location.origin', (origin) => {
      open(typeof origin === 'string' ? `${origin}/${where.file}` : where.file!);
    });
  };

  const inspector = createInspector(document.getElementById('inspector') as HTMLElement, {
    onReveal: openSource,
  });
  inspector.clear();

  const tree = createComponentTree(document.getElementById('tree') as HTMLElement, {
    empty: 'nothing rendered yet',
    // Described by the agent and sent with the snapshot: this panel holds no elements.
    domFor: (id) => graph.get(id)?.dom ?? [],
    // Nor can it draw on the page. The hook can, so it is asked to.
    onHover: (id, _element, path) => {
      const target = path !== undefined ? JSON.stringify(path) : id === null ? 'null' : String(id);
      chrome.devtools.inspectedWindow.eval(
        `globalThis.__FLUIXI_DEVTOOLS_HOOK__?.highlight?.(${target})`,
        () => {},
      );
    },
    onSelect: (id) => {
      selected = id;
      picked = null;
      view.select(id);
      inspector.show(view.shown.size ? view.shown : graph, id);
    },
    onPick: (pick) => {
      picked = pick;
      selected = null;
      view.select(null);
      inspector.showElement(view.shown.size ? view.shown : graph, pick);
    },
    onReveal: (id) => {
      const node = (view.shown.size ? view.shown : graph).get(id);
      if (node) openSource(node.source ?? node.usedAt ?? node.declaredAt ?? {});
    },
    // An element has no line of its own, so the tag that rendered it is where to go.
    onRevealPick: (pick) => {
      if (pick.at) {
        openSource(pick.at);
        return;
      }
      const node = pick.owner === undefined ? undefined : (view.shown.size ? view.shown : graph).get(pick.owner);
      // Where it was written, not where the framework instantiated it.
      if (node) openSource(node.declaredAt ?? node.source ?? node.usedAt ?? {});
    },
  });
  tree.clear();

  const view = createGraphView(svg, {
    onReveal: (node) => openSource(node.source ?? node.usedAt ?? node.declaredAt ?? {}),
    onSelect: (node) => {
      selected = node ? node.id : null;
      picked = null;
      inspector.show(view.shown.size ? view.shown : graph, selected);
    },
  });

  const detail = createDetailPanel(document.body, {
    onPick: (id) => {
      selected = id;
      picked = null;
      view.select(id);
      inspector.show(view.shown.size ? view.shown : graph, id);
    },
  });

  const timeline = createTimeline(document.getElementById('timeline') as HTMLElement, {
    empty: 'no updates yet — interact with the page',
    onSelect: (ids) => view.focus(ids),
    onExpand: (commit) => detail.open(commit, view.shown.size ? view.shown : graph),
  });
  timeline.clear();

  const on = (id: string, run: () => void): void =>
    document.getElementById(id)?.addEventListener('click', run);

  on('zoom-out', () => view.zoomBy(1 / 1.25));
  on('zoom-in', () => view.zoomBy(1.25));
  on('zoom-reset', () => view.resetView());
  on('direction', () => {
    const next: GraphDirection = view.direction === 'horizontal' ? 'vertical' : 'horizontal';
    view.setDirection(next);
    const ico = document.querySelector('#direction .ico');
    if (ico) ico.textContent = next === 'vertical' ? '↕' : '↔';
  });
  on('grouping', () => {
    view.setGroupExternal(!view.groupExternal);
    document.getElementById('grouping')?.classList.toggle('on', view.groupExternal);
  });
  on('bindings', () => {
    view.setShowBindings(!view.showBindings);
    document.getElementById('bindings')?.classList.toggle('on', view.showBindings);
  });

  const kindsHost = document.getElementById('kinds');
  if (kindsHost) createKindFilter(kindsHost, { onChange: (kinds) => view.setKinds(kinds) });
  on('export', () => {
    const button = document.getElementById('export');
    void copyText(graphToJson(view.shown.size ? view.shown : graph), button?.querySelector('.lbl') as HTMLElement);
  });
  on('tree-toggle', () => {
    const hidden = document.body.classList.toggle('no-tree');
    document.getElementById('tree-toggle')?.classList.toggle('on', !hidden);
  });
  on('timeline-toggle', () => {
    const hidden = document.body.classList.toggle('no-timeline');
    document.getElementById('timeline-toggle')?.classList.toggle('on', !hidden);
    if (hidden) view.focus(null);
  });

  const split = document.getElementById('split');
  if (split) {
    drag(split, (e) => {
      const height = Math.max(60, Math.min(window.innerHeight - 120, window.innerHeight - e.clientY));
      document.documentElement.style.setProperty('--bottom-height', `${Math.round(height)}px`);
    });
  }
  const treeSplit = document.getElementById('tree-split');
  if (treeSplit) {
    drag(treeSplit, (e) => {
      const width = Math.max(120, Math.min(window.innerWidth - 240, e.clientX));
      document.documentElement.style.setProperty('--tree-width', `${Math.round(width)}px`);
    });
  }
  const vertical = document.getElementById('timeline-split');
  if (vertical) {
    drag(vertical, (e) => {
      const width = Math.max(180, Math.min(window.innerWidth - 160, window.innerWidth - e.clientX));
      document.documentElement.style.setProperty('--timeline-width', `${Math.round(width)}px`);
    });
  }

  // Each pane can be lifted out to be read properly, and put back where it was.
  for (const [id, title] of [['tree', 'tree'], ['inspector', 'inspector'], ['timeline', 'history']] as const) {
    const pane = document.getElementById(id);
    if (pane) makeFloatable(pane, { title });
  }

  const tick = (): void => {
    view.update(graph, Date.now());
    const map = view.shown.size ? view.shown : graph;
    if (picked) inspector.showElement(map, picked);
    else inspector.show(map, selected);
    tree.render(graph, selected);
    timeline.render(view.shown.size ? view.shown : graph);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  async function poll(): Promise<void> {
    const state = await readPage();
    switch (state.kind) {
      case 'graph':
        graph = applySnapshot(graph, state.snapshot);
        if (state.snapshot.events?.length) timeline.push(state.snapshot.events);
        setStatus(
          `Live · ${graph.size} nodes${state.version ? ` · fluixi ${state.version}` : ''}`,
        );
        break;
      case 'waiting':
        setStatus('Waiting for the application — reload the page if it is already open');
        break;
      case 'absent':
        // The agent runs at document_start, so a page open before the extension has none.
        setStatus('No Fluixi application here. Reload the page to attach.', 'error');
        break;
      case 'error':
        setStatus(state.message, 'error');
        break;
    }
  }

  void poll();
  setInterval(() => void poll(), INTERVAL);

  // A reload replaces the page's hook, and with it every node id.
  chrome.devtools.network.onNavigated.addListener(() => {
    graph = new Map();
    selected = null;
    view.clear();
    inspector.clear();
    timeline.clear();
    tree.clear();
    detail.close();
  });
}

main();
