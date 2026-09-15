// Playground app — compiles a multi-file project in-browser, mounts it, and graphs its
// reactivity via @fluixi/devtools. Left = file tree + editor; right = preview + graph.
import { createSignal, onMount } from '@fluixi/core';
import {
  createDetailPanel,
  createGraphView,
  createTimeline,
  DETAIL_PANEL_CSS,
  DEVTOOLS_CSS,
  VALUE_PANE_CSS,
  FLOAT_CSS,
  KIND_FILTER_CSS,
  TREE_CSS,
  createComponentTree,
  createInspector,
  hideHighlight,
  showHighlight,
  startPicking,
  createKindFilter,
  makeFloatable,
  copyText,
  graphToJson,
  type DetailPanel,
  type Inspector,
  type ElementPick,
  type ComponentTree,
  type GraphView,
  type ObservedGraph,
  type Timeline,
} from '@fluixi/devtools';
import { runProject, type RenderMode, type RunResult } from './run';

/** What the right-hand pane is showing. */
type OutputTab = 'preview' | 'compiled' | 'html' | 'css' | 'ssr';

const TAB_HINTS: Record<OutputTab, string> = {
  preview: 'The running page',
  compiled: 'What the compiler made of the open file',
  html: 'The document as it stands, shell and all',
  css: 'The stylesheets the run pulled in',
  ssr: 'What a server would have sent, before hydration',
};
import { formatCompiled } from './compile';
import { KNOWN_SPECIFIERS } from './modules';
import {
  createEditor,
  createViewer,
  setEditorTheme,
  setProjectLibs,
  type CodeEditor,
  type CodeViewer,
} from './editor';
import { examples } from './examples';
import { tree } from './tree';
import {
  decodeProject,
  encodeProject,
  findEntry,
  loadSavedProject,
  normalizePath,
  saveProject,
  validatePath,
  type Project,
  type ProjectFile,
} from './project';

function startingProject(): Project {
  const fromUrl = location.hash.startsWith('#p=') ? decodeProject(location.hash.slice(3)) : null;
  return structuredClone(fromUrl ?? loadSavedProject() ?? examples[0]);
}

