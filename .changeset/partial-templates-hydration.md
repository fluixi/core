---
"@fluixi/dom": minor
"@fluixi/compiler": minor
---

Partial templates now work under SSR and hydration, and are on by default

A subtree whose structure is static but which contains dynamic holes — a card wrapper
with a reactive value inside, the shape most components have — is now cloned from one
template instead of being built an element at a time:

```js
const _tmpl$0 = '<div class="card"><h3><!--fx--><!--/fx--></h3><p>a <!--fx--><!--/fx--> b</p></div>';
const _el$ = templateNode(_tmpl$0, "div", true);
const _n$0 = _el$.firstChild;
const _n$1 = _n$0.firstChild;
const _n$2 = holeEnd(_n$1);
insert(_n$0, holeScope(_n$1, () => (() => title())), _n$2, holeContent(_n$1, _n$2));
```

Three pieces make it correct in all three environments, and each replaced something that
was subtly wrong:

- **Marker pairs, not omitted holes.** A hole's content is by definition the nodes between
  its own two markers, so the server's markup has the same shape as the client's template
  and hydration can identify what to adopt. Omitting holes described the template but not
  the server DOM, which also holds the rendered content.
- **A sequential walk, not index arithmetic.** Positions after a hole are shifted in the
  server's DOM, so each node is reached from the previous sibling and a hole's end marker
  is found at runtime by `holeEnd`.
- **`holeScope` places the hydration cursor at the hole's own content**, and calls the
  producing thunk inside that scope. Wrapping the finished value was too late:
  `props.children` is a getter, so reading it builds its nodes immediately — against
  whatever cursor happened to be current, leaving the server's nodes behind as duplicates.

`insert` receives the hole's existing nodes, so a server-rendered text node has its data
set rather than being replaced. Every hydration suite now runs with **zero mismatch
warnings**, and `examples/ssr` asserts that count so it cannot regress quietly.

The cost is `<!--fx-->` pairs in the shipped HTML, one per interpolation.
