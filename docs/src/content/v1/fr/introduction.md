# Introduction

Fluixi est un framework **à réactivité fine**. Plutôt que de réafficher des composants et de
comparer un DOM virtuel, il construit un graphe de **signaux**, de **valeurs dérivées** et
d'**effets**, et met à jour exactement les parties de votre application qui dépendent de la donnée
qui a changé.

Le cœur réactif — `@fluixi/reactive` — est une petite bibliothèque autonome. Il implémente le
modèle **TC39 Signals** : un graphe de dépendances paresseux, sans incohérence (« glitch-free »),
utilisable dans le navigateur, sur le serveur, ou seul.

## Les trois primitives

Presque tout repose sur trois primitives :

```ts
import { signal, memo, effect } from '@fluixi/reactive/signal';

const count = signal(0);       // état
const doubled = memo(() => count() * 2);   // dérivée
effect(() => console.log(doubled()));      // effet de bord
```

- Un **signal** contient une valeur et sait qui le lit.
- Un **mémo** dérive une valeur d'autres sources réactives et ne se recalcule que lorsqu'elles changent.
- Un **effet** exécute un effet de bord et se ré-exécute quand ses lectures réactives changent.

## Pourquoi une réactivité fine ?

Quand `setCount(1)` s'exécute, Fluixi ne réaffiche pas votre composant. Il parcourt le graphe de
dépendances, recalcule `doubled` et ré-exécute le seul effet qui l'a lu — rien d'autre. Pas de DOM
virtuel, pas de comparaison, aucun travail superflu.

> À voir en direct : le [Bac à sable](https://playground.fluixi.com) visualise le graphe de
> dépendances pendant qu'il se propage — signaux, mémos et effets s'illuminent.

Continuez avec **[Les signaux](/v1/fr/signals)**, la primitive de base.
