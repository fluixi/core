/**
 * A spread is read where it is applied, not where the element is created. One built by a call
 * (`{...attributes()}`) goes to `mergeProps` as a function: read at creation, the signals behind
 * it belonged to whatever was creating the element, which then rebuilt it on every change, or,
 * outside any tracking scope, never updated it at all.
 */
import { describe, expect, it } from 'vitest';
import { compile, flat } from '../test/fixtures.js';

describe('spread arguments', () => {
  it('passes a computed spread as a function', () => {
    const out = flat(compile('const v = <x-picker {...attributes()} />;'));
    expect(out).toContain('mergeProps(() => (attributes())');
  });

  it('passes a computed spread to a component as a function too', () => {
    const out = flat(compile('const v = <Picker {...attributes()} open={o()} />;'));
    expect(out).toContain('mergeProps(() => (attributes())');
  });

  it('keeps a plain name as it is', () => {
    const out = flat(compile('const v = <div {...others} />;'));
    expect(out).toContain('mergeProps(others,');
    expect(flat(compile('const v = <div {...props.rest} />;'))).toContain('mergeProps(props.rest,');
  });
});
