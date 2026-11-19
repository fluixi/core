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

  it('leaves a module exporting a class alone: extends needs the class itself', () => {
    expect(hotRewrite('export class Observable {}\n', id)).toBeNull();
    expect(hotRewrite('export default class Store {}\n', id)).toBeNull();
    expect(hotRewrite('export const Model = class {};\n', id)).toBeNull();
  });

  it('leaves API routes and constants alone: GET is not a component', () => {
    expect(hotRewrite('export async function GET(request) { return new Response("x"); }\n', '/app/src/api/x.ts')).toBeNull();
    expect(hotRewrite('export const MAX_ITEMS = 3;\nexport function Card() { return null; }\n', id)).toBeNull();
  });

  it('leaves a module alone when it holds state of its own', () => {
    expect(hotRewrite('const [n] = createSignal(0);\nexport function Card() { return n(); }\n', id)).toBeNull();
    expect(hotRewrite('const theme = _createContext();\nexport function Card() { return null; }\n', id)).toBeNull();
  });

  it('respects @refresh reload, and ignores a module with nothing to swap', () => {
    const optOut = hotRewrite('// @refresh reload\nexport function Card() { return null; }\n', id)!;
    expect(optOut).toContain('import.meta.hot.accept(() => globalThis.location?.reload())');
    expect(optOut).not.toContain('__fxh');
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

  it('passes keepState to the hot module, unless the file says // @refresh reset', () => {
    const code = 'export function Card() { return null; }\n';
    expect(hotRewrite(code, 'src/card.tsx', { keepState: true })).toContain('__fxHot(import.meta.hot, "src/card.tsx", { keepState: true })');
    expect(hotRewrite(code, 'src/card.tsx')).toContain('__fxHot(import.meta.hot, "src/card.tsx");');
    expect(hotRewrite(`// @refresh reset\n${code}`, 'src/card.tsx', { keepState: true })).toContain('__fxHot(import.meta.hot, "src/card.tsx");');
  });

  it('lets a custom element class module take its own update, unless the class has #private members', () => {
    const reload = 'import.meta.hot.accept(() => globalThis.location?.reload())';
    const plain = 'export class FxCounter extends HTMLReactiveElement { render() { return null; } }\ndefineCustomElement("fx-counter", FxCounter);\n';
    const withPrivate = 'export class FxCounter extends HTMLReactiveElement { #count = 0; }\ndefineCustomElement("fx-counter", FxCounter);\n';
    expect(hotRewrite(plain, id)).toMatch(/import\.meta\.hot\.accept\(\);\n$/);
    expect(hotRewrite(withPrivate, id)).toContain(reload);
    expect(hotRewrite('export class Store {}\n', id)).toBeNull();
  });

  it('tells the runtime first when a file defining elements opts out of keeping state', () => {
    const code = '// @refresh reset\ndefineElement("x-a", () => null);\n';
    const out = hotRewrite(code, 'src/a.ts', { keepState: true })!;
    expect(out.startsWith("if (import.meta.hot) globalThis[Symbol.for('fluixi.hot')]?.reset?.(true); // @refresh reset\n")).toBe(true);
    expect(out.split('\n')[1]).toBe('defineElement("x-a", () => null);');
    expect(hotRewrite('defineElement("x-a", () => null);\n', 'src/a.ts', { keepState: true })!.startsWith('defineElement')).toBe(true);
  });
});
