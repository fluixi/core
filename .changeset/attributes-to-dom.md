---
"@fluixi/dom": minor
"@fluixi/jsx": patch
---

Move element attribute types to `@fluixi/dom`, exported as `@fluixi/dom/attributes`.

`HTMLAttributes`, `AriaAttributes`, `DOMAttributes`, `CSSProperties`, the 45
per-element interfaces and `SVGAttributes` describe the DOM, not JSX syntax, but
they only existed inside `@fluixi/jsx`'s `JSX` namespace. The framework supports
both JSX and html`` authoring, so an html``-only app — and the html`` tooling
itself — had to reach through a JSX package for types that have nothing to do
with JSX.

`@fluixi/jsx` re-exports every one of them into the `JSX` namespace, so
`JSX.HTMLAttributes<T>` and friends keep working unchanged. `JSX.Element` and
`JSX.IntrinsicElements` stay in `@fluixi/jsx` — those are the JSX contract.
