import { cache, action, revalidate } from '@awc/kettlejs/router';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const DB: Record<string, User> = {
  '1': { id: '1', name: 'Alice', email: 'alice@example.com', role: 'Admin' },
  '2': { id: '2', name: 'Bob', email: 'bob@example.com', role: 'User' },
  '3': { id: '3', name: 'Charlie', email: 'charlie@example.com', role: 'User' },
};

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Queries (Cached) ---

export const getUsers = cache(async () => {
  await delay(1500);
  console.log('get users list', DB);
  return Object.values(DB);
}, 'users');

export const getUser = cache(async (id: string) => {
  await delay(100);
  return DB[id];
}, 'user');

// --- Actions (Mutations) ---

export const updateUser = action(async (formData: FormData) => {
  await delay(500);
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const role = formData.get('role') as string;

  if (DB[id]) {
    DB[id] = { ...DB[id], name, email, role };
    // Invalidate caches
    revalidate('users');
    revalidate('user');
  }
  return DB[id];
}, 'updateUser');

export const deleteUser = action(async (id: string) => {
  await delay(300);
  delete DB[id];
  revalidate('users');
  return true;
}, 'deleteUser');
