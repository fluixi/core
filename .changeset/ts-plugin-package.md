---
"@fluixi/ts-plugin": minor
---

New package: a TypeScript language-service plugin that gives html`` templates
real type support. Each file is mirrored to a virtual document where every
`` html`...` `` becomes typed helper calls embedding the `${…}` holes verbatim, so
the JavaScript inside templates gets full inference, completion, hover, and
error-checking — `<li each=${items}>${(it) => it.label}</li>` types `it` as the
element of `items`; `@click=${(e) => …}` types `e` as the DOM event — with
results mapped back to the source. Also stops a component used only through a
template tag (`<UserCard/>`) from being reported "declared but never used".
