// @vitest-environment jsdom
/**
 * The client entry waits for the app's work before its first render (DI app initializers), and
 * runs it once for the page.
 */
import { describe, it, expect } from 'vitest';
import { beforeFirstRender } from '@fluixi/dom';
import { startClient } from './index.js';

describe('startClient', () => {
  it('renders once the work registered before the first render is done', async () => {
    const order: string[] = [];
    let ready = '';
    beforeFirstRender(async () => {
      order.push('task started');
      await new Promise((r) => setTimeout(r, 10));
      ready = 'loaded';
      order.push('task done');
    });
    const root = document.createElement('div');
    document.body.append(root);
    await startClient(() => {
      order.push(`render saw ${ready}`);
      return 'app';
    }, { root });
    expect(order).toEqual(['task started', 'task done', 'render saw loaded']);
    expect(root.textContent).toBe('app');

    // A second app on the same page does not run it again.
    const other = document.createElement('div');
    document.body.append(other);
    await startClient(() => 'second', { root: other });
    expect(order.filter((e) => e === 'task started')).toHaveLength(1);
  });
});
