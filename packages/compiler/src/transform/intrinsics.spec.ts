/**
 * `$signal` and friends, and the rule underneath them: what a name resolves to decides
 * whether it is reactive, never how the name reads.
 */
import { describe, it, expect } from 'vitest';
import { transformTemplates } from './templates.js';
import { resolveReactiveBindings } from '../analyze/reactive-bindings.js';
import { parse } from '@babel/parser';

const OPTS = { runtimeModule: '@fluixi/dom' } as never;
const compile = (code: string) => transformTemplates(code, 'm.tsx', OPTS)?.code ?? code;
const result = (code: string) => transformTemplates(code, 'm.tsx', OPTS);

const bindings = (code: string) =>
  resolveReactiveBindings(parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] }).program);

describe('the intrinsics compile to the runtime', () => {
  it('rewrites $signal and imports what it used', () => {
    const code = compile('const count = $signal(0);');
    expect(code).toContain('signal(0)');
    expect(code).toContain('import { signal } from "@fluixi/reactive/signal"');
  });

  it('rewrites $memo, $effect and $store', () => {
    const code = compile(`
      const doubled = $memo(() => 2);
      $effect(() => {});
      const user = $store({ name: 'Ada' });
    `);
    expect(code).toContain('memo(');
    expect(code).toContain('effect(');
    expect(code).toContain('store(');
    expect(code).toContain('import { effect, memo } from "@fluixi/reactive/signal"');
    expect(code).toContain('import { store } from "@fluixi/reactive/store"');
  });

  it('rewrites the scope and lifecycle intrinsics, $cleanup to onCleanup', () => {
    const code = compile(`
      $batch(() => {});
      $cleanup(() => {});
      $root((dispose) => dispose);
      const Theme = $context('light');
      $renderEffect(() => {});
      $computed(() => {});
    `);
    expect(code).toContain('onCleanup(() => {})');
    expect(code).not.toContain('$cleanup');
    expect(code).toContain(
      'import { batch, computed, context, onCleanup, renderEffect, root } from "@fluixi/reactive/signal"',
    );
  });

  it('rewrites the storage intrinsics to @fluixi/core/storage', () => {
    const code = compile(`
      const prefs = $storage({ scope: 'cookie', namespace: 'ui' });
      const vault = $asyncStorage({ namespace: 'auth' });
      const theme = $persisted(prefs, 'theme', { fallback: 'light' });
    `);
    expect(code).not.toMatch(/\$(storage|asyncStorage|persisted)\(/);
    expect(code).toContain('import { persisted, useAsyncStorage, useStorage } from "@fluixi/core/storage"');
  });

  it('rewrites $cachedResource and treats it as a resource handle', () => {
    const code = compile("const orgs = $cachedResource(() => load(), { name: 'orgs' });");
    expect(code).toContain('import { cachedResource } from "@fluixi/reactive/cached-resource"');
    expect(bindings("const orgs = $cachedResource(() => load());").kinds.get('orgs')).toBe('resource-handle');
  });

  it('treats $persisted as a signal handle', () => {
    const { kinds } = bindings("const theme = $persisted($storage(), 'theme');");
    expect(kinds.get('theme')).toBe('signal-handle');
  });

  it('imports only what the module used', () => {
    const code = compile('const a = $signal(0);');
    expect(code).toContain('import { signal }');
    expect(code).not.toContain('memo');
    expect(code).not.toContain('store(');
  });

  it('imports once however many calls there are', () => {
    const code = compile('const a = $signal(0); const b = $signal(1); const c = $signal(2);');
    expect(code.match(/import \{ signal \}/g)).toHaveLength(1);
    expect(code.match(/\bsignal\(/g)).toHaveLength(3);
  });

  it('leaves the arguments exactly as written', () => {
    const code = compile('const doubled = $memo(() => count() * 2 /* keep me */);');
    expect(code).toContain('() => count() * 2 /* keep me */');
  });

  it('does not import a name the module already has', () => {
    const code = compile('import { signal } from "@fluixi/reactive/signal";\nconst a = $signal(0);');
    expect(code.match(/import \{ signal \}/g)).toHaveLength(1);
  });

  it('works inside a component, next to JSX', () => {
    const code = compile('export function C() { const n = $signal(0); return <b>{n.get()}</b>; }');
    expect(code).toContain('signal(0)');
    expect(code).toContain('import { signal }');
  });

  it('can be turned off', () => {
    const code = transformTemplates('const a = $signal(0);', 'm.tsx', {
      ...(OPTS as object),
      intrinsics: false,
    } as never);
    expect(code).toBeNull();
  });
});

describe('a module that binds a $ name keeps its own meaning', () => {
  const SRC = 'function $signal() { return 42; }\nconst value = $signal();';

  it('leaves the call alone', () => {
    expect(compile(SRC)).not.toContain('createSignal');
  });

  it('says so rather than doing it quietly', () => {
    const out = result(SRC)!;
    expect(out.intrinsicDiagnostics?.[0]?.name).toBe('$signal');
    expect(out.intrinsicDiagnostics?.[0]?.message).toMatch(/reserved/);
  });

  it('reports each name once, not once per call', () => {
    const out = result(`${SRC}\nconst other = $signal();`)!;
    expect(out.intrinsicDiagnostics).toHaveLength(1);
  });
});

describe('classification comes from the binding, not the name', () => {
  it('reads an intrinsic', () => {
    const { kinds } = bindings('const count = $signal(0);');
    expect(kinds.get('count')).toBe('signal-handle');
  });

  it('still reads the tuple form', () => {
    const { kinds } = bindings(
      'import { createSignal } from "@fluixi/reactive/signal";\nconst [count, setCount] = createSignal(0);',
    );
    expect(kinds.get('count')).toBe('signal-accessor');
    expect(kinds.get('setCount')).toBe('signal-setter');
  });

  it('reads an imported primitive', () => {
    const { kinds } = bindings(
      'import { createMemo } from "@fluixi/reactive/signal";\nconst doubled = createMemo(() => 1);',
    );
    expect(kinds.get('doubled')).toBe('memo-accessor');
  });

  it('reads the short API by import', () => {
    const { kinds } = bindings(
      'import { signal } from "@fluixi/reactive/signal";\nconst count = signal(0);',
    );
    expect(kinds.get('count')).toBe('signal-handle');
  });

  it('follows an alias', () => {
    const { kinds } = bindings(
      'import { signal as state } from "@fluixi/reactive/signal";\nconst count = state(0);',
    );
    expect(kinds.get('count')).toBe('signal-handle');
  });

  it('does not classify a local function that happens to be called signal', () => {
    const { kinds } = bindings('function signal() { return 42; }\nconst value = signal();');
    expect(kinds.get('value')).toBeUndefined();
  });

  it('does not classify an import from somewhere else', () => {
    const { kinds } = bindings('import { signal } from "some-other-library";\nconst count = signal(0);');
    expect(kinds.get('count')).toBeUndefined();
  });

  it('gives the same answer for both spellings of the same thing', () => {
    const viaIntrinsic = bindings('const a = $signal(0);');
    const viaRuntime = bindings(
      'import { signal } from "@fluixi/reactive/signal";\nconst a = signal(0);',
    );
    expect([...viaIntrinsic.kinds]).toEqual([...viaRuntime.kinds]);
  });

  it('mixes the two forms in one module', () => {
    const { kinds } = bindings(
      'import { createSignal } from "@fluixi/reactive/signal";\n' +
        'const [count] = createSignal(0);\n' +
        'const doubled = $memo(() => count() * 2);',
    );
    expect(kinds.get('count')).toBe('signal-accessor');
    expect(kinds.get('doubled')).toBe('memo-handle');
  });
});

describe('the rest of the reactive surface', () => {
  it('covers resource, selector and deferred', () => {
    const code = compile(`
      const users = $resource(id, fetchUser);
      const isPicked = $selector(selected);
      const slow = $deferred(query);
    `);
    expect(code).toContain('resource(');
    expect(code).toContain('createSelector(');
    expect(code).toContain('createDeferred(');
    expect(code).toContain(
      'import { createDeferred, createSelector, resource } from "@fluixi/reactive/signal"',
    );
  });

  it('classifies them by binding, like the rest', () => {
    const { kinds } = bindings('const slow = $deferred(query);');
    expect(kinds.get('slow')).toBe('memo-accessor');
  });
});

describe('the tracking operations', () => {
  it('compiles $untrack and $untrackStore', () => {
    const code = compile('const a = $untrack(() => count.get()); const b = $untrackStore(() => s.x);');
    expect(code).toContain('untrack(');
    expect(code).toContain('untrackStore(');
    expect(code).toContain('import { untrack } from "@fluixi/reactive/signal"');
    expect(code).toContain('import { untrackStore } from "@fluixi/reactive/store"');
  });

  it('does not classify what they return as reactive', () => {
    // `untrack` hands back a plain value on purpose, that is the whole point of it.
    const { kinds } = bindings('const a = $untrack(() => 1);');
    expect(kinds.get('a')).toBe('plain');
  });
});

describe('$env', () => {
  it('compiles to env from @fluixi/start/env', () => {
    const code = compile("export const url = $env('API_URL');");
    expect(code).toContain("env('API_URL')");
    expect(code).toContain('import { env } from "@fluixi/start/env"');
  });

  it("goes past the module's own `env` binding instead of calling it", () => {
    // A config module with its own `env` object is common; the call must still reach the runtime.
    const code = compile("export const env = { apiUrl: $env('API_URL') };");
    expect(code).toContain("__fx_env('API_URL')");
    expect(code).toContain('import { env as __fx_env } from "@fluixi/start/env"');
    expect(code).toContain('export const env = {');
  });

  it('reuses an import of the same runtime export rather than adding a second', () => {
    const code = compile("import { env } from '@fluixi/start/env';\nexport const url = $env('API_URL');");
    expect(code).toContain("env('API_URL')");
    expect(code).not.toContain('__fx_env');
  });
});
