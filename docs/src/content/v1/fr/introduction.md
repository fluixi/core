# Introduction

Fluixi est une **plateforme réactive native au compilateur**. Son compilateur comprend les valeurs
réactives en tant que valeurs — pas via une convention de nommage — et porte cette compréhension à
travers JSX et les gabarits `` html`` ``, la génération DOM, le rendu serveur, l'hydratation, le
routage et le méta-framework, comme un seul modèle.

C'est toute l'idée, et il vaut la peine d'être précis sur ce qu'elle apporte : « réactivité fine »
et « pas de DOM virtuel » décrivent plusieurs frameworks, et Fluixi ne cherche pas à en être une
autre orthographe.

## Le problème visé

Tout framework réactif vous demande de garder en tête un modèle que le langage, lui, ignore. Vous
apprenez quelles lectures sont suivies, quelles valeurs peuvent être déstructurées, où une valeur
doit rester une fonction, et lesquelles de vos habitudes JavaScript vont silencieusement couper une
dépendance. Le compilateur ne peut pas aider, puisqu'il ne sait pas ce que sont vos valeurs : la
charge retombe sur vous, et les échecs sont muets — un libellé figé, une liste qui cesse de se
mettre à jour, aucune erreur.

La réponse de Fluixi : faire en sorte que le compilateur sache. Il résout une primitive réactive par
la liaison dont elle vient, pas par la façon dont le nom se lit :

```ts
import { signal as state } from '@fluixi/reactive/signal';
const count = state(0);        // un signal — résolu via l'import

function signal() { return 42; }
const value = signal();        // pas un signal — une fonction locale
```

De là, il peut faire ce qu'un runtime seul ne peut pas. Déstructurez les props d'un composant et le
compilateur réécrit les liaisons en lectures vivantes : la syntaxe simple continue de fonctionner.

```tsx
function Card({ title, ...rest }) {
  return <h2 {...rest}>{title}</h2>;
}
```

Là où il ne peut pas prouver que la réécriture est sûre, il laisse votre code tel quel et explique
pourquoi. C'est le contrat : **du TypeScript normal, la réactivité portée par le compilateur — qui
vous dit quand il n'y arrive pas.**

## Ce qui en découle

- **Un modèle, deux syntaxes.** JSX et les gabarits `` html`` `` compilent vers la même
  représentation réactive. Aucun n'est un portage de l'autre.
- **DOM direct.** Un changement exécute la liaison précise qui en dépend. Pas de réaffichage de
  composant, pas de diff, pas d'arbre virtuel.
- **Le même modèle de bout en bout.** Rendu client, rendu serveur, streaming, hydratation, routeur
  et méta-framework partagent un seul graphe réactif au lieu de s'accorder aux frontières.
- **Deux écritures, une primitive.** `signal(0)` et `$signal(0)` compilent vers le même appel. La
  forme `$` évite l'import ; l'API explicite reste publique, car une bibliothèque qui n'exécute
  jamais ce compilateur doit pouvoir écrire du code réactif.

## Les primitives

```ts
import { signal, memo, effect } from '@fluixi/reactive/signal';

const count = signal(0);                   // état
const doubled = memo(() => count() * 2);   // dérivée
effect(() => console.log(doubled()));      // effet de bord
```

Dans une application compilée, laissez tomber l'import : `$signal`, `$memo` et `$effect` sont les
mêmes primitives, résolues par le compilateur.

- Un **signal** contient une valeur et suit qui la lit. Appelez-le pour lire, `.set()` pour écrire.
- Un **mémo** dérive une valeur et ne recalcule que quand ses dépendances changent.
- Un **effet** exécute un effet de bord et se ré-exécute quand ses lectures réactives changent.

Le cœur réactif — `@fluixi/reactive` — est une bibliothèque autonome qui implémente le modèle
**TC39 Signals** : un graphe de dépendances paresseux et sans incohérence (« glitch-free »),
utilisable dans le navigateur, sur le serveur, ou seul.

## Où se situe Fluixi

Il emprunte ouvertement. Les signaux et le suivi fin sont des idées éprouvées ; compiler des
gabarits en appels DOM impératifs aussi, tout comme un méta-framework au-dessus du rendu serveur et
du routage. Rien de tout cela n'a été inventé ici, et prétendre le contraire serait ridicule.

Ce qui appartient à Fluixi, c'est le **contrat entre le compilateur et le graphe réactif**, et sa
portée : un seul modèle sémantique depuis la création d'une valeur, à travers l'aliasing, la
déstructuration et les valeurs dérivées, jusqu'aux liaisons DOM générées, au rendu serveur, à
l'hydratation et à la libération. Jugez-le sur un point : écrire du TypeScript ordinaire
continue-t-il de fonctionner ?

Suivant : **[Démarrage rapide](/v1/fr/quickstart)**.
