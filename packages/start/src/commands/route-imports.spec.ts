import { describe, it, expect } from 'vitest';
import { withImports } from './route-imports.js';

const chunks = {
  'src/routes/signin.tsx': { file: 'assets/signin-a.js', css: ['assets/signin-a.css'], imports: ['_auth.js', '_runtime.js'] },
  'src/routes/signup.tsx': { file: 'assets/signup-b.js', imports: ['_auth.js'] },
  '_auth.js': { file: 'assets/auth-c.js', css: ['assets/auth-c.css'], imports: ['_runtime.js'] },
  '_runtime.js': { file: 'assets/runtime-d.js' },
};

describe('withImports', () => {
  it('adds the chunks a route imports and their CSS, dependencies first', () => {
    expect(withImports(['/assets/signin-a.js', '/assets/signin-a.css'], chunks)).toEqual([
      '/assets/runtime-d.js',
      '/assets/auth-c.css',
      '/assets/auth-c.js',
      '/assets/signin-a.js',
      '/assets/signin-a.css',
    ]);
  });

  it("names a shared component's stylesheet for a route with no CSS of its own", () => {
    expect(withImports(['/assets/signup-b.js'], chunks)).toContain('/assets/auth-c.css');
  });

  it('keeps the base the SSR manifest put in front', () => {
    expect(withImports(['/app/assets/signup-b.js'], chunks)).toContain('/app/assets/auth-c.css');
  });

  it('leaves files it cannot find in the manifest as they are', () => {
    expect(withImports(['/assets/other.js'], chunks)).toEqual(['/assets/other.js']);
  });
});
