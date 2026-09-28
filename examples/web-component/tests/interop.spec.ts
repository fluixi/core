/**
 * The built elements, used the way a page that does not run Fluixi uses them: loaded from
 * `dist/` (each file carries its own copy of the runtime) and driven from plain DOM, React,
 * Vue and Svelte. What is checked is the boundary: a value arrives as a property, the element
 * renders it, and its `CustomEvent` reaches the host framework's handler.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

type Counter = HTMLElement & { step: number; label: string; reset(): void };

// jsdom gives `import.meta.url` a non-file scheme; vitest provides __dirname.
const here = __dirname;
const output = (el: Element) => el.querySelector('output')!.textContent;
const plus = (el: Element) => el.querySelector('button')! as HTMLButtonElement;

beforeAll(async () => {
  // Two files, two copies of the runtime on one page: the ordinary way a page gets them.
  // By path: the built files are plain JS with no declarations of their own.
  for (const file of ['counter.js', 'disclosure.js']) await import(/* @vite-ignore */ join(here, '../dist/elements', file));
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('vanilla', () => {
  it('takes an attribute, a property, and dispatches a CustomEvent', () => {
    document.body.innerHTML = '<fx-counter step="5"></fx-counter>';
    const el = document.querySelector('fx-counter') as Counter;
    const seen: unknown[] = [];
    el.addEventListener('change', (e: Event) => seen.push((e as CustomEvent).detail));

    plus(el).click();
    expect(output(el)).toBe('5');
    expect(seen).toEqual([{ value: 5 }]);

    el.step = 3;
    expect(plus(el).textContent).toBe('+3');

    // A public method, called by page code.
    el.reset();
    expect(output(el)).toBe('0');
  });

  it('runs a handler once per click with two runtime copies on the page', () => {
    document.body.innerHTML = '<fx-counter step="2"></fx-counter><fx-disclosure></fx-disclosure>';
    const el = document.querySelector('fx-counter') as Counter;
    plus(el).click();
    expect(output(el)).toBe('2');
  });

  it('distributes slots in the shadow root and reflects a boolean', () => {
    document.body.innerHTML = '<fx-disclosure><span slot="summary">More</span><p>Body</p></fx-disclosure>';
    const el = document.querySelector('fx-disclosure')!;
    const seen: unknown[] = [];
    // `toggle` is also a native event name, so the listener is typed from Event.
    el.addEventListener('toggle', (e: Event) => seen.push((e as CustomEvent).detail));

    const summarySlot = el.shadowRoot!.querySelector('slot[name="summary"]') as HTMLSlotElement;
    expect(summarySlot.assignedNodes().map((n) => n.textContent)).toEqual(['More']);
    (el.shadowRoot!.querySelector('.summary') as HTMLElement).click();
    expect(el.hasAttribute('open')).toBe(true);
    expect(seen).toEqual([{ open: true }]);
  });
});

describe('React 19', () => {
  it('sets properties and listens to the event', async () => {
    const { createElement, act } = await import('react');
    const { createRoot } = await import('react-dom/client');
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    const seen: unknown[] = [];
    await act(async () => {
      root.render(createElement('fx-counter', { step: 5, label: 'React', onchange: (e: CustomEvent) => seen.push(e.detail) }));
    });
    const el = host.querySelector('fx-counter') as Counter;

    expect(el.step).toBe(5);
    expect(el.getAttribute('step')).toBeNull();
    expect(el.querySelector('span')!.textContent).toBe('React');
    plus(el).click();
    expect(seen).toEqual([{ value: 5 }]);
    await act(async () => root.unmount());
  });
});

describe('Vue 3', () => {
  it('sets properties and listens to the event', async () => {
    const { createApp, h } = await import('vue');
    const host = document.body.appendChild(document.createElement('div'));
    const seen: unknown[] = [];
    const app = createApp({
      render: () => h('fx-counter', { step: 5, label: 'Vue', onChange: (e: CustomEvent) => seen.push(e.detail) }),
    });
    app.mount(host);
    const el = host.querySelector('fx-counter') as Counter;

    expect(el.step).toBe(5);
    expect(el.querySelector('span')!.textContent).toBe('Vue');
    plus(el).click();
    expect(seen).toEqual([{ value: 5 }]);
    app.unmount();
  });
});

describe('Svelte 5', () => {
  it('sets properties and listens to the event', async () => {
    const { compile } = await import('svelte/compiler');
    const { mount, unmount } = await import('svelte');
    const source = `<script>let { onchange } = $props();</script>
<fx-counter step={5} label="Svelte" {onchange}></fx-counter>`;
    const { js } = compile(source, { generate: 'client', filename: 'Host.svelte' });
    // Written next to the example so its imports resolve against this package's node_modules.
    const dir = mkdtempSync(join(here, '.svelte-'));
    const file = join(dir, 'Host.js');
    writeFileSync(file, js.code);
    try {
      const { default: Host } = await import(/* @vite-ignore */ file);
      const host = document.body.appendChild(document.createElement('div'));
      const seen: unknown[] = [];
      const app = mount(Host, { target: host, props: { onchange: (e: CustomEvent) => seen.push(e.detail) } });
      const el = host.querySelector('fx-counter') as Counter;

      expect(el.step).toBe(5);
      expect(el.querySelector('span')!.textContent).toBe('Svelte');
      plus(el).click();
      expect(seen).toEqual([{ value: 5 }]);
      unmount(app);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
