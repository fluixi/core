import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onCleanup, signal } from '@fluixi/reactive/signal';
import { HTMLReactiveElement, defineElement, prop } from './index.js';
import { resetRegistryTracking } from './registry.js';

/**
 * Everything here goes through a real `customElements.define` and a real upgrade,
 * because the parts worth testing are the ones the browser drives: when the callbacks
 * fire, what order they fire in, and what is still attached afterwards.
 *
 * Disposal is deferred by a task, so a test that asserts teardown has to wait one.
 */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

let counter = 0;
const uniqueTag = (base: string): string => `${base}-${++counter}`;

beforeEach(() => {
  document.body.innerHTML = '';
  resetRegistryTracking();
});

describe('rendering', () => {
  it('renders into the element in light DOM', () => {
    const tag = uniqueTag('light-render');
    defineElement(tag, () => {
      const span = document.createElement('span');
      span.textContent = 'hello';
      return span;
    });

    document.body.innerHTML = `<${tag}></${tag}>`;
    expect(document.querySelector(tag)?.textContent).toBe('hello');
  });

  it('renders into a shadow root when asked, leaving the light children alone', () => {
    const tag = uniqueTag('shadow-render');
    defineElement(
      tag,
      () => {
        const slot = document.createElement('slot');
        return slot;
      },
      { shadow: 'open' },
    );

    document.body.innerHTML = `<${tag}><b>projected</b></${tag}>`;
    const el = document.querySelector(tag) as HTMLElement;
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
    // The author's markup stays in the light tree, which is what <slot> projects.
    expect(el.querySelector('b')?.textContent).toBe('projected');
  });

  it('closed mode hides the root, and still renders', () => {
    const tag = uniqueTag('closed-render');
    let seen: ParentNode | null = null;
    defineElement(
      tag,
      ({ targets }) => {
        const div = document.createElement('div');
        div.dataset.target = 'inner';
        queueMicrotask(() => {
          seen = targets.get('inner');
        });
        return div;
      },
      { shadow: 'closed' },
    );

    document.body.innerHTML = `<${tag}></${tag}>`;
    const el = document.querySelector(tag) as HTMLElement;
    expect(el.shadowRoot).toBeNull();
    return Promise.resolve().then(() => expect(seen).toBeTruthy());
  });

  it('hands light-DOM children to the component instead of destroying them', () => {
    const tag = uniqueTag('light-children');
    let received: Node[] = [];
    defineElement(tag, ({ children }) => {
      received = children();
      const wrapper = document.createElement('section');
      for (const node of received) wrapper.appendChild(node);
      return wrapper;
    });

    document.body.innerHTML = `<${tag}><i>kept</i></${tag}>`;
    const el = document.querySelector(tag) as HTMLElement;
    expect(received.length).toBeGreaterThan(0);
    expect(el.querySelector('section > i')?.textContent).toBe('kept');
  });
});

