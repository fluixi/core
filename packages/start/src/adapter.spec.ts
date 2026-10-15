import { describe, it, expect, vi } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequestHandler, withStaticFiles } from './handler.js';
import { nodeAdapter, webAdapter, ssrBuildOptions } from './adapter.js';
import { resolveConfig } from './config.js';
import type { Adapter } from './adapter.js';

/**
 * An app root with the given dependencies, each installed into node_modules with an
 * `exports` map: externalization reads those to enumerate a package's subpaths.
 */
function appRoot(dependencies: Record<string, string>, exports: Record<string, unknown> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'fx-app-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'app', dependencies }));
  for (const name of Object.keys(dependencies)) {
    const pkgDir = join(dir, 'node_modules', name);
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify({ name, version: '1.0.0', exports: exports[name] ?? { '.': './index.js' } }),
    );
  }
  return dir;
}

describe('@fluixi/start adapters', () => {
  it('webAdapter exposes the handler as a { fetch } export (edge/Bun/Deno/CF)', () => {
    const handler = createRequestHandler(() => 'X');
    const out = webAdapter.serve({ handler, cfg: {} as any, clientDir: '' });
    expect(out).toHaveProperty('fetch');
    expect((out as { fetch: unknown }).fetch).toBe(handler);
  });

  it('withStaticFiles serves a real asset, else falls through to SSR', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fx-'));
    writeFileSync(join(dir, 'app.js'), 'console.log(1)');
    const handler = withStaticFiles(createRequestHandler(() => 'SSR'), dir);

    const asset = await handler(new Request('http://x/app.js'));
    expect(asset.headers.get('content-type')).toContain('javascript');
    expect(await asset.text()).toContain('console.log(1)');

    // no extension → page → SSR
    expect(await (await handler(new Request('http://x/about'))).text()).toBe('SSR');
    // extension but missing → SSR fall-through (SPA-ish)
    expect(await (await handler(new Request('http://x/missing.css'))).text()).toBe('SSR');
  });
});

describe('ssrBuildOptions — the adapter decides how the server is bundled', () => {
  const root = () =>
    appRoot(
      { '@fluixi/start': '*', '@fluixi/core': '*', vite: '*' },
      {
        '@fluixi/core': {
          '.': './index.js',
          './router': './router.js',
          './routes': './routes.js', // plugin-generated — a stub in the package
          './lib/*': './lib/*.js',
          './package.json': './package.json',
        },
      },
    );

  it('no adapter leaves Vite\'s heuristic alone', () => {
    // `@fluixi/core` is always bundled: its `/routes` subpath is a plugin virtual, and
    // an externalized package is imported by node without the plugin ever seeing it.
    expect(ssrBuildOptions(resolveConfig({ root: root() }))).toEqual({
      noExternal: ['@fluixi/core'],
    });
  });

  it('carries ssrNoExternal through when no adapter opts in', () => {
    const cfg = resolveConfig({ root: root(), ssrNoExternal: ['some-esm-dep'] });
    expect(ssrBuildOptions(cfg)).toEqual({ noExternal: ['@fluixi/core', 'some-esm-dep'] });
  });

  it('node externalizes the app\'s own @fluixi/* deps, nothing else', () => {
    const cfg = resolveConfig({ root: root(), adapter: nodeAdapter });
    // `vite` is a dependency too: externalizing it is Vite's call, not ours.
    expect(ssrBuildOptions(cfg)).toEqual({
      noExternal: ['@fluixi/core'],
      external: ['@fluixi/start', '@fluixi/core', '@fluixi/core/router'],
    });
  });

  it('lists subpaths, because Vite only honours exact ids', () => {
    const { external } = ssrBuildOptions(resolveConfig({ root: root(), adapter: nodeAdapter }));
    // Half-externalizing a package puts two copies of its module state in one server.
    expect(external).toContain('@fluixi/core/router');
    // Wildcards cannot be enumerated; bundling is the safe direction.
    expect(external).not.toContain('@fluixi/core/lib/*');
    expect(external).not.toContain('@fluixi/core/package.json');
  });

  it('never externalizes a plugin-generated entry, that would ship the throwing stub', () => {
    const { external } = ssrBuildOptions(resolveConfig({ root: root(), adapter: nodeAdapter }));
    expect(external).not.toContain('@fluixi/core/routes');
  });

  it('never externalizes what the app asked to bundle', () => {
    const cfg = resolveConfig({
      root: root(),
      adapter: nodeAdapter,
      ssrNoExternal: ['@fluixi/core'],
    });
    // Named twice, once by the app and once by the rule above; it is listed once.
    expect(ssrBuildOptions(cfg)).toEqual({
      noExternal: ['@fluixi/core'],
      external: ['@fluixi/start'],
    });
  });

  it('web inlines everything: an edge bundle resolves nothing at runtime', () => {
    const cfg = resolveConfig({ root: root(), adapter: webAdapter });
    expect(ssrBuildOptions(cfg)).toEqual({ noExternal: true });
  });

  it('warns rather than silently inlining when there is nothing to externalize', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cfg = resolveConfig({ root: appRoot({ vite: '*' }), adapter: nodeAdapter });

    expect(ssrBuildOptions(cfg)).toEqual({ noExternal: ['@fluixi/core'], external: undefined });
    expect(warn.mock.calls[0][0]).toContain('bundling everything');
    warn.mockRestore();
  });

  it('names ssrNoExternal when it is what bundles every framework dependency', () => {
    // A linked workspace app sets `ssrNoExternal: [/^@fluixi\//]`; blaming package.json there
    // sent the reader looking for dependencies that were declared all along.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cfg = resolveConfig({ root: root(), adapter: nodeAdapter, ssrNoExternal: [/^@fluixi\//] });
    expect(ssrBuildOptions(cfg).external).toBeUndefined();
    expect(warn.mock.calls[0][0]).toContain('ssrNoExternal bundles all 2 @fluixi/* dependencies');
    warn.mockRestore();
  });

  it('node externalizes shared packages too, with their subpaths, so loaded code finds the app\'s copies', () => {
    const dir = appRoot(
      { '@fluixi/core': '*', '@acme/sdk': '*' },
      { '@acme/sdk': { '.': './index.js', './plugins': './plugins.js', './view': './view.js' } },
    );
    const cfg = resolveConfig({ root: dir, adapter: nodeAdapter, share: ['@acme/sdk/plugins', '@acme/sdk/view'] });
    expect(ssrBuildOptions(cfg).external).toEqual(['@fluixi/core', '@acme/sdk', '@acme/sdk/plugins', '@acme/sdk/view']);
  });

  it('refuses to share from a server that bundles its dependencies', () => {
    // Bundled, the app's copy is inside its server file: loaded code would import a second
    // one from node_modules, with its own module state.
    expect(() => ssrBuildOptions(resolveConfig({ root: root(), adapter: webAdapter, share: ['@fluixi/core'] }))).toThrow(
      /share needs a server that imports its dependencies/,
    );
    expect(() => ssrBuildOptions(resolveConfig({ root: root(), share: ['@fluixi/core'] }))).toThrow(/adapter is unset/);
  });

  it('a custom adapter picks either mode', () => {
    const edge: Adapter = { name: 'my-edge', bundle: 'inline', serve: ({ handler }) => ({ fetch: handler }) };
    expect(ssrBuildOptions(resolveConfig({ root: root(), adapter: edge }))).toEqual({ noExternal: true });
  });
});
