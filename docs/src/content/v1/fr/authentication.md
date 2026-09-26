# Authentification

Trois façons de connecter quelqu'un, et elles partagent presque tout. Se tromper de choix
coûte une seule fonction, pas l'application.

```
        comment des identifiants deviennent un token   <- seul ceci change
                        |
        @fluixi/session      token, utilisateur, statut, rafraîchissement, rôles, garde 401
                        |
        @fluixi/auth/client  useUser, protectedRoute, Can
                        |
                    votre interface
```

`@fluixi/session` possède la machine à états de la session. `@fluixi/auth/client` possède
les guards et les lectures. Ni l'un ni l'autre ne sait comment vous vous êtes
authentifié, et c'est pour cela que la couche du dessus reste identique quel que soit le
chemin choisi.

## Lequel est le vôtre

La question qui tranche : qui détient les comptes utilisateurs.

| Vous avez | Utilisez | Page |
| --- | --- | --- |
| Votre propre page de connexion et votre base | `@fluixi/session` | [Sessions](/v1/fr/session) |
| La page de connexion d'un fournisseur : Keycloak, Auth0, Okta, Curity | `@fluixi/oauth2` | [OAuth2 et OIDC](/v1/fr/oauth2) |
| Une application qui *est* le système d'identité | `better-auth` avec `@fluixi/auth` | [Better Auth](/v1/fr/better-auth) |

## Ce que chacun coûte

**`@fluixi/session`.** Vous écrivez la vérification du mot de passe, la table des
utilisateurs, les routes de connexion et leur rate limiting. En échange vous gardez
votre schéma et ne prenez aucune dépendance au-delà du framework.
`@fluixi/session/server` fournit le cookie de session, donc vous n'écrivez pas de
cryptographie.

**`@fluixi/oauth2`.** Pas de table utilisateurs, pas de mots de passe à manipuler : le
fournisseur s'en charge. Fonctionne avec n'importe quel fournisseur OAuth2 ou OIDC, et en
mode navigateur ne demande aucun serveur, donc un déploiement statique suffit. La
contrepartie est que la page de connexion ne vous appartient pas.

**`better-auth` avec `@fluixi/auth`.** Liaison de comptes, double facteur,
organisations, et mot de passe à côté du SSO, tout est fourni. Cela demande une base de
données et un serveur, car cette bibliothèque crée ses propres comptes et ses propres
sessions même quand la connexion est déléguée à un fournisseur.

Une précision sur ce dernier point, facile à mal lire : Better Auth sait déléguer la
connexion à Keycloak via son plugin OAuth générique, mais la session qu'il émet reste la
sienne, stockée dans sa base. Si le fournisseur doit être le seul système d'identité,
`@fluixi/oauth2` est la réponse plus légère.

## Ce qui ne change pas

Quel que soit le choix, la couche d'interface est identique :

```tsx
import { createAuthHooks } from '@fluixi/auth/client';
import { useNavigate } from '@fluixi/start/router';

export const { protectedRoute, Can, useUser } = createAuthHooks({
  session: auth,
  navigate: { handler: useNavigate },
  loginPath: '/login',
});
```

```tsx
// une page entière, derrière un rôle
export default protectedRoute(AdminPage, { role: 'admin' });

// un seul contrôle, derrière une permission
<Can perform={(p) => p.invoices.refund} fallback={null}>
  <button onClick={refund}>Rembourser</button>
</Can>

// qui est connecté
const user = useUser();
<span>{() => user()?.email ?? 'Déconnecté'}</span>
```

`createAuthHooks` accepte n'importe quel objet exposant un accesseur `user()`, donc les
trois chemins l'alimentent. `@fluixi/oauth2` va plus loin et renvoie les guards depuis le
service lui-même : une application qui l'utilise déclare son authentification dans un seul
fichier.

## Protect, protectedRoute et Can

Trois guards qui se ressemblent et qui ne font pas la même chose.

