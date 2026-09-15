# Les valeurs dérivées

Un **mémo** dérive une valeur d'autres sources réactives. Il met son
résultat en cache et ne se recalcule que lorsqu'une de ses dépendances change :

```ts
import { signal, memo } from '@fluixi/reactive/signal';

const first = signal('Ada');
const last  = signal('Lovelace');

const fullName = memo(() => `${first()} ${last()}`);

fullName(); // « Ada Lovelace »
```

## Paresseux et mis en cache

Un mémo ne calcule que lorsqu'il est **lu**, et ne recalcule que si une dépendance change vraiment.
Le relire renvoie la valeur en cache, gratuitement :

```ts
const expensive = memo(() => heavyCompute(data()));
expensive(); // calcule une fois
expensive(); // en cache, aucun recalcul
```

Si rien n'observe un mémo, il ne s'exécute jamais.

## Sans incohérence (glitch-free)

Quand un changement se diffuse puis re-converge, un mémo recalcule **exactement une fois** avec des
entrées cohérentes, jamais avec une valeur à moitié mise à jour :

```ts
const a = signal(1);
const b = memo(() => a() + 1);
const c = memo(() => a() * 2);
const d = memo(() => b() + c()); // recalcule une seule fois par changement de a

a.set(2); // d recalcule une seule fois
```

## La forme accesseur

`createMemo` renvoie le même mémo sous forme d'accesseur simple :

```ts
import { createMemo } from '@fluixi/reactive/signal';

const fullName = createMemo(() => `${first()} ${last()}`);
fullName(); // « Ada Lovelace »
```

`memo`, c'est cet accesseur rangé dans un objet sous `get` : une seule primitive, qui se mélange
librement avec des signaux écrits d'une façon ou de l'autre.

Suivant : **[Les effets](/v1/fr/effects)**.
