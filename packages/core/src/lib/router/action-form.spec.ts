// @vitest-environment jsdom
/** <ActionForm> posts its fields to a router action, and works as a plain form without script. */
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@fluixi/dom';
import { ensureIntegration } from '../render/component.js';
import * as router from './index.js';
import { ActionForm, Router, createMemoryHistory } from './index.js';
import { action } from './data.js';

beforeEach(() => ensureIntegration());

describe('<ActionForm>', () => {
  it('posts to the action url and hands the fields to the action', async () => {
    const received: Record<string, unknown>[] = [];
    const save = action(async (fields: Record<string, unknown>) => {
      received.push(fields);
    }, 'note.save');
    const container = document.createElement('div');
    document.body.appendChild(container);

    const Page = () => {
      const field = document.createElement('input');
      field.name = 'title';
      field.value = 'Hello';
      return ActionForm({ action: save, children: field } as never);
    };
    render(() => Router({ routes: [{ path: '/', component: Page }], history: createMemoryHistory('/') } as never), container);
    await Promise.resolve();

    const form = container.querySelector('form')!;
    expect(form.getAttribute('method')).toBe('post');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await Promise.resolve();
    expect(received).toEqual([{ title: 'Hello' }]);
  });

  it('is the only form the router exports', () => {
    expect('Form' in router).toBe(false);
  });
});
