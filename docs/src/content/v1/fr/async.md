# Les données asynchrones

Une **ressource** enveloppe une donnée asynchrone, un fetch, une requête, tout ce qui renvoie une
promesse, dans une valeur qui suit son état de chargement et d'erreur :

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

## Transitions

Un changement qui fait recharger une ressource la suspend d'ordinaire, et le `Suspense` le plus
proche affiche son repli jusqu'à l'arrivée de la nouvelle valeur. Fait dans `startTransition`, le
changement laisse la page telle qu'elle est : la ressource se lit comme sa valeur actuelle jusqu'à
ce que la nouvelle soit là. `useTransition` dit si un tel chargement est encore en cours.

```ts
import { useTransition } from '@fluixi/reactive/signal';

const [isPending, startTransition] = useTransition();
// L'onglet actuel reste affiché, atténué par isPending(), jusqu'au chargement du suivant.
const open = (tab: string) => startTransition(() => setTab(tab));
```

`startTransition` renvoie une promesse résolue une fois terminés tous les chargements qu'il a
lancés. Une ressource qui charge pour la première fois n'a pas de valeur à garder : elle suspend
comme d'habitude.

## Rendu côté serveur

Sur le serveur, Fluixi **attend** les ressources avant de sérialiser le HTML, puis injecte la valeur
résolue dans la page : le client s'hydrate sans recharger, aucun clignotement, aucune cascade.
L'en-tête part en premier ; le corps suit d'un seul tenant une fois toutes les ressources chargées,
donc la plus lente décide du moment où la page apparaît. Le contenu n'est pas envoyé au fil de
l'eau à mesure que chaque ressource se résout.

```ts
// le même code s'affiche sur le serveur (attendu) et le client (amorcé, sans recharger) :
const posts = $resource(fetchPosts);
```

C'est la fin du guide de réactivité pour la **v1**. Explorez-le en direct dans le
[Bac à sable](https://playground.fluixi.com).
