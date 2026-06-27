# Les stores

Les signaux conviennent aux valeurs uniques ; un **store** sert à l'**état structuré et imbriqué**.
`createStore` renvoie un proxy réactif et un setter, avec un suivi **fin** jusqu'à chaque propriété :

```ts
import { createStore } from '@fluixi/reactive/store';

const [cart, setCart] = createStore({
  items: [] as Item[],
  total: 0,
});

cart.total;            // lecture réactive d'une propriété
setCart('total', 42);  // met à jour une propriété — seuls les lecteurs de total se ré-exécutent
```

## Mises à jour par chemin

Le setter prend un **chemin** vers la propriété à modifier ; les lectures des branches non liées ne
sont pas perturbées :

```ts
setCart('items', items => [...items, newItem]);
setCart('items', 0, 'qty', q => q + 1); // chemin imbriqué
```

Un lecteur de `cart.total` n'est **pas** affecté par une écriture sur `cart.items` — c'est tout
l'intérêt d'un store par rapport à un simple signal contenant un objet.

## Lire dans les calculs

Lire une propriété d'un store dans un mémo ou un effet n'abonne qu'à cette propriété :

```ts
const itemCount = createMemo(() => cart.items.length); // ne suit que items
```

Suivant : **[Les données asynchrones](/v1/fr/async)**.
