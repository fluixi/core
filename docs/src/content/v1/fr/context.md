# Contexte

Un contexte est une valeur qu'un composant fournit et que tout composant en dessous lit, sans la
passer en prop à chaque niveau : le thème courant, l'utilisateur connecté, les onglets auxquels
appartient un onglet.

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

`useContext` renvoie la valeur du Provider le plus proche au-dessus du composant qui l'appelle,
ou la valeur par défaut du contexte s'il n'y en a pas. Le second argument de `createContext` est
un nom, que les devtools affichent.

## Des valeurs qui changent

La valeur du Provider est lue une fois. Pour partager quelque chose qui change, fournissez un
signal, ou un objet de signaux, et lisez-le là où il sert :

```tsx
const Session = createContext<{ user: () => User | null }>();

function Shell(props) {
  const user = signal<User | null>(null);
  return <Session.Provider value={{ user }}>{props.children}</Session.Provider>;
}
```

Un composant qui lit `useContext(Session).user()` suit chaque changement ; le Provider lui-même
ne se rend jamais de nouveau.

## Un contexte qui doit être fourni

Pour une partie qui ne fonctionne que dans son parent, un onglet hors de ses onglets, une valeur
par défaut cacherait l'erreur. `requireContext` lève une erreur à la place :

```ts
const tabs = requireContext(Tabs, 'A <Tab> goes inside <Tabs>.');
```

## Des Providers sans JSX

`createProvider(context, value, props)` fournit depuis une simple fonction, pour un composant qui
fournit et rend ses enfants :

```ts
const ThemeProvider = (props) => createProvider(Theme, 'dark', props);
```

La coquille d'une application imbrique souvent un Provider par contexte. `composeProviders` les
écrit en liste, le plus extérieur d'abord :

```ts
const AppProviders = (props) =>
  composeProviders([[Theme, 'dark'], [Locale, () => locale()], [Session, session]], props);
```

Une valeur peut être un accesseur, lu une fois. Passez dans les deux cas les props du composant
lui-même, pour que ses enfants restent paresseux et se rendent à l'intérieur des Providers.

## Éléments personnalisés

Les mêmes objets de contexte fonctionnent avec les [éléments personnalisés](/v1/fr/web-components) :
un élément lit ce que lui donne un Provider qui l'entoure, et les composants qu'un élément rend
lisent ce que l'élément fournit. Un élément rendu par le serveur s'hydrate avec le contexte de
l'application qui l'a rendu.

## Contexte ou injection de dépendances

Le contexte suit l'arbre des composants : une valeur dépend de l'endroit où vous êtes. Pour des
services qui n'en dépendent pas, un client d'API, un journal, utilisez
l'[injection de dépendances](/v1/fr/dependency-injection), qui résout par jeton pour toute
l'application.
