/**
 * Every diagnostic the compiler collects has to reach the bundler.
 *
 * All four kinds share a failure mode: the build stays green and the symptom only
 * shows at runtime, as something that quietly does not update. An unresolved tag
 * renders nothing, a `load:` that cannot act ships the chunk eagerly, a refused props
 * pattern reads its value once, and a shadowed `$` name keeps the module's own binding.
 * None of them throws, so a diagnostic that is collected and then dropped is the same
 * as no diagnostic at all.
 *
 * That happened twice: `propsDiagnostics` and `intrinsicDiagnostics` were both
 * produced by the transform and never read by `reportDiagnostics`. These tests pin
 * both ends: the transform emits them, and the integration prints them.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { transformTemplates } from './templates.js';
import { createVitePlugin } from '../integrations.js';

const OPTS = { format: 'jsx', runtimeModule: '@fluixi/dom' } as never;
const run = (code: string) => transformTemplates(code, 'a.tsx', OPTS)!;

/** Collect what the plugin writes to console.warn for one module. */
async function warningsFor(code: string, id: string): Promise<string[]> {
  const plugin = createVitePlugin({ globals: false }) as {
    transform(this: unknown, code: string, id: string): Promise<unknown>;
  };
  const seen: string[] = [];
  const spy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    seen.push(args.join(' '));
  });
  try {
    await plugin.transform.call({}, code, id);
  } finally {
    spy.mockRestore();
  }
  return seen;
}

afterEach(() => vi.restoreAllMocks());

describe('the transform collects them', () => {
  it('a module that binds a $ name gets an intrinsic diagnostic', () => {
    const out = run('function $signal(x) { return x; }\nexport function C() { const a = $signal(1); return <p>{a}</p>; }');
    expect(out.intrinsicDiagnostics?.[0]?.name).toBe('$signal');
    expect(out.intrinsicDiagnostics?.[0]?.message).toMatch(/reserved for the compiler/);
  });

  it('a tag nothing supplies gets an unresolved diagnostic', () => {
    const out = run('export function App() { return <Chart />; }');
    expect(out.unresolvedDiagnostics?.[0]?.message).toBeTruthy();
  });

  it('a props pattern it cannot prove gets a props diagnostic', () => {
    const out = run('export function C({ [k]: v }: any) { return <p>{v}</p>; }');
    expect(out.propsDiagnostics?.[0]?.name).toBe('v');
    expect(out.propsDiagnostics?.[0]?.message).toBeTruthy();
  });
});

describe('the integration prints them', () => {
  it('prints the intrinsic one, naming the binding', async () => {
    const seen = await warningsFor(
      'function $signal(x) { return x; }\nexport function C() { const a = $signal(1); return <p>{a}</p>; }',
      '/app/Shadow.tsx',
    );
    expect(seen.join('\n')).toMatch(/\$signal is reserved for the compiler/);
  });

  it('prints the props one, and says what it costs', async () => {
    const seen = await warningsFor(
      'export function D({ [k]: v }: any) { return <p>{v}</p>; }',
      '/app/D.tsx',
    );
    const text = seen.join('\n');
    expect(text).toMatch(/`v` was left destructured/);
    // The consequence is the whole point: without it the reader has a warning but no
    // reason to act on one.
    expect(text).toMatch(/reads once instead of tracking/);
  });

  it('prints an unresolved tag', async () => {
    const seen = await warningsFor(
      'export function App() { return <Chart />; }',
      '/app/Unresolved.tsx',
    );
    expect(seen.join('\n')).toMatch(/Chart/);
  });

  it('prints a load: that cannot take effect', async () => {
    const seen = await warningsFor(
      'export function App() { return <Chart load:idle />; }',
      '/app/App.tsx',
    );
    expect(seen.join('\n')).toMatch(/load:idle/);
  });

  it('says nothing about a module with none of these', async () => {
    const seen = await warningsFor(
      'export function Fine(props: { title: string }) { return <h1>{props.title}</h1>; }',
      '/app/Fine.tsx',
    );
    expect(seen).toEqual([]);
  });

  it('does not repeat a warning for the same module', async () => {
    // A module is transformed again on every edit to it or to an importer, and the
    // same warning ten times reads as ten problems.
    const code = 'function $memo(f) { return f; }\nexport function C() { const a = $memo(() => 1); return <p>{a}</p>; }';
    const first = await warningsFor(code, '/app/Repeat.tsx');
    const second = await warningsFor(code, '/app/Repeat.tsx');
    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual([]);
  });
});
