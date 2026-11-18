# Génération statique

Définissez `prerender` dans `fluixi.config` et `fluixi build` rend vos routes en **HTML
statique** dans `dist/client`, déployez sur n'importe quel hébergeur statique ; les pages
s'hydratent côté client.

```ts
// fluixi.config.ts
import { defineConfig } from '@fluixi/start/config';

export default defineConfig({
  ssr: true,
  prerender: true, // explore depuis « / » en suivant les liens internes
});
```

`prerender` **exige `ssr: true`**, car le prérendu est du rendu serveur exécuté au moment
du build plutôt qu'à chaque requête. Désactiver le SSR ne laisse rien avec quoi rendre.

Ce site de documentation est construit ainsi.

## Choisir ce qui est rendu

`prerender: true` part de `/` et suit les liens internes. Cela couvre un site dont les pages
sont atteignables par navigation, et manque tout ce qui ne l'est pas, une route derrière un
formulaire, une page de détail dont la liste est paginée, une URL non référencée.

Listez-les explicitement :

```ts
export default defineConfig({
  ssr: true,
  prerender: { routes: ['/', '/blog/hello'], crawl: true },
});
```

`routes` est la liste de départ, `crawl` décide si les liens trouvés dans la sortie sont
suivis à leur tour. Mettez `crawl: false` pour rendre exactement les routes listées et rien
d'autre, ce que vous voulez quand l'ensemble est généré depuis un CMS ou un dossier de
contenu.

Une route dynamique demande une entrée par URL concrète : `/blog/[slug]` est un motif, pas
une page ; `/blog/hello` et `/blog/world` sont donc deux entrées.

## Ce qu'est la sortie

Chaque page est rendue par le **véritable gestionnaire de production** : la sortie statique
est donc identique à ce que `fluixi start` servirait, assets, données sérialisées,
marqueurs d'hydratation compris. Il n'existe pas de second chemin de rendu susceptible de
diverger.

Cela veut aussi dire que tout ce que la page charge au moment du rendu est figé au build.
Une route affichant « les articles des dernières 24 heures » montre les 24 heures précédant
le build, jusqu'au build suivant. Une donnée qui doit être à jour doit être récupérée côté
client, ou la route exclue du prérendu et servie par un serveur.

## Ce qui ne s'exécute pas

Une page prérendue est un fichier. À la requête, il n'y a aucun travail serveur : le
[middleware](/v1/fr/middleware) ne s'exécute donc pas pour elle, ni les fonctions serveur
tant que la page n'est pas hydratée et n'en appelle pas une. Une vérification par requête,
authentification, géolocalisation, un test A/B, ne peut pas vivre uniquement dans le
middleware si la route est aussi prérendue.

Les fichiers prérendus sont destinés à un hôte qui les sert avant d'appeler le serveur : un hôte
statique, ou une plateforme que l'adaptateur configure ainsi (l'adaptateur Cloudflare les liste
dans `_routes.json`). `fluixi start` ne les lit pas : il rend chaque page à chaque requête,
prérendue ou non, et le middleware s'exécute pour chacune. Les déploiements mixtes sont valables
sur un tel hôte : prérendez les pages vitrine, et les routes applicatives vont au serveur.

## Déployer des fichiers seulement

Quand le site va sur un hôte statique sans aucun serveur, dites-le avec `static: true` :

```ts
export default defineConfig({
  ssr: true,
  prerender: { routes: ['/', '/pricing'], static: true },
});
```

Le build liste alors ce qui y échouerait : un lien, dans une page prérendue, vers une page qui
ne l'a pas été (l'hôte n'a pas de fichier pour elle), et une page dont le code appelle une
fonction serveur (l'appel n'a pas de serveur à joindre quand la page est ouverte par navigation
côté client). Chaque ligne nomme la page : ajoutez-la à `routes`, chargez ses données autrement,
ou déployez le serveur malgré tout.

Ensuite : **[Déploiement](/v1/fr/deployment)**.
