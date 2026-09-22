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

En faire un wrapper vaut généralement la peine :

```ts
export function guard(
  handler: (request: Request, claims: TokenClaims) => Response | Promise<Response>,
  options: { role?: string } = {},
) {
  return async (request: Request): Promise<Response> => {
    let claims: TokenClaims;
    try {
      claims = await verify.fromRequest(request);
    } catch (cause) {
      const code = cause instanceof TokenError ? cause.code : 'invalid_token';
      return new Response(JSON.stringify({ error: code }), {
        status: 401,
        headers: { 'www-authenticate': `Bearer error="${code}"` },
      });
    }

    // L'autorisation est une question distincte de l'authentification : le token est
    // authentique, et ceci décide s'il suffit pour cette route.
    const roles = (claims.realm_access as { roles?: string[] })?.roles ?? [];
    if (options.role && !roles.includes(options.role)) {
      return new Response(JSON.stringify({ error: 'insufficient_role' }), { status: 403 });
    }

    return handler(request, claims);
  };
}
```

```ts
export const GET = guard(async (request, claims) => Response.json({ id: claims.sub }));
export const DELETE = guard(handler, { role: 'superadmin' });
```

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
