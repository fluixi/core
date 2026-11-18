import { describe, expect, it } from 'vitest';
import { renderToString } from './server/render.js';
import { createDynamicElement } from './dynamic-element.js';

const page = () => createDynamicElement('main', { get children() { return createDynamicElement('p', { children: 'hi' }); } });

describe('createDynamicElement in a server render', () => {
  it('marks its children for hydration', () => {
    expect(renderToString(page)).toContain('<!--fx-->');
  });

  it('writes plain markup when nothing will hydrate it', () => {
    expect(renderToString(page, { hydrationKeys: false })).toBe('<main><p>hi</p></main>');
  });
});
