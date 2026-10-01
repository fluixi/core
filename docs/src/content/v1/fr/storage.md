# Stockage

`@fluixi/storage` offre une seule API clé/valeur typée au-dessus de n'importe quel support :
mémoire, localStorage, sessionStorage, cookies, une requête, ou le vôtre. Il ne dépend pas du
reste de Fluixi, donc une bibliothèque ou un script peut s'en servir autant qu'une application.
Dans une application, commencez par [Stockage dans une application](/v1/fr/app-storage), qui
choisit le support pour vous.

```ts
import { createStorage } from '@fluixi/storage';
import { localStorageAdapter } from '@fluixi/storage/browser';

type Prefs = { theme: 'light' | 'dark'; sidebar: boolean };

const prefs = createStorage<Prefs>({ adapter: localStorageAdapter(), namespace: 'app' });

prefs.set('theme', 'dark');
prefs.get('theme');   // 'dark' | null
prefs.has('sidebar'); // false
```

Le schéma type chaque appel : `get('theme')` renvoie `'light' | 'dark' | null`, et
`set('theme', 'blue')` ne compile pas. Sans schéma, nommez le type à l'appel :
`storage.get<User>('user')`.

## Supports

Un adaptateur est l'endroit où vivent les chaînes. Le stockage entoure chaque valeur d'une
petite enveloppe (date d'écriture, date d'expiration, version) et la sérialise, si bien que
tous les supports se comportent de la même façon.

| Adaptateur | Import | Durée de vie |
| --- | --- | --- |
| `memoryStorage()` | `@fluixi/storage` | dans une Map, tant que l'adaptateur existe |
| `localStorageAdapter()` | `@fluixi/storage/browser` | dans le navigateur, d'une visite à l'autre |
| `sessionStorageAdapter()` | `@fluixi/storage/browser` | dans l'onglet |
| `documentCookieAdapter(options)` | `@fluixi/storage/browser` | dans les cookies de la page |
| `cookieStorage(options)` | `@fluixi/storage/server` | dans les cookies d'une requête, renvoyés en `Set-Cookie` |
| `requestStorage()` | `@fluixi/storage/server` | le temps d'une requête |

Sans adaptateur, `createStorage` utilise la mémoire. Les adaptateurs du navigateur lisent leur
global à la première utilisation, jamais à l'import : un module qui en crée un se charge sans
problème sur un serveur, et s'en servir là lève `StorageUnavailableError`.

Chaque appel à `memoryStorage()` ou `requestStorage()` crée sa propre Map. Sur un serveur, ne
gardez jamais l'une d'elles au niveau d'un module pour des données de requête : tous les
visiteurs la partageraient.

## Espaces de noms

Un espace de noms préfixe chaque clé : deux parties d'une application ne se marchent jamais
dessus, et `clear()` ne vide que les siennes.

```ts
const app = createStorage({ adapter: localStorageAdapter(), namespace: 'app' });
const drafts = app.namespace('drafts'); // clés stockées sous app:drafts:<clé>

drafts.clear(); // supprime app:drafts:*, rien d'autre
```

`storage.keyPrefix` est ce qu'un stockage met devant ses clés : `app:` ici, vide sans espace
de noms.

## Expiration

```ts
storage.set('otp', code, { ttl: 5 * 60_000 });
storage.touch('otp', 5 * 60_000); // une nouvelle expiration, dans cinq minutes
storage.prune();                  // supprime tout ce qui a expiré ; renvoie le nombre
```

L'expiration est vérifiée à chaque lecture, elle tient donc d'un rechargement à l'autre, et une
valeur expirée se lit comme absente. Les adaptateurs de cookies donnent aussi au cookie la même
durée de vie.

## Versions et migrations

Quand la forme d'une valeur stockée change, donnez ses étapes à la clé. Elles s'exécutent à la
lecture, dans l'ordre, de la version stockée jusqu'à la dernière, et le résultat est réécrit.

```ts
type Store = { user: { firstName: string; lastName: string } };

const storage = createStorage<Store>({
  adapter: localStorageAdapter(),
  migrations: {
    user: {
      // la version 1 stockait { name: 'Ada Lovelace' }
      2: (old: any) => {
        const [firstName, lastName = ''] = old.name.split(' ');
        return { firstName, lastName };
      },
    },
  },
});
```

