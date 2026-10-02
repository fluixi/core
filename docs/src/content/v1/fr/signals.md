# Les signaux

Un **signal** est l'unité d'état réactif. `signal` renvoie une seule liaison : appelez-la pour lire, `.set()` pour écrire.

```ts
import { signal } from '@fluixi/reactive/signal';

const count = signal(0);

count();               // lecture → 0
count.set(1);          // écriture → 1
count.set(c => c + 1); // mise à jour depuis la valeur précédente → 2
```

Dans un composant, `$signal` fait la même chose sans l'import, le compilateur le résout et
ajoute ce qu'il faut :

```ts
const count = $signal(0);
```

## Lire, c'est s'abonner

Appeler le signal dans un mémo ou un effet **abonne** ce calcul au signal. La prochaine écriture
ne ré-exécute que les calculs qui l'ont lu :

```ts
effect(() => {
  console.log('count vaut', count()); // s'abonne à count
});
count.set(5); // affiche « count vaut 5 »
```

Lire hors de toute portée réactive renvoie simplement la valeur, sans abonnement.

## Égalité

Par défaut, un signal ne notifie pas ses lecteurs si la nouvelle valeur est `===` à l'ancienne.
Passez `equals` pour personnaliser, ou `equals: false` pour toujours notifier :

```ts
const list = signal([], { equals: false });
```

## Lire sans s'abonner

Utilisez `untrack` pour lire un signal sans créer de dépendance :

```ts
import { untrack } from '@fluixi/reactive/signal';

effect(() => {
  draw(count(), untrack(theme)); // se ré-exécute sur count, mais pas sur theme
});
```

`$untrack` fait la même chose sans l'import.

## La forme en couple

`createSignal` renvoie le même signal sous forme de paire `[lecture, écriture]` :

```ts
import { createSignal } from '@fluixi/reactive/signal';

const [count, setCount] = createSignal(0);

count();       // lecture
setCount(1);   // écriture
```

Ce sont deux écritures d'une même primitive, pas deux implémentations : `signal` **est** cette
fonction de lecture avec le setter posé dessus, donc lire, c'est le même appel des deux côtés.
Elles se suivent mutuellement, se mélangent librement dans un module et se comportent à
l'identique au rendu serveur comme à l'hydratation. Préférez `signal` ; gardez le couple quand
vous voulez les deux moitiés séparées, et sachez que beaucoup de code existant l'utilise.

## Intrinsèques

Dans une application construite par `@fluixi/start`, les formes en `$` n'ont pas besoin d'import :
le compilateur réécrit chacune en appel du runtime et ajoute l'import. Ce n'est pas un second
système réactif, `$signal` se compile en `signal`. Une liaison locale du même nom l'emporte, et le
compilateur le signale.

| Intrinsèque | Correspond à | Importé de |
| --- | --- | --- |
| `$signal`, `$memo`, `$effect` | `signal`, `memo`, `effect` | `@fluixi/reactive/signal` |
| `$resource` | `resource` | `@fluixi/reactive/signal` |
| `$cachedResource` | `cachedResource` | `@fluixi/reactive/cached-resource` |
| `$store`, `$untrackStore` | `store`, `untrackStore` | `@fluixi/reactive/store` |
| `$untrack`, `$batch`, `$root`, `$context` | `untrack`, `batch`, `root`, `context` | `@fluixi/reactive/signal` |
| `$cleanup` | `onCleanup` | `@fluixi/reactive/signal` |
| `$renderEffect`, `$computed` | `renderEffect`, `computed` | `@fluixi/reactive/signal` |
| `$selector`, `$deferred` | `createSelector`, `createDeferred` | `@fluixi/reactive/signal` |
| `$storage`, `$asyncStorage`, `$persisted` | `useStorage`, `useAsyncStorage`, `persisted` | `@fluixi/core/storage` |
| `$env` | `env` | `@fluixi/start/env` |

Le code d'un paquet, que le compilateur de start ne traite pas, importe les noms du runtime.

Suivant : **[Les valeurs dérivées](/v1/fr/derived-values)**.
