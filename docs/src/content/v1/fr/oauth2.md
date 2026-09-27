# OAuth2 et OIDC

`@fluixi/oauth2` s'adresse à une application qui délègue l'identité à un fournisseur :
Keycloak, Auth0, Okta, Curity, Entra, ou votre propre serveur d'autorisation. Vous ne
construisez pas la page de connexion et vous ne détenez aucun compte utilisateur.

```ts
import { createAuthService } from '@fluixi/oauth2';
import { useNavigate } from '@fluixi/start/router';
import { env } from '@fluixi/start/env';

// Pas location.origin : app.config.ts charge aussi ce module sur le serveur, qui n'a pas de location.
const appUrl = env('APP_URL') ?? 'http://localhost:3000';

export const auth = createAuthService<User>({
  config: {
    tokens: 'browser',
    issuer: 'https://localhost:8443/realms/app',
    clientId: 'admin-spa',
    redirectUri: `${appUrl}/callback`,
  },
  navigate: { handler: useNavigate },
  loginPath: '/login',
});
```

Une seule URL d'émetteur constitue toute la configuration. La discovery lit les points
d'entrée d'autorisation, de token, de userinfo et de fin de session depuis
`/.well-known/openid-configuration`.

## Les deux moitiés

`AuthClient` est le protocole : démarrer une connexion, transformer un callback en tokens,
rafraîchir, terminer la session. Il ne détient aucun état applicatif.

`AuthService` est l'application : qui est connecté, si la session tient, quand rafraîchir,
quoi afficher. Il est bâti sur [`@fluixi/session`](/v1/fr/session), donc tout ce que dit
cette page s'applique ici aussi.

Le service dépend d'un client et jamais duquel, et c'est ce qui permet au même code
applicatif de tourner que les tokens vivent dans le navigateur ou sur un serveur.

## Configuration par l'environnement

Quel fournisseur, quel émetteur, quel client et où vivent les tokens sont des faits de
déploiement : leur place est dans l'environnement. `authFromEnv` les lit et renvoie un preset
pour le fournisseur, plus une configuration client prête à étaler :

```ts
// src/config/env.ts
import { publicEnv } from '@fluixi/start/env';
import { authFromEnv } from '@fluixi/oauth2/env';
import { rolesFrom } from '@fluixi/oauth2/roles';

export const auth = authFromEnv(publicEnv(), {
  clientPrefix: '',
  roles: rolesFrom.keycloakRealm,
});
```

Il renvoie `provider`, `providerName`, `clientId`, `tokens`, `redirectUri`, `scopes` et
`client`. Changer de fournisseur devient une modification de `.env`, pas du code.

| Variable | Signification |
| --- | --- |
| `AUTH_PROVIDER` | `oidc` (par défaut), `keycloak`, `auth0`, `okta`, `google`, `dex`, `oauth2` |
| `AUTH_ISSUER` | l'émetteur, pour `oidc` et `oauth2` |
| `AUTH_CLIENT_ID` | ce client |
| `AUTH_TOKENS` | `browser` (par défaut) ou `server` |
| `AUTH_REDIRECT_URI` | où le fournisseur renvoie le navigateur |
| `AUTH_SCOPES` | séparés par des espaces ou des virgules, remplacent ceux du preset |
| `AUTH_AUDIENCE` | l'identifiant d'une API. Auth0 en a besoin pour émettre un access token JWT |
| `AUTH_DPOP` | `true` ou `false`, prend le pas sur le preset |
| `AUTH_DOMAIN` | le tenant, pour `auth0` et `okta` |
| `AUTH_BASE_URL` | pour `keycloak` et `dex` |
| `AUTH_REALM` | pour `keycloak` |
| `AUTH_AUTH_SERVER` | pour `okta` : `default` sauf indication contraire, `org` pour le serveur de l'org |
| `AUTH_ROLES_CLAIM` | le claim à espace de noms qu'ajoute une action Auth0 |

