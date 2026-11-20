# Components

A component is just a function that returns markup. There is no base class and no lifecycle of
re-renders, a component runs **once** to create its DOM, and reactivity keeps it up to date.

```tsx
function Greeting(props: { name: string }) {
  return <h1>Hello, {props.name}</h1>;
}

<Greeting name="Ada" />;
```

## Props are reactive

Because a component runs only once, a prop is a live read rather than a value handed over at
call time. Read props **where you use them** and updates flow through:

```tsx
function Hello(props: { name: string }) {
  return <p>{props.name}</p>;   // stays reactive
}
// const { name } = props;       // in plain JavaScript, reads once: see below
```

Destructuring copies the value out at that moment, so `name` stops following the prop. That is
ordinary JavaScript, not a rule Fluixi invented.

### Destructuring anyway

The compiler rewrites those bindings back into reads, so the plain syntax keeps working, in the
parameter list or at the top of the body:

```tsx
function Hello({ name, tone = 'calm' }) {
  return <p data-tone={tone}>{name}</p>;   // both stay reactive
}

function Badge(props) {
  const { label, ...rest } = props;         // rewritten the same way
  return <span {...rest}>{label}</span>;
}
```

A destructure of `props` that runs once elsewhere in the component's setup, inside an `if` block
or sharing its `const` with other names, is left as written and the build warns about it. One
inside a callback is fine as it is: it reads the current values each time the callback runs.

It compiles to `props.name` at each use, the binding keeps its type, so nothing else about the
function changes. This is on by default; `fluixi({ propsDestructure: false })` turns it off, which
you want for a package that ships its source for consumers to compile.

Aliases, defaults and nested patterns all work, and a default still applies only to `undefined`,
exactly as it would in JavaScript.

`...rest` becomes the `splitProps` call you would have written:

```tsx
function Field({ label, ...rest }) {
  return <input aria-label={label} {...rest} />;
}
```

`splitProps` carries the remaining props across as getters instead of reading them out, so a
signal behind a forwarded prop still reaches the element.

Where the compiler can't prove the rewrite is safe it leaves your code exactly as written and
says why, a reassigned binding, a computed key, a default it would have to re-run on every
read. Those keep the JavaScript meaning they always had.

One thing to watch: this is a property of **how the code is compiled**, not of the code itself.
If you publish a package that ships its source for consumers to compile, write props the
explicit way, a consumer without the option would read them once. Compiled output is fine
either way.

