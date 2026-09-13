// Spike: the playground editor on @codingame/monaco-vscode-api instead of monaco-editor.
//
// The question this answers is narrow. Plain monaco runs its own TypeScript worker, which
// cannot load a language-service plugin — so the playground can never show what
// @fluixi/ts-plugin shows in VS Code. monaco-vscode-api runs the real VS Code TypeScript
// extension instead, which is the only route to that.
//
// Nothing here is wired into the playground. It is a second entry so the working editor
// stays on monaco-editor while this is judged.
import { initialize } from '@codingame/monaco-vscode-api';
import getConfigurationServiceOverride from '@codingame/monaco-vscode-configuration-service-override';
import getTextmateServiceOverride from '@codingame/monaco-vscode-textmate-service-override';
import getThemeServiceOverride from '@codingame/monaco-vscode-theme-service-override';
import getLanguagesServiceOverride from '@codingame/monaco-vscode-languages-service-override';
import getExtensionsServiceOverride from '@codingame/monaco-vscode-extensions-service-override';
import getFilesServiceOverride, {
  RegisteredFileSystemProvider,
  RegisteredMemoryFile,
  registerFileSystemOverlay,
} from '@codingame/monaco-vscode-files-service-override';
import '@codingame/monaco-vscode-theme-defaults-default-extension';
import '@codingame/monaco-vscode-typescript-language-features-default-extension';
import * as monaco from '@codingame/monaco-vscode-editor-api';

// The extension host is a worker of its own, and nothing runs without it — the TypeScript
// extension lives there. Registered the way vscode does it, by label.
(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    if (label === 'extensionHost') {
      return new Worker(
        new URL('@codingame/monaco-vscode-api/workers/extensionHost.worker', import.meta.url),
        { type: 'module' },
      );
    }
    return new Worker(
      new URL('@codingame/monaco-vscode-api/workers/editor.worker', import.meta.url),
      { type: 'module' },
    );
  },
};

const status = (text: string) => {
  const el = document.getElementById('status');
  if (el) el.textContent = text;
};

const FILES: Record<string, string> = {
  '/project/src/main.tsx': `import { render } from '@fluixi/core';
import { App } from './app';

const root = document.getElementById('app');
if (root) render(() => <App />, root);
`,
  '/project/src/app.tsx': `export function App() {
  const count = $signal(0);
  return <button onClick={() => count.set(count() + 1)}>{count()}</button>;
}
`,
  '/project/tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "jsxImportSource": "@fluixi/jsx",
    "strict": false
  },
  "include": ["src"]
}
`,
};

async function main(): Promise<void> {
  status('starting services…');

  // A real file system, rather than a model per file. This is what makes the workspace a
  // workspace: the TypeScript extension reads tsconfig.json from it the way it would on disk.
  const fs = new RegisteredFileSystemProvider(false);
  for (const [path, contents] of Object.entries(FILES)) {
    fs.registerFile(new RegisteredMemoryFile(monaco.Uri.file(path), contents));
  }
  registerFileSystemOverlay(1, fs);

  await initialize({
    ...getConfigurationServiceOverride(),
    ...getFilesServiceOverride(),
    ...getExtensionsServiceOverride({ enableWorkerExtensionHost: true }),
    ...getLanguagesServiceOverride(),
    ...getTextmateServiceOverride(),
    ...getThemeServiceOverride(),
  });

  status('services up — opening the editor');

  const host = document.getElementById('editor');
  if (!host) return;

  const model = monaco.editor.createModel(
    FILES['/project/src/main.tsx'],
    'typescriptreact',
    monaco.Uri.file('/project/src/main.tsx'),
  );
  monaco.editor.create(host, { model, automaticLayout: true, theme: 'Default Dark Modern' });

  // What the spike is measuring: whether the VS Code TypeScript extension answers here. If
  // it does, a language-service plugin can be contributed to it; if it does not, this route
  // buys nothing the current editor lacks.
  setTimeout(() => {
    const markers = monaco.editor.getModelMarkers({ resource: model.uri });
    status(
      `services up · ${markers.length} diagnostics · ` +
        (markers.length ? markers.map((m) => m.message).join(' | ').slice(0, 200) : 'none yet'),
    );
  }, 8000);
}

void main().catch((error: unknown) => {
  status('failed: ' + (error instanceof Error ? error.message : String(error)));
  console.error(error);
});
