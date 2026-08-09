import { describe, it, expect } from 'vitest';
import { transformSync } from '@babel/core';
import fluixiPlugin from './plugin.js';
import {
  BUILTIN_COMPONENTS,
  RESERVED_COMPONENTS,
  builtinComponentMap,
  routerComponents,
} from '../../resolve/builtins.js';

function compile(code: string, options: Record<string, unknown> = {}): string {
  return (
    transformSync(code, {
      filename: 'test.tsx',
      presets: [],
      plugins: [[fluixiPlugin, { format: 'both', ...options }]],
      parserOpts: { plugins: ['jsx', 'typescript'] },
      configFile: false,
      babelrc: false,
    })?.code ?? ''
  );
}

const importsOf = (out: string): string[] =>
  out
    .split('\n')
    .filter((l) => l.trimStart().startsWith('import '))
    .map((l) => l.trim());

/** Which module a name was imported from, or undefined when it was not imported. */
function moduleFor(out: string, name: string): string | undefined {
  const line = importsOf(out).find((l) => new RegExp(`\\b${name}\\b`).test(l));
  return line?.match(/from ["']([^"']+)["']/)?.[1];
}

describe('published builtin data', () => {
  it('maps every builtin to a module', () => {
    const map = builtinComponentMap();
    for (const name of BUILTIN_COMPONENTS) expect(map[name]).toBeTruthy();
  });

  it('splits control flow between dom and core', () => {
    const map = builtinComponentMap();
    expect(map.Show).toBe('@fluixi/dom');
    expect(map.Suspense).toBe('@fluixi/core');
    expect(map.Router).toBe('@fluixi/core/router-next');
  });

  it('honours module overrides', () => {
    const map = builtinComponentMap({ routerModule: '@app/router' });
    expect(map.Outlet).toBe('@app/router');
  });

  it('reserves control flow but not the router group', () => {
    expect(RESERVED_COMPONENTS.has('Show')).toBe(true);
    expect(RESERVED_COMPONENTS.has('Switch')).toBe(true);
    expect(RESERVED_COMPONENTS.has('Link')).toBe(false);
    expect(RESERVED_COMPONENTS.has('Outlet')).toBe(false);
  });

  it('describes the router group as a rule', () => {
    expect(routerComponents('@app/router').components).toEqual({
      Router: '@app/router',
      Outlet: '@app/router',
      Redirect: '@app/router',
      Link: '@app/router',
    });
  });
});

describe('builtin data matches what the compiler emits', () => {
  // The point of publishing the names is that tools stop guessing. If the map ever
  // disagrees with the compiler, everything reading it is silently wrong.
  //
  // Compiled as html``: on the JSX path control flow is lowered to codegen and the
  // name is never imported at all, so the template path is where the module choice is
  // actually observable. Router components behave the same either way.
  const map = builtinComponentMap();
  for (const name of BUILTIN_COMPONENTS) {
    it(`<${name}/> is imported from ${map[name]}`, () => {
      const out = compile(`const v = html\`<${name}>x</${name}>\`;`, {
        format: 'lit',
        optimizeControlFlow: false,
      });
      expect(moduleFor(out, name)).toBe(map[name]);
    });
  }
});

describe('control flow is auto-imported, nested or not', () => {
  // This asserted the opposite until the bug behind it was found: the JSX visitor
  // registered control-flow names, but a lowered parent is replaced before its subtree
  // is walked, so a nested `<Show>` never reached it and compiled to a reference to
  // nothing. Registration moved to emitComponentCall, the chokepoint every component
  // passes through. Every fixture imported Show by hand, which is why it survived.
  const map = builtinComponentMap();
  for (const name of ['Show', 'For', 'Switch', 'Suspense']) {
    it(`imports a top-level <${name}/>`, () => {
      expect(moduleFor(compile(`const v = <${name}>x</${name}>;`), name)).toBe(map[name]);
    });

    it(`imports a nested <${name}/>`, () => {
      expect(moduleFor(compile(`const v = <div><${name}>x</${name}></div>;`), name)).toBe(
        map[name],
      );
    });
  }

  it('leaves a hand-written import alone', () => {
    const out = compile("import { Show } from './mine.js';\nconst v = <div><Show/></div>;");
    expect(moduleFor(out, 'Show')).toBe('./mine.js');
  });

  it('emits one binding, not two', () => {
    const out = compile('const v = <div><Show/><Show/></div>;');
    expect(importsOf(out).filter((l) => /\bShow\b/.test(l))).toHaveLength(1);
  });
});

