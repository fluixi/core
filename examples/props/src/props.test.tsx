// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createSignal, render } from '@fluixi/core';
import { App, Badge, Field, Label, UserCard } from './App';

/**
 * Compiled by the real plugin with `propsDestructure` on, rendered into a real DOM.
 * Each of these fails with the option off, which is the point of keeping them here
 * rather than in the compiler's own specs: they describe the app, not the transform.
 */
function mount(view: () => unknown) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(view as never, host);
  return host;
}

describe('a destructured prop stays live', () => {
  it('updates a shorthand binding', () => {
    const host = mount(() => <App />);
    expect(host.querySelector('.label')?.textContent).toBe('Ada');

    (host.querySelector('.rename') as HTMLButtonElement).click();
    expect(host.querySelector('.label')?.textContent).toBe('Grace');
  });

  it('updates through a nested pattern', () => {
    const host = mount(() => <App />);
    expect(host.querySelector('.name')?.textContent).toBe('Ada');
    expect(host.querySelector('.role')?.textContent).toBe('author');

    (host.querySelector('.promote') as HTMLButtonElement).click();
    expect(host.querySelector('.role')?.textContent).toBe('maintainer');
    expect(host.querySelector('.name')?.textContent).toBe('Ada');
  });

  it('keeps an alias pointing at the prop it renamed', () => {
    const host = mount(() => <Label text="hello" tone="calm" />);
    expect(host.querySelector('.label')?.getAttribute('data-mood')).toBe('calm');
  });
});

describe('defaults behave like JavaScript defaults', () => {
  it('applies when the prop is missing', () => {
    const host = mount(() => <Badge text="x" />);
    expect(host.querySelector('.badge')?.getAttribute('data-size')).toBe('md');
  });

  it('steps aside when the prop is given', () => {
    const host = mount(() => <Badge text="x" size="lg" />);
    expect(host.querySelector('.badge')?.getAttribute('data-size')).toBe('lg');
  });

  it('leaves null alone, since only undefined triggers a default', () => {
    const host = mount(() => <Badge text="x" size={null as never} />);
    expect(host.querySelector('.badge')?.hasAttribute('data-size')).toBe(false);
  });
});

describe('rest', () => {
  it('forwards the props it was not asked about', () => {
    const host = mount(() => <Field label="Name" type="email" placeholder="you@example.com" />);
    const input = host.querySelector('input')!;

    expect(input.getAttribute('type')).toBe('email');
    expect(input.getAttribute('placeholder')).toBe('you@example.com');
    expect(host.querySelector('.field-label')?.textContent).toBe('Name');
  });

  it('keeps a forwarded prop live, not just the named ones', () => {
    // splitProps hands the rest over as getters, so a signal behind a forwarded prop
    // still reaches the element through the spread.
    const [role, setRole] = createSignal('one');
    const host = mount(() => <Field label="x" data-role={role()} />);
    const input = host.querySelector('input')!;
    expect(input.getAttribute('data-role')).toBe('one');

    setRole('two');
    expect(input.getAttribute('data-role')).toBe('two');
  });

  it('keeps the named half live', () => {
    const host = mount(() => <App />);
    expect(host.querySelector('.field-label')?.textContent).toBe('Ada');

    (host.querySelector('.rename') as HTMLButtonElement).click();
    expect(host.querySelector('.field-label')?.textContent).toBe('Grace');
  });
});