`set` écrit la dernière version, et `getEntry('user')` la montre avec le reste des
métadonnées : `{ value, createdAt, expiresAt?, version?, encrypted? }`.

Une valeur écrite sans enveloppe (par du code plus ancien, ou à la main) se relit telle quelle.

## Valeurs

Le sérialiseur par défaut est un JSON strict. `JSON.stringify` laisse tomber une fonction,
change `NaN` en `null` et une `Date` en chaîne qui se relit comme une chaîne, le tout sans
prévenir. Ce sérialiseur les refuse et dit où :

```ts
storage.set('event', { at: new Date() });
// StorageSerializationError: value.at is Date, which does not survive JSON.
```

Convertissez d'abord (`at.toISOString()`), et la valeur se relit exactement comme elle a été
écrite. Pour un format à vous, passez `serializer: createSerializer(serialize, deserialize)`.

## Retrouver et gérer les entrées

```ts
storage.search({ match: 'draft:*' });                 // un motif glob, ou une RegExp
storage.search({ prefix: 'draft:', limit: 10 });
storage.search({ where: (item) => item.value.pinned });

storage.entries(); // toutes les entrées vivantes : { key, value, entry }, dans l'ordre des clés
storage.size();
storage.usage();   // { keys, bytes } : à peu près ce qu'un navigateur compte dans son quota

storage.update('count', (n) => (n ?? 0) + 1); // garde l'expiration
storage.getOrSet('id', () => crypto.randomUUID());
```

`snapshot()` renvoie toutes les entrées vivantes avec leurs métadonnées, en données simples, et
`restore(snapshot)` les réécrit, en gardant les clés existantes sauf avec `{ overwrite: true }`.
`copyStorage(from, to)` fait les deux : déplacer des données vers un autre adaptateur, préparer
un test, sauvegarder un espace de noms.

## Changements

```ts
const stop = storage.subscribe('theme', (event) => {
  event.type;     // 'set' | 'remove' | 'clear' | 'expire'
  event.value;    // pour 'set'
  event.external; // true quand cela vient d'un autre onglet
});
```

