import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { compile as compileFixture } from '../../../test/fixtures.js';
import { readFileSync } from 'node:fs';

/**
 * End-to-end against the real `@fluixi-ui` map, not a fixture.
 *
 * A hand-written fixture would keep passing while the generated map drifted; this reads
 * the file the UI library actually generates, so the test fails if resolution stops
 * matching reality. Skipped when the sibling repo is absent, so CI here stays
 * self-contained.
 */
const MAP_PATH =
  // The sibling checkout, from this package's folder (where the tests run).
  resolve(process.cwd(), '../../../fluixi-ui/packages/resolver/src/components.generated.ts');

function loadUiMap(): Record<string, string> | undefined {
  try {
    const src = readFileSync(MAP_PATH, 'utf8');
    const map: Record<string, string> = {};
    for (const [, name, mod] of src.matchAll(/^\s+(\w+): '([^']+)',/gm)) map[name] = mod;
    return Object.keys(map).length > 0 ? map : undefined;
  } catch {
    return undefined;
  }
}

const uiMap = loadUiMap();

const compile = (code: string, components: Record<string, string>): string =>
  compileFixture(code, { filename: 'app.tsx', format: 'both', resolve: [{ components }] });

describe.skipIf(!uiMap)('fluixi-ui components resolve in html``', () => {
  it('imports a component that was never imported', () => {
    const out = compile('const v = html`<Button variant="solid">Save</Button>`;', uiMap!);
    expect(out).toContain('@fluixi-ui/button');
    expect(out).toMatch(/import\s*\{\s*Button\s*\}/);
  });

  it('resolves several components across packages in one template', () => {
    const out = compile(
      'const v = html`<Card><Chip>tag</Chip><Button>Save</Button></Card>`;',
      uiMap!,
    );
    for (const mod of ['@fluixi-ui/card', '@fluixi-ui/chip', '@fluixi-ui/button']) {
      expect(out).toContain(mod);
    }
  });

  it('resolves a compound component to its own package', () => {
    // Sub-components (SplitterPanel, PageHeader...) are exported from the same package
    // as their root, so they must resolve without a separate rule.
    const out = compile(
      'const v = html`<Splitter><SplitterPanel>a</SplitterPanel></Splitter>`;',
      uiMap!,
    );
    expect(out).toContain('@fluixi-ui/splitter');
    expect(out).toMatch(/SplitterPanel/);
  });

  it('gives html`` and JSX the same imports', () => {
    const importsOf = (out: string) =>
      out
        .split('\n')
        .filter((l) => l.trimStart().startsWith('import ') && l.includes('@fluixi-ui/'))
        .map((l) => l.trim())
        .sort();

    const tagged = compile('const v = html`<Card><Button>Save</Button></Card>`;', uiMap!);
    const jsx = compile('const v = <Card><Button>Save</Button></Card>;', uiMap!);
    expect(importsOf(tagged)).toEqual(importsOf(jsx));
    expect(importsOf(tagged).length).toBe(2);
  });

  it('still lets an app override a library name with its own import', () => {
    const out = compile(
      "import { Card } from './my-card';\nconst v = html`<Card>mine</Card>`;",
      uiMap!,
    );
    expect(out).toContain('./my-card');
    expect(out).not.toContain('@fluixi-ui/card');
  });
});
