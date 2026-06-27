# Les routes d'API

Déposez un fichier dans `src/api/` et exportez des gestionnaires par méthode HTTP — ils sont servis
sous `/api/*`.

```ts
// src/api/hello.ts  →  /api/hello
export function GET() {
  return Response.json({ message: 'bonjour' });
}

export function POST(request: Request) {
  return Response.json({ method: 'POST' });
}
```

Un gestionnaire renvoie une `Response` web (ou n'importe quelle valeur, envoyée en JSON).

## Paramètres & catch-all

Le chemin du fichier est la route, avec les mêmes conventions que les pages :

```ts
// src/api/users/[id].ts  →  /api/users/:id
export function GET(_req: Request, { params }: { params: { id: string } }) {
  return Response.json({ id: params.id });
}
// src/api/files/[...path].ts  →  catch-all
```

Une mauvaise méthode renvoie `405` ; un chemin `/api/*` inconnu renvoie `404`.

Suivant : **[Les middlewares](/v1/fr/middleware)**.
