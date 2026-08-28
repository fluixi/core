// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import * as Store from '@fluixi/reactive/store';
import { compile as compileFixture, compileResult, load as loadModule } from '../../../test/fixtures.js';

// The lit front-end wired into the plugin behind `format`. Drives the whole-file
// transform: `html`...`` templates compile through the shared IR + imperative
// backend, with the runtime imports and delegateEvents() call injected — then the
// output runs against the live @fluixi/dom runtime.

const LIT = {
  format: 'lit' as const,
  signalModule: '@fluixi/dom',
  controlFlowModule: '@fluixi/dom',
};


const VLQ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Original columns of every mapping on one generated line of a source map. */
function originalColumns(mappings: string, line: number): number[] {
  const columns: number[] = [];
  let column = 0;

  mappings.split(';').forEach((group, index) => {
    for (const segment of group.split(',').filter(Boolean)) {
      const fields: number[] = [];
      let value = 0;
      let shift = 0;
      for (const char of segment) {
        const digit = VLQ.indexOf(char);
        value += (digit & 31) << shift;
        if (digit & 32) {
          shift += 5;
          continue;
        }
        fields.push(value & 1 ? -(value >> 1) : value >> 1);
        value = 0;
        shift = 0;
      }
      // [generatedColumn, sourceIndex, originalLine, originalColumn]
      if (fields.length >= 4) {
        column += fields[3]!;
        if (index === line) columns.push(column);
      }
    }
  });
  return columns;
}

const compileEsm = (src: string, options: Record<string, unknown> = LIT): string =>
  compileFixture(src, { filename: 'test.tsx', ...options });

const REQUIRE_MAP: Record<string, unknown> = {
  '@fluixi/dom': DOM,
  '@fluixi/reactive/signal': S,
  '@fluixi/reactive/store': Store,
};

const load = (src: string, options: Record<string, unknown> = LIT): any =>
  loadModule(compileEsm(src, options), REQUIRE_MAP);

beforeAll(() => {
  DOM.registerCreateComponent(((Comp: any, props: any) => Comp(props)) as any);
});

