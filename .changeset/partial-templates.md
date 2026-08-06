---
"@fluixi/dom": minor
"@fluixi/compiler": minor
---

Add a server template parser, and partial template cloning behind `partialTemplates`

**`parseTemplate` (server).** A template with holes cannot be written out verbatim — the
holes need real nodes to be inserted into — so `@fluixi/dom/server` gains a parser that
turns compiler-emitted HTML into server nodes. It is deliberately not an HTML parser: its
only input is the output of the compiler's own serializer, a narrow known grammar, and a
round-trip test pins the two together so neither can drift. Hole-free templates still take
the cheaper `ServerRaw` path.

Attribute values now escape `<` and `>` on the server too, matching the compiler's
serializer so markup round-trips through either side unchanged.

**`partialTemplates` (off by default).** Clones subtrees whose structure is static but
which contain dynamic holes — the common shape, and until now a single hole sent the whole
subtree back to element-by-element construction:

```js
const _tmpl$0 = "<div class=\"card\"><h3 class=\"t\"></h3><p class=\"s\">Static</p></div>";
const _el$ = templateNode(_tmpl$0, "div", true);
const _n$0 = _el$.firstChild;
insert(_n$0, () => title(), null);
```

Holes are omitted from the template rather than left as placeholders, and content is
inserted before the hole's next static sibling — no marker nodes. Every node reference is
read before any insertion, since inserting shifts later positions.

Positions it cannot address are rejected rather than mis-addressed, because the DOM merges
adjacent text and the IR does not: adjacent text children, a hole between two texts (they
merge once it is removed), and empty text children. Getting this wrong produced
`Cannot read properties of null (reading 'nextSibling')`.

**Client rendering only, hence off by default.** Hole content adopts server DOM through
the hydration cursor, while the template walk addresses nodes by
`firstChild`/`nextSibling`; the two do not line up, so a hydrated app can render hole
content twice. Enable it for a client-rendered app; leave it off wherever hydration is
involved.
