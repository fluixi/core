/**
 * What the two build modes produce.
 *
 * The claim worth testing is not that vite ran. It is that the standalone file imports
 * nothing, because that is what lets a page load it with no Fluixi installed, and that
 * the shared one imports the runtime rather than carrying a copy.
 *
 * The element is compiled from real source through the real plugins, so a change to the
 * codegen or the externals list shows up here.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWebComponents } from './web-component.js';

/**
 * Registers an element the plain way.
 *
 * `@fluixi/web-components` is deliberately absent: nothing in @fluixi/start depends on
 * it, and adding a dependency to make a test compile would invert the direction the
 * package architecture is built on. What is under test here is the bundling, and the
 * runtime this pulls in is the same one either way.
 */
const SOURCE = `
import { createNativeElement, insert } from '@fluixi/dom';
import { createSignal } from '@fluixi/core';

customElements.define('probe-counter', class extends HTMLElement {
  connectedCallback() {
    const [count, setCount] = createSignal(0);
    const button = createNativeElement('button');
    button.addEventListener('click', () => setCount(count() + 1));
    insert(button, () => count());
    this.appendChild(button);
  }
});
`;

let root: string;

beforeAll(() => {
  // Inside the package, not in /tmp: vite resolves `@fluixi/dom` by walking up to a
  // node_modules, and a temp directory has none to find.
  root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.wc-fixture');
  rmSync(root, { recursive: true, force: true });
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src', 'counter.ts'), SOURCE);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'probe', type: 'module' }));
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

const read = (file: string): string => readFileSync(join(root, file), 'utf8');
/** Bare specifiers left in the output, which is what a consumer would have to install. */
const imports = (code: string): string[] => [
  ...new Set([...code.matchAll(/from\s*["']([^"'.][^"']*)["']/g)].map((m) => m[1])),
];

describe('standalone', () => {
  it('imports nothing, so a page needs no Fluixi installed', async () => {
    const written = await buildWebComponents(
      { entries: 'src/counter.ts', mode: 'standalone' },
      { root },
    );

    expect(written).toEqual(['dist/elements/counter.js']);
    expect(imports(read(written[0]))).toEqual([]);
  }, 60_000);

  it('carries the element and its runtime', async () => {
    const code = read('dist/elements/counter.js');
    expect(code).toContain('probe-counter');
    expect(code).toContain('customElements');
    // The reactive runtime came with it, which is the point of the mode.
    expect(code).toContain('function');
  });

  it('leaves out what the element never used', async () => {
    // The brief's §22: a counter has no business shipping the router or the server.
    const code = read('dist/elements/counter.js');
    for (const absent of ['matchRoutes', 'renderToString', 'createResource', 'handleServerFn']) {
      expect(code, `${absent} should not be bundled`).not.toContain(absent);
    }
  });
});

describe('shared', () => {
  it('leaves the runtime as imports, so several elements use one copy', async () => {
    const written = await buildWebComponents(
      { entries: 'src/counter.ts', mode: 'shared', outDir: 'dist/shared' },
      { root },
    );

    const code = read(written[0]);
    const bare = imports(code);
    expect(bare).toContain('@fluixi/dom');
    expect(bare.every((s) => s.startsWith('@fluixi/'))).toBe(true);
  }, 60_000);

  it('is a fraction of the standalone size', async () => {
    const standalone = read('dist/elements/counter.js').length;
    const shared = read('dist/shared/counter.js').length;
    expect(shared).toBeLessThan(standalone / 4);
  });
});
