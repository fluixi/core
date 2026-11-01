// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';

describe('the production check in a browser build', () => {
  // A browser has no `process`; a bundler replaces the exact text `process.env.NODE_ENV`.
  // Anything else (`process.env?.NODE_ENV`, a `typeof process` guard) is left in place and
  // reads as development in the browser, so a deployed page published its release.
  it('is replaced whole by the build, leaving nothing to read at run time', async () => {
    const source = readFileSync(new URL('./versions.ts', import.meta.url), 'utf8');
    const { code } = await transform(source, { loader: 'ts', define: { 'process.env.NODE_ENV': '"production"' } });
    expect(code).not.toMatch(/process\s*\.\s*env|typeof process/);
  });

  it('is left to the app: the library build keeps the expression as written', () => {
    // Baked at publish time it would be "production" in every app's development too, and
    // every development-only check in this package would be off.
    const config = JSON.parse(readFileSync(new URL('../../../build-config.json', import.meta.url), 'utf8'));
    expect(config.esbuild.define['process.env.NODE_ENV']).toBe('process.env.NODE_ENV');
  });
});

