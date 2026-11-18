/** With `prerender: { static: true }`, the build names what fails without a server. */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { matchesPattern, staticProblems } from './commands/prerender.js';

describe('static deployment problems', () => {
  it('reports a link to a page not prerendered and a page calling a server function', async () => {
    const root = mkdtempSync(join(tmpdir(), 'fx-static-'));
    mkdirSync(join(root, 'dist/server/chunks'), { recursive: true });
    mkdirSync(join(root, 'dist/client/assets'), { recursive: true });
    writeFileSync(join(root, 'dist/server/chunks/fns.js'), 'register("ab12cd:0", save);');
    writeFileSync(join(root, 'dist/server/route-assets.json'), JSON.stringify({ '/notes/:id': ['/assets/note.js'], '/about': ['/assets/about.js'] }));
    writeFileSync(join(root, 'dist/client/assets/note.js'), 'const save = r(`ab12cd:0`);');
    writeFileSync(join(root, 'dist/client/assets/about.js'), 'const t = "12:00";');

    const problems = await staticProblems(root, ['/', '/about', '/notes/1'], new Map([['/pricing', '/'], ['/about', '/']]));
    expect(problems).toEqual([
      expect.stringContaining('/ links to /pricing, which was not prerendered'),
      expect.stringContaining('/notes/:id calls a server function (/assets/note.js)'),
    ]);
  });

  it('matches concrete paths against route patterns', () => {
    expect(matchesPattern('/notes/:id', '/notes/1')).toBe(true);
    expect(matchesPattern('/notes/:id', '/notes')).toBe(false);
    expect(matchesPattern('/files/*rest', '/files/a/b')).toBe(true);
    expect(matchesPattern('/', '/')).toBe(true);
  });
});
