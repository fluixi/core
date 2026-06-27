# Routing

`@fluixi/start` gives you **file-based routing**: files in `src/routes/` become routes.

```
src/routes/
  index.tsx        →  /
  about.tsx        →  /about
  blog/[slug].tsx  →  /blog/:slug
  (admin)/layout.tsx  →  a layout group
```

## Dynamic segments & params

`[param]` captures a segment; read it with `useParams` (it returns an **accessor**):

```tsx
import { useParams } from '@fluixi/start/router';

export default function Post() {
  const params = useParams<{ slug: string }>();
  return <h1>{params().slug}</h1>;
}
```

## Nested layouts

A `layout.tsx` wraps its child routes around an `<Outlet/>`:

```tsx
import { Outlet } from '@fluixi/start/router';

export default function AdminLayout() {
  return <div class="admin"><Sidebar /><Outlet /></div>;
}
```

## Navigation

Use `useNavigate` for programmatic navigation; plain `<a href>` works for full-page links.

```tsx
import { useNavigate } from '@fluixi/start/router';
const navigate = useNavigate();
navigate('/dashboard');
```

Next: **[Server functions](/v1/en/server-functions)**.