| | `Can` | `Protect` | `protectedRoute` |
| --- | --- | --- | --- |
| Demande | ce que vous pouvez faire | qui vous êtes | qui vous êtes |
| Portée | un contrôle | une section de page | la page entière |
| Si refusé | rend `fallback` | rend `fallback` | redirige |

La conséquence à retenir : avec `protectedRoute` le composant ne s'exécute jamais, donc une
page qui charge des données au montage ne les charge pas pour quelqu'un qui ne doit pas les
voir. `Protect` laisse le reste de la page intact et remplace une seule zone.

## Tout ce que renvoient les hooks

| Hook | Ce qu'il donne |
| --- | --- |
| `useUser()` | l'utilisateur connecté, ou `null`, en signal |
| `useSession()` | l'enregistrement de session à côté de l'utilisateur : son expiration, et ce que le backend a envoyé d'autre |
| `useAuth()` | `user`, `session`, `isAuthenticated`, `roles`, `can`, `signIn`, `signOut` en un objet |
| `useSignIn()` | démarre une connexion ; des credentials pour Better Auth, sinon ce que prend le `login` de la session |
| `useSignOut()` | termine la session |
| `usePermissions()` | l'ensemble des permissions des rôles courants |
| `useCan()` | `can(query)` : l'utilisateur courant peut-il faire ceci. `false` quand aucun rôle n'est configuré, donc une configuration manquante cache un contrôle au lieu de le montrer |
| `refresh()` | relit la session, pour un changement fait hors de cet onglet |
| `store` | le store sous-jacent, pour un test qui injecte un utilisateur |

`usePermissions` et `useCan` décident de ce qui s'affiche et de rien d'autre. Un client peut
revendiquer n'importe quelle permission : c'est le serveur qui décide de ce qui est permis, à
chaque requête.

```tsx
const can = useCan();

<button disabled={() => !can((p) => p.users.delete)}>Delete</button>
```

## Côté serveur

Une fonction serveur ou une route d'API interroge la requête, pas les hooks :

```ts
import { requireUser, requireRole, requirePermission, optionalUser } from '@fluixi/auth/server';

export async function deleteUser(id: string) {
  "use server";
  const admin = await requireRole('admin');
  // ...
}
```

| Helper | Renvoie | Refuse avec |
| --- | --- | --- |
| `optionalUser()` | l'utilisateur, ou `null` | jamais |
| `requireUser({ redirectTo? })` | l'utilisateur | 401, `redirectTo` valant `/login` par défaut |
| `requireRole(role, { redirectTo? })` | l'utilisateur | 401 si déconnecté, 403 si le rôle diffère |
| `requirePermission(check, { redirectTo? })` | rien | 401 si déconnecté, 403 quand `check` (un booléen ou une fonction) est faux |

Ils lèvent une `AuthError` qui porte le statut, et une fonction serveur ou une route d'API y
répond avec ce statut et `{ error, redirectTo }` en corps, pas avec un 500.

Ils lisent l'utilisateur dans les locals de la requête, il faut donc que quelque chose l'y ait
mis. Avec Better Auth, c'est `authMiddleware` ; avec OAuth2 en mode serveur, c'est
`sessionLocals`, que monte `authServerModule`. En mode navigateur d'OAuth2, le serveur n'a pas
de session à lire : vérifiez plutôt l'access token, avec
[Vérification des tokens](/v1/fr/token-verification).

## La limite qui n'est pas optionnelle

Tout ce qui précède décide de ce qu'il faut **afficher**. Rien de tout cela ne décide de ce
qui est **autorisé**.

Un client peut revendiquer n'importe quel rôle, puisque c'est du code sur la machine de
quelqu'un d'autre. Lisez `can(...)` comme « faut-il montrer ce bouton », jamais comme
« cette personne a-t-elle le droit ». Le serveur revérifie à chaque requête, et c'est cette
vérification qui protège réellement. Voir
[Vérification des tokens](/v1/fr/token-verification) pour l'autre côté.

Suite : **[Sessions](/v1/fr/session)**.
