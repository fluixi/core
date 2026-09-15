# Fonctions serveur

Marquez une fonction `"use server"` et son corps ne s'exécute **que sur le serveur**. Le
compilateur le retire du bundle client et remplace l'appel par un RPC typé : secrets et
accès à la base de données n'atteignent jamais le navigateur.

```ts
async function getUser(id: string) {
  "use server";
  return db.users.find(id); // s'exécute sur le serveur
}

// Appelez-la comme une fonction asynchrone ordinaire :
const user = await getUser("42"); // POST vers /_server en coulisses
```

Le site d'appel ne change pas de forme : c'est un `await` ordinaire renvoyant des données
ordinaires. Ce qui change, c'est l'endroit où le corps s'exécute.

## Ce que fait le compilateur

La directive est toute l'API. À la compilation, le corps est retiré du bundle client et
remplacé par un talon qui poste ses arguments au serveur, où le vrai corps s'exécute avant
que le résultat ne revienne.

Deux conséquences en découlent, et elles sont à l'origine de la plupart des surprises :

- **Arguments et valeurs de retour traversent le réseau** : ils doivent être
  sérialisables. Passer une instance de classe, une fonction, un nœud DOM ou un signal ne
  fonctionnera pas, envoyez des données simples.
- **Le corps n'est plus dans le client**, donc tout ce qu'il capture disparaît aussi. Les
  imports utilisés uniquement dans des fonctions serveur sont retirés du bundle navigateur :
  c'est précisément pourquoi un client de base de données peut être importé en tête d'un
  fichier de route.

Faites toujours `await`. Comme l'appel devient une requête réseau, le résultat est une
promesse même là où le corps d'origine était synchrone.

## Contexte de requête

Dans une fonction serveur, vous pouvez atteindre la requête courante, en-têtes, cookies,
URL :

```ts
import { getRequestEvent } from '@fluixi/server';

async function whoAmI() {
  "use server";
  const event = getRequestEvent();
  return event?.request.headers.get('authorization');
}
```

`getRequestEvent()` renvoie `undefined` quand aucune requête n'est en cours : le chaînage
optionnel ci-dessus n'est donc pas décoratif, le même module peut être importé pendant un
prérendu au moment du build.

Le contexte étant lié à la requête, lisez-le **avant** le premier `await` dans les flux
complexes, et transmettez ce dont vous avez besoin plutôt que d'y revenir plus tard.

## Erreurs

Une exception levée côté serveur ressort en promesse rejetée au site d'appel. Seul le
message traverse le réseau, les traces de pile restent sur le serveur, une erreur interne
ne peut donc pas divulguer de chemins ni de requêtes SQL au navigateur. Levez une erreur
délibérée et lisible pour ce que le client doit traiter, et laissez le reste être un échec
générique.

## Actions de formulaire

`@fluixi/forms` transforme une fonction serveur en `<form action>` à amélioration
progressive : elle fonctionne avant le chargement de JavaScript. Pour le flux de mutation
du routeur, état en attente, réessai, voir [`action` et `<Form>`](/v1/fr/routing).

Ensuite : **[Routes d'API](/v1/fr/api-routes)**.
