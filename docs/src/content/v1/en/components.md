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

Next: **[Control flow](/v1/en/control-flow)**.
