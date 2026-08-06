---
"@fluixi/compiler": minor
"@fluixi/dom": minor
---

Build markup by cloning a template instead of an element at a time

Static markup is serialized to HTML once, declared at module scope, and cloned per
instance. Subtrees whose structure is static but which contain dynamic values are cloned
too, with each value inserted through a reference into the clone:

```js
const _tmpl$0 = '<div class="card"><h3><!--fx--><!--fx/--></h3><p>a <!--fx--><!--fx/--> b</p></div>';
const _el$ = templateNode(_tmpl$0, "div", true);
const _n$1 = _el$.firstChild.firstChild;
const _n$2 = holeEnd(_n$1);
insert(_el$.firstChild, holeScope(_n$1, () => (() => title())), _n$2, holeContent(_n$1, _n$2));
```

Instantiation is roughly twice as fast — 2.08x for a three-element row, 2.45x for a
nine-element card, measured in Chrome against the real runtime. The gap widens with
component size. Transfer size is unchanged: the old output was repetitive enough that
compression absorbed it, so this is a parse-time and runtime win rather than a bytes one.

Applies to `html\`\`` and `codegen: 'ir'`, and is on by default. `templateClone: false`
and `partialTemplates: false` opt out.

**Each interpolation leaves an `<!--fx-->` … `<!--fx/-->` pair in the HTML.** That is what
makes a clone, the server's markup and the DOM being hydrated the same shape, so one set
of node references addresses all three and hydration adopts the server's nodes rather than
rebuilding them. Tests asserting exact server markup will need to account for them.

New in `@fluixi/dom`: `templateNode`, `holeEnd`, `holeContent`, `holeScope`, and a server
parser that turns a template into server nodes so SSR can render into it.

Some shapes stay on the element-by-element path, because a template would change what the
code means: SVG, namespaced names (`prop:`, `attr:`, `bool:`, `on:`), property-only names
(`innerHTML`, `value`, …), raw-text elements (`<style>`, `<script>`), and adjacent text
children, which the DOM merges while the IR does not.
