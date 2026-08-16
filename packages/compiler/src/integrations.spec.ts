/**
 * Every adapter compiles the same way and needs nothing from babel unless asked.
 * They are thin, which is the point — a bundler integration that grows its own
 * compile logic is how the two paths drifted apart last time.
 */
import { describe, it, expect } from 'vitest';
import {
  createVitePlugin,
  createRollupPlugin,
  createESBuildPlugin,
  createWebpackLoader,
} from './integrations.js';

const SRC = 'export const V = (n) => <p class="x">{n()}</p>;';
const OPTS = { signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' };
// The emitted template string still contains `<p …>`, so look for the runtime
// calls and for the JSX expression being gone from the source position.
const compiled = (code: string) =>
  /createNativeElement|templateNode/.test(code) && !/=>\s*<p/.test(code);

describe('bundler adapters', () => {
  it('vite compiles and returns a map', async () => {
    const p: any = createVitePlugin(OPTS);
    const out = await p.transform(SRC, 'a.tsx');
    expect(compiled(out.code)).toBe(true);
    expect(out.map).toBeTruthy();
  });

  it('rollup compiles and returns a map', async () => {
    const p: any = createRollupPlugin(OPTS);
    const out = await p.transform(SRC, 'a.tsx');
    expect(compiled(out.code)).toBe(true);
    expect(out.map).toBeTruthy();
  });

  it('rollup ignores what it should not touch', async () => {
    const p: any = createRollupPlugin(OPTS);
    expect(await p.transform('body{}', 'a.css')).toBeNull();
  });

  it('webpack hands the loader callback compiled source', async () => {
    const loader: any = createWebpackLoader(OPTS);
    const code = await new Promise<string>((resolve, reject) => {
      loader.call(
        { async: () => (err: unknown, out: string) => (err ? reject(err) : resolve(out)), resourcePath: 'a.tsx' },
        SRC,
      );
    });
    expect(compiled(code)).toBe(true);
  });

  it('esbuild returns contents with a ts loader, so types are still stripped', async () => {
    const plugin: any = createESBuildPlugin(OPTS);
    let onLoad!: (args: { path: string }) => Promise<{ contents: string; loader: string }>;
    plugin.setup({ onLoad: (_f: unknown, cb: typeof onLoad) => (onLoad = cb) });
    const { writeFileSync, mkdtempSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const file = join(mkdtempSync(join(tmpdir(), 'fx-esb-')), 'a.tsx');
    writeFileSync(file, SRC);
    const out = await onLoad({ path: file });
    expect(compiled(out.contents)).toBe(true);
    expect(out.loader).toBe('tsx');
  });

  it('babel: true without @babel/core fails loudly rather than shipping source', async () => {
    // The message has to name the option, since the default path needs nothing.
    const p: any = createRollupPlugin({ ...OPTS, babel: true });
    const out = await p.transform(SRC, 'a.tsx').catch((e: Error) => e);
    if (out instanceof Error) expect(out.message).toMatch(/babel/i);
    else expect(compiled(out.code)).toBe(true); // babel is installed here, so it compiles
  });
});

describe('propsDestructure', () => {
  const COMPONENT = 'export function Card({ title }) { return <h1>{title}</h1>; }';

  it('is off unless asked for, so nothing changes under it', async () => {
    const p: any = createVitePlugin(OPTS);
    const out = await p.transform(COMPONENT, 'card.tsx');
    expect(out.code).toContain('title');
    expect(out.code).not.toContain('props.title');
  });

  it('rewrites the props read when turned on', async () => {
    const p: any = createVitePlugin({ ...OPTS, propsDestructure: true });
    const out = await p.transform(COMPONENT, 'card.tsx');
    expect(out.code).toContain('props.title');
  });

  it('rewrites an html template the same way', async () => {
    const p: any = createVitePlugin({ ...OPTS, propsDestructure: true });
    const out = await p.transform(
      'export function Card({ title }) { return html`<h1>${title}</h1>`; }',
      'card.tsx',
    );
    expect(out.code).toContain('props.title');
  });

  it('writes the splitProps call for a rest element', async () => {
    const p: any = createVitePlugin({ ...OPTS, propsDestructure: true });
    const out = await p.transform(
      'export function Card({ title, ...rest }) { return <h1 {...rest}>{title}</h1>; }',
      'card.tsx',
    );
    expect(out.code).toContain('splitProps(props, ["title"])');
    expect(out.code).toContain('props.title');
  });

  it('leaves a file it cannot rewrite exactly as it was', async () => {
    const unsafe = 'export function Card({ title, id = makeId() }) { return <h1 id={id}>{title}</h1>; }';
    const on: any = createVitePlugin({ ...OPTS, propsDestructure: true });
    const off: any = createVitePlugin(OPTS);
    expect((await on.transform(unsafe, 'card.tsx')).code).toBe((await off.transform(unsafe, 'card.tsx')).code);
  });
});