The [props example](https://github.com/fluixi/core/tree/main/examples/props) has all of it
running, and turning the option off in its config is the quickest way to see the difference.

### Which expressions stay live

The compiler decides, for each prop and each child written in JSX, whether to pass a value or a
read. It wraps the expression in a getter when anything in it can change: a call (`count()`,
`t('key')`), a property read (`props.name`, `user.email`), or an operator over one of those.
Literals and bare identifiers pass once.

```tsx
<Panel
  open={open()}                    // live: a call
  collapsed={!(pinned() && wide())} // live: a negation over calls
  label={title() as string}        // live: a type assertion over a call
  size="sm"                        // passed once: a literal
  onClose={close}                  // passed once: a function value
/>
```

Negations and other unary operators (`!x()`, `-x()`), and TypeScript's `x()!`, `x() as T` and
`x() satisfies T`, count like the call inside them. Before 1.0.0-alpha.109 they were passed once,
so `collapsed={!panelOpen()}` kept its first value until the page reloaded; the fix needs no
change in your code.

An arrow function is a value like any other: `onClose={() => close()}` hands over the function,
it does not make the prop live.

## Children

`props.children` holds whatever you nest inside a component:

```tsx
function Card(props: { children?: any }) {
  return <div class="card">{props.children}</div>;
}

<Card><p>Body</p></Card>;
```

Reading `props.children` runs the code that builds them. Read it once; when the component
needs to look at its children (count them, pick some out), resolve them with `readChildren`,
which keeps the result in a memo with nested functions resolved and arrays flattened:

```tsx
import { readChildren } from '@fluixi/core';

function Tabs(props: { children?: any }) {
  const items = readChildren(() => props.children);
  return <nav data-count={() => [items()].flat().length}>{items()}</nav>;
}
```

## Ids for labels and ARIA

`createUniqueId()` gives an id the server render and the browser agree on, for pairing
elements: a `<label for>` with its `<input id>`, `aria-describedby`, `aria-controls`.

```tsx
import { createUniqueId } from '@fluixi/core';

function Field(props: { label: string; hint: string }) {
  const id = createUniqueId();
  const hint = createUniqueId();
  return (
    <div>
      <label for={id}>{props.label}</label>
      <input id={id} aria-describedby={hint} />
      <p id={hint}>{props.hint}</p>
    </div>
  );
}
```

Call it in the component body, the same number of times on both sides: the ids follow the
component's place in the page, so a call made only on one side shifts the ones after it. A
component created later in the browser gets an id unique within the page.

## Default props

`mergeProps` fills in defaults without reading the props, so they stay live:

```tsx
import { mergeProps } from '@fluixi/core';

function Button(props: { size?: 'sm' | 'md'; children?: any }) {
  const p = mergeProps({ size: 'md' }, props);
  return <button data-size={p.size}>{p.children}</button>;
}
```

A destructuring default (`function Button({ size = 'md' })`) does the same once the compiler
rewrites it, as above.

## Events

`onClick={handler}` and the other `on` props attach handlers. Events that bubble are delegated:
one listener per event type on the document finds the handler when the event bubbles up, so a
list of a thousand rows does not add a thousand listeners. Events that do not bubble (`focus`,
`blur`, `scroll`, `mouseenter`) get a listener on the element. `on:click` always attaches
directly to the element, for when you need that.

A callback prop is how a component tells its parent something happened:

```tsx
function Rating(props: { value: number; onChange: (v: number) => void }) {
  return (
    <div role="radiogroup">
      <For each={[1, 2, 3, 4, 5]}>
        {(n) => (
          <button aria-pressed={String(props.value >= n)} onClick={() => props.onChange(n)}>{n}</button>
        )}
      </For>
    </div>
  );
}
```

## A realistic example

An editable field: it shows a value, switches to an input on click, and reports the new value.
State that belongs to the component stays inside it; what the parent owns comes in as props and
goes out as a callback.

```tsx
function EditableTitle(props: { value: string; onSave: (v: string) => void }) {
  const editing = $signal(false);
  const draft = $signal('');
  let input!: HTMLInputElement;

  const start = () => {
    draft.set(props.value);
    editing.set(true);
    queueMicrotask(() => input.focus());
  };
  const save = () => {
    editing.set(false);
    if (draft() !== props.value) props.onSave(draft());
  };

  return (
    <Show when={editing()} fallback={<h2 onClick={start}>{props.value}</h2>}>
      <input
        ref={input}
        value={draft()}
        onInput={(e) => draft.set(e.currentTarget.value)}
        onKeyDown={(e) => e.key === 'Enter' ? save() : e.key === 'Escape' && editing.set(false)}
        onBlur={save}
      />
    </Show>
  );
}
```

## Where to use it, and where not

Make a component for a piece of UI with its own meaning or state. Keep logic that must run again
in memos and effects, not in the component body: the body runs once.

**Not called as a function.** `Card(props)` runs it outside the framework: no owner for its
effects and cleanups, no reactive props. Write `<Card {...props} />`.

**Not an early `return`.** The body runs once, so `if (!user()) return <Login />` is decided once;
use `<Show>` ([Control flow](/v1/en/control-flow)).

**Not `props.children` read twice.** Each read builds the children again; read it once, or use
`readChildren`.

**Not a value from the browser in the first render.** `Date.now()`, `Math.random()`, `window`,
`localStorage`: the server and the browser would render different markup. Take the value from data,
set it in `onMount`, or wrap the part in `<ClientOnly>`.

## Under the hood

The compiler turns `<Greeting name={x()} />` into a call that creates the component with a props
object whose `name` is a getter: `{ get name() { return x(); } }`. The component function runs
once, untracked, so nothing it reads makes its parent run again; each prop is read through its
getter where the child uses it, which is how a change reaches the child without calling it again.
The component runs under its own owner, which holds its effects and cleanups and is disposed when
the component leaves the page.

Next: **[Control flow](/v1/en/control-flow)**.
