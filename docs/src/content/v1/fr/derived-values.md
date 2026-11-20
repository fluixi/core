# Valeurs dérivées

Un **memo** est une valeur calculée à partir d'autres valeurs réactives. Il garde son résultat en
cache et ne se recalcule que quand une des valeurs qu'il a lues a changé.

```ts
import { signal, memo } from '@fluixi/reactive/signal';

const first = signal('Ada');
const last  = signal('Lovelace');

const fullName = memo(() => `${first()} ${last()}`);

fullName(); // "Ada Lovelace"
```

`$memo` est la même chose sans import :

```ts
const fullName = $memo(() => `${first()} ${last()}`);
```

## Un exemple réaliste

Une liste de produits filtrable et triée. La liste filtrée est lue par la liste et par le
compteur : elle est calculée une fois par changement et partagée.

```tsx
function Catalog(props: { products: Product[] }) {
  const query = $signal('');
  const sort = $signal<'name' | 'price'>('name');

  const visible = $memo(() => {
    const q = query().trim().toLowerCase();
    const found = props.products.filter((p) => p.name.toLowerCase().includes(q));
    return found.sort((a, b) => (sort() === 'name' ? a.name.localeCompare(b.name) : a.price - b.price));
  });

  return (
    <section>
      <input value={query()} onInput={(e) => query.set(e.currentTarget.value)} placeholder="Rechercher" />
      <p>{visible().length} produits</p>
      <ul>
        <For each={visible()} by={(p) => p.id}>
          {(p) => <li>{p().name}, {p().price} €</li>}
        </For>
      </ul>
    </section>
  );
}
```

Taper une lettre recalcule `visible` une fois ; le nœud texte du compteur et les lignes qui ont
changé se mettent à jour. `by` garde les lignes qui restent, leur DOM n'est pas reconstruit
([Flux de contrôle](/v1/fr/control-flow)).

## Paresseux et en cache

Un memo ne se calcule que quand on le **lit**, et ne se recalcule que quand une de ses sources a
vraiment changé. Le relire renvoie la valeur en cache :

```ts
const expensive = memo(() => heavyCompute(data()));
expensive(); // calcule une fois
expensive(); // en cache, pas de recalcul
```

Un memo que rien ne lit ne s'exécute jamais.

## Sans incohérence

Quand un changement se propage puis se rejoint, un memo se recalcule **une fois**, avec des entrées
cohérentes, jamais avec une valeur à moitié mise à jour :

```ts
const a = signal(1);
const b = memo(() => a() + 1);
const c = memo(() => a() * 2);
const d = memo(() => b() + c());

a.set(2); // d se recalcule une seule fois, avec b et c tous deux à jour
```

## La valeur précédente et l'égalité

La fonction reçoit son résultat précédent, ce qui rend un accumulateur peu coûteux sans second
signal ; le deuxième argument est la valeur de départ :

```ts
const highest = memo((prev = 0) => Math.max(prev, reading()), 0);
```

Comme pour les signaux, `equals` décide de ce qui compte comme un changement pour les lecteurs du
memo :

```ts
const bounds = memo(() => measure(items()), undefined, {
  equals: (a, b) => a.width === b.width && a.height === b.height,
});
```

## Beaucoup de lignes qui demandent « est-ce moi ? »

Une liste où une ligne est sélectionnée : avec une simple comparaison dans chaque ligne, changer la
sélection relance la comparaison dans toutes les lignes. `createSelector` donne à chaque clé son
propre booléen : seules la ligne qui était sélectionnée et celle qui l'est maintenant se mettent à
jour.

```tsx
import { createSelector } from '@fluixi/reactive/signal';

const selected = $signal<string | null>(null);
const isSelected = createSelector(selected);

<For each={rows()} by={(r) => r.id}>
  {(row) => <tr class={isSelected(row().id) ? 'active' : ''} onClick={() => selected.set(row().id)}>...</tr>}
</For>
```

## Garder la page réactive

`createDeferred(source, { timeoutMs })` suit une valeur mais applique ses mises à jour quand le
navigateur est inactif (ou après `timeoutMs`). La saisie reste fluide pendant qu'une vue lourde
construite à partir de la valeur rattrape son retard :

```ts
import { createDeferred } from '@fluixi/reactive/signal';

const deferredQuery = createDeferred(query, { timeoutMs: 200 });
const results = memo(() => search(deferredQuery()));
```

## Où l'utiliser, et où non

Utilisez un memo pour une valeur dérivée de l'état que plusieurs endroits lisent, ou qui coûte à
calculer : une liste filtrée, un total, une date formatée, un contrôle de permission.

**Pas pour une valeur bon marché lue une seule fois.** Une simple fonction fait la même chose avec
moins de mécanique :

```ts
const label = () => `${count()} articles`; // suffit quand un seul endroit la lit
```

**Pas pour des effets de bord.** Un memo s'exécute quand on le lit, peut-être jamais, peut-être en
retard : écrire un signal, lancer une requête ou journaliser n'y arrive pas quand on l'attend.
Utilisez un [effet](/v1/fr/effects), ou une [ressource](/v1/fr/async) pour les données.

**Pas pour créer des signaux ou des effets à l'intérieur.** Ils sont reconstruits à chaque
recalcul. Créez-les une fois, dans le corps du composant.

**Pas pour recopier une valeur dans un signal.** Si vous trouvez un effet qui écrit un signal à
partir d'autres signaux, ce devrait être un memo.

## Sous le capot

Un memo est un nœud calculé du graphe réactif. Une écriture sur une de ses sources le marque
« peut-être sale » ; la lecture suivante vérifie ses sources dans l'ordre et ne recalcule que si
l'une d'elles a vraiment produit une nouvelle valeur, puis garde le résultat. Les lecteurs du memo
ne sont prévenus que si sa propre valeur a changé, selon `equals`.

## La forme accesseur

`createMemo` est la même primitive sous son ancien nom :

```ts
import { createMemo } from '@fluixi/reactive/signal';

const fullName = createMemo(() => `${first()} ${last()}`);
fullName(); // "Ada Lovelace"
```

`memo` renvoie ce même accesseur : les deux se mélangent librement avec des signaux écrits d'une
façon ou de l'autre.

Suivant : **[Effets](/v1/fr/effects)**.
