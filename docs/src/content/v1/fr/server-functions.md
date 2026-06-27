# Les fonctions serveur

Marquez une fonction `"use server"` et son corps s'exécute **uniquement sur le serveur**. Le
compilateur le retire du bundle client et remplace l'appel par un RPC typé — secrets et accès à la
base de données n'atteignent jamais le navigateur.

```ts
async function getUser(id: string) {
  "use server";
  return db.users.find(id); // s'exécute sur le serveur
}

// appelez-la partout comme une fonction asynchrone normale :
const user = await getUser("42"); // envoie un POST vers /_server en coulisses
```

## Contexte de requête

Dans une fonction serveur, vous pouvez accéder à la requête courante — en-têtes, cookies, URL :

```ts
import { getRequestEvent } from '@fluixi/server';

async function whoAmI() {
  "use server";
  const event = getRequestEvent();
  return event?.request.headers.get('authorization');
}
```

## Actions de formulaire

`@fluixi/forms` transforme une fonction serveur en `<form action>` avec amélioration progressive :
elle fonctionne avant le chargement de JavaScript.

Suivant : **[Les routes d'API](/v1/fr/api-routes)**.
