// @vitest-environment jsdom
/**
 * <Router> not-found handling: an unmatched URL must render a fallback, never a blank page.
 * Covers the built-in default, a custom `notFound`, that a real match (and a catch-all `*` route)
 * suppress it, and that it reactively clears when navigating to a matched route.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { render, createNativeElement, insert } from '@fluixi/dom';
import { renderToStringAsync, setServerMode } from '@fluixi/server';
import { ensureIntegration } from '../render/component.js';
import { Router, createMemoryHistory } from './index.js';

beforeAll(() => ensureIntegration());

function el(tag: string, text: string): any {
  const e = createNativeElement(tag);
  insert(e, text);
  return e;
}

const Home = () => el('div', 'HOME');
const About = () => el('main', 'ABOUT');
const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
];

describe('Router not-found', () => {
  it('renders the built-in 404 for an unmatched URL', () => {
    const container = document.createElement('div');
    render(() => Router({ routes, history: createMemoryHistory('/nope') }), container);
    expect(container.querySelector('.fx-not-found')).toBeTruthy();
    expect(container.textContent).toContain('404');
  });

  it('a matched route does NOT show the 404', () => {
    const container = document.createElement('div');
    render(() => Router({ routes, history: createMemoryHistory('/about') }), container);
    expect(container.querySelector('.fx-not-found')).toBeNull();
    expect(container.textContent).toContain('ABOUT');
  });

  it('renders a custom notFound component', () => {
    const NotFound = () => el('section', 'CUSTOM 404');
    const container = document.createElement('div');
    render(() => Router({ routes, history: createMemoryHistory('/x'), notFound: NotFound }), container);
    expect(container.querySelector('.fx-not-found')).toBeNull();
    expect(container.textContent).toContain('CUSTOM 404');
  });

  it('a catch-all (*) route wins over the default 404', () => {
    const withSplat = [...routes, { path: '*', component: () => el('div', 'SPLAT') }];
    const container = document.createElement('div');
    render(() => Router({ routes: withSplat, history: createMemoryHistory('/whatever') }), container);
    expect(container.querySelector('.fx-not-found')).toBeNull();
    expect(container.textContent).toContain('SPLAT');
  });

  it('clears the 404 reactively when navigating to a real route', async () => {
    const history = createMemoryHistory('/nope');
    const container = document.createElement('div');
    render(() => Router({ routes, history }), container);
    expect(container.textContent).toContain('404');
    history.push('/about');
    await Promise.resolve();
    expect(container.querySelector('.fx-not-found')).toBeNull();
    expect(container.textContent).toContain('ABOUT');
  });

  it('server-renders the default 404 (no blank output)', async () => {
    setServerMode(true);
    const html = await renderToStringAsync(() =>
      Router({ routes, history: createMemoryHistory('/missing') }),
    );
    setServerMode(false);
    expect(html).toContain('fx-not-found');
    expect(html).toContain('404');
  });
});
