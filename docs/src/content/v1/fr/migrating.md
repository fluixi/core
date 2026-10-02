# Passer d'une alpha à l'autre

Pendant l'alpha, une API remplacée est retirée plutôt que gardée à côté de celle qui lui succède.
Cette page liste ce qui est parti et ce qu'il faut écrire à la place. Les changesets de chaque
version disent la même chose, paquet par paquet.

## Stockage

| Retiré | À utiliser |
| --- | --- |
| `storage` de `@fluixi/core` | `useStorage()` de `@fluixi/core/storage`, ou `@fluixi/storage` hors d'une application |
| `createMemoryStorage` de `@fluixi/core` | `memoryStorage()` de `@fluixi/storage` |

L'ancien `storage` était un objet à la forme de `localStorage`, et sur le serveur une Map partagée
par toutes les requêtes. `useStorage` choisit le support selon l'endroit où le code s'exécute et
garde les valeurs du serveur par requête. Voir [Stockage dans une application](/v1/fr/app-storage).

Les valeurs écrites par `@fluixi/session` et par `createTheme` avant ce changement ne sont pas lues :
les deux stockent désormais par `@fluixi/storage`, le thème dans un cookie. Un visiteur se
reconnecte une fois et choisit de nouveau son thème.

## Données en cache

| Retiré | À utiliser |
| --- | --- |
| `createCachedResource(...)`, qui renvoyait `[data, actions]` | `cachedResource(...)`, une seule poignée avec `refetch`, `invalidate` et `mutate` |
| `clearCachedResourceNamespace(name)` | `clearCachedResources(name)` |
| `clearAllCachedResources()` | `clearCachedResources()` |

```ts
// avant
const [orgs, { invalidate }] = createCachedResource(fetchOrgs, { name: 'orgs' });
// après
const orgs = cachedResource(fetchOrgs, { name: 'orgs' });
orgs.invalidate();
```

Les entrées vivent désormais par requête sur le serveur et par page dans le navigateur ; rien n'est
partagé entre visiteurs. Le `cache()` du routeur se comporte de même, et `revalidate` recharge
aussi les routes à l'écran. Voir [Mise en cache des données](/v1/fr/caching).

## Thèmes

`createTheme` garde par défaut le choix dans un cookie et envoie son script d'avant affichage avec
la page pendant un rendu : retirez un script de thème écrit à la main dans `index.html`. Passez
`script: false` pour garder le vôtre, et `storage` pour garder le choix ailleurs.

Dans fluixi-ui, `ColorSchemeProvider` est désormais celui du cœur : ses options sont
`ColorSchemeOptions` (`storageKey`, `attribute`, `storage`, `systemAs`, `themeColor`), et
`schemes`, `default` et `system` ont disparu. Pour un schéma avec plus de valeurs que clair et
sombre, utilisez `createTheme` avec `ThemeProvider`. Voir [Thèmes](/v1/fr/theming).

## Rouages du serveur

`streamDocument` de `@fluixi/start` renvoie une promesse de `Response` au lieu de la `Response` :
il attend la tête de la page avant de répondre, si bien que les en-têtes posés pendant le rendu de
la coquille atteignent encore la réponse. Seule une entrée serveur personnalisée qui l'appelait
directement a besoin d'un `await`.
