# Le routage

`@fluixi/start` fournit un **routage par fichiers** : les fichiers de `src/routes/` deviennent des
routes.

```
src/routes/
  index.tsx        →  /
  about.tsx        →  /about
  blog/[slug].tsx  →  /blog/:slug
  (admin)/layout.tsx  →  un groupe de mise en page
```

## Segments dynamiques & paramètres

`[param]` capture un segment ; lisez-le avec `useParams` (qui renvoie un **accesseur**) :

```tsx
import { useParams } from '@fluixi/start/router';

export default function Post() {
  const params = useParams<{ slug: string }>();
  return <h1>{params().slug}</h1>;
}
```

## Mises en page imbriquées

Un `layout.tsx` enveloppe ses routes enfants autour d'un `<Outlet/>` :

```tsx
import { Outlet } from '@fluixi/start/router';

export default function AdminLayout() {
  return <div class="admin"><Sidebar /><Outlet /></div>;
}
```

## Navigation

Utilisez `useNavigate` pour la navigation programmatique ; un simple `<a href>` fonctionne pour les
liens en pleine page.

```tsx
import { useNavigate } from '@fluixi/start/router';
const navigate = useNavigate();
navigate('/dashboard');
```

Suivant : **[Les fonctions serveur](/v1/fr/server-functions)**.
