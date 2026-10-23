import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { usedComponentTags, shouldSuppress, isUnusedCode } from './collect.js';

function sf(code: string): ts.SourceFile {
  return ts.createSourceFile('t.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
/** A minimal unused-diagnostic pointing at `name`'s first occurrence. */
function unusedDiag(code: string, name: string, tsCode = 6133): ts.Diagnostic {
  const start = code.indexOf(name);
  return { file: undefined, start, length: name.length, code: tsCode, category: ts.DiagnosticCategory.Warning, messageText: '' };
}

describe('usedComponentTags', () => {
  it('collects component tags referenced in an html`` template', () => {
    const code = 'function UserCard(){} const t = html`<main><UserCard /><span>x</span></main>`;';
    const tags = usedComponentTags(ts, sf(code));
    expect(tags.has('UserCard')).toBe(true);
    expect(tags.has('span')).toBe(false); // native element, not a component
  });

  it('collects nested + member-path components', () => {
    const code = 'const t = html`<Ctx.Provider><Card><Row/></Card></Ctx.Provider>`;';
    const tags = usedComponentTags(ts, sf(code));
    expect(tags.has('Ctx')).toBe(true);
    expect(tags.has('Card')).toBe(true);
    expect(tags.has('Row')).toBe(true);
  });

  it('handles svg`` and no-substitution templates', () => {
    expect(usedComponentTags(ts, sf('const t = svg`<Icon/>`;')).has('Icon')).toBe(true);
  });
});

describe('shouldSuppress', () => {
  const codeStr = 'function UserCard(){} function Unused(){} const t = html`<UserCard/>`;';
  const source = sf(codeStr);
  const used = usedComponentTags(ts, source);

  it('suppresses an unused diagnostic for a template-referenced component', () => {
    expect(shouldSuppress(ts, source, unusedDiag(codeStr, 'UserCard'), used)).toBe(true);
  });

  it('keeps a genuinely unused binding', () => {
    expect(shouldSuppress(ts, source, unusedDiag(codeStr, 'Unused'), used)).toBe(false);
  });

  it('ignores non-unused diagnostic codes', () => {
    const d = unusedDiag(codeStr, 'UserCard', 2304); // "cannot find name"
    expect(shouldSuppress(ts, source, d, used)).toBe(false);
  });

  it('suppresses a single unused import (6133 spanning the whole statement) used in a template', () => {
    // TS reports a lone unused import as 6133 with the span = the whole `import ...;`.
    const src = "import { App } from './App';\nconst t = html`<App />`;";
    const s = sf(src);
    const u = usedComponentTags(ts, s);
    const stmt = "import { App } from './App';";
    const d: ts.Diagnostic = {
      file: undefined,
      start: src.indexOf(stmt),
      length: stmt.length,
      code: 6133,
      category: ts.DiagnosticCategory.Warning,
      messageText: '',
    };
    expect(shouldSuppress(ts, s, d, u)).toBe(true);
  });

  it('suppresses an all-imports-unused report when a named import is used in a template', () => {
    const src = "import { UserCard } from './c';\nconst t = html`<UserCard/>`;";
    const s = sf(src);
    const u = usedComponentTags(ts, s);
    const importStart = src.indexOf('import');
    const d: ts.Diagnostic = {
      file: undefined,
      start: importStart,
      length: "import { UserCard } from './c';".length,
      code: 6192,
      category: ts.DiagnosticCategory.Warning,
      messageText: '',
    };
    expect(shouldSuppress(ts, s, d, u)).toBe(true);
  });
});

describe('isUnusedCode', () => {
  it('recognizes the unused-diagnostic codes', () => {
    expect(isUnusedCode(6133)).toBe(true);
    expect(isUnusedCode(6192)).toBe(true);
    expect(isUnusedCode(2304)).toBe(false);
  });
});
