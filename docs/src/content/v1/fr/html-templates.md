# Templates html``

Fluixi permet d'écrire le balisage de deux façons : **JSX**, ou un template `` html`` ``. Les deux
compilent vers les *mêmes* appels DOM à granularité fine — il n'y a donc aucune différence à
l'exécution. `` html`` `` est une surface d'écriture sans JSX, pour quand vous ne voulez pas
configurer JSX dans votre tsconfig.

```ts
import { html } from '@fluixi/core';

function Hello(props: { name: string }) {
  return html`<h1>Bonjour ${props.name}</h1>`;
}
```

Importez `html` (et `svg`) depuis `@fluixi/core`, ou depuis `@fluixi/start` dans une application
méta-framework.

## Interpolation

Chaque `${…}` est un trou réactif. Lire un signal à l'intérieur maintient cet endroit — et
uniquement lui — à jour :

```ts
const [count, setCount] = createSignal(0);
html`<p>Compteur : ${count()}</p>`;
```

Les attributs s'interpolent de la même manière, y compris dans une valeur entre guillemets :

```ts
html`<div class="card ${theme()}" title=${label()}></div>`;
```

## Composants

Utilisez un composant par son tag. Deux formes :

```ts
// Tag statique — @fluixi/ts-plugin garde TypeScript satisfait (il ne voit pas dans la chaîne).
html`<${UserCard} name=${user().name} />`;
// Tag dynamique — le ${} fait que TypeScript voit la référence nativement ; pas de plugin requis.
html`<${UserCard} name=${user().name} />`;
```

La forme `` <${Comp}/> `` (dynamique) est recommandée dans les projets TypeScript purs : puisque
`${Comp}` est une vraie expression, TypeScript la compte déjà comme utilisée. Les enfants et les
balises fermantes fonctionnent comme prévu :

```ts
html`<${Card}>
  <p>Contenu</p>
</${Card}>`;
```

Les composants de contrôle de flux et de routage sont **auto-importés** — écrivez `<Show>`, `<For>`,
`<Router>`, `<Outlet>` et le compilateur ajoute l'import pour vous :

```ts
html`
  <${Show} when=${user()} fallback=${html`<a href="/login">Se connecter</a>`}>
    <p>Bienvenue, ${user()!.name}</p>
  </${Show}>
`;
```

## Templates imbriqués

Un trou peut contenir un autre template — utile pour un `fallback`, des éléments de liste, ou des
branches conditionnelles :

```ts
html`<ul>${items().map((i) => html`<li>${i.label}</li>`)}</ul>`;
```

## SVG

Utilisez le tag `svg` pour placer un sous-arbre dans l'espace de noms SVG :

```ts
import { svg } from '@fluixi/core';
svg`<circle cx="50" cy="50" r=${r()} />`;
```

## Support de l'éditeur

`@fluixi/ts-plugin` (inclus dans chaque application générée, et livré dans l'extension VS Code)
donne un vrai IntelliSense à `` html`` `` : survol, complétion et vérification de types du JavaScript
dans les trous — la même expérience que JSX. Référencez-le dans `tsconfig.json` :

```json
{ "compilerOptions": { "plugins": [{ "name": "@fluixi/ts-plugin" }] } }
```

## Quand choisir html``

- Vous ne voulez pas de `jsx`/`jsxImportSource` dans votre tsconfig (bibliothèque, script, TS pur).
- Vous préférez le balisage en template littéral.
- Vous voulez mélanger les deux — un bloc `` html`` `` dans un composant JSX, ou l'inverse : tout compile.

Suite : la référence complète des **[directives](/v1/fr/directives)** (événements, liaisons, `if`/`each`, …).
