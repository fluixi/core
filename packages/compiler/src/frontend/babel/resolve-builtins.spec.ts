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

describe('control flow is codegen, not an import', () => {
  // Why these cannot become resolver rules: on the JSX path the name selects a
  // lowering and no component import is emitted, so a rule pointing the name
  // elsewhere would change nothing here while silently changing the template path.
  for (const name of ['Show', 'For', 'Switch', 'Suspense']) {
    it(`<${name}/> emits no import for the name in JSX`, () => {
      const out = compile(`const v = <${name}>x</${name}>;`, { optimizeControlFlow: false });
      expect(moduleFor(out, name)).toBeUndefined();
    });
  }
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
