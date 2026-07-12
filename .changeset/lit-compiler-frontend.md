---
"@fluixi/compiler": patch
---

Compile lit `` html`...` `` templates through the shared JSX IR. A new `format: 'jsx' | 'lit' | 'both'` option (default `'jsx'`, unchanged) routes `` html`` `` / `` svg`` `` tagged templates through the same host-agnostic IR and imperative backend JSX uses — a template and its JSX twin emit byte-identical code, and there is no lit runtime in the output.

The template front-end handles child/attribute/event/`.prop`/`?bool`/spread bindings, capitalized/member component tags (so `<Show>`/`<For>`/`<Ctx.Provider>` control flow works inside `` html`` ``), mixed static+hole attribute values, HTML comments, raw-text elements, and nested `` html`` `` composition (`${cond ? html`…` : html`…`}`, `${list.map(x => html`<li>${x}</li>`)}`). A type-annotated arrow param inside a hole (`(x: T) => html`…``) now compiles (the reparse understands TypeScript). Removed the dead `litrx` runtime directive handler.
