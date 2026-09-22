# OAuth2 et OIDC

`@fluixi/oauth2` s'adresse à une application qui délègue l'identité à un fournisseur :
Keycloak, Auth0, Okta, Curity, Entra, ou votre propre serveur d'autorisation. Vous ne
construisez pas la page de connexion et vous ne détenez aucun compte utilisateur.

```ts
import { createAuthService } from '@fluixi/oauth2';
import { useNavigate } from '@fluixi/start/router';

export const auth = createAuthService<User>({
  config: {
    mode: 'browser',
    issuer: 'https://localhost:8443/realms/app',
    clientId: 'admin-spa',
    redirectUri: `${location.origin}/callback`,
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

## Le branchement

Trois morceaux : une page de connexion qui démarre le flux, une route de callback qui le
termine, et un guard.

```tsx
// routes/login.tsx
export default function Login() {
  return <button onClick={() => auth.signIn({ returnTo: '/dashboard' })}>Se connecter</button>;
}
```

```tsx
// routes/callback.tsx
export default function Callback() {
  const navigate = useNavigate();
  const error = signal<string | null>(null);

  // Navigateur uniquement. Le code d'autorisation est sur cette URL et le vérificateur
  // PKCE est dans le stockage de ce navigateur, donc l'échange ne peut avoir lieu ailleurs.
  if (typeof window !== 'undefined') {
    void auth.complete()
      .then((destination) => navigate(destination, { replace: true }))
      .catch((cause) => error.set(String(cause)));
  }

  return <p>{() => error() ?? 'Connexion en cours'}</p>;
}
```

`complete()` échange le code, charge l'utilisateur, et renvoie l'endroit où la personne
allait quand la connexion a commencé, c'est-à-dire ce que `signIn({ returnTo })` a
enregistré avant la redirection.

Les guards reviennent du service lui-même, donc pas de second fichier :

```tsx
export const { protectedRoute, Can, useUser } = auth;

export default protectedRoute(Dashboard);
```

## Choisir un mode

### `mode: 'browser'`

Un client public avec PKCE, qui détient ses propres tokens. Aucun serveur requis, donc un
déploiement statique en page unique suffit.

Le token d'accès reste en mémoire seule ; le token de rafraîchissement va dans
`sessionStorage` par défaut, ou dans `localStorage` avec `storage: 'local'` si une session
doit survivre à la fermeture d'un onglet. Dans les deux cas il est atteignable par
n'importe quel script de la page. C'est le prix de ne pas faire tourner de serveur, et
c'est la raison d'être de l'autre mode.

Il n'y a pas de secret client, car ce qui est livré à un navigateur n'est pas un secret.
PKCE est ce qui le remplace, et il n'est pas optionnel ici.

### `mode: 'server'`

Les tokens restent sur votre serveur et le navigateur reçoit un cookie httpOnly qu'il ne
peut pas lire : un script sur la page n'a donc rien à voler. Cela demande les routes :

```ts
// src/middleware.ts
import { defineMiddleware } from '@fluixi/start';
import { oauthRoutes, sessionLocals } from '@fluixi/oauth2/server';

const config = {
  issuer: process.env.OIDC_ISSUER!,
  clientId: process.env.OIDC_CLIENT_ID!,
  clientSecret: process.env.OIDC_CLIENT_SECRET!,
  redirectUri: 'http://localhost:3000/auth/callback',
  cookieSecret: process.env.SESSION_SECRET!,
};

export default defineMiddleware([oauthRoutes(config), sessionLocals(config)]);
```

`oauthRoutes` sert `/auth/login`, `/callback`, `/refresh`, `/me` et `/logout`.
`sessionLocals` place l'utilisateur connecté dans les locals de la requête, là où les
hooks d'authentification regardent pendant un rendu serveur : `useUser()` répond donc
pendant le SSR au lieu de se remplir après l'hydratation. Montez-le après `oauthRoutes`.

Il réutilise une réponse userinfo pendant `userCacheMs` (30 secondes par défaut) au lieu
d'interroger le fournisseur à chaque rendu. `0` interroge à chaque fois. La contrepartie
est la fraîcheur : une session terminée chez le fournisseur continue de s'afficher comme
connectée jusqu'à l'expiration de l'entrée.

Il n'existe pas d'équivalent de `sessionLocals` en mode navigateur, et ce n'est pas un
oubli. Dans ce mode le token ne quitte jamais le navigateur et n'est pas envoyé sur une
requête de document : le serveur n'a donc aucun identifiant à résoudre. Une application
construite ainsi rend le squelette déconnecté et le remplit côté client.

## D'où vient l'utilisateur

Par défaut, du endpoint userinfo OIDC du fournisseur. La plupart des applications
veulent le leur, car le fournisseur sait qui est la personne mais pas qu'elle est agent de
support ici.

```ts
createAuthService<User>({
  config: {
    mode: 'browser',
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
  mode: 'browser',
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

Le service est le plus souvent importé directement, ce qui marche partout, y compris hors
d'un composant. Les tokens existent pour les cas qui veulent une prise, par exemple un
test qui fournit un double :

```ts
import { AuthServiceToken, AuthClientToken } from '@fluixi/oauth2';
import { provideRoot } from '@fluixi/start/di';

export function provideAuth(): void {
  provideRoot([
    { provide: AuthServiceToken, useValue: auth },
    { provide: AuthClientToken, useValue: auth.client },
  ]);
}
```

Appelez-la depuis l'entrée client, et depuis l'entrée serveur aussi si une route injecte
pendant un rendu serveur. Voir [Injection de dépendances](/v1/fr/dependency-injection)
pour comprendre pourquoi le scope racine est la bonne ici.

## Ce que le paquet vérifie, et ce qu'il ne vérifie pas

**Vérifié.** Le `state` d'un callback doit correspondre à celui que ce client a envoyé,
c'est le contrôle CSRF. Le vérificateur PKCE est à usage unique, donc un callback rejoué
échoue. Un `sub` de userinfo qui ne correspond pas au token d'identité est rejeté, comme
OIDC l'exige. Un rafraîchissement refusé efface le token mort au lieu de le rejouer
indéfiniment.

**Non vérifié, délibérément.** Le client ne vérifie pas les signatures des tokens. Ils
arrivent par un appel TLS direct que ce client fait au endpoint de token, en
échangeant un code obtenu avec un vérificateur PKCE que lui seul détient, et OIDC autorise
un client en flux de code à s'appuyer là-dessus. L'identité vient d'un aller-retour
userinfo plutôt que du décodage d'un token, ce qui est de toute façon la source la plus
sûre.

La vérification de signature appartient à l'API qui reçoit le token. C'est
[Vérification des tokens](/v1/fr/token-verification), et elle n'est pas optionnelle.

Suite : **[Better Auth](/v1/fr/better-auth)**.
