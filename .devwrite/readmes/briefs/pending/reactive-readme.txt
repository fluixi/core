package:  @fluixi/reactive
audience: someone choosing a signals library, who has never heard of Fluixi

one-line: fine-grained reactivity on the TC39 Signals model, with no dependencies

title:    # @fluixi/reactive

required-numbers: these must appear, in the opening or an early section. They are the
  reason a reader would choose this. Do not paraphrase them into adjectives.
    zero runtime dependencies
    1,140 B gzipped for the TC39 core surface
    5,008 B gzipped for the full reactive API
    876 B gzipped for `import { signal }` alone

verified: installed the packed tarball into an empty project. node_modules/@fluixi
  contained only this package. Every example below was executed from that install.

tc39: implements the TC39 Signals proposal shape — Signal.State, Signal.Computed, and
  the full Signal.subtle namespace (Watcher, untrack, currentComputed, hasSinks). When
  globalThis.Signal ships natively this becomes a polyfill swap rather than a rewrite.

CODE — reuse these blocks exactly. Do not write any code that is not here. Do not add
examples. Do not change an identifier, a method name or a comment.

```js
import { signal, memo, effect, batch } from '@fluixi/reactive';

const count = signal(0);
const doubled = memo(() => count() * 2);

effect(() => console.log(doubled()));   // logs 0

count.set(5);                            // logs 10
batch(() => {
  count.set(6);
  count.set(7);                          // logs 14 once, not twice
});
```

```js
import { createSignal } from '@fluixi/reactive';

const [count, setCount] = createSignal(0);
setCount(1);
count();
```

```js
import { Signal } from '@fluixi/reactive/tc39';

const s = new Signal.State(1);
const c = new Signal.Computed(() => s.get() * 10);

s.set(4);
c.get();        // 40
```

```js
import { store } from '@fluixi/reactive/store';

const cart = store({ total: 0, items: [] });

cart.total;              // reading a property IS the reactive read
cart.set('total', 42);   // only readers of `total` re-run
```

two-apis: the tuple form and the handle form are the same primitive and mix freely in
  one file. `signal` returns the accessor `createSignal` returns, with `.set` attached
  to it, so a read is the same call either way.

no-dom: no DOM dependency, no framework dependency. Browser, server, or on its own. The
  graph is lazy and glitch-free — a memo recomputes on read, not on write.

entries:
  .                  everything, 114 exports
  ./tc39             the proposal surface alone
  ./signal           signals, memos, effects, resources, context, suspense, error boundaries
  ./store            nested reactive objects, 24 exports
  ./observable       RxJS interop, 5 exports
  ./operators        20 signal operators: map, filter, debounce, throttle, combine, zip
  ./cached-resource  a resource with a TTL cache
  ./core             deprecated alias for ./tc39
  ./signal-legacy    the pre-TC39 implementation, kept as an explicit opt-out

alpha: version 1.0.0-alpha.77. Say it is alpha and that the API may change. Say it
  once, at the end, without advising the reader what to do about it.

do-not-claim:
  - no benchmarks against other libraries; none have been run
  - not production ready
  - not "part of a framework", not "the internals of". One uses it; that is not the
    reader's concern and does not go in the first three paragraphs
  - never the words lightweight, powerful, efficient, simple, modern, elegant
  - no store example other than the one above. The store proxy does not hold signals
    and its properties are not functions; an invented example throws

caveat: ./store's TypeScript types reference @fluixi/utils for one path-resolution
  type. The runtime does not. A footnote, not a headline.

structure:
  title
  one paragraph: what it is, with the dependency count and the two sizes
  Install
  Signals — the first code block, then the tuple form
  TC39 Signals — the third code block, and why the shape matters
  Stores — the fourth code block
  Entries — a table
  Status — the alpha note and the types caveat
