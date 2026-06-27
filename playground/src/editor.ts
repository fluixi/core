// Monaco editor — real in-browser TypeScript service (autocomplete, hover, diagnostics) over the
// playground globals declared below. JSX/TSX, themed to the palette, ⌘/Ctrl+Enter to run.
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    return label === 'typescript' || label === 'javascript' ? new tsWorker() : new editorWorker();
  },
};

// Ambient types for the snippet API (injected at runtime, so declared global here) + a loose JSX
// namespace so markup type-checks without resolving @fluixi/jsx in the worker.
const AMBIENT = `
declare function createSignal<T>(value: T, options?: { name?: string; equals?: false | ((a: T, b: T) => boolean) }): [() => T, (v: T | ((prev: T) => T)) => T];
declare function createMemo<T>(fn: () => T, options?: { name?: string }): () => T;
declare function createEffect(fn: () => void, options?: { name?: string }): void;
declare function createStore<T extends object>(initial: T, options?: { name?: string; immutable?: boolean }): [T, (next: Partial<T> | ((prev: T) => Partial<T>)) => void];
declare namespace JSX {
  interface IntrinsicElements { [el: string]: any }
  type Element = any;
  interface ElementChildrenAttribute { children: {} }
}
`;

const MONO = 'ui-monospace, "JetBrains Mono", "SF Mono", Menlo, monospace';

let configured = false;
function configure() {
  if (configured) return;
  configured = true;
  const ts = monaco.languages.typescript.typescriptDefaults;
  ts.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    jsx: monaco.languages.typescript.JsxEmit.Preserve,
    allowNonTsExtensions: true,
    noEmit: true,
    strict: false,
    lib: ['esnext', 'dom'],
  });
  ts.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    // ignore "cannot find module" since runtime imports are injected, and unused-locals
    diagnosticCodesToIgnore: [2307, 6133],
  });
  ts.addExtraLib(AMBIENT, 'file:///fluixi-globals.d.ts');

  monaco.editor.defineTheme('fluixi', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#12141c',
      'editorGutter.background': '#12141c',
      'editor.lineHighlightBackground': '#ffffff08',
      'editorLineNumber.foreground': '#3a4156',
      'editorLineNumber.activeForeground': '#8a90a2',
      'editorIndentGuide.background1': '#1d2230',
    },
  });
}

export interface CodeEditor {
  getValue(): string;
  setValue(v: string): void;
  layout(): void;
}

let modelSeq = 0;

export function createEditor(host: HTMLElement, initial: string, onRun: () => void): CodeEditor {
  configure();
  const model = monaco.editor.createModel(initial, 'typescript', monaco.Uri.parse(`file:///snippet-${modelSeq++}.tsx`));
  const editor = monaco.editor.create(host, {
    model,
    theme: 'fluixi',
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
  return {
    getValue: () => editor.getValue(),
    setValue: (v) => editor.setValue(v),
    layout: () => editor.layout(),
  };
}
