import { describe, expect, it } from 'vitest';
import { elementHydrationVitePlugin } from './app-plugin.js';

const root = '/app';
const plugin = elementHydrationVitePlugin({ root, clientEntry: 'src/entry-client.tsx', serverEntry: 'src/entry-server.ts' });
const transform = (id: string, resolves: boolean, ssr = false) =>
  plugin.transform.call({ resolve: async () => (resolves ? { id: 'x' } : null) }, 'startClient();\n', id, { ssr });

describe('element hydration in the client entry', () => {
  it('imports @fluixi/web-components/hydrate on line 1 when the package is installed', async () => {
    const out = await transform('/app/src/entry-client.tsx', true);
    expect(out?.code).toBe("import '@fluixi/web-components/hydrate';startClient();\n");
  });

  it('leaves the entry alone when the package is not installed', async () => {
    expect(await transform('/app/src/entry-client.tsx', false)).toBeNull();
  });

  it('leaves other modules alone, and the client entry in the server build', async () => {
    expect(await transform('/app/src/routes/index.tsx', true)).toBeNull();
    expect(await transform('/app/src/entry-client.tsx', true, true)).toBeNull();
  });

  it('imports @fluixi/web-components/server in the server entry, in the server build only', async () => {
    const out = await transform('/app/src/entry-server.ts', true, true);
    expect(out?.code).toBe("import '@fluixi/web-components/server';startClient();\n");
    expect(await transform('/app/src/entry-server.ts', true, false)).toBeNull();
    expect(await transform('/app/src/entry-server.ts', false, true)).toBeNull();
  });
});
