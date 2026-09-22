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

## La limite qui n'est pas optionnelle

Tout ce qui précède décide de ce qu'il faut **afficher**. Rien de tout cela ne décide de ce
qui est **autorisé**.

Un client peut revendiquer n'importe quel rôle, puisque c'est du code sur la machine de
quelqu'un d'autre. Lisez `can(...)` comme « faut-il montrer ce bouton », jamais comme
« cette personne a-t-elle le droit ». Le serveur revérifie à chaque requête, et c'est cette
vérification qui protège réellement. Voir
[Vérification des tokens](/v1/fr/token-verification) pour l'autre côté.

Suite : **[Sessions](/v1/fr/session)**.
