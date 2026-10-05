# Styles

Un composant peut porter son propre CSS. Écrivez-le dans un bloc `<style>` à côté du balisage, ou
comme une valeur `css` que vous pouvez partager et composer. Le compilateur le sort du composant,
le moteur CSS le traite avec le thème du projet, et Vite le sert comme n'importe quelle feuille de
style : regroupé dans un build, rechargé à chaud en dev, intégré au premier rendu serveur.

```tsx
export function Card(props: { title: string }) {
  return (
    <article class="card">
      <style scoped>{`
        .card { @apply rounded-xl p-6 shadow-sm; }
        h2 { margin: 0 0 8px; }
      `}</style>
      <h2>{() => props.title}</h2>
    </article>
  );
}
```

## Mise en place

Les styles de composant sont traités par `@fluixi-css`. Ajoutez son plugin Vite et indiquez-lui le
fichier CSS qui porte votre thème :

```ts
// vite.config.ts
import fluixiCss from '@fluixi-css/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [fluixiCss({ theme: './src/styles/theme.css' })],
});
```

`theme` est l'endroit où vivent `@theme`, `@utility` et `@custom-variant`. Dans un composant,
`@apply` et les valeurs du thème se résolvent avec lui : un composant se compile exactement comme
votre feuille de style globale. Sans le plugin, un `<style>` reste un élément ordinaire et rien
n'est compilé.

## Blocs de style

En JSX, le CSS va dans un template literal enfant. JSX lit chaque `{` comme du code, donc du CSS
écrit directement dans l'élément est une erreur de syntaxe :

```tsx
<style>{`
  .card { padding: 1rem; }
`}</style>
```

Dans un template `` html`` ``, le CSS est le texte de l'élément :

```ts
html`
  <style scoped>.card { padding: 1rem; }</style>
  <article class="card">${() => props.title}</article>
`;
```

Un bloc peut se placer n'importe où dans ce que le composant renvoie. Il n'affiche rien : le
compilateur le retire, et chaque bloc devient une feuille de style, chargée une fois quel que soit
le nombre de rendus du composant.

Un `<style>` simple est du CSS global livré avec le composant. Ses sélecteurs s'appliquent à toute
la page.

## Styles scopés

`<style scoped>` limite ses règles aux éléments que le composant rend. Chacun de ces éléments reçoit
un attribut `data-fx-s`, de même valeur pour tous les éléments du composant, et chaque sélecteur
est restreint à cet attribut :

```css
/* écrit */
.card h2:hover { color: red; }
/* compilé */
.card h2[data-fx-s="k3x9a1"]:hover { color: red; }
```

L'attribut fait partie du template compilé : il est présent dans un rendu navigateur, dans un
rendu serveur et après l'hydratation.

Deux échappatoires :

- `:global(.dark) .card` laisse `.dark` hors du scope, pour un sélecteur qui dépend de quelque
  chose hors du composant, comme un attribut de thème sur `<html>`.
- `.card :deep(.title)` arrête le scope là où commence `:deep`. Les éléments d'un composant enfant
  ne reçoivent pas l'attribut du vôtre : c'est ainsi que vous les atteignez.

## Valeurs partagées avec css``

Une valeur `css` est du CSS que vous pouvez nommer, partager et composer. Dans une app, `$css` ne
demande aucun import ; dans un paquet, importez `css` depuis `@fluixi/core` :

```ts
// card.styles.ts
export const surface = $css`
  .surface { @apply rounded-xl bg-white shadow-sm; }
`;
```

Composez des valeurs en les interpolant, dans une autre valeur `css` ou dans un bloc de style :

```tsx
import { surface } from './card.styles';

export function Card() {
  return (
    <article class="surface card">
      <style scoped>{`
        ${surface}
        .card { padding: 1rem; }
      `}</style>
    </article>
  );
}
```

Une valeur composée dans un bloc scopé prend le scope de ce bloc. La valeur elle-même n'est jamais
produite seule, seulement là où quelque chose l'utilise : une valeur inutilisée ne coûte rien. Les
valeurs peuvent venir d'un autre module ; le build les résout.

Seules les valeurs `css` peuvent être interpolées, et seulement par leur nom. Une valeur calculée à
l'exécution n'a pas sa place dans une feuille de style : faites-la passer par une propriété
personnalisée.

## Des valeurs qui changent

Posez une propriété personnalisée sur l'élément et lisez-la avec `var()` :

```tsx
<div class="bar" style={{ '--progress': `${progress()}%` }}>
  <style scoped>{`.bar { width: var(--progress); }`}</style>
</div>
```

Dans un template `` html`` ``, `style:--progress=${value}` fait la même chose. Chaque propriété se
met à jour seule quand sa valeur change. [Directives](/v1/fr/directives) détaille `class:` et
`style:`.

## Web components avec un shadow root

Dans un élément doté d'un shadow root ([Web components](/v1/fr/web-components)), les blocs de
style vont dans le shadow root plutôt que dans la page. Ils sont ajoutés aux `static styles` de la
classe et ne sont pas scopés, puisque le shadow root les isole déjà. Les valeurs `css` listées dans
`static styles` sont elles aussi compilées en leur CSS :

```ts
import { base } from './base.styles';

export class FxCard extends typedElement(cardProps) {
  static override shadow = 'open' as const;
  static override styles = [base, ':host { display: block; }'];
  protected override render() {
    return html`<style>.card { padding: 1rem; }</style><div class="card"><slot></slot></div>`;
  }
}
```

## Couches de cascade

Les styles de composant ne sont dans aucune couche, et le CSS hors couche l'emporte sur toutes les
couches. Si un composant doit passer sous quelque chose en couche, comme un skin `@fluixi-ui`,
placez ses règles dans une couche :

```css
@layer flx.components {
  .card { padding: 1rem; }
}
```

## En développement

Modifier un bloc de style parvient à la page par la mise à jour du serveur de dev, sans
redémarrage. Dans les outils du navigateur, une règle renvoie à la ligne du composant où elle a été
écrite quand Vite a `css.devSourcemap: true`. Les règles produites par `@apply` renvoient à la
ligne du `@apply`.

## Bibliothèques de composants

Un paquet construit avec le mode bibliothèque de Vite écrit les styles de chaque module dans un
fichier à côté de lui, `button.css` à côté de `button.js`, et le module l'importe. Tout bundler qui
accepte un import `.css` l'accepte, et une app n'a besoin d'aucun plugin Fluixi pour consommer le
paquet. Un `button.css.js` à côté ajoute la feuille de style en `<link>`, pour les pages qui
chargent le paquet par une import map.

Une bibliothèque n'a pas de thème d'app : construisez-la avec `fluixiCss({ theme: false })`. Son
CSS lit alors les tokens de design par des propriétés personnalisées et laisse leurs valeurs à
l'app.
