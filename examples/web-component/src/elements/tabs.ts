/**
 * Tabs: two elements that talk through context.
 *
 * `fx-tabs` provides the selection, each `fx-tab` consumes it and draws its own button and
 * panel. Neither knows the other's class; they share a context object, as a Lit element would
 * through `@lit/context`. `fx-tab` is defined first, so it asks before any provider exists and
 * picks the selection up when `fx-tabs` announces itself.
 *
 * Both use shadow DOM: the page's children stay where the server rendered them, which is what
 * hydration expects to find. The arrow keys, Home and End move between tabs (`rovingFocus`).
 */
import { consumeContext, provideContext, defineCustomElement, prop, rovingFocus, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { html } from '@fluixi/dom';
import { createContext, effect, type Accessor } from '@fluixi/reactive/signal';
import { Accent, Theme } from '../context.js';

interface TabsState {
  selected: Accessor<string>;
  select(name: string): void;
}

const Tabs = createContext<TabsState | null>(null, 'tabs');

const tabProps = {
  name: prop.string(''),
  label: prop.string(''),
};

export class FxTab extends typedElement(tabProps) {
  static override shadow = 'open' as const;
  static override styles = `
    :host { display: contents; }
    [role=tab] {
      font: inherit; padding: .35rem .8rem; border: 0; border-bottom: 2px solid transparent;
      background: none; color: inherit; cursor: pointer;
    }
    [role=tab][aria-selected=true] { border-bottom-color: var(--accent); font-weight: 600; }
    .panel { order: 1; flex-basis: 100%; padding: .75rem .25rem 0; }
    .panel[hidden] { display: none; }
  `;

  protected override render(): unknown {
    const tabs = consumeContext(this, Tabs);
    const accent = consumeContext(this, Accent);
    const active = () => tabs()?.selected() === this.name;
    effect(() => this.style.setProperty('--accent', accent()()), undefined, { name: 'accent' });

    return html`
      <button role="tab" aria-selected=${() => String(active())} @click=${() => tabs()?.select(this.name)}>
        ${() => this.label}
      </button>
      <div class="panel" role="tabpanel" ?hidden=${() => !active()}><slot></slot></div>
    `;
  }
}

export interface TabsEvents {
  change: { selected: string };
}

const tabsProps = {
  /** The `name` of the open tab. Reflected, so `fx-tabs[selected=...]` can be styled. */
  selected: prop.string('', { reflect: true }),
};

export class FxTabs extends typedElement(tabsProps) {
  static override shadow = 'open' as const;
  static override styles = `
    :host { display: block; }
    [role=tablist] { display: flex; flex-wrap: wrap; border-bottom: 1px solid var(--line, #e3e5ea); }
    :host([data-theme=dark]) [role=tablist] { --line: #3a4150; }
  `;

  protected override render(): unknown {
    provideContext(this, Tabs, {
      selected: () => this.selected,
      select: (name) => {
        if (name === this.selected) return;
        this.selected = name;
        this.emit('change', { selected: name });
      },
    });
    const theme = consumeContext(this, Theme);
    effect(() => (this.dataset.theme = theme()()), undefined, { name: 'theme' });

    rovingFocus(this, {
      items: () =>
        Array.from(this.querySelectorAll(':scope > fx-tab'), (tab) => tab.shadowRoot?.querySelector<HTMLElement>('[role=tab]'))
          .filter((button): button is HTMLElement => !!button),
      orientation: 'horizontal',
      onMove: (button) => button.click(),
    });

    return html`<div role="tablist"><slot></slot></div>`;
  }
}

defineCustomElement('fx-tab', FxTab);
defineCustomElement('fx-tabs', FxTabs);

declare global {
  interface HTMLElementTagNameMap {
    'fx-tab': FxTab;
    'fx-tabs': FxTabs;
  }
  interface JSXCustomElements {
    'fx-tab': ElementAttributes<typeof tabProps>;
    'fx-tabs': ElementAttributes<typeof tabsProps, TabsEvents>;
  }
}
