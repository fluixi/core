// @vitest-environment jsdom
//
// A template is emitted as one string, so a source map traces every element in it back to the
// line the root opens at. The compiler lists the positions instead and the runtime writes them
// onto the clone; devtools reads them back off the elements.
import { describe, it, expect } from 'vitest';
import { templateNode } from './runtime.js';

const at = (el: Element) => (el as unknown as Record<string, unknown>)['__fx_loc'];

describe('a template carries where each element was written', () => {
  const html = '<section class="home"><h1></h1><p></p></section>';
  const pos = { file: 'src/routes/index.tsx', pos: [10, 4, 11, 6, 12, 6] };

  it('stamps the root and its descendants in document order', () => {
    const root = templateNode(html, 'section', false, false, pos) as Element;
    expect(at(root)).toEqual({ file: 'src/routes/index.tsx', line: 10, column: 4 });
    expect(at(root.querySelector('h1')!)).toEqual({ file: 'src/routes/index.tsx', line: 11, column: 6 });
    expect(at(root.querySelector('p')!)).toEqual({ file: 'src/routes/index.tsx', line: 12, column: 6 });
  });

  it('leaves the clone alone when the build recorded nothing', () => {
    const root = templateNode(html, 'section') as Element;
    expect(at(root)).toBeUndefined();
    expect(at(root.querySelector('p')!)).toBeUndefined();
  });

  it('skips an element the compiler had no position for', () => {
    const root = templateNode(html, 'section', false, false, {
      file: 'src/routes/index.tsx',
      pos: [10, 4, 0, 0, 12, 6],
    }) as Element;
    expect(at(root.querySelector('h1')!)).toBeUndefined();
    expect(at(root.querySelector('p')!)).toEqual({ file: 'src/routes/index.tsx', line: 12, column: 6 });
  });
});
