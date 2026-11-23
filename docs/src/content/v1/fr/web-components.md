# Web components

`@fluixi/web-components` construit des éléments personnalisés standard avec la réactivité de
Fluixi à l'intérieur. L'élément fonctionne dans n'importe quelle page et n'importe quel framework,
React, Vue, Svelte ou aucun, et dans une application Fluixi il se rend sur le serveur et s'hydrate
comme le reste de la page.

```ts
import { defineCustomElement, prop, typedElement } from '@fluixi/web-components';
import { html } from '@fluixi/dom';
import { signal } from '@fluixi/reactive/signal';

const counterProps = {
  step: prop.number(1),       // step="5" ou el.step = 5
  label: prop.string('Count'),
};

export class FxCounter extends typedElement(counterProps) {
  #count = signal(0);

  protected override render() {
    return html`
      <span>${() => this.label}</span>
      <output>${() => this.#count()}</output>
      <button @click=${() => this.increment()}>+${() => this.step}</button>
    `;
  }

  get count() {
    return this.#count();
  }

  increment() {
    this.#count.set(this.#count() + this.step);
    this.emit('change', { value: this.#count() });
  }
}

defineCustomElement('fx-counter', FxCounter);
```

`render` s'exécute une fois. Chaque liaison met à jour le seul nœud auquel elle appartient quand
une prop ou un signal change ; rien ne se rend de nouveau. Le JSX fonctionne aussi bien que
`` html`` ``.

## Props

Une prop est une propriété et l'attribut qui la reflète, gardés sur un seul signal : `el.step = 5`
et `step="5"` arrivent au même endroit, et une liaison de framework et du HTML rendu par le serveur
sont d'accord.

| Déclaration | Attribut |
| --- | --- |
| `prop.string(initial)` | tel qu'écrit |
| `prop.number(initial)` | lu comme nombre ; une valeur qui n'en est pas un garde `initial` |
| `prop.boolean(initial)` | présent ou absent |
| `prop.object(initial)` | JSON |
| `prop.custom(initial, { fromAttribute, toAttribute })` | votre conversion |
| `prop.any(initial)` | aucun : une valeur que seule une propriété peut porter, comme une fonction |

Options : `attribute` renomme l'attribut (le nom de la propriété en minuscules par défaut) ou le
supprime avec `false` ; `reflect: true` réécrit la propriété dans l'attribut à chaque changement ;
`equals` décide quand une nouvelle valeur est un changement.

`typedElement(props)` donne à la classe ces props comme champs typés. Une sous-classe l'étend comme
n'importe quelle classe, en reprenant les props du parent :

```ts
const boundedProps = { ...counterProps, max: prop.number(10) };

export class FxBoundedCounter extends FxCounter {
  static override props = boundedProps;
  declare max: number;
}
```

## Événements

`this.emit(type, detail)` émet un `CustomEvent` qui remonte hors de l'élément. Listez-les dans une
interface pour que les consommateurs aient des gestionnaires typés :

```ts
export interface CounterEvents {
  change: { value: number };
}
```

## Dans du JSX

Déclarez une fois les types de l'élément, et le JSX vérifie ses attributs et ses événements comme
pour n'importe quelle balise :

```ts
declare global {
  interface HTMLElementTagNameMap {
    'fx-counter': FxCounter;
  }
  interface JSXCustomElements {
    'fx-counter': ElementAttributes<typeof counterProps, CounterEvents>;
  }
}
```

```tsx
<fx-counter step={5} label="Points" onChange={(e) => save(e.detail.value)} />
```

Une fonction, un objet ou un tableau passé en prop est affecté comme propriété, jamais converti en
chaîne dans un attribut.

## Shadow DOM et styles

Les éléments se rendent par défaut dans le light DOM : le CSS de la page les atteint et les enfants
rendus par le serveur restent en place. Mettez `static shadow = 'open'` (ou des options
d'attachShadow comme `{ mode: 'open', delegatesFocus: true }`) pour une racine shadow, et
`static styles` pour son CSS :

```ts
export class FxTab extends typedElement(tabProps) {
  static override shadow = 'open' as const;
  static override styles = `:host { display: contents; } [role=tab] { font: inherit; }`;
}
```

Chaque feuille de style distincte est construite une fois et partagée par toutes les instances et
sous-classes. Un parent destiné à être étendu déclare `static styles: ElementStyles`, et une
sous-classe y ajoute avec `[super.styles, '...']`.

## Enfants et slots nommés sans shadow DOM

En light DOM, il n'y a pas de `<slot>` où projeter. Les enfants écrits entre les balises de
l'élément sont retirés avant que `render()` ne s'exécute, et l'élément les place lui-même.
`this.authoredChildren` les contient tous ; `this.slotted(nom)` ceux marqués `slot="nom"`, et
`this.slotted()` ceux sans `slot`, textes compris :

```tsx
class FxPanel extends typedElement(panelProps) {
  protected override render() {
    return (
      <section>
        <header>{this.slotted('header')}</header>
        <div class="body">{this.slotted()}</div>
        <footer>{this.slotted('footer')}</footer>
      </section>
    );
  }
}
```

```html
<fx-panel>
  <h2 slot="header">Réglages</h2>
  <p>Les changements s'enregistrent au fur et à mesure.</p>
  <button slot="footer">Terminé</button>
</fx-panel>
```

Un enfant que l'élément ne place pas n'est pas affiché, et Fluixi le signale en développement.
Sous shadow DOM, les deux restent vides : le navigateur attribue lui-même les enfants aux
`<slot>`.

Découpez un élément plus grand en un conteneur et des parties, comme pour un composant
(`fx-panel` et `fx-panel-item`), et laissez le conteneur transmettre son état aux parties par le
[contexte](#contexte-entre-éléments) plutôt que par des props sur chacune.

## Contexte entre éléments

Les éléments partagent des valeurs comme les composants. L'un fournit, tout élément à l'intérieur
consomme, et les objets de contexte sont ceux de [Contexte](/v1/fr/context) : un élément lit aussi
ce que fournit un Provider de l'application. `provideContext` et `consumeContext` prennent
l'élément en premier ; un élément qui n'utilise ni l'un ni l'autre n'embarque rien de ce code :

```ts
import { consumeContext, provideContext } from '@fluixi/web-components';

const Tabs = createContext<TabsState | null>(null, 'tabs');

class FxTabs extends typedElement(tabsProps) {
  protected override render() {
    provideContext(this, Tabs, { selected, select });
    return html`<slot></slot>`;
  }
}

class FxTab extends typedElement(tabProps) {
  protected override render() {
    const tabs = consumeContext(this, Tabs); // un accesseur ; suit le fournisseur quand il arrive
    // ...
  }
}
```

Il suit le protocole de contexte de la communauté, et fonctionne donc avec `@lit/context` dans les
deux sens. Un élément défini avant son fournisseur récupère la valeur quand le fournisseur
s'annonce.

## Formulaires et focus

`FormAssociated` fait d'un élément un contrôle de formulaire comme `<input>` : il soumet une valeur,
signale sa validité, suit un `<fieldset>` désactivé, se réinitialise et se restaure.

```ts
class FxRating extends FormAssociated(typedElement(ratingProps)) {
  select(value: number) {
    this.value = value;
    this.setFormValue(String(value));
    this.setValidity(value ? {} : { valueMissing: true }, 'Pick a rating.');
  }
}
```

Le code de la page le traite comme n'importe quel champ : `el.form`, `el.checkValidity()`,
`new FormData(form)`. Pour le clavier, `rovingFocus` déplace le focus entre les éléments avec les
flèches, Début et Fin, `trapFocus` le garde dans une boîte de dialogue, et `tabbables` et
`deepActiveElement` trouvent les éléments focalisables à travers les racines shadow.

## Une fonction au lieu d'une classe

`defineElement` définit un élément depuis une fonction de configuration, avec une sous-classe en
dessous :

```ts
defineElement('fx-greeting', ({ props }) => html`<p>Hello, ${() => props.name()}</p>`, {
  props: { name: prop.string('world') },
});
```

La fonction reçoit `props` en accesseurs, `set`, `dispatch`, `provide`, `consume`, `targets` et
`children`. Prenez la classe quand l'élément a des méthodes publiques ou sera étendu.

## Rendu serveur

Dans une application Fluixi, un élément utilisé dans une page se rend sur le serveur comme la page
autour : ses props en attributs, les objets en JSON simple, son contenu dans le light DOM. Dans le
navigateur, il adopte ce balisage au lieu de le reconstruire, et attend que l'application s'hydrate
pour lire son contexte. Le shadow DOM déclaratif n'est pas encore émis : un élément à racine shadow
rend son contenu côté client.

`@fluixi/start` le met en place pour vous. Ailleurs, deux imports l'activent, et une application qui
les omet n'embarque rien de ce code : `@fluixi/web-components/server` là où le serveur rend,
`@fluixi/web-components/hydrate` dans le point d'entrée du navigateur.

```ts
import '@fluixi/web-components/server'; // point d'entrée serveur, avant le rendu
import '@fluixi/web-components/hydrate'; // point d'entrée client, avant l'hydratation
```

## Chargement et enregistrement

`defineCustomElement(name, constructor)` enregistre auprès du registre du navigateur et ignore un nom
déjà défini, ce qui compte quand des bundles autonomes incluent chacun une classe parente commune.
`defineWhenUsed(name, load)` n'enregistre qu'une fois la balise apparue dans le document : une page
qui n'utilise jamais un élément coûteux ne le charge jamais.
