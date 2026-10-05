# Styling

A component can carry its own CSS. Write it in a `<style>` block next to the markup, or as a
`css` value you can share and compose. The compiler takes it out of the component, the CSS engine
processes it with your project's theme, and Vite serves it like any other stylesheet: bundled in
a build, hot-reloaded in dev, inlined in the first server render.

```tsx
export function Card(props: { title: string }) {
  return (
    <article class="card">
      <style scoped>{`
        .card { @apply rounded-xl p-6 shadow-sm; }
        h2 { margin: 0 0 8px; }
      `}</style>
      <h2>{() => props.title}</h2>
    </article>
  );
}
```

## Setup

Component styles are processed by `@fluixi-css`. Add its Vite plugin and point it at the CSS
file that holds your theme:

```ts
// vite.config.ts
import fluixiCss from '@fluixi-css/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [fluixiCss({ theme: './src/styles/theme.css' })],
});
```

`theme` is where `@theme`, `@utility` and `@custom-variant` live. `@apply` and theme values in a
component resolve against it, so a component compiles exactly like your global stylesheet.
Without the plugin, a `<style>` stays an ordinary element and nothing is compiled.

## Style blocks

In JSX, the CSS goes in a template literal child. JSX reads every `{` as code, so CSS written
straight inside the element is a syntax error:

```tsx
<style>{`
  .card { padding: 1rem; }
`}</style>
```

In an `` html`` `` template, the CSS is the element's text:

```ts
html`
  <style scoped>.card { padding: 1rem; }</style>
  <article class="card">${() => props.title}</article>
`;
```

A block can sit anywhere in what the component returns. It renders nothing: the compiler removes
it, and each block becomes a stylesheet, loaded once however many times the component renders.

A plain `<style>` is global CSS that ships with the component. Its selectors apply to the whole
page.

## Scoped styles

`<style scoped>` limits its rules to the elements the component renders. Each of those elements
gets a `data-fx-s` attribute, the same value for every element of the component, and each selector
is narrowed to it:

```css
/* written */
.card h2:hover { color: red; }
/* compiled */
.card h2[data-fx-s="k3x9a1"]:hover { color: red; }
```

The attribute is part of the compiled template, so it is there in a browser render, in a server
render and after hydration alike.

Two escapes:

- `:global(.dark) .card` leaves `.dark` unscoped, for a selector that depends on something outside
  the component, like a theme attribute on `<html>`.
- `.card :deep(.title)` stops scoping where `:deep` starts. A child component's elements are not
  stamped with your component's attribute, so this is how you reach into them.

## Shared values with css``

A `css` value is CSS you can name, share and compose. In an app, `$css` needs no import; in a
package, import `css` from `@fluixi/core`:

```ts
// card.styles.ts
export const surface = $css`
  .surface { @apply rounded-xl bg-white shadow-sm; }
`;
```

Compose values by interpolating them, in another `css` value or in a style block:

```tsx
import { surface } from './card.styles';

export function Card() {
  return (
    <article class="surface card">
      <style scoped>{`
        ${surface}
        .card { padding: 1rem; }
      `}</style>
    </article>
  );
}
```

A value composed into a scoped block takes that block's scope. The value itself is never output on
its own, only where something uses it, so an unused value costs nothing. Values can come from
another module; the build resolves them.

Only `css` values can be interpolated, and only by name. A value computed at runtime does not
belong in a stylesheet: pass it through a custom property instead.

## Values that change

Set a custom property on the element and read it with `var()`:

```tsx
<div class="bar" style={{ '--progress': `${progress()}%` }}>
  <style scoped>{`.bar { width: var(--progress); }`}</style>
</div>
```

In an `` html`` `` template, `style:--progress=${value}` does the same. Each property updates on
its own when its value changes. [Directives](/v1/en/directives) covers `class:` and `style:`.

## Web components with a shadow root

In an element with a shadow root ([Web components](/v1/en/web-components)), style blocks go to
the shadow root instead of the page. They are
added to the class's `static styles` and are not scoped, since a shadow root already isolates
them. `css` values listed in `static styles` are compiled to their CSS too:

```ts
import { base } from './base.styles';

export class FxCard extends typedElement(cardProps) {
  static override shadow = 'open' as const;
  static override styles = [base, ':host { display: block; }'];
  protected override render() {
    return html`<style>.card { padding: 1rem; }</style><div class="card"><slot></slot></div>`;
  }
}
```

## Cascade layers

Component styles are not in a layer, and unlayered CSS beats every layer. If a component should
sit under something layered, such as a `@fluixi-ui` skin, wrap its rules in a layer:

```css
@layer flx.components {
  .card { padding: 1rem; }
}
```

## In development

Editing a style block reaches the page through the dev server's update, with no restart.

In the browser's devtools, a rule points back to the line it was written on: in the style block,
or in the `css` value it came from, in this module or another. Rules produced by `@apply` point to
the `@apply` line. The dev server has CSS source maps on for this; set `css.devSourcemap: false`
in your Vite config to turn them off. A shadow root's styles are constructed stylesheets, which
browsers show without a source.

## In a build

The compiler writes component CSS as it was written, readable. Vite minifies it with the rest of
the app's CSS, with Lightning CSS unless `build.cssMinify` says otherwise. A library build leaves
its `.css` files as they are, and the app that bundles them minifies them.

## Component libraries

A package built with Vite's library mode writes each module's styles as a file next to it,
`button.css` next to `button.js`, and the module imports it. Any bundler that takes a `.css`
import takes it, and apps need no Fluixi plugin to consume the package. A `button.css.js`
beside it adds the stylesheet as a `<link>`, for pages that load the package through an import map.

A library has no app theme, so build it with `fluixiCss({ theme: false })`. Its CSS then reads
design tokens through custom properties and leaves their values to the app.
