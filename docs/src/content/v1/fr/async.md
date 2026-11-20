# Données asynchrones

Une **ressource** transforme quelque chose d'asynchrone (une requête, une lecture en base, tout ce
qui renvoie une promesse) en une valeur que la page peut lire, avec son état de chargement et
d'erreur :

```ts
import { signal, resource } from '@fluixi/reactive/signal';

const userId = signal(1);

const user = resource(userId, async (id) => {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
});

user();          // la valeur ; la lire pendant le chargement suspend le <Suspense> le plus proche
user.loading;    // vrai pendant une requête
user.error;      // l'échec, une fois survenu
user.latest;     // la dernière valeur arrivée, gardée pendant un rechargement : ne suspend jamais
user.state;      // 'unresolved' | 'pending' | 'ready' | 'refreshing' | 'errored'
user.refetch();  // relance avec la même source
user.mutate(v);  // fixe la valeur directement (une mise à jour optimiste)
```

`$resource` est la même chose sans import.

Le premier argument est une **source** réactive : quand elle change, la fonction de chargement se
relance avec la nouvelle valeur, et une requête plus récente l'emporte sur une plus ancienne encore
en cours. Omettez-la pour charger une seule fois.

Les données dont une page a besoin avant de s'afficher vont dans le `routeData` de la route
([Le routage](/v1/fr/routing)) ; une ressource sert aux données qu'un composant charge pour
lui-même.

## Un exemple réaliste

Une carte utilisateur qui charge son utilisateur, affiche un emplacement pendant le chargement et
un bouton pour réessayer en cas d'échec :

```tsx
function UserCard(props: { id: string }) {
  const user = $resource(() => props.id, (id) => fetch(`/api/users/${id}`).then((r) => r.json()));

  return (
    <ErrorBoundary fallback={(err, reset) => (
      <p>Impossible de charger l'utilisateur. <button onClick={() => { user.refetch(); reset(); }}>Réessayer</button></p>
    )}>
      <Suspense fallback={<div class="card skeleton" />}>
        <article class="card">
          <h3>{user()?.name}</h3>
          <p>{user()?.email}</p>
        </article>
      </Suspense>
    </ErrorBoundary>
  );
}
```

Changer `props.id` charge le nouvel utilisateur, et l'emplacement s'affiche à nouveau jusqu'à son
arrivée.

## Suspense : ce qui s'affiche pendant le chargement

`<Suspense fallback={...}>` affiche son contenu de remplacement tant qu'une ressource lue en dessous
charge, et son contenu une fois qu'elles sont toutes là. Placez-en un autour de chaque zone qui doit
apparaître d'un coup ; deux zones qui chargent séparément ont deux frontières.

Un rechargement fait revenir le contenu de remplacement. Pour garder le contenu actuel à l'écran :

- lisez `user.latest` là où la valeur précédente peut rester affichée : il ne suspend jamais ;
- ou faites le changement dans une transition (plus bas).

`SuspenseList` ordonne des frontières voisines : `revealOrder="forwards"` les affiche de haut en bas
même quand le réseau répond dans le désordre, et `tail="collapsed"` n'affiche que le contenu de
remplacement suivant. Utile pour les fils d'actualité et les tableaux de bord qui sauteraient
sinon.

## ErrorBoundary : ce qui s'affiche en cas d'échec

`<ErrorBoundary fallback={(error, reset) => ...}>` attrape ce qu'un composant, un effet ou une
ressource en dessous lance, et affiche le contenu de remplacement à la place ; `reset()` affiche à
nouveau les enfants. Placez-en un autour de chaque zone qui peut échouer seule, et un autour des
routes dans le layout racine. Sans aucun, l'erreur n'est pas attrapée : dans la console du
navigateur, une `500` pour un rendu serveur.

## Transitions

Un changement fait dans `startTransition` garde la page telle quelle pendant les chargements qu'il
provoque : une ressource qui recharge à cause de lui continue de renvoyer sa valeur actuelle au
lieu de suspendre. `useTransition` dit si un tel chargement est encore en cours :

```ts
import { useTransition } from '@fluixi/reactive/signal';

const [isPending, startTransition] = useTransition();
// L'onglet actuel reste affiché, atténué par isPending(), jusqu'au chargement du suivant.
const open = (next: string) => startTransition(() => tab.set(next));
```

`startTransition` renvoie une promesse qui se résout une fois tous les chargements qu'il a lancés
terminés. Une ressource qui charge pour la première fois n'a pas de valeur à garder : elle suspend
comme d'habitude.

## Où l'utiliser, et où non

| Il vous faut | Utilisez |
|---|---|
| des données dont la page a besoin avant de s'afficher | le `routeData` de la route, avec `cache()` |
| des données qu'un widget charge pour lui-même | une ressource, dans son propre `Suspense` |
| des données lues par plusieurs composants | `cachedResource` avec une clé, ou `cache()` ([Mise en cache](/v1/fr/caching)) |
| garder la page affichée pendant qu'un filtre la recharge | `startTransition`, ou `.latest` |
| une écriture vers le serveur | une fonction serveur ou une action, pas une ressource |

**Pas de `fetch` dans un effet ou dans `onMount`.** Vous perdez l'état de chargement et d'erreur,
le rendu serveur ne l'attend pas, et le navigateur recharge après l'hydratation.

**Pas créée sous condition.** Sur le serveur, la valeur de chaque ressource est envoyée avec la
page et retrouvée par position dans le navigateur. Une ressource créée d'un seul côté (derrière un
test de navigateur) décale toutes celles qui suivent. Créez les ressources sans condition, dans le
même ordre des deux côtés.

**Pas pour des secrets.** Tout ce qu'une ressource renvoie est sérialisé dans la page. Ne renvoyez
que ce que la page affiche.

## Sur le serveur

Sur le serveur, Fluixi **attend** toutes les ressources qu'un rendu a lancées avant d'écrire le
HTML, puis envoie les valeurs avec la page : le navigateur s'hydrate sans recharger, sans flash de
chargement ni cascade de requêtes. L'en-tête part en premier ; le corps suit d'un bloc une fois
toutes les ressources chargées, la plus lente décide donc du moment où la page apparaît. Le contenu
n'arrive pas au fil de l'eau à mesure que chaque ressource se résout.

```ts
// le même code s'exécute sur le serveur (attendu) et dans le navigateur (prérempli, sans rechargement) :
const posts = $resource(fetchPosts);
```

## Sous le capot

Une ressource, c'est quelques signaux (valeur, erreur, état, promesse en cours) et un effet qui
surveille la source et lance la requête. Lire la ressource pendant qu'elle charge lance sa
promesse, que le `Suspense` le plus proche attrape et compte jusqu'à sa résolution ; un échec lance
l'erreur vers l'`ErrorBoundary` le plus proche. Chaque ressource prend l'identifiant suivant dans
le rendu : c'est ainsi que le navigateur retrouve la valeur que le serveur lui a envoyée.

## La forme en tuple

`createResource` renvoie la même ressource sous forme de `[ressource, actions]` :

```ts
import { createResource } from '@fluixi/reactive/signal';

const [user, { refetch, mutate }] = createResource(userId, fetchUser);

user();        // la valeur
user.loading;
refetch();
```

`resource` est cette paire réunie en une seule poignée : l'accesseur que renvoie `createResource`,
avec `refetch` et `mutate` attachés ; la suspension, le suivi et le préremplissage serveur sont
identiques.

À explorer en direct dans le [Bac à sable](https://playground.fluixi.com).
