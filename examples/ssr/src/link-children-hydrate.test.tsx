// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderToString } from '@fluixi/server';
import { hydrate } from '@fluixi/dom';
import { LinkChildrenApp } from './LinkChildrenApp';

// An element built imperatively (createNativeElement + insert), the way <Link> and
// <Form> build theirs, must adopt its server children instead of appending a copy.
describe('hydrate imperative element children', () => {
  it('does not duplicate element children', () => {
    const html = renderToString(() => LinkChildrenApp());
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = html;
    expect(container.querySelectorAll('.lbl').length).toBe(1);

    hydrate(() => LinkChildrenApp(), container);

    expect(container.querySelectorAll('a').length).toBe(2);
    expect(container.querySelectorAll('.logo').length).toBe(1);
    expect(container.querySelectorAll('.lbl').length).toBe(1);
    expect(container.querySelectorAll('.ttl').length).toBe(1);
  });
});