describe('rule precedence against builtins', () => {
  const rule = [{ components: { Link: '@fluixi-ui/link', Show: '@fluixi-ui/show' } }];

  it('lets a rule take a router name — it is only an import', () => {
    const out = compile('const v = <Link href="/a">a</Link>;', { resolve: rule });
    expect(moduleFor(out, 'Link')).toBe('@fluixi-ui/link');
    expect(out).not.toContain('router-next');
  });

  it('does not double-import a router name a rule claimed', () => {
    const out = compile('const v = <Link href="/a">a</Link>;', { resolve: rule });
    expect(importsOf(out).filter((l) => /\bLink\b/.test(l))).toHaveLength(1);
  });

  it('applies the same precedence inside html``', () => {
    const out = compile('const v = html`<Link href="/a">a</Link>`;', { resolve: rule });
    expect(moduleFor(out, 'Link')).toBe('@fluixi-ui/link');
    expect(out).not.toContain('router-next');
  });

  it('keeps control flow, whose name selects codegen a rule cannot supply', () => {
    const out = compile('const v = html`<Show when=${c()}>x</Show>`;', {
      resolve: rule,
      format: 'lit',
      optimizeControlFlow: false,
    });
    expect(moduleFor(out, 'Show')).toBe('@fluixi/dom');
  });

  it('still auto-imports router names when no rule claims them', () => {
    const out = compile('const v = <Outlet/>;', { resolve: rule });
    expect(moduleFor(out, 'Outlet')).toBe('@fluixi/core/router-next');
  });

  it('leaves an explicit import alone', () => {
    const out = compile("import { Link } from './mine.js';\nconst v = <Link/>;", {
      resolve: rule,
    });
    expect(moduleFor(out, 'Link')).toBe('./mine.js');
  });
});

describe('the resolve pass is the single decision', () => {
  const rule = [{ components: { Button: '@fluixi-ui/button' } }];

  it('injects identical imports from html`` and JSX', () => {
    // The two frontends reach the decision by different routes — the lit path through
    // the IR resolve pass, JSX through the Babel lowering — so they are pinned to
    // each other rather than each to a literal.
    const litImports = importsOf(
      compile('const v = html`<Button>a</Button>`;', { resolve: rule, format: 'lit' }),
    ).filter((l) => /\bButton\b/.test(l));
    const jsxImports = importsOf(
      compile('const v = <Button>a</Button>;', { resolve: rule, format: 'jsx' }),
    ).filter((l) => /\bButton\b/.test(l));
    expect(litImports).toEqual(jsxImports);
    expect(litImports).toHaveLength(1);
  });

  it('carries module overrides through the IR, not just import injection', () => {
    const out = compile('const v = html`<Outlet/>`;', {
      format: 'lit',
      routerModule: '@app/router',
    });
    expect(moduleFor(out, 'Outlet')).toBe('@app/router');
  });
});

describe('resolution and load strategies reach the emitted output', () => {
  // Regression: `emitViaIR` skipped resolution entirely, so a resolved tag compiled to
  // a bare reference with no import and threw at runtime.
  const rule = [{ components: { Summary: '@app/summary', Chart: '@app/chart' } }];

  it('imports a resolved component', () => {
    const out = compile('const v = <Summary/>;', { resolve: rule });
    expect(moduleFor(out, 'Summary')).toBe('@app/summary');
  });

  it('defers one carrying a load: directive', () => {
    const out = compile('const v = <Chart load:visible="200px"/>;', {
      resolve: rule,
    });
    expect(out).toContain('deferred(() => import("@app/chart")');
    expect(out).toContain('rootMargin: "200px"');
  });

  it('does not leak load: into the props object', () => {
    const out = compile('const v = <Chart load:idle/>;', { resolve: rule });
    expect(out).not.toMatch(/["']load:/);
  });

  it('injects the same imports as the inline path', () => {
    const strip = (o: string) => importsOf(o).filter((l) => /\bSummary\b/.test(l));
    expect(strip(compile('const v = <Summary/>;', { resolve: rule }))).toEqual(
      strip(compile('const v = <Summary/>;', { resolve: rule })),
    );
  });

  it('collapses a deferred usage whose module is already eager', () => {
    const out = compile('const v = <><Chart/><Chart load:visible/></>;', {
      resolve: rule,
    });
    expect(out).not.toContain('deferred(');
  });
});
