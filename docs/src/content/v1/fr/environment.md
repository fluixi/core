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

## Un seul lecteur pour les deux côtés

```ts
const api = $env('API_URL');                                // string | undefined
const secret = $env('SESSION_SECRET', { required: true });  // string
```

`$env` se compile en `env` de `@fluixi/start/env`, sans import à écrire ; importez `env`
vous-même, sous le nom de votre choix, si vous préférez. Côté serveur il lit n'importe quelle
variable. Dans le navigateur seul l'ensemble public existe : le build navigateur refuse un secret
à la ligne qui le lit, et un nom que le build ne pouvait pas voir, calculé à l'exécution, lève
une erreur quand il s'exécute. Une branche que seul le serveur prend, derrière
`import.meta.env.SSR` ou `typeof window === 'undefined'`, n'est pas contrôlée, pas plus qu'une
fonction `"use server"` ou un fichier `.server`, dont le code n'atteint jamais le navigateur.

`publicEnv()` et `serverEnv()` restent pour le code qui veut afficher son intention : qui relit
`serverEnv('STRIPE_KEY')` sait que c'est un secret sans rien chercher.

## Un objet de configuration en une déclaration

```ts
// src/config/env.ts
import { pickEnv, asNumber } from '@fluixi/start/env';

export const config = pickEnv({
  apiUrl: 'API_URL',                                            // string, required
  authServiceUrl: { key: 'AUTH_SERVICE_URL', default: '' },     // string
  pageSize: { key: 'PAGE_SIZE', default: 20, parse: asNumber }, // number
  sentryDsn: { key: 'SENTRY_DSN', optional: true },             // string | undefined
});
```

Une clé seule est une chaîne obligatoire. `default` s'applique quand la variable n'est pas
définie, `optional` l'autorise à valoir `undefined`, et `parse` décide du type ; le type de chaque
champ découle de son entrée. Toutes les variables manquantes ou invalides sont signalées dans une
seule erreur : un nouveau déploiement apprend sa liste entière d'un coup, pas un redémarrage à la
fois. Le résultat est figé.

`asNumber`, `asBoolean`, `asList` et `asUrl` refusent ce qu'ils ne savent pas lire :
`PAGE_SIZE=twelve` échoue au démarrage au lieu de devenir `NaN` dans une requête. Chaque champ est
lu par `env()`, donc le build navigateur contrôle ces clés comme toute autre lecture.

### Clés typées

`@fluixi/start` écrit les noms déclarés dans `src/fluixi-env-vars.d.ts`, avec à côté les noms des
variables serveur de vos fichiers `.env`, les noms seulement. `publicEnv().` et `$env('` les
complètent alors dans l'éditeur, et un nom non déclaré est une erreur de type avant d'être une
erreur de build. Chaque clé vaut `string | undefined`, puisqu'une variable déclarée peut ne pas être
définie. Sans rien de déclaré, `publicEnv()` reste un simple enregistrement.

Une clé connue seulement à l'exécution a besoin de son type :

```ts
import { publicEnv, type PublicEnv } from '@fluixi/start/env';

const read = (key: keyof PublicEnv) => publicEnv()[key];
```

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

La liste est la protection. Quatre contrôles rattrapent la ligne écrite trop vite :

| Contrôle | Quand | Ce qui se passe |
| --- | --- | --- |
| un nom de `env.public` ressemble à un secret : `SECRET`, `PASSWORD`, `PASSWD`, `PRIVATE_KEY`, `CLIENT_SECRET` ou `CREDENTIAL(S)` n'importe où, ou se termine par `TOKEN`, `API_KEY`, `APIKEY`, `DSN`, `DATABASE_URL` ou `SECRETS` | build | refusé, en le nommant |
| une variable `VITE_` d'un fichier `.env` ressemble à un secret | `fluixi build` | refusé ; `fluixi dev` avertit |
| `publicEnv().X` dans du code navigateur, `X` non déclaré (une faute de frappe, ou une valeur serveur) | build | refusé, en nommant le fichier, la ligne et la variable |
| `serverEnv()` appelé dans le navigateur | exécution | lève une erreur |

Pour un nom qui ne fait que ressembler à un secret, `FLUIXI_ALLOW_PUBLIC_SECRETS=true` laisse
passer le build.

Suite : **[SEO et en-tête de document](/v1/fr/seo)**.
