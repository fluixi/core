import { describe, it, expect } from 'vitest';
import { compile as compileFixture } from '../../../test/fixtures.js';

const RULES = [
  { components: { Button: '@fluixi-ui/button', Card: '@fluixi-ui/card' } },
  { match: /^Icon(.+)$/, module: '@/icons/$1', export: 'default' },
];

const compile = (code: string, format: 'lit' | 'jsx' | 'both' = 'both'): string =>
  compileFixture(code, { filename: 'test.tsx', format, resolve: RULES });

/** The import statements the compiler injected, normalised for comparison. */
const importsOf = (out: string): string[] =>
  out
    .split('\n')
    .filter((l) => l.trimStart().startsWith('import '))
    .map((l) => l.trim())
    .sort();

describe('component resolution — html``', () => {
  it('imports a resolved tag that was never imported', () => {
    const out = compile('const v = html`<Button>Save</Button>`;', 'lit');
    expect(out).toContain('@fluixi-ui/button');
    expect(out).toContain('Button');
  });

  it('groups several components from one module into a single import', () => {
    const out = compile(
      "const v = html`<Button>a</Button><Button>b</Button>`;",
      'lit',
    );
    const buttonImports = importsOf(out).filter((l) => l.includes('@fluixi-ui/button'));
    expect(buttonImports).toHaveLength(1);
  });

  it('emits a default import when the rule says so', () => {
    const out = compile('const v = html`<IconSearch />`;', 'lit');
    expect(out).toContain('@/icons/Search');
    // Default export → default specifier, not a named one.
    expect(out).not.toMatch(/import\s*\{\s*IconSearch\s*\}/);
  });

  it('leaves an unknown tag alone', () => {
    const out = compile('const v = html`<Mystery />`;', 'lit');
    // Still referenced in the output — it compiles to a component call either way.
    // What must not happen is an import being invented for it.
    expect(importsOf(out).some((l) => l.includes('Mystery'))).toBe(false);
  });
});

describe('component resolution — JSX', () => {
  it('imports a resolved tag that was never imported', () => {
    const out = compile('const v = <Button>Save</Button>;', 'jsx');
    expect(out).toContain('@fluixi-ui/button');
  });

  it('leaves an unknown tag alone', () => {
    const out = compile('const v = <Mystery />;', 'jsx');
    expect(out).not.toContain('@fluixi-ui/');
  });
});

describe('both syntaxes resolve identically', () => {
  it('injects the same imports for the same components', () => {
    // The whole point of resolving by name below the syntax layer: parity is
    // structural, not maintained by hand.
    const fromLit = compile('const v = html`<Button><Card /></Button>`;', 'both');
    const fromJsx = compile('const v = <Button><Card /></Button>;', 'both');

    const uiImports = (out: string): string[] =>
      importsOf(out).filter((l) => l.includes('@fluixi-ui/'));

    expect(uiImports(fromLit)).toEqual(uiImports(fromJsx));
    expect(uiImports(fromLit)).toHaveLength(2);
  });
});

describe('a lexical binding always wins', () => {
  it('does not inject when the component is already imported', () => {
    const out = compile(
      "import { Button } from './my-button';\nconst v = html`<Button>Save</Button>`;",
      'lit',
    );
    expect(out).toContain("from './my-button'");
    expect(out).not.toContain('@fluixi-ui/button');
  });

  it('does not inject when a local of the same name exists', () => {
    const out = compile(
      'const Button = () => null;\nconst v = html`<Button>Save</Button>`;',
      'lit',
    );
    expect(out).not.toContain('@fluixi-ui/button');
  });

  it('does not inject in JSX either', () => {
    const out = compile(
      "import { Button } from './my-button';\nconst v = <Button>Save</Button>;",
      'jsx',
    );
    expect(out).not.toContain('@fluixi-ui/button');
  });
});

describe('with no rules configured', () => {
  it('changes nothing', () => {
    const out = compileFixture('const v = html`<Button>Save</Button>`;', {
      filename: 'test.tsx',
      format: 'lit',
    });
    expect(out).not.toContain('@fluixi-ui/button');
  });
});
