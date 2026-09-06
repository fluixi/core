import { describe, it, expect } from 'vitest';
import { compile } from '../../test/fixtures.js';

const OPTIONS = { signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom', sourceLocations: true, filename: 'src/App.ts' };
const run = (src: string) => compile(src, OPTIONS);

describe('source locations', () => {
  it('marks a signal with its file, position and name', () => {
    const out = run(`import { signal } from '@fluixi/reactive/signal';\nconst count = signal(0);`);
    expect(out).toContain('__fx_source?.("src/App.ts",2,14,"count")');
  });

  it('marks a memo and an anonymous effect', () => {
    const out = run(`import { memo, effect } from '@fluixi/reactive/signal';
const doubled = memo(() => 1);
effect(() => {});`);
    expect(out).toContain('__fx_source?.("src/App.ts",2,16,"doubled")');
    // No variable to name it after, so the mark carries a position only.
    expect(out).toContain('__fx_source?.("src/App.ts",3,0)');
  });

  it('marks the $ intrinsics', () => {
    const out = run(`const count = $signal(0);\nconst d = $memo(() => count() * 2);`);
    expect(out).toContain('__fx_source?.("src/App.ts",1,14,"count")');
    expect(out).toContain('__fx_source?.("src/App.ts",2,10,"d")');
  });

  it('marks where a component is declared, and skips a plain function', () => {
    const out = run(`export function App() {
  return <div>hi</div>;
}
const Row = () => <b>x</b>;
function helper() { return 1; }`);
    expect(out).toContain('__fx_component?.("App","src/App.ts",1,7)');
    expect(out).toContain('__fx_component?.("Row","src/App.ts",4,6)');
    expect(out).not.toContain('"helper"');
  });

  it('distinguishes two primitives on separate statements of one line', () => {
    const out = run(`import { signal } from '@fluixi/reactive/signal';\nconst a = signal(1); const b = signal(2);`);
    expect(out).toContain('"src/App.ts",2,10,"a"');
    expect(out).toContain('"src/App.ts",2,31,"b"');
  });

  it('leaves the source alone when off', () => {
    const out = compile(`import { signal } from '@fluixi/reactive/signal';\nconst c = signal(0);`, { ...OPTIONS, sourceLocations: false });
    expect(out).not.toContain('__fx_source');
  });
});
