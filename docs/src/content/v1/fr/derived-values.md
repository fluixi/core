# Les valeurs dérivées

Un **mémo** dérive une valeur d'autres sources réactives. Créé avec `createMemo`, il met son
résultat en cache et ne se recalcule que lorsqu'une de ses dépendances change :

```ts
import { createSignal, createMemo } from '@fluixi/reactive/signal';

const [first, setFirst] = createSignal('Ada');
const [last, setLast]   = createSignal('Lovelace');

const fullName = createMemo(() => `${first()} ${last()}`);

fullName(); // « Ada Lovelace »
```

## Paresseux et mis en cache

Un mémo ne calcule que lorsqu'il est **lu**, et ne recalcule que si une dépendance change vraiment.
Le relire renvoie la valeur en cache, gratuitement :

```ts
const expensive = createMemo(() => heavyCompute(data()));
expensive(); // calcule une fois
expensive(); // en cache — aucun recalcul
```

Si rien n'observe un mémo, il ne s'exécute jamais.

## Sans incohérence (glitch-free)

Quand un changement se diffuse puis re-converge, un mémo recalcule **exactement une fois** avec des
entrées cohérentes — jamais avec une valeur à moitié mise à jour :

```ts
const [a, setA] = createSignal(1);
const b = createMemo(() => a() + 1);
const c = createMemo(() => a() * 2);
const d = createMemo(() => b() + c()); // recalcule une seule fois par changement de a

setA(2); // d recalcule une seule fois
```

Suivant : **[Les effets](/v1/fr/effects)**.
