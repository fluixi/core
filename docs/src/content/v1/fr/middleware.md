# Middleware

Le middleware s'exécute **avant** chaque rendu, aussi bien en `fluixi dev` qu'en
production. Définissez une chaîne dans `src/middleware.ts` :

```ts
import { defineMiddleware } from '@fluixi/start';

export default defineMiddleware([
  async (request, next) => {
    if (!isAuthed(request)) {
      return new Response(null, { status: 302, headers: { location: '/login' } });
    }
    return next(); // poursuit la chaîne (qui se termine par le rendu)
  },
]);
```

Chaque middleware reçoit une `Request` Web et un `next()`. `defineMiddleware` accepte une
fonction unique ou un tableau ; ils s'exécutent dans l'ordre, et le dernier `next()`
atteint le moteur de rendu.

## Les deux choses qu'un middleware peut faire

**Court-circuiter**, renvoyez une `Response` et plus rien ne s'exécute, ni la suite de la
chaîne ni le rendu. C'est la forme des redirections d'authentification, des pages de
maintenance et du rejet précoce d'une mauvaise requête :

```ts
async (request, next) => {
  if (blocked(request)) return new Response('Interdit', { status: 403 });
  return next();
};
```

**Envelopper** : appelez `next()` et ajustez ce qui revient. La réponse est une `Response`
standard : pour ajouter des en-têtes, reconstruisez-la.

```ts
async (request, next) => {
  const response = await next();
  const headers = new Headers(response.headers);
  headers.set('x-frame-options', 'DENY');
  return new Response(response.body, { status: response.status, headers });
};
```

Les en-têtes d'une `Response` sont immuables une fois construite : d'où la copie plutôt
qu'une affectation en place.

## Ordre et coût

Le middleware s'exécute pour **chaque** requête atteignant le serveur, y compris les
navigations qui rendent une page. Placez d'abord les vérifications discriminantes et peu
coûteuses, et mettez tout ce qui est cher, une requête en base, une vérification de jeton,
derrière un test de chemin, pour qu'une requête d'asset statique ne le paie pas.

Le middleware ne s'exécute pas pour les pages prérendues. Celles-ci ont été rendues au
moment du build et sont servies comme des fichiers : une vérification devant avoir lieu à
chaque requête ne peut donc pas vivre uniquement ici si la route est aussi prérendue.

## Intercepteurs

Le middleware est le côté serveur. Côté client, `addInterceptor` enveloppe `fetch`, y
compris le RPC des fonctions serveur, d'un pipeline requête/réponse/erreur :

```ts
import { addInterceptor } from '@fluixi/start';

const remove = addInterceptor({
  request: (request) =>
    new Request(request, { headers: { ...request.headers, authorization: token() } }),
  response: (response, request) => response,
  error: async (error, request) => {
    if (await refreshed(error)) return fetch(request);   // récupère : renvoyer une Response
    // ne rien renvoyer laisse l'erreur se propager
  },
});
```

Chaque hook reçoit la véritable `Request`/`Response`, pas un objet de configuration, et
chacun est optionnel. Un hook `error` qui renvoie une `Response` **récupère** l'appel, ce
qui réduit « rafraîchir puis réessayer » à quelques lignes ; ne rien renvoyer laisse l'échec
se propager.

`addInterceptor` renvoie une fonction de retrait, utile dans les tests et partout où un
intercepteur est installé sous condition. Le RPC des fonctions serveur passe automatiquement
par le pipeline dès qu'un intercepteur existe.

Ensuite : **[SEO et en-tête de document](/v1/fr/seo)**.
