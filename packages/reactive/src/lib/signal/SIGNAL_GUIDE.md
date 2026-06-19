# Guide Complet du Systeme Reactif — signal.ts

Ce document explique en detail chaque variable globale, chaque interface et chaque fonction du fichier `signal.ts`. L'objectif est de donner une comprehension ligne par ligne du fonctionnement interne du systeme de signaux.

---

## Table des Matieres

1. [Types et Interfaces](#1-types-et-interfaces)
2. [Symboles et Constantes](#2-symboles-et-constantes)
3. [Variables Globales (Etat du Systeme)](#3-variables-globales-etat-du-systeme)
4. [Fonctions Utilitaires Internes](#4-fonctions-utilitaires-internes)
5. [createSignal — Creation d'un Signal](#5-createsignal--creation-dun-signal)
6. [createEffect — Creation d'un Effet](#6-createeffect--creation-dun-effet)
7. [runComputation — Execution d'un Calcul](#7-runcomputation--execution-dun-calcul)
8. [updateComputation — Mise a Jour d'un Calcul](#8-updatecomputation--mise-a-jour-dun-calcul)
9. [dispose — Nettoyage d'un Calcul](#9-dispose--nettoyage-dun-calcul)
10. [createMemo — Creation d'un Memo](#10-creatememo--creation-dun-memo)
11. [batch / flushUpdates — Systeme de Regroupement](#11-batch--flushupdates--systeme-de-regroupement)
12. [createRoot — Racine de Propriete](#12-createroot--racine-de-propriete)
13. [untrack — Desactivation du Suivi](#13-untrack--desactivation-du-suivi)
14. [onCleanup — Enregistrement de Nettoyage](#14-oncleanup--enregistrement-de-nettoyage)
15. [createSelector — Selecteur Optimise](#15-createselector--selecteur-optimise)
16. [createResource — Ressource Asynchrone Reactive](#16-createresource--ressource-asynchrone-reactive)
17. [createDeferred — Signal Differe](#17-createdeferred--signal-differe)
18. [getOwner / runWithOwner — Gestion du Proprietaire](#18-getowner--runwithowner--gestion-du-proprietaire)
19. [createContext / createProvider / useContext — Systeme de Contexte](#19-createcontext--createprovider--usecontext--systeme-de-contexte)
20. [createRenderEffect / runRenderComputation — Effet de Rendu](#20-createrendereffect--runrendercomputation--effet-de-rendu)
21. [createReaction — Reaction Manuelle](#21-createreaction--reaction-manuelle)
22. [on — Suivi Explicite de Dependances](#22-on--suivi-explicite-de-dependances)
23. [Transitions — startTransition / useTransition](#23-transitions--starttransition--usetransition)
24. [Suspense — getSuspenseContext / resumeEffects / trackPromise](#24-suspense--getsuspensecontext--resumeeffects--trackpromise)
25. [devComponent — Composant en Mode Developpement](#25-devcomponent--composant-en-mode-developpement)
26. [Utilitaires Supplementaires](#26-utilitaires-supplementaires)
27. [Schema du Graphe Reactif](#27-schema-du-graphe-reactif)

---

## 1. Types et Interfaces

### `Accessor<T>`
```typescript
export interface Accessor<T> {
  (): T;                        // Fonction appelable qui retourne la valeur
  toObservable?: () => Observable<T>;  // Conversion en Observable RxJS-like
  [$NODE]?: ReactiveNode;       // Noeud reactif interne (metadonnees)
  [$SIGNAL]?: boolean;          // Marqueur : "je suis un signal"
}
```
Un `Accessor` est une **fonction sans argument** qui retourne une valeur de type `T`. Quand on l'appelle dans un contexte de suivi (effet, memo), elle enregistre automatiquement l'appelant comme observateur.

### `Setter<T>`
```typescript
export type Setter<T> = (value: T | ((prev: T) => T)) => void;
```
Fonction qui met a jour la valeur d'un signal. Accepte soit une valeur directe, soit une **fonction de mise a jour** qui recoit la valeur precedente.

### `Signal<T>`
```typescript
export type Signal<T> = [Accessor<T>, Setter<T>];
```
Un tuple `[lecture, ecriture]` — c'est le retour de `createSignal`.

### `RootOwner`
```typescript
export interface RootOwner {
  owned: Computation[] | null;           // Calculs enfants possedes
  cleanups: Cleanup[] | null;            // Fonctions de nettoyage
  contexts: Map<symbol, unknown> | null; // Map des contextes (pour Provider)
  owner: RootOwner | null;               // Parent dans l'arbre de propriete
}
```
Represente un **noeud racine** dans l'arbre de propriete. Chaque `createRoot` en cree un. Le champ `contexts` (au pluriel, c'est une `Map`) est crucial pour le systeme de contexte — `useContext` cherche ce champ en remontant la chaine `owner`.

### `Computation`
```typescript
interface Computation {
  fn: ComputationFn<any> | EffectFn;    // La fonction a executer
  state: number;                          // CLEAN=0, STALE=1, DIRTY=2
  sources: Signal<any>[] | null;          // Signaux dont ce calcul depend
  sourceSlots: number[] | null;           // Slots d'index (non utilise actuellement)
  value?: any;                            // Valeur stockee (pour les memos)
  owned: Computation[] | null;            // Calculs enfants crees pendant l'execution
  cleanups: Cleanup[] | null;             // Fonctions de nettoyage
  owner: RootOwner | null;                // Proprietaire parent
  context: Map<symbol, unknown> | null;   // Contexte SINGULIER (contrairement a RootOwner.contexts)
  pure: boolean;                          // true = memo (pas d'effets de bord), false = effet
  updatedAt: number | null;               // Timestamp de derniere mise a jour
  node?: ReactiveNode;                    // Noeud reactif associe (debug)
  accessor?: Accessor<any>;               // Pour les memos: la fonction de lecture
  renderEffect?: boolean;                 // true si cree par createRenderEffect
  suspense?: SuspenseContextType;         // Frontiere Suspense associee
}
```
C'est la **brique fondamentale** du systeme reactif. Chaque effet, memo, et render effect est une `Computation`.

**Point critique :** `RootOwner` a `contexts` (pluriel, Map) tandis que `Computation` a `context` (singulier). `useContext` cherche `contexts` (la Map). Pour qu'un `Computation` puisse fournir un contexte, il faut que `contexts` soit defini manuellement (comme dans `devComponent`).

### `ReactiveNode`
```typescript
export interface ReactiveNode {
  id: string;        // Identifiant unique (genere par createNodeId)
  type: 'signal' | 'effect' | 'memo' | 'computed' | 'store' | 'derived' | 'async';
  value: any;        // Valeur courante
  version: number;   // Compteur de versions (incremente a chaque changement)
  equals?: EqualityFn<any>;  // Fonction de comparaison personnalisee
  name?: string;     // Nom pour le debug
  created: number;   // Timestamp de creation
  updated: number;   // Timestamp de derniere modification
  computation?: Computation;  // Reference vers le Computation (pour les memos)
}
```
Metadonnees pour le debug et le suivi des noeuds reactifs. En mode developpement, chaque noeud est enregistre dans `nodeRegistry`.

### `SuspenseContextType`
```typescript
export interface SuspenseContextType {
  increment: () => void;          // Incremente le compteur de promesses en attente
  decrement: () => void;          // Decremente le compteur
  inFallback: Accessor<boolean>;  // Signal: sommes-nous en mode fallback ?
  effects: Computation[];          // File d'effets suspendus a reprendre
  resolved: boolean;               // Le boundary a-t-il ete resolu ?
}
```
Fournit par le composant Suspense via le systeme de contexte. Les ressources (`createResource`) s'enregistrent aupres de cette interface.

---

## 2. Symboles et Constantes

```typescript
export const $SIGNAL = Symbol.for('signal');    // Marque une fonction comme signal
export const $MEMO = Symbol.for('memo');        // Marque une fonction comme memo
export const $RESOURCE = Symbol.for('resource'); // Marque une fonction comme resource
export const $PROXY = Symbol('fluixi-proxy');    // Marque un proxy de store
const $NODE = Symbol.for('signal-node');         // Cle pour acceder au ReactiveNode
const $COMP = Symbol.for('component-node');      // Marque un composant (devComponent)
```

- `$SIGNAL` est le marqueur le plus important. Il est utilise partout dans le framework pour detecter si une valeur est un signal, un memo ou une resource (via `isSignal`). Les trois (`signal`, `memo`, `resource`) portent tous `$SIGNAL`.
- `$MEMO` distingue les memos des signaux simples.
- `$RESOURCE` distingue les resources.
- `$PROXY` identifie les proxys de store crees par `createStore`.

### Etats des Computations

```typescript
const CLEAN = 0;   // Le calcul est a jour, rien a refaire
const STALE = 1;   // Un parent est peut-etre sale (verification necessaire)
const DIRTY = 2;   // Une source a change, re-execution necessaire
```

Le cycle de vie d'un `Computation` :
1. **Creation** : `state = DIRTY` (doit etre execute une premiere fois)
2. **Apres execution** : `state = CLEAN`
3. **Quand une source change** : `state = DIRTY`
4. **Re-execution** : retour a `CLEAN`

---

## 3. Variables Globales (Etat du Systeme)

Ces variables forment le **coeur mutable** du systeme reactif. Elles sont modifiees pendant l'execution des calculs et doivent etre restaurees correctement pour eviter les fuites.

```typescript
let Owner: RootOwner | null = null;
```
**Le proprietaire courant.** Tout calcul cree (effet, memo, resource) est attache a `Owner`. Quand un calcul s'execute, il devient le nouveau `Owner` pour ses enfants. C'est ce qui forme l'**arbre de propriete** — un arbre parent-enfant qui determine la duree de vie et le nettoyage des calculs.

```typescript
let Listener: Computation | null = null;
```
**Le calcul en cours d'ecoute.** Quand un signal est lu, il verifie `Listener`. Si `Listener` n'est pas null, le signal enregistre ce `Listener` comme observateur. C'est le mecanisme de **suivi automatique des dependances**. Pendant l'execution d'un memo ou d'un effet, `Listener` pointe vers ce memo/effet.

```typescript
let Updates: Computation[] | null = null;
```
**File d'attente de mises a jour.** Quand `Updates` n'est pas null (en mode `batch`), les calculs sales sont accumules ici au lieu d'etre executes immediatement. `flushUpdates` les execute a la fin du batch.

```typescript
let Effects: Computation[] | null = null;
```
**File d'attente d'effets.** Similaire a `Updates` mais pour les effets qui doivent s'executer apres les memos. Utilise pendant `flushUpdates`.

```typescript
let ExecCount = 0;
const MAX_ITERATIONS = 1000000;
```
**Compteur d'executions** pour detecter les boucles infinies. Incremente a chaque `runComputation`. Si ca depasse `MAX_ITERATIONS`, une erreur est lancee.

```typescript
const signalObservers = new WeakMap<Signal<any>, Set<Computation>>();
```
**Table de correspondance signal → observateurs.** Pour chaque signal (ou memo traite comme signal), cette `WeakMap` contient le `Set` de tous les `Computation` qui dependent de ce signal. Quand un signal change, il consulte cette map pour trouver qui notifier. C'est une `WeakMap` pour permettre le garbage collection des signaux non references.

```typescript
let currentTransition: TransitionState | null = null;
```
**Etat de la transition courante.** Quand `startTransition` est en cours, les mises a jour sont marquees comme basse priorite.

```typescript
const errorHandlers: ErrorBoundary[] = [];
```
**Pile de gestionnaires d'erreurs.** Utilisee par `catchException` pour capturer les erreurs dans un perimetre defini.

```typescript
let Scheduler: ((fn: () => void) => void) | null = null;
```
**Ordonnanceur personnalise.** Permet de remplacer `queueMicrotask` par un ordonnanceur specifique (utile pour les tests ou le SSR).

```typescript
const nodeRegistry = new Map<string, WeakRef<ReactiveNode>>();
let nodeIdCounter = 0;
```
**Registre de noeuds pour le debug.** En mode developpement (`__DEV__`), chaque `ReactiveNode` est enregistre avec une `WeakRef` pour permettre l'inspection sans empecher le garbage collection.

```typescript
export const sharedConfig = {
  context: null as RootOwner | null,
  owner: null as RootOwner | null,
};
```
**Configuration partagee.** Donne acces au `Owner` courant depuis l'exterieur du module (pour le SSR et l'hydratation).

---

## 4. Fonctions Utilitaires Internes

### `createNodeId()`
```typescript
function createNodeId(): string {
  return `node_${++nodeIdCounter}_${Date.now()}`;
}
```
Genere un identifiant unique pour chaque noeud reactif. Combine un compteur global et un timestamp.

### `registerNode(node)` / `unregisterNode(node)`
```typescript
function registerNode(node: ReactiveNode): void {
  if (__DEV__) {
    nodeRegistry.set(node.id, new WeakRef(node));
  }
}
```
En mode dev uniquement, enregistre/desenregistre un noeud dans le registre global. Les `WeakRef` evitent les fuites memoire.

### `createReactiveNode(type, initialValue, options)`
```typescript
function createReactiveNode<T>(type, initialValue, options): ReactiveNode
```
Fabrique un objet `ReactiveNode` avec un id unique, le type, la valeur initiale, et les options. Appelle `registerNode` pour l'enregistrer en mode dev.

### `defaultEquals(a, b)`
```typescript
function defaultEquals<T>(a: T, b: T): boolean {
  return a === b;  // Egalite stricte par reference
}
```
Comparaison par defaut. Si `options.equals === false`, le signal notifie TOUJOURS meme si la valeur n'a pas change.

### `handleError(err)`
```typescript
function handleError(err: Error): void {
  console.error('Reactive error:', err);
  throw err;
}
```
Gestion basique des erreurs : log puis re-throw.

---

## 5. createSignal — Creation d'un Signal

```typescript
export function createSignal<T>(
  _value: T,
  options?: SignalOptions<T>
): Signal<T>
```

C'est la primitive fondamentale. Un signal est une **cellule de donnee reactive** avec lecture et ecriture.

### Ligne par ligne

```typescript
let value = _value;
```
Stocke la valeur dans une variable locale (closure). Cette variable est capturee par les fonctions `read` et `write`.

```typescript
if (typeof value === 'object' && value && $PROXY in (value as any)) {
  delete (value as any)[$PROXY];
}
```
Si la valeur initiale est un proxy de store, on supprime le marqueur `$PROXY` pour eviter les conflits. Un signal doit contenir une valeur brute, pas un proxy.

```typescript
const node = createReactiveNode('signal', value, {
  equals: options?.equals === false ? undefined : options?.equals,
  name: options?.name,
});
```
Cree les metadonnees du noeud reactif. Si `equals === false`, pas de fonction d'egalite (toujours notifier).

```typescript
const s: Signal<T> = [read, write];
signalObservers.set(s, new Set());
```
Cree le tuple signal et initialise un ensemble vide d'observateurs dans la `WeakMap` globale. Le `Set` contiendra les `Computation` qui lisent ce signal.

### `read()` — Fonction de Lecture

```typescript
function read(): T {
  const observer = Listener;
```
Recupere le `Listener` courant — c'est le calcul qui est en train de s'executer (effet ou memo).

```typescript
  if (observer) {
    if (!observer.sources) {
      observer.sources = [s];
    } else if (observer.sources.indexOf(s) === -1) {
      observer.sources.push(s);
    }
```
Si un calcul est en cours d'ecoute, on ajoute CE signal comme **source** du calcul. C'est la premiere moitie du suivi bidirectionnel : le calcul sait de quels signaux il depend.

```typescript
    const observers = signalObservers.get(s);
    if (observers && !observers.has(observer)) {
      observers.add(observer);
    }
  }
```
Deuxieme moitie : le signal sait quels calculs l'observent. Cette double liaison permet la propagation dans les deux sens.

```typescript
  return value;
}
```
Retourne simplement la valeur courante.

### `write(nextValue)` — Fonction d'Ecriture

```typescript
function write(nextValue: T | ((prev: T) => T)): void {
  const v = typeof nextValue === 'function'
    ? (nextValue as (prev: T) => T)(value)
    : nextValue;
```
Si `nextValue` est une fonction, on l'appelle avec la valeur precedente (patron de mise a jour fonctionnel comme `setCount(c => c + 1)`).

```typescript
  const equals = node.equals || defaultEquals;
  if (options?.equals === false || !equals(value, v)) {
```
Verifie si la valeur a reellement change. Si `equals === false`, on skip la comparaison et on notifie toujours.

```typescript
    value = v;
    node.value = v;
    node.version++;
    node.updated = Date.now();
```
Met a jour la valeur dans la closure ET dans le noeud reactif. Incremente la version.

```typescript
    const observers = signalObservers.get(s);
    if (observers && observers.size > 0) {
      const observerList = Array.from(observers);
      const toUpdate: Computation[] = [];
      const visited = new Set<Computation>();
```
Recupere la liste des observateurs et prepare la propagation. `visited` evite de traiter un calcul deux fois.

### `propagateDirty(comp)` — Propagation Recursive

```typescript
      function propagateDirty(comp: Computation): void {
        if (visited.has(comp)) return;
        visited.add(comp);
        const wasDirty = comp.state === DIRTY;
        comp.state = DIRTY;
        if (!wasDirty) {
          toUpdate.push(comp);
        }
```
Marque le calcul comme `DIRTY`. S'il n'etait pas deja sale, on l'ajoute a la file de mise a jour.

```typescript
        if (comp.pure && comp.accessor) {
          const memoObservers = signalObservers.get(comp.accessor as any);
          if (memoObservers) {
            for (const observer of memoObservers) {
              propagateDirty(observer);
            }
          }
        }
      }
```
**Point crucial :** si le calcul est un **memo** (`pure = true`), on propage le `DIRTY` a SES observateurs aussi. C'est ainsi que la salete se propage a travers la chaine : `signal → memo → effet`. Sans cette propagation transitive, les effets qui dependent de memos ne seraient jamais re-executes.

```typescript
      propagate(observerList, propagateDirty);
```
La fonction `propagate` appelle `propagateDirty` sur chaque observateur ET sur les enfants possedes de chaque observateur.

```typescript
      if (Updates) {
        for (const comp of toUpdate) {
          if (Updates.indexOf(comp) === -1) {
            Updates.push(comp);
          }
        }
      } else {
        for (const comp of toUpdate) {
          if (!comp.pure) {
            updateComputation(comp);
          }
        }
      }
```
**En mode batch** (`Updates !== null`) : on accumule les calculs dans `Updates`.
**Hors batch** : on execute immediatement les effets (`!comp.pure`). Les memos ne sont PAS executes ici — ils sont **paresseux** et ne se recalculent que quand on les lit.

### `read.toObservable()`

```typescript
read.toObservable = () => {
  return new Observable<T>((observer) => {
    let first = true;
    const dispose = createEffect(() => {
      const val = read();
      if (first) { first = false; }
      else { observer.next(val); }
    });
    return dispose;
  });
};
```
Convertit le signal en `Observable` RxJS-like. Cree un effet qui lit le signal et emet les changements. On ignore la premiere lecture (valeur initiale) pour ne pas emettre immediatement.

### Marquage Final

```typescript
Object.defineProperty(read, $SIGNAL, { value: true, enumerable: true });
Object.defineProperty(read, $NODE, { value: node, enumerable: false });
```
Attache les marqueurs `$SIGNAL` et `$NODE` a la fonction de lecture. `$SIGNAL` est enumerable (visible par `isSignal`), `$NODE` ne l'est pas (usage interne).

---

## 6. createEffect — Creation d'un Effet

```typescript
export function createEffect(
  fn: EffectFn,
  value?: any,
  options?: EffectOptions
): () => void
```

Un effet est un calcul **impur** qui s'execute pour ses effets de bord (DOM, logs, requetes, etc.).

### Ligne par ligne

```typescript
const c: Computation = {
  fn,
  state: DIRTY,           // Doit s'executer immediatement
  sources: null,           // Pas encore de dependances
  sourceSlots: null,
  owned: null,             // Pas encore d'enfants
  cleanups: null,          // Pas encore de nettoyages
  owner: Owner,            // Attache au proprietaire courant
  context: null,
  pure: false,             // C'est un EFFET, pas un memo
  updatedAt: null,
};
```
Cree le noeud `Computation` avec `pure: false` (c'est un effet, pas un memo).

```typescript
if (Owner) {
  if (!Owner.owned) Owner.owned = [c];
  else Owner.owned.push(c);
}
```
**Rattachement a l'arbre de propriete.** Le calcul est ajoute aux enfants possedes du `Owner` courant. Quand le `Owner` sera dispose, tous ses enfants seront nettoyes.

```typescript
const SC = _SuspenseContext && useContext(_SuspenseContext);
if (SC) {
  c.suspense = SC;
}
```
Si on est dans une frontiere Suspense, l'effet est estampille avec cette frontiere. Cela permet de le suspendre/reprendre quand la resource se resout.

```typescript
runComputation(c, value);
```
**Execution immediate.** L'effet s'execute tout de suite a la creation (pas d'attente, pas de defer).

```typescript
return () => {
  dispose(c);
};
```
Retourne une fonction de nettoyage qui detruit le calcul et tous ses enfants.

---

## 7. runComputation — Execution d'un Calcul

```typescript
function runComputation(c: Computation, value: any): void
```

Fonction interne qui execute un calcul (effet). C'est le moteur d'execution principal.

### Ligne par ligne

```typescript
if (c.sources) {
  for (const source of c.sources) {
    const observers = signalObservers.get(source);
    if (observers) {
      observers.delete(c);
    }
  }
  c.sources = null;
  c.sourceSlots = null;
}
```
**Nettoyage des anciennes souscriptions.** Avant de re-executer, on supprime ce calcul de la liste d'observateurs de tous ses anciens signaux-sources. Puis on reinitialise `sources`. Lors de la re-execution, les nouvelles lectures de signaux recreeront les souscriptions. C'est le mecanisme qui permet aux dependances de changer dynamiquement d'une execution a l'autre.

```typescript
if (c.owned) {
  for (let i = 0; i < c.owned.length; i++) {
    dispose(c.owned[i]);
  }
  c.owned = null;
}
```
**Nettoyage des calculs enfants.** Tous les effets/memos crees PENDANT l'execution precedente sont detruits. Lors de la re-execution, ils seront recreees.

```typescript
const prevListener = Listener;
const prevOwner = Owner;
Listener = c;
Owner = c as any;
ExecCount++;
```
**Sauvegarde et remplacement du contexte.** `Listener` est mis a ce calcul (pour que les lectures de signaux s'enregistrent). `Owner` est mis a ce calcul (pour que les enfants crees pendant l'execution soient possedes par ce calcul). On sauvegarde les anciens pour les restaurer apres.

```typescript
if (ExecCount > MAX_ITERATIONS) {
  ExecCount = 0;
  throw new Error('Potential infinite loop detected...');
}
```
Protection contre les boucles infinies.

```typescript
try {
  const result = c.fn(value);
```
Execute la fonction de l'effet avec la valeur precedente comme argument.

```typescript
  if (typeof result === 'function') {
    if (!c.cleanups) c.cleanups = [result];
    else c.cleanups.push(result);
  }
```
Si la fonction retourne une autre fonction, elle est enregistree comme **cleanup**. C'est le patron `createEffect(() => { /* setup */; return () => { /* cleanup */ }; })`.

```typescript
  c.state = CLEAN;
```
Marque le calcul comme propre apres execution reussie.

```typescript
} catch (err) {
  if (isPromise(err)) {
    const ctx = _SuspenseContext && useContext(_SuspenseContext);
    if (ctx) {
      ctx.increment();
      (err as Promise<unknown>).finally(() => ctx.decrement());
      if (c.suspense) ctx.effects.push(c);
    }
    return;
  }
  handleError(err as Error);
```
**Integration Suspense.** Si l'erreur attrapee est une `Promise` (lancee par une resource en `pending`), on l'enregistre aupres de la frontiere Suspense : `increment` au debut, `decrement` quand la promesse se resout. L'effet est ajoute a la file pour etre repris plus tard via `resumeEffects`.

```typescript
} finally {
  Listener = prevListener;
  Owner = prevOwner;
}
```
**Restauration du contexte.** Critique — sans cela, les calculs suivants auraient le mauvais `Owner` et `Listener`.

---

## 8. updateComputation — Mise a Jour d'un Calcul

```typescript
function updateComputation(c: Computation): void
```

Appelee quand un signal change pour re-executer un calcul sale.

```typescript
if (!c.fn) return;
if (c.state === CLEAN) return;
```
Garde : ne rien faire si le calcul est deja propre.

```typescript
if (c.state === DIRTY || c.state === STALE) {
  if (c.cleanups) {
    for (let i = 0; i < c.cleanups.length; i++) {
      c.cleanups[i]();
    }
    c.cleanups = null;
  }
```
**Execute les cleanups** avant la re-execution. C'est ici que les fonctions de nettoyage retournees par les effets sont appelees.

```typescript
  if (c.owned) {
    for (let i = 0; i < c.owned.length; i++) {
      dispose(c.owned[i]);
    }
    c.owned = null;
  }
```
Detruit les calculs enfants de l'execution precedente.

```typescript
  if (c.renderEffect) {
    runRenderComputation(c);
  } else {
    runComputation(c, c.value);
  }
}
```
Delegue a `runRenderComputation` pour les effets de rendu, sinon `runComputation` standard.

---

## 9. dispose — Nettoyage d'un Calcul

```typescript
function dispose(c: Computation): void
```

Detruit completement un calcul et toute sa descendance.

```typescript
if (c.sources) {
  for (const source of c.sources) {
    const observers = signalObservers.get(source);
    if (observers) {
      observers.delete(c);
    }
  }
}
```
Supprime ce calcul de la liste d'observateurs de tous ses signaux-sources. Les signaux ne le notifieront plus.

```typescript
if (c.cleanups) {
  for (let i = 0; i < c.cleanups.length; i++) {
    c.cleanups[i]();
  }
}
```
Execute toutes les fonctions de nettoyage enregistrees.

```typescript
if (c.owned) {
  for (let i = 0; i < c.owned.length; i++) {
    dispose(c.owned[i]);
  }
}
```
**Nettoyage recursif.** Tous les calculs enfants sont detruits aussi. C'est ce qui garantit que detruire une racine nettoie tout l'arbre en dessous.

```typescript
if (c.owner && c.owner.owned) {
  const index = c.owner.owned.indexOf(c);
  if (index !== -1) {
    c.owner.owned.splice(index, 1);
  }
}
```
Se retire de la liste des enfants de son proprietaire.

---

## 10. createMemo — Creation d'un Memo

```typescript
export function createMemo<T>(
  fn: ComputationFn<T>,
  value?: T,
  options?: MemoOptions<T>
): Accessor<T>
```

Un memo est un **calcul pur** : il derive une valeur a partir d'autres signaux et la met en cache. Il se comporte comme un signal en lecture seule.

### Creation du Computation

```typescript
const c: Computation = {
  fn,
  state: DIRTY,
  // ...
  pure: true,       // MEMO = pur, pas d'effets de bord
  accessor: undefined,  // Sera assigne apres
};
```
`pure: true` est ce qui distingue un memo d'un effet. Les memos ne sont executes que quand ils sont lus (evaluation paresseuse).

### `read()` — Fonction de Lecture du Memo

```typescript
const read: Accessor<T> = () => {
  // Enregistrement comme source
  if (Listener && Listener !== c) {
    if (!Listener.sources) {
      Listener.sources = [read as any];
    } else if (Listener.sources.indexOf(read as any) === -1) {
      Listener.sources.push(read as any);
    }
    const memoAsSignal = read as any;
    if (!signalObservers.has(memoAsSignal)) {
      signalObservers.set(memoAsSignal, new Set());
    }
    const observers = signalObservers.get(memoAsSignal);
    if (observers) {
      observers.add(Listener);
    }
  }
```
Le memo **s'enregistre comme source** exactement comme un signal. Le calcul appelant (`Listener`) est ajoute comme observateur du memo.

```typescript
  if (c.state !== CLEAN) {
    // Nettoyage des anciennes souscriptions
    if (c.sources) {
      for (const source of c.sources) {
        const observers = signalObservers.get(source);
        if (observers) observers.delete(c);
      }
      c.sources = null;
    }

    const prevListener = Listener;
    const prevOwner = Owner;
    Listener = c;
    Owner = c as any;
```
Si le memo est sale, on le recalcule. On sauvegarde/remplace `Listener` et `Owner` comme pour les effets.

```typescript
    try {
      const nextValue = (c.fn as ComputationFn<T>)(c.value);
      const equals = node.equals || defaultEquals;
      const hasChanged = options?.equals === false || !equals(c.value as T, nextValue);

      if (hasChanged) {
        c.value = nextValue;
        node.value = nextValue;
        node.version++;
```
Calcule la nouvelle valeur. Si elle a change (selon la fonction d'egalite), met a jour et incremente la version.

```typescript
        // Propage DIRTY aux observateurs du memo
        const memoAsSignal = read as any;
        const observers = signalObservers.get(memoAsSignal);
        if (observers && observers.size > 0) {
          // ... propagateDirty (meme logique que dans write du signal)
        }
```
**Point crucial :** si la valeur du memo change, tous ses observateurs sont marques `DIRTY` et les effets sont re-executes. C'est la propagation transitive qui permet `signal → memo → memo → effet`.

```typescript
      c.state = CLEAN;
    } catch (err) {
      if (isPromise(err)) {
        // Integration Suspense pour les memos
        const ctx = _SuspenseContext && useContext(_SuspenseContext);
        if (ctx) { ctx.increment(); err.finally(() => ctx.decrement()); }
        return c.value as T;  // Retourne l'ancienne valeur en attendant
      }
    } finally {
      Listener = prevListener;
      Owner = prevOwner;
    }
```
En cas de promesse lancee (Suspense), le memo retourne sa valeur precedente plutot que de planter.

### Initialisation Immediate

```typescript
const prevListenerInit = Listener;
const prevOwnerInit = Owner;
Listener = c;
Owner = c as any;
try {
  const v = (c.fn as ComputationFn<T>)(c.value);
  c.value = v;
  node.value = c.value;
  c.state = CLEAN;
} finally {
  Listener = prevListenerInit;
  Owner = prevOwnerInit;
}
```
Le memo est **calcule immediatement** a la creation (pas paresseux pour la premiere valeur). Cela etablit les souscriptions initiales aux signaux lus pendant le premier calcul.

### Marquage

```typescript
Object.defineProperty(read, $SIGNAL, { value: true, enumerable: true });
Object.defineProperty(read, $MEMO, { value: true, enumerable: true });
```
Un memo porte DEUX marqueurs : `$SIGNAL` (il se comporte comme un signal en lecture) ET `$MEMO` (pour le distinguer).

---

## 11. batch / flushUpdates — Systeme de Regroupement

### `batch(fn)`

```typescript
export function batch<T>(fn: () => T): T {
  if (Updates) return fn();  // Deja en mode batch, pas de double-batch
  Updates = [];
  Effects = [];
  try {
    return fn();
  } finally {
    flushUpdates();
  }
}
```
Active le mode **batch** : toutes les ecritures de signaux pendant `fn()` accumulent les calculs sales dans `Updates` au lieu de les executer immediatement. A la fin, `flushUpdates` les execute en une seule passe. Cela evite les re-rendus intermediaires.

### `flushUpdates()`

```typescript
function flushUpdates(): void {
  if (Pending) return;  // Evite la reentrance
  Pending = true;
  ExecCount = 0;

  try {
    if (Updates) {
      const updates = Updates;
      Updates = null;  // Reinitialise AVANT l'execution (permet les ecritures imbriquees)
      if (updates.length > 0) {
        for (let i = 0; i < updates.length; i++) {
          const comp = updates[i];
          if (!comp.pure) {        // Seuls les effets, pas les memos
            updateComputation(comp);
          }
        }
      }
    }
```
Execute les mises a jour accumulees. `Updates` est mis a `null` AVANT l'execution pour permettre aux effets de creer de nouvelles ecritures sans re-entrer dans le meme batch.

```typescript
    if (Effects) {
      const effects = Effects;
      Effects = null;
      if (effects.length > 0) {
        for (let i = 0; i < effects.length; i++) {
          updateComputation(effects[i]);
        }
      }
    }
  } finally {
    Pending = false;
  }
}
```
Execute ensuite les effets de la file secondaire, puis remet `Pending = false`.

---

## 12. createRoot — Racine de Propriete

```typescript
export function createRoot<T>(fn: (dispose: () => void) => T): T
```

Cree une **racine de propriete** — un scope dans lequel tous les calculs crees seront attaches et pourront etre detruits ensemble.

```typescript
const owner: RootOwner = {
  owned: null,
  cleanups: null,
  contexts: null,
  owner: Owner,  // La racine est enfant du Owner courant
};

const prevOwner = Owner;
Owner = owner;  // Tous les calculs crees pendant fn() seront possedes par cette racine
```
Cree un nouveau `RootOwner` et le definit comme `Owner` courant.

```typescript
try {
  return fn(() => {
    // Fonction de dispose passee en argument
    if (owner.owned) {
      for (let i = 0; i < owner.owned.length; i++) {
        dispose(owner.owned[i]);
      }
    }
    if (owner.cleanups) {
      for (let i = 0; i < owner.cleanups.length; i++) {
        owner.cleanups[i]();
      }
    }
  });
} finally {
  Owner = prevOwner;
}
```
La fonction `fn` recoit une fonction `dispose` qui nettoie tous les enfants et cleanups de la racine. Dans le `finally`, on restaure `Owner` au precedent.

---

## 13. untrack — Desactivation du Suivi

```typescript
export function untrack<T>(fn: () => T): T {
  const prevListener = Listener;
  Listener = null;      // Plus de suivi des dependances
  try {
    return fn();
  } finally {
    Listener = prevListener;
  }
}
```
Execute `fn` sans que les lectures de signaux ne creent de dependances. Utile pour lire un signal sans creer de re-execution automatique. En mettant `Listener = null`, les signaux lus ne voient aucun observateur a enregistrer.

---

## 14. onCleanup — Enregistrement de Nettoyage

```typescript
export function onCleanup(fn: Cleanup): void {
  if (Owner) {
    if (!Owner.cleanups) Owner.cleanups = [fn];
    else Owner.cleanups.push(fn);
  }
}
```
Enregistre une fonction de nettoyage sur le `Owner` courant. Elle sera appelee quand le `Owner` sera dispose. C'est l'equivalent de `useEffect(() => { return cleanup }, [])` en React, mais ici c'est lie au systeme de propriete, pas au composant.

---

## 15. createSelector — Selecteur Optimise

```typescript
export function createSelector<T, U = T>(
  source: () => T,
  fn?: (key: U, value: T) => boolean
): (key: U) => boolean
```

Cree un selecteur optimise pour des listes. Au lieu de re-rendre toute la liste quand la selection change, seuls les elements affectes sont mis a jour.

```typescript
const map = new Map<U, Signal<boolean>>();

createEffect(() => {
  const value = source();
  for (const [key, signal] of map) {
    const [get, set] = signal;
    const match = fn(key, value);
    if (get() !== match) set(match);  // Ne met a jour que si le match change
  }
});
```
Cree un effet qui surveille la source. Pour chaque cle enregistree, il verifie si le match a change et ne met a jour que les signaux concernes.

```typescript
return (key: U): boolean => {
  let signal = map.get(key);
  if (!signal) {
    const [get, set] = createSignal(false);
    signal = [get, set];
    map.set(key, signal);
    const value = source();
    set(fn(key, value));
  }
  return signal[0]();
};
```
La fonction retournee cree un signal par cle a la premiere utilisation, puis lit ce signal. Seuls les signaux des cles dont le match change sont mis a jour → performance O(1) par changement au lieu de O(n).

---

## 16. createResource — Ressource Asynchrone Reactive

```typescript
export function createResource<T, S = true>(
  source: Accessor<S> | S,
  fetcherFn?: ResourceFetcher<T, S>,
  options?: { initialValue?: T; name?: string; storage?: string }
): ResourceReturn<T>
```

Cree une **ressource reactive** — un signal dont la valeur est chargee de maniere asynchrone.

### Normalisation des Arguments

```typescript
if (typeof fetcherFn === 'function') {
  // Forme a deux arguments : createResource(source, fetcher)
  s = typeof source === 'function' ? (source as () => S) : () => source as S;
  fetcher = fetcherFn;
} else {
  // Forme a un argument : createResource(fetcher)
  s = () => true as S;
  fetcher = source as ResourceFetcher<T, S>;
}
```
Supporte deux formes d'appel. Dans la forme a un argument, la source est `() => true` (toujours active).

### Signaux Internes

```typescript
const [value, setValue] = createSignal<T | undefined>(options.initialValue, { equals: false });
const [error, setError] = createSignal<any>(undefined, { equals: false });
const [state, setState] = createSignal<ResourceState>(..., { equals: false });
const [promise, setPromise] = createSignal<Promise<T> | undefined>(undefined, { equals: false });
const [track, trigger] = createSignal(undefined, { equals: false });
```
Cinq signaux internes avec `equals: false` (notifient toujours). `track`/`trigger` permettent le refetch manuel.

### Effet de Chargement

```typescript
createEffect(() => {
  const val = s ? s() : (source as S);
  track();  // Suivi du refetch manuel
```
L'effet suit la source reactive ET le trigger de refetch. Quand l'un ou l'autre change, le fetcher est re-execute.

```typescript
  if (val === false || val === null || val === undefined) {
    batch(() => {
      setState('unresolved');
      setPromise(undefined);
      setError(undefined);
    });
    return;
  }
```
Si la source est falsy, la resource est desactivee.

```typescript
  let cancelled = false;
  onCleanup(() => (cancelled = true));
```
**Patron d'annulation.** Si l'effet se re-execute avant que la promesse ne se resolve, le flag `cancelled` empeche la mise a jour de l'etat avec des donnees obsoletes.

```typescript
  const res = fetcher!(val, { value: currentValue, refetching: isRefreshing });

  if (isPromise(res)) {
    setPromise(res);
    res.then(
      (v) => {
        if (cancelled) return;  // Ignore si annule
        batch(() => {
          setValue(() => v);
          setState('ready');
          setPromise(undefined);
        });
      },
      (e) => {
        if (cancelled) return;
        batch(() => {
          setError(e);
          setState('errored');
          setPromise(undefined);
        });
      }
    );
```
Execute le fetcher. Si le resultat est une promesse, enregistre les callbacks `.then()` pour mettre a jour les signaux.

```typescript
    const suspenseCtx = _SuspenseContext && useContext(_SuspenseContext);
    if (suspenseCtx) {
      suspenseCtx.increment();
      res.finally(() => suspenseCtx.decrement());
    }
```
**Integration Suspense.** Si on est dans une frontiere Suspense, la resource s'auto-enregistre : `increment` au debut du chargement, `decrement` quand la promesse se resout.

### Accesseur de Resource

```typescript
const resource = (() => {
  const e = error();
  if (e) throw e;
  const s = state();
  if (s === 'pending' || s === 'refreshing') {
    const p = promise();
    if (p) throw p;  // Lance la promesse pour Suspense
  }
  return value();
}) as Resource<T>;
```
L'accesseur de la resource :
1. Si erreur → la lance (pour les error boundaries)
2. Si en attente → lance la promesse (pour Suspense)
3. Sinon → retourne la valeur

Les proprietes `.state`, `.loading`, `.error`, `.latest` sont definies comme getters reactifs via `Object.defineProperties`.

---

## 17. createDeferred — Signal Differe

```typescript
export function createDeferred<T>(
  source: Accessor<T>,
  options?: { timeoutMs?: number; equals?: false | EqualityFn<T> }
): Accessor<T>
```

Cree un signal derive qui se met a jour avec un delai. Utilise `requestIdleCallback` par defaut ou un `setTimeout` personnalise. Utile pour les mises a jour de basse priorite qui ne doivent pas bloquer le thread principal.

---

## 18. getOwner / runWithOwner — Gestion du Proprietaire

### `getOwner()`
```typescript
export function getOwner(): RootOwner | null {
  return Owner;
}
```
Retourne le `Owner` courant. Utile pour capturer le Owner dans un callback asynchrone.

### `runWithOwner(owner, fn)`
```typescript
export function runWithOwner<T>(owner: RootOwner | null, fn: () => T): T {
  const prevOwner = Owner;
  Owner = owner;
  try {
    return fn();
  } finally {
    Owner = prevOwner;
  }
}
```
Execute `fn` avec un `Owner` specifique. Tous les calculs crees pendant `fn()` seront possedes par `owner`. Le `Owner` precedent est restaure dans `finally`.

**Cas d'utilisation :** restaurer le contexte de propriete dans un callback asynchrone. Par exemple :
```typescript
const owner = getOwner();
setTimeout(() => {
  runWithOwner(owner, () => {
    createEffect(() => { ... }); // Cet effet sera correctement possede
  });
}, 1000);
```

---

## 19. createContext / createProvider / useContext — Systeme de Contexte

### `createContext(defaultValue)`

```typescript
export function createContext<T>(defaultValue?: T) {
  const id = Symbol('context');        // Identifiant unique
  const Provider = createProvider(id);  // Fabrique le composant Provider
  return { id, Provider, defaultValue };
}
```
Cree un contexte avec un `Symbol` unique. Le `Provider` est une fonction qui injecte la valeur dans l'arbre de propriete.

### `createProvider(id)`

```typescript
export function createProvider<T>(id: symbol) {
  return (props: { value: T; children: any }) => {
```
Retourne une fonction Provider qui accepte `value` et `children`.

```typescript
    const ctxOwner: RootOwner = {
      owner: Owner,
      owned: null,
      cleanups: null,
      contexts: new Map(),
    };
    ctxOwner.contexts!.set(id, props.value);
```
Cree un noeud `RootOwner` avec une `Map` de contextes. La valeur du Provider est stockee dans cette Map avec le `Symbol` du contexte comme cle.

```typescript
    if (Owner) {
      if (!Owner.owned) Owner.owned = [];
      Owner.owned.push(ctxOwner as any);
    }
```
Rattache `ctxOwner` comme enfant du `Owner` courant (pour le nettoyage).

```typescript
    if (Owner) {
      if (!(Owner as any).contexts) (Owner as any).contexts = new Map();
      (Owner as any).contexts.set(id, props.value);
    }
```
**Double enregistrement.** Met aussi le contexte sur le `Owner` courant directement, pour les lookups qui ne passent pas par `runWithOwner`.

```typescript
    const children = props.children;
    if (typeof children === 'function' && !isSignal(children)) {
      return runWithOwner(ctxOwner, () => untrack(() => children()));
    }
    return children;
  };
}
```
**Point crucial :** les enfants sont executes sous `runWithOwner(ctxOwner, ...)`. Ainsi, tout calcul cree par les enfants aura `ctxOwner` dans sa chaine de propriete, et `useContext` pourra trouver la valeur. On appelle `children()` une seule fois — PAS `resolveProviderChildren` qui pourrait declencher des boucles infinies avec les composants lazy.

### `useContext(context)`

```typescript
export function useContext<T>(context: { id: symbol; defaultValue?: T }): T | undefined {
  let owner = Owner;
  while (owner) {
    if (owner.contexts && owner.contexts.has(context.id)) {
      return owner.contexts.get(context.id) as T;
    }
    owner = owner.owner;
  }
  if (!context) return;
  return context.defaultValue;
}
```
Remonte la chaine `owner → owner.owner → ...` en cherchant un noeud qui a `contexts` (une `Map`) contenant le `Symbol` du contexte. Si aucun Provider n'est trouve, retourne `defaultValue`.

**Point critique :** seuls les noeuds `RootOwner` ont `contexts` (pluriel, `Map`). Les `Computation` ont `context` (singulier). Sauf si on ajoute manuellement `contexts` a un `Computation` (comme dans `devComponent` avec `contexts: null`).

---

## 20. createRenderEffect / runRenderComputation — Effet de Rendu

### `createRenderEffect(fn, value, options)`

```typescript
export function createRenderEffect<T>(
  fn: (prev: T) => T,
  value?: T,
  options?: EffectOptions
): () => void
```

Similaire a `createEffect` mais s'execute **pendant la phase de rendu** (synchrone, pas differe). La fonction recoit la valeur precedente et retourne la suivante : `fn(prev) => next`.

```typescript
const c: Computation = {
  fn: fn as any,
  state: DIRTY,
  // ...
  pure: false,
  renderEffect: true,  // Marqueur qui distingue des effets normaux
};
```
`renderEffect: true` fait que `updateComputation` appelle `runRenderComputation` au lieu de `runComputation`.

```typescript
runRenderComputation(c);  // Execution IMMEDIATE et synchrone
return () => { dispose(c); };
```

### `runRenderComputation(c)`

```typescript
function runRenderComputation(c: Computation): void
```

Similaire a `runComputation` avec des differences :

```typescript
// Nettoyage des anciennes souscriptions
if (c.sources) { ... }

// Execute et nettoie les cleanups de l'execution precedente
if (c.cleanups) {
  for (let i = 0; i < c.cleanups.length; i++) {
    c.cleanups[i]();
  }
  c.cleanups = null;
}

// Dispose les calculs enfants
if (c.owned) { ... }
```
Les cleanups sont executes AVANT la re-execution (pas seulement dans `dispose`).

```typescript
try {
  const result = (c.fn as (prev: any) => any)(c.value);
  if (typeof result === 'function') {
    if (!c.cleanups) c.cleanups = [];
    c.cleanups.push(result);
  }
  c.value = result;
  c.state = CLEAN;
```
Execute la fonction avec la valeur precedente. Si le resultat est une fonction, elle est enregistree comme cleanup. La valeur est stockee pour la prochaine execution.

---

## 21. createReaction — Reaction Manuelle

```typescript
export function createReaction(onInvalidate: () => void): (fn: () => void) => void
```

Cree une reaction en deux etapes :
1. **Phase de suivi** : on appelle la fonction retournee avec un `fn` qui lit des signaux
2. **Phase de reaction** : quand les signaux lus changent, `onInvalidate` est appelee

```typescript
return (fn: () => void) => {
  if (trackingComp) dispose(trackingComp);  // Nettoie l'ancien suivi

  trackingComp = {
    fn: onInvalidate,  // C'est CETTE fonction qui sera appelee quand les deps changent
    state: DIRTY,
    // ...
  };

  const prevListener = Listener;
  Listener = trackingComp;  // Les lectures pendant fn() s'enregistrent
  try {
    fn();                    // Phase de suivi — lit des signaux
    trackingComp.state = CLEAN;
  } finally {
    Listener = prevListener;
  }
};
```
`fn()` est executee pour **collecter les dependances** (pas pour ses effets de bord). Quand ces dependances changent, `onInvalidate` est executee.

---

## 22. on — Suivi Explicite de Dependances

```typescript
export function on<T extends readonly unknown[], U>(
  deps: () => [...T],
  fn: (values: [...T], prev?: U) => U,
  options?: { defer?: boolean }
): (prev?: U) => U
```

Retourne une fonction qui lit explicitement les dependances (`deps()`) avec suivi, puis execute `fn` en mode `untrack` (sans suivi). Utile pour controler exactement quelles dependances declenchent un effet.

```typescript
return (prev?: U) => {
  const values = deps();  // Lecture AVEC suivi
  if (defer && isFirst) {
    isFirst = false;
    return prev as U;     // En mode defer, skip la premiere execution
  }
  return untrack(() => fn(values, prev));  // Execution SANS suivi
};
```

**Utilisation typique :**
```typescript
createEffect(on(
  () => [count()],              // Dependance explicite
  ([c]) => console.log(c),     // Execute quand count change
  { defer: true }              // Skip la premiere execution
));
```

---

## 23. Transitions — startTransition / useTransition

### `startTransition(fn)`

```typescript
export function startTransition(fn: () => void): Promise<void>
```

Execute `fn` dans un contexte de transition basse priorite. Les mises a jour sont regroupees et executees apres le travail courant.

```typescript
const transition: TransitionState = {
  pending: true,
  startTime: Date.now(),
  timeoutMs: 5000,
  updates: new Set(),
};

const prevTransition = currentTransition;
currentTransition = transition;
try {
  fn();  // Les effets crees ici sont marques comme transition
} finally {
  currentTransition = prevTransition;
}

batch(() => {
  transition.pending = false;
  transition.updates.forEach((update) => update());
  transition.updates.clear();
  resolve();
});
```

### `useTransition()`

```typescript
export function useTransition(): [() => boolean, (fn: () => void) => Promise<void>]
```

Retourne un signal `isPending` et une fonction `start` qui wrap `startTransition` avec gestion de l'etat pending.

---

## 24. Suspense — getSuspenseContext / resumeEffects / trackPromise

### `getSuspenseContext()`

```typescript
export function getSuspenseContext(): Context<SuspenseContextType | undefined>
```

Retourne le contexte Suspense, cree de maniere **paresseuse** (lazy-init) pour eviter les problemes d'ordre d'initialisation des modules.

### `resumeEffects(effects)`

```typescript
export function resumeEffects(effects: Computation[]): void {
  const queued = effects.slice();
  effects.length = 0;
  for (const c of queued) {
    c.state = DIRTY;
    updateComputation(c);
  }
}
```
Reprend les effets suspendus apres la resolution d'une promesse. Marque chaque effet comme `DIRTY` et l'execute.

### `trackPromise(promise)`

```typescript
export function trackPromise<T>(promise: Promise<T>): Promise<T> {
  const ctx = _SuspenseContext && useContext(_SuspenseContext);
  if (!ctx) return promise;
  ctx.increment();
  promise.finally(() => ctx.decrement());
  return promise;
}
```
Enregistre manuellement une promesse aupres de la frontiere Suspense la plus proche.

### `onResolve(fn)` / `isSuspended()`

- `onResolve(fn)` : execute `fn` quand le Suspense se resout (ou immediatement si pas suspendu)
- `isSuspended()` : retourne `true` si on est dans un Suspense en fallback

---

## 25. devComponent — Composant en Mode Developpement

```typescript
export function devComponent<P, V>(Comp: (props?: P) => V, props?: P): V
```

Cree un **noeud de propriete** pour un composant en mode dev. Permet le debug et l'inspection.

```typescript
const c = {
  fn: () => Comp(props),
  // ...
  owner: Owner,
  context: null,
  contexts: null,  // NOTE: ajoute pour que useContext puisse potentiellement trouver des contextes
  pure: true,
} as unknown as Computation;

if (Owner) {
  if (!Owner.owned) Owner.owned = [c];
  else Owner.owned.push(c);
}

const prevOwner = Owner;
Owner = c as unknown as RootOwner;
try {
  return untrack(() => {
    Object.assign(Comp, { [$COMP]: true });
    return Comp(props);  // Execute le composant en mode untrack
  });
} finally {
  Owner = prevOwner;
}
```
Le composant s'execute en `untrack` (pas de suivi des dependances parentes) mais AVEC un Owner (pour que les effets/memos crees dedans soient correctement possedes). `Owner = c` fait que tous les calculs crees par le composant seront attaches a ce noeud.

---

## 26. Utilitaires Supplementaires

### `createEnhancedSignal(initialValue, options)`
Signal enrichi avec `subscribe`, `dispose`, et `toObservable`. Utile pour l'interoperabilite avec des systemes non-reactifs.

### `createAsyncSignal(initialValue, asyncFn, options)`
Signal avec une fonction asynchrone integree. Fournit `loading()`, `error()`, et `execute()`.

### `createSignalWithHistory(initialValue, options)`
Signal avec historique undo/redo. Maintient un tableau d'etats et un index courant.

### `createTrigger()`
Signal sans valeur significative — sert uniquement a declencher des re-executions manuellement.

### `createDerivedTrigger(fn, options)`
Trigger derive d'une expression reactive. Se declenche uniquement quand la valeur change.

### `createLazySignal(fn, options)`
Signal qui ne calcule sa valeur qu'a la premiere lecture. Optimisation pour les valeurs couteuses.

### `createThrottledSignal(signal, delay)` / `createDebouncedSignal(signal, delay)`
Signaux avec controle de frequence de mise a jour.

### `signalToObservable(signal)` / `observableToSignal(observable, initialValue)`
Ponts bidirectionnels entre le systeme reactif et les Observables RxJS-like.

### `isSignal(value)` / `isMemo(value)` / `isResource(value)`
Fonctions de detection de type basees sur les symboles `$SIGNAL`, `$MEMO`, `$RESOURCE`.

### `catchException(fn, handler)`
Gestionnaire d'erreurs contextuel. Les erreurs lancees pendant `fn()` sont capturees et passees a `handler`.

### `flush()`
Force l'execution de toutes les mises a jour en attente via une microtache.

### `setScheduler(scheduler)` / `scheduleMicrotask(fn)`
Permettent de remplacer l'ordonnanceur par defaut (utile pour les tests et le SSR).

---

## 27. Schema du Graphe Reactif

```
                    ┌─────────────┐
                    │  createRoot │  (RootOwner)
                    │  Owner chain│
                    └──────┬──────┘
                           │ owned
              ┌────────────┼────────────┐
              │            │            │
         ┌────▼────┐  ┌───▼────┐  ┌───▼────┐
         │ Effect  │  │  Memo  │  │Resource│
         │pure=false│  │pure=true│  │(Effect)│
         └────┬────┘  └───┬────┘  └───┬────┘
              │            │            │
              │  sources   │  sources   │  sources
              ▼            ▼            ▼
         ┌─────────┐  ┌─────────┐  ┌─────────┐
         │ Signal  │  │ Signal  │  │ Signal  │
         │ [r, w]  │  │ [r, w]  │  │ [r, w]  │
         └─────────┘  └─────────┘  └─────────┘

Flux de notification :

  Signal.write()
       │
       ▼
  signalObservers.get(signal) → Set<Computation>
       │
       ▼
  propagateDirty(comp)
       │
       ├─── comp.state = DIRTY
       │
       ├─── Si comp.pure (memo) → propage aux observateurs du memo
       │
       └─── Si !comp.pure (effet) → updateComputation(comp)

Arbre de propriete :

  RootOwner
    ├── Effect1  (owner = RootOwner)
    │     └── Effect1.1  (owner = Effect1, cree pendant Effect1)
    ├── Memo1    (owner = RootOwner)
    └── Provider (ctxOwner, contexts = Map{id → value})
          └── Effect2  (owner = ctxOwner)
                └── useContext → remonte : ctxOwner → RootOwner

Suivi des dependances (Listener) :

  createEffect(() => {
    // Listener = cet effet
    const v = count();      // count.read() → enregistre Listener comme observateur
    const m = doubled();    // doubled.read() → enregistre Listener comme observateur du memo
  });
  // Listener = null (restaure)
```

---

## Resume des Invariants Critiques

1. **`Listener`** determine qui est suivi. Mis a `null` = pas de suivi (`untrack`).
2. **`Owner`** determine la propriete. Tout calcul est enfant du `Owner` courant.
3. **`signalObservers`** est la table centrale signal → observateurs.
4. Les **memos sont paresseux** : ils ne se recalculent que quand on les lit (`c.state !== CLEAN`).
5. Les **effets sont immediats** : ils s'executent des la creation ET a chaque changement de dependance.
6. **`batch`** regroupe les mises a jour pour eviter les re-executions intermediaires.
7. **`dispose`** est recursif : detruire un Owner detruit tous ses enfants.
8. **`runWithOwner`** et `untrack` sauvegardent/restaurent toujours dans `finally`.
9. Les **resources lancent des promesses** pour s'integrer avec Suspense.
10. Le **contexte** utilise `RootOwner.contexts` (Map, pluriel) — pas `Computation.context` (singulier).
