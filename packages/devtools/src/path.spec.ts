import { describe, it, expect } from 'vitest';
import { shortenPath } from './path.js';

describe('shortening a path for display', () => {
  it('leaves a path that is already relative to the project', () => {
    expect(shortenPath('src/App.tsx')).toBe('src/App.tsx');
  });

  it('cuts the machine off a monorepo package', () => {
    expect(shortenPath('/Users/me/work/fluixi-core/packages/dom/src/lib/dom/runtime.ts')).toBe(
      'packages/dom/src/lib/dom/runtime.ts',
    );
  });

  it('does the same when the leading slash was trimmed off', () => {
    // The origin is stripped before a node is sent, which takes the slash with it.
    expect(shortenPath('Users/me/work/fluixi-core/packages/core/src/lib/router/data.ts')).toBe(
      'packages/core/src/lib/router/data.ts',
    );
  });

  it('names the package an installed file belongs to', () => {
    expect(shortenPath('/Users/me/app/node_modules/@fluixi/core/dist/signal.js')).toBe(
      '@fluixi/core/dist/signal.js',
    );
  });

  it('takes the last node_modules when they nest', () => {
    expect(
      shortenPath('/app/node_modules/a/node_modules/@fluixi/dom/dist/x.js'),
    ).toBe('@fluixi/dom/dist/x.js');
  });

  it('uses the project root when the host knows it', () => {
    expect(shortenPath('/Users/me/work/app/src/App.tsx', '/Users/me/work/app')).toBe('src/App.tsx');
  });

  it('matches a root against a path that lost its slash', () => {
    expect(shortenPath('Users/me/work/app/src/App.tsx', '/Users/me/work/app')).toBe('src/App.tsx');
  });

  it('prefers the root over the package reading', () => {
    expect(
      shortenPath('/Users/me/work/core/packages/dom/src/x.ts', '/Users/me/work/core/packages/dom'),
    ).toBe('src/x.ts');
  });

  it('reads a windows path', () => {
    expect(shortenPath('C:\\work\\app\\node_modules\\@fluixi\\core\\dist\\x.js')).toBe(
      '@fluixi/core/dist/x.js',
    );
  });

  it('leaves an absolute path it cannot place', () => {
    // Shorter would be prettier and would stop saying which file it is.
    expect(shortenPath('/etc/hosts')).toBe('/etc/hosts');
  });

  it('takes the last marker, not the first', () => {
    // A checkout under ~/Developer/libs has one in the machine's part of the path too.
    expect(
      shortenPath('Users/me/Developer/libs/fluixi-core/packages/dom/src/lib/dom/runtime.ts'),
    ).toBe('packages/dom/src/lib/dom/runtime.ts');
  });

  it('names the example an app under one belongs to', () => {
    expect(shortenPath('/Users/me/work/core/examples/start-app/src/app.tsx')).toBe(
      'examples/start-app/src/app.tsx',
    );
  });

  it('leaves a bare app path alone rather than cutting at a folder name', () => {
    expect(shortenPath('apps/web/src/App.tsx')).toBe('apps/web/src/App.tsx');
  });
});
