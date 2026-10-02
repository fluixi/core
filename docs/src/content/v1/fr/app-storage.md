# Stockage dans une application

`@fluixi/core/storage` relie [`@fluixi/storage`](/v1/fr/storage) à l'application : il choisit
le support selon l'endroit où le code s'exécute, garde l'état du serveur par requête, et lit la
même valeur dans le rendu serveur et dans le navigateur.

```tsx
const prefs = $storage({ scope: 'cookie', namespace: 'ui' });
const theme = $persisted(prefs, 'theme', { fallback: 'light' });

<button onClick={() => theme.set((t) => (t === 'light' ? 'dark' : 'light'))}>
  {() => theme()}
</button>
```

Le serveur rend le thème choisi par le visiteur, depuis son cookie, et le navigateur part de la
même valeur : pas de flash, pas d'écart à l'hydratation. Dans du code de paquet, les mêmes
appels s'écrivent `useStorage` et `persisted`, importés de `@fluixi/core/storage`.

## Portées

`useStorage(options)` prend les options de `createStorage` (espace de noms, migrations,
sérialiseur) et un `scope` :

| Portée | Serveur | Navigateur |
| --- | --- | --- |
| `auto` (par défaut) | le stockage propre à la requête | localStorage |
| `cookie` | les cookies de la requête, renvoyés en `Set-Cookie` | `document.cookie` |
| `request` | des valeurs pour cette requête seulement | des valeurs pour cette page |
| `local`, `session` | lève une erreur : ce stockage n'existe pas | localStorage, sessionStorage |

Prenez `cookie` pour tout ce sur quoi le rendu serveur doit être d'accord : un thème, une
langue, un bandeau fermé. Prenez `local` pour ce qui ne concerne que le navigateur. `auto`
prend d'abord le stockage d'un `<StorageProvider>`, s'il y en a un.

Sur le serveur, l'état ne vit jamais dans un module. Chaque requête a ses propres adaptateurs :
deux visiteurs rendus en même temps ne voient jamais les valeurs l'un de l'autre. Appelé sur le
serveur hors de toute requête (au niveau d'un module, dans un script), `useStorage` lève une
erreur plutôt que de partager en silence un même stockage entre tous.

## Cookies

```ts
const prefs = useStorage({
  scope: 'cookie',
  namespace: 'ui',
  cookie: { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' },
});
```

`httpOnly` vaut false par défaut ici, puisque la moitié navigateur doit lire le cookie.
Mettez-le à true pour une valeur que seul le serveur lit. Les autres attributs gardent leurs
valeurs sûres : Secure, SameSite=Lax, Path=/.

Un cookie écrit pendant le rendu arrive dans la réponse, pages en streaming comprises, tant que
le premier morceau du corps n'est pas parti. Ensuite les en-têtes sont envoyés et l'écriture
lève une erreur qui le dit. Une valeur décidée tard a sa place dans un middleware, les données
d'une route ou une fonction serveur.

## persisted

`persisted(storage, key, options)` est un signal dont la valeur vit dans une clé de stockage.
Il part de la valeur stockée, écrit au `set`, et suit les changements faits par tout autre
stockage sur le même adaptateur, et par les autres onglets quand le support les signale.

```ts
const sidebar = persisted(useStorage({ namespace: 'ui' }), 'sidebar', { fallback: true });

sidebar();                // true tant que rien ne change
sidebar.set((open) => !open);
sidebar.remove();         // retour à la valeur par défaut
```

Options : `fallback` (la valeur tant que la clé est absente ; `null` sans elle), `ttl` pour
chaque écriture, `name` pour les devtools. Une écriture refusée par le stockage lève une
erreur et laisse le signal tel quel.

Sur un stockage asynchrone ou chiffré, `persisted` garde la valeur par défaut jusqu'à avoir lu
la valeur stockée (`await signal.ready`), met le signal à jour tout de suite au `set`, et
revient en arrière si l'écriture échoue. Cette lecture ne peut pas se terminer pendant le rendu
serveur : gardez ces valeurs hors de ce que le serveur rend.

Ne recopiez pas un signal dans un stockage avec un effet ; `persisted` est le seul endroit où
les deux vivent.

## Stockage asynchrone et chiffré

`useAsyncStorage` a les mêmes portées, chaque opération attendue, et accepte `encryption` :

```ts
const vault = useAsyncStorage<{ token: string }>({
  namespace: 'auth',
  encryption: { keyProvider },
});
await vault.set('token', token, { encrypt: true });
```

Voir [Chiffrement](/v1/fr/storage#chiffrement) pour ce qu'il protège et ce qu'il ne protège pas.

## Fournir un stockage

```tsx
<StorageProvider storage={createStorage({ adapter: memoryStorage() })}>
  <Settings />
</StorageProvider>
```

Chaque `useStorage()` en dessous, avec la portée `auto`, reçoit ce stockage : la mémoire d'un
test, un stockage propre à l'application. Un stockage asynchrone va de la même façon à
`useAsyncStorage()`.

## Transmettre des valeurs au navigateur

Une valeur propre à la requête, calculée sur le serveur, a disparu quand le navigateur prend
la main. `hydrateStorage` envoie les clés choisies avec la page :

```ts
const scratch = useStorage<{ draft: Draft }>({ scope: 'request', namespace: 'editor' });
hydrateStorage(scratch, ['draft']);
```

Appelez-le avec les mêmes clés des deux côtés. Sur le serveur, il place les valeurs, avec leur
expiration et leur version, dans les données de la page ; dans le navigateur, le premier appel
les écrit dans le stockage, et les suivants laissent la valeur du navigateur intacte. Les
données de la page sont lisibles par quiconque voit la page : n'y mettez jamais de secret. Une
valeur chiffrée lève une erreur ici plutôt que de voyager en clair.

## Le thème

Un thème est la valeur la plus courante sur laquelle les deux côtés doivent s'accorder.
`createColorScheme`, `createTheme` et leurs providers le gardent dans un cookie par ce stockage,
envoient l'attribut avec la page et appliquent un choix stocké avant l'affichage. Voir
[Thèmes](/v1/fr/theming).

## Intrinsèques

Dans une application construite par `@fluixi/start`, ceux-ci n'ont pas besoin d'import :

| Intrinsèque | Correspond à |
| --- | --- |
| `$storage(options)` | `useStorage` |
| `$asyncStorage(options)` | `useAsyncStorage` |
| `$persisted(storage, key, options)` | `persisted`, lu comme un signal |
