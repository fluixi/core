/**
 * Context between elements over the community protocol, between elements and a Fluixi app,
 * and with Lit's own implementation of the protocol.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createContext, createRoot, signal, useContext } from '@fluixi/reactive/signal';
import { LitElement } from 'lit';
import { ContextConsumer, ContextProvider, type Context as LitContext } from '@lit/context';
import { ContextRequestEvent, HTMLReactiveElement, type ElementContext } from './index.js';

let n = 0;
const tag = (base: string) => `${base}-ctx-${++n}`;
const flush = () => new Promise((r) => setTimeout(r, 0));

const Theme = createContext('light', 'theme');
const theme = signal('dark');

/** Provides the theme; `shadow` puts a consumer inside its own shadow root too. */
class ThemeRoot extends HTMLReactiveElement {
  static override shadow = true;
  protected override render(): unknown {
    this.provide(Theme, () => theme());
    const slot = document.createElement('slot');
    const inner = document.createElement(READER);
    return [inner, slot];
  }
}

/** Reads the theme into its text, reactively. */
class ThemeReader extends HTMLReactiveElement {
  current!: () => string | undefined;
  protected override render(): unknown {
    this.current = this.consume(Theme);
    const out = document.createElement('output');
    return [out, () => (out.textContent = this.current() ?? '')][0];
  }
  get text(): string | undefined {
    return this.current?.();
  }
}

const ROOT = tag('fx-theme-root');
const READER = tag('fx-theme-reader');
customElements.define(READER, ThemeReader);
customElements.define(ROOT, ThemeRoot);

afterEach(() => {
  document.body.innerHTML = '';
  theme.set('dark');
});

describe('between elements', () => {
  it('reaches a consumer in light DOM, slotted from the page, and inside the provider shadow root', () => {
    document.body.innerHTML = `<${ROOT}><${READER} id="slotted"></${READER}></${ROOT}>`;
    const root = document.querySelector(ROOT)!;
    const slotted = document.getElementById('slotted') as ThemeReader;
    const inner = root.shadowRoot!.querySelector(READER) as ThemeReader;
    expect(slotted.text).toBe('dark');
    expect(inner.text).toBe('dark');
  });

  it('takes the nearest provider when two are nested', () => {
    const inner = tag('fx-inner-theme');
    customElements.define(inner, class extends HTMLReactiveElement {
      protected override render(): unknown {
        this.provide(Theme, 'inner');
        return [...this.authoredChildren];
      }
    });
    document.body.innerHTML = `<${ROOT}><${inner}><${READER}></${READER}></${inner}></${ROOT}>`;
    theme.set('outer changed');
    expect((document.querySelector(READER) as ThemeReader).text).toBe('inner');
  });

  it('follows the provider when its value changes', () => {
    document.body.innerHTML = `<${ROOT}><${READER}></${READER}></${ROOT}>`;
    const reader = document.querySelector(READER) as ThemeReader;
    theme.set('sepia');
    expect(reader.text).toBe('sepia');
  });

  it('stops calling a consumer that unsubscribed', () => {
    document.body.innerHTML = `<${ROOT}><span></span></${ROOT}>`;
    const span = document.querySelector('span')!;
    const seen: string[] = [];
    let stop: (() => void) | undefined;
    span.dispatchEvent(new ContextRequestEvent<string>(Theme, span, (v, unsubscribe) => {
      seen.push(v);
      stop = unsubscribe;
    }, true));
    theme.set('a');
    stop!();
    theme.set('b');
    expect(seen).toEqual(['dark', 'a']);
  });

  it('falls back to the default with no provider, then takes a provider that upgrades later', async () => {
    const lateTag = tag('fx-late-root');
    document.body.innerHTML = `<${lateTag}><${READER}></${READER}></${lateTag}>`;
    const reader = document.querySelector(READER) as ThemeReader;
    expect(reader.text).toBe('light');

    class Late extends HTMLReactiveElement {
      protected override render(): unknown {
        this.provide(Theme, 'late');
        return [...this.authoredChildren];
      }
    }
    customElements.define(lateTag, Late);
    await flush();
    expect(reader.text).toBe('late');
  });

  it('gives an element that provides and consumes the same context the value above it', () => {
    const middle = tag('fx-middle');
    let seen: string | undefined;
    customElements.define(middle, class extends HTMLReactiveElement {
      protected override render(): unknown {
        seen = this.consume(Theme)();
        this.provide(Theme, 'middle');
        return null;
      }
    });
    document.body.innerHTML = `<${ROOT}><${middle}></${middle}></${ROOT}>`;
    expect(seen).toBe('dark');
  });
});

describe('with a Fluixi app', () => {
  it('reads a Provider in the app when no element above it provides', () => {
    const el = createRoot(() =>
      Theme.Provider({
        value: 'from-app',
        get children() {
          const reader = document.createElement(READER) as ThemeReader;
          document.body.append(reader);
          return reader;
        },
      }),
    ) as ThemeReader;
    expect(el.text).toBe('from-app');
  });

  it('is visible to useContext in what the element renders', () => {
    const host = tag('fx-provides-to-components');
    let inComponent: string | undefined;
    customElements.define(host, class extends HTMLReactiveElement {
      protected override render(): unknown {
        this.provide(Theme, 'element');
        // What a component rendered here would do.
        inComponent = useContext(Theme);
        return null;
      }
    });
    document.body.append(document.createElement(host));
    expect(inComponent).toBe('element');
  });
});

describe('with Lit', () => {
  const key = Theme as unknown as LitContext<unknown, string>;

  it('consumes what a Lit element provides', () => {
    const litTag = tag('lit-theme-provider');
    customElements.define(litTag, class extends LitElement {
      provider = new ContextProvider(this, { context: key, initialValue: 'lit' });
    });
    document.body.innerHTML = `<${litTag}><${READER}></${READER}></${litTag}>`;
    const reader = document.querySelector(READER) as ThemeReader;
    expect(reader.text).toBe('lit');
    (document.querySelector(litTag) as unknown as { provider: ContextProvider<typeof key> }).provider.setValue('lit 2');
    expect(reader.text).toBe('lit 2');
  });

  it('provides to a Lit element', async () => {
    const litTag = tag('lit-theme-consumer');
    customElements.define(litTag, class extends LitElement {
      consumer = new ContextConsumer(this, { context: key, subscribe: true });
    });
    document.body.innerHTML = `<${ROOT}><${litTag}></${litTag}></${ROOT}>`;
    const lit = document.querySelector(litTag) as unknown as { consumer: ContextConsumer<typeof key, LitElement>; updateComplete: Promise<unknown> };
    await lit.updateComplete;
    expect(lit.consumer.value).toBe('dark');
    theme.set('shared');
    expect(lit.consumer.value).toBe('shared');
  });
});

// The context type lines up with what `consume` and `provide` accept.
const _typed: ElementContext<string> = Theme;
void _typed;
