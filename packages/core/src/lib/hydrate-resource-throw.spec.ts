// @vitest-environment jsdom
/**
 * A resource read during hydration adopts the server-rendered node exactly once: guarded
 * (`.loading`) or suspending while pending, under <Suspense> or not, with the client resource
 * seeded from __FX_DATA__ or fetching again. Without that the content is rebuilt beside the
 * server's ("User #9User #9").
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as DOM from '@fluixi/dom';
import * as S from '@fluixi/reactive/signal';
import { renderToStringAsync, setServerMode } from '@fluixi/server';
import { ensureIntegration } from './render/component.js';
import * as babel from '@babel/core';
import { transformTemplates } from '@fluixi/compiler/transform';
import * as Fluixi from '@fluixi/core';

beforeAll(() => ensureIntegration());

function compile(source: string): any {
  const opts = { importSource: '@fluixi/dom', signalModule: '@fluixi/dom', controlFlowModule: '@fluixi/dom' };
  const result = transformTemplates(source, '/app/src/app.tsx', { ...opts, runtimeModule: opts.signalModule, sourceRoot: '/app' });
  const code = babel.transformSync(result!.code, {
    filename: 't.js', configFile: false, babelrc: false,
    plugins: [['@babel/plugin-transform-modules-commonjs']],
  })!.code!;
  const m = { exports: {} as any };
  const map: Record<string, unknown> = { '@fluixi/dom': DOM, '@fluixi/reactive/signal': S, '@fluixi/core': Fluixi };
  const req = (id: string) => { if (id in map) return map[id]; throw new Error('unexpected require: ' + id); };
  new Function('exports', 'require', 'module', code)(m.exports, req, m);
  return m.exports;
}

const UNGUARDED = `
  import { createResource } from '@fluixi/reactive/signal';
  import { Suspense } from '@fluixi/core';
  export function App() {
    const [user] = createResource(() => new Promise((r) => setTimeout(() => r({ name: 'User #9' }), 5)));
    return <Suspense fallback={<p>loading</p>}><p class="who">{() => user().name}</p></Suspense>;
  }
`;
const NO_SUSPENSE = `
  import { createResource } from '@fluixi/reactive/signal';
  export function App() {
    const [user] = createResource(() => new Promise((r) => setTimeout(() => r({ name: 'User #9' }), 5)));
    return <p class="who">{() => user().name}</p>;
  }
`;
const DIRECT = `
  import { createResource } from '@fluixi/reactive/signal';
  import { Suspense } from '@fluixi/core';
  export function App() {
    const [user] = createResource(() => new Promise((r) => setTimeout(() => r({ name: 'User #9' }), 5)));
    return <Suspense fallback={<p>loading</p>}><p class="who">{user().name}</p></Suspense>;
  }
`;
const GUARDED_HANDLE = `
  import { resource } from '@fluixi/reactive/signal';
  import { Suspense } from '@fluixi/core';
  export function App() {
    const user = resource(() => new Promise((r) => setTimeout(() => r({ name: 'User #9' }), 5)));
    return <Suspense fallback={<p>loading</p>}><p class="who">{() => (user.loading ? 'loading' : user().name)}</p></Suspense>;
  }
`;
const GUARDED = `
  import { createResource } from '@fluixi/reactive/signal';
  import { Suspense } from '@fluixi/core';
  export function App() {
    const [user] = createResource(() => new Promise((r) => setTimeout(() => r({ name: 'User #9' }), 5)));
    return <Suspense fallback={<p>loading</p>}><p class="who">{() => (user.loading ? 'loading' : user().name)}</p></Suspense>;
  }
`;

async function roundTrip(src: string, stripSeed = false) {
  const { App } = compile(src);
  setServerMode(true);
  const html = await renderToStringAsync(() => App());
  setServerMode(false);
  document.body.innerHTML = `<div id="app">${html}</div>`;
  const container = document.getElementById('app')!;
  if (stripSeed) document.getElementById('__FX_DATA__')?.remove();
  DOM.hydrate(() => App(), container);
  await vi.waitFor(() => expect(container.querySelector('.who')?.textContent).toBe('User #9'));
  await S.flush();
  return { afterText: container.querySelector('.who')?.textContent, count: container.querySelectorAll('.who').length };
}

describe('resource read during hydration', () => {
  it('unguarded throwing read', async () => {
    const r = await roundTrip(UNGUARDED);
    expect(r.afterText).toBe('User #9');
    expect(r.count).toBe(1);
  });
  it('unguarded throwing read, without seed (the client fetches again)', async () => {
    const r = await roundTrip(UNGUARDED, true);
    expect(r.afterText).toBe('User #9');
    expect(r.count).toBe(1);
  });
  it('unguarded read, no Suspense, seeded', async () => {
    const r = await roundTrip(NO_SUSPENSE);
    expect(r.afterText).toBe('User #9');
    expect(r.count).toBe(1);
  });
  it('unguarded read, no Suspense, without seed', async () => {
    const r = await roundTrip(NO_SUSPENSE, true);
    expect(r.afterText).toBe('User #9');
    expect(r.count).toBe(1);
  });
  it('direct render-time read, seeded', async () => {
    const r = await roundTrip(DIRECT);
    expect(r.afterText).toBe('User #9');
    expect(r.count).toBe(1);
  });
  it('direct render-time read, without seed', async () => {
    const r = await roundTrip(DIRECT, true);
    expect(r.afterText).toBe('User #9');
    expect(r.count).toBe(1);
  });
  it('guarded read (control)', async () => {
    const r = await roundTrip(GUARDED);
    expect(r.afterText).toBe('User #9');
    expect(r.count).toBe(1);
  });
  it('guarded read through the resource handle', async () => {
    const r = await roundTrip(GUARDED_HANDLE);
    expect(r.afterText).toBe('User #9');
    expect(r.count).toBe(1);
  });
});
