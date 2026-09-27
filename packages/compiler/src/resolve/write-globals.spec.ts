import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { patternCandidates, writeComponentGlobals } from './write-globals.js';

const rules = [{ components: { Button: '@ui/button' } }];

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'fluixi-globals-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies: { '@ui/button': '1' } }));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('writeComponentGlobals', () => {
  it('writes the declarations, creating the directory', () => {
    const result = writeComponentGlobals({ resolve: rules }, root);
    expect(result.status).toBe('written');
    expect(readFileSync(join(root, 'fluixi.d.ts'), 'utf8')).toContain(
      'export import Button = __ui_button.Button;',
    );
  });

  it('reports unchanged rather than rewriting identical content', () => {
    writeComponentGlobals({ resolve: rules }, root);
    // An identical write still bumps mtime, which the dev server watches.
    expect(writeComponentGlobals({ resolve: rules }, root).status).toBe('unchanged');
  });

  it('refuses to overwrite a file it did not generate', () => {
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'fluixi.d.ts'), 'declare const mine: string;\n');

    const result = writeComponentGlobals({ resolve: rules }, root);

    expect(result).toMatchObject({ status: 'skipped', reason: 'foreign-file' });
    expect(readFileSync(join(root, 'fluixi.d.ts'), 'utf8')).toBe('declare const mine: string;\n');
  });

  it('honours a custom path', () => {
    const result = writeComponentGlobals({ resolve: rules, globals: 'types/gen.d.ts' }, root);
    expect(result.status).toBe('written');
    expect(readFileSync(join(root, 'types/gen.d.ts'), 'utf8')).toContain('declare global');
  });

  it('does nothing when disabled', () => {
    const result = writeComponentGlobals({ resolve: rules, globals: false }, root);
    expect(result).toMatchObject({ status: 'skipped', reason: 'disabled' });
  });

  it('skips components whose package the project does not depend on', () => {
    const extra = [{ components: { Button: '@ui/button', Ghost: '@ui/not-installed' } }];
    writeComponentGlobals({ resolve: extra }, root);

    const source = readFileSync(join(root, 'fluixi.d.ts'), 'utf8');
    expect(source).toContain('Button');
    // Declaring it would resolve to nothing and silently degrade Ghost to `any`.
    expect(source).not.toContain('Ghost');
  });

  // A file TypeScript never reads looks exactly like one that was never generated:
  // every resolved tag stays `Cannot find name`, with the file sitting right there.
  it('warns when the target is outside the tsconfig include', () => {
    writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ include: ['src'] }));

    const result = writeComponentGlobals({ resolve: rules }, root);

    expect(result.status).toBe('written');
    expect(result.warning).toContain('not covered by "include"');
  });

  it('stays quiet when the include covers it', () => {
    writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ include: ['src', 'fluixi.d.ts'] }));
    expect(writeComponentGlobals({ resolve: rules }, root).warning).toBeUndefined();
  });

  it('stays quiet for a directory entry that contains the target', () => {
    writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ include: ['types'] }));
    const result = writeComponentGlobals({ resolve: rules, globals: 'types/gen.d.ts' }, root);
    expect(result.warning).toBeUndefined();
  });

  it('stays quiet for a glob that matches', () => {
    writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ include: ['src', '*.d.ts'] }));
    expect(writeComponentGlobals({ resolve: rules }, root).warning).toBeUndefined();
  });

  it('does not guess when tsconfig extends another config', () => {
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({ extends: './base.json', include: ['src'] }),
    );
    // The base could widen `include`; guessing wrong would warn about a file that works.
    expect(writeComponentGlobals({ resolve: rules }, root).warning).toBeUndefined();
  });

  it('treats a missing include as covering everything', () => {
    writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }));
    expect(writeComponentGlobals({ resolve: rules }, root).warning).toBeUndefined();
  });
});

describe('patternCandidates', () => {
  it('offers the file names a pattern module path points at', () => {
    mkdirSync(join(root, 'src/components'), { recursive: true });
    for (const f of ['StatusPill.tsx', 'RequestFacts.tsx', 'styles.css']) writeFileSync(join(root, 'src/components', f), '');
    const rules = [
      { match: /^([A-Z]\w+)$/, module: '/src/components/$1.tsx' },
      // Not a project path, and a group in the directory: neither can be listed.
      { match: /^Icon(.+)$/, module: '@/icons/$1' },
      { match: /^(\w+)Page$/, module: '/src/$1/page.tsx' },
    ];
    expect(patternCandidates(rules, root).sort()).toEqual(['RequestFacts', 'StatusPill']);
  });

  it('declares them in the written file', () => {
    mkdirSync(join(root, 'src/components'), { recursive: true });
    writeFileSync(join(root, 'src/components/StatusPill.tsx'), '');
    writeComponentGlobals({ resolve: [{ match: /^([A-Z]\w+)$/, module: '/src/components/$1.tsx' }] }, root);
    expect(readFileSync(join(root, 'fluixi.d.ts'), 'utf8')).toContain(
      "export import StatusPill = __src_components_StatusPill_tsx.StatusPill;",
    );
  });
});