Tous les stockages au-dessus d'un même adaptateur entendent une écriture faite par l'un d'eux.
localStorage signale aussi les écritures des autres onglets, marquées `external`. Dans un
composant, un signal [`persisted`](/v1/fr/app-storage#persisted) le fait pour vous.

## Sur le serveur

```ts
import { createStorage } from '@fluixi/storage';
import { cookieStorage } from '@fluixi/storage/server';

const headers = new Headers();
const prefs = createStorage<{ theme: string }>({
  adapter: cookieStorage({ request, response: headers, maxAge: 60 * 60 * 24 * 365 }),
  namespace: 'ui',
});

prefs.get('theme');         // depuis l'en-tête Cookie de la requête
prefs.set('theme', 'dark'); // ajoute un Set-Cookie à headers
```

`request` et `response` acceptent une `Request` et des `Headers` fetch tels quels, ou tout objet
avec `getHeader(name)` et `appendHeader(name, value)`. Les cookies sont sûrs par défaut
(HttpOnly, Secure, SameSite=Lax, Path=/), chaque écriture fait un `Set-Cookie`, et une valeur
au-delà de `maxSize` (4096 octets) lève `StorageQuotaError` au lieu d'être ignorée par le
navigateur. Sans réponse, l'adaptateur est en lecture seule.

L'adaptateur voit tous les cookies de la requête : donnez toujours un espace de noms au
stockage, sans quoi `clear()` supprimerait aussi le cookie de session.

Dans une application, `useStorage({ scope: 'cookie' })` fait ce câblage et envoie le cookie
avec la page. Voir [Stockage dans une application](/v1/fr/app-storage).

## Chiffrement

Le chiffrement se fait par entrée et sur demande. Un stockage avec `encryption` est
asynchrone, puisque la cryptographie de la plateforme l'est, et garde côte à côte des entrées
chiffrées et en clair.

```ts
import { createStorage, generateEncryptionKey, staticKeyProvider } from '@fluixi/storage';

const vault = createStorage<{ theme: string; token: string }>({
  adapter: localStorageAdapter(),
  encryption: { keyProvider: staticKeyProvider(generateEncryptionKey()) },
});

await vault.set('theme', 'dark');                    // en clair
await vault.set('token', token, { encrypt: true });  // AES-256-GCM
await vault.get('token');                            // déchiffré de lui-même
```

Ce qu'il fait :

- AES-256-GCM via Web Crypto, dans le navigateur comme sur Node, avec un IV aléatoire neuf à
  chaque écriture.
- La clé de l'entrée, ses dates et sa version sont authentifiées avec elle : une valeur copiée
  sous une autre clé, ou une expiration modifiée, échoue au déchiffrement au lieu de renvoyer
  des données.
- Réécrire la même clé avec `{ encrypt: false }` la stocke de nouveau en clair, sans rien
  laisser de la forme chiffrée.
- `prune`, l'expiration et `remove` fonctionnent sans la clé.

La clé vient d'un fournisseur, jamais de l'appel :

```ts
const keyProvider = {
  async getKey({ key, namespace, operation, keyId }) {
    // renvoyer une CryptoKey, ou { key, id } pour que les lectures la retrouvent après une rotation
  },
};
```

`generateEncryptionKey()` crée une clé que le script ne peut pas exporter, et
`importEncryptionKey(raw)` prend 32 octets ou leur base64. Chaque échec a son erreur, toutes
dérivées de `StorageEncryptionError` : une clé absente ou inutilisable, une authentification
qui échoue, un format ou un algorithme que cette version ne sait pas lire, un contenu
corrompu. Un stockage synchrone sur le même adaptateur peut lister et supprimer les entrées
chiffrées, mais en lire une lève une erreur.

Le chiffrement garde une valeur privée pour qui n'a pas la clé. Ce n'est pas de
l'authentification, il ne remplace ni HTTPS, ni les cookies sécurisés, ni les contrôles côté
serveur, et une clé rangée à côté des données ne protège rien.

## Erreurs

Toutes les erreurs dérivent de `StorageError`, avec un `code` stable, la `key` quand il y en a
une, et la `cause` d'origine.

| Erreur | Quand |
| --- | --- |
| `StorageSerializationError` | une valeur que JSON changerait ou perdrait |
| `StorageDeserializationError` | un texte stocké qui ne se lit pas |
| `StorageUnavailableError` | le support n'existe pas ici : localStorage sur un serveur |
| `StorageQuotaError` | le support est plein, ou un cookie dépasse sa limite |
| `StorageSecurityError` | le navigateur bloque le stockage (confidentialité, iframe isolée) |
| `StorageAdapterError` | tout autre échec du support |

## Votre propre support

Un adaptateur est un objet avec `get`, `set`, `remove`, `has`, `keys` et `clear` sur des
chaînes, plus un `name`, un `scope` et ce qu'il sait faire (`capabilities`). Renvoyez des
promesses et passez-le à `createAsyncStorage` pour un support qui répond plus tard, comme un
stockage distant.

```ts
import { createAsyncStorage, type AsyncStorageAdapter } from '@fluixi/storage';

// `kv` est n'importe quel client dont les appels renvoient des promesses : Redis, un binding KV, une API distante.
const kvAdapter: AsyncStorageAdapter = {
  name: 'kv',
  scope: 'persistent',
  capabilities: { synchronous: false, persistent: true, reactive: false, crossContext: true, expiration: false, transactions: false },
  get: (key) => kv.get(key),
  set: (key, value) => kv.set(key, value),
  remove: (key) => kv.del(key),
  has: async (key) => (await kv.get(key)) !== null,
  keys: () => kv.keys('*'),
  clear: async () => {
    for (const key of await kv.keys('*')) await kv.del(key);
  },
};

const storage = createAsyncStorage({ adapter: kvAdapter, namespace: 'app' });
await storage.set('count', 1);
```

`createStorage` sans `encryption` renvoie le stockage synchrone ; `createSyncStorage` le dit
par son nom, pour du code qui compte sur des lectures immédiates.
