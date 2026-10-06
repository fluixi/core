# Templates html``

Fluixi permet d'écrire du balisage de deux façons : en **JSX**, ou avec un template
balisé `` html`` ``. Les deux compilent vers les *mêmes* appels DOM à granularité fine :
il n'y a aucune différence à l'exécution. `` html`` `` est une surface d'écriture sans JSX,
pour quand vous ne voulez pas configurer JSX dans votre tsconfig.

```ts
import { html } from '@fluixi/core';

function Hello(props: { name: string }) {
  return html`<h1>Bonjour ${props.name}</h1>`;
}
```

Importez `html` (et `svg`) depuis `@fluixi/core`, ou depuis `@fluixi/start` dans une
application méta-framework.

## Comment ça compile

C'est la clé de tout ce qui suit. Le template n'est **pas** analysé à l'exécution. À la
compilation, le compilateur le sépare en balisage statique et en trous, émet la partie
statique une seule fois, et relie chaque trou à un appel DOM ciblé :

```ts
html`<p class="row">Compteur : ${count()}</p>`;
```

devient, en substance, un `<p class="row">` construit une fois et un unique nœud texte
tenu à jour par un effet. Rien n'est re-rendu, rien n'est comparé.

Deux conséquences à connaître :

- **La valeur d'un trou n'est jamais analysée comme du HTML.** Elle est affectée comme
  texte, comme attribut ou comme propriété. Interpoler une chaîne contenant `<script>`
  insère ce texte, cela ne crée pas d'élément. La seule exception délibérée est
  [`html=`](/v1/fr/directives), documentée comme une échappatoire pour cette raison même.
- **La forme du template est figée à la compilation.** Un trou peut fournir une valeur, un
  enfant, un composant ou un ensemble de props, mais pas un nom de balise ni un nom
  d'attribut, car ceux-là déterminent la forme. Voir [les composants](#composants) pour le
  cas des balises dynamiques.

## Interpolation

Tout `${...}` est un trou réactif. Lire un signal à l'intérieur maintient cet endroit, et
uniquement celui-là, à jour :

```ts
const count = $signal(0);
html`<p>Compteur : ${count()}</p>`;
```

### Où placer un trou

```ts
html`<p>${text()}</p>`;                    // enfant, texte, nœud, tableau, autre template
html`<div title=${label()}></div>`;        // valeur d'attribut entière
html`<div class="card ${theme()}"></div>`; // partie d'une valeur entre guillemets
html`<div ...${attrs}></div>`;             // un objet de props entier
html`<${Card} />`;                         // un composant en position de balise
```

Un trou qui remplit **toute** la valeur d'un attribut la transmet telle quelle : elle peut
donc être de n'importe quel type, un nombre, un booléen, un objet pour `class`/`style`.
Les guillemets n'y changent rien : `value=${n}` et `value="${n}"` compilent à l'identique.

Mêler du texte statique et un trou relève de l'interpolation de chaîne, et le résultat est
toujours une chaîne :

```ts
html`<input value=${0} />`;                // le nombre 0
html`<div class="card ${theme()}"></div>`; // la chaîne « card dark »
```

### Lire un signal, ne pas le passer

Appelez l'accesseur dans le trou. Le trou est lui-même la frontière réactive : le
compilateur l'enveloppe dans un effet pour vous.

```ts
html`<p>${count()}</p>`;   // ✓ suivi, ne réexécute que ce nœud texte
html`<p>${count}</p>`;     // affiche la fonction, pas sa valeur
```

## Composants

Deux formes, dont la différence ne tient qu'à la façon dont TypeScript voit le nom :

```ts
// Balise dynamique, `${Card}` est une vraie expression, TypeScript la compte comme utilisée.
html`<${Card} title=${t()} />`;

// Balise statique, nom nu, comme en JSX.
html`<Card title=${t()} />`;
```

