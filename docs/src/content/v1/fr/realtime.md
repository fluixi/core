# Temps réel

Une connexion WebSocket dont l'état est fait de signaux : ce qu'elle fait, le dernier message,
la dernière erreur. Elle se reconnecte seule, garde ce que vous envoyez jusqu'à pouvoir
l'envoyer, et n'ouvre rien pendant le rendu serveur.

```ts
import { createWebSocket, json } from '@fluixi/realtime';

type Incoming = { type: 'task.changed'; id: string };
type Outgoing = { type: 'watch'; project: string };

const live = createWebSocket('/live', { serializer: json<Incoming, Outgoing>() });

live.status();                                  // 'connecting', puis 'open'
live.send({ type: 'watch', project: 'p-12' });  // 'queued' avant l'ouverture, puis 'sent'
live.subscribe((message) => refresh(message.id));
```

`@fluixi/realtime` ne dépend que de `@fluixi/reactive`. Ses signaux sont de simples fonctions
et `subscribe` prend une fonction de rappel : il fonctionne aussi hors des composants Fluixi.

## Lire la connexion

| Lecture | Contenu |
|---|---|
| `status()` | `idle`, `connecting`, `open`, `reconnecting`, `closing` ou `closed` |
| `connected()` | `status() === 'open'` |
| `data()` | le dernier message, décodé |
| `error()` | la dernière `RealtimeError`, effacée à l'ouverture |
| `info()` | `url`, le `protocol` choisi par le serveur, les tentatives échouées (`attempt`), `closeCode`, `closeReason` |
| `buffered()` | les octets que le navigateur garde encore après le dernier envoi |

`idle` veut dire qu'elle ne s'est jamais connectée, et c'est l'état qu'elle garde sur le
serveur. `reconnecting` veut dire qu'elle attend avant la prochaine tentative. `closed` est
définitif jusqu'à un appel à `connect()` : après `close()`, après une fermeture que la
politique ne retente pas, ou faute de tentatives.

```tsx
<Show when={live.connected()} fallback={<span>Reconnexion</span>}>
  <LiveBoard />
</Show>
```

## Messages

`data()` garde un seul message, le dernier. Le lire dans un template affiche l'état le plus
récent ; il ne grossit jamais. Pour un flux où chaque message compte, utilisez `subscribe`,
et désactivez `keepLatest` si rien ne lit `data()` :

```ts
const ticks = createWebSocket('/ticks', { keepLatest: false });
ticks.subscribe((frame) => chart.push(frame));
```

Chaque abonné reçoit chaque message. Un abonné qui lève une erreur n'arrête pas les autres ;
son erreur est signalée à part.

Sans sérialiseur, les trames passent telles quelles : le texte en chaînes, le binaire en
`ArrayBuffer` (`binaryType: 'blob'` pour des `Blob`). `json()` encode et décode du JSON sur
les trames texte. Votre propre sérialiseur tient en deux fonctions :

```ts
const msgpack = {
  encode: (message: Outgoing) => encode(message),               // chaîne, ArrayBuffer, vue ou Blob
  decode: (frame: RawData) => decode(frame as ArrayBuffer) as Incoming,
};
```

Une trame que le sérialiseur ne sait pas décoder met `error()` à `decode-failed` et est
ignorée ; la connexion reste ouverte.

## Envoyer

`send` dit ce qu'il est advenu du message :

