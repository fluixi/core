# Vérification des tokens

Tout ce qui précède décide de ce qu'il faut afficher. Ceci décide de ce qui est autorisé,
et c'est la seule partie qui protège vraiment quelque chose.

Un client détient un token et l'envoie. Le service qui le reçoit ne doit pas s'y fier :
signature, émetteur, audience et expiration, à chaque requête.

```ts
import { createTokenVerifier } from '@fluixi/oauth2/verify';

const verify = createTokenVerifier({
  issuer: process.env.OIDC_ISSUER!,
  audience: 'admin-spa',
});

const claims = await verify.fromRequest(request);   // lève si quoi que ce soit ne tient pas
```

Rien ici n'est spécifique à Fluixi. La fonction prend une `Request` ou une chaîne et rend
les claims du token, donc un service Express, un worker, une route Hono ou un
gestionnaire Node nu peuvent l'importer sans rien adopter d'autre.

## Dans une route d'API

```ts
// src/api/orders.ts
import { createTokenVerifier, TokenError } from '@fluixi/oauth2/verify';

const verify = createTokenVerifier({ issuer, audience });

export async function GET(request: Request) {
  try {
    const claims = await verify.fromRequest(request);
    return Response.json(await listOrdersFor(claims.sub));
  } catch (cause) {
    const code = cause instanceof TokenError ? cause.code : 'invalid_token';
    return new Response(JSON.stringify({ error: code }), {
      status: 401,
      headers: { 'www-authenticate': `Bearer error="${code}"` },
    });
  }
}
```

L'en-tête `WWW-Authenticate` mérite d'être envoyé. C'est ainsi qu'un client distingue un
token expiré d'un endpoint cassé, et c'est ce que lit le client de `@fluixi/oauth2`
pour décider qu'il doit rafraîchir.

### Le garde d'API

Répéter cela dans chaque route, c'est ainsi que l'une d'elles finit sans l'en-tête.
`createApiGuard` enveloppe plutôt un handler, et il est livré avec le paquet : le format de
l'en-tête et le client qui le lit viennent du même endroit.

```ts
// src/services/verify.server.ts
import { createTokenVerifier, createApiGuard } from '@fluixi/oauth2/verify';
import { rolesFrom } from '@fluixi/oauth2/roles';
import { auth } from '../config/env.js';

// The preset knows what this provider's tokens look like: issuer spelling, audience policy.
export const verify = createTokenVerifier(auth.provider.verifier(auth.clientId));

export const guard = createApiGuard({ verify, roles: rolesFrom.keycloakRealm });
```

```ts
// src/api/orders.ts
import { guard } from '../services/verify.server.js';

export const GET = guard(async (_request, claims) => Response.json(await listOrdersFor(String(claims.sub))));
export const DELETE = guard(deleteOrder, { role: 'admin' });
export const POST = guard(deleteOrder, {
  scope: 'orders:write',
  require: (claims) => claims.tenant === 'acme' || 'wrong tenant',
});
```

Un token qui échoue reçoit un 401 avec `WWW-Authenticate: Bearer error="<code>"`. Un token
authentique qui ne suffit pas pour la route reçoit un 403. Gardez les deux séparés : un client
qui voit un 401 pour un rôle manquant rafraîchit un token parfaitement bon et redemande, sans
fin. Le 401 porte le code d'erreur et jamais le message, car un refus qui explique pourquoi un
token a échoué dit à un attaquant quelles tentatives s'approchent.

`auth.provider.verifier(auth.clientId)` construit les options du vérificateur à partir du
preset qu'`authFromEnv` a choisi (voir [OAuth2](/v1/fr/oauth2)), donc l'écriture de l'émetteur
et la politique d'audience correspondent au fournisseur.

Le second argument dit ce que la route exige au-delà d'un token valide :

| Exigence | Passe quand |
| --- | --- |
| `role` | le token porte l'un des rôles |
| `allRoles` | il les porte tous |
| `scope` | son claim `scope` contient l'un d'eux |
| `require(claims, request)` | la fonction renvoie `true` ; une chaîne refuse et dit pourquoi |

