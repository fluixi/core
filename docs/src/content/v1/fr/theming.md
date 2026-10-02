# Thèmes

Dans Fluixi, un thème est un attribut sur `<html>` : `data-theme="dark"`, `data-accent="violet"`.
Votre CSS s'appuie dessus, et le cœur le tient juste : le choix du visiteur retenu, le rendu
serveur et le navigateur d'accord, pas de flash avant le premier affichage, les barres du
navigateur dans la couleur qui va avec.

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
  return <button onClick={() => scheme.toggle()}>Changer de thème</button>;
}
```

## Clair, sombre et le système

`createColorScheme` est l'axe que presque toute application possède. Le choix vaut `system`,
`light` ou `dark`, et `system` est la valeur par défaut : une première visite correspond au
système d'exploitation du lecteur.

| Membre | |
| --- | --- |
| `value()` | le choix : `'system' \| 'light' \| 'dark'` |
| `resolved()` | ce qui est affiché : le choix, ou le schéma du système tant qu'il le suit, en direct |
| `set(choice)` | choisir, et s'en souvenir |
| `toggle()` | basculer entre clair et sombre, depuis ce qui est affiché |
| `headScript()` | le script d'avant affichage, pour une page écrite à la main |

| Option | Par défaut | |
| --- | --- | --- |
| `storageKey` | `color-scheme` | la clé sous laquelle le choix est gardé |
| `attribute` | `data-theme` | l'attribut sur `<html>` |
| `storage` | un cookie pour un an | où le choix est gardé ; `null` le garde en mémoire seulement |
| `systemAs` | `resolved` | ce que dit l'attribut tant que la page suit le système (ci-dessous) |
| `themeColor` | aucune | `{ light, dark }`, les couleurs des barres du navigateur |
| `colorSchemeMeta` | `true` | envoyer `<meta name="color-scheme">` |
| `script` | `true` | envoyer le script d'avant affichage avec la page |

**`systemAs`** décide de ce que voit votre CSS tant que la page suit le système. Avec `resolved`,
l'attribut vaut toujours `light` ou `dark`, ce qui convient à du CSS écrit
`[data-theme="dark"] { ... }`. Avec `system`, l'attribut dit `system`, pour du CSS qui suit le
système de lui-même par `color-scheme` et `light-dark()` ou une media query : un visiteur sans
JavaScript a alors quand même le schéma de son système.

## Où vit le choix, et le premier affichage

Le choix est gardé par défaut dans un cookie : le serveur le lit pendant le rendu et envoie
`<html data-theme="dark">` déjà réglé. Le cœur envoie aussi un petit script avec la page, par la
tête du document, qui règle avant tout affichage ce que le serveur ne pouvait pas savoir :

- une première visite, où seul le navigateur connaît le schéma du système ;
- une page prérendue ou statique, où aucun serveur ne lit le cookie au moment de la requête.

Vous n'écrivez aucun script dans `index.html`. Créez le schéma pendant le rendu, dans un composant
ou un provider à la racine de l'application, jamais au niveau d'un module : sur le serveur, seul
le rendu a la requête et son cookie, et un schéma créé à l'import rend toujours la valeur par
défaut.

## Le navigateur autour de la page

`themeColor` colore ce que le navigateur dessine autour de votre page : la barre d'adresse de
Chrome sur Android, les barres d'onglets et d'état de Safari sur iOS. Tant que la page suit le
système, les deux couleurs partent, chacune sous sa media query `prefers-color-scheme`, et le
navigateur choisit ; une fois que le lecteur a choisi, seule la couleur choisie. `<meta
name="color-scheme">` suit de la même façon : barres de défilement, contrôles de formulaire et
fond avant le chargement de votre CSS s'accordent aussi.

Deux autres noms que vous pourriez croiser : `apple-mobile-web-app-status-bar-style` (`default`,
`black`, `black-translucent`) pour un site ajouté à l'écran d'accueil d'iOS, et `theme_color` et
`background_color` dans le manifeste d'une application web installée. Les deux sont statiques ;
réglez-les dans votre HTML et votre manifeste.

## D'autres axes

Une couleur d'accent, un habillage, une densité, une marque : tout autre axe est un `createTheme`,
un par attribut, avec le même stockage, le même attribut dans la tête et le même script.
`createTheme` prend n'importe quelle liste de valeurs : il convient aussi à un schéma qui en a
plus que clair et sombre.

```ts
import { createTheme } from '@fluixi/core';

const accent = createTheme({
  attribute: 'data-accent',
  themes: ['ink', 'saffron', 'ultramarine'],
  default: 'ink',
  storageKey: 'app-accent',
});

accent.set('saffron');
accent.toggle(); // la suivante dans la liste
```

Options au-delà de `themes` et `default` : `attribute`, `storageKey`, `storage`, `script`,
`system` (suivre le système jusqu'à un choix, en le faisant correspondre à deux de vos valeurs),
`load` (un travail asynchrone par valeur, comme importer la feuille de style d'un habillage, avec
`isLoading()` pendant ce temps) et `onChange`.

`ThemeProvider` transmet plusieurs axes par nom, et `useTheme(name)` en lit un :

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

`useColorScheme()` lit l'axe nommé `scheme`. Les providers imbriqués s'ajoutent aux axes
au-dessus, et `useTheme` lève une erreur qui nomme l'axe quand aucun ne le fournit. Les éléments
personnalisés lisent les mêmes providers : un élément de la page peut changer le thème lui aussi.

## Le faire vous-même

Tout ce qui précède est facultatif. Le contrat avec votre CSS, c'est l'attribut seul : vous pouvez
gérer les thèmes entièrement dans votre propre code.

```ts
function setScheme(scheme: 'light' | 'dark') {
  document.documentElement.dataset.theme = scheme;
  localStorage.setItem('scheme', scheme);
}
```

Ce que vous prenez alors en charge, morceau par morceau :

- **Avant le premier affichage.** La page arrive avec ce que le serveur a écrit. Réglez l'attribut
  depuis un script en ligne dans `<head>`, en lisant là où vous gardez le choix, sinon la page
  montre le mauvais thème jusqu'à l'exécution de votre bundle.

  ```html
  <script>
    try {
      var s = localStorage.getItem('scheme');
      if (s) document.documentElement.dataset.theme = s;
    } catch (e) {}
  </script>
  ```

- **Sur le serveur.** Gardez le choix dans un cookie et rendez l'attribut pendant le rendu serveur,
  `useHead({ htmlAttrs: { 'data-theme': scheme } })` : un visiteur qui revient n'a besoin d'aucun
  script. [Stockage dans une application](/v1/fr/app-storage) lit et écrit un tel cookie des deux
  côtés.
- **Le système.** Laissez l'attribut absent, ou écrivez du CSS qui suit `prefers-color-scheme`
  quand il l'est, et une première visite correspond au système sans code.
- **Les barres du navigateur.** `useHead({ themeColor: [...] })` prend une couleur par media query ;
  mettez-la à jour quand le lecteur choisit.

`createColorScheme` et `createTheme` sont ces morceaux tenus d'accord. Remplacez-en n'importe
lequel par le vôtre si besoin : le CSS ne voit pas la différence.
