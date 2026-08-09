import { describe, it, expect } from 'vitest';
import { fluixi } from './index.js';

// Validate the plugin end-to-end: its transform() runs the Fluixi compile.
// transform() only needs babel (no vite server).
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

  it('compiles JSX to @fluixi/dom runtime calls', async () => {
    const code = await runTransform(
      { importSource: '@fluixi/dom', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' },
      'export const A = (x) => <div id="a">{x()}</div>;',
    );
    expect(code).toMatch(/createNativeElement|templateNode/);
    expect(code).toContain('insert');
    // There is no jsx-factory backend: the output is runtime calls, never jsx().
    expect(code).not.toMatch(/\bjsx\(/);
  });

  it('compiles html`` templates through the same pipeline', async () => {
    const code = await runTransform(
      { importSource: '@fluixi/dom', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' },
      'import { html } from "@fluixi/core";\nexport const A = (x) => html`<div id="a">${x()}</div>`;',
    );
    expect(code).toMatch(/createNativeElement|templateNode/);
    expect(code).not.toMatch(/\bhtml`/);
  });
});
