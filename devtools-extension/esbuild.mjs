/**
 * Three bundles, all IIFE.
 *
 * A devtools page and an MV3 content script both load a plain script tag; neither takes an
 * ES module reliably, and the agent in particular has to run at `document_start` with no
 * import resolution available to it. So everything is bundled flat.
 */
import { build, context } from 'esbuild';
import { rmSync } from 'node:fs';

const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');

rmSync('dist', { recursive: true, force: true });

/** The panel and the agent share nothing at runtime, so each carries what it needs. */
const options = {
  entryPoints: {
    agent: 'src/agent.ts',
    panel: 'src/panel.ts',
    devtools: 'src/devtools.ts',
  },
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome111',
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
