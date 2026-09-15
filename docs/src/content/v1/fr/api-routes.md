# Routes d'API

Déposez un fichier dans `src/api/` et exportez des gestionnaires par méthode HTTP, ils
sont servis sous `/api/*`.

```ts
// src/api/hello.ts  →  /api/hello
export function GET() {
  return Response.json({ message: 'bonjour' });
}

export function POST(request: Request) {
  return Response.json({ method: 'POST' });
}
```

Exportez une fonction par méthode prise en charge : `GET`, `POST`, `PUT`, `PATCH`,
`DELETE`, `HEAD`, `OPTIONS`. Le dossier se configure via `apiDir` dans `fluixi.config` ;
`src/api` est la valeur par défaut.

## Valeurs de retour

Un gestionnaire renvoie une `Response` Web, ou n'importe quelle valeur, envoyée en JSON :

```ts
export function GET() {
  return { ok: true };          // → application/json
}

export function GET() {
  return Response.json({ ok: true }, { status: 201 });   // contrôle total
}

export function GET() {
  return new Response('texte', { headers: { 'content-type': 'text/plain' } });
}
```

Renvoyez vous-même une `Response` dès qu'il vous faut un statut autre que 200, des en-têtes
particuliers, une redirection ou un corps non-JSON. La forme « valeur simple » existe pour
que le cas courant reste court.

## Paramètres et attrape-tout

Le chemin du fichier est la route, avec les mêmes conventions que les pages :

```ts
// src/api/users/[id].ts  →  /api/users/:id
export function GET(_req: Request, { params }: { params: { id: string } }) {
  return Response.json({ id: params.id });
}

// src/api/files/[...path].ts  →  attrape-tout, /api/files/**
```

Les paramètres arrivent en **chaînes simples** sur le second argument, pas en accesseurs :
un gestionnaire d'API s'exécute une fois par requête, il n'y a rien de réactif là-dedans.

Tout le reste vient de la `Request` standard : la chaîne de requête via
`new URL(request.url).searchParams`, le corps via `await request.json()` ou
`await request.formData()`, les en-têtes via `request.headers`.

## Les codes de statut offerts

Une requête vers un chemin existant avec une méthode que vous n'avez pas exportée renvoie
**405**, avec un en-tête `Allow` listant les méthodes réellement exportées ; un chemin
`/api/*` inconnu renvoie **404**. Vous n'avez à écrire ni l'un ni l'autre.

## Route d'API ou fonction serveur ?

Les deux ne s'exécutent que sur le serveur : le choix porte donc sur l'appelant.

- Une **fonction serveur** s'adresse à votre propre code client. Elle est typée de bout en
  bout, et l'appel ressemble à un appel de fonction plutôt qu'à un fetch.
- Une **route d'API** s'adresse à des appelants que vous ne contrôlez pas, un webhook, une
  application mobile, un CLI : tout ce qui a besoin d'une URL stable, d'un code de statut
  précis ou d'un corps non-JSON.

Si vous écrivez `fetch('/api/...')` depuis votre propre application, une
[fonction serveur](/v1/fr/server-functions) est généralement le chemin le plus court.

Ensuite : **[Middleware](/v1/fr/middleware)**.