export function Playground() {
  const initial = startingProject();

  const [files, setFiles] = createSignal<ProjectFile[]>(initial.files);
  const [openPath, setOpenPath] = createSignal(findEntry(initial.files, initial.entry));
  const [entry, setEntry] = createSignal(findEntry(initial.files, initial.entry));
  const [projectName, setProjectName] = createSignal(initial.name);
  const [output, setOutput] = createSignal<OutputTab>('preview');
  const [mode, setMode] = createSignal<RenderMode>(
    (localStorage.getItem('fluixi-pg-mode') as RenderMode) || 'spa',
  );
  const [error, setError] = createSignal<string | null>(null);
  const [compiled, setCompiled] = createSignal('');
  const [shared, setShared] = createSignal(false);
  const [saved, setSaved] = createSignal(false);
  const [theme, setTheme] = createSignal(localStorage.getItem('fluixi-pg-theme') ?? 'dark');
  const [sidebar, setSidebar] = createSignal(localStorage.getItem('fluixi-pg-sidebar') !== 'off');
  const [split, setSplit] = createSignal(Number(localStorage.getItem('fluixi-pg-split')) || 50);
  const [stats, setStats] = createSignal({ nodes: 0, edges: 0, runs: 0 });
  // Folders start open; shutting one is the exception worth remembering.
  const [collapsed, setCollapsed] = createSignal<ReadonlySet<string>>(new Set());
  const [layout, setLayout] = createSignal<'horizontal' | 'vertical'>('horizontal');
  const [grouped, setGrouped] = createSignal(true);
  const [picking, setPicking] = createSignal(false);
  const [bindings, setBindings] = createSignal(false);

  let rootEl!: HTMLDivElement;
  let rightEl!: HTMLElement;
  let graphRowEl!: HTMLElement;
  let graphBottomEl!: HTMLElement;
  let editorHost!: HTMLDivElement;
  let editor: CodeEditor;
  let previewEl!: HTMLDivElement;
  let compiledHost!: HTMLDivElement;
  let viewer: CodeViewer | null = null;
  let svgEl!: SVGSVGElement;
  let inspectorEl!: HTMLDivElement;
  let tagTree: ComponentTree | undefined;
  let timelineEl!: HTMLDivElement;
  let timeline: Timeline | null = null;
  let detail: DetailPanel | null = null;

  // The graph belongs to the preview iframe now, so it arrives with each run.
  let reactor: ObservedGraph | null = null;
  let view: GraphView | null = null;
  let current: RunResult | null = null;
  let selectedId: number | null = null;
  /** An element row from the tree. Not a node, so it cannot be held as an id. */
  let pickedEl: ElementPick | null = null;
  let raf = 0;
  let saveTimer = 0;

  /** The project as it stands in the editor, which is the source of truth for the text. */
  const snapshot = (): Project => ({
    name: projectName(),
    entry: entry(),
    files: files().map((f) => ({ path: f.path, code: editor?.read(f.path) || f.code })),
  });

  /** Includes the cards the view invents; the reactor's map has never heard of them. */
  const drawn = () => (view?.shown.size ? view.shown : reactor?.graph) ?? new Map();

  /**
   * The devtools inspector, not a copy. The playground had its own, and every field added to
   * the shared one had to be added twice or silently went missing. Same `.ins-*` classes.
   */
  let inspector: Inspector | null = null;

  function renderInspector() {
    if (!inspectorEl) return;
    inspector ??= createInspector(inspectorEl, {
      onReveal: openInEditor,
      onEdit: (id, raw) => reactor?.setValue(id, parseValue(raw)) ?? false,
    });
    if (pickedEl) inspector.showElement(drawn(), pickedEl);
    else inspector.show(drawn(), selectedId);
  }

  /**
   * What the reader typed, as a value.
   *
   * JSON first, so `3`, `false`, `"x"`, `[1,2]` mean what they look like. Anything else is
   * the text itself, which is what someone typing a bare word into a string signal meant.
   */
  function parseValue(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  /**
   * Jump the editor to a location from the graph.
   *
   * Only a file the playground itself holds: a node made inside a package has a path on
   * this machine, and there is nothing here to open it with.
   */
  function openInEditor(where: { file?: string; line?: number; column?: number }): void {
    if (!where.file || !where.line) return;
    const path = where.file.replace(/^\.?\//, '');
    const held = files().find((f) => f.path === path || f.path === `/${path}`);
    if (!held) return;
    setOpenPath(held.path);
    editor?.reveal(held.path, where.line, where.column);
  }

  function loop() {
    cancelAnimationFrame(raf);
    const tick = () => {
      if (view && reactor) {
        reactor.sample();
        // Straight off the observer; nothing serialises here.
        timeline?.push(reactor.takeEvents());
        view.update(reactor.graph);
        // Every frame, like the graph: the tree follows what is mounted, and only touches
        // the dom when the shape of it changes.
        tagTree?.render(reactor.graph, selectedId);
        timeline?.render(reactor.graph);
        let edges = 0;
        let runs = 0;
        for (const n of reactor.graph.values()) {
          edges += n.deps.size + n.writes.size;
          runs += n.runs;
        }
        // Only when a number moved. A fresh object every frame is never equal to the last
        // one, so this wrote sixty times a second and filled any watching timeline.
        const was = stats();
        if (was.nodes !== reactor.graph.size || was.edges !== edges || was.runs !== runs) {
          setStats({ nodes: reactor.graph.size, edges, runs });
        }
        if (selectedId != null) renderInspector();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  async function run() {
    current?.dispose();
    view ??= createGraphView(svgEl, {
      onSelect: (n) => {
        selectedId = n ? n.id : null;
        pickedEl = null;
        renderInspector();
      },
      onReveal: (n) => openInEditor(n.source ?? n.usedAt ?? n.declaredAt ?? {}),
    });
    // On the body: the graph pane clips whatever is inside it.
    detail ??= createDetailPanel(document.body, {
      onPick: (id) => {
        selectedId = id;
        pickedEl = null;
        view?.select(id);
        renderInspector();
      },
    });
    timeline ??= createTimeline(timelineEl, {
      empty: 'no updates yet — interact with the preview',
      onSelect: (ids) => view?.focus(ids),
      onExpand: (commit) => reactor && detail?.open(commit, reactor.graph),
    });
    selectedId = null;
    pickedEl = null;
    view.clear();
    // A new run is a new graph; the old ids name nodes that are gone.
    timeline.clear();
    detail.close();

    const project = snapshot();
    setFiles(project.files);
    current = await runProject(project, previewEl, mode());
    reactor = current.graph;
    setError(current.error);
    setCompiled(current.compiled.get(openPath()) ?? current.compiled.get(project.entry) ?? '');
    void showOutputText();
    loop();
  }

  /** The output side of the window: the running page, or what the compiler made of the file. */
  function showOutput(which: OutputTab) {
    setOutput(which);
    if (which === 'preview') return;
    void showOutputText();
    // Monaco measures itself on layout, and it was hidden until this frame.
    requestAnimationFrame(() => viewer?.layout());
  }

  /** What each tab reads out of the run, once it has one. */
  async function showOutputText() {
    if (!compiledHost) return;
    viewer ??= createViewer(compiledHost);
    const tab = output();
    if (tab === 'preview') return;

    if (tab === 'compiled') return showCompiled();
    if (!current) {
      viewer.show('// run to see the output', 'output.js');
      return;
    }
    if (tab === 'html') viewer.show(current.html() || '<!-- nothing rendered -->', 'output.html');
    if (tab === 'css') viewer.show(current.css() || '/* the project has no stylesheets */', 'output.css');
    if (tab === 'ssr') {
      viewer.show(
        mode() === 'ssr'
          ? current.ssr() || '<!-- the entry did not render anything -->'
          : '<!-- switch the run to ssr to see what the server would send -->',
        'output.html',
      );
    }
    requestAnimationFrame(() => viewer?.layout());
  }

  let showing = 0;
  async function showCompiled() {
    if (!compiledHost) return;
    viewer ??= createViewer(compiledHost);
    const code = compiled();
    if (!code) {
      // Nothing to show is two different things: nothing has run yet, or this file is not
      // something the compiler touches.
      viewer.show(current ? `// ${openPath()} is not compiled` : '// run to see the compiled output', openPath());
      requestAnimationFrame(() => viewer?.layout());
      return;
    }
    // Printing is async only because babel loads on demand; a later file must win.
    const turn = ++showing;
    const text = await formatCompiled(code);
    if (turn !== showing) return;
    viewer.show(text, openPath());
    requestAnimationFrame(() => viewer?.layout());
  }

  function setRenderMode(next: RenderMode) {
    if (mode() === next) return;
    setMode(next);
    localStorage.setItem('fluixi-pg-mode', next);
    // The mode changes what the run does, not what it compiles, so it takes a re-run.
    void run();
  }

  function toggleFolder(path: string) {
    const next = new Set(collapsed());
    if (!next.delete(path)) next.add(path);
    setCollapsed(next);
  }

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => saveProject(snapshot()), 400);
  }

  /** `class` re-applies reactively here but a function-valued `style` does not, so the split
      is written straight onto the element. */
  function applySplit(pct: number) {
    const clamped = Math.min(80, Math.max(20, pct));
    setSplit(clamped);
    rootEl?.style.setProperty('--split', `${clamped}%`);
  }

  function toggleTheme() {
    const next = theme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('fluixi-pg-theme', next);
    document.documentElement.dataset.theme = next;
    // Monaco has its own palette and does not read the page's custom properties.
    setEditorTheme(next);
  }

  function toggleSidebar() {
    const next = !sidebar();
    setSidebar(next);
    localStorage.setItem('fluixi-pg-sidebar', next ? 'on' : 'off');
    requestAnimationFrame(() => editor?.layout());
  }

  /**
   * One drag, for every handle.
   *
   * These listened on the window with no capture, and the preview is an iframe: crossing it
   * took `pointermove` and `pointerup`, so a drag stopped tracking and, never seeing the
   * release, stayed armed. Capture retargets everything to the handle. The body class stops
   * the iframe reacting and stops text being selected.
   *
   * `lostpointercapture` ends it too: capture can be taken away without a release.
   */
  function drag(handle: HTMLElement, onMove: (e: PointerEvent) => void, onEnd?: () => void) {
    handle.addEventListener('pointerdown', (event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      document.body.classList.add('dragging');

      const stop = () => {
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', stop);
        handle.removeEventListener('pointercancel', stop);
        handle.removeEventListener('lostpointercapture', stop);
        if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
        document.body.classList.remove('dragging');
        onEnd?.();
      };

      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', stop);
      handle.addEventListener('pointercancel', stop);
      handle.addEventListener('lostpointercapture', stop);
    });
  }

  /** The line between the preview and the graph. */
  function dragRows(e: PointerEvent) {
    const box = rightEl.getBoundingClientRect();
    const pct = Math.min(85, Math.max(15, ((e.clientY - box.top) / box.height) * 100));
    rightEl.style.setProperty('--rows', `${pct}%`);
    localStorage.setItem('fluixi-pg-rows', String(Math.round(pct)));
  }

  /** The line between the graph and the inspector-and-timeline pane below it. */
  function dragGraphBottom(e: PointerEvent) {
    const box = graphRowEl.getBoundingClientRect();
    // Floor outermost: on a short row the ceiling is below the minimum.
    const height = Math.max(60, Math.min(box.height - 90, box.bottom - e.clientY));
    graphRowEl.style.setProperty('--graph-bottom', `${Math.round(height)}px`);
    localStorage.setItem('fluixi-pg-graph-bottom', String(Math.round(height)));
  }

  /** The line between the inspector and the timeline beside it. */
  function dragTimeline(e: PointerEvent) {
    const box = graphBottomEl.getBoundingClientRect();
    const width = Math.max(160, Math.min(box.width - 140, box.right - e.clientX));
    graphBottomEl.style.setProperty('--timeline-width', `${Math.round(width)}px`);
    localStorage.setItem('fluixi-pg-timeline-width', String(Math.round(width)));
  }

  /** The line between the editor and everything to the right of it. */
  function dragSplit(e: PointerEvent) {
    // Per move: a window resized mid-drag changes which axis the layout is on.
    const vertical = matchMedia('(max-width: 1100px)').matches;
    applySplit(vertical ? (e.clientY / window.innerHeight) * 100 : (e.clientX / window.innerWidth) * 100);
  }

  function loadProject(project: Project) {
    const copy = structuredClone(project);
    const start = findEntry(copy.files, copy.entry);
    setProjectName(copy.name);
    setFiles(copy.files);
    setEntry(start);
    setOpenPath(start);
    editor.reset(copy.files);
    setProjectLibs(copy.files);
    editor.open(start, copy.files.find((f) => f.path === start)?.code ?? '');
    setOutput('preview');
    void run();
  }

  function openFile(path: string) {
    setOpenPath(path);
    editor.open(path, files().find((f) => f.path === path)?.code ?? '');
    requestAnimationFrame(() => editor.layout());
    if (current) {
      setCompiled(current.compiled.get(path) ?? '');
      void showOutputText();
    }
  }

  function addFile() {
    // Prefilled with the open file's folder: a path is how a folder comes into being here,
    // and typing `src/` again for every file next to the one you are editing is tedious.
    const open = openPath();
    const folder = open.includes('/') ? open.slice(0, open.lastIndexOf('/') + 1) : '';
    const name = prompt('New file', `${folder}Component.tsx`);
    if (name == null) return;
    const path = normalizePath(name);
    const problem = validatePath(path, files());
    if (problem) {
      setError(problem);
      return;
    }
    const seed = /\.(tsx|jsx)$/.test(path)
      ? `export default function ${path.replace(/.*\//, '').replace(/\.\w+$/, '')}() {\n  return <div>new</div>;\n}\n`
      : '';
    setFiles([...files(), { path, code: seed }]);
    editor.open(path, seed);
    setOpenPath(path);
    setError(null);
    persist();
  }

  function renameFile(path: string) {
    const name = prompt('Rename file', path);
    if (name == null) return;
    const next = normalizePath(name);
    if (next === path) return;
    const problem = validatePath(next, files(), path);
    if (problem) {
      setError(problem);
      return;
    }
    editor.rename(path, next);
    setFiles(files().map((f) => (f.path === path ? { ...f, path: next, code: editor.read(next) } : f)));
    if (entry() === path) setEntry(next);
    if (openPath() === path) setOpenPath(next);
    setError(null);
    persist();
  }

  function removeFile(path: string) {
    if (files().length === 1) {
      setError('A project needs at least one file.');
      return;
    }
    if (!confirm(`Delete ${path}?`)) return;
    const rest = files().filter((f) => f.path !== path);
    editor.remove(path);
    setFiles(rest);
    const nextEntry = findEntry(rest, entry() === path ? undefined : entry());
    setEntry(nextEntry);
    if (openPath() === path) openFile(nextEntry);
    setError(null);
    persist();
  }

  async function share() {
    const url = `${location.origin}${location.pathname}#p=${encodeProject(snapshot())}`;
    history.replaceState(null, '', url);
    try {
      await navigator.clipboard?.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1600);
    } catch {
      setError('Could not copy — the URL bar now holds the shareable link.');
    }
  }

  onMount(() => {
    document.documentElement.dataset.theme = theme();
    const style = document.createElement('style');
    style.textContent = `${DEVTOOLS_CSS}\n${DETAIL_PANEL_CSS}\n${KIND_FILTER_CSS}\n${TREE_CSS}\n${FLOAT_CSS}\n${VALUE_PANE_CSS}`;
    document.head.appendChild(style);
    editor = createEditor(editorHost, {
      files: files(),
      open: openPath(),
      onRun: () => void run(),
      onSave: () => {
        clearTimeout(saveTimer);
        saveProject(snapshot());
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
      },
      getFiles: () => files(),
      specifiers: KNOWN_SPECIFIERS,
    });
    setProjectLibs(files());
    editor.onChange(() => {
      setFiles(editor.readAll());
      setProjectLibs(files());
      persist();
    });
    renderInspector();
    void run();
  });

  return (
    <div
      class={() => (sidebar() ? 'pg' : 'pg no-sidebar')}
      ref={(el: HTMLDivElement) => {
        rootEl = el;
        el.style.setProperty('--split', `${split()}%`);
      }}
    >
      <header class="pg-head">
        <div class="brand">
          <button class="icon burger" title="Toggle files" aria-label="Toggle files" onClick={toggleSidebar}>
            ☰
          </button>
          <img class="logo" src="/logos/mark.png" alt="" width="20" height="20" />
          <h1>Fluixi Playground</h1>
        </div>
        <nav class="examples">
          {examples.map((ex) => (
            <button class={projectName() === ex.name ? 'ex on' : 'ex'} onClick={() => loadProject(ex)}>
              {ex.name}
            </button>
          ))}
        </nav>
        <div class="head-actions">
          {() => (saved() ? <span class="saved">saved</span> : null)}
          <button class="ghost" title="Switch theme" onClick={toggleTheme}>
            {() => (theme() === 'dark' ? '☾' : '☀')}
          </button>
          <button class="ghost" onClick={() => void share()}>
            {() => (shared() ? '✓ link copied' : 'Share')}
          </button>
        </div>
      </header>

      <section class="pg-left">
        <div class="files">
          <div class="files-bar">
            <span>files</span>
            <button class="icon" title="New file" onClick={addFile}>
              +
            </button>
          </div>
          <ul class="file-list">
            {() =>
              tree(files(), collapsed()).map((row) =>
                row.kind === 'folder' ? (
                  <li class="folder">
                    <button
                      class="file-open"
                      style={`padding-left:${10 + row.depth * 12}px`}
                      onClick={() => toggleFolder(row.path)}
                    >
                      <span class="twist">{row.open ? '▾' : '▸'}</span>
                      <span class="file-name">{row.name}</span>
                    </button>
                  </li>
                ) : (
                  <li class={openPath() === row.path ? 'file on' : 'file'}>
                    <button
                      class="file-open"
                      style={`padding-left:${10 + row.depth * 12}px`}
                      onClick={() => openFile(row.path)}
                    >
                      <span class="file-name">{row.name}</span>
                      {() => (entry() === row.path ? <span class="badge">entry</span> : null)}
                    </button>
                    <span class="file-actions">
                      {() =>
                        entry() === row.path ? null : (
                          <button
                            class="icon"
                            title="Make this the entry"
                            onClick={() => {
                              setEntry(row.path);
                              persist();
                            }}
                          >
                            ▸
                          </button>
                        )
                      }
                      <button class="icon" title="Rename" onClick={() => renameFile(row.path)}>
                        ✎
                      </button>
                      <button class="icon" title="Delete" onClick={() => removeFile(row.path)}>
                        ×
                      </button>
                    </span>
                  </li>
                ),
              )
            }
          </ul>
        </div>

        <div class="pane">
          <div class="tabs-bar">
            <div class="tabs">
              <button class="t on">{() => openPath() || 'Editor'}</button>
            </div>
            <button class="run" onClick={() => void run()}>
              ▶ Run <span class="kbd">⌘↵</span>
            </button>
          </div>
          <div class="editor" ref={(el: HTMLDivElement) => (editorHost = el)} />
          <div class={error() ? 'err show' : 'err'}>{error() ?? ''}</div>
        </div>
      </section>

      <div
        class="splitter"
        role="separator"
        aria-orientation="vertical"
        title="Drag to resize"
        ref={(el: HTMLDivElement) =>
            drag(el, dragSplit, () => {
              localStorage.setItem('fluixi-pg-split', String(Math.round(split())));
              editor?.layout();
            })
          }
      />

      <section
        class="pg-right"
        ref={(el: HTMLElement) => {
          rightEl = el;
          el.style.setProperty('--rows', `${Number(localStorage.getItem('fluixi-pg-rows')) || 45}%`);
        }}
      >
        <div class="r-preview">
          <div class="panel-bar">
            <span class="tabs">
              {() =>
                (['preview', 'compiled', 'html', 'css', 'ssr'] as OutputTab[]).map((name) => (
                  <button
                    class={output() === name ? 't on' : 't'}
                    onClick={() => showOutput(name)}
                    title={TAB_HINTS[name]}
                  >
                    {name}
                  </button>
                ))
              }
            </span>
            <span class="mode">
              {() => (output() === 'compiled' ? <span class="stats">{openPath()}</span> : '')}
              <button
                class={mode() === 'spa' ? 'm on' : 'm'}
                title="Render in the browser"
                onClick={() => setRenderMode('spa')}
              >
                spa
              </button>
              <button
                class={mode() === 'ssr' ? 'm on' : 'm'}
                title="Render to html first, then hydrate — the same compiled code either way"
                onClick={() => setRenderMode('ssr')}
              >
                ssr
              </button>
            </span>
          </div>
          {/* The preview keeps running while the compiled output is on top of it: hiding it
              is a class, not an unmount, or every switch would restart the project. */}
          <div class={output() === 'preview' ? 'preview' : 'preview hidden'} ref={(el: HTMLDivElement) => (previewEl = el)} />
          {/* One viewer behind every tab that is not the preview: compiled, html, css, ssr. */}
          <div
            class={output() === 'preview' ? 'compiled hidden' : 'compiled'}
            ref={(el: HTMLDivElement) => (compiledHost = el)}
          />
        </div>
        <div
          class="splitter row"
          role="separator"
          aria-orientation="horizontal"
          title="Drag to resize"
          ref={(el: HTMLDivElement) => drag(el, dragRows)}
        />
        <div
          class="r-graph"
          ref={(el: HTMLDivElement) => {
            graphRowEl = el;
            el.style.setProperty(
              '--graph-bottom',
              `${Number(localStorage.getItem('fluixi-pg-graph-bottom')) || 170}px`,
            );
          }}
        >
          <div class="panel-bar">
            <span>reactive graph</span>
            <span class="stats">
              {stats().nodes} nodes · {stats().edges} edges · {stats().runs} recomputes
            </span>
            <button
              type="button"
              class={picking() ? 'on' : ''}
              title="Pick an element in the preview, and select what drives it"
              onClick={() => {
                if (picking()) return;
                setPicking(true);
                const done = () => setPicking(false);
                // The application runs in the preview iframe, so that is the document the
                // pointer has to be followed in — not the panel's own.
                const frame = previewEl?.querySelector('iframe') as HTMLIFrameElement | null;
                const doc = frame?.contentDocument;
                if (!doc) {
                  done();
                  return;
                }
                startPicking({
                  document: doc,
                  nodeAt: (el) => reactor?.nodeAt(el),
                  describe: (id) => reactor?.graph.get(id)?.label ?? '',
                  onPick: (id) => {
                    done();
                    selectedId = id;
                    pickedEl = null;
                    view?.select(id);
                    renderInspector();
                  },
                  onCancel: done,
                });
              }}
            >
              ⊹
            </button>
            <span class="kinds" ref={(el: HTMLSpanElement) => createKindFilter(el, { onChange: (next) => view?.setKinds(next) })} />
            <span class="zoom">
              <button
                type="button"
                title="Lay the graph out top to bottom, or left to right"
                onClick={() => {
                  view?.setDirection(view.direction === 'horizontal' ? 'vertical' : 'horizontal');
                  setLayout(view?.direction ?? 'horizontal');
                }}
              >
                {() => (layout() === 'vertical' ? '↕' : '↔')}
              </button>
              <button
                type="button"
                class={grouped() ? 'on' : ''}
                title="Show what the packages made, or keep it behind one card"
                onClick={() => {
                  view?.setGroupExternal(!grouped());
                  setGrouped(view?.groupExternal ?? true);
                }}
              >
                ▤
              </button>
              <button
                type="button"
                class={bindings() ? 'on' : ''}
                title="Show where each value reaches the page, and what sets it"
                onClick={() => {
                  view?.setShowBindings(!bindings());
                  setBindings(view?.showBindings ?? false);
                }}
              >
                ⇥
              </button>
              <button
                type="button"
                title="Copy the whole graph as JSON — every node with its value, source, what it reaches and where it is set"
                onClick={(e: MouseEvent) => {
                  void copyText(graphToJson(drawn()), e.currentTarget as HTMLElement);
                }}
              >
                ⇩
              </button>
              <button type="button" title="Zoom out" onClick={() => view?.zoomBy(1 / 1.25)}>
                −
              </button>
              <button type="button" title="Reset (or double-click the graph)" onClick={() => view?.resetView()}>
                ⤢
              </button>
              <button type="button" title="Zoom in" onClick={() => view?.zoomBy(1.25)}>
                +
              </button>
            </span>
          </div>
          <div class="graph-wrap">
            <div
              class="graph-tree"
              ref={(el: HTMLDivElement) => {
                makeFloatable(el, { title: 'tree' });
                tagTree = createComponentTree(el, {
                  domFor: (id) => reactor?.domFor(id) ?? [],
                  onHover: (id, element) => {
                    // An element row knows exactly what it is; a tag row covers everything
                    // it rendered, and boxing only the first makes it look like its parent.
                    const found = element ? [element] : id === null ? [] : (reactor?.elementsFor(id) ?? []);
                    const name = element
                      ? element.tagName.toLowerCase()
                      : id === null
                        ? ''
                        : (reactor?.graph.get(id)?.label ?? '');
                    if (found.length) showHighlight(found, name);
                    else hideHighlight();
                  },
                  onSelect: (id) => {
                    selectedId = id;
                    pickedEl = null;
                    view?.select(id);
                    renderInspector();
                  },
                  onPick: (pick) => {
                    pickedEl = pick;
                    selectedId = null;
                    view?.select(null);
                    renderInspector();
                  },
                  onReveal: (id) => {
                    const n = drawn().get(id);
                    if (n) openInEditor(n.source ?? n.usedAt ?? n.declaredAt ?? {});
                  },
                  // An element has no line of its own; the tag that rendered it does.
                  onRevealPick: (pick) => {
                    if (pick.at) {
                      openInEditor(pick.at);
                      return;
                    }
                    const n = pick.owner === undefined ? undefined : drawn().get(pick.owner);
                    if (n) openInEditor(n.declaredAt ?? n.source ?? n.usedAt ?? {});
                  },
                });
              }}
            />
            <svg class="graph" ref={(el: SVGSVGElement) => (svgEl = el)} preserveAspectRatio="xMidYMid meet" />
          </div>
          <div
            class="graph-split"
            role="separator"
            aria-orientation="horizontal"
            title="Drag to resize"
            ref={(el: HTMLDivElement) => drag(el, dragGraphBottom)}
          />
          <div
            class="graph-bottom"
            ref={(el: HTMLDivElement) => {
              graphBottomEl = el;
              el.style.setProperty(
                '--timeline-width',
                `${Number(localStorage.getItem('fluixi-pg-timeline-width')) || 320}px`,
              );
            }}
          >
            <div
              class="inspector"
              ref={(el: HTMLDivElement) => {
                inspectorEl = el;
                makeFloatable(el, { title: 'inspector' });
              }}
            />
            <div
              class="timeline-split"
              role="separator"
              aria-orientation="vertical"
              title="Drag to resize"
              ref={(el: HTMLDivElement) => drag(el, dragTimeline)}
            />
            <div
              class="timeline"
              ref={(el: HTMLDivElement) => {
                timelineEl = el;
                makeFloatable(el, { title: 'history' });
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
