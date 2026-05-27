// Gestion globale de l'authentification via signaux
// État partagé entre toutes les routes et composants
import { createSignal, createContext, useContext } from '@awc/kettlejs';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar: string;
}

export interface AuthState {
  user: () => User | null;
  isAuthenticated: () => boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<boolean>;
}

// Contexte d'authentification — accessible partout via useAuth()
export const AuthContext = createContext<AuthState>();

// Base de données simulée des utilisateurs
const USERS_DB: Record<string, { password: string; user: User }> = {
  'admin@kettle.dev': {
    password: 'admin',
    user: { id: '1', name: 'Alice Martin', email: 'admin@kettle.dev', role: 'admin', avatar: 'AM' },
  },
  'user@kettle.dev': {
    password: 'user',
    user: { id: '2', name: 'Bob Dupont', email: 'user@kettle.dev', role: 'user', avatar: 'BD' },
  },
};

// Simule un délai réseau
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AuthProvider(props: { children?: any }) {
  const [user, setUser] = createSignal<User | null>(null);

  const isAuthenticated = () => user() !== null;

  // Connexion simulée — vérifie dans la "base" locale
  const login = async (email: string, password: string): Promise<boolean> => {
    await delay(800);
    const entry = USERS_DB[email];
    if (entry && entry.password === password) {
      setUser(entry.user);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  // Inscription simulée — ajoute dans la "base" locale
  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    await delay(600);
    if (USERS_DB[email]) return false; // déjà existant
    const newUser: User = {
      id: String(Date.now()),
      name,
      email,
      role: 'user',
      avatar: name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2),
    };
    USERS_DB[email] = { password, user: newUser };
    setUser(newUser);
    return true;
  };

  const value: AuthState = { user, isAuthenticated, login, logout, register };

  console.log('register provider auth')
  return AuthContext.Provider({ value, children: props.children, debug: true }) as JSX.Element;
}


// Hook raccourci pour accéder au contexte d'auth
export function useAuth(): AuthState {
  console.log('using auth context', AuthContext)
  return useContext(AuthContext)!;
}
