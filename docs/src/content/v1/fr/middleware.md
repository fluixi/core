# Les middlewares

Un middleware s'exécute **avant** chaque rendu, en `fluixi dev` comme en production. Définissez une
chaîne dans `src/middleware.ts` :

```ts
import { defineMiddleware } from '@fluixi/start';

export default defineMiddleware([
  async (request, next) => {
    if (!isAuthed(request)) {
      return new Response(null, { status: 302, headers: { location: '/login' } });
    }
    return next(); // continue la chaîne (jusqu'au rendu)
  },
]);
```

Chaque middleware reçoit une `Request` web et un `next()`. Il peut **court-circuiter** en renvoyant
une `Response`, ou appeler `next()` et ajuster le résultat (ajouter des en-têtes, réécrire).

## Intercepteurs

Côté client, `addInterceptor` enveloppe `fetch` (et le RPC des fonctions serveur) d'un pipeline
requête/réponse/erreur — ajouter des en-têtes d'auth, rafraîchir sur 401, réessayer.

Suivant : **[La génération statique](/v1/fr/static-generation)**.
