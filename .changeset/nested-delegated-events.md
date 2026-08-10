---
"@fluixi/compiler": patch
---

Register delegated events for JSX nested inside an expression.

`<button onClick={…}>` reached through a ternary, a `.map()` callback or any
other expression never got its event added to the module's `delegateEvents`
call. JSX nested in an expression is compiled and discarded during the walk, and
the handlers went with it — so nothing registered the listener and the button did
nothing unless some other module in the app happened to register the same event.

`@fluixi-ui`'s table has exactly that shape: the sort button lives in a nested
ternary, and `table.tsx` emitted no `delegateEvents` at all.

Found by diffing the two compile paths over 226 real files — the native one walks
every root, so it had been reporting the events all along. The sets now agree on
every file.
