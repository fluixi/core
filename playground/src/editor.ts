// Monaco editor: real in-browser TypeScript service (autocomplete, hover, diagnostics) over the
// project's own files. One model per file, under file:///project/<path>, so an import of
// './Counter' resolves to the sibling model and its types come with it.
// The api entry plus the contributions actually wanted, rather than the aggregate
// `monaco-editor` entry: that one pulls every language it ships (abap, solidity, forty more)
// and leaves whether `languages.typescript` exists up to how the bundler treats side effects.
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/editor/editor.all.js';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';
import 'monaco-editor/esm/vs/language/css/monaco.contribution';
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
import 'monaco-editor/esm/vs/language/html/monaco.contribution';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution';
// The html *service* completes attributes; this is what colours the file. Without it
// index.html was rendered as plain text.
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import type { ProjectFile } from './project';
import { loadPackageTypes } from './types';
import { JSX_THEME_RULES, JSX_THEME_RULES_LIGHT, patchTypeScriptTokens } from './jsx-tokens';

(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    if (label === 'json') return new jsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
    return new editorWorker();
  },
};

const MONO = 'ui-monospace, "JetBrains Mono", "SF Mono", Menlo, monospace';
const ROOT = 'file:///project/';

export function uriFor(path: string): monaco.Uri {
  return monaco.Uri.parse(ROOT + path);
}

function languageFor(path: string): string {
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.html')) return 'html';
  return 'typescript';
}

/**
 * A project's own .d.ts files, handed to the TypeScript worker as libraries.
 *
 * fluixi.d.ts is what makes `$signal` and the resolved components known without an import , 
 * the compiler generates it in a real project, and the editor has to read it for the same
 * reason an editor there would.
 */
let libs: monaco.IDisposable[] = [];
let uiTypes: Promise<void> | null = null;
export function setProjectLibs(files: ProjectFile[]): void {
  if (!uiTypes && files.some((f) => f.code.includes('@fluixi-ui/'))) {
    uiTypes = import('./ui-types').then((m) => m.addUiTypes());
  }
  for (const lib of libs) lib.dispose();
  libs = files
    .filter((f) => f.path.endsWith('.d.ts'))
    .map((f) =>
      monaco.languages.typescript.typescriptDefaults.addExtraLib(f.code, `file:///project/${f.path}`),
    );
}

let configured = false;
function configure() {
  if (configured) return;
  configured = true;
  const ts = monaco.languages.typescript.typescriptDefaults;
  ts.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    // Classic node resolution, which is what the worker's own filesystem looks like: models
    // under file:///project and the packages' declarations under file:///node_modules.
    //
    // Bundler (100) reads better on paper: it is what a project's tsconfig says, but in
    // the TypeScript this worker bundles it failed every relative import: `./Counter` next
    // to `Counter.tsx` came back as "Cannot find module" while the bare packages resolved,
    // and the JSX namespace those packages declare never loaded with it.
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    jsx: monaco.languages.typescript.JsxEmit.Preserve,
    allowNonTsExtensions: true,
    allowJs: true,
    noEmit: true,
    strict: false,
    baseUrl: ROOT,
    lib: ['esnext', 'dom'],
    // The framework's declarations are ~150 files, and every extra lib is a root the worker
    // would otherwise type-check on each keystroke. Nobody is editing them.
    skipLibCheck: true,
  });
  ts.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    // 6133 is "declared but never read", which is noise while typing. 2307 used to be here
    // too and hid the fact that nothing resolved; the declarations are loaded now, so a
    // missing module is worth saying.
    diagnosticCodesToIgnore: [6133],
  });
  // The compiled output is javascript that imports modules only the runner can resolve, and
  // it is read-only. Checking it would decorate it with errors nobody can act on.
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });
  // No stand-in JSX namespace here. @fluixi/jsx declares the global one, and a local
  // `[el: string]: any` merged into it would swallow every real element type, which is why
  // `<div ` suggested nothing and every attribute typed as any. The `$` intrinsics come from
  // the project's own fluixi.d.ts, the same file a real project commits.
  loadPackageTypes();

  patchTypeScriptTokens();
  monaco.editor.defineTheme('fluixi-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: JSX_THEME_RULES,
    colors: {
      'editor.background': '#0f0f0f',
      'editorGutter.background': '#0f0f0f',
      'editor.lineHighlightBackground': '#ffffff08',
      'editorLineNumber.foreground': '#3f3f3f',
      'editorLineNumber.activeForeground': '#8f8f8f',
      'editorIndentGuide.background1': '#1f1f1f',
    },
  });
  monaco.editor.defineTheme('fluixi-light', {
    base: 'vs',
    inherit: true,
    rules: JSX_THEME_RULES_LIGHT,
    colors: {
      'editor.background': '#fafafa',
      'editorGutter.background': '#fafafa',
      'editor.lineHighlightBackground': '#17171708',
      'editorLineNumber.foreground': '#a1a1aa',
      'editorLineNumber.activeForeground': '#666666',
      'editorIndentGuide.background1': '#e6e6e6',
    },
  });
}