describe('properties and attributes', () => {
  it('reads an attribute into a typed property', () => {
    const tag = uniqueTag('attr-read');
    defineElement(tag, ({ props }) => {
      const out = document.createElement('span');
      out.textContent = `${props.count() + 1}`;
      return out;
    }, { props: { count: prop.number(0) } });

    document.body.innerHTML = `<${tag} count="41"></${tag}>`;
    expect(document.querySelector(tag)?.textContent).toBe('42');
  });

  it('a boolean attribute is presence, not value', () => {
    const tag = uniqueTag('bool-attr');
    const seen: boolean[] = [];
    defineElement(tag, ({ props }) => {
      seen.push(props.disabled());
      return document.createElement('span');
    }, { props: { disabled: prop.boolean(false) } });

    document.body.innerHTML = `<${tag} disabled="false"></${tag}>`;
    expect(seen[0]).toBe(true);
  });

  it('updates the property when the attribute changes', async () => {
    const tag = uniqueTag('attr-update');
    defineElement(tag, ({ props }) => {
      const out = document.createElement('span');
      // A binding, so this is the fine-grained path rather than a rerender.
      const update = () => (out.textContent = props.label());
      update();
      queueMicrotask(update);
      return out;
    }, { props: { label: prop.string('a') } });

    document.body.innerHTML = `<${tag} label="a"></${tag}>`;
    const el = document.querySelector(tag) as HTMLElement & { label: string };
    el.setAttribute('label', 'b');
    expect(el.label).toBe('b');
  });

  it('a property assignment before upgrade survives it', () => {
    const tag = uniqueTag('pre-upgrade');
    const el = document.createElement(tag) as HTMLElement & { value: number };
    // Assigned while the tag is still unknown, so it lands as an own property.
    el.value = 7;
    document.body.appendChild(el);

    let seen = -1;
    defineElement(tag, ({ props }) => {
      seen = props.value();
      return document.createElement('span');
    }, { props: { value: prop.number(0) } });
    customElements.upgrade(el);

    expect(seen).toBe(7);
    expect(el.value).toBe(7);
  });

  it('reflects a property back to its attribute when asked', async () => {
    const tag = uniqueTag('reflect');
    defineElement(tag, () => document.createElement('span'), {
      props: { state: prop.string('idle', { reflect: true }) },
    });

    document.body.innerHTML = `<${tag}></${tag}>`;
    const el = document.querySelector(tag) as HTMLElement & { state: string };
    expect(el.getAttribute('state')).toBe('idle');
    el.state = 'busy';
    await tick();
    expect(el.getAttribute('state')).toBe('busy');
  });

  it('holds a function property instead of calling it', () => {
    const tag = uniqueTag('fn-prop');
    const callback = (): string => 'called';
    let seen: unknown = null;
    defineElement(tag, ({ props }) => {
      seen = props.onPick();
      return document.createElement('span');
    }, { props: { onPick: prop.any<() => string>(() => '') } });

    const el = document.createElement(tag) as HTMLElement & { onPick: () => string };
    el.onPick = callback;
    document.body.appendChild(el);
    expect(seen).toBe(callback);
  });

  it('keeps the initial value when a JSON attribute will not parse', () => {
    const tag = uniqueTag('bad-json');
    let seen: unknown = 'unset';
    defineElement(tag, ({ props }) => {
      seen = props.data();
      return document.createElement('span');
    }, { props: { data: prop.object<{ a: number } | null>(null) } });

    document.body.innerHTML = `<${tag} data="{oops"></${tag}>`;
    expect(seen).toBeNull();
  });

  it('observes exactly the attributes the schema declares', () => {
    const tag = uniqueTag('observed');
    const ctor = defineElement(tag, () => document.createElement('span'), {
      props: {
        shown: prop.boolean(false),
        hidden: prop.any<number>(0),
        renamed: prop.string('', { attribute: 'data-renamed' }),
      },
    });
    const observed = (ctor as unknown as { observedAttributes: string[] }).observedAttributes;
    expect(observed).toContain('shown');
    expect(observed).toContain('data-renamed');
    expect(observed).not.toContain('hidden');
  });
});

describe('events', () => {
  it('dispatches a CustomEvent that bubbles and crosses a shadow boundary', () => {
    const tag = uniqueTag('event-out');
    defineElement(tag, ({ dispatch }) => {
      const button = document.createElement('button');
      button.addEventListener('click', () => dispatch('change', { value: 42 }));
      return button;
    }, { shadow: 'open' });

    document.body.innerHTML = `<${tag}></${tag}>`;
    const el = document.querySelector(tag) as HTMLElement;
    const heard = vi.fn();
    document.body.addEventListener('change', heard);

    el.shadowRoot?.querySelector('button')?.click();

    expect(heard).toHaveBeenCalledOnce();
    const event = heard.mock.calls[0][0] as CustomEvent<{ value: number }>;
    expect(event.detail.value).toBe(42);
    expect(event.composed).toBe(true);
    expect(event.bubbles).toBe(true);
  });

  it('reports a cancelled event to the caller', () => {
    const tag = uniqueTag('event-cancel');
    let result: boolean | null = null;
    defineElement(tag, ({ dispatch }) => {
      queueMicrotask(() => {
        result = dispatch('attempt', null, { cancelable: true });
      });
      return document.createElement('span');
    });

    document.body.innerHTML = `<${tag}></${tag}>`;
    document.body.addEventListener('attempt', (e) => e.preventDefault());
    return Promise.resolve().then(() => expect(result).toBe(false));
  });
});

