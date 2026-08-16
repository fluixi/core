// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@fluixi/core';
import { App, IntrinsicCounter, Mixed, RuntimeCounter } from './App';

/**
 * The claim is equivalence, so the tests drive both forms through the same steps and
 * compare the results rather than checking each one against a number.
 */
function mount(view: () => unknown) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(view as never, host);
  return host;
}

/** Click `+` n times and report what the value read at each step. */
function run(view: () => unknown, clicks = 3) {
  const host = mount(view);
  const value = () => host.querySelector('.value')?.textContent;
  const button = host.querySelector('.inc') as HTMLButtonElement;

  const seen = [value()];
  for (let i = 0; i < clicks; i++) {
    button.click();
    seen.push(value());
  }
  return seen;
}

describe('$signal is the runtime API', () => {
  it('counts the same as the explicit form, step for step', () => {
    expect(run(() => <IntrinsicCounter />)).toEqual(run(() => <RuntimeCounter />));
  });

  it('starts where it should and updates on click', () => {
    expect(run(() => <IntrinsicCounter />)).toEqual(['0', '1', '2', '3']);
  });
});

describe('the two forms compose', () => {
  it('derives an intrinsic memo from a runtime signal', () => {
    // The memo tracks a signal created by the other API, because there is one graph.
    expect(run(() => <Mixed />)).toEqual(['2', '4', '6', '8']);
  });
});

describe('a whole app', () => {
  it('renders every counter and keeps them independent', () => {
    const host = mount(() => <App />);
    expect(host.querySelectorAll('.value').length).toBe(3);

    (host.querySelector('.intrinsic .inc') as HTMLButtonElement).click();
    expect(host.querySelector('.intrinsic .value')?.textContent).toBe('1');
    expect(host.querySelector('.runtime .value')?.textContent).toBe('0');
  });
});
