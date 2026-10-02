# Theming

A theme in Fluixi is an attribute on `<html>`: `data-theme="dark"`, `data-accent="violet"`. Your
CSS selects on it, and core keeps it right: the visitor's choice remembered, the server render
and the browser in agreement, no flash before the first paint, the browser's own bars in the
matching colour.

```tsx
import { ColorSchemeProvider, useColorScheme } from '@fluixi/core';

export default function App() {
  return (
    <ColorSchemeProvider storageKey="app-scheme" themeColor={{ light: '#ffffff', dark: '#0a0a0a' }}>
      <Header />
      <Router />
    </ColorSchemeProvider>
  );
}

function Header() {
  const scheme = useColorScheme();
  return <button onClick={() => scheme.toggle()}>Switch theme</button>;
}
```

## Light, dark and the system

`createColorScheme` is the axis almost every app has. The choice is `system`, `light` or `dark`,
and `system` is the default, so a first visit matches the reader's operating system.

| Member | |
| --- | --- |
| `value()` | the choice: `'system' \| 'light' \| 'dark'` |
| `resolved()` | what is shown: the choice, or the OS's scheme while following it, live |
| `set(choice)` | choose, and remember |
| `toggle()` | flip light and dark, from what is shown |
| `headScript()` | the before-paint script, for a page you write by hand |

| Option | Default | |
| --- | --- | --- |
| `storageKey` | `color-scheme` | the key the choice is kept under |
| `attribute` | `data-theme` | the attribute on `<html>` |
| `storage` | a cookie for a year | where the choice is kept; `null` keeps it in memory only |
| `systemAs` | `resolved` | what the attribute says while following the OS (below) |
| `themeColor` | none | `{ light, dark }`, the browser bar colours |
| `colorSchemeMeta` | `true` | send `<meta name="color-scheme">` |
| `script` | `true` | send the before-paint script with the page |

**`systemAs`** decides what your CSS sees while the page follows the OS. With `resolved`, the
attribute is always `light` or `dark`, which suits CSS written as `[data-theme="dark"] { ... }`.
With `system`, the attribute says `system`, for CSS that follows the OS by itself through
`color-scheme` and `light-dark()` or a media query: a visitor without JavaScript then still gets
their OS's scheme.

## Where the choice lives, and the first paint

The choice is kept in a cookie by default, so the server reads it during the render and sends
`<html data-theme="dark">` already set. Core also sends a small script with the page, through
the head, which settles what the server could not know before anything is painted:

- a first visit, where only the browser knows the OS's scheme;
- a prerendered or static page, where no server reads the cookie at request time.

You write no script in `index.html`. Make the scheme during the render, in a component or a
provider at the app root, never at module scope: on the server only the render has the request
and its cookie, so a scheme created at import always renders the default.

## The browser around the page

`themeColor` colours what the browser draws around your page: Chrome's address bar on Android,
Safari's tab and status bar on iOS. While the page follows the OS, both colours go out, each
under its `prefers-color-scheme` media query, and the browser picks; once the reader chooses, the
chosen one alone. `<meta name="color-scheme">` follows the same way, so scrollbars, form controls
and the background before your CSS loads match too.

Two more names you may meet: `apple-mobile-web-app-status-bar-style` (`default`, `black`,
`black-translucent`) for a site added to the iOS home screen, and `theme_color` and
`background_color` in a web app manifest for an installed app. Both are static; set them in your
HTML and manifest.

## More axes

An accent, a skin, a density, a brand: any other axis is a `createTheme`, one per attribute, with
the same storage, head attribute and script. `createTheme` takes any list of values, so it also
serves a scheme with more than light and dark.

```ts
import { createTheme } from '@fluixi/core';

const accent = createTheme({
  attribute: 'data-accent',
  themes: ['ink', 'saffron', 'ultramarine'],
  default: 'ink',
  storageKey: 'app-accent',
});

accent.set('saffron');
accent.toggle(); // the next one in the list
```

Options beyond `themes` and `default`: `attribute`, `storageKey`, `storage`, `script`, `system`
(follow the OS until a choice, mapping it to two of your values), `load` (async work per value,
such as importing a skin's stylesheet, with `isLoading()` while it runs) and `onChange`.

`ThemeProvider` hands several axes down by name, and `useTheme(name)` reads one:

```tsx
import { ThemeProvider, createColorScheme, createTheme, useTheme, type Theme } from '@fluixi/core';

function Root(props) {
  const scheme = createColorScheme({ storageKey: 'app-scheme' });
  const accent = createTheme({ attribute: 'data-accent', themes: ['ink', 'saffron'], default: 'ink' });
  return <ThemeProvider themes={{ scheme, accent }}>{props.children}</ThemeProvider>;
}

function AccentPicker() {
  const accent = useTheme<Theme<'ink' | 'saffron'>>('accent');
  return <button onClick={() => accent.toggle()}>{() => accent.value()}</button>;
}
```

`useColorScheme()` reads the axis named `scheme`. Nested providers add to the axes above them,
and `useTheme` throws, naming the axis, when none provides it. Custom elements read the same
providers, so an element in the page can switch the theme too.

## Doing it yourself

Every piece above is optional. The contract with your CSS is the attribute alone, so you can
manage themes entirely in your own code:

```ts
function setScheme(scheme: 'light' | 'dark') {
  document.documentElement.dataset.theme = scheme;
  localStorage.setItem('scheme', scheme);
}
```

What you then take on, piece by piece:

- **Before the first paint.** The page arrives with what the server wrote. Set the attribute
  from an inline script in `<head>`, reading wherever you keep the choice, or the page shows the
  wrong theme until your bundle runs.

  ```html
  <script>
    try {
      var s = localStorage.getItem('scheme');
      if (s) document.documentElement.dataset.theme = s;
    } catch (e) {}
  </script>
  ```

- **On the server.** Keep the choice in a cookie and render the attribute in the server render,
  `useHead({ htmlAttrs: { 'data-theme': scheme } })`, and a returning visitor needs no script.
  [Storage in an app](/v1/en/app-storage) reads and writes such a cookie on both sides.
- **The OS.** Leave the attribute off, or write CSS that follows `prefers-color-scheme` when it is
  absent, and a first visit matches the system with no code.
- **The browser's bars.** `useHead({ themeColor: [...] })` takes one colour per media query; update
  it when the reader chooses.

`createColorScheme` and `createTheme` are those pieces kept in agreement. Replace any of them with
your own when you need to: the CSS never knows the difference.