describe('lit front-end (format: lit)', () => {
  it('compiles html`` to runtime calls and injects imports + delegateEvents', () => {
    const code = compileEsm(
      'export const r = (f, label) => html`<button @click=${f}>${label()}</button>`;',
    );
    expect(code).toContain('createNativeElement');
    expect(code).toContain('insert');
    expect(code).toMatch(/import \{[^}]*\} from "@fluixi\/dom"/);
    expect(code).toMatch(/delegateEvents\(\["click"\]\)/);
    expect(code).not.toContain('html`'); // template consumed
  });

  it('renders, reacts, and fires a delegated event end-to-end', () => {
    const mod = load(
      'export const render = (f, label) => html`<button @click=${f}>${label()}</button>`;',
    );
    const [label, setLabel] = S.createSignal('hi');
    let clicks = 0;
    const el = mod.render(() => clicks++, label) as HTMLElement;

    expect(el.tagName).toBe('BUTTON');
    expect(el.textContent).toBe('hi');

    setLabel('bye');
    S.flush();
    expect(el.textContent).toBe('bye');

    document.body.appendChild(el);
    el.dispatchEvent(new Event('click', { bubbles: true }));
    expect(clicks).toBe(1);
  });

  it('imports a control-flow component used inside a template', () => {
    const code = compileEsm('export const r = (c, body) => html`<Show when=${c()}>${body}</Show>`;');
    expect(code).toMatch(/import \{[^}]*\bShow\b[^}]*\} from "@fluixi\/dom"/);
    expect(code).toContain('createComponent');
  });

  it('auto-imports the core-only control flow from core, not dom', () => {
    // dom exports neither, so sending these to the control-flow module would
    // inject an import that resolves to nothing.
    const code = compileEsm(
      'export const r = (b) => html`<Suspense><SuspenseList revealOrder="forwards">${b}</SuspenseList></Suspense>`;',
    );
    expect(code).toMatch(/import \{[^}]*\bSuspense\b[^}]*\} from "@fluixi\/core"/);
    expect(code).toMatch(/import \{[^}]*\bSuspenseList\b[^}]*\} from "@fluixi\/core"/);
    expect(code).not.toMatch(/import \{[^}]*\bSuspenseList\b[^}]*\} from "@fluixi\/dom"/);
  });

  it('auto-imports Router/Outlet from the router module (nested too)', () => {
    const code = compileEsm(
      'export const App = (r) => html`<${Router} routes=${r}><main><${Outlet}/></main></${Router}>`;',
    );
    // Order-insensitive: the names are emitted sorted, which is not the contract.
    const routerImport = code.match(/import \{([^}]*)\} from "@fluixi\/core\/router"/)?.[1] ?? '';
    expect(routerImport).toContain('Router');
    expect(routerImport).toContain('Outlet');
  });

  it('does not re-import a router component the file already imports', () => {
    const code = compileEsm(
      "import { Router } from '@fluixi/start/router';\nexport const App = (r) => html`<Router routes=${r}></Router>`;",
    );
    // keep the user's import; don't inject a second Router from router
    expect(code).toContain("from '@fluixi/start/router'");
    expect(code).not.toMatch(/import \{[^}]*\bRouter\b[^}]*\} from "@fluixi\/core\/router"/);
  });

  it('router auto-import respects a custom routerModule', () => {
    const code = compileEsm('export const App = () => html`<${Outlet}/>`;', {
      ...LIT,
      routerModule: '@fluixi/start/router',
    });
    expect(code).toMatch(/import \{[^}]*\bOutlet\b[^}]*\} from "@fluixi\/start\/router"/);
  });

  it('maps generated code back to the template, not to the enclosing statement', () => {
    // Emitted code is spliced over the template's span, so its mappings point
    // into the template rather than at the statement that encloses it — a
    // breakpoint inside compiled template code lands where the author wrote it.
    const src = 'export const r = (c) => html`<div class=${c}>hi</div>`;';
    const templateStart = src.indexOf('html`');

    const out = compileResult(src, { filename: 'test.tsx', ...LIT })!;

    const line = out.code.split('\n').findIndex((l) => /createNativeElement\(/.test(l) && !l.startsWith('import'));
    const columns = originalColumns(out.map.mappings, line);

    expect(columns.length).toBeGreaterThan(0);
    // At least one generated node maps into the template's span rather than to
    // the statement start.
    expect(columns.some((column) => column >= templateStart)).toBe(true);
  });

  it('compiles html`` by DEFAULT (format defaults to `both` — no option needed)', () => {
    const code = compileEsm('export const r = () => html`<div>hi</div>`;', {
            templateClone: true,
    });
    // Fully static, so it is cloned from a template rather than built element by element.
    expect(code).toContain('templateNode');
    expect(code).not.toContain('html`'); // template consumed
  });

  it('leaves html`` untouched when format is explicitly `jsx`', () => {
    const code = compileEsm('export const r = () => html`<div>hi</div>`;', {
            format: 'jsx',
    });
    expect(code).not.toContain('createNativeElement');
    expect(code).toContain('html`');
  });

  it('a file mixing JSX + html`` (format both) does not duplicate imports', () => {
    const code = compileEsm(
      'export const a = () => <div>jsx</div>;\nexport const b = () => html`<span>lit</span>`;',
      { format: 'both', signalModule: '@fluixi/dom' },
    );
    // Both styles compiled. Asserted by what is *gone* rather than by which runtime
    // call replaced it, so the test does not break when codegen changes shape.
    expect(code).not.toContain('html`');
    // Either codegen shape counts as compiled; the point is that neither export was
    // left as JSX.
    expect(code).toMatch(/createNativeElement|templateNode/);
    expect(code).not.toMatch(/=>\s*<\w/);

    // The point of the test: no module imported twice, no name bound twice.
    const importLines = code.split('\n').filter((l) => /^import /.test(l));
    const fromDom = importLines.filter((l) => /from "@fluixi\/dom"/.test(l));
    expect(fromDom.length).toBeLessThanOrEqual(1);

    const names = importLines.flatMap((l) => [...l.matchAll(/\b(\w+)\b(?=\s*[,}])/g)].map((m) => m[1]));
    expect(new Set(names).size).toBe(names.length);
  });
});
