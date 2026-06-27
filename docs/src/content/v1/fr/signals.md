# Les signaux

Un **signal** est l'unité d'état réactif. `createSignal` renvoie un couple lecteur/écrivain :

```ts
import { createSignal } from '@fluixi/reactive/signal';

const [count, setCount] = createSignal(0);

count();              // lecture → 0
setCount(1);          // écriture → 1
setCount(c => c + 1); // mise à jour depuis la valeur précédente → 2
```

## Lire, c'est s'abonner

Appeler le lecteur dans un mémo ou un effet **abonne** ce calcul au signal. La prochaine écriture
ne ré-exécute que les calculs qui l'ont lu :

```ts
createEffect(() => {
  console.log('count vaut', count()); // s'abonne à count
});
setCount(5); // affiche « count vaut 5 »
```

Lire hors de toute portée réactive renvoie simplement la valeur — sans abonnement.

## Égalité

Par défaut, un signal ne notifie pas ses lecteurs si la nouvelle valeur est `===` à l'ancienne.
Passez `equals` pour personnaliser, ou `equals: false` pour toujours notifier :

```ts
const [list, setList] = createSignal([], { equals: false });
```

## Lire sans s'abonner

Utilisez `untrack` pour lire un signal sans créer de dépendance :

```ts
import { untrack } from '@fluixi/reactive/signal';

createEffect(() => {
  draw(count(), untrack(theme)); // se ré-exécute sur count, mais pas sur theme
});
```

Suivant : **[Les valeurs dérivées](/v1/fr/derived-values)**.
