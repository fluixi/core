/**
 * Several mixins on one element: each keeps its own private state and protected API, the
 * platform callbacks run through all of them, and the types survive the stack.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { signal } from '@fluixi/reactive/signal';
import { defineElement, FormAssociated, prop, typedElement, type ElementBase } from './index.js';

type Base = ElementBase;
const log: string[] = [];

/** Toggles an `open` state, observes its own attribute beside the props. */
function Toggle<B extends Base>(Base: B) {
  abstract class ToggleElement extends Base {
    #open = signal(false);
    static override get observedAttributes(): string[] {
      return [...super.observedAttributes, 'data-open'];
    }
    protected get isOpen(): boolean {
      return this.#open();
    }
    toggle(): void {
      this.#open.set(!this.#open());
    }
    override connectedCallback(): void {
      log.push('toggle connected');
      super.connectedCallback();
    }
    override attributeChangedCallback(name: string, previous: string | null, value: string | null): void {
      if (name === 'data-open') this.#open.set(value !== null);
      super.attributeChangedCallback(name, previous, value);
    }
  }
  return ToggleElement;
}

/** Counts connections, with a private field of the same name as Toggle's to prove they don't clash. */
function Tracked<B extends Base>(Base: B) {
  abstract class TrackedElement extends Base {
    #open = 0;
    protected get connections(): number {
      return this.#open;
    }
    override connectedCallback(): void {
      log.push('tracked connected');
      this.#open++;
      super.connectedCallback();
    }
    override disconnectedCallback(): void {
      log.push('tracked disconnected');
      super.disconnectedCallback();
    }
  }
  return TrackedElement;
}

class Picker extends Tracked(Toggle(FormAssociated(typedElement({ value: prop.string(''), max: prop.number(3) })))) {
  protected override render(): unknown {
    log.push('render');
    return null;
  }
  /** Reaches every layer's protected API from inside. */
  snapshot() {
    this.setFormValue(this.value || null);
    return { open: this.isOpen, connections: this.connections, disabled: this.formDisabled, max: this.max };
  }
}
customElements.define('fx-picker-mixins', Picker);

afterEach(() => {
  document.body.innerHTML = '';
  log.length = 0;
});

describe('stacked mixins', () => {
  it('runs every layer, outermost first, and keeps each private field apart', () => {
    const form = document.body.appendChild(document.createElement('form'));
    const el = document.createElement('fx-picker-mixins') as Picker;
    el.setAttribute('name', 'pick');
    el.setAttribute('value', 'b');
    form.append(el);
    expect(log).toEqual(['tracked connected', 'toggle connected', 'render']);

    el.toggle();
    expect(el.snapshot()).toEqual({ open: true, connections: 1, disabled: false, max: 3 });
    expect(new FormData(form).get('pick')).toBe('b');

    // Toggle's attribute and the declared props are both observed.
    expect(Picker.observedAttributes).toEqual(expect.arrayContaining(['value', 'max', 'data-open']));
    el.setAttribute('data-open', '');
    el.setAttribute('max', '5');
    expect(el.snapshot()).toMatchObject({ open: true, max: 5 });
  });

  it('keeps protected members out of reach from outside', () => {
    const el = new Picker();
    // @ts-expect-error protected in Toggle
    void el.isOpen;
    // @ts-expect-error protected in Tracked
    void el.connections;
    // @ts-expect-error protected in FormAssociated
    void el.formDisabled;
    expect(typeof el.toggle).toBe('function');
    expect(typeof el.checkValidity).toBe('function');
  });

  it('stacks the same way in the function form', () => {
    const Ctor = defineElement('fx-picker-setup', ({ el }) => {
      log.push(`setup ${(el as unknown as { connections: number }).connections}`);
      return null;
    }, { mixins: [Toggle, Tracked] });
    document.body.append(new Ctor());
    expect(log).toEqual(['tracked connected', 'toggle connected', 'setup 1']);
  });
});
