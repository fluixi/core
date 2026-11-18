import { describe, expect, it } from 'vitest';
import { hotRewrite } from './hot.js';

const id = '/app/src/card.tsx';

describe('hotRewrite', () => {
  it('routes component exports through the hot module and accepts the update', () => {
    const code = 'export function Card(p) { return p.x; }\nexport const Badge = () => null;\nexport default function Page() { return null; }\n';
    const out = hotRewrite(code, id)!;
    expect(out).toContain('__fxh.component("Card", Card)');
    expect(out).toContain('__fxh.component("Badge", Badge)');
    expect(out).toContain('__fxh.component("default", Page)');
    expect(out).toContain('export { __fx0 as Card, __fx1 as Badge, __fx2 as default };');
    expect(out).toContain('if (import.meta.hot) import.meta.hot.accept();');
  });

  it('keeps every line and column of the original', () => {
    const code = 'import { x } from "y";\nexport function Card() { return x; }\nexport default () => null;\n';
    const out = hotRewrite(code, id)!;
    const original = code.split('\n');
    const rewritten = out.split('\n');
    for (let i = 0; i < original.length - 1; i++) expect(rewritten[i]!.length).toBe(original[i]!.length);
    expect(rewritten[1]).toBe('       function Card() { return x; }');
    expect(rewritten[2]).toBe('const __fxd =  () => null;');
  });

  it('wraps a route data loader with the component', () => {
    const out = hotRewrite('export function routeData() { return 1; }\nexport default function Page() { return null; }\n', id)!;
    expect(out).toContain('__fxh.data("routeData", routeData)');
  });

  it('leaves a module alone when it exports anything else', () => {
    expect(hotRewrite('export function Card() { return null; }\nexport const helper = 1;\n', id)).toBeNull();
    expect(hotRewrite('export * from "./other";\n', id)).toBeNull();
    expect(hotRewrite('export { Card } from "./card";\n', id)).toBeNull();
  });

  it('leaves a module alone when it holds state of its own', () => {
    expect(hotRewrite('const [n] = createSignal(0);\nexport function Card() { return n(); }\n', id)).toBeNull();
    expect(hotRewrite('const theme = _createContext();\nexport function Card() { return null; }\n', id)).toBeNull();
  });

  it('respects @refresh reload, and ignores a module with nothing to swap', () => {
    expect(hotRewrite('// @refresh reload\nexport function Card() { return null; }\n', id)).toBeNull();
    expect(hotRewrite('import "./styles.css";\nstart();\n', id)).toBeNull();
  });

  it('accepts a module that defines custom elements, with nothing exported', () => {
    const out = hotRewrite('defineElement("x-card", () => null);\n', id)!;
    expect(out).toContain('if (import.meta.hot) import.meta.hot.accept();');
    expect(out).not.toContain('export {');
  });

  it('ignores type exports', () => {
    const out = hotRewrite('export type Props = { a: string };\nexport function Card() { return null; }\n', id)!;
    expect(out).toContain('__fxh.component("Card", Card)');
  });
});
