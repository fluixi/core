# Contrats d'API

`@fluixi/api` fait d'une [route d'API](/v1/fr/api-routes) un contrat : ce qu'elle accepte, ce
qu'elle renvoie, qui peut l'appeler. Le contrat valide la requête avant que votre code ne
s'exécute, met en forme la réponse à la sortie, décrit la route dans un
[document OpenAPI](/v1/fr/openapi), et type un client qui l'appelle.

```ts
// src/api/v1/projects/index.ts
import { route } from '@fluixi/api';
import { z } from 'zod';

export const POST = route({
  summary: 'Create a project',
  body: z.object({ name: z.string().min(1).max(80) }),
  response: Project,
  status: 201,
  handler: ({ body }) => createProject(body.name),
});
```

`handler` reçoit l'entrée validée, déjà typée par les schémas : `body.name` est ici une chaîne,
pas `unknown`.

## Entrée

| Champ | Valide | Arrive au handler sous |
| --- | --- | --- |
| `params` | les paramètres de chemin, d'après le nom du fichier (`[id].ts` donne `{ id }`) | `params` |
| `query` | la chaîne de requête, les clés répétées en tableaux | `query` |
| `body` | le corps JSON | `body` |

N'importe quel [Standard Schema](https://standardschema.dev) convient : Zod, Valibot, ArkType.
Tous les problèmes sont signalés d'un coup, pas seulement le premier, en 400 :

```json
{
  "error": {
    "code": "validation_failed",
    "message": "The request is not valid.",
    "details": [
      { "path": "body.name", "message": "String must contain at least 1 character(s)" },
      { "path": "query.limit", "message": "Expected number, received string" }
    ]
  }
}
```

Sans schéma `body`, le corps n'est pas lu, et le handler peut le lire lui-même. Avec un schéma,
le corps doit être du JSON (415 `unsupported_media_type`), doit se lire (400 `invalid_json`), et
doit rester sous `bodyLimit`, 1 Mio par défaut (413 `payload_too_large`), vérifié sur la
longueur annoncée et sur les octets réellement lus.

## Sortie

`response` s'applique à la sortie : les champs inconnus sont retirés et les transformations
s'exécutent. Un champ que vous gardez côté serveur, comme `createdBy` ou une empreinte de mot de
passe, n'atteint jamais l'appelant tant que le schéma de réponse ne le nomme pas.

```ts
export const GET = route({
  params: z.object({ id: z.string().uuid() }),
  response: Project,
  handler: ({ params }) => {
    const project = findProject(params.id);
    if (!project) throw notFound('No project with that id.');
    return project;
  },
});
```

`status` fixe le statut en cas de succès : 200 par défaut, 204 quand le handler ne renvoie rien
et que la route n'a pas de `response`. Un handler peut aussi renvoyer sa propre `Response`, qui
part telle quelle.

Si le handler renvoie quelque chose que son propre schéma `response` refuse, c'est une faute du
serveur : l'appelant reçoit un 500, jamais les mauvaises données. Désactivez la vérification avec
`validateResponse: false` seulement pour une raison que vous avez mesurée.

## Erreurs

Chaque échec a une seule forme, `{ error: { code, message, details? } }`, et le statut qui va
avec. Le code est pour les programmes, le message pour les personnes.

```ts
import { ApiError, badRequest, conflict, forbidden, notFound, unauthorized } from '@fluixi/api';

throw notFound('No project with that id.');                  // 404 not_found
throw conflict('That name is taken.');                        // 409 conflict
throw new ApiError(402, 'plan_limit', 'Upgrade to add more.'); // le vôtre
```

Tout autre chose levée par un handler devient un 500 `internal` avec un message générique : rien
des rouages du serveur n'atteint l'appelant. L'erreur elle-même part dans `console.error`, ou
dans votre journal ou votre outil de suivi avec `setErrorReporter((error, request) => ...)`.

## Gardes

Une garde décide qui peut appeler une route. Elle s'exécute avant la lecture de l'entrée : un
appelant qui n'a pas le droit n'apprend rien de ce que la route accepte, et ce qu'elle renvoie
arrive au handler sous `auth`, typé.

