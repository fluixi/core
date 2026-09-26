# Variables d'environnement

Les valeurs qui atteignent le navigateur se déclarent, elles ne s'épellent pas. Une application
liste les publiques dans `fluixi.config.ts` ; tout le reste reste sur le serveur, quel que soit
son nom.

```ts
// fluixi.config.ts
import { defineConfig } from '@fluixi/start/config';

export default defineConfig({
  env: {
    public: ['AUTH_ISSUER', 'AUTH_CLIENT_ID', 'AUTH_TOKENS', 'API_URL', 'APP_URL'],
  },
});
```

La convention de Vite met la décision dans le nom : un préfixe `VITE_` publie la valeur.
Déplacer une valeur entre serveur et navigateur renomme alors chaque référence, et un secret
nommé `VITE_API_SECRET` est publié, que quelque chose le lise ou non. Avec une liste, un secret
ne peut atteindre le bundle qu'en y étant écrit.

## Les lire

```ts
import { publicEnv, serverEnv } from '@fluixi/start/env';

const { API_URL } = publicEnv();                                    // anywhere
const secret = serverEnv('SESSION_SECRET', { required: true });     // server only
```

`publicEnv()` marche des deux côtés et renvoie le même ensemble figé de chaque côté. Dans le
navigateur, le build l'a défini comme un littéral. Côté serveur, il lit `process.env`, réduit
aux mêmes noms déclarés, pour qu'un loader ne puisse pas utiliser une valeur que le navigateur
n'aura pas. Il marche aussi quand le serveur importe `@fluixi/start` depuis `node_modules` au
lieu de l'embarquer, ce qui est le cas par défaut d'une installation publiée : là,
`import.meta.env` vaut undefined, et un code qui le lit ne casse qu'en production.

`serverEnv(name)` lit une variable réservée au serveur. Dans un navigateur, il lève une erreur
au lieu de renvoyer `undefined`, car un secret lu comme `undefined` devient une requête envoyée
sans credentials, et l'échec pointe alors vers la requête au lieu de la lecture.
`{ required: true }` lève aussi une erreur quand la variable n'est pas définie, en la nommant.

## D'où viennent les valeurs

`fluixi dev` et `fluixi start` chargent `.env`, `.env.local`, `.env.<mode>` et
`.env.<mode>.local` dans `process.env` côté serveur, toutes les variables, préfixées ou non.
Une variable déjà définie dans l'environnement réel l'emporte sur les fichiers : c'est ainsi que
les secrets propres à un déploiement remplacent le `.env` d'un développeur.

## Le préfixe `VITE_`

Il continue de marcher. Un nom déclaré est trouvé sous son écriture nue ou précédé de `VITE_`,
l'écriture nue d'abord, donc `.env` peut migrer une variable à la fois : `AUTH_ISSUER` dans
`env.public` lit `VITE_AUTH_ISSUER` jusqu'à ce qu'elle soit renommée. Ce qui est déjà préfixé
reste public, comme toujours.

## Ce qui empêche un secret de partir

La liste est la protection. Trois contrôles rattrapent la ligne écrite trop vite :

| Contrôle | Quand | Ce qui se passe |
| --- | --- | --- |
| un nom de `env.public` ressemble à un secret (`SECRET`, `PASSWORD`, `PRIVATE_KEY`, `CREDENTIALS`) | build | refusé, en le nommant |
| une variable `VITE_` d'un fichier `.env` ressemble à un secret | `fluixi build` | refusé ; `fluixi dev` avertit |
| `serverEnv()` appelé dans le navigateur | exécution | lève une erreur |

Pour un nom qui ne fait que ressembler à un secret, `FLUIXI_ALLOW_PUBLIC_SECRETS=true` laisse
passer le build.

Suite : **[SEO et en-tête de document](/v1/fr/seo)**.
