# Context

A context is a value a component provides and any component below it reads, without passing it
through every level as a prop: the current theme, the signed-in user, the tabs a tab belongs to.

```tsx
import { createContext, useContext } from '@fluixi/core';

const Theme = createContext<'light' | 'dark'>('light', 'theme');

function App() {
  return (
    <Theme.Provider value="dark">
      <Toolbar />
    </Theme.Provider>
  );
}

function Toolbar() {
  const theme = useContext(Theme); // 'dark'
  return <nav class={theme}>...</nav>;
}
```

`useContext` returns the value of the nearest Provider above the calling component, or the
context's default when there is none. The second argument of `createContext` is a name, which
devtools show for it.

## Values that change

The Provider's value is read once. To share something that changes, provide a signal, or an
object of signals, and read it where it is used:

```tsx
const Session = createContext<{ user: () => User | null }>();

function Shell(props) {
  const user = signal<User | null>(null);
  return <Session.Provider value={{ user }}>{props.children}</Session.Provider>;
}
```

A component that reads `useContext(Session).user()` follows every change; the Provider itself
never re-renders.

## A context that must be provided

For a part that only works inside its parent, a tab outside its tabs, a default value would hide
the mistake. `requireContext` throws instead:

```ts
const tabs = requireContext(Tabs, 'A <Tab> goes inside <Tabs>.');
```

## Providers without JSX

`createProvider(context, value, props)` provides from a plain function, for a component that
provides and renders its children:

```ts
const ThemeProvider = (props) => createProvider(Theme, 'dark', props);
```

An app shell often nests a Provider per context. `composeProviders` writes them as a list,
outermost first:

```ts
const AppProviders = (props) =>
  composeProviders([[Theme, 'dark'], [Locale, () => locale()], [Session, session]], props);
```

A value may be an accessor, read once. Pass the component's own props in both cases, so its
children stay lazy and render inside the Providers.

## Custom elements

The same context objects work across [custom elements](/v1/en/web-components): an element reads
what a Provider around it gives, and the components an element renders read what the element
provides. A server-rendered element hydrates with the context of the app it was rendered in.

## Context or dependency injection

Context follows the component tree: a value depends on where you are. For services that do not,
an API client, a logger, use [dependency injection](/v1/en/dependency-injection), which resolves
by token for the whole app.
