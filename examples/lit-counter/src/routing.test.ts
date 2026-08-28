// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from 'fluixi';
import { Router, Outlet, useParam, createMemoryHistory } from 'fluixi/router';
import { flush } from '@fluixi/reactive/signal';
import { html } from 'fluixi';

// Proof that routing works with html``-authored components: the route tree's
// components return html`` templates and use <Outlet/> — Router/Outlet compile
// to the same createComponent calls JSX produces, so the router adapter drives
// them identically.
const tick = async (ms = 40) => {
  await new Promise((r) => setTimeout(r, ms));
  await flush();
};

describe('routing with html`` components', () => {
  it('renders a nested layout with <Outlet/>', async () => {
    const routes = [
      {
        path: '/app',
        component: () => html`<div class="app"><nav>nav</nav><Outlet /></div>`,
        children: [
          { path: '/app/home', component: () => html`<div class="home">HOME</div>` },
        ],
      },
    ];
    const host = document.createElement('div');
    render(() => html`<Router routes=${routes} history=${createMemoryHistory('/app/home')} />`, host);
    await tick();

    expect(host.querySelector('.app nav')?.textContent).toBe('nav');
    expect(host.querySelector('.app .home')?.textContent).toBe('HOME');
  });

  it('reads a route param inside an html`` component', async () => {
    const User = () => {
      const id = useParam('id');
      return html`<span class="user">user ${id()}</span>`;
    };
    const routes = [{ path: '/u/:id', component: User }];
    const host = document.createElement('div');
    render(() => html`<Router routes=${routes} history=${createMemoryHistory('/u/42')} />`, host);
    await tick();

    expect(host.querySelector('.user')?.textContent).toContain('42');
  });
});
