# Les signaux

Un **signal** contient un état qui change. On le lit en l'appelant, on l'écrit avec `.set()`.
Tout ce qui l'a lu se met à jour : un nœud texte, un attribut, un memo, un effet. Rien d'autre ne
s'exécute à nouveau.

```ts
import { signal } from '@fluixi/reactive/signal';

const count = signal(0);

count();               // lecture → 0
count.set(1);          // écriture → 1
count.set(c => c + 1); // mise à jour depuis la valeur précédente → 2
```

Dans une application start, `$signal` est la même chose sans import : le compilateur le résout et
ajoute ce qu'il faut.

```ts
const count = $signal(0);
```

## Un exemple réaliste

Un sélecteur de quantité pour une ligne de panier. Chaque signal est lu là où il s'affiche : un
clic met à jour deux nœuds texte et un attribut, et la fonction du composant ne s'exécute pas à
nouveau.

```tsx
function Quantity(props: { price: number; max: number }) {
  const qty = $signal(1);
  const atMax = () => qty() >= props.max;

  return (
    <div class="quantity">
      <button onClick={() => qty.set(q => Math.max(1, q - 1))}>-</button>
      <output>{qty()}</output>
      <button disabled={atMax()} onClick={() => qty.set(q => q + 1)}>+</button>
      <span>{(qty() * props.price).toFixed(2)} €</span>
    </div>
  );
}
```

`atMax` est une simple fonction : elle ne coûte rien à créer et se calcule là où on la lit. Quand
plusieurs endroits lisent une valeur dérivée, ou qu'elle est coûteuse, faites-en un memo
([Valeurs dérivées](/v1/fr/derived-values)).

## Lire, c'est suivre

Appeler un signal dans un memo, un effet ou une expression JSX **abonne** cet endroit au signal.
L'écriture suivante ne met à jour que les endroits qui l'ont lu :

```ts
effect(() => {
  console.log('count vaut', count()); // s'abonne à count
});
count.set(5); // affiche « count vaut 5 »
```

Lire en dehors de tout endroit réactif (dans un gestionnaire d'événement, au niveau du module)
renvoie simplement la valeur.

## Écrire

Les effets qui lisent un signal s'exécutent juste après chaque écriture. Plusieurs écritures à la
suite déclenchent chacune leurs effets : regroupez-les avec `batch` quand elles vont ensemble.

```ts
import { batch } from '@fluixi/reactive/signal';

function reset() {
  batch(() => {
    query.set('');
    page.set(1);
    sort.set('name');
  }); // les effets qui lisent les trois s'exécutent une fois, ici
}
```

Un gestionnaire d'événement ne regroupe pas les écritures à votre place.

## Égalité

Une écriture est ignorée quand la nouvelle valeur est `===` à l'ancienne (`Object.is`) : les
lecteurs ne sont pas prévenus pour rien. Passez `equals` pour décider de ce qui compte comme un
changement, ou `equals: false` pour prévenir à chaque écriture :

```ts
const user = signal(initial, { equals: (a, b) => a.id === b.id && a.name === b.name });
const tick = signal(undefined, { equals: false }); // un déclencheur : chaque écriture prévient
```

## Lire sans s'abonner

`untrack` lit sans créer de dépendance :

```ts
import { untrack } from '@fluixi/reactive/signal';

effect(() => {
  draw(count(), untrack(theme)); // se relance sur count, pas sur theme
});
```

`$untrack` est la même chose sans import.

## Où l'utiliser, et où non

Utilisez un signal pour une valeur qui change et que l'interface affiche ou dont elle dépend : un
champ de formulaire, l'onglet sélectionné, un compteur, un interrupteur.

**Pas pour une valeur calculée à partir d'autres états.** Un effet qui écrit un signal à partir
d'autres signaux s'exécute avec un temps de retard et peut boucler. Dérivez-la :

```ts
// ✗ une copie tenue à jour à la main
const total = signal(0);
effect(() => total.set(price() * qty()));

// ✓ dérivée
const total = memo(() => price() * qty());
```

**Pas pour un objet ou un tableau modifié sur place.** La même référence échoue au test
d'égalité, donc rien ne se met à jour :

```ts
// ✗ même tableau : aucun lecteur n'est prévenu
items.set(list => { list.push(item); return list; });

// ✓ un nouveau tableau
items.set(list => [...list, item]);
```

Pour des objets imbriqués et des listes modifiés clé par clé, un [store](/v1/fr/stores) suit
chaque clé séparément.

**Pas au niveau du module pour un état propre à chaque utilisateur dans une application rendue
côté serveur.** Une seule instance du module sert toutes les requêtes sur le serveur : un signal
déclaré en haut d'un fichier est partagé par tous les visiteurs. Créez-le dans un composant, ou
gardez l'état propre à la requête dans un [service](/v1/fr/dependency-injection) ou dans les
données locales de la requête.

**Pas créé dans un effet ou un memo.** Leur corps s'exécute à nouveau à chaque changement et crée
un nouveau signal à chaque fois, en perdant l'ancienne valeur. Créez les signaux une seule fois,
dans le corps du composant.

## La forme en tuple

`createSignal` renvoie le même signal sous forme de paire `[lecture, écriture]` :

```ts
import { createSignal } from '@fluixi/reactive/signal';

const [count, setCount] = createSignal(0);

count();       // lecture
setCount(1);   // écriture
```

C'est une seule primitive écrite de deux façons : `signal` est `createSignal` avec la fonction
d'écriture attachée en `.set`. Les deux se suivent l'une l'autre, se mélangent librement dans un
module et se comportent de la même façon au rendu serveur et à l'hydratation. Préférez `signal` ;
le tuple sert au code porté depuis Solid et quand vous voulez les deux moitiés séparées.

## Sous le capot

Un signal est un nœud d'un graphe réactif qui suit la forme de la proposition TC39 Signals. Une
écriture marque comme sales les nœuds qui l'ont lu et propage cette marque dans le graphe ; un
memo ne se recalcule que quand quelque chose le lit et qu'une de ses sources a vraiment changé.
Les effets s'exécutent de façon synchrone après l'écriture (ou à la fin d'un `batch`). L'état du
graphe vit sur `globalThis` : deux copies du paquet sur une page le partagent. Voir
[Signaux TC39](/v1/fr/tc39-signals) pour l'API de plus bas niveau.

## Intrinsèques

Dans une application construite par `@fluixi/start`, les formes `$` n'ont pas besoin d'import :
le compilateur réécrit chacune en appel au runtime et ajoute l'import. Ce n'est pas un second
système réactif : `$signal` se compile en `signal`. Une liaison locale du même nom l'emporte, et
le compilateur le signale.

| Intrinsèque | Correspond à | Importé depuis |
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
| `$html`, `$svg`, `$css` | `html`, `svg`, `css` | `@fluixi/core` |

Le code des paquets, que le compilateur de start ne traite pas, importe les noms du runtime.

Suivant : **[Valeurs dérivées](/v1/fr/derived-values)**.
