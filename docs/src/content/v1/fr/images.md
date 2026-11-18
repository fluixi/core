# Images

`@fluixi/start` fournit un pipeline d'images : une route qui redimensionne et réencode à la
demande, et un loader qui y pointe le balisage.

```ts
// src/api/image.ts  →  /api/image
import { createImageHandler } from '@fluixi/start/image';

export const GET = createImageHandler({
  domains: ['images.example.com'],
});
```

`<Image>` est le composant de `@fluixi-ui/image` ; tout balisage qui accepte un `loader` fonctionne
de la même façon.

```tsx
import { imageLoader } from '@fluixi/start';
import { Image } from '@fluixi-ui/image';

const loader = imageLoader();   // par défaut /api/image

<Image src="/mug.jpg" loader={loader} widths={[120, 240, 480]} />;
```

Le gestionnaire lit `url`, `w` et éventuellement `q` dans la chaîne de requête : le seul
rôle du loader est de construire cette URL, donc tout ce qui sait produire un `srcset`
peut l'utiliser.

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
faire encoder des milliers de variantes ni saturer le cache. La liste par défaut couvre les
largeurs d'appareils courantes.

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
