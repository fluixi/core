// @vitest-environment jsdom
/**
 * Template copies belong to the page's document from the start, before they are inserted.
 */
import { describe, expect, it } from 'vitest';
import { cloneTemplate, createTemplate, template } from './runtime.js';

describe('template copies', () => {
  it('belong to the document, so a ref can read its body before insertion', () => {
    const el = template('<div class="pane"><span>x</span></div>')() as Element;
    expect(el.ownerDocument).toBe(document);
    expect(el.ownerDocument.body).not.toBeNull();
    expect(el.firstChild!.ownerDocument).toBe(document);
  });

  it('belong to the document on the hydratable path too', () => {
    const fragment = cloneTemplate(createTemplate('<p>a</p>'));
    expect(fragment.firstChild!.ownerDocument).toBe(document);
  });
});
