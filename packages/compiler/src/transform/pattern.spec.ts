import { it, expect } from 'vitest';
import { transformTemplates } from './templates.js';

it('one pattern rule covers every component in a directory', () => {
  const out = transformTemplates(
    'export function App() { return <div><Summary /><RevenueChart load:visible="200px" /></div>; }',
    'a.tsx',
    {
      format: 'jsx',
      runtimeModule: '@fluixi/dom',
      // No per-component entries at all.
      resolve: [{ match: /^([A-Z]\w+)$/, module: '/src/components/$1.tsx' }],
    } as never,
  )!;
  console.log(out.code);
  expect(out.unresolvedDiagnostics).toBeUndefined();
});
