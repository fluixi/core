/** The Vite plugin compiles an app's `.js` files, as the esbuild adapter does, but no dependency's. */
import { describe, it, expect } from 'vitest';
import { createVitePlugin } from './integrations.js';

const transform = async (code: string, id: string) => {
  const plugin = createVitePlugin<{ transform: (code: string, id: string) => Promise<unknown> }>({});
  return plugin.transform.call({ warn() {}, error(e: unknown) { throw e; } } as never, code, id) as Promise<{ code: string } | null>;
};

describe('a .js file', () => {
  it('in the app is compiled', async () => {
    const result = await transform('export const A = () => <p>hi</p>;', '/app/src/a.js');
    expect(result?.code).toContain('templateNode');
  });

  it('in node_modules is left alone', async () => {
    expect(await transform('export const x = 1;', '/app/node_modules/dep/index.js')).toBeNull();
  });
});
