# Guide Complet du Systeme de Store Reactif — store.ts

Ce document explique en detail chaque type, chaque symbole, chaque classe et chaque fonction du fichier `store.ts`. L'objectif est de donner une comprehension ligne par ligne du fonctionnement interne du store a reactivite fine (fine-grained reactivity).

---

## Table des Matieres

1. [Vue d'Ensemble — Qu'est-ce qu'un Store ?](#1-vue-densemble--quest-ce-quun-store-)
2. [Types et Interfaces](#2-types-et-interfaces)
3. [Symboles du Store](#3-symboles-du-store)
4. [DataNode — Signal Atomique de Propriete](#4-datanode--signal-atomique-de-propriete)
5. [StoreNode — Noeud Reactif d'un Sous-Arbre](#5-storenode--noeud-reactif-dun-sous-arbre)
6. [Le Proxy Handler — Coeur de la Reactivite Fine](#6-le-proxy-handler--coeur-de-la-reactivite-fine)
7. [StoreNode: Methodes de Mise a Jour](#7-storenode-methodes-de-mise-a-jour)
8. [StoreNode: Produce et Draft (Mutations Immuables)](#8-storenode-produce-et-draft-mutations-immuables)
9. [StoreNode: Reconciliation](#9-storenode-reconciliation)
10. [Classe Store — Facade Principale](#10-classe-store--facade-principale)
11. [Store: La Methode _set et mergeState](#11-store-la-methode-_set-et-mergestate)
12. [Store: Operations sur les Tableaux](#12-store-operations-sur-les-tableaux)
13. [Store: Propagation des Signaux (triggerPathSignals)](#13-store-propagation-des-signaux-triggerpathsignals)
14. [Store: Mise a Jour Recursive des Valeurs](#14-store-mise-a-jour-recursive-des-valeurs)
15. [Store: Select, Watch, Subscribe](#15-store-select-watch-subscribe)
16. [createStore — Fonction de Creation Principale](#16-createstore--fonction-de-creation-principale)
17. [createMutableStore / createComputedStore](#17-createmutablestore--createcomputedstore)
18. [Fonctions Utilitaires (wrap, unwrap, isStoreProxy, etc.)](#18-fonctions-utilitaires-wrap-unwrap-isstoreproxy-etc)
19. [Schema de l'Architecture du Store](#19-schema-de-larchitecture-du-store)
20. [Resume des Invariants Critiques](#20-resume-des-invariants-critiques)

---

## 1. Vue d'Ensemble — Qu'est-ce qu'un Store ?

Un store est un **objet d'etat reactif** avec une reactivite fine au niveau de chaque propriete. Contrairement a un signal simple qui contient une valeur atomique, un store gere un arbre d'etat complet (objets imbriques, tableaux) et ne notifie que les proprietes qui changent reellement.

**Principe fondamental :** le store utilise un `Proxy` JavaScript pour intercepter chaque acces en lecture (`get`) et chaque verification d'existence (`has`). Lors de la lecture d'une propriete, un `DataNode` (un signal interne) est cree pour cette propriete. Seuls les calculs qui ont lu cette propriete specifique sont re-executes quand elle change.

**Comparaison avec SolidJS :**
- SolidJS : `const [state, setState] = createStore({ user: { name: "John" } })`
- Fluixi : meme API, meme semantique — `state` est un proxy, `setState` est le setter

---

## 2. Types et Interfaces

### `Immutable<T>`
```typescript
type Immutable<T> = _Immutable<T> & { __track: T; [key: symbol]: any };
```
Transformation de type qui rend toutes les proprietes `readonly` en profondeur. Le champ `__track` est un marqueur phantom pour le suivi de type. Les proprietes symboliques (`[key: symbol]`) permettent les symboles internes (`$RAW`, `$PROXY`, etc.).

La transformation recursive `_Immutable<T>` gere :
- **Primitives** (`string`, `number`, etc.) → inchangees
- **Tableaux** → `ReadonlyArray<Immutable<U>>`
- **Map** → `ReadonlyMap`
- **Set** → `ReadonlySet`
- **Promesses** → `Promise<Immutable<N>>`
- **Objets** → `{ readonly [K]: Immutable<T[K]> }`

### `StoreSetter<T>`
```typescript
interface StoreSetter<T> extends SetterParamsType<T> {
  <V extends Callback<T> | T>(value: V): any;
  push: <P>(path: P, ...items: any[]) => void;
  pop: <P>(path?: P) => any;
  shift: <P>(path?: P) => any;
  insert: <P>(path: P, index: number, value: any) => void;
  splice: <P>(path: P, start: number, deleteCount: number, ...items: any[]) => any[];
  removeAt: <P>(path: P, index: number) => any[];
  $: <P>(key?: P) => Accessor<any>;
}
```
Le setter du store est enrichi avec des methodes de manipulation de tableaux (`push`, `pop`, `splice`, etc.) et un accesseur reactif `$` pour obtenir un signal d'une propriete specifique.

### `StoreOptions<T>`
```typescript
interface StoreOptions<T> {
  name?: string;         // Nom pour le debug
  immutable?: boolean;   // Mode immuable (defaut: false dans l'interface, true dans createStore)
  equals?: (a: T, b: T) => boolean;  // Fonction d'egalite personnalisee
}
```

### `DataNode`
```typescript
type DataNode = {
  (): any;              // Fonction de lecture (signal accessor)
  $(value?: any): void; // Fonction d'ecriture (signal setter)
};
```
Un `DataNode` est un signal simplifie : une fonction qu'on appelle pour lire (`node()`) et une methode `$` pour ecrire (`node.$(newValue)`). C'est la brique elementaire de la reactivite du store.

---

## 3. Symboles du Store

```typescript
export const $RAW = Symbol('store-raw');     // Acces a l'objet brut sous le proxy
export const $NODE = Symbol('store-node');   // Acces au StoreNode depuis le proxy
export const $HAS = Symbol('store-has');     // Verification d'existence de propriete
export const $SELF = Symbol('store-self');   // Suivi de la structure elle-meme
export const $TRACK = Symbol('store-track'); // Suivi explicite
export const $NAME = Symbol('store-name');   // Nom pour le debug
export const $STORE = Symbol('store-store'); // Marqueur de store
```

Ces symboles sont utilises comme cles speciales dans le proxy handler :

- **`$RAW`** : quand on accede a `proxy[$RAW]`, le proxy retourne l'objet `target` brut sans reactivite. C'est crucial pour obtenir l'etat actuel sans creer de dependances reactives.

- **`$NODE`** : retourne le `StoreNode` associe a ce proxy. Permet d'acceder aux methodes internes du noeud.

- **`$SELF`** : quand on accede a `proxy[$SELF]`, le proxy declenche le signal de structure (`SELF`) et retourne le proxy lui-meme. Utile pour forcer le suivi de la structure entiere.

- **`$PROXY`** (importe de `signal.ts`) : marque qu'un objet EST un proxy de store. Utilise par `isStoreProxy()` pour la detection.

---

## 4. DataNode — Signal Atomique de Propriete

```typescript
function createDataNode(initial?: any): DataNode {
  const [get, set] = createSignal(initial);
  const node = get as any as DataNode;
  node.$ = set;
  return node;
}
```

### Ligne par ligne

```typescript
const [get, set] = createSignal(initial);
```
Cree un signal standard du systeme reactif. `get` est l'accesseur (lecture avec suivi), `set` est le setter (ecriture avec notification).

```typescript
const node = get as any as DataNode;
node.$ = set;
```
Transforme l'accesseur en `DataNode` en attachant le setter comme methode `$`. Cela donne une interface compacte :
- `node()` → lit la valeur avec suivi des dependances
- `node.$(newValue)` → ecrit la nouvelle valeur et notifie les observateurs

**Pourquoi cette abstraction ?** Les `DataNode` sont crees a la volee pour chaque propriete accedee. Ils doivent etre legers. Plutot que de creer un objet wrapper, on reutilise directement la fonction accesseur du signal.

---

## 5. StoreNode — Noeud Reactif d'un Sous-Arbre

La classe `StoreNode<T>` represente **un noeud dans l'arbre d'etat**. Chaque objet ou tableau imbrique a son propre `StoreNode`.

### Proprietes

```typescript
class StoreNode<T> {
  public children = new Map<string | number | symbol, StoreNode<any>>();
```
**Map des enfants.** Chaque propriete objet qui a ete accedee a un `StoreNode` enfant ici. Par exemple, si `state.user` est accede, un enfant `StoreNode` pour `user` est cree dans `root.children`.

```typescript
  public signals = new Map<PropertyKey, DataNode>();
```
**Map des signaux de propriete.** Chaque propriete accedee a un `DataNode` (signal) ici. C'est le coeur de la reactivite fine : quand on lit `state.user.name`, un `DataNode` pour `"name"` est cree dans le `StoreNode` de `user`.

```typescript
  proxy: T;
```
**Le proxy stable.** C'est l'objet `Proxy` retourne quand on accede a ce noeud. Le meme proxy est reutilise a chaque acces (stabilite referentielle).

```typescript
  public SELF?: DataNode;
```
**Signal de structure.** Declenche quand la structure de l'objet change (ajout/suppression de propriete, changement de longueur de tableau). Distinct des signaux de propriete individuelle.

```typescript
  private proxies = new WeakMap<object, any>();
```
**Cache de proxys.** Mappe les valeurs brutes vers leurs proxys pour eviter de recreer un proxy a chaque acces.

```typescript
  private parent: StoreNode<any> | null = null;
```
**Reference vers le parent.** Permet de propager les notifications vers le haut de l'arbre.

```typescript
  private propSignals = new Map<PropertyKey, Accessor<any>>();
  private propSetters = new Map<PropertyKey, (v: any) => void>();
```
**Signaux de propriete secondaires.** Utilises par `getPropSignal` pour creer des signaux nommes avec le chemin complet (pour le debug).

```typescript
  public value: T;
```
**La valeur brute stockee.** C'est l'objet/tableau reel, mute en place lors des mises a jour.

### Constructeur

```typescript
constructor(
  _value: T,
  private path: string = '',
  parent: StoreNode<any> | null = null,
  private options: StoreOptions<any> = { immutable: true }
) {
  const value = deepClone(_value);
```
Clone en profondeur la valeur initiale pour eviter les mutations externes.

```typescript
  this.value = value;
  this.parent = parent;
```
Stocke la valeur et la reference au parent.

```typescript
  if (Array.isArray(value)) {
    this.SELF = createDataNode(value.length);
  } else {
    this.SELF = createDataNode();
  }
```
Cree le signal de structure `SELF`. Pour les tableaux, la valeur initiale est la longueur (pour detecter les changements de taille). Pour les objets, pas de valeur initiale.

```typescript
  this.value = this.getDataNode(path, value)();
```
Cree un `DataNode` pour le chemin racine de ce noeud et lit sa valeur. Cela initialise le signal et enregistre la valeur.

```typescript
  this.proxy = this.createProxy(value);
}
```
Cree le proxy reactif pour cette valeur.

### `getPropSignal(key, _value?)`

```typescript
getPropSignal(key: PropertyKey, _value?: any) {
  let signal = this.propSignals.get(key);
  let setter = this.propSetters.get(key);
  let value = _value;
  if (!signal || !setter) {
    if (!value && this.value) {
      if (typeof this.value === 'object') {
        if (key in this.value) {
          value = (this.value as any)[key];
        }
      }
    }
    [signal, setter] = createSignal(value, {
      name: this.options.name
        ? `${this.options.name}${this.path}.${String(key)}`
        : undefined,
    });
    this.propSignals.set(key, signal);
    this.propSetters.set(key, setter);
  }
  return [signal, setter] as const;
}
```

Obtient ou cree un couple `[signal, setter]` pour une propriete donnee. Si le signal n'existe pas encore :
1. Determine la valeur initiale a partir de `_value` ou de `this.value[key]`
2. Cree un `createSignal` avec un nom de debug optionnel
3. Met en cache dans `propSignals` et `propSetters`

### `getDataNode(key, initial?)`

```typescript
private getDataNode(key: PropertyKey, initial?: any): DataNode {
  let node = this.signals.get(key);
  if (!node) {
    node = createDataNode(initial);
    this.signals.set(key, node);
  }
  return node;
}
```

Obtient ou cree un `DataNode` (signal compact) pour une propriete. C'est la methode appelee par le proxy handler lors de chaque lecture de propriete. Si le `DataNode` n'existe pas, il est cree avec la valeur initiale et mis en cache dans `signals`.

### `get()`

```typescript
get() {
  const value = this.value;
  if (this.value && typeof value === 'object') {
    return (this.value as any)[$RAW];
  }
  return value;
}
```

Retourne la valeur brute. Pour les objets, accede via `$RAW` pour bypasser le proxy.

### `getRaw()`

```typescript
getRaw(): T {
  return (this.proxy as any)[$RAW];
}
```

Retourne la valeur brute en passant par le proxy. `proxy[$RAW]` est intercepte par le handler qui retourne `target` directement.

### `set(newValue, signal?)`

```typescript
set(newValue: T | ((prev: T) => T), signal = true): void {
  if (typeof newValue === 'function') {
    newValue = (newValue as (prev: T) => T)(this.value);
  }
  this.updateValue(newValue as T, signal);
}
```

Met a jour la valeur du noeud. Supporte le patron fonctionnel `set(prev => newValue)`. Le parametre `signal` controle si les observateurs sont notifies.

### `updateValue(newValue, signal?)`

```typescript
private updateValue(newValue: T, signal = true): void {
  const oldValue = this.value;
  if (deepEqual(oldValue, newValue)) return;
```
Compare en profondeur l'ancienne et la nouvelle valeur. Si elles sont egales, rien ne se passe.

```typescript
  this.value = newValue;
```
Met a jour la valeur stockee.

```typescript
  if (signal) {
    if (this.parent && this.path) {
      const pathParts = this.path.split('.');
      const propertyKey = pathParts[pathParts.length - 1];
      const dataNode = this.parent.signals.get(propertyKey);
      if (dataNode) {
        dataNode.$(newValue);
      }
    }
```
**Notification vers le parent.** Si ce noeud a un parent, on trouve le `DataNode` correspondant a la cle de ce noeud dans les signaux du parent et on le declenche avec la nouvelle valeur. C'est ainsi que `state.user.name` notifie les observateurs de `name`.

```typescript
    } else if (!this.parent && !this.path) {
      for (const [key, dataNode] of this.signals.entries()) {
        if (typeof key === 'string' || typeof key === 'number') {
          const value = (newValue as any)[key];
          if (value !== undefined) {
            dataNode.$(value);
          }
        }
      }
    }
```
**Noeud racine.** Si c'est la racine sans parent, on notifie TOUS les `DataNode` directs avec leurs nouvelles valeurs.

```typescript
    if (this.parent && Array.isArray(this.parent.value)) {
      const [, parentSetter] = this.parent.getPropSignal(this.parent.path);
      parentSetter(this.parent.value);
      const [, iteratorSetter] = this.parent.getPropSignal(Symbol.iterator);
      iteratorSetter(this.parent.value);
    }
  }
```
**Notification speciale pour les tableaux.** Quand un element de tableau change, on notifie aussi le signal du parent et le signal iterateur. Cela permet aux boucles `For` de se re-executer.

```typescript
  this.children.clear();
}
```
Vide le cache des enfants — ils seront recrees a la demande avec les nouvelles valeurs.

### `getProxy()`

```typescript
getProxy(): T {
  if (this.value && typeof this.value === 'object') {
    const proxy = this.proxies.get(this.value);
    if (proxy) return proxy;
  }
  return this.value;
}
```

Retourne le proxy en cache pour la valeur courante, ou la valeur brute si c'est une primitive.

### `getNode(path)`

```typescript
getNode<P>(path: P): StoreNode<T> | null {
  const parts = (path as string).split('.');
  let current: StoreNode<T> = this;
  for (const part of parts) {
    const child = current.children.get(part);
    if (!child) return null;
    current = child;
  }
  return current;
}
```

Navigue dans l'arbre des enfants en suivant un chemin separe par des points (`"user.address.city"`). Retourne `null` si un segment du chemin n'a pas de noeud enfant.

### `dispose()`

```typescript
dispose(): void {
  this.children.forEach((child) => child.dispose());
  this.children.clear();
  this.proxies = new WeakMap();
}
```

Nettoyage recursif : dispose tous les enfants, vide les caches.

---

## 6. Le Proxy Handler — Coeur de la Reactivite Fine

Le proxy handler est cree par `createHandler()` et intercepte TOUTES les operations sur l'objet d'etat.

### `get(target, key, receiver)` — Lecture de Propriete

```typescript
get(target, key, receiver) {
```

C'est la methode la plus importante. Chaque lecture de `state.x` passe par ici.

#### Acces aux proprietes reactives `$`

```typescript
  if (typeof key === 'string' && key.startsWith('$')) {
    const res = (target as any)[key.replace('$', '')];
    const result = () => res;
    // ... creation d'un accesseur reactif
    Object.defineProperty(accessor, $SIGNAL, { value: true, enumerable: true });
    return accessor;
  }
```
Quand on accede a `state.$name`, le `$` est retire et un accesseur reactif marque `$SIGNAL` est retourne. Cela permet le patron `{state.$name}` dans les templates lit-html.

#### Symboles internes

```typescript
  if (key === $RAW) return target;
  if (key === $NODE) return node;
  if (key === $HAS) return (k: PropertyKey) => k in target;
  if (key === $SELF) {
    node.SELF?.();      // Declenche le suivi de structure
    return receiver;     // Retourne le proxy lui-meme
  }
```
Les symboles internes permettent d'acceder a des informations speciales sans suivi reactif (sauf `$SELF` qui declenche le suivi de structure).

#### Suivi de structure et de propriete

```typescript
  node.SELF?.();                          // Suivi de la structure (ownKeys, length)
  node.getDataNode(key, target[key])();   // Suivi de cette propriete specifique
```
**C'est le coeur du suivi reactif.** Deux lectures de signal se font :
1. `SELF()` — enregistre une dependance sur la structure de l'objet
2. `getDataNode(key)()` — enregistre une dependance sur cette propriete specifique

Si un effet lit `state.user.name`, il aura des dependances sur :
- Le `SELF` du noeud racine
- Le `DataNode` de `"user"` sur le noeud racine
- Le `SELF` du noeud `user`
- Le `DataNode` de `"name"` sur le noeud `user`

#### Mutateurs de tableaux

```typescript
  if (Array.isArray(target) && typeof value === 'function') {
    if (key === 'push' || key === 'pop' || key === 'shift' ||
        key === 'unshift' || key === 'splice') {
      return (...args: any[]) => {
        const result = value.apply(target, args);
        node.SELF?.$(target.length);           // Notifie le changement de structure
        for (let i = 0; i < target.length; i++) {
          node.signals.get(i)?.$();             // Notifie chaque index
        }
        return result;
      };
    }
  }
```
Les methodes mutatrices de tableau (`push`, `pop`, etc.) sont interceptees. Apres mutation :
1. Le signal `SELF` est declenche avec la nouvelle longueur
2. TOUS les signaux d'index sont declenches

C'est une approche simple mais pas optimale — en theorie, seuls les index affectes devraient etre notifies.

#### Objets imbriques

```typescript
  if (value && typeof value === 'object') {
    let child = node.children.get(key);
    if (!child) {
      const childPath = node.path ? `${node.path}.${String(key)}` : String(key);
      if (node.children.size >= node.maxChildren) {
        // Eviction LRU
        const firstKey = node.children.keys().next().value;
        firstChild?.dispose();
        node.children.delete(firstKey);
      }
      child = new StoreNode(value, childPath, node);
      node.children.set(key, child);
    }
    return child.proxy;
  }
```
Quand une propriete est un objet, on cree un `StoreNode` enfant (ou on reutilise l'existant). Le **proxy de l'enfant** est retourne, ce qui permet le chainage : `state.user.address.city` traverse trois niveaux de proxy.

Un systeme **LRU** (Least Recently Used) evite une croissance infinie des enfants : si on depasse `maxChildren` (100), le plus ancien est evicte.

#### Valeur primitive

```typescript
  return value;
```
Pour les primitives (`string`, `number`, etc.), la valeur est retournee directement.

### `set(target, key, value)` — Ecriture de Propriete

```typescript
set(target, key, value) {
  return true;  // Ignore l'ecriture directe
}
```
L'ecriture directe sur le proxy est **bloquee silencieusement**. Toutes les modifications doivent passer par le setter du store (`setState`). C'est le principe d'immutabilite.

### `deleteProperty(target, key)` — Suppression

```typescript
deleteProperty(target, key) {
  delete target[key];
  node.signals.get(key)?.$();     // Notifie le signal de la propriete supprimee
  node.children.delete(key);       // Supprime l'enfant associe
  node.SELF?.$(Array.isArray(target) ? target.length : null);  // Notifie la structure
  return true;
}
```
Supprime la propriete, notifie le signal de cette propriete, supprime le noeud enfant, et notifie le signal de structure.

### `has(target, key)` — Verification d'Existence

```typescript
has(target, key) {
  node.getDataNode(key)();   // Cree un suivi reactif pour 'key in state'
  return key in target;
}
```
L'operateur `in` cree aussi une dependance reactive. Si une propriete est ajoutee ou supprimee, l'effet qui a utilise `"key" in state` sera re-execute.

### `ownKeys(target)` — Enumeration

```typescript
ownKeys(target) {
  node.SELF?.();              // Suivi de la structure
  return Reflect.ownKeys(target);
}
```
`Object.keys(state)`, `for...in`, et le spread `{...state}` declenchent le suivi de structure via `SELF`.

---

## 7. StoreNode: Methodes de Mise a Jour

### `createProxy(value)`

```typescript
private createProxy(value: T): any {
  if (value && typeof value === 'object') {
    const proxy = new Proxy(value, this.createHandler());
    this.proxies.set(value, proxy);
    return proxy;
  }
  return value;
}
```
Cree un `Proxy` avec le handler reactif et le met en cache dans la `WeakMap` `proxies`. Les valeurs primitives ne sont pas proxyfiees.

### `toObservable()`

```typescript
toObservable(): Observable<T> {
  const [signal] = this.getPropSignal(this.path);
  return signal.toObservable!();
}
```
Convertit le noeud en `Observable` RxJS-like en utilisant le `toObservable` du signal sous-jacent.

---

## 8. StoreNode: Produce et Draft (Mutations Immuables)

### `produce(producer)`

```typescript
produce(producer: Producer<T>): T {
  const draft = this.createDraft(this.value);
  producer(draft);
  return this.finalizeDraft(draft, this.value);
}
```
Patron inspire d'Immer : cree un brouillon (draft), le passe a la fonction producteur qui le mute, puis finalise en creant une nouvelle valeur immuable avec partage structurel.

### `createDraft(value)` — Creation du Brouillon

```typescript
private createDraft(value: T): T {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value))
    return value.map((item) => this.createDraft(item)) as T;
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (value instanceof Map) { /* clone recursif */ }
  if (value instanceof Set) { /* clone recursif */ }
```
Gere tous les types : primitives (retournees telles quelles), tableaux (clones element par element), `Date`, `Map`, `Set`.

```typescript
  const clone = Object.create(Object.getPrototypeOf(value));
  return new Proxy(clone, {
    get: (target, prop) => {
      if (prop in value && typeof (value as any)[prop] === 'object' && ...) {
        if (!(prop in target)) {
          target[prop] = this.createDraft((value as any)[prop]);
        }
        return target[prop];
      }
      return prop in target ? target[prop] : (value as any)[prop];
    },
    set: (target, prop, newValue) => {
      target[prop] = newValue;
      return true;
    },
    // ...
  });
}
```
Pour les objets simples, cree un **proxy de copie paresseuse** (copy-on-read). Les proprietes ne sont clonees que quand on y accede pour la premiere fois. Les ecritures vont dans le clone (`target`), pas dans l'original. C'est le partage structurel : les proprietes non accedees pointent vers l'original.

### `finalizeDraft(draft, base)` — Finalisation

```typescript
private finalizeDraft(draft: any, base: any): any {
  if (!draft || typeof draft !== 'object') return draft;
  if (draft === base) return base;  // Pas de changement → reutilise l'original
```
Si le draft est identique a la base, on retourne la base (partage structurel maximal).

```typescript
  // Pour chaque propriete
  const finalValue = this.finalizeDraft(draftValue, baseValue);
  if (finalValue !== baseValue) hasChanges = true;
  (result as any)[key] = finalValue;
  // ...
  return hasChanges ? result : base;
}
```
Recursion sur chaque propriete. Si aucune propriete n'a change, retourne l'objet original (`base`). Sinon, retourne le nouvel objet.

---

## 9. StoreNode: Reconciliation

### `reconcile(newValue, options)`

```typescript
reconcile(newValue: any, options: ReconcileOptions = {}): T {
  const current = this.value;
  if (current === newValue) return current;     // Meme reference → pas de changement
  if (!current || !newValue || typeof current !== 'object' || typeof newValue !== 'object') {
    return newValue;                             // Primitives → remplacement simple
  }
  if (Array.isArray(current) && Array.isArray(newValue)) {
    return this.reconcileArrays(current, newValue, options) as T;
  }
  if (options.merge) return deepMerge(current, newValue) as T;
  return newValue;
}
```
Compare l'etat actuel et le nouvel etat, et produit un resultat qui reutilise les references existantes autant que possible.

### `reconcileArrays(current, newArray, options)`

```typescript
private reconcileArrays(current, newArray, options): any[] {
  // Si meme reference → pas de changement
  if (current === newArray) return current;

  // Si meme longueur et memes elements → pas de changement
  if (current.length === newArray.length) {
    let allEqual = true;
    for (let i = 0; i < current.length; i++) {
      if (current[i] !== newArray[i]) { allEqual = false; break; }
    }
    if (allEqual) return current;
  }

  // Si les elements ont une cle → reconciliation par cle
  if (key && newArray[0] && newArray[0][key] !== undefined) {
    return this.reconcileByKey(current, newArray, key);
  }

  return newArray;  // Sinon remplacement simple
}
```

### `reconcileByKey(current, newArray, key)`

```typescript
private reconcileByKey(current, newArray, key): any[] {
  const currentMap = new Map();
  current.forEach((item) => { currentMap.set(item[key], item); });

  const result = [];
  for (const newItem of newArray) {
    const existing = currentMap.get(newItem[key]);
    if (existing) {
      result.push(deepMerge(existing, newItem));  // Merge avec l'existant
      currentMap.delete(newItem[key]);
    } else {
      result.push(newItem);  // Nouvel element
    }
  }

  // Elements restants qui ne sont plus dans newArray
  for (const [_, item] of currentMap) {
    result.push(item);
  }
  return result;
}
```
Reconciliation par cle (typiquement `id`) : les elements existants sont fusionnes avec les nouveaux, les elements supprimes sont conserves a la fin.

---

## 10. Classe Store — Facade Principale

La classe `Store<T>` est la facade qui encapsule un `StoreNode` racine et fournit l'API publique.

### Constructeur

```typescript
constructor(
  initialState: T,
  private options: StoreOptions<T> = { immutable: true }
) {
  this.root = new StoreNode(initialState, '', null, options);
  this.set = this._set.bind(this) as StoreSetter<T>;
  this.$ = this._reactive.bind(this);
}
```
1. Cree un `StoreNode` racine avec l'etat initial
2. Lie la methode `_set` comme setter public
3. Lie `_reactive` comme accesseur `$`

### Proprietes d'Acces

```typescript
get state(): Immutable<T> {
  return this.proxy[$RAW] as Immutable<T>;
}
```
Retourne l'etat brut via le symbole `$RAW`.

```typescript
get proxy(): Immutable<T> {
  return this.readonly(this.root.getProxy() as any) as Immutable<T>;
}
```
Retourne le proxy reactif enveloppe dans un proxy `readonly` qui bloque les ecritures directes avec un avertissement.

```typescript
get accessor(): Accessor<T> {
  return this.root.get as Accessor<T>;
}
```
Retourne la fonction de lecture du noeud racine.

### `readonly(proxy)`

```typescript
readonly<T extends object>(proxy: T): T {
  return new Proxy(proxy, {
    set() {
      console.warn('Attempted to write to a readonly store');
      return false;
    },
    deleteProperty() { return true; },
    apply() {
      console.warn('Attempted to apply a readonly store');
      return false;
    },
  });
}
```
Enveloppe un proxy dans un autre proxy qui empeche les ecritures et affiche un avertissement.

### `bindProps(getter, store)`

```typescript
bindProps<T>(getter: any, _store?: Store<T>): void {
  const properties = [
    'get', 'subscribe', 'watch', 'select', 'toObservable',
    'unwrap', 'produce', 'reconcile', 'push', 'pop',
    'splice', 'shift', 'removeAt', 'insert', '$',
  ];
  for (const p of properties) {
    if (p === '$') {
      (getter as any)[p] = (store as any)[`_reactive`]?.bind(store);
    } else {
      (getter as any)[p] = (store as any)[p]?.bind(store);
    }
  }
  // Marque le getter.$ avec $RAW
  Object.defineProperty(getter.$, $RAW, { value: true, ... });
}
```
Attache toutes les methodes du store directement sur le setter. Cela permet d'utiliser `setState.push(...)`, `setState.pop(...)`, etc.

### `_reactive(key?)`

```typescript
_reactive(key?: string): any {
```
Retourne un signal reactif pour une propriete specifique. Utilise par le patron `$("propName")` dans les templates.

```typescript
  let node = this.getNode(key!);
  if (node) {
    const [s] = node.getPropSignal(key!);
    return s;   // Retourne l'accesseur du signal
  } else {
    // Cree un nouveau StoreNode pour cette propriete
    const value = (this.proxy as any)[key!];
    const node = new StoreNode(value, key, this.root);
    this.root.addNode(key!, node);
    const [s, set] = node.getPropSignal(key!);
    set(value);
    return s;
  }
```

---

## 11. Store: La Methode _set et mergeState

### `_set(...params)` — Setter Principal

```typescript
private _set(...params: any[]): void {
  let path = params[0];
  let value = params[1];
  let value1 = params[2];
  let value2 = params[3];
```
Accepte jusqu'a 4 parametres pour supporter les differentes formes d'appel.

```typescript
  const originalState = deepClone(this.getRawState(), [$RAW, $PROXY, $STORE]) as Immutable<T>;
  const state_clone = deepClone(structuredClone(originalState));
```
**Double clone.** Cree une copie de l'etat AVANT mutation pour la comparaison, et un clone de travail pour appliquer les changements.

```typescript
  batch(() => {
    const s = set(state_clone as any, path as any, value as any, value1, value2);
    this.mergeState(s, originalState as T);
  });
```
Utilise la fonction utilitaire `set` de `@fluixi/utils/object` pour appliquer le changement sur le clone, puis `mergeState` pour fusionner le resultat avec le store.

### `mergeState(partial, originalState)` — Fusion de l'Etat

```typescript
private mergeState(partial: Partial<T>, originalState?: T): void {
  const currentState = originalState || deepClone(this.getRawState());
  const diff = diffObjectDetailed(currentState, Array.isArray(partial) ? partial.slice() : { ...partial });
```
Calcule un **diff detaille** entre l'etat original et le nouvel etat partiel. Le diff contient les chemins `added`, `modified`, `deleted`.

```typescript
  const paths = getPaths(partial as any);
```
Recupere tous les chemins de proprietes du nouvel etat.

```typescript
  if (diff.hasChanges !== undefined) {
    const sortedPaths = [...paths].sort((a, b) => {
      const aDepth = (a as string).split('.').length;
      const bDepth = (b as string).split('.').length;
      return bDepth - aDepth;  // Les plus profonds d'abord
    });
```
**Tri par profondeur decroissante.** Les proprietes les plus profondes sont mises a jour en premier. Cela evite qu'une mise a jour de parent n'efface les signaux d'enfants avant qu'ils ne soient declenches.

```typescript
    for (const path of sortedPaths) {
      const value = get(partial as any, path as any);
      const pathStr = path as string;
      if (pathStr.includes('[*]')) {
        this.handleWildcardPath(pathStr, partial);
        continue;
      }
      if (!this.isChanged(diff, pathStr)) continue;
      this.triggerPathSignals(pathStr, value, partial);
    }
```
Pour chaque chemin modifie, declenche les signaux correspondants avec la nouvelle valeur.

```typescript
    const actualCurrentState = this.getRawState();
    applyDiff(actualCurrentState as any, diff.changes, true);
    this.updateChildNodeValues(actualCurrentState);
```
Applique le diff sur l'etat actuel (mutation en place), puis met a jour les valeurs de tous les noeuds enfants.

```typescript
    if (Array.isArray(partial) && Array.isArray(currentState)) {
      if (partial.length !== currentState.length) {
        const lengthSignal = this.root.signals.get('length');
        if (lengthSignal) lengthSignal.$(partial.length);
        this.root.SELF?.$(partial.length);
      }
    } else {
      this.root.SELF?.$();
    }
  }
}
```
Notifie le signal de longueur et le signal de structure si necessaire.

---

## 12. Store: Operations sur les Tableaux

Chaque operation sur un tableau suit le meme patron :
1. Recuperer le tableau courant via `this.get(path)`
2. Verifier que c'est bien un tableau
3. Creer une copie (`slice()`)
4. Appliquer la mutation sur la copie
5. Mettre a jour le store via `this.set` ou `this.reconcilePath`

### `push(path, ...items)`
```typescript
push<P>(path: P, ...items: any[]): void {
  const current = this.get(path);
  this.set(path as any, current.slice().concat(items.flat()) as any);
}
```
Concatene les elements a la copie du tableau.

### `pop(path)`
```typescript
pop<P>(path: P): any {
  const newArray = current.slice();
  const item = newArray.pop();
  this.reconcilePath(path, newArray as any, { merge: false });
  return item;
}
```
Utilise `reconcilePath` au lieu de `set` pour beneficier de la reconciliation.

### `splice(path, start, deleteCount, ...items)`
```typescript
splice<P>(path: P, start, deleteCount, ...items): any[] {
  const newArray = current.slice();
  const deleted = newArray.splice(start, deleteCount, ...items);
  this.set(path as any, newArray as any);
  return deleted;
}
```

### `insert(path, index, value)`
```typescript
insert<P>(path: P, index: number, value: any) {
  const newArray = current.slice();
  newArray.splice(index, 0, value);
  this.set(path as any, newArray as any);
}
```

### `removeAt(path, index)`
```typescript
removeAt<P>(path: P, index: number): any[] {
  const newArray = current.slice();
  const res = newArray.splice(index, 1);
  this.reconcilePath(path, newArray as any, { merge: false });
  return res;
}
```

---

## 13. Store: Propagation des Signaux (triggerPathSignals)

```typescript
private triggerPathSignals(pathStr: string, value: any, state: any): void
```

Cette methode est responsable de **declencher les bons signaux** quand une propriete change.

### Propriete directe (pas de `.`)

```typescript
if (!isNestedPath) {
  let propertyKey: PropertyKey;
  if (pathStr.startsWith('[') && pathStr.endsWith(']')) {
    propertyKey = pathStr.slice(1, -1);  // '[0]' → '0'
  } else {
    propertyKey = pathStr;
  }
  const dataNode = this.root.signals.get(propertyKey);
  if (dataNode) dataNode.$(value);
}
```
Pour un chemin simple (`"name"` ou `"[0]"`), on trouve le `DataNode` sur le noeud racine et on le declenche.

### Propriete imbriquee

```typescript
} else {
  const pathParts = pathStr.split('.');
  if (pathParts[0].startsWith('[') && pathParts[0].endsWith(']')) {
    // Element de tableau : '[0].id'
    const indexStr = pathParts[0].slice(1, -1);
    const remainingPath = pathParts.slice(1).join('.');
    this.root.SELF?.$(...);  // Notifie la structure du tableau
    // ... trouve et declenche le signal sur l'enfant
  } else {
    // Propriete d'objet : 'user.name'
    const firstProp = pathParts[0];
    const remainingPath = pathParts.slice(1).join('.');
    let childNode = this.root.children.get(firstProp);
    if (childNode && remainingPath) {
      this.triggerNestedSignal(childNode, remainingPath, value);
    }
  }
}
```

### `triggerNestedSignal(node, path, value)` — Propagation Recursive

```typescript
private triggerNestedSignal(node: StoreNode<any>, path: string, value: any): void {
  const parts = path.split('.');
  if (parts.length === 1) {
    const dataNode = node.signals.get(parts[0]);
    if (dataNode) dataNode.$(value);
  } else {
    const childNode = node.children.get(childKey);
    if (childNode) this.triggerNestedSignal(childNode, remainingPath, value);
  }
}
```
Descend recursivement dans l'arbre des noeuds enfants jusqu'a la propriete feuille, puis declenche son `DataNode`.

---

## 14. Store: Mise a Jour Recursive des Valeurs

### `updateChildNodeValues(state)`

```typescript
private updateChildNodeValues(state: any): void {
  for (const [key, childNode] of this.root.children.entries()) {
    const newValue = state[key];
    if (newValue !== undefined) {
      this.mutateValue(childNode.value, newValue);
      this.updateChildNodeValuesRecursive(childNode, newValue);
    }
  }
}
```
Apres que le diff a ete applique, on met a jour les valeurs stockees dans chaque `StoreNode` enfant. `mutateValue` modifie l'objet **en place** pour que les proxys existants continuent a pointer vers le bon objet.

### `mutateValue(target, source)`

```typescript
private mutateValue(target: any, source: any): void {
  if (Array.isArray(target) && Array.isArray(source)) {
    target.length = source.length;
    for (let i = 0; i < source.length; i++) {
      if (target[i] !== source[i]) {
        if (typeof source[i] === 'object' && typeof target[i] === 'object') {
          this.mutateValue(target[i], source[i]);
        } else {
          target[i] = source[i];
        }
      }
    }
  } else {
    // Supprime les proprietes absentes de la source
    for (const key in target) {
      if (!(key in source)) delete target[key];
    }
    // Met a jour/ajoute les proprietes
    for (const key in source) {
      if (target[key] !== source[key]) {
        if (typeof source[key] === 'object' && typeof target[key] === 'object') {
          this.mutateValue(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
  }
}
```
Mutation en place avec recursion sur les objets imbriques. C'est crucial car les proxys existants referencent `target` — si on remplacait `target` par un nouvel objet, les proxys pointeraient vers l'ancien.

---

## 15. Store: Select, Watch, Subscribe

### `select(selector)`

```typescript
select<U>(selector: (state: Immutable<T>) => U): () => U {
  return createMemo(() => selector(this.state));
}
```
Cree un **memo derive** de l'etat du store. La fonction `selector` est re-evaluee uniquement quand les proprietes qu'elle lit changent (grace au suivi reactif).

### `watch(selector, effect)`

```typescript
watch<U>(selector: (state) => U, effect: (value: U, prev: U | undefined) => void): () => void {
  let prev: U | undefined;
  return createEffect(() => {
    const current = selector(this.state);
    if (!deepEqual(current, prev)) {
      effect(current, prev);
      prev = current;
    }
  });
}
```
Cree un **effet** qui observe une selection d'etat et execute un callback quand elle change. Utilise `deepEqual` pour comparer (pas juste la reference).

### `subscribe(listener)`

```typescript
subscribe(listener: (state: Immutable<T>) => void): () => void {
  return createEffect(() => {
    const currentState = this.state;
    listener(currentState);
  });
}
```
Abonnement simple : le listener est appele a chaque changement d'etat. Retourne une fonction de desabonnement (le dispose de l'effet).

---

## 16. createStore — Fonction de Creation Principale

```typescript
function createStore<T>(
  initialState: T,
  options: StoreOptions<T> = { immutable: true }
): [Immutable<T>, Store<T>['set']]
```

C'est la fonction publique principale, compatible avec l'API SolidJS.

### Ligne par ligne

```typescript
const store = new Store(deepClone(initialState), options);
```
Clone l'etat initial et cree une instance de `Store`.

```typescript
const setter = store.set;
store.bindProps(setter, store);
```
Recupere le setter et y attache toutes les methodes du store (`push`, `pop`, `$`, etc.).

```typescript
Object.defineProperty(store.proxy, $PROXY, {
  enumerable: true,
  configurable: true,
  writable: true,
  value: true,
});
```
Marque le proxy avec `$PROXY` pour que `isStoreProxy()` puisse l'identifier.

```typescript
return [store.proxy as Immutable<T>, setter];
```
Retourne le tuple `[state, setState]` — le proxy en lecture seule et le setter enrichi.

**Utilisation :**
```typescript
const [state, setState] = createStore({ user: { name: "John", age: 30 } });

// Lecture reactive
createEffect(() => {
  console.log(state.user.name);  // Suivi fin : re-execute SEULEMENT si name change
});

// Ecriture
setState("user.name", "Jane");        // Chemin + valeur
setState({ user: { name: "Jane" } }); // Objet partiel
setState("user.age", age => age + 1); // Chemin + fonction
```

---

## 17. createMutableStore / createComputedStore

### `createMutableStore(initialState, options)`

```typescript
function createMutableStore<T>(initialState: T, options = {}): Store<T> {
  return new Store(initialState, { ...options, immutable: false });
}
```
Cree un store ou les mutations directes sont autorisees (via `store.mutate(path, mutatorFn)`).

### `createComputedStore(fn, options)`

```typescript
function createComputedStore<T>(fn: () => T, options = {}): Store<T> {
  const [computedState, setComputedState] = createSignal(fn());
  createEffect(() => { setComputedState(fn()); });
  const store = new Store(fn(), options);
  createEffect(() => {
    const newState: any = computedState();
    store.batch(() => {
      Object.keys(newState).forEach((key) => {
        store.set(key as any, (newState as any)[key]);
      });
    });
  });
  return store;
}
```
Cree un store derive d'une fonction reactive. Quand les dependances de `fn` changent, le store est automatiquement mis a jour.

---

## 18. Fonctions Utilitaires (wrap, unwrap, isStoreProxy, etc.)

### `wrap(value, options)`

```typescript
function wrap<U extends object>(value: U, options = {}): StoreAccessor<U> {
  return Store.wrap(value, options);
}
```
Encapsule un objet dans un store et retourne un accesseur reactif.

### `unwrap(store)`

```typescript
function unwrap<T>(store: T): T {
  if (store instanceof Store) return store.unwrap();
  return deserialize(store);
}
```
Extrait la valeur brute d'un store ou d'un proxy de store.

### `deserialize(store)`

```typescript
function deserialize<T>(store: T): T {
  if (typeof store === 'object' || typeof store === 'function') {
    const clone = deepClone(
      typeof store === 'function' ? (store as any)() : store,
      [$RAW, $PROXY]
    );
    // Supprime les symboles internes du clone
    if ((clone as any)[$RAW]) delete (clone as any)[$RAW];
    if ((clone as any)[$PROXY]) delete (clone as any)[$PROXY];
    if (Array.isArray(clone)) return clone.map((item) => unwrap(item)) as T;
    return clone as T;
  }
  return store;
}
```
Clone en profondeur en supprimant les marqueurs de store. Gere les fonctions (en les appelant), les tableaux (recursion) et les objets.

### `isStoreProxy(value)`

```typescript
export function isStoreProxy(value: any): boolean {
  return value && typeof value === 'object' && $PROXY in value;
}
```
Verifie si une valeur est un proxy de store en cherchant le symbole `$PROXY`.

### `isStore(store)`

```typescript
export function isStore<T>(store: StoreWrap<T>): store is StoreAccessor<T> {
  return typeof store === 'function' && store.length === 0 && $RAW in store && typeof (store as any)[$RAW] !== 'undefined';
}
```
Verifie si c'est un accesseur de store (fonction sans argument avec `$RAW`).

### `getStoreNode(store)`

```typescript
export function getStoreNode<T>(store: any): StoreNode<T> | null {
  if (store && typeof store === 'object' && $NODE in store) {
    return store[$NODE] as StoreNode<T>;
  }
  return null;
}
```
Recupere le `StoreNode` interne d'un proxy de store via le symbole `$NODE`.

### `storesAsSignal(store, key)`

```typescript
export function storesAsSignal<T>(store: Store<T>, key?: string): any {
  const node = store.getNode(key!);
  if (node) {
    const [s] = node.getPropSignal(key!);
    return s;
  }
  return null;
}
```
Retourne un signal reactif pour une propriete specifique du store.

---

## 19. Schema de l'Architecture du Store

```
createStore({ user: { name: "John", age: 30 }, items: [1, 2, 3] })
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Store                                                          │
│  ├── root: StoreNode<T>  (path = "")                           │
│  │   ├── value: { user: {...}, items: [...] }                  │
│  │   ├── proxy: Proxy(value, handler)  ← retourne par [state]  │
│  │   ├── SELF: DataNode  (suivi de structure)                  │
│  │   ├── signals: Map                                          │
│  │   │   ├── "user"  → DataNode  (signal pour state.user)      │
│  │   │   └── "items" → DataNode  (signal pour state.items)     │
│  │   └── children: Map                                         │
│  │       ├── "user" → StoreNode<User>  (path = "user")         │
│  │       │   ├── value: { name: "John", age: 30 }             │
│  │       │   ├── proxy: Proxy(value, handler)                  │
│  │       │   ├── SELF: DataNode                                │
│  │       │   ├── signals: Map                                  │
│  │       │   │   ├── "name" → DataNode                         │
│  │       │   │   └── "age"  → DataNode                         │
│  │       │   └── children: Map (vide — pas d'objets imbriques) │
│  │       └── "items" → StoreNode<number[]>  (path = "items")   │
│  │           ├── value: [1, 2, 3]                              │
│  │           ├── proxy: Proxy(value, handler)                  │
│  │           ├── SELF: DataNode(3)  (longueur initiale)        │
│  │           └── signals: Map                                  │
│  │               ├── 0 → DataNode                              │
│  │               ├── 1 → DataNode                              │
│  │               └── 2 → DataNode                              │
│  └── set: StoreSetter<T>  ← retourne par [setState]            │
└─────────────────────────────────────────────────────────────────┘

Flux de lecture (suivi reactif) :

  createEffect(() => {
    console.log(state.user.name);
  })

  1. state.user         → Proxy.get("user")
     ├── root.SELF()           → suivi de structure racine
     ├── root.getDataNode("user")()  → suivi de la prop "user"
     └── Retourne child["user"].proxy

  2. .name              → Proxy.get("name") sur le proxy "user"
     ├── userNode.SELF()       → suivi de structure "user"
     ├── userNode.getDataNode("name")()  → suivi de "name"
     └── Retourne "John"

  L'effet est maintenant abonne a :
  ├── root.SELF
  ├── root.signals["user"]
  ├── userNode.SELF
  └── userNode.signals["name"]

Flux d'ecriture :

  setState("user.name", "Jane")

  1. _set("user.name", "Jane")
  2. Clone l'etat → { user: { name: "John", ... } }
  3. Applique set() → { user: { name: "Jane", ... } }
  4. mergeState(newState, oldState)
  5. diffObjectDetailed → modified: ["user.name"]
  6. triggerPathSignals("user.name", "Jane")
     └── userNode.signals["name"].$(value)  → notifie le DataNode
  7. applyDiff sur l'etat reel
  8. mutateValue → met a jour value en place
  9. L'effet est re-execute car "name" DataNode a change
```

---

## 20. Resume des Invariants Critiques

1. **Un `DataNode` par propriete accedee.** Les signaux ne sont crees que quand une propriete est lue. Proprietes jamais lues = zero cout.

2. **Le proxy intercepte TOUT.** Lecture (`get`), existence (`has`), enumeration (`ownKeys`), suppression (`deleteProperty`) — tout cree ou declenche des signaux.

3. **L'ecriture directe est bloquee.** `proxy.x = v` ne fait rien (ou affiche un warning en mode readonly). Toutes les modifications passent par `setState`.

4. **Les signaux sont declenches AVANT la mutation.** Dans `mergeState`, les signaux recoivent la nouvelle valeur PUIS le diff est applique a l'etat reel. Cela garantit que les comparaisons d'egalite dans les signaux fonctionnent correctement.

5. **Les chemins sont tries par profondeur decroissante.** Les proprietes les plus profondes sont notifiees en premier pour eviter que les parents n'effacent les signaux enfants.

6. **Les valeurs sont mutees EN PLACE.** `mutateValue` modifie l'objet existant plutot que de le remplacer. Cela maintient la stabilite referentielle des proxys existants.

7. **Le `SELF` DataNode suit la structure.** Il est declenche quand des proprietes sont ajoutees/supprimees ou quand la longueur d'un tableau change.

8. **Les enfants sont crees paresseusement.** Un `StoreNode` enfant n'est cree que la premiere fois qu'on accede a une propriete objet. Le cache LRU evite la croissance infinie.

9. **`$RAW` bypasse la reactivite.** Acceder a `proxy[$RAW]` retourne l'objet brut sans creer de dependances.

10. **`$PROXY` marque les proxys de store.** C'est le marqueur utilise par `isStoreProxy()` et par le systeme reactif pour distinguer les stores des objets normaux.
