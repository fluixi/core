import { describe, it, expect } from 'vitest';
import { defineConfig, resolveConfig } from './config.js';
import { injectApp } from './internal.js';

describe('@fluixi/start config', () => {
  it('defineConfig is identity', () => {
    const c = { port: 4000 };
    expect(defineConfig(c)).toBe(c);
  });

  it('resolveConfig applies the conventional defaults', () => {
    const c = resolveConfig();
    expect(c.port).toBe(3000);
    expect(c.serverEntry).toBe('src/entry-server.ts');
    expect(c.clientEntry).toBe('src/entry-client.ts');
    expect(c.template).toBe('index.html');
    expect(c.mountId).toBe('root');
    expect(c.ssrNoExternal).toEqual([]);
    expect(c.root).toBe(process.cwd());
  });

  it('resolveConfig keeps overrides', () => {
    const c = resolveConfig({ port: 3010, mountId: 'app', ssrNoExternal: ['x'] });
    expect(c.port).toBe(3010);
    expect(c.mountId).toBe('app');
    expect(c.ssrNoExternal).toEqual(['x']);
  });
});

describe('@fluixi/start injectApp', () => {
  it('injects into the mount div', () => {
    expect(injectApp('<body><div id="root"></div></body>', 'APP')).toBe(
      '<body><div id="root">APP</div></body>',
    );
  });

  it('respects a custom mountId', () => {
    expect(injectApp('<div id="app"></div>', 'APP', 'app')).toBe('<div id="app">APP</div>');
  });

  it('falls back to the ssr-outlet marker', () => {
    expect(injectApp('<body><!--ssr-outlet--></body>', 'APP')).toBe('<body>APP</body>');
  });

  it('falls back to before </body>', () => {
    expect(injectApp('<body></body>', 'APP')).toBe('<body><div id="root">APP</div></body>');
  });
});
