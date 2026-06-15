import { describe, it, expect } from 'vitest';
import { fluixi } from './index.js';

// Validate the plugin end-to-end: its transform() runs the KettleJS JSX compile,
// honouring the selected backend. transform() only needs babel (no vite server).
async function runTransform(opts: any, code: string): Promise<string> {
  const plugin: any = fluixi(opts);
  const out = await plugin.transform(code, 'App.tsx');
  return (out && out.code) || '';
}

describe('@fluixi/vite-plugin', () => {
  it('exposes a pre-enforced vite plugin with a transform', () => {
    const p: any = fluixi();
    expect(p.name).toBeTruthy();
    expect(p.enforce).toBe('pre');
    expect(typeof p.transform).toBe('function');
    // sets the automatic jsxImportSource for esbuild pre-pass
    expect(p.config().esbuild.jsx).toBe('automatic');
  });

  it('jsx backend (opt-in) emits jsx() calls', async () => {
    const code = await runTransform(
      { backend: 'jsx', importSource: '@fluixi/jsx-runtime' },
      'export const A = (x) => <div id="a">{x()}</div>;',
    );
    expect(code).toMatch(/jsx\(/);
    expect(code).not.toContain('createNativeElement');
  });

  it('imperative is the default backend', async () => {
    const code = await runTransform(
      { importSource: '@fluixi/dom', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' },
      'export const A = (x) => <div id="a">{x()}</div>;',
    );
    expect(code).toContain('createNativeElement'); // default is now imperative
    expect(code).not.toMatch(/\bjsx\(/);
  });

  it('imperative backend emits @fluixi/dom runtime calls', async () => {
    const code = await runTransform(
      { backend: 'imperative', importSource: '@fluixi/dom', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' },
      'export const A = (x) => <div id="a">{x()}</div>;',
    );
    expect(code).toContain('createNativeElement');
    expect(code).toContain('insert');
    expect(code).not.toMatch(/\bjsx\(/);
  });
});
