# Les stores

Un signal contient une valeur. Un **store** contient un état imbriqué, des objets et des tableaux,
et suit chaque clé séparément : lire `cart.total` s'abonne à `total` seulement, donc un changement
de `cart.items` ne le dérange pas.

```ts
import { store } from '@fluixi/reactive/store';

const cart = store({
  items: [] as Item[],
  total: 0,
});

cart.total;              // lecture réactive d'une propriété
cart.set('total', 42);   // met à jour une propriété : seuls les lecteurs de total se mettent à jour
```

On lit les propriétés d'un store directement : c'est un objet, et l'accès à la propriété **est**
la lecture réactive, là où un signal est une valeur qu'on appelle. `$store` est la même chose sans
import :

```ts
const cart = $store({ items: [], total: 0 });
```

## Un exemple réaliste

Un panier où la quantité de chaque ligne change séparément. Changer une quantité met à jour le
nombre de cette ligne et le total, rien d'autre :

```tsx
type Line = { id: string; name: string; price: number; qty: number };

function Cart() {
  const cart = $store({ lines: [] as Line[], coupon: '' });
  const total = $memo(() => cart.lines.reduce((sum, l) => sum + l.price * l.qty, 0));

  const add = (line: Line) => cart.set('lines', (lines) => [...lines, line]);
  const setQty = (i: number, qty: number) => cart.set('lines', i, 'qty', qty);
  const remove = (id: string) => cart.set('lines', (lines) => lines.filter((l) => l.id !== id));

  return (
    <section>
      <For each={cart.lines} by={(l) => l.id}>
        {(line, i) => (
          <div>
            {line().name}
            <input type="number" value={line().qty} onInput={(e) => setQty(i(), e.currentTarget.valueAsNumber)} />
            <button onClick={() => remove(line().id)}>Retirer</button>
          </div>
        )}
      </For>
      <p>Total : {total().toFixed(2)} €</p>
    </section>
  );
}
```

## Écrire

L'état est en lecture seule depuis l'extérieur : affecter `cart.total = 1` ne fait rien. Chaque
changement passe par `set`, ce qui permet au store de savoir exactement ce qui a changé.

```ts
cart.set('total', 42);                          // une clé
cart.set('total', (t) => t + 1);                // depuis la valeur précédente
cart.set('lines', 0, 'qty', (q) => q + 1);      // un chemin, une étape par argument
cart.set('lines.0.qty', 3);                     // le même chemin sous forme de chaîne
cart.set({ coupon: 'WELCOME' });                // fusionne des clés au premier niveau
cart.set('lines', (lines) => [...lines, item]); // remplace un tableau par un nouveau
```

Un lecteur de `cart.total` n'est **pas** dérangé par une écriture dans `cart.lines` : c'est tout
l'intérêt d'un store face à un signal qui contient un objet.

## Lire dans des calculs

Lire une propriété de store dans un memo, un effet ou du JSX s'abonne à cette seule propriété :

```ts
const itemCount = memo(() => cart.lines.length); // suit seulement la longueur de la liste
```

Les signaux sont créés à la demande, un par clé réellement lue : un grand store coûte ce que la
page regarde, pas sa taille.

## Où l'utiliser, et où non

Utilisez un store pour un état structuré qui change par morceaux : un formulaire à nombreux champs,
un panier, un tableau de cartes, l'état d'un éditeur, des réglages.

**Pas pour une seule valeur.** Un store autour de `{ value: 0 }` est un signal avec des étapes en
plus.

**Pas pour des `Map`, `Set`, `Date` ou instances de classe à l'intérieur.** Un store suit les objets
simples et les tableaux ; les autres valeurs sont gardées telles quelles, et un changement à
l'intérieur n'est pas vu. Gardez des données simples dans le store, ou remplacez la valeur entière
par `set`.

**Pas quand l'état a besoin d'une clé nommée `set`.** La poignée utilise `set` pour son setter ;
utilisez la forme en tuple ci-dessous.

**Pas partagé au niveau du module dans une application rendue côté serveur.** Comme pour les
signaux, une seule instance du module sert toutes les requêtes sur le serveur. Créez le store dans
un composant, ou fournissez-le par requête avec l'[injection de dépendances](/v1/fr/dependency-injection).

## Instantanés

`unwrap(cart)` renvoie l'objet simple derrière le store, pour `JSON.stringify` ou le corps d'une
requête. `untrackStore(cart)` fait de même sans abonner le calcul en cours.

## Un store modifiable

`createMutableStore` se passe du setter : affecter une propriété est une écriture suivie. Il
convient à un état propre à un composant, où un setter n'apporte rien ; en contrepartie, un
changement peut venir de n'importe quel code qui tient l'objet.

```ts
import { createMutableStore } from '@fluixi/reactive/store';

const form = createMutableStore({ name: '', email: '' });
form.name = 'Ada'; // les lecteurs de form.name se mettent à jour
```

## La forme en tuple

`createStore` renvoie le même store sous forme de paire `[état, setter]` :

```ts
import { createStore } from '@fluixi/reactive/store';

const [cart, setCart] = createStore({ items: [], total: 0 });

cart.total;
setCart('total', 42);
```

`store` est cette paire avec le setter attaché à l'état : les deux sont une seule primitive.
Utilisez `createStore` quand votre état a besoin d'une clé `set` : le setter attaché la masquerait.

## Sous le capot

Un store est un proxy sur un objet simple. Lire une clé à travers le proxy crée (à la première
lecture) un signal pour cette clé et y abonne le calcul en cours ; les objets imbriqués sont
enveloppés de la même façon à leur lecture. `set` résout le chemin, écrit dans l'objet brut et ne
prévient que les clés dont la valeur a changé. Les tableaux suivent leurs index et leur `length`.

Suivant : **[Données asynchrones](/v1/fr/async)**.