Les fournisseurs rangent les rôles à des endroits différents, il n'y a donc pas de valeur par
défaut. Une exigence `role` sur un garde construit sans `roles` lève une erreur, plutôt que de
répondre 403 à tout le monde et de ressembler à un problème de permissions. `rolesFrom` couvre
les formes en usage :

| `rolesFrom.` | Lit |
| --- | --- |
| `keycloakRealm` | `realm_access.roles` |
| `keycloakClient(clientId)` | `resource_access[clientId].roles` |
| `groups` | `groups`, tel qu'Okta l'envoie quand un claim de groupes est configuré |
| `cognito` | `cognito:groups` |
| `namespaced(claim)` | un claim personnalisé, tel qu'une action Auth0 l'ajoute |
| `scope` | le claim `scope`, pour un fournisseur qui n'émet pas de rôles |

`onRefused(refusal, request)` répond dans la forme d'erreur de l'application. Un 401 reçoit
quand même l'en-tête `WWW-Authenticate` sauf si la réponse en porte déjà un, car sans lui le
client ne distingue pas un token expiré d'un endpoint mort.

## Pourquoi les options ont cette forme

La cryptographie est celle de [`jose`](https://github.com/panva/jose), délibérément. Un
vérificateur écrit à la main est la façon dont `alg: none` et la confusion RS256 vers
HS256 finissent livrés, et les deux transforment un contrôle en faille. Ce qui est
ajouté ici est la configuration autour, là où vivent les erreurs courantes.

**`issuer` est obligatoire** et n'est jamais pris dans le token. Un token qui nomme son
propre émetteur ne prouve rien.

**`audience` est obligatoire,** ou bien un `audience: false` explicite. L'oublier est
facile et accepte en silence un token émis pour n'importe quel autre client du même
fournisseur.

**`algorithms` vaut `['RS256']` par défaut** et n'est jamais lu dans l'en-tête du token.
C'est ce qui empêche un token de basculer en `HS256` en étant signé avec la clé publique
comme secret HMAC. `none` est refusé à la construction du vérificateur.

**Le JWKS vient de la discovery,** donc un service ne code pas l'URL en dur, et `jose`
gère le cache, la rotation des clés et le délai entre deux récupérations. Donnez `jwksUri`
pour sauter la discovery, ou `jwks` pour fournir les clés directement, ce qui les fige et
empêche la rotation de fonctionner.

`jose` est une peer dependency optionnelle. Une application qui ne vérifie jamais ne
l'installe jamais.

## Les fournisseurs qui omettent `aud`

Keycloak émet des access tokens sans `aud` tant qu'un audience mapper n'est pas
configuré, et nomme le client dans `azp` à la place. Un service devant l'un d'eux veut :

```ts
createTokenVerifier({
  issuer,
  audience: false,
  authorizedParty: 'admin-spa',
});
```

Pas `audience: false` seul, qui accepte un token émis pour n'importe quel client de
l'émetteur. Cela supprime le contrôle au lieu de le déplacer, et le vérificateur avertit
quand ni l'un ni l'autre n'est renseigné.

Configurer un audience mapper chez le fournisseur et utiliser `audience` reste le
meilleur état final. `authorizedParty` est pour quand vous ne contrôlez pas cela.

### Un fournisseur qui se nomme de plusieurs façons

Google publie son issuer à la fois comme `accounts.google.com` et
`https://accounts.google.com`, et un token peut porter l'un ou l'autre. Un service figé sur
une seule forme rejette l'autre, ce qui ressemble à un échec de signature sans en être un.

`issuer` accepte une liste pour cela. La discovery utilise la première ; n'importe laquelle
est acceptée sur un token.

```ts
createTokenVerifier({
  issuer: ['https://accounts.google.com', 'accounts.google.com'],
  audience: clientId,
});
```

## Contrôles supplémentaires

`require` s'exécute une fois le token validé, pour ce qui est propre au service. Renvoyez
`true`, ou une chaîne à utiliser comme message.

```ts
const verify = createTokenVerifier({
  issuer,
  audience,
  require: (claims) =>
    String(claims.scope ?? '').includes('billing') || 'Ce point d\'entrée demande le scope billing.',
});
```

## Tokens liés par DPoP

Un token lié par DPoP porte `cnf.jkt`, l'empreinte de la clé du client, et chaque requête porte
dans l'en-tête `DPoP` une preuve signée avec cette clé. Sans `dpop: true`, le vérificateur
accepte un token lié comme s'il s'agissait d'un bearer token, et la liaison ne protège rien.

```ts
import { createTokenVerifier } from '@fluixi/oauth2/verify';

export const verify = createTokenVerifier({
  issuer: 'https://example.okta.com/oauth2/default',
  audience: 'api://orders',
  dpop: true,
});

export async function claimsOf(request: Request) {
  // `fromRequest`, not `verify(token)`: the proof is a header on the request.
  return verify.fromRequest(request);
}
```

Avec lui, un token sans `cnf.jkt` est refusé, tout comme un token lié dont la preuve ne
correspond pas : la clé de la preuve doit avoir l'empreinte du token, `htm` et `htu` doivent
correspondre à la méthode et à l'URL de cette requête, `ath` doit être le hash de ce token, et
`iat` doit tenir dans `dpopProofAgeSec` (10 secondes sauf indication contraire). Une preuve
absente donne `missing_dpop_proof` et toute différence `invalid_dpop_proof` ; `createApiGuard`
renvoie l'un ou l'autre comme code du 401. Le côté client, dans les deux modes de tokens, est
sur la page [OAuth2](/v1/fr/oauth2).

## Tokens opaques et introspection

Tous les fournisseurs n'émettent pas des JWT. Un token opaque ne porte rien et ne signifie
rien hors du fournisseur, et c'est précisément l'intérêt : il ne fuite rien s'il est
intercepté, et le fournisseur reste la seule chose capable de dire ce qu'il représente.

Il n'y a aucun moyen d'en vérifier un localement. Le service demande, via la RFC 7662 :

```ts
import { createTokenIntrospector } from '@fluixi/oauth2/verify';

const verify = createTokenIntrospector({
  issuer: process.env.OIDC_ISSUER!,
  clientId: 'orders-api',
  clientSecret: process.env.ORDERS_API_SECRET!,
  audience: 'orders-api',
});

const claims = await verify.fromRequest(request);   // même forme que le vérificateur JWT
```

Il renvoie le même `TokenVerifier`, donc le `guard` plus haut fonctionne tel quel. Passer
de l'un à l'autre est un changement d'une ligne.

### Ce que cela coûte et ce que cela apporte

L'introspection est un appel réseau au fournisseur sur le chemin de chaque requête, là où
la vérification JWT est un calcul local contre une clé en cache.

Ce que vous obtenez en échange, une signature ne peut pas le donner. Une signature dit
qu'un token était authentique au moment de son émission ; l'introspection dit qu'il est bon
**maintenant**. Un token révoqué il y a cinq minutes se vérifie toujours localement et est
refusé ici immédiatement.

`cacheMs` réutilise une réponse `active` pendant une fenêtre, et vaut `0` par défaut,
c'est-à-dire demander à chaque fois. Toute valeur supérieure échange exactement la
propriété pour laquelle vous êtes venu, donc gardez-la petite et délibérée. Un refus n'est
jamais mis en cache, car cela maintiendrait dehors un token réactivé.

### Les credentials du service sont obligatoires

L'endpoint d'introspection est authentifié, et ce n'est pas accessoire : un endpoint ouvert
laisserait n'importe qui tester si un token volé est encore vivant. Un service a besoin de
ses propres `clientId` et `clientSecret` chez le fournisseur, donc c'est un outil côté
serveur. Ne les livrez jamais à un navigateur.

Les credentials partent dans un en-tête `Authorization: Basic` par défaut.
`clientAuthMethod: 'body'` les place dans le formulaire pour un fournisseur qui les attend
là.

### Les credentials depuis l'environnement

La façon dont un client s'authentifie auprès de l'introspection est le choix du fournisseur,
fait dans sa console : un secret partagé, ou `private_key_jwt`, une signature par une clé dont
le fournisseur détient la moitié publique. Les deux s'excluent, et un code qui suppose un
secret n'a rien à lire pour un client Okta réglé en clé publique/privée. `credentialsFromEnv`
lit celle qui est configurée :

```ts
// src/api/introspect.ts
import { createTokenIntrospector, credentialsFromEnv, explainCredentials } from '@fluixi/oauth2/verify';

export async function POST(request: Request) {
  const credentials = await credentialsFromEnv({ prefix: 'okta' });
  if (!credentials) {
    return Response.json({ error: explainCredentials({ prefix: 'okta' }) }, { status: 501 });
  }
  const introspect = createTokenIntrospector({
    issuer: 'https://example.okta.com/oauth2/default',
    ...credentials,
    audience: false,
  });
  return Response.json(await introspect.fromRequest(request));
}
```

| Variable | Signification |
| --- | --- |
| `OKTA_CLIENT_ID` | le client qui demande ; sinon `clientId` dans les options |
| `OKTA_CLIENT_SECRET` ou `OKTA_SECRET` | un secret partagé |
| `OKTA_PRIVATE_KEY` | chemin du JWK privé ; `~` est développé |
| `OKTA_KEY_ID` | le `kid` sous lequel le fournisseur connaît la clé |
| `OKTA_ASSERTION_ALG` | l'algorithme de l'assertion, quand ce n'est pas celui par défaut |

Le préfixe est le vôtre ; `okta` ci-dessus. `<PREFIX>_INTROSPECT_*` est essayé d'abord, pour un
fournisseur qui veut qu'un autre client pose la question que celui avec lequel on se connecte :
une SPA publique chez Okta ne peut pas introspecter, un client API Services le fait donc. Une
clé l'emporte sur un secret. Un fichier de clé nommé mais illisible lève une erreur, car c'est
une configuration cassée et non une configuration absente, et `null` veut dire que rien n'est
configuré. `explainCredentials` nomme les deux façons de le régler, ce que le 501 ci-dessus dit
à un opérateur. Serveur uniquement : le fichier de clé est lu avec Node.

### Le `active: false` qui veut dire autre chose

Un fournisseur répond `{ "active": false }` et rien de plus : un token réellement mort et
une erreur de configuration se ressemblent donc exactement.

La cause habituelle du second cas est que le client qui demande n'est pas dans l'audience
du token. Keycloak refuse d'introspecter un token émis pour quelqu'un d'autre et ne dit
que `active: false`. La correction est un audience mapper sur le client pour que ses tokens
portent `aud: <client>`, après quoi l'introspection répond normalement.

### Lequel utiliser

| | `createTokenVerifier` | `createTokenIntrospector` |
| --- | --- | --- |
| Token | un JWT | opaque, ou un JWT |
| Coût | local, une récupération de clé en cache | une requête au fournisseur, par appel |
| Révocation | invisible jusqu'à expiration | immédiate |
| Credentials du service requis | non | oui |

Utilisez le vérificateur quand les tokens sont des JWT à durée de vie courte. Utilisez
l'introspecteur quand ils sont opaques, ou quand une session révoquée doit cesser de
fonctionner tout de suite et que vous acceptez de payer un aller-retour pour cela.

## Authentique et informatif sont deux choses

Un token peut se vérifier parfaitement et ne presque rien vous apprendre. Les tokens
d'accès légers de Keycloak ne portent pas de `sub` et peu de claims, et n'importe
quel fournisseur peut être configuré pour en émettre de maigres.

La vérification répond donc à « est-ce authentique et pour moi ». Elle ne répond pas à
« qui est-ce », et un service qui a besoin de la seconde réponse doit appeler userinfo ou
son propre stockage plutôt que de supposer les claims présents.

La révocation est l'autre limite. Un token à la signature valide pour un compte désactivé
il y a cinq minutes se vérifie toujours. Ce sont des durées de vie courtes et un contrôle
contre votre propre stockage qui ferment cela, pas la signature.

## Ce qui appartient à quoi

| Question | Où |
| --- | --- |
| Faut-il montrer ce bouton | le client, avec `can()` et `Can` |
| Ce token est-il authentique et pour moi | cette page, à l'API |
| Cette personne a-t-elle le droit | votre API, après vérification |

La première est une aide au rendu et un client peut la falsifier. Les deux autres sont la
vraie limite.

Suite : **[Routage](/v1/fr/routing)**.