Ces noms portent `clientPrefix`, `VITE_` par défaut. Avec `publicEnv()`, passez
`clientPrefix: ''` : l'application déclare dans `env.public` les variables que le navigateur
peut voir, les noms n'ont donc pas besoin d'un préfixe pour le dire (voir
[Variables d'environnement](/v1/fr/environment)). Un secret client n'en fait jamais partie ;
le serveur le lit avec `serverEnv`.

`prefix: 'GOOGLE'` lit `GOOGLE_*` avant `AUTH_*`, pour qu'une application puisse porter
plusieurs fournisseurs. `provider`, `tokens` et `roles` dans les options l'emportent sur ce que
dit l'environnement. Une variable manquante lève une erreur qui la nomme, et une valeur de
`TOKENS` autre que `browser` ou `server` lève une erreur qui nomme les deux.

### Presets des fournisseurs

Un preset contient ce dont chaque fournisseur s'est révélé avoir besoin lors d'un test réel :
comment il écrit son émetteur, où il range les rôles, ce qu'un vérificateur doit contrôler.
`authFromEnv` en choisit un d'après `AUTH_PROVIDER` ; `presets` de `@fluixi/oauth2/presets`
s'appelle aussi directement.

| Preset | `AUTH_PROVIDER` | Demande |
| --- | --- | --- |
| Tout fournisseur OIDC | `oidc` | `_ISSUER` |
| OAuth2 simple | `oauth2` | `_ISSUER`, plus `endpoints` dans le code |
| Keycloak | `keycloak` | `_BASE_URL`, `_REALM` |
| Auth0 | `auth0` | `_DOMAIN`; `_AUDIENCE` et `_ROLES_CLAIM` facultatifs |
| Okta | `okta` | `_DOMAIN`; `_AUTH_SERVER` facultatif |
| Google | `google` | rien ; un domaine hébergé facultatif |
| Dex | `dex` | `_BASE_URL` |

Chaque preset consigne aussi les contraintes qu'un essai réel a coûté à découvrir. Elles sont
citées telles que le paquet les porte :

**OAuth2 simple**

- Publishes no discovery document, so every endpoint is configured by hand.

**Keycloak**

- Puts no `aud` on an access token until a dedicated audience mapper is configured. Configure one and switch the verifier to `audience: clientId`.
- Revokes the whole session when an authorization code is replayed, so a replay test has to run last.

**Auth0**

- Issues an opaque access token unless `audience` names an API, so token verification needs it.
- A refresh token needs three things together: `offline_access` in the scopes, an audience whose API has Allow Offline Access on, and Refresh Token Rotation enabled on the application. Any one missing and the scope is ignored silently.
- Has no roles claim of its own. An action must add a namespaced one, and Auth0 drops a custom claim that is not a URI.
- The issuer carries a trailing slash. A verifier pinned without it rejects every token.

**Okta**

- Two authorization servers: /oauth2/<name> for an application, the bare domain for the management API. They are not interchangeable.
- Turns DPoP on by default for a new application, and an integrator org will not let you untick it.
- Binds the refresh token to the DPoP key as well as the access token, so a refresh must be proved with the key that obtained it.
- A public SPA cannot introspect at all. An API Services client with `private_key_jwt` has to ask instead.
- Client credentials against the org server must use `private_key_jwt`, whatever the application is set to.

**Google**

- Refuses a public client: the token endpoint reports `client_secret is missing` before checking PKCE, so browser mode cannot work.
- Publishes its issuer both with and without a scheme, so a verifier needs both spellings.
- Issues a refresh token only on the first consent unless `prompt=consent` and `access_type=offline` are sent.

**Dex**

- Sends no CORS headers on discovery or the token endpoint, so browser mode cannot work. Naming the endpoints explicitly only moves the failure to the token request.
- Has no admin interface. Users are static entries in its config file, and a password is a bcrypt hash.
- Publishes no revocation endpoint.
## Le branchement

`fluixi add auth oauth2` (ou `create-fluixi` avec `--auth=oauth2`) écrit les fichiers nécessaires,
enregistre le module et ajoute les variables `AUTH_*` à `env.public` ainsi qu'à `.env.example`.
Cette section montre exactement ce qui est généré, afin que vous puissiez le lire ou le reproduire
manuellement.

Trois fichiers : le service, la configuration d'application qui l'enregistre, et la route de
callback.

```ts
// src/services/auth.ts
import { createAuthService, authModule } from '@fluixi/oauth2';
import { env } from '@fluixi/start/env';
import { auth as authEnv } from '../config/env.js';

// Pas location.origin : app.config.ts charge aussi ce module sur le serveur, qui n'a pas de location.
const appUrl = env('APP_URL') ?? 'http://localhost:3000';

interface User {
  sub: string;
  email?: string;
  role?: string;
}

export const auth = createAuthService<User>({
  config: {
    ...authEnv.client,
    tokens: 'browser',
    redirectUri: `${appUrl}/callback`,
    postLogoutRedirectUri: `${appUrl}/login`,
  },
});

export const AuthModule = authModule(auth);
export const { protectedRoute, Protect, Can, useUser } = auth;
```

`tokens` est redonné après l'étalement pour que TypeScript sache de quelle moitié de la
configuration il s'agit.

```ts
// src/app.config.ts
import { defineApp } from '@fluixi/start/app';
import { AuthModule } from './services/auth.js';

export default defineApp({ imports: [AuthModule] });
```

`@fluixi/start` enregistre `src/app.config.ts` avant que l'une ou l'autre entrée ne tourne :
ni `entry-client` ni `entry-server` ne mentionne l'authentification. Voir
[Modules d'application](/v1/fr/app-modules).

```tsx
// src/routes/callback.tsx
import { OAuthCallback } from '@fluixi/oauth2/callback';
import { auth } from '../config/env.js';

export default OAuthCallback({
  enabled: () => auth.tokens === 'browser',
  pending: () => <p>Signing you in</p>,
  failed: (reason) => (
    <>
      <p>{reason}</p>
      <a href="/login">Try again</a>
    </>
  ),
});
```

`OAuthCallback` est toute la route de redirect URI. Il échange le code, vérifie le `state` et
envoie le visiteur vers la destination que `signIn({ returnTo })` a notée avant la redirection.
Il obtient le service par `AuthServiceToken`, que `authModule` a enregistré ; passez `service`
pour se passer de l'injection.

Donnez à `failed` un chemin vers la connexion : un visiteur bloqué sur cette page n'a rien
d'autre à faire. `enabled` renvoie false quand l'application tourne en `tokens: 'server'`, où le
fournisseur redirige vers le `/auth/callback` du serveur et où il n'y a rien à échanger ici.

Il repart avec `location.replace` par défaut, puisque la page n'existe que pour une transition.
Passez `onSignedIn(destination)` pour rester dans le routeur client. `useOAuthCallback` est le
hook en dessous, avec `stage`, `error`, `destination` et `params` en signaux, pour une page qui
veut montrer les étapes.

La page de connexion et les gardes :

```tsx
// src/routes/login.tsx
import { auth } from '../services/auth.js';

export default function Login() {
  return <button onClick={() => auth.signIn({ returnTo: '/dashboard' })}>Sign in</button>;
}
```

```tsx
export default protectedRoute(Dashboard);
```

## Où vivent les tokens

### `tokens: 'browser'`

Un client public avec PKCE, qui détient ses propres tokens. Aucun serveur requis, donc un
déploiement statique en page unique suffit.

Le token d'accès reste en mémoire seule ; le token de rafraîchissement va dans
`sessionStorage` par défaut, ou dans `localStorage` avec `storage: 'local'` si une session
doit survivre à la fermeture d'un onglet. Dans les deux cas il est atteignable par
n'importe quel script de la page. C'est le prix de ne pas faire tourner de serveur, et
c'est la raison d'être de l'autre mode.

Il n'y a pas de secret client, car ce qui est livré à un navigateur n'est pas un secret.
PKCE est ce qui le remplace, et il n'est pas optionnel ici.

### `tokens: 'server'`

Les tokens restent sur votre serveur et le navigateur reçoit un cookie httpOnly qu'il ne
peut pas lire : un script sur la page n'a donc rien à voler. La moitié serveur est un module :

```ts
// src/services/auth.server.ts
import { authServerModule } from '@fluixi/oauth2/server';
import { publicEnv, serverEnv } from '@fluixi/start/env';
import { auth } from '../config/env.js';

export function authServer() {
  const appUrl = publicEnv().APP_URL ?? 'http://localhost:3000';
  return authServerModule({
    ...auth.client,
    clientSecret: serverEnv('OIDC_CLIENT_SECRET', { required: true }),
    cookieSecret: serverEnv('SESSION_SECRET', { required: true }),
    redirectUri: `${appUrl}/auth/callback`,
    defaultReturnTo: '/dashboard',
    secureCookie: appUrl.startsWith('https://'),
  });
}
```

```ts
// src/app.config.server.ts
import { defineApp } from '@fluixi/start/app';
import { auth } from './config/env.js';
import { authServer } from './services/auth.server.js';

export default defineApp({
  imports: auth.tokens === 'server' ? [authServer()] : [],
});
```

Seul le build serveur importe `src/app.config.server.ts` : le secret client et la clé du cookie
n'atteignent jamais le bundle navigateur. `authServer` est une fonction parce que `serverEnv`
avec `required` lève une erreur quand une variable manque, et en mode navigateur elles
manquent.

`authServerModule` monte `oauthRoutes` puis `sessionLocals`. Les routes vivent sous
`basePath`, `/auth` par défaut : `/login`, `/callback`, `/refresh`, `/me`, `/revoke` et
`/logout`. Déclarez `<appUrl>/auth/callback` comme redirect URI chez le fournisseur. Le cookie
est chiffré avec une clé dérivée de `cookieSecret`, qui doit faire au moins 32 octets.

C'est aussi le mode d'un fournisseur qui refuse les clients publics : Google répond à une
requête de token sans secret par `client_secret is missing`.

`sessionLocals` place l'utilisateur connecté dans les locals de la requête, là où les
hooks d'authentification regardent pendant un rendu serveur : `useUser()` répond donc
pendant le SSR au lieu de se remplir après l'hydratation.

Il réutilise une réponse userinfo pendant `userCacheMs` (30 secondes par défaut) au lieu
d'interroger le fournisseur à chaque rendu. `0` interroge à chaque fois. La contrepartie
est la fraîcheur : une session terminée chez le fournisseur continue de s'afficher comme
connectée jusqu'à l'expiration de l'entrée.

Il n'existe pas d'équivalent de `sessionLocals` en mode navigateur, et ce n'est pas un
oubli. Dans ce mode le token ne quitte jamais le navigateur et n'est pas envoyé sur une
requête de document : le serveur n'a donc aucun identifiant à résoudre. Une application
construite ainsi rend le squelette déconnecté et le remplit côté client.

## DPoP

Un bearer token fonctionne pour quiconque en détient une copie. DPoP (RFC 9449) lie le token à
une clé que détient le client : le fournisseur inscrit l'empreinte de la clé dans le token sous
`cnf.jkt`, et chaque requête porte une preuve fraîche signée avec cette clé. Un token copié ne
sert à rien sans la clé.

Activez-le avec `dpop: true`, ou `AUTH_DPOP=true` via `authFromEnv`. Les preuves sont signées
avec `dpopAlgorithm`, `ES256` sauf indication contraire, et demandent le paquet `jose`, une
dépendance pair facultative. Certains fournisseurs ne laissent pas le choix : Okta active DPoP
pour toute nouvelle application, et une org d'intégrateur ne permet pas de le désactiver.

Un fournisseur qui veut un nonce choisi par le serveur refuse la requête avec `use_dpop_nonce`
et un en-tête `DPoP-Nonce`. Le client refait la requête une fois avec ce nonce dans la preuve,
dans les deux modes.

### Dans le navigateur

```ts
import { createAuthService } from '@fluixi/oauth2';
import { env } from '@fluixi/start/env';

// Pas location.origin : app.config.ts charge aussi ce module sur le serveur, qui n'a pas de location.
const appUrl = env('APP_URL') ?? 'http://localhost:3000';

export const auth = createAuthService({
  config: {
    tokens: 'browser',
    issuer: 'https://example.okta.com/oauth2/default',
    clientId: 'spa',
    redirectUri: `${appUrl}/callback`,
    dpop: true,
  },
});
```

La clé est créée par client, non extractible, et gardée dans IndexedDB. IndexedDB stocke
l'objet clé lui-même, si bien que la moitié privée n'est jamais des octets qu'un script
pourrait lire ou envoyer ailleurs. Elle persiste d'un rechargement à l'autre exprès : un refresh
token est lié à la clé qui l'a obtenu, et un rafraîchissement prouvé avec une autre clé est
refusé.

### Sur le serveur

Mettez `dpop: true` dans la configuration de `authServerModule`. Chaque session reçoit sa propre
clé à l'échange du code, gardée en JWK dans le cookie de session chiffré. Les rafraîchissements
sont signés avec cette même clé, et les appels userinfo derrière `/auth/me` et `sessionLocals`
utilisent le schéma `DPoP` avec une preuve portant le hash du token (`ath`).

### Côté API

La liaison ne protège rien si l'API ne vérifie pas la preuve. `createTokenVerifier({ dpop: true })`
le fait ; voir [Vérification des tokens](/v1/fr/token-verification).

## Se déconnecter, et ce que cela laisse derrière

`auth.logout()` efface la session ici et envoie la personne vers l'end session endpoint du
fournisseur, donc le cookie du fournisseur part aussi et la prochaine connexion est une
invite plutôt qu'une redirection silencieuse.

Il **révoque** aussi le refresh token d'abord, via l'endpoint de révocation du fournisseur
(RFC 7009). Cela compte plus qu'il n'y paraît : oublier un refresh token localement laisse
toute copie de celui-ci fonctionner pendant toute sa durée de vie, alors que ce navigateur
croit s'être déconnecté. Un access token expire seul en quelques minutes ; un refresh token
non.

Pour retirer un token sans terminer la session, appelez-le directement :

```ts
await auth.client.revoke();                      // le refresh token
await auth.client.revoke(token, 'access_token'); // un token précis
```

Un fournisseur qui ne publie pas d'endpoint de révocation ne peut pas faire cela, et
l'appel se résout sans rien avoir fait plutôt que de faire échouer une déconnexion pour
autant.

## D'où vient l'utilisateur

Par défaut, du endpoint userinfo OIDC du fournisseur. La plupart des applications
veulent le leur, car le fournisseur sait qui est la personne mais pas qu'elle est agent de
support ici.

```ts
createAuthService<User>({
  config: {
    tokens: 'browser',
    issuer,
    clientId,
    redirectUri,
    userInfo: {
      url: 'https://api.example.com/me',
      map: (raw) => ({ id: raw.data.uid, email: raw.data.email, role: raw.data.role }),
      headers: { 'x-tenant': 'acme' },
      credentials: 'include',   // pour une API qui répond depuis un cookie
    },
  },
});
```

`map` reçoit le corps analysé et le token d'accès, et peut être asynchrone. Utilisez-le
seul, sans `url`, pour remodeler les claims du fournisseur. Le token Bearer est
toujours envoyé à un endpoint personnalisé : c'est votre API, mais elle reste
authentifiée.

Pour ce que cela n'atteint pas, remplacez `fetchUser` entièrement :

```ts
createAuthService<User>({ config, fetchUser: async (accessToken) => { /* ... */ } });
```

## Les fournisseurs qui ne sont pas de l'OIDC standard

**Pas de document de discovery.** Donnez les endpoints directement :

```ts
config: {
  tokens: 'browser',
  clientId,
  redirectUri,
  endpoints: {
    authorization: 'https://example.com/oauth/authorize',
    token: 'https://example.com/oauth/token',
    userinfo: 'https://example.com/api/user',
  },
}
```

**Aucun endpoint userinfo,** comme chez les fournisseurs OAuth2 simples tels que
GitHub. Renseignez `userInfo.url` ou `fetchUser`.

**Identifiants dans un en-tête.** Certains token endpoints n'acceptent que HTTP
Basic :

```ts
config: { /* ... */ tokenAuthMethod: 'basic' }
```

**Paramètres propres au fournisseur,** comme l'`audience` d'Auth0 :

```ts
config: { /* ... */ extraParams: { audience: 'https://api.example.com' } }
```

**Plusieurs fournisseurs sur une page.** Chaque client isole ses valeurs stockées par
`clientId`, donc deux connexions en cours ne s'écrasent pas. Renseignez `storageKey` quand
deux clients partagent un fournisseur.

## Les rôles venant du fournisseur

```ts
createAuthService<User, Permissions>({
  config,
  access: {
    getRole: (user) => user?.role ?? user?.groups?.[0] ?? null,
    permissions: ROLE_PERMISSIONS,
  },
});
```

L'endroit où se trouvent les rôles dépend du fournisseur. Keycloak place les realm roles
dans `realm_access.roles` sur l'access token, pas dans userinfo : une application qui les
veut configure donc un mapper ou les lit côté serveur. Voir
[Vérification des tokens](/v1/fr/token-verification).

## Injection de dépendances

Le code applicatif importe en général le service, ce qui est plus simple et marche hors d'un
composant. Les tokens servent au code qui ne peut pas importer votre application :
`OAuthCallback` injecte `AuthServiceToken` quand on ne lui donne pas de `service`, et un test
peut fournir un double.

`authModule(auth)` dans `src/app.config.ts` enregistre `AuthServiceToken` et `AuthClientToken`.
Côté serveur la même instance sert toutes les requêtes. C'est sans risque parce qu'elle ne
garde rien sur le visiteur : l'utilisateur connecté vient des locals de la requête, que
`sessionLocals` remplit à chaque requête. Voir [Modules d'application](/v1/fr/app-modules) et
[Injection de dépendances](/v1/fr/dependency-injection).

## Ce que le paquet vérifie, et ce qu'il ne vérifie pas

**Vérifié.** Le `state` d'un callback doit correspondre à celui que ce client a envoyé,
c'est le contrôle CSRF. Le vérificateur PKCE est à usage unique, donc un callback rejoué
échoue. Un `sub` de userinfo qui ne correspond pas au token d'identité est rejeté, comme
OIDC l'exige. Un rafraîchissement refusé avec `invalid_grant` efface le refresh
token enregistré, puisque la RFC 6749 le dit terminé ; tout autre échec (une preuve fausse,
une demande de nonce, une connexion coupée) concerne la tentative et le conserve.

Un `returnTo` arrive par la query string : il est donc contrôlé par l'attaquant. Tout ce qui
n'est pas un chemin de cette origine est refusé, sauf si son origine figure dans
`allowedReturnOrigins`. Le mode serveur le vérifie au début du flux, et de nouveau au moment de
rediriger.

**Non vérifié, délibérément.** Le client ne vérifie pas les signatures des tokens. Ils
arrivent par un appel TLS direct que ce client fait au endpoint de token, en
échangeant un code obtenu avec un vérificateur PKCE que lui seul détient, et OIDC autorise
un client en flux de code à s'appuyer là-dessus. L'identité vient d'un aller-retour
userinfo plutôt que du décodage d'un token, ce qui est de toute façon la source la plus
sûre.

La vérification de signature appartient à l'API qui reçoit le token. C'est
[Vérification des tokens](/v1/fr/token-verification), et elle n'est pas optionnelle.

## Les pièces de plus bas niveau

Le service est construit à partir de celles-ci, exportées pour ce qu'il ne couvre pas.

| Export | Depuis | Ce que c'est |
| --- | --- | --- |
| `createBrowserClient` | `@fluixi/oauth2` | le client de protocole de `tokens: 'browser'` : PKCE, stockage, rafraîchissement, DPoP |
| `createServerClient` | `@fluixi/oauth2` | la moitié navigateur de `tokens: 'server'` ; appelle `/auth/*` et ne voit jamais de token |
| `discover`, `clearDiscoveryCache` | `@fluixi/oauth2` | lit et met en cache `/.well-known/openid-configuration` |
| `createPkcePair`, `createVerifier`, `createChallenge`, `createStateValue` | `@fluixi/oauth2` | PKCE (S256) et valeurs de `state` |
| `safeReturnTo` | `@fluixi/oauth2` | le contrôle appliqué à une destination après connexion |
| `expiryFromJwt` | `@fluixi/oauth2` | lit `exp` dans un JWT sans le vérifier |
| `createDpopKey`, `proofFor`, `thumbprintOf`, `boundKeyOf` | `@fluixi/oauth2` | clés et preuves DPoP, empreintes RFC 7638, le `cnf.jkt` d'un token |
| `presets` | `@fluixi/oauth2/presets` | les presets de fournisseurs ci-dessus |
| `rolesFrom` | `@fluixi/oauth2/roles` | où chaque fournisseur range les rôles ; sans risque dans un bundle navigateur |

Suite : **[Better Auth](/v1/fr/better-auth)**.