```ts
import { member, signedIn } from '@fluixi/auth/server';

export const GET = route({
  guard: signedIn(),
  handler: ({ auth }) => auth.user,
});

export const DELETE = route({
  guard: member({ roles: ['owner', 'admin'] }),
  params: z.object({ id: z.string() }),
  handler: ({ auth, params }) => projects.remove(auth.member.organizationId, params.id),
});
```

`signedIn()` refuse en 401 sans session. `member()` exige aussi une organisation active dont
l'appelant est membre, et vérifie `roles` (l'un d'eux) et `permissions` (toutes). Ses refus
disent pourquoi : 403 `no_active_organization`, 403 `not_a_member`, 403 `forbidden`.
`auth.member.organizationId` est le locataire : passez-le à chaque requête que fait la route.

Une garde est n'importe quel objet avec `check(request)`, qui renvoie ce que reçoit le handler ou
lève un refus :

```ts
const apiKey = {
  async check(request: Request) {
    const key = await keys.find(request.headers.get('x-api-key'));
    if (!key) throw unauthorized('Send a valid x-api-key.');
    return { key };
  },
  security: { name: 'apiKey', scheme: { type: 'apiKey', in: 'header', name: 'x-api-key' } },
  refuses: [401],
};
```

`security` et `refuses` servent au document OpenAPI : le schéma de sécurité que l'appelant
satisfait, sous un nom stable, et les refus que la route peut renvoyer. Un refus levé avec un
`code` le garde dans le corps de l'erreur, pour qu'un client distingue « choisissez une
organisation » de « non autorisé ».

## Dire au navigateur ce qui a changé

`revalidates` nomme les données en cache qu'un appel réussi rend obsolètes. La réponse le porte,
et le client rafraîchit les pages qui les affichent. Voir
[Mise en cache des données](/v1/fr/caching#quand-le-serveur-sait).

```ts
export const POST = route({ guard: signedIn(), body: invite, revalidates: ['members'], handler });
```

## Un client typé

`@fluixi/start` écrit `src/api.gen.ts` dans l'application API : chaque modèle de chemin associé à
son module de route. Un client typé avec lui connaît, par méthode, les paramètres, la requête et
le corps que prend chaque route et ce qu'elle renvoie. Rien du serveur n'est embarqué : la table
n'est que des types.

```ts
import { createClient } from '@fluixi/api/client';
import type { ApiRoutes } from '@acme/api/routes'; // le paquet de l'API exporte src/api.gen.ts

const api = createClient<ApiRoutes>();

const project = await api.get('/api/v1/projects/{id}', { params: { id } });
await api.post('/api/v1/projects', { body: { name: 'Atlas' } }); // vérifié contre le schéma du corps
```

Un échec lève `ApiClientError`, avec le `status`, le `code` et les `details` du corps d'erreur.
Options : `baseUrl` (vide par défaut, l'origine de la page), `headers` (une fonction s'exécute à
chaque appel, par exemple pour transmettre le cookie du visiteur pendant un rendu serveur),
`credentials`, `fetch` et `onRevalidate`.

## Protéger l'API

`apiSecurity` réunit les protections habituelles dans un seul middleware. Placez-le en premier,
pour que les refus de tout ce qui suit portent aussi les en-têtes.

```ts
// src/middleware.ts
import { defineMiddleware } from '@fluixi/start';
import { apiSecurity, postgresRateLimitStore } from '@fluixi/api';

export default defineMiddleware([
  apiSecurity({
    origins: ['https://app.example.com'],
    rateLimits: [
      {
        name: 'auth',
        match: ['/api/auth/sign-in/*', '/api/auth/sign-up/*'],
        methods: ['POST'],
        limit: 10,
        window: 60,
        store: postgresRateLimitStore(sql),
      },
    ],
  }),
]);
```

Il ajoute les en-têtes de sécurité, répond au CORS pour les origines listées, refuse une écriture
portant des cookies depuis une page d'un autre site (403 `cross_origin_refused`), et applique
chaque limite dans l'ordre (429 `rate_limited`). Sans option, tout appel d'une autre origine est
refusé et rien n'est limité : listez les origines de votre application web, et limitez les routes
qui devinent des mots de passe. Les compteurs vivent en mémoire par défaut ; un stockage partagé
(`postgresRateLimitStore`) garde toutes les instances sur le même compte.

Les morceaux sont aussi exportés séparément : `securityHeaders`, `cors`, `originCheck`,
`rateLimit`.
