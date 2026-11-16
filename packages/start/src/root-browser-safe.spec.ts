/**
 * `@fluixi/start`'s root entry is imported from page code (`addInterceptor`, `defineMiddleware`),
 * and in dev the browser loads every module it reaches unbundled. A module that imports from
 * `node:` breaks the page there, though a production build tree-shakes it away.
 */
import { describe, it, expect } from 'vitest';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

describe('the root entry', () => {
  it('reaches no node: module when bundled for the browser', async () => {
    const result = await build({
      entryPoints: [fileURLToPath(new URL('./index.ts', import.meta.url))],
      bundle: true,
      platform: 'browser',
      format: 'esm',
      write: false,
      logLevel: 'silent',
      // Other packages answer for themselves; this checks what start's own modules import.
      external: ['@fluixi/*', 'vite'],
    }).catch((error: { errors?: Array<{ text: string; location?: { file: string } | null }> }) => ({
      errors: error.errors ?? [],
    }));
    const unresolved = result.errors.map((e) => `${e.location?.file ?? '?'}: ${e.text}`);
    expect(unresolved).toEqual([]);
  });
});
