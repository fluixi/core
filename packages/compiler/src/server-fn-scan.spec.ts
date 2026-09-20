import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serverFunctionsVitePlugin } from './integrations.js';

/**
 * Which files end up in the server-function registry.
 *
 * Every module the scan matches is side-effect imported into the server bundle, so this
 * is not a question of tidiness. A client entry that only mentioned the directive in a
 * comment was pulled in and executed on the server, where `startClient` found no
 * `document`.
 */
function registryFor(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'fx-server-fns-'));
  try {
    mkdirSync(join(root, 'src'), { recursive: true });
    for (const [rel, source] of Object.entries(files)) {
      const full = join(root, 'src', rel);
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, source);
    }
    const plugin = serverFunctionsVitePlugin<any>();
    plugin.configResolved({ root });
    return plugin.load('\0virtual:fluixi-server-fns') as string;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const included = (registry: string, name: string) => registry.includes(name);

describe('a real directive is picked up', () => {
  it('finds a function-body directive', () => {
    const registry = registryFor({
      'actions.ts': `export const save = async () => {\n  'use server';\n  return 1;\n};\n`,
    });
    expect(included(registry, 'actions.ts')).toBe(true);
  });

  it('finds a module-level directive', () => {
    const registry = registryFor({ 'rpc.ts': `"use server";\nexport const x = 1;\n` });
    expect(included(registry, 'rpc.ts')).toBe(true);
  });

  it('finds one nested in a directory', () => {
    const registry = registryFor({
      'api/deep/handlers.ts': `export async function go() {\n  'use server';\n}\n`,
    });
    expect(included(registry, 'handlers.ts')).toBe(true);
  });
});

describe('prose about the directive is not a directive', () => {
  it('ignores a line comment that mentions it', () => {
    const registry = registryFor({
      'entry-client.tsx': `// server-fn RPC calls carry auth, so 'use server' bodies see the user.\nstartClient();\n`,
    });
    expect(included(registry, 'entry-client.tsx')).toBe(false);
  });

  it('ignores a block comment that mentions it', () => {
    const registry = registryFor({
      'notes.ts': `/**\n * Bodies marked "use server" run only on the server.\n */\nexport const n = 1;\n`,
    });
    expect(included(registry, 'notes.ts')).toBe(false);
  });

  it('ignores an unquoted mention', () => {
    const registry = registryFor({ 'readme.ts': `// use server for this one\n` });
    expect(included(registry, 'readme.ts')).toBe(false);
  });

  it('keeps a directive that sits beside a comment mentioning it', () => {
    const registry = registryFor({
      'mixed.ts': `// the 'use server' directive below is the real one\nexport const f = async () => {\n  'use server';\n};\n`,
    });
    expect(included(registry, 'mixed.ts')).toBe(true);
  });

  it('is not fooled by a url with a double slash', () => {
    const registry = registryFor({
      'link.ts': `export const docs = 'https://example.com/use-server';\nexport const f = async () => {\n  'use server';\n};\n`,
    });
    expect(included(registry, 'link.ts')).toBe(true);
  });
});

describe('the registry still wires the dispatcher', () => {
  it('sets up the bridge and re-exports the handler', () => {
    const registry = registryFor({
      'actions.ts': `export const f = async () => {\n  'use server';\n};\n`,
    });
    expect(registry).toContain('@fluixi/start/server-fn-setup');
    expect(registry).toContain('isServerFnRequest');
    expect(registry).toContain('handleServerFn');
  });

  it('produces a registry with no imports when nothing matches', () => {
    const registry = registryFor({ 'plain.ts': `export const x = 1;\n` });
    expect(registry).toContain('@fluixi/start/server-fn-setup');
    expect(registry).not.toContain('plain.ts');
  });
});
