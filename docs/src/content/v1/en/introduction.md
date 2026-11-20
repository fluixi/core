# Introduction

Fluixi is a **compiler-native reactive framework**. Its compiler understands reactive values as
values, not as a naming convention, and carries that understanding through JSX and `` html`` ``
templates, DOM generation, SSR, hydration, routing and the meta-framework as one model.

Because that model belongs to the compiler rather than to a debugger bolted on beside it, it can
be read back: from source before anything runs, and from a running application in the editor, the
browser and the playground.

That is the whole idea, and it is worth being precise about what it buys, because "fine-grained
reactivity" and "no virtual DOM" describe several frameworks and Fluixi is not trying to be a
different spelling of any of them.

## The problem it goes after

Every reactive framework asks you to keep a model in your head that the language does not share.
You learn which reads are tracked, which values may be destructured, where a value has to stay a
function, and which of your ordinary JavaScript habits will silently sever a dependency. The
compiler cannot help, because it does not know what any of your values are, so the burden lands on
you, and the failures are quiet: a stale label, a list that stops updating, nothing thrown.

Fluixi's answer is to make the compiler know. It resolves a reactive primitive by the binding it
came from, not by how the name reads:

```ts
import { signal as state } from '@fluixi/reactive/signal';
const count = state(0);        // a signal, resolved through the import

function signal() { return 42; }
const value = signal();        // not a signal, a local function
```

From there it can do things a runtime alone cannot. Destructure a component's props and the
compiler rewrites the bindings into live reads, so the plain syntax keeps working:

```tsx
function Card({ title, ...rest }) {
  return <h2 {...rest}>{title}</h2>;
}
```

Where it cannot prove a rewrite is safe, it leaves your code exactly as written and says why. That
is the contract: **normal TypeScript, with the compiler carrying the reactivity, and telling you
when it can't.**

## What follows from that

- **One model, two syntaxes.** JSX and `` html`` `` templates compile to the same reactive
  representation. Neither is a port of the other.
- **Direct DOM.** A change runs the specific binding that depends on it. There is no component
  re-render, no diff, no virtual tree.
- **The same model end to end.** Client rendering, SSR, hydration, the router and the
  meta-framework share one reactive graph rather than agreeing at the edges.
- **Two ways to write a primitive, one primitive.** `signal(0)` and `$signal(0)` compile to the
  same call. The `$` form skips the import; the explicit API stays public, because a library that
  never runs this compiler still has to be able to write reactive code.

## The primitives

```ts
import { signal, memo, effect } from '@fluixi/reactive/signal';

const count = signal(0);                          // state
const doubled = memo(() => count() * 2);          // derived
effect(() => console.log(doubled()));             // side effect
```

Inside a compiled app, drop the import: `$signal`, `$memo` and `$effect` are the same primitives,
resolved by the compiler.

- A **signal** holds a value and tracks who reads it. Call it to read, `.set()` to write.
- A **memo** derives a value and recomputes only when its dependencies change.
- An **effect** runs a side effect and re-runs when its reactive reads change.

The reactive core, `@fluixi/reactive`, is a standalone library implementing the **TC39 Signals**
model: a glitch-free, lazy, push-pull dependency graph you can use in the browser, on the server,
or entirely on its own.

## Where Fluixi sits

It borrows openly. Signals and fine-grained tracking are proven ideas; so is compiling templates
to imperative DOM calls, and so is a meta-framework over SSR and routing. None of that was invented
here, and pretending otherwise would be silly.

What is Fluixi's own is the **contract between compiler and reactive graph**, and how far it
reaches: one semantic model from a value's creation, through aliasing and destructuring and derived
computations, into generated DOM bindings, across SSR and hydration, and out to disposal. Judge it
on whether writing ordinary TypeScript keeps working, not on the feature list.

## With a coding assistant

Assistants have seen far more React than Fluixi, and React habits compile in Fluixi but do not
update. Give yours the rules and the guide before it writes code:

- [`/llms.txt`](https://docs.fluixi.com/llms.txt): the rules, then every page with a one-line summary;
- [`/llms-full.txt`](https://docs.fluixi.com/llms-full.txt): the rules and the whole guide in one file;
- any page as Markdown: add `.md` to its address.

Next: **[Quickstart](/v1/en/quickstart)**.
