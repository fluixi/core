// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from 'fluixi';
import { flush } from '@fluixi/reactive/signal';
import { TodoApp } from './App';

// Real-DOM proof for control flow: For (keyed list) + Show (empty state) + input
// binding + delegated click handlers, all compiled by @fluixi/vite-plugin.
async function typeInto(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await flush();
}

describe('Todo example in a real DOM', () => {
  it('shows the empty state, then adds and removes items', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(() => <TodoApp />, host);

    // Show fallback while empty
    expect(host.querySelector('.empty')).toBeTruthy();
    expect(host.querySelector('.list')).toBeNull();
    expect(host.querySelector('.count')?.textContent).toContain('0');

    const input = host.querySelector('.new') as HTMLInputElement;
    const addBtn = host.querySelector('.add') as HTMLButtonElement;

    await typeInto(input, 'buy milk');
    addBtn.click();
    await flush();
    await typeInto(input, 'walk dog');
    addBtn.click();
    await flush();

    // Show now renders the list with two For rows
    expect(host.querySelector('.empty')).toBeNull();
    expect(host.querySelectorAll('.item').length).toBe(2);
    expect(host.textContent).toContain('buy milk');
    expect(host.textContent).toContain('walk dog');
    expect(host.querySelector('.count')?.textContent).toContain('2');

    // Remove the first item via its delegated click handler
    (host.querySelectorAll('.item .rm')[0] as HTMLButtonElement).click();
    await flush();
    expect(host.querySelectorAll('.item').length).toBe(1);
    expect(host.textContent).toContain('walk dog');
    expect(host.querySelector('.count')?.textContent).toContain('1');

    // Removing the last returns to the empty state
    (host.querySelector('.item .rm') as HTMLButtonElement).click();
    await flush();
    expect(host.querySelectorAll('.item').length).toBe(0);
    expect(host.querySelector('.empty')).toBeTruthy();
  });
});
