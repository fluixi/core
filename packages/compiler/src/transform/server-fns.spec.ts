/**
 * Both paths compile `"use server"`, and a mismatch between them is not a
 * cosmetic difference: the client stub and the server registration are produced
 * by separate builds of the same file and have to agree on the id.
 */
import { describe, it, expect } from 'vitest';
import { transformServerFns } from './server-fns.js';
import { transformServerFunctions } from '../frontend/babel/server-functions.js';

const SRC = {
  arrow: 'export const getUser = async (id) => { "use server"; return db.find(id); };',
  declaration: 'export async function save(x) { "use server"; return db.put(x); }',
  two: [
    'const a = async () => { "use server"; return 1; };',
    'const b = async () => { "use server"; return 2; };',
  ].join('\n'),
  none: 'export const plain = () => 1;',
  nested: 'const outer = async () => { "use server"; const inner = () => { "use server"; return 1; }; return inner; };',
};

const ids = (code: string) => [...code.matchAll(/"([0-9a-f]+:\d+)"/g)].map((m) => m[1]);

describe('transformServerFns', () => {
  it('leaves a file with no directive alone', () => {
    expect(transformServerFns(SRC.none, { ssr: false, filename: 't.ts' })).toBeNull();
  });

  it('client build ships a stub, never the body', () => {
    const out = transformServerFns(SRC.arrow, { ssr: false, filename: 't.ts' })!.code;
    expect(out).toContain('$$createServerReference');
    expect(out).not.toContain('db.find');
  });

  it('server build keeps the body and registers it', () => {
    const out = transformServerFns(SRC.arrow, { ssr: true, filename: 't.ts' })!.code;
    expect(out).toContain('$$registerServerFn');
    expect(out).toContain('db.find');
    expect(out).not.toContain('"use server"');
  });

  it('a function declaration becomes a binding', () => {
    const client = transformServerFns(SRC.declaration, { ssr: false, filename: 't.ts' })!.code;
    expect(client).toMatch(/const save = \$\$createServerReference\("[^"]+"\);/);
    const server = transformServerFns(SRC.declaration, { ssr: true, filename: 't.ts' })!.code;
    expect(server).toMatch(/const save = \$\$registerServerFn\("[^"]+", async function save/);
  });

  it('does not descend into a nested directive', () => {
    const out = transformServerFns(SRC.nested, { ssr: true, filename: 't.ts' })!.code;
    expect(ids(out)).toHaveLength(1);
  });

  it('emits a source map', () => {
    const out = transformServerFns(SRC.arrow, { ssr: true, filename: 't.ts' })!;
    expect(out.map.mappings.length).toBeGreaterThan(0);
  });
});

describe('ids match the babel path', () => {
  for (const [name, src] of Object.entries(SRC)) {
    if (name === 'none') continue;
    it(name, () => {
      const opts = { ssr: false, filename: '/app/src/t.ts', root: '/app' };
      const native = transformServerFns(src, opts)!;
      const viaBabel = transformServerFunctions(src, opts)!;
      expect(ids(native.code)).toEqual(ids(viaBabel.code));
    });
  }

  it('the same file gives the same ids on both builds', () => {
    const opts = { filename: '/app/src/t.ts', root: '/app' };
    const client = transformServerFns(SRC.two, { ...opts, ssr: false })!.code;
    const server = transformServerFns(SRC.two, { ...opts, ssr: true })!.code;
    expect(ids(client)).toEqual(ids(server));
    expect(ids(client)).toHaveLength(2);
  });
});
