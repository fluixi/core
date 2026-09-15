# Le cœur TC39 Signals

Les primitives que vous avez vues, `createSignal`, `createMemo`, `createEffect`, reposent sur un
petit cœur normalisé : une implémentation de la **proposition TC39 Signals**. Vous en avez rarement
besoin directement, mais il est là quand vous voulez l'API la plus bas niveau ou construire vos
propres abstractions réactives.

## Signal.State

Un signal modifiable, l'équivalent de `createSignal` :

```ts
import { Signal } from '@fluixi/reactive/signal';

const count = new Signal.State(0);

count.get(); // 0
count.set(1);
count.get(); // 1
```

Il est régi par l'égalité comme `createSignal` ; passez `{ equals }` pour personnaliser.

## Signal.Computed

Un signal dérivé, paresseux et mis en cache, l'équivalent de `createMemo` :

```ts
const doubled = new Signal.Computed(() => count.get() * 2);

doubled.get(); // ne recalcule que lorsque count change
```

Un computed ne s'exécute que lorsqu'il est lu, et ne recalcule que si une dépendance lue a vraiment
changé, le même comportement paresseux et sans incohérence qu'un mémo.

## Signal.subtle.Watcher

`State` et `Computed` sont **tirés par la lecture** (pull) : rien ne s'exécute tout seul. Pour
réagir *avec empressement*, la base des effets : utilisez un `Watcher`. Son rappel se déclenche
quand un signal observé a pu changer ; il ne doit pas lire de signaux lui-même, seulement planifier
le travail :

```ts
let queued = false;
const w = new Signal.subtle.Watcher(() => {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    for (const node of w.getPending()) node.get(); // relire pour stabiliser
    w.watch();                                       // réarmer
  });
});

w.watch(doubled);
count.set(2); // planifie le watcher
```

`getPending()` renvoie les signaux observés susceptibles d'avoir changé ; les relire stabilise le
graphe, et `watch()` réarme le watcher. C'est exactement ainsi que `createEffect` est implémenté en
coulisses.

## Utilitaires subtle

L'espace de noms `Signal.subtle` expose aussi `untrack(fn)` (lire sans s'abonner),
`currentComputed()` (le computed en cours d'évaluation, le cas échéant) et `hasSinks(signal)` (si un
observateur observe un signal).

## Pourquoi c'est important

Parce que le cœur suit le modèle TC39, votre état réactif est **interopérable** et le graphe est
**introspectable**, c'est précisément ce qui alimente le graphe de dépendances en direct du
[Bac à sable](https://playground.fluixi.com) et de `@fluixi/devtools`.

L'API du quotidien (`createSignal` et compagnie) est presque toujours ce que vous voulez, mais vous
savez désormais ce qu'il y a en dessous.
