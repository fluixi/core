# Mise en cache des données

Des données qui ne changent pas à chaque visite ne devraient pas être chargées à chaque visite.
Fluixi garde les résultats par nom, partage une seule requête entre les lecteurs, et rafraîchit
ce qu'un changement a rendu obsolète, y compris dans les autres onglets de votre site.

```ts
import { cache } from '@fluixi/start/router';

const organisations = cache(() => api.get('/api/v1/organizations'), 'orgs', { ttl: 30_000 });

export const routeData = () => organisations();
```

Revenir sur cette route dans les 30 secondes affiche la liste sans requête. Au-delà,
l'ancienne liste s'affiche tout de suite et une nouvelle est chargée derrière.

## Où vivent les entrées

Sur le serveur, chaque requête a son propre cache : deux visiteurs ne lisent jamais les entrées
l'un de l'autre, et rien ne survit à la requête. Dans le navigateur, les entrées vivent le temps
de la page. Les lecteurs d'une même clé partagent une seule requête en cours, des deux côtés.

## cache

`cache(fn, name, options)` renvoie une fonction qui prend les mêmes arguments que `fn`. La clé
est le nom plus les arguments : `user('a')` et `user('b')` sont deux entrées.

| Option | Par défaut | |
| --- | --- | --- |
| `ttl` | jusqu'à revalidation | millisecondes pendant lesquelles une valeur reste fraîche |
| `staleWhileRevalidate` | `true` | une fois périmée, renvoyer l'ancienne valeur tout de suite et rafraîchir derrière ; les routes à l'écran se rechargent à l'arrivée de la nouvelle |
| `cache` | la requête ou la page | où vivent les entrées (`ResourceCache`) |

Ne mettez pas `routeData` lui-même en cache : le routeur l'appelle avec des arguments qui
changent à chaque navigation. Mettez en cache une fonction nommée, appelez-la depuis
`routeData`, et passez-lui ce dont les données dépendent.

## Revalider

Après un changement, retirez ce qu'il a rendu obsolète :

```ts
import { action, revalidate } from '@fluixi/start/router';

const createOrg = action(createOrganization, 'org.create', { invalidates: ['orgs'] });

// ou à la main
revalidate('orgs');                 // toutes les entrées orgs:*
revalidate(['orgs', 'members']);
revalidate((key) => key.startsWith('user:'));
```

Les entrées correspondantes sont retirées et les routes à l'écran rechargent leurs données. Ce
qui reste en cache est servi depuis le cache : seul ce qui a été retiré est rechargé. La page
reste à l'écran avec ses données actuelles jusqu'à l'arrivée des nouvelles.

`invalidates` peut aussi être une fonction du résultat de l'action :
`{ invalidates: (org) => ['orgs', `org:${org.id}`] }`.

Une revalidation par nom atteint aussi les autres onglets ouverts de votre site, qui retirent
les mêmes entrées et rechargent leurs routes : créer une organisation dans un onglet met à jour
la liste dans un autre.

Dans le chargement des données d'une route, ou dans tout ce qui recharge déjà, retirez les
entrées sans recharger : `clearCachedResources('orgs')` depuis
`@fluixi/reactive/cached-resource`. À la connexion, videz tout avec `clearCachedResources()`,
pour que rien de ce qui a été chargé pour l'utilisateur précédent ne soit servi au suivant.

## Quand le serveur sait

Parfois seul le serveur sait ce qu'une requête a changé : accepter une invitation ajoute une
organisation à la liste sans que la page appelle la route des organisations. Déclarez-le sur la
route d'API :

```ts
import { route } from '@fluixi/api';
import { signedIn } from '@fluixi/auth/server';

export const POST = route({
  guard: signedIn(),
  body: acceptInvite,
  revalidates: ['orgs', 'members'],
  handler: ({ body, auth }) => invitations.accept(body.token, auth.user.id),
});
```

Une réponse réussie porte `x-fx-revalidate: orgs, members`, une réponse refusée ne porte rien.
`@fluixi/api/client` la lit après chaque appel et, dans le navigateur, revalide ces noms. Passez
`onRevalidate` à `createClient` pour les traiter vous-même, ou `false` pour ignorer l'en-tête.

## Les valeurs dont dépendent les données

Les données d'une route se chargent avant que le composant de la page existe : elles ne peuvent
pas dépendre de l'état d'un composant. Ce qu'une route charge devrait venir de l'URL
(paramètres, recherche), qui arrive à `routeData` et sert de clé au cache.

Pour des valeurs propres à toute l'application qui ne sont pas dans l'URL, comme l'utilisateur
connecté ou l'organisation active, exportez `routeDeps` à côté de `routeData` :

```ts
export const routeDeps = () => [session.userId(), workspace.id()];

export const routeData = ({ deps }) => projects(...deps);
```

Les valeurs arrivent à `routeData` sous `args.deps`, le cache garde donc une entrée par
combinaison. Quand elles changent, la route recharge ses données, en gardant la page à l'écran
entre-temps.

## Dans un composant

`cachedResource` est une ressource dont les résultats sont gardés de la même façon :

```ts
import { cachedResource } from '@fluixi/reactive/cached-resource';

const workspace = cachedResource(workspaceId, (id) => api.get(`/workspaces/${id}`), {
  name: 'workspace',
  ttl: 5 * 60_000,
  deps: [userId],
});

workspace();            // la valeur ; suspend sous <Suspense> au premier chargement
workspace.latest;       // la dernière valeur, sans suspendre
workspace.stale;        // true pendant un rafraîchissement en arrière-plan
workspace.refetch();
workspace.invalidate(); // retire l'entrée et recharge
```

`deps` sont des accesseurs dont les valeurs entrent dans la clé : chaque utilisateur a sa
propre entrée, et revenir à l'un d'eux la sert depuis le cache. Le fetcher reçoit toujours la
seule clé de la source.

Une valeur chargée pendant le rendu serveur voyage vers le navigateur avec la page, comme celle
d'une ressource ordinaire, et la première lecture là-bas la prend au lieu de recharger. Dans une
application start, `$cachedResource` n'a pas besoin d'import.

## Garder le cache d'un rechargement à l'autre

`storageCache(storage)` garde les entrées dans un [stockage](/v1/fr/storage) plutôt qu'en mémoire :

```ts
import { storageCache, useStorage } from '@fluixi/core/storage';

const cache = storageCache(useStorage({ scope: 'session', namespace: 'cache' }), { ttl: 10 * 60_000 });
const orgs = cachedResource(() => api.get('/orgs'), { name: 'orgs', ttl: 60_000, cache });
```

Les valeurs passent par le sérialiseur du stockage : elles doivent être des données simples.
Donnez-lui son propre espace de noms et un `ttl`, pour que les entrées ne s'accumulent pas après
la disparition du code qui les a écrites, et videz-le à la déconnexion, puisqu'il survit
désormais à la page.
