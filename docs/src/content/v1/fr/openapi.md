# OpenAPI

Les [contrats de route](/v1/fr/api-contracts) disent déjà ce que chaque route accepte, renvoie et
exige : la description de l'API en est générée, et ne peut donc pas s'écarter de ce que fait le
serveur. Postman, Insomnia, Bruno et les générateurs de code l'importent.

```ts
// src/api/openapi.json.ts
import { apiRoutes } from '@fluixi/start/api-routes';
import { openApiRoute } from '@fluixi/api';

export const GET = openApiRoute(() => apiRoutes, {
  title: 'Acme API',
  version: '1.0.0',
  servers: [{ url: 'https://api.acme.com' }],
});
```

`GET /api/openapi.json` sert maintenant un document OpenAPI 3.1. `apiRoutes` est la table des
routes de l'application, avec leurs modèles de chemin (`[id].ts` devient `{id}`, un attrape-tout
devient son paramètre), lue à chaque requête puisque cette route en fait partie. La route qui
sert le document s'en exclut.

## Ce que dit chaque opération

| Depuis le contrat | Dans le document |
| --- | --- |
| `params`, `query`, `body`, `response` | paramètres, corps de requête et schéma de réponse |
| `status` | le code de la réponse en cas de succès |
| `guard` | `security`, le schéma sous son nom, et les réponses 401 et 403 qu'il peut donner |
| une route sans garde | `security: []`, pour qu'un outil n'envoie pas d'identifiants inutiles |
| des schémas d'entrée | une réponse 400, avec la forme d'erreur |
| `summary`, `description`, `tags`, `operationId`, `deprecated` | tels quels |

Sans eux, l'étiquette est le premier segment parlant du chemin (`/api/v1/projects/{id}` est dans
`projects`), le résumé est la méthode et le chemin, et l'identifiant d'opération est construit à
partir des deux (`getProjectsById`).

Un handler simple, qui n'est pas fait avec `route()`, apparaît quand même, marqué
`x-fluixi-contract: false`, pour que le manque se voie au lieu de passer en silence.

## Schémas

Le JSON Schema vient du validateur lui-même, par l'interface Standard JSON Schema, que Zod 4
implémente. Pour un validateur qui ne l'implémente pas, donnez une fois un convertisseur :

```ts
import { setJsonSchemaConverter } from '@fluixi/api';
import { toJsonSchema } from '@valibot/to-json-schema';

setJsonSchemaConverter((schema) => toJsonSchema(schema as never));
```

Un schéma que rien ne sait convertir est décrit comme n'importe quelle valeur et marqué
`x-fluixi-unconverted` avec le nom du validateur : le document se construit quand même et le
manque se voit.

## Routes gérées par une bibliothèque

Un moteur d'authentification ou un récepteur de webhooks sert souvent de nombreux chemins depuis
une seule route attrape-tout, et les décrit dans son propre document OpenAPI. `describedBy` met ce
document à la place de la route :

```ts
// src/api/auth/[...all].ts
import { describedBy } from '@fluixi/api';

export const GET = describedBy(
  () => auth.api.generateOpenAPISchema(),
  (request: Request) => auth.handler(request),
);
export const POST = GET;
```

Les chemins de la bibliothèque apparaissent sous celui de la route (`/api/auth/sign-in/email` et
les autres), avec ses étiquettes et ses composants. Quand un composant ou un schéma de sécurité
porte le même nom qu'un des vôtres avec une forme différente, celui de la bibliothèque est renommé
d'après le point de montage (`AuthUser`), tout comme un identifiant d'opération en conflit
(`authGetOrganization`) ; les références suivent. Le `nullable` d'OpenAPI 3.0 est écrit à la façon
de 3.1, et une opération sans résumé en reçoit un, puisque les outils nomment les requêtes d'après
lui.

`includeDocument(target, source, mount)` fait la même chose pour un document que vous construisez
vous-même.

## Importer dans Postman et les autres

Faites pointer l'outil sur `/api/openapi.json`. Chaque opération devient une requête, groupée par
étiquette, avec ses paramètres et un exemple de corps. Pour une API qui se connecte avec un cookie
de session, appelez une fois la route de connexion et laissez la réserve de cookies de l'outil le
porter : certains importeurs transforment un schéma de cookie en en-tête de requête, qu'il faut
alors retirer des requêtes.