| Résultat | Sens |
|---|---|
| `sent` | le navigateur l'a pris |
| `queued` | la connexion s'ouvre ou attend de se reconnecter ; il part à l'ouverture, dans l'ordre |
| `queue-full` | `queueLimit` messages attendent déjà (100 par défaut, 0 n'en garde aucun) |
| `too-large` | plus grand que `maxMessageSize` une fois encodé (1 Mio par défaut) |
| `closed` | inactive, en fermeture ou fermée : rien ne l'enverra |

`sent` veut dire que le navigateur a accepté la trame, pas que le serveur l'a reçue. Le
navigateur n'offre pas de contre-pression : `buffered()` lit ce qu'il garde encore, après
chaque envoi puis toutes les 100 ms jusqu'à zéro. Ralentissez quand la valeur monte.

Quand la connexion se ferme pour de bon avec des messages encore en file, l'événement
`discard` les rend :

```ts
live.on('discard', (messages) => saveForLater(messages));
```

## Reconnexion

Une connexion perdue revient avec des attentes croissantes : 500 ms, puis le double jusqu'à
30 s, chacune répartie sur sa moitié haute pour que des clients coupés ensemble ne reviennent
pas ensemble. Une fermeture en 1000 (normale) ou 1008 (violation de politique, la réponse d'un
serveur à quelqu'un qui n'a pas le droit de se connecter) n'est pas retentée.

```ts
createWebSocket('/live', {
  reconnect: { attempts: 10, delay: 1000, maxDelay: 60_000, when: (close) => close.code !== 4401 },
  connectTimeout: 5000, // une tentative pas ouverte à temps est abandonnée et retentée
});
```

`reconnect: false` la désactive. Faute de tentatives, `status()` vaut `closed` et `error()`
vaut `reconnect-exhausted`.

### Détecter une connexion morte

Une connexion peut mourir sans fermeture : un portable en veille, un proxy qui coupe les
sockets inactives. Le navigateur ne peut pas envoyer de ping WebSocket, c'est donc le silence
qui la trahit :

```ts
createWebSocket('/live', { heartbeat: { interval: 25_000, message: { type: 'ping' }, timeout: 60_000 } });
```

`message` part toutes les `interval`. Aucune trame reçue pendant `timeout` coupe la socket et
relance la connexion. Le serveur doit envoyer quelque chose au moins aussi souvent : une
réponse au ping ou son propre battement.

## À qui appartient une connexion

Créée dans un composant, une connexion lui appartient et se ferme quand il disparaît :

```tsx
function Ticker() {
  const ticks = createWebSocket('/ticks');
  return <p>{String(ticks.data() ?? '')}</p>;
}
```

Créée hors de tout composant, dans un module ou un service, elle est partagée et vit jusqu'à
`dispose()`. Les composants la consomment avec `subscribe` et `on`, qui s'arrêtent avec le
composant et laissent la connexion ouverte pour les autres :

```ts
// src/data/live.ts
export const live = createWebSocket('/live', { serializer: json<Incoming, Outgoing>() });
```

```tsx
function TaskList() {
  live.subscribe((message) => message.type === 'task.changed' && tasks.refetch());
  return <For each={tasks()}>{(task) => <TaskRow task={task} />}</For>;
}
```

`close()` s'arrête sans se reconnecter et `connect()` rouvre ; `dispose()` ferme pour de bon
et retire tous les abonnés. `connect: false` crée la connexion sans l'ouvrir.

## Rendu serveur

Sans `document`, rien ne se connecte, même si Node 22 a un `WebSocket` : un module ou un
composant évalué sur le serveur laisse la connexion en `idle`, `connect()` ne fait rien et
`send` répond `closed`. L'hydratation exécute un composant une fois dans le navigateur, il
ouvre donc une seule connexion, et une connexion partagée créée dans un module s'ouvre une
fois par page. Le code qui dépend de `connected()` rend sa variante de repli sur le serveur.

Pour utiliser le client dans Node ou dans des tests, passez `transport` :
`globalTransport()` pour le `WebSocket` du runtime, ou tout objet qui implémente
`WebSocketLike`.

## Authentification

Le `WebSocket` du navigateur n'envoie pas d'en-têtes personnalisés : un jeton ne peut pas
passer dans un en-tête `Authorization`. Deux voies fonctionnent :

- **Le cookie de session.** Une socket sur le même site emporte le cookie, et le serveur lit
  la session dans la requête d'upgrade comme dans toute autre requête. Le serveur doit
  vérifier l'en-tête `Origin` : sans cette vérification, un autre site peut ouvrir une socket
  qui emporte le cookie de votre utilisateur.
- **Un ticket de courte durée** quand la socket est sur un autre domaine. Récupérez un ticket
  à usage unique par une requête authentifiée ; la fonction d'adresse s'exécute avant chaque
  tentative, donc chaque reconnexion en obtient un neuf :

```ts
createWebSocket(async () => {
  const { ticket } = await api.post('/api/realtime/ticket');
  return `wss://live.example.test/?ticket=${ticket}`;
});
```

Ne mettez jamais de jeton de longue durée dans l'adresse : les adresses finissent dans les
journaux des serveurs et des proxies.

## Erreurs

`error()` et l'événement `error` portent une `RealtimeError` avec un `code` :

| Code | Quand |
|---|---|
| `connect-failed` | la fonction d'adresse a levé une erreur, ou le transport a refusé l'adresse |
| `connect-timeout` | pas ouverte dans le délai `connectTimeout` |
| `connection-error` | le navigateur a signalé un échec ; la fermeture qui suit porte le code |
| `heartbeat-timeout` | aucune trame pendant `heartbeat.timeout` |
| `message-too-large` | une trame plus grande que `maxMessageSize` est arrivée ; fermeture en 1009 |
| `decode-failed` | le sérialiseur a levé une erreur sur une trame |
| `reconnect-exhausted` | plus de tentatives |