describe('lifecycle', () => {
  it('disposes the reactive scope when the element is removed', async () => {
    const tag = uniqueTag('dispose');
    const cleaned = vi.fn();
    defineElement(tag, () => {
      const value = signal(0);
      void value;
      // Synchronous: onCleanup registers against whichever owner is current, and the
      // element's scope is only current while setup runs.
      onCleanup(cleaned);
      return document.createElement('span');
    });

    document.body.innerHTML = `<${tag}></${tag}>`;
    const el = document.querySelector(tag) as HTMLElement;
    await tick();
    el.remove();
    await tick();
    expect(cleaned).toHaveBeenCalled();
  });

  it('survives a move, which fires disconnect then connect', async () => {
    const tag = uniqueTag('move');
    const builds = vi.fn();
    defineElement(tag, () => {
      builds();
      return document.createElement('span');
    });

    const from = document.createElement('div');
    const to = document.createElement('div');
    document.body.append(from, to);
    from.innerHTML = `<${tag}></${tag}>`;
    const el = from.querySelector(tag) as HTMLElement;
    expect(builds).toHaveBeenCalledOnce();

    to.appendChild(el); // disconnect + connect, same task
    await tick();

    // One build, not two: a reorder must not rebuild the subtree.
    expect(builds).toHaveBeenCalledOnce();
  });

  it('gives the light children back when it tears down', async () => {
    const tag = uniqueTag('restore');
    defineElement(tag, ({ children }) => {
      const wrapper = document.createElement('section');
      for (const node of children()) wrapper.appendChild(node);
      return wrapper;
    });

    document.body.innerHTML = `<${tag}><i>kept</i></${tag}>`;
    const el = document.querySelector(tag) as HTMLElement;
    el.remove();
    await tick();
    expect(el.querySelector('section')).toBeNull();
    expect(el.querySelector('i')?.textContent).toBe('kept');
  });
});

describe('registration', () => {
  it('defining the same name twice does not throw', () => {
    const tag = uniqueTag('twice');
    const first = defineElement(tag, () => document.createElement('span'));
    const second = defineElement(tag, () => document.createElement('div'));
    expect(second).toBe(first);
  });

  it('yields to a name another bundle already claimed', () => {
    const tag = uniqueTag('claimed');
    class Theirs extends HTMLElement {}
    customElements.define(tag, Theirs);
    resetRegistryTracking();

    const ours = defineElement(tag, () => document.createElement('span'));
    expect(ours).toBe(Theirs);
  });
});

describe('mixins', () => {
  it('applies mixins over the base, runs their callbacks first, and keeps their attributes', () => {
    const order: string[] = [];
    const Tracked = (Base: typeof HTMLReactiveElement) =>
      class extends Base {
        static override get observedAttributes(): string[] {
          return [...super.observedAttributes, 'from-mixin'];
        }
        override connectedCallback(): void {
          order.push('mixin');
          super.connectedCallback();
        }
      };

    const tag = uniqueTag('mixed');
    const ctor = defineElement(tag, () => {
      order.push('setup');
      return document.createElement('span');
    }, { mixins: [Tracked], props: { own: prop.string('') } });

    document.body.innerHTML = `<${tag}></${tag}>`;
    expect(order).toEqual(['mixin', 'setup']);
    expect(document.querySelector(tag)).toBeInstanceOf(HTMLReactiveElement);
    expect(ctor.observedAttributes).toEqual(expect.arrayContaining(['own', 'from-mixin']));
  });
});
