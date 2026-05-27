// API simulée — toutes les fonctions de données pour l'application
// Utilise cache() pour la déduplication et revalidate() pour l'invalidation
import { cache, action, revalidate } from '@awc/kettlejs/router';

// ============================================================================
// Types
// ============================================================================

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  tags: string[];
}

export interface DashboardStats {
  users: number;
  revenue: number;
  orders: number;
  conversion: number;
}

export interface AnalyticsData {
  pageViews: { page: string; views: number }[];
  topReferrers: { source: string; visits: number }[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  bio: string;
  role: string;
}

// ============================================================================
// Base de données simulée
// ============================================================================

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const POSTS_DB: BlogPost[] = [
  {
    slug: 'premiers-pas-kettlejs',
    title: 'Premiers pas avec KettleJS',
    excerpt: 'Découvrez comment créer votre première application réactive.',
    content: `KettleJS est un framework réactif moderne qui combine le meilleur de SolidJS et lit-html.

Il offre des signaux fins, un routeur intégré, le rendu SSR, et une interopérabilité totale entre JSX et les templates lit-html.

## Signaux réactifs

\`\`\`ts
const [count, setCount] = createSignal(0);
\`\`\`

## Templates lit-html

\`\`\`ts
return html\`<button @click=\${() => setCount(c => c + 1)}>\${count()}</button>\`;
\`\`\``,
    author: 'Alice Martin',
    date: '2025-12-15',
    tags: ['kettlejs', 'tutoriel'],
  },
  {
    slug: 'routage-fichiers',
    title: 'Routage basé sur les fichiers',
    excerpt: 'Comment le système de routes fonctionne avec la convention de fichiers.',
    content: `Le routeur KettleJS supporte le routage basé sur les fichiers, similaire à Next.js ou SolidStart.

## Structure

- \`routes/index.tsx\` → \`/\`
- \`routes/blog/[slug].tsx\` → \`/blog/:slug\`
- \`routes/(auth)/login.tsx\` → \`/login\`
- \`routes/[...rest].tsx\` → page 404

## Layouts imbriqués

Chaque dossier peut contenir un \`layout.tsx\` qui enveloppe les routes enfants via \`<Outlet />\`.`,
    author: 'Bob Dupont',
    date: '2025-12-20',
    tags: ['routage', 'architecture'],
  },
  {
    slug: 'signaux-avances',
    title: 'Signaux avancés et stores',
    excerpt: 'Plongez dans les stores réactifs et les patterns avancés.',
    content: `Les signaux KettleJS permettent un suivi fin des dépendances sans Virtual DOM.

## createSignal vs createStore

- **createSignal** : valeur atomique (nombre, chaîne, objet immutable)
- **createStore** : objet réactif en profondeur, mutations ciblées

## Mémos et effets

\`\`\`ts
const doubled = createMemo(() => count() * 2);
createEffect(() => console.log('Valeur:', doubled()));
\`\`\``,
    author: 'Alice Martin',
    date: '2026-01-05',
    tags: ['signaux', 'avancé'],
  },
];

const PROFILES_DB: Record<string, UserProfile> = {
  '1': { id: '1', name: 'Alice Martin', email: 'admin@kettle.dev', bio: 'Développeuse senior', role: 'admin' },
};

// ============================================================================
// Requêtes (avec cache)
// ============================================================================

// Récupère tous les articles de blog
export const getPosts = cache(async (): Promise<BlogPost[]> => {
  await delay(600);
  return [...POSTS_DB];
}, 'posts');

// Récupère un article par son slug
export const getPost = cache(async (slug: string): Promise<BlogPost | undefined> => {
  await delay(400);
  return POSTS_DB.find((p) => p.slug === slug);
}, 'post');

// Statistiques du tableau de bord
export const getDashboardStats = cache(async (): Promise<DashboardStats> => {
  await delay(500);
  return { users: 1247, revenue: 52340, orders: 389, conversion: 3.2 };
}, 'dashboard-stats');

// Données analytiques
export const getAnalytics = cache(async (): Promise<AnalyticsData> => {
  await delay(700);
  return {
    pageViews: [
      { page: '/accueil', views: 4521 },
      { page: '/blog', views: 2103 },
      { page: '/dashboard', views: 1876 },
      { page: '/à-propos', views: 892 },
    ],
    topReferrers: [
      { source: 'Google', visits: 3241 },
      { source: 'Twitter', visits: 1502 },
      { source: 'GitHub', visits: 987 },
      { source: 'Direct', visits: 2100 },
    ],
  };
}, 'analytics');

// Profil utilisateur
export const getProfile = cache(async (id: string): Promise<UserProfile | undefined> => {
  await delay(300);
  return PROFILES_DB[id];
}, 'profile');

// ============================================================================
// Actions (mutations)
// ============================================================================

// Met à jour le profil utilisateur
export const updateProfile = action(async (formData: FormData) => {
  await delay(500);
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const bio = formData.get('bio') as string;

  if (PROFILES_DB[id]) {
    PROFILES_DB[id] = { ...PROFILES_DB[id], name, email, bio };
    revalidate('profile');
    return PROFILES_DB[id];
  }
  throw new Error('Profil introuvable');
}, 'updateProfile');

// Crée un nouveau post (action simulée)
export const createPost = action(async (formData: FormData) => {
  await delay(600);
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const post: BlogPost = {
    slug,
    title,
    content,
    excerpt: content.slice(0, 120) + '...',
    author: 'Utilisateur',
    date: new Date().toISOString().split('T')[0],
    tags: ['nouveau'],
  };
  POSTS_DB.unshift(post);
  revalidate('posts');
  return post;
}, 'createPost');
