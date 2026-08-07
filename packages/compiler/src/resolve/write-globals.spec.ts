import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeComponentGlobals } from './write-globals.js';

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
    expect(readFileSync(join(root, 'src/fluixi.d.ts'), 'utf8')).toContain(
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
    writeFileSync(join(root, 'src/fluixi.d.ts'), 'declare const mine: string;\n');

    const result = writeComponentGlobals({ resolve: rules }, root);

    expect(result).toMatchObject({ status: 'skipped', reason: 'foreign-file' });
    expect(readFileSync(join(root, 'src/fluixi.d.ts'), 'utf8')).toBe('declare const mine: string;\n');
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

    const source = readFileSync(join(root, 'src/fluixi.d.ts'), 'utf8');
    expect(source).toContain('Button');
    // Declaring it would resolve to nothing and silently degrade Ghost to `any`.
    expect(source).not.toContain('Ghost');
  });
});
