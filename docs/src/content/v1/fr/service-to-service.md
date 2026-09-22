# Service à service

Toutes les pages précédentes répondent à « qui utilise cette application ». Celle-ci répond
à « quel service appelle », qui est l'autre moitié de la plupart des systèmes : un job
nocturne qui lit une API, un service qui en appelle un autre, un handler de webhook qui
doit réécrire quelque part.

Il n'y a aucun utilisateur dans tout cela, donc rien à rediriger et aucune page de
connexion. Le service prouve qui il est avec ses propres credentials.

```ts
import { createServiceClient } from '@fluixi/oauth2/service';

const orders = createServiceClient({
  issuer: process.env.OIDC_ISSUER!,
  clientId: 'reports-job',
  clientSecret: process.env.REPORTS_SECRET!,
  scopes: ['orders:read'],
});

const response = await fetch('https://api.example.com/orders', {
  headers: { authorization: `Bearer ${await orders.token()}` },
});
```

C'est tout. `token()` renvoie un token valide, en en demandant un quand il le faut et en le
réutilisant sinon.

## Côté serveur uniquement

Le grant **est** le client secret. Tout ce qui le détient peut émettre des tokens au nom de
ce service : il appartient donc à une variable d'environnement sur un serveur, et jamais à
quoi que ce soit livré à un navigateur.

Si vous avez envie de cela dans du code front-end, ce que vous voulez vraiment est
[OAuth2](/v1/fr/oauth2) : un utilisateur se connecte, et son token porte ce qu'il a le
droit de faire.

## Le cache, et pourquoi il compte

`token()` garde le token jusqu'à ce qu'il approche de son expiration, puis en demande un
nouveau. `refreshSkewMs` définit cette marge, 30 secondes par défaut. Un token qui expire
en vol fait échouer une requête qui allait bien au départ, et c'est toute la raison d'être
de la marge.

Le second comportement est moins évident et compte davantage sous charge. Quand plusieurs
appels arrivent sur un cache froid, ils font **une** demande de token à eux tous plutôt
qu'une chacun :

```ts
// Une requête au fournisseur, trois appelants servis.
const [a, b, c] = await Promise.all([orders.token(), orders.token(), orders.token()]);
```

Sans cela, une rafale de travail au démarrage d'un job devient une rafale sur le token
endpoint, que les fournisseurs limitent.

Une requête en échec n'est pas mise en cache : un fournisseur brièvement indisponible est
réessayé plutôt que retenu comme cassé.

## La configuration chez le fournisseur

Le client doit être **confidentiel**, c'est-à-dire avoir un secret, et le grant client
credentials doit être activé. Dans Keycloak c'est un client avec `Client authentication`
activé et `Service accounts roles` coché. La plupart des fournisseurs nomment cela de façon
similaire.

Il vaut la peine de savoir comment se lit le token obtenu : un service est un principal à
part entière, pas un principal absent. Keycloak lui donne un service account, donc `sub`
est l'identifiant de ce compte et `preferred_username` vaut `service-account-<client>`. Ce
n'est pas une personne, mais ce n'est pas anonyme non plus.

## Différences entre fournisseurs

**Auth0** veut l'API nommée dans `audience`, et émet un token opaque plutôt qu'un JWT sans
cela :

```ts
createServiceClient({ issuer, clientId, clientSecret, audience: 'https://api.example.com' });
```

**Credentials dans le corps.** Ils partent dans un en-tête `Authorization: Basic` par
défaut, ce qui garde le secret hors du corps de la requête. Certains fournisseurs les
attendent dans le formulaire :

```ts
createServiceClient({ issuer, clientId, clientSecret, clientAuthMethod: 'body' });
```

**Pas de document de discovery.** Donnez le token endpoint directement avec
`tokenEndpoint`.

**Tout le reste** passe par `extraParams`, fusionné dans la requête de token.

## L'autre côté

Un service qui reçoit un de ces tokens le vérifie exactement comme celui d'un utilisateur.
Le token nomme le client appelant plutôt qu'une personne, donc le contrôle porte
généralement là-dessus :

```ts
const verify = createTokenVerifier({
  issuer,
  audience: 'orders-api',
  require: (claims) => String(claims.scope ?? '').includes('orders:read'),
});
```

Voir [Vérification des tokens](/v1/fr/token-verification). Les scopes sont la façon dont un
fournisseur dit ce qu'un service a le droit de faire, et les contrôler est la raison d'en
émettre d'étroits.

## Lire le token courant

`current()` renvoie ce que le fournisseur a envoyé, pour un appelant qui a besoin de plus
que la chaîne :

```ts
const { accessToken, expiresAt, scope } = await orders.current();
```

`reset()` jette le token en cache, donc l'appel suivant en demande un nouveau. Utile après
un 401 qui laisse penser que le token a été révoqué avant son expiration.

Suite : **[Vérification des tokens](/v1/fr/token-verification)**.
