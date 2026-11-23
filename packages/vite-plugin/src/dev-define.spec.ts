import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';
import { fluixi } from './index.js';

// A dependency written the way the Fluixi packages guard development code, built by Vite with
// the plugin: the guard has to fold in the dependency too, not only in the app's own files.
const root = mkdtempSync(join(tmpdir(), 'fluixi-dev-define-'));
mkdirSync(join(root, 'node_modules/guarded'), { recursive: true });
writeFileSync(join(root, 'node_modules/guarded/package.json'), JSON.stringify({ name: 'guarded', type: 'module', main: 'index.js' }));
writeFileSync(
  join(root, 'node_modules/guarded/index.js'),
  `function reportToDevtools() { return 'DEVELOPMENT_ONLY'; }
export function run() {
  if (typeof __DEV__ !== 'undefined' ? __DEV__ : true) return reportToDevtools();
  return 'production';
}`,
);
writeFileSync(join(root, 'main.js'), `import { run } from 'guarded';\nconsole.log(run());`);

async function bundle(mode: string, define?: Record<string, string>): Promise<string> {
  const result = await build({
    root,
    mode,
    configFile: false,
    logLevel: 'silent',
    plugins: [fluixi({ globals: false })],
    ...(define ? { define } : {}),
    build: { write: false, minify: false, rollupOptions: { input: join(root, 'main.js') } },
  });
  const output = (Array.isArray(result) ? result[0] : result) as { output: Array<{ type: string; code?: string }> };
  return output.output.filter((o) => o.type === 'chunk').map((o) => o.code).join('\n');
}

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('__DEV__ in a Vite build', () => {
  it('drops a dependency\'s development code from a production build', async () => {
    const code = await bundle('production');
    expect(code).not.toContain('DEVELOPMENT_ONLY');
    expect(code).toContain('production');
  }, 60_000);

  it('keeps it in a development build', async () => {
    expect(await bundle('development')).toContain('DEVELOPMENT_ONLY');
  }, 60_000);

  it('leaves a value the app defined alone', async () => {
    expect(await bundle('production', { __DEV__: 'true' })).toContain('DEVELOPMENT_ONLY');
  }, 60_000);
});
