import { describe, it, expect } from 'vitest';
import { transformServerFunctions } from './server-functions.js';

const SRC = `
const getUser = async (id) => {
  'use server';
  return db.users.find(id);
};
export { getUser };
`;

describe('"use server" transform', () => {
  it('returns null when there is no directive', () => {
    expect(transformServerFunctions(`const x = () => 1;`, { ssr: true, filename: 'a.ts' })).toBeNull();
  });

  it('server build: registers the body, keeps it', () => {
    const out = transformServerFunctions(SRC, { ssr: true, filename: '/app/a.ts', root: '/app' })!;
    expect(out.code).toContain('$$registerServerFn');
    expect(out.code).toContain('db.users.find'); // body kept on the server
    expect(out.code).toContain('@fluixi/start/server-fn');
    expect(out.code).not.toContain("'use server'"); // directive stripped
  });

  it('client build: replaces with an RPC stub, drops the body', () => {
    const out = transformServerFunctions(SRC, { ssr: false, filename: '/app/a.ts', root: '/app' })!;
    expect(out.code).toContain('$$createServerReference');
    expect(out.code).not.toContain('db.users.find'); // server body removed from the client
  });

  it('client and server agree on the function id', () => {
    const idOf = (code: string) => /"([0-9a-f]+:\d+)"/.exec(code)?.[1];
    const s = transformServerFunctions(SRC, { ssr: true, filename: '/app/a.ts', root: '/app' })!;
    const c = transformServerFunctions(SRC, { ssr: false, filename: '/app/a.ts', root: '/app' })!;
    expect(idOf(s.code)).toBeTruthy();
    expect(idOf(s.code)).toBe(idOf(c.code));
  });

  it('handles a function declaration', () => {
    const out = transformServerFunctions(
      `export function load(){ 'use server'; return 1; }`,
      { ssr: false, filename: '/app/b.ts', root: '/app' },
    )!;
    expect(out.code).toContain('$$createServerReference');
    expect(out.code).toContain('const load');
  });
});
