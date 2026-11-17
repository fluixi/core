/**
 * A string assigned to a prop that is not a string, as JSX does for `<fx-x n="2">`, is read the
 * way its attribute would be.
 */
import { describe, it, expect } from 'vitest';
import { typedElement, prop, defineCustomElement } from './index.js';

class Props extends typedElement({ n: prop.number(1), label: prop.string(''), items: prop.object<string[]>([]) }) {
  protected override render(): unknown {
    return null;
  }
}
defineCustomElement('fx-string-literal-props', Props);

describe('a string literal on a typed prop', () => {
  it('is parsed like the attribute for a non-string prop, kept as is for a string prop', () => {
    const el = document.createElement('fx-string-literal-props') as unknown as { n: unknown; label: unknown; items: unknown };
    el.n = '2';
    el.label = '2';
    el.items = '["a","b"]';
    expect(el.n).toBe(2);
    expect(el.label).toBe('2');
    expect(el.items).toEqual(['a', 'b']);
    el.n = 5;
    expect(el.n).toBe(5);
  });
});