La forme statique a besoin de quelque chose pour signaler à TypeScript que le nom est
utilisé, puisqu'il n'est que du texte dans une chaîne : soit
[`@fluixi/ts-plugin`](#prise-en-charge-de-léditeur), soit une
[règle `resolve`](/v1/fr/component-resolution) qui fournit le composant sans import. Dans
un projet TypeScript sans l'un ni l'autre, préférez `` <${Card}/> ``.

Les enfants et les balises fermantes fonctionnent comme attendu. Une balise dynamique se
ferme avec la même expression :

```ts
html`<${Card}>
  <p>Contenu</p>
</${Card}>`;

html`<Card>
  <p>Contenu</p>
</Card>`;
```

L'auto-fermeture fonctionne pour les deux formes et, contrairement à HTML, pour
n'importe quel composant.

### Composants auto-importés

Les composants de contrôle de flux et du routeur se résolvent sans import : écrivez
`<Show>`, `<For>`, `<Router>`, `<Outlet>` et le compilateur ajoute l'import.

```ts
html`
  <${Show} when=${user()} fallback=${html`<a href="/login">Se connecter</a>`}>
    <p>Bienvenue, ${user()!.name}</p>
  </${Show}>
`;
```

Vos propres composants et ceux d'une bibliothèque peuvent les rejoindre, voir
**[résolution des composants](/v1/fr/component-resolution)**.

### Props

Chaque prop est un trou, et chacune est réactive indépendamment :

```ts
html`<${Row} label="Statique" count=${n()} onSelect=${pick} ...${rest} />`;
```

Les enfants arrivent dans `props.children`. Un enfant fonction est transmis tel quel :
c'est ce sur quoi reposent `<For>` et `each`.

## Templates imbriqués

Un trou peut contenir un autre template, pratique pour `fallback`, les éléments de liste
ou les branches conditionnelles :

```ts
html`<ul>${items().map((i) => html`<li>${i.label}</li>`)}</ul>`;
```

Un template imbriqué compile comme les autres : construit une fois, réutilisé à chaque
appel. Pour une liste qui change, préférez [`each`](/v1/fr/directives) ou `<For>`,
`.map()` reconstruit toutes les lignes à chaque changement, là où `<For>` réutilise celles
dont la donnée n'a pas bougé.

## SVG

Utilisez la balise `svg` pour placer un sous-arbre dans l'espace de noms SVG. Les éléments
créés là en ont besoin, et la balise `html` ne l'applique pas :

```ts
import { svg } from '@fluixi/core';

svg`<circle cx="50" cy="50" r=${r()} />`;
```

Une racine `<svg>` écrite dans `` html`` `` fonctionne aussi, le compilateur reconnaît la
balise et crée le sous-arbre dans le bon espace de noms. Réservez `` svg`` `` aux templates
qui *commencent* en dessous de la racine, avec un `<circle>` ou un `<path>` sans ancêtre
`<svg>` dans le même template pour le signaler.

## Espaces et texte

Les espaces sont conservés tels quels, comme en HTML, repliés par CSS au rendu, pas par le
compilateur. `<pre>`, `<textarea>` et `<script>` gardent leur contenu verbatim. `<style>` aussi,
sauf si les styles de composant sont activés : son CSS est alors compilé, voir [Styles](/v1/fr/styling).

## Prise en charge de l'éditeur

`@fluixi/ts-plugin` (inclus dans toute application créée par le scaffolding, et livré dans
l'extension VS Code) donne à `` html`` `` une véritable IntelliSense : survol, complétion
des attributs d'élément et des props de composant, aller à la définition sur les balises,
et vérification de types du JavaScript dans les trous, la même expérience qu'en JSX.
Référencez-le dans `tsconfig.json` :

```json
{ "compilerOptions": { "plugins": [{ "name": "@fluixi/ts-plugin" }] } }
```

Le plugin tourne dans le service TypeScript de votre éditeur, jamais dans `tsc`. Un projet en
TypeScript 7 le garde dans VS Code : le TypeScript intégré le charge toujours, et le paquet
`typescript@7` n'a pas de service propre vers lequel basculer. L'extension TypeScript Native
Preview ne charge pas les plugins. Avec elle, les templates html`` n'ont ni survol, ni complétion,
ni paramètres de callback typés, et un composant utilisé seulement comme balise apparaît comme
inutilisé. Le JSX garde tout cela, puisque TypeScript lit le JSX lui-même. `fluixi check` applique
les règles d'env et d'auth en ligne de commande, quelle que soit la version.

## Quand choisir html``

- Vous ne voulez pas de `jsx`/`jsxImportSource` dans votre tsconfig (une bibliothèque, un
  script, du TypeScript simple).
- Vous préférez le balisage en template littéral.
- Vous voulez les directives réservées à `` html`` `` : `if`/`else`, `each`, `bind:`,
  `class:name`, `style:prop`.
- Vous voulez mélanger les deux, un bloc `` html`` `` dans un composant JSX, ou l'inverse :
  les deux compilent.

Ensuite : la référence complète des **[directives](/v1/fr/directives)** (événements,
liaisons, `if`/`each`, ...).