/** Monaco keeps its own palette, so the page's theme has to be pushed to it. */
export function setEditorTheme(theme: string): void {
  configure();
  monaco.editor.setTheme(theme === 'light' ? 'fluixi-light' : 'fluixi-dark');
}

/** The specifier that reaches `to` from `from`, extension dropped as an import would write it. */
export function relativeSpecifier(from: string, to: string): string {
  const fromParts = from.split('/').slice(0, -1);
  const toParts = to.replace(/\.(tsx?|jsx?)$/, '').split('/');
  let shared = 0;
  while (shared < fromParts.length && shared < toParts.length - 1 && fromParts[shared] === toParts[shared]) shared++;
  const up = fromParts.length - shared;
  const rest = toParts.slice(shared).join('/');
  return up > 0 ? '../'.repeat(up) + rest : './' + rest;
}

/**
 * Module paths in an import.
 *
 * Monaco's TypeScript worker has no directory to read, it holds models, not a file system , 
 * so it offers nothing inside an import string. This supplies the project's own files, and the
 * packages the playground bundles, from the same list the linker resolves against.
 */
function registerPathCompletions(getFiles: () => ProjectFile[], specifiers: string[]): monaco.IDisposable {
  const INSIDE_IMPORT = /(?:from|import|require\()\s*['"]([^'"]*)$/;
  return monaco.languages.registerCompletionItemProvider(['typescript', 'javascript'], {
    triggerCharacters: ["'", '"', '/', '.'],
    provideCompletionItems(model, position) {
      const upToCursor = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      const match = INSIDE_IMPORT.exec(upToCursor);
      if (!match) return { suggestions: [] };

      const typed = match[1];
      const start = position.column - typed.length;
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: start,
        endColumn: position.column,
      };
      const current = model.uri.path.replace(/^\/project\//, '');
      const relative = typed.startsWith('.');

      const candidates = relative
        ? getFiles()
            .filter((f) => f.path !== current && /\.(tsx?|jsx?)$/.test(f.path))
            .map((f) => relativeSpecifier(current, f.path))
        : specifiers;

      return {
        suggestions: candidates.map((label) => ({
          label,
          kind: monaco.languages.CompletionItemKind.File,
          insertText: label,
          range,
          // Sorted by the list's own order rather than the label, so siblings come first.
          sortText: relative ? '0' + label : '1' + label,
        })),
      };
    },
  });
}

export interface CodeEditor {
  /** Show a file, creating its model if this is the first time. */
  open(path: string, code: string): void;
  /** Put the cursor on a line of a file already open, and scroll it into view. */
  reveal(path: string, line: number, column?: number): boolean;
  /** Current text of one file, or of everything the editor holds. */
  read(path: string): string;
  readAll(): ProjectFile[];
  rename(from: string, to: string): void;
  remove(path: string): void;
  /** Replace every model: used when loading a different project. */
  reset(files: ProjectFile[]): void;
  onChange(fn: () => void): void;
  layout(): void;
  dispose(): void;
}

export interface EditorOptions {
  files: ProjectFile[];
  open: string;
  onRun: () => void;
  onSave: () => void;
  /** The project as it stands, for import completion. */
  getFiles: () => ProjectFile[];
  specifiers: string[];
}

export interface CodeViewer {
  show(code: string, path?: string): void;
  layout(): void;
  dispose(): void;
}

/**
 * A read-only editor for output: the compiled module, in this case.
 *
 * Its model is held apart from the project's: a `file:///project/...` uri would make the
 * TypeScript worker treat generated code as part of the program and report the imports it
 * cannot resolve as errors in a file nobody can edit.
 */
export function createViewer(host: HTMLElement): CodeViewer {
  configure();
  const model = monaco.editor.createModel('', 'javascript', monaco.Uri.parse('inmemory://compiled/output.js'));
  const editor = monaco.editor.create(host, {
    model,
    theme: document.documentElement.dataset.theme === 'light' ? 'fluixi-light' : 'fluixi-dark',
    automaticLayout: true,
    readOnly: true,
    domReadOnly: true,
    wordWrap: 'on',
    fontSize: 12.5,
    fontFamily: MONO,
    lineHeight: 20,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    padding: { top: 12, bottom: 12 },
    renderLineHighlight: 'none',
    smoothScrolling: true,
    scrollbar: { verticalScrollbarSize: 9, horizontalScrollbarSize: 9 },
  });

  return {
    show(code, path) {
      if (model.getValue() !== code) model.setValue(code);
      // Named by what it is: `output.html`, `output.css`, a project path for compiled code.
      const language = path?.endsWith('.html') ? 'html' : path?.endsWith('.css') ? 'css' : 'javascript';
      monaco.editor.setModelLanguage(model, language);
      editor.setPosition({ lineNumber: 1, column: 1 });
      // It is usually created while its pane is hidden, where it measures itself as nothing
      // and stays that way. Showing something is the moment it has a size to take.
      editor.layout();
    },
    layout: () => editor.layout(),
    dispose() {
      editor.dispose();
      model.dispose();
    },
  };
}

export function createEditor(host: HTMLElement, options: EditorOptions): CodeEditor {
  configure();

  const { files, open: initial, onRun, onSave } = options;
  const models = new Map<string, monaco.editor.ITextModel>();
  let changed: (() => void) | null = null;

  const modelFor = (path: string, code: string): monaco.editor.ITextModel => {
    const existing = models.get(path);
    if (existing) return existing;
    const model = monaco.editor.createModel(code, languageFor(path), uriFor(path));
    model.onDidChangeContent(() => changed?.());
    models.set(path, model);
    return model;
  };

  for (const file of files) modelFor(file.path, file.code);

  const editor = monaco.editor.create(host, {
    model: modelFor(initial, files.find((f) => f.path === initial)?.code ?? ''),
    theme: (document.documentElement.dataset.theme === 'light' ? 'fluixi-light' : 'fluixi-dark'),
    automaticLayout: true,
    fontSize: 13,
    fontFamily: MONO,
    lineHeight: 21,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    padding: { top: 12, bottom: 12 },
    tabSize: 2,
    renderLineHighlight: 'all',
    smoothScrolling: true,
    scrollbar: { verticalScrollbarSize: 9, horizontalScrollbarSize: 9 },
  });
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onRun);
  // Bound inside the editor so the browser's own save dialog never opens over it.
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, onSave);

  let completions: monaco.IDisposable | null = registerPathCompletions(options.getFiles, options.specifiers);

  const disposeAll = () => {
    for (const model of models.values()) model.dispose();
    models.clear();
  };

  return {
    open(path, code) {
      editor.setModel(modelFor(path, code));
    },
    reveal(path, line, column = 0) {
      const model = models.get(path);
      if (!model) return false;
      editor.setModel(model);
      // Monaco counts both from one; the graph counts columns from zero.
      const position = { lineNumber: Math.max(1, line), column: Math.max(1, column + 1) };
      editor.setPosition(position);
      editor.revealPositionInCenterIfOutsideViewport(position);
      editor.focus();
      return true;
    },
    read(path) {
      return models.get(path)?.getValue() ?? '';
    },
    readAll() {
      return [...models.entries()].map(([path, model]) => ({ path, code: model.getValue() }));
    },
    rename(from, to) {
      const model = models.get(from);
      if (!model) return;
      // A model's URI is fixed, so a rename is a new model carrying the old text over.
      const replacement = monaco.editor.createModel(model.getValue(), languageFor(to), uriFor(to));
      replacement.onDidChangeContent(() => changed?.());
      models.delete(from);
      models.set(to, replacement);
      if (editor.getModel() === model) editor.setModel(replacement);
      model.dispose();
    },
    remove(path) {
      const model = models.get(path);
      if (!model) return;
      models.delete(path);
      model.dispose();
    },
    reset(next) {
      // A path both projects have keeps its model and takes the new text. Disposed and created
      // again at the same uri, it kept the old text in the TypeScript worker, which went on
      // reporting the previous project's errors.
      const notify = changed;
      changed = null;
      const keep = new Set(next.map((f) => f.path));
      for (const [path, model] of models) {
        if (keep.has(path)) continue;
        model.dispose();
        models.delete(path);
      }
      for (const file of next) {
        const model = modelFor(file.path, file.code);
        if (model.getValue() !== file.code) model.setValue(file.code);
      }
      changed = notify;
    },
    onChange(fn) {
      changed = fn;
    },
    layout: () => editor.layout(),
    dispose() {
      completions?.dispose();
      completions = null;
      disposeAll();
      editor.dispose();
    },
  };
}
