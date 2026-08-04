import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import init from './index.js';

const GLOBALS = '/globals.d.ts';
const GLOBALS_SRC =
  'declare function html(s: TemplateStringsArray, ...v: any[]): any;\n' +
  'declare function svg(s: TemplateStringsArray, ...v: any[]): any;\n';

function setup(files: Record<string, string>) {
  const all: Record<string, string> = { ...files, [GLOBALS]: GLOBALS_SRC };
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => Object.keys(all),
    getScriptVersion: () => '1',
    getScriptSnapshot: (f) => {
      if (all[f]) return ts.ScriptSnapshot.fromString(all[f]);
      const d = ts.sys.readFile(f);
      return d !== undefined ? ts.ScriptSnapshot.fromString(d) : undefined;
    },
    getCurrentDirectory: () => '/',
    getCompilationSettings: () => ({ target: ts.ScriptTarget.Latest, noEmit: true, strict: true }),
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: (f) => f in all || ts.sys.fileExists(f),
    readFile: (f) => (f in all ? all[f] : ts.sys.readFile(f)),
    readDirectory: ts.sys.readDirectory,
  };
  const languageService = ts.createLanguageService(host, ts.createDocumentRegistry());
  const ls = (init as any)({ typescript: ts }).create({
    languageService,
    languageServiceHost: host,
    project: {},
    serverHost: {},
    config: {},
  });
  return { ls };
}

const CARD = '/card.ts';
const CARD_SRC = 'export function Card(props: { title?: string }) { return null; }\n';

describe('go to definition from a component tag', () => {
  it('jumps to the component declaration', () => {
    const app = 'import { Card } from "./card.js";\nconst t = html`<Card />`;';
    const { ls } = setup({ '/app.ts': app, [CARD]: CARD_SRC });

    const defs = ls.getDefinitionAtPosition('/app.ts', app.indexOf('<Card') + 1);
    expect(defs).toHaveLength(1);
    expect(defs![0].fileName).toBe(CARD);
    expect(CARD_SRC.slice(defs![0].textSpan.start, defs![0].textSpan.start + defs![0].textSpan.length))
      .toBe('Card');
  });

  it('binds the span to the tag, so the editor highlights it', () => {
    const app = 'import { Card } from "./card.js";\nconst t = html`<Card />`;';
    const { ls } = setup({ '/app.ts': app, [CARD]: CARD_SRC });

    const at = app.indexOf('<Card') + 1;
    const result = ls.getDefinitionAndBoundSpan('/app.ts', at);
    expect(app.slice(result!.textSpan.start, result!.textSpan.start + result!.textSpan.length))
      .toBe('Card');
  });

  it('leaves ordinary code definitions alone', () => {
    const app = 'import { Card } from "./card.js";\nconst x = Card;';
    const { ls } = setup({ '/app.ts': app, [CARD]: CARD_SRC });
    const defs = ls.getDefinitionAtPosition('/app.ts', app.indexOf('= Card') + 2);
    expect(defs?.length).toBeGreaterThan(0);
  });
});

describe('find references', () => {
  it('includes template tags alongside real references', () => {
    const app = 'import { Card } from "./card.js";\nconst t = html`<Card></Card>`;';
    const { ls } = setup({ '/app.ts': app, [CARD]: CARD_SRC });

    const refs = ls.getReferencesAtPosition(CARD, CARD_SRC.indexOf('Card')) ?? [];
    const inTemplate = refs.filter((r: ts.ReferenceEntry) => r.fileName === '/app.ts');
    // The import plus the opening and closing tags.
    expect(inTemplate.length).toBeGreaterThanOrEqual(3);
  });

  it('does not sweep in an unrelated component of the same name', () => {
    const other = 'function Card() { return null; }\nconst t = html`<Card />`;';
    const app = 'import { Card } from "./card.js";\nconst t = html`<Card />`;';
    const { ls } = setup({ '/app.ts': app, '/other.ts': other, [CARD]: CARD_SRC });

    const refs = ls.getReferencesAtPosition(CARD, CARD_SRC.indexOf('Card')) ?? [];
    expect(refs.some((r: ts.ReferenceEntry) => r.fileName === '/other.ts')).toBe(false);
  });
});

describe('rename', () => {
  it('rewrites the closing tag as well as the opening one', () => {
    const app = 'import { Card } from "./card.js";\nconst t = html`<Card>x</Card>`;';
    const { ls } = setup({ '/app.ts': app, [CARD]: CARD_SRC });

    const locations = ls.findRenameLocations(CARD, CARD_SRC.indexOf('Card'), false, false) ?? [];
    const tags = locations
      .filter((l: ts.RenameLocation) => l.fileName === '/app.ts')
      .map((l: ts.RenameLocation) => l.textSpan.start)
      .filter((start: number) => app.slice(start, start + 4) === 'Card');

    // import + <Card> + </Card>
    expect(tags.length).toBeGreaterThanOrEqual(3);
    // A rename that missed the closing tag would leave a mismatched template.
    expect(tags).toContain(app.indexOf('</Card>') + 2);
  });

  it('adds nothing for a native element — div is not a component', () => {
    const app = 'const t = html`<div>x</div>`;';
    const { ls } = setup({ '/app.ts': app });
    // Whatever TypeScript does with a position inside a template literal is left
    // alone; what matters is that the plugin contributes no tag locations.
    const locations = ls.findRenameLocations('/app.ts', app.indexOf('<div') + 1, false, false) ?? [];
    const onTag = locations.filter(
      (l: ts.RenameLocation) => app.slice(l.textSpan.start, l.textSpan.start + 3) === 'div',
    );
    expect(onTag).toHaveLength(0);
  });
});
