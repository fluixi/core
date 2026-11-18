# Document de page

Chaque page servie par Fluixi part d'une enveloppe : `<html>`, `<head>`, `<body>` et l'élément
dans lequel l'application s'affiche. Par défaut, cette enveloppe est `index.html`, et pour la
plupart des applications elle peut le rester.

Quand l'enveloppe a besoin de valeurs de la requête, écrivez-la plutôt comme un composant : `lang`
selon la langue du visiteur, une classe de thème lue dans un cookie, `dir` pour une langue écrite
de droite à gauche. Dans `index.html`, ces valeurs ne peuvent être corrigées que dans le
navigateur une fois la page chargée, ce qui se voit comme un clignotement.

## Écrire le document

Placez un composant dans `src/document.tsx` :

```tsx
import { Html, Head, Main, Scripts, type DocumentProps } from '@fluixi/start/document';

export default function Document(props: DocumentProps) {
  return (
    <Html lang={props.locals.locale ?? 'fr'}>
      <Head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <body class={props.locals.theme}>
        <Main />
        <Scripts />
      </body>
    </Html>
  );
}
```

Une application écrite avec les templates `html` utilise `src/document.ts` :

```ts
import { html } from '@fluixi/core';
import { Html, Head, Main, Scripts, type DocumentProps } from '@fluixi/start/document';

export default function Document(props: DocumentProps) {
  return html`<${Html} lang=${props.locals.locale ?? 'fr'}>
    <${Head}><meta charset="utf-8" /></${Head}>
    <body><${Main} /><${Scripts} /></body>
  </${Html}>`;
}
```

Quand le fichier existe, il remplace `index.html`, que vous pouvez alors supprimer. Indiquez un
autre fichier avec `document` dans `fluixi.config.ts`, ou mettez `document: null` pour garder
`index.html` alors qu'un fichier de document se trouve dans `src/`.

## Les parties

| Partie | Produit |
| --- | --- |
| `Html` | l'élément `<html>`, avec les attributs que vous lui donnez |
| `Head` | le `<head>` : d'abord les scripts en ligne de Fluixi, puis vos enfants, puis les styles et préchargements du build |
| `Main` | l'élément où l'application s'affiche, la seule partie de la page qui s'hydrate |
| `Scripts` | le point d'entrée client |

`Main` est obligatoire : un document sans lui échoue avec un message qui nomme le fichier. Les
autres placent ce que Fluixi ajoute ; si l'une manque, ce contenu manque à la page.

Le composant reçoit la requête pour laquelle il s'affiche :

| Prop | |
| --- | --- |
| `request` | la `Request` Web |
| `url` | son URL, analysée |
| `locals` | ce que le [middleware](/v1/fr/middleware) a placé sur la requête |

Les valeurs de `locals` sont `unknown` tant que vous ne déclarez pas ce que votre middleware y
place :

```ts
declare module '@fluixi/dom' {
  interface RequestLocals {
    locale?: string;
    theme?: string;
  }
}
```

## Ce qui s'exécute où

Le document s'affiche sur le serveur, à chaque requête, après la chaîne de middleware. Il n'arrive
jamais dans le navigateur sous forme de code : seule l'application dans `Main` s'hydrate. Tout ce
qui fonctionne avec `index.html` fonctionne de la même façon avec lui : le streaming, les balises
de [`seo()`](/v1/fr/seo), les préchargements de route, le statut de la réponse.

Le document n'a donc ni état ni gestionnaire d'événement, et il s'affiche une fois par requête. Un
attribut qui doit changer pendant que la page est ouverte, un sélecteur de thème par exemple,
appartient à l'application : [`seo()`](/v1/fr/seo) pose des attributs sur `<html>` depuis
n'importe quelle page.

Si le document lève une erreur, la réponse est la page d'erreur simple, puisqu'il n'y a pas
d'enveloppe où l'afficher. Votre `public/error.html` passe avant, comme pour toute requête en
échec.

## Applications monopage et prérendu

Avec `ssr: false`, il n'y a pas de rendu par requête : le build affiche le document une fois, pour
`/` avec des locals vides, dans `dist/client/index.html`, et ce fichier est servi pour tous les
chemins. Les valeurs qui dépendent de la requête n'y sont pas disponibles.

Les [pages prérendues](/v1/fr/static-generation) passent par le serveur : chacune reçoit le
document affiché pour sa propre URL.

Tous les adaptateurs de déploiement prennent en charge le document.

Ensuite : **[Images](/v1/fr/images)**.
