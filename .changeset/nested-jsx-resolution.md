---
"@fluixi/compiler": patch
---

Resolve components used only inside a nested expression.

`{(b) => <Input />}` — a render prop, a `.map()` callback, a ternary — emitted a
reference to `Input` that nothing imported. JSX inside an expression is compiled
and discarded during the walk, and the resolve pass only ever ran on the
top-level node, so a component the `resolve` rules should have supplied was
simply left unbound. At runtime that is a ReferenceError the moment the branch
renders.

`@fluixi-ui`'s playground has it in `FormDemo`: `Input`, `Select` and `Checkbox`
are used only inside render props, and none of the three was imported.

The fix replaces the ad-hoc event set threaded through `genExpr` with a hook
called on any nested IR, which runs the same resolve, collapse and
collect-needs passes the top-level node gets. Delegated events came along with
it, having been the first symptom of the same hole.

Found by diffing the native path against this one over the whole component
library: it walks every root, so it had been resolving them correctly. The two
now emit identical import sets on all 93 files, and the `@fluixi-ui` playground
bundle goes from 477.2 kB to 486.7 kB — the missing components, now present.
