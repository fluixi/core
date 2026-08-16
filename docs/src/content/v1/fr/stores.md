# Les stores

Les signaux conviennent aux valeurs uniques ; un **store** sert à l'**état structuré et imbriqué**.
C'est un objet réactif avec un suivi **fin** jusqu'à chaque propriété :

```ts
import { store } from '@fluixi/reactive/store';

const cart = store({
  items: [] as Item[],
  total: 0,
});

cart.total;            // lecture réactive d'une propriété
cart.set('total', 42);  // met à jour une propriété — seuls les lecteurs de total se ré-exécutent
```

## Mises à jour par chemin

Le setter prend un **chemin** vers la propriété à modifier ; les lectures des branches non liées ne
sont pas perturbées :

```ts
cart.set('items', items => [...items, newItem]);
cart.set('items', 0, 'qty', q => q + 1); // chemin imbriqué
```

Un lecteur de `cart.total` n'est **pas** affecté par une écriture sur `cart.items` — c'est tout
l'intérêt d'un store par rapport à un simple signal contenant un objet.

## Lire dans les calculs

Lire une propriété d'un store dans un mémo ou un effet n'abonne qu'à cette propriété :

```ts
const itemCount = memo(() => cart.items.length); // ne suit que items
```

Suivant : **[Les données asynchrones](/v1/fr/async)**.

## La forme en couple

`createStore` renvoie le même store sous forme de paire `[état, setter]` :

```ts
import { createStore } from '@fluixi/reactive/store';

const [cart, setCart] = createStore({ items: [], total: 0 });

cart.total;
setCart('total', 42);
```

`store`, c'est cette paire avec le setter posé sur l'état. Gardez `createStore` si votre propre
état a besoin d'une clé `set` : le setter la masquerait.
