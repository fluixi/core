# Web components

`@fluixi/web-components` builds standard custom elements with Fluixi's reactivity inside. The
element works in any page and any framework, React, Vue, Svelte or none, and in a Fluixi app it
renders on the server and hydrates like any other part of the page.

```ts
import { defineCustomElement, prop, typedElement } from '@fluixi/web-components';
import { html } from '@fluixi/dom';
import { signal } from '@fluixi/reactive/signal';

const counterProps = {
  step: prop.number(1),       // step="5" or el.step = 5
  label: prop.string('Count'),
};

export class FxCounter extends typedElement(counterProps) {
  #count = signal(0);

  protected override render() {
    return html`
      <span>${() => this.label}</span>
      <output>${() => this.#count()}</output>
      <button @click=${() => this.increment()}>+${() => this.step}</button>
    `;
  }

  get count() {
    return this.#count();
  }

  increment() {
    this.#count.set(this.#count() + this.step);
    this.emit('change', { value: this.#count() });
  }
}

defineCustomElement('fx-counter', FxCounter);
```

`render` runs once. Each binding in it updates the one node it belongs to when a prop or a
signal changes; nothing re-renders. JSX works as well as `` html`` ``.

## Props

A prop is a property and the attribute that mirrors it, kept on one signal: `el.step = 5` and
`step="5"` land in the same place, and a framework binding and server-rendered HTML agree.

| Declaration | Attribute |
| --- | --- |
| `prop.string(initial)` | as written |
| `prop.number(initial)` | parsed; a value that is not a number keeps `initial` |
| `prop.boolean(initial)` | present or absent |
| `prop.object(initial)` | JSON |
| `prop.custom(initial, { fromAttribute, toAttribute })` | your conversion |
| `prop.any(initial)` | none: a value only a property can carry, such as a function |

Options: `attribute` renames the attribute (the property name lowercased by default) or turns it
off with `false`; `reflect: true` writes the property back to the attribute on every change;
`equals` decides when a new value is a change.

`typedElement(props)` gives the class those props as typed fields. A subclass extends it like any
class, spreading the parent's props:

```ts
const boundedProps = { ...counterProps, max: prop.number(10) };

export class FxBoundedCounter extends FxCounter {
  static override props = boundedProps;
  declare max: number;
}
```

## Events

`this.emit(type, detail)` dispatches a `CustomEvent` that bubbles out of the element. List them in
an interface so consumers get typed handlers:

```ts
export interface CounterEvents {
  change: { value: number };
}
```

## Using it in JSX

Register the element's types once, and JSX checks its attributes and events like any tag:

```ts
declare global {
  interface HTMLElementTagNameMap {
    'fx-counter': FxCounter;
  }
  interface JSXCustomElements {
    'fx-counter': ElementAttributes<typeof counterProps, CounterEvents>;
  }
}
```

```tsx
<fx-counter step={5} label="Points" onChange={(e) => save(e.detail.value)} />
```

A function, an object or an array passed as a prop is assigned as a property, never stringified
into an attribute.

## Shadow DOM and styles

Elements render into the light DOM by default, so page CSS reaches them and server-rendered
children stay where they are. Set `static shadow = 'open'` (or attachShadow options such as
`{ mode: 'open', delegatesFocus: true }`) for a shadow root, and `static styles` for its CSS:

```ts
export class FxTab extends typedElement(tabProps) {
  static override shadow = 'open' as const;
  static override styles = `:host { display: contents; } [role=tab] { font: inherit; }`;
}
```

Each distinct stylesheet is constructed once and shared by every instance and subclass. A parent
meant to be extended declares `static styles: ElementStyles`, and a subclass adds to it with
`[super.styles, '...']`.

## Context between elements

Elements share values the way components do. One provides, any element inside it consumes, and
the context objects are those of [Context](/v1/en/context), so an element also reads what a
Provider in the app gives:

```ts
const Tabs = createContext<TabsState | null>(null, 'tabs');

class FxTabs extends typedElement(tabsProps) {
  protected override render() {
    this.provide(Tabs, { selected, select });
    return html`<slot></slot>`;
  }
}

class FxTab extends typedElement(tabProps) {
  protected override render() {
    const tabs = this.consume(Tabs); // an accessor; follows the provider when it arrives
    // ...
  }
}
```

It follows the community context protocol, so it interoperates with `@lit/context` in both
directions. An element defined before its provider picks the value up when the provider
announces itself.

## Forms and focus

`FormAssociated` makes an element a form control the way `<input>` is: it submits a value, reports
validity, follows a disabled `<fieldset>`, resets and restores.

```ts
class FxRating extends FormAssociated(typedElement(ratingProps)) {
  select(value: number) {
    this.value = value;
    this.setFormValue(String(value));
    this.setValidity(value ? {} : { valueMissing: true }, 'Pick a rating.');
  }
}
```

Page code treats it like any input: `el.form`, `el.checkValidity()`, `new FormData(form)`. For
keyboard handling, `rovingFocus` moves focus between items with the arrow keys, Home and End,
`trapFocus` keeps it inside a dialog, and `tabbables` and `deepActiveElement` find focusable
elements across shadow roots.

## A function instead of a class

`defineElement` defines an element from a setup function, a subclass underneath:

```ts
defineElement('fx-greeting', ({ props }) => html`<p>Hello, ${() => props.name()}</p>`, {
  props: { name: prop.string('world') },
});
```

The setup receives `props` as accessors, `set`, `dispatch`, `provide`, `consume`, `targets` and
`children`. Use the class when the element has public methods or will be extended.

## Server rendering

In a Fluixi app, an element used in a page renders on the server like the page around it: its
props as attributes, objects as plain JSON, its content in the light DOM. In the browser it adopts
that markup instead of building it again, and waits for the app to hydrate so it reads the app's
context. Declarative shadow DOM is not emitted yet, so a shadow-root element renders its content
on the client.

## Loading and registration

`defineCustomElement(name, constructor)` registers through the browser's registry and skips a name
already defined, which matters when standalone bundles each include a shared parent class.
`defineWhenUsed(name, load)` registers only once the tag appears in the document, so a page that
never uses an expensive element never loads it.
