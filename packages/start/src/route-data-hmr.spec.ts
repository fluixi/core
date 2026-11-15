// Editing a route file must change the generated route module.
//
// `routeData` is found by reading each file at scan time, so the route tree depends on file
// CONTENT, not only on which files exist. The dev-server watcher used to react to add/unlink
// and ignore `change`, which meant adding or editing a `routeData` export did nothing until
// the server was restarted. These assert the property the watcher relies on: a content edit
// produces a different module, and an unrelated edit does not.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanRoutes } from './route-scanner.js';
import { generateRouteModule } from './route-codegen.js';

let dir: string;
const build = () => generateRouteModule(scanRoutes(dir, { extensions: ['.tsx'] }), './src/routes');

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'fluixi-routes-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('route module regeneration', () => {
  it('changes when routeData is added to an existing file', () => {
    writeFileSync(join(dir, 'index.tsx'), 'export default function Home() {}\n');
    const before = build();
    expect(before).not.toMatch(/\bdata:/);

    writeFileSync(
      join(dir, 'index.tsx'),
      'export const routeData = () => ({ user: 1 });\nexport default function Home() {}\n',
    );
    const after = build();

    expect(after).not.toBe(before);
    expect(after).toMatch(/\bdata:/);
  });

  it('changes when routeData is removed', () => {
    writeFileSync(
      join(dir, 'index.tsx'),
      'export function routeData() { return 1; }\nexport default function Home() {}\n',
    );
    const withData = build();
    expect(withData).toMatch(/\bdata:/);

    writeFileSync(join(dir, 'index.tsx'), 'export default function Home() {}\n');
    expect(build()).not.toMatch(/\bdata:/);
  });

  it('does not change for an edit that leaves the tree alone', () => {
    // The watcher compares the generated module before reloading, so an ordinary save of a
    // route component must not trigger a full page reload.
    writeFileSync(join(dir, 'index.tsx'), 'export default function Home() { return 1; }\n');
    const before = build();

    writeFileSync(join(dir, 'index.tsx'), 'export default function Home() { return 2; }\n');
    expect(build()).toBe(before);
  });
});
