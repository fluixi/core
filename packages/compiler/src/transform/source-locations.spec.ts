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

  it('marks where a component is used, inside the memo that wraps it', () => {
    const out = run(`import { Row } from './Row';
export function App() {
  return <div><Row label="x" /></div>;
}`);
    // Before the arrow, so it is the mark the wrapping memo takes.
    expect(out).toContain('createMemo((globalThis.__fx_source?.("src/App.ts",3,14,"Row"), () =>');
  });

  it('leaves the source alone when off', () => {
    const out = compile(`import { signal } from '@fluixi/reactive/signal';\nconst c = signal(0);`, { ...OPTIONS, sourceLocations: false });
    expect(out).not.toContain('__fx_source');
  });
});

describe('statements the grammar only allows one of', () => {
  it('braces a marked if-branch instead of pushing it out of the branch', () => {
    const out = run(`import { effect } from '@fluixi/reactive/signal';
function f(v) {
  if (typeof v === 'function') effect(() => read(v));
  else other(v);
}`);
    expect(out).toContain("if (typeof v === 'function') {globalThis.__fx_source?.(");
    expect(out).toMatch(/effect\(\(\) => read\(v\)\);\}\n\s*else other\(v\);/);
  });

  it('braces a loop body that is a bare statement', () => {
    const out = run(`import { effect } from '@fluixi/reactive/signal';
for (const v of list) effect(() => read(v));`);
    expect(out).toContain('for (const v of list) {globalThis.__fx_source?.(');
    expect(out.trimEnd().endsWith('}')).toBe(true);
  });

  it('leaves a braced branch alone', () => {
    const out = run(`import { effect } from '@fluixi/reactive/signal';
if (ok) { effect(() => read()); }`);
    expect(out).toContain('{ globalThis.__fx_source?.(');
  });
});

describe('where a component mark can go', () => {
  it('stays inside the block when the component is declared in a callback', () => {
    const out = run(`it('renders', () => {
  function Page() {
    return <div />;
  }
  mount(Page);
});`);
    expect(out).toMatch(/\};globalThis\.__fx_component\?\.\("Page"/);
    expect(out).not.toMatch(/__fx_component\?\.\([^)]*\);\)/);
  });

  it('reaches past the export of a declared component', () => {
    const out = run(`export const Row = () => <b />;`);
    expect(out).toMatch(/;globalThis\.__fx_component\?\.\("Row"[^)]*\);\s*$/);
  });
});

describe('an exported declaration', () => {
  it('marks in front of the export, not between it and the declaration', () => {
    const out = run(`import { createStore } from '@fluixi/reactive/store';
export const [cart, setCart] = createStore({ items: [] }, { name: 'cart' });`);
    expect(out).toContain('__fx_source?.("src/App.ts",2,31,"cart");export const [cart');
  });

  it('marks a default export the same way', () => {
    const out = run(`import { signal } from '@fluixi/reactive/signal';
export default signal(0);`);
    expect(out).toMatch(/__fx_source\?\.\("src\/App\.ts",2,15\);export default/);
  });
});
