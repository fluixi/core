# Le compilateur

`fluixi()` compile en **réécrivant votre source**. Il analyse le fichier une fois, détermine
ce que doit devenir chaque template et chaque élément JSX, puis remplace les portions
concernées par le résultat. Rien n'est réimprimé : tout ce qui n'est pas un template ressort
octet pour octet tel que vous l'avez écrit, mise en forme, commentaires, et le texte à
l'intérieur d'un trou `${...}` compris. Les types restent en place, à charge de votre bundler
de les retirer.

C'est tout le chemin par défaut. Ce n'est pas un plugin Babel, et une application n'installe
aucune chaîne d'outils Babel pour s'en servir.

## Ce qu'une application installe

`@babel/parser`, tiré par `@fluixi/compiler`. C'est la seule pièce de cet espace de noms sur
le chemin par défaut, l'analyseur, pas le système de plugins, pas le parcours d'AST, pas
l'imprimeur. `@fluixi/vite-plugin` et `@fluixi/start` n'en déclarent aucune.

Tout ce qui suit l'analyse appartient au framework : l'IR, l'optimiseur, la résolution de
composants, le backend de génération de code, et `@fluixi/template-parser` pour `` html`` ``.

## Utiliser Babel malgré tout

Certains projets ont des plugins Babel qui doivent voir la sortie, une macro, une passe
d'instrumentation, un outil de couverture branché sur une chaîne Babel. Demandez-le :

```ts
import { fluixi } from '@fluixi/vite-plugin';

export default defineConfig({
  plugins: [fluixi({ babel: true })],
});
```

Cela sélectionne le front-end Babel. Même IR, mêmes passes, même backend, la seule
différence est de savoir qui détient l'AST pendant le travail. `@babel/core` et l'outillage
de plugins sont des dépendances pair optionnelles, installées uniquement si vous choisissez
ce chemin :

```bash
pnpm add -D @babel/core @fluixi/babel-plugin-jsx
```

C'est ce qu'il vous faut quand un de vos plugins Babel doit s'exécuter sur la sortie
compilée, ou quand votre build est une chaîne Babel plutôt qu'un bundler (`babel-jest`,
`babel src -d lib`). Sinon, non : ce chemin est plus lent, et c'est celui qui a le moins
d'utilisateurs.

## Compatibilité

- **Les deux syntaxes d'écriture compilent sur les deux chemins.** JSX et
  `` html`` ``/`` svg`` `` passent par le même pipeline derrière le même IR, et un template
  imbriqué dans l'autre fonctionne dans les deux sens.
- **Le code émis est identique.** Les deux front-ends ont été validés sur un corpus de
  fichiers d'applications réelles et comparés sur ce que la sortie *fait*, appels d'éléments
  et de templates, insertions, spreads, appels de composants, et chaque nom d'attribut qui
  atteint le DOM.
- **Les source maps** sont émises sur le chemin par défaut. Le code hors template conserve sa
  position exacte. Un template se résout à la position du template lui-même plutôt qu'à
  l'expression qu'il contient : un point d'arrêt dans un trou atterrit donc sur le template
  qui l'a produit.
- **TypeScript n'est pas le travail du compilateur.** Les types restent en place pour
  que la transformation de Vite (Oxc dans Vite 8, esbuild avant) ou celle de votre bundler les
  retire ensuite, c'est pourquoi
  `@babel/preset-typescript` n'est pas nécessaire du tout sur le chemin par défaut.

## Coût

Mesuré sur un fichier de 27 Ko contenant 100 composants (`FLUIXI_BENCH=1` dans le dépôt, pour
rejouer la mesure sur vos propres sources) :

| | |
| --- | --- |
| analyse | ~3 % d'une compilation |
| le travail d'IR propre au framework | ~29 % |
| le reste, parcours, réanalyse du code émis, impression | ~68 % sur le chemin Babel, absent du chemin par défaut |

Le chemin par défaut est environ **13 à 15× plus rapide** que le chemin Babel sur la même
source, et la raison est structurelle plutôt qu'astucieuse : le chemin Babel émet le code
sous forme de chaîne puis réanalyse cette chaîne pour la remettre dans l'AST hôte, le même
code est donc analysé deux fois.

Une première compilation coûte plusieurs fois une compilation ultérieure dans le même
processus, échauffement du JIT, pas un état du framework, donc un serveur de développement
paie davantage pour la première requête vers un module que pour chaque édition suivante. Les
templates riches en directives coûtent légèrement plus par template que les templates simples
et légèrement *moins* par kilo-octet : les directives ne sont pas à éviter pour la vitesse de
build.

Que l'analyse pèse 3 % explique aussi pourquoi remplacer l'analyseur n'est pas un levier de
performance. Cette question se pose pour d'autres raisons, pas comme une optimisation.
