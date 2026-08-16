# Les données asynchrones

Une **ressource** enveloppe une donnée asynchrone — un fetch, une requête, tout ce qui renvoie une
promesse — dans une valeur qui suit son état de chargement et d'erreur :

```ts
import { signal, resource } from '@fluixi/reactive/signal';

const userId = signal(1);

const user = resource(userId, async (id) => {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
});
```

Le premier argument est une **source** réactive ; à chaque changement, le fetcher se ré-exécute avec
la nouvelle valeur. Omettez-le pour ne charger qu'une fois.

## Chargement et erreur

L'accesseur de la ressource porte son état, pour que votre interface y réagisse :

```ts
user.loading; // vrai pendant le chargement
user.error;   // l'erreur levée, le cas échéant
user();       // la valeur résolue (suspend tant qu'en attente)
```

## Rendu côté serveur

Sur le serveur, Fluixi **attend** les ressources avant de sérialiser le HTML, puis injecte la valeur
résolue dans la page : le client s'hydrate sans recharger — aucun clignotement, aucune cascade.

```ts
// le même code s'affiche sur le serveur (attendu) et le client (streamé) :
const posts = $resource(fetchPosts);
```

C'est la fin du guide de réactivité pour la **v1**. Explorez-le en direct dans le
[Bac à sable](https://playground.fluixi.com).
