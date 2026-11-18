# Images

`@fluixi/start` fournit un pipeline d'images : une route qui redimensionne et réencode à la
demande, et un composant `Img` qui lui demande la taille à laquelle chaque image s'affiche.

```ts
// src/api/image.ts  →  /api/image
import { createImageHandler } from '@fluixi/start/image/server';

export const GET = createImageHandler({
  domains: ['images.example.com'],
});
```

```tsx
import { Img } from '@fluixi/start/image';

<Img src="/mug.jpg" alt="Une tasse" width={480} height={320} />;
```

`Img` produit un seul `<img>` avec un `srcset`, et rien d'autre : ni enveloppe, ni styles, ni
état.

| Prop | |
| --- | --- |
| `width`, `height` | la taille propre de l'image, pour que le navigateur réserve sa place ; les URL sont ses largeurs 1x et 2x |
| `sizes` | la largeur d'affichage, pour une mise en page qui la décide ; le `srcset` liste alors toutes les largeurs |
| `priority` | une image au-dessus de la ligne de flottaison : chargée tout de suite et en priorité, au lieu de paresseusement |
| `fill` | couvrir le parent positionné, sans taille propre ; affichée à `100vw` sauf si `sizes` dit autre chose |
| `quality` | transmise au point d'accès, qui la plafonne |
| `loader` | construit les URL, par défaut pour `/api/image` ; toute fonction `({ src, width, quality }) => url`, celle d'un CDN par exemple |
| `unoptimized` | le `src` tel quel ; les sources SVG sont toujours servies ainsi |

Tout autre attribut va sur le `<img>`.

Le gestionnaire lit `url`, `w` et éventuellement `q` dans la chaîne de requête, et
`imageLoader()` construit cette URL. Pour une image stylée, avec un état de chargement, un
espace réservé et une image de repli, utilisez `@fluixi-ui/image` avec le même loader :

```tsx
import { imageLoader } from '@fluixi/start/image';
import { Image } from '@fluixi-ui/image';

<Image src="/mug.jpg" loader={imageLoader()} widths={[120, 240, 480]} aspectRatio={3 / 2} />;
```

## Configurer le gestionnaire

```ts
export const GET = createImageHandler({
  root: './public',              // d'où sont lues les sources locales /foo.jpg
  domains: ['images.example.com'],
  sizes: [320, 640, 1280],
  quality: 80,
  cacheMaxAge: 60 * 60 * 24 * 365,
  cache: 100,
});
```

Chaque option a une valeur par défaut défendable ; deux méritent d'être choisies
délibérément.

**`domains` est une protection contre le SSRF.** Un point d'entrée d'images qui récupère
n'importe quelle URL qu'on lui donne permet de faire émettre à votre serveur des requêtes
arbitraires, y compris vers des adresses internes qu'un navigateur n'atteindrait jamais.
Les sources absolues ne sont récupérées que depuis les hôtes que vous listez : ne rien
mettre signifie donc n'autoriser que les fichiers locaux. C'est la valeur par défaut sûre,
et la raison de l'élargir consciemment.

**`sizes` borne le travail.** Une requête pour une largeur hors de la liste est rejetée
plutôt que redimensionnée : un robot qui parcourt `?w=1`, `?w=2`, `?w=3` ne peut donc pas
faire encoder des milliers de variantes ni saturer le cache. La liste par défaut,
`IMAGE_WIDTHS`, couvre les largeurs d'appareils courantes, et c'est aussi celle à partir de
laquelle `Img` construit ses URL. Si vous fixez vos propres `sizes`, donnez la même liste à
`Img` en `widths`, sinon il demande des largeurs que le gestionnaire refuse.

`quality` est à la fois la valeur par défaut et le plafond, une requête qui demande plus
que la qualité configurée ne l'obtient pas.

## Encodage

La transformation utilise **`sharp` s'il est installé**, et laisse passer l'original tel
quel sinon. Le pipeline se dégrade donc en simple service de fichiers plutôt que d'échouer,
et ajouter `sharp` est ce qui active l'optimisation :

```
pnpm add sharp
```

Fournissez votre propre `transform` pour utiliser un autre codec.

## Mise en cache

Les réponses partent avec un `Cache-Control` immuable de longue durée, ce qui est sûr car
l'URL encode la transformation : une largeur ou une qualité différente est une URL
différente. Devant cela se trouve un petit cache mémoire des résultats récents (100 entrées
par défaut), pour qu'une requête répétée ne réencode pas. Mettez `cache: false` pour le
désactiver, ou un nombre pour le dimensionner.

En production, la plupart des requêtes ne devraient jamais atteindre le gestionnaire : un
CDN placé devant servira lui-même les réponses immuables.

Ensuite : **[Génération statique](/v1/fr/static-generation)**.
