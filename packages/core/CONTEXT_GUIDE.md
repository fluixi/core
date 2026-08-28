# Fluixi Context Guide

## Overview

Fluixi provides a powerful context API for sharing state across component trees, following SolidJS patterns and SPEC.md Section 9 specifications.

**Key Features:**
- ✅ Lookup-based (traverses owner tree)
- ✅ No server subscriptions (snapshot only)
- ✅ Supports nested contexts
- ✅ Works with JSX and Lit-html
- ✅ Type-safe with TypeScript
- ✅ Complex values (objects, functions)

---

## Basic Usage

### Creating a Context

```typescript
import { createContext, useContext } from 'fluixi';

// Simple value context
const ThemeContext = createContext('light');

// Object context with methods
const AppContext = createContext({
  user: null as User | null,
  login: (user: User) => {},
  logout: () => {},
});
```

### Using Context in Components

```typescript
import { html } from 'lit';
import { useContext } from 'fluixi';

const Child = () => {
  const theme = useContext(ThemeContext);
  
  return html`<div class=${theme}>Content</div>`;
};
```

---

## Nested Contexts

### JSX Syntax

```typescript
import { createContext, useContext, createSignal } from 'fluixi';

// Define contexts
const ThemeContext = createContext('light');
const UserContext = createContext({ name: 'Guest', role: 'visitor' });

const App = () => {
  const [theme, setTheme] = createSignal('dark');
  const [user, setUser] = createSignal({ name: 'Alice', role: 'admin' });

  return (
    <ThemeContext.Provider value={theme()}>
      <UserContext.Provider value={user()}>
        <Dashboard />
      </UserContext.Provider>
    </ThemeContext.Provider>
  );
};

const Dashboard = () => {
  const theme = useContext(ThemeContext);
  const user = useContext(UserContext);

  return (
    <div>
      <p>Theme: {theme}</p>
      <p>User: {user.name} ({user.role})</p>
    </div>
  );
};
```

### Lit-html Syntax

```typescript
import { html } from 'lit';
import { createContext, useContext, createSignal } from 'fluixi';

const ThemeContext = createContext('light');
const UserContext = createContext({ name: 'Guest', role: 'visitor' });

const App = () => {
  const [theme, setTheme] = createSignal('dark');
  const [user, setUser] = createSignal({ name: 'Alice', role: 'admin' });

  return html`
    <${ThemeContext.Provider} value=${theme()}>
      <${UserContext.Provider} value=${user()}>
        <${Dashboard} />
      </${UserContext.Provider}>
    </${ThemeContext.Provider}>
  `;
};

const Dashboard = () => {
  const theme = useContext(ThemeContext);
  const user = useContext(UserContext);

  return html`
    <div>
      <p>Theme: ${theme}</p>
      <p>User: ${user.name} (${user.role})</p>
    </div>
  `;
};
```

---

## Complex Context Values

### Context with Functions

```typescript
import { createContext, useContext, createSignal } from 'fluixi';
import { html } from 'lit';

interface ThemeContextValue {
  theme: string;
  toggleTheme: () => void;
  setTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

const ThemeProvider = (props: { children: any }) => {
  const [theme, setTheme] = createSignal('light');

  const toggleTheme = () => {
    setTheme(theme() === 'light' ? 'dark' : 'light');
  };

  const contextValue = {
    theme: theme(),
    toggleTheme,
    setTheme,
  };

  return html`
    <${ThemeContext.Provider} value=${contextValue}>
      ${props.children}
    </${ThemeContext.Provider}>
  `;
};

const ThemeToggle = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return html`
    <button @click=${toggleTheme}>
      Current theme: ${theme} (Click to toggle)
    </button>
  `;
};

// Usage
const App = () => {
  return html`
    <${ThemeProvider}>
      <${ThemeToggle} />
    </${ThemeProvider}>
  `;
};
```

### Context with Reactive Values

```typescript
import { createContext, useContext, createSignal, createMemo } from 'fluixi';
import { html } from 'lit';

interface CounterContextValue {
  count: () => number;
  increment: () => void;
  decrement: () => void;
  doubled: () => number;
}

const CounterContext = createContext<CounterContextValue>({
  count: () => 0,
  increment: () => {},
  decrement: () => {},
  doubled: () => 0,
});

const CounterProvider = (props: { children: any }) => {
  const [count, setCount] = createSignal(0);
  const doubled = createMemo(() => count() * 2);

  const contextValue: CounterContextValue = {
    count,
    increment: () => setCount(count() + 1),
    decrement: () => setCount(count() - 1),
    doubled,
  };

  return html`
    <${CounterContext.Provider} value=${contextValue}>
      ${props.children}
    </${CounterContext.Provider}>
  `;
};

const Counter = () => {
  const { count, increment, decrement, doubled } = useContext(CounterContext);

  return html`
    <div>
      <p>Count: ${count()}</p>
      <p>Doubled: ${doubled()}</p>
      <button @click=${increment}>+</button>
      <button @click=${decrement}>-</button>
    </div>
  `;
};
```

---

## Multiple Nested Contexts

### Auth + Theme + Language

```typescript
import { createContext, useContext, createSignal } from 'fluixi';
import { html } from 'lit';

// Define contexts
const AuthContext = createContext({ user: null, isAuthenticated: false });
const ThemeContext = createContext({ theme: 'light', colors: {} });
const LanguageContext = createContext({ lang: 'en', t: (key: string) => key });

// Root provider wrapper
const AppProviders = (props: { children: any }) => {
  // Auth state
  const [user, setUser] = createSignal(null);
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  
  const authValue = {
    user: user(),
    isAuthenticated: isAuthenticated(),
    login: (userData: any) => {
      setUser(userData);
      setIsAuthenticated(true);
    },
    logout: () => {
      setUser(null);
      setIsAuthenticated(false);
    },
  };

  // Theme state
  const [theme, setTheme] = createSignal('light');
  const themeValue = {
    theme: theme(),
    colors: theme() === 'light' 
      ? { bg: '#fff', text: '#000' }
      : { bg: '#000', text: '#fff' },
    toggleTheme: () => setTheme(theme() === 'light' ? 'dark' : 'light'),
  };

  // Language state
  const [lang, setLang] = createSignal('en');
  const translations: Record<string, Record<string, string>> = {
    en: { hello: 'Hello', goodbye: 'Goodbye' },
    es: { hello: 'Hola', goodbye: 'Adiós' },
  };
  
  const languageValue = {
    lang: lang(),
    t: (key: string) => translations[lang()][key] || key,
    setLang,
  };

  // Nested providers
  return html`
    <${AuthContext.Provider} value=${authValue}>
      <${ThemeContext.Provider} value=${themeValue}>
        <${LanguageContext.Provider} value=${languageValue}>
          ${props.children}
        </${LanguageContext.Provider}>
      </${ThemeContext.Provider}>
    </${AuthContext.Provider}>
  `;
};

// Component using all contexts
const Dashboard = () => {
  const auth = useContext(AuthContext);
  const theme = useContext(ThemeContext);
  const lang = useContext(LanguageContext);

  return html`
    <div style="background: ${theme.colors.bg}; color: ${theme.colors.text}">
      <h1>${lang.t('hello')}, ${auth.user?.name || 'Guest'}!</h1>
      <button @click=${theme.toggleTheme}>Toggle Theme</button>
      <button @click=${() => lang.setLang(lang.lang === 'en' ? 'es' : 'en')}>
        Change Language
      </button>
      ${auth.isAuthenticated 
        ? html`<button @click=${auth.logout}>Logout</button>`
        : html`<button @click=${() => auth.login({ name: 'Alice' })}>Login</button>`
      }
    </div>
  `;
};

// App
const App = () => {
  return html`
    <${AppProviders}>
      <${Dashboard} />
    </${AppProviders}>
  `;
};
```

---

## Context Best Practices

### 1. Type Safety

```typescript
// Define interface for context value
interface AppContextValue {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

// Create typed context
const AppContext = createContext<AppContextValue>({
  user: null,
  isLoading: false,
  error: null,
  login: async () => {},
  logout: () => {},
});

// Type-safe usage
const Component = () => {
  const { user, login, logout } = useContext(AppContext);
  // TypeScript knows the types!
};
```

### 2. Default Values

```typescript
// Provide sensible defaults
const ThemeContext = createContext({
  theme: 'light',
  primaryColor: '#007bff',
  toggleTheme: () => console.warn('ThemeContext not provided'),
});

// Now useContext always returns a valid value
const Component = () => {
  const theme = useContext(ThemeContext);
  // theme is never undefined
};
```

### 3. Custom Hooks

```typescript
// Create custom hook for context
function useTheme() {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  
  return context;
}

// Usage
const Component = () => {
  const { theme, toggleTheme } = useTheme();
  // Guaranteed to have context or throws helpful error
};
```

### 4. Context Splitting

```typescript
// Instead of one large context
const BadContext = createContext({
  user: null,
  theme: 'light',
  language: 'en',
  notifications: [],
  // ... 20 more properties
});

// Split into logical contexts
const UserContext = createContext({ user: null });
const ThemeContext = createContext({ theme: 'light' });
const LanguageContext = createContext({ language: 'en' });
const NotificationContext = createContext({ notifications: [] });

// Benefits:
// - Better performance (fewer re-renders)
// - Clearer dependencies
// - Easier testing
// - More maintainable
```

---

## Server-Side Rendering

### Context on Server

```typescript
import { createContext, useContext } from 'fluixi/server';
import { renderToString } from 'fluixi/server';
import { html } from 'lit';

// Server: Context works but with snapshot values
const ThemeContext = createContext('light');

const App = () => {
  return html`
    <${ThemeContext.Provider} value=${'dark'}>
      <${Child} />
    </${ThemeContext.Provider}>
  `;
};

const Child = () => {
  const theme = useContext(ThemeContext); // 'dark' (snapshot)
  return html`<div>Theme: ${theme}</div>`;
};

// Server render
const htmlString = await renderToString(() => App());
// Output: <div>Theme: dark</div>
```

### Hydration with Context

```typescript
import { setHydrationData } from 'fluixi/server';

// Server: Store context values for hydration
const App = () => {
  const theme = 'dark';
  const user = { name: 'Alice', role: 'admin' };

  // Store for client hydration
  setHydrationData('theme', theme);
  setHydrationData('user', user);

  return html`
    <${ThemeContext.Provider} value=${theme}>
      <${UserContext.Provider} value=${user}>
        <${Dashboard} />
      </${UserContext.Provider}>
    </${ThemeContext.Provider}>
  `;
};

// Client: Restore from hydration data
import { getHydrationData } from 'fluixi/server';
import { render } from 'fluixi';

const hydratedTheme = getHydrationData('theme');
const hydratedUser = getHydrationData('user');

render(() => App({ theme: hydratedTheme, user: hydratedUser }), root);
```

---

## Advanced Patterns

### Context Composition

```typescript
// Compose multiple contexts into one provider
const AppProvider = (props: { children: any }) => {
  return html`
    <${AuthProvider}>
      <${ThemeProvider}>
        <${RouterProvider}>
          <${NotificationProvider}>
            ${props.children}
          </${NotificationProvider}>
        </${RouterProvider}>
      </${ThemeProvider}>
    </${AuthProvider}>
  `;
};
```

### Context with Reducers

```typescript
import { createContext, useContext, useReducer } from 'fluixi';

type State = { count: number; step: number };
type Action = 
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'setStep'; step: number };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'increment': return { ...state, count: state.count + state.step };
    case 'decrement': return { ...state, count: state.count - state.step };
    case 'setStep': return { ...state, step: action.step };
    default: return state;
  }
};

const CounterContext = createContext<{
  state: () => State;
  dispatch: (action: Action) => void;
}>({
  state: () => ({ count: 0, step: 1 }),
  dispatch: () => {},
});

const CounterProvider = (props: { children: any }) => {
  const [state, dispatch] = useReducer(reducer, { count: 0, step: 1 });

  return html`
    <${CounterContext.Provider} value=${{ state, dispatch }}>
      ${props.children}
    </${CounterContext.Provider}>
  `;
};
```

---

## Troubleshooting

### Context Returns Default Value

**Problem**: `useContext` always returns the default value.

**Solution**: Ensure component is wrapped in Provider:

```typescript
// ❌ Wrong - Child not wrapped
const App = () => {
  return html`<${Child} />`;
};

// ✅ Correct - Child wrapped in Provider
const App = () => {
  return html`
    <${ThemeContext.Provider} value=${'dark'}>
      <${Child} />
    </${ThemeContext.Provider}>
  `;
};
```

### Context Not Updating

**Problem**: Context value doesn't update when signal changes.

**Solution**: Pass the signal value, not the signal itself:

```typescript
// ❌ Wrong - passing signal function
const [theme, setTheme] = createSignal('light');
html`<${ThemeContext.Provider} value=${theme}>`;

// ✅ Correct - passing signal value
const [theme, setTheme] = createSignal('light');
html`<${ThemeContext.Provider} value=${theme()}>`;
```

### Type Errors with Context

**Problem**: TypeScript complains about context types.

**Solution**: Explicitly type the context:

```typescript
interface MyContextValue {
  data: string;
  update: (value: string) => void;
}

const MyContext = createContext<MyContextValue>({
  data: '',
  update: () => {},
});
```

---

## Summary

**Context Creation:**
```typescript
const Context = createContext(defaultValue);
```

**Context Provider (JSX):**
```typescript
<Context.Provider value={value}>
  <Child />
</Context.Provider>
```

**Context Provider (Lit-html):**
```typescript
html`
  <${Context.Provider} value=${value}>
    <${Child} />
  </${Context.Provider}>
`
```

**Context Usage:**
```typescript
const value = useContext(Context);
```

**Key Points:**
- ✅ Contexts support complex values (objects, functions)
- ✅ Contexts can be nested arbitrarily
- ✅ Works identically with JSX and Lit-html
- ✅ Type-safe with TypeScript
- ✅ Server-side rendering supported
- ✅ No subscriptions on server (snapshot only)

---

**Framework**: Fluixi v0.0.1  
**Specification**: SPEC.md Section 9  
**Status**: ✅ Fully Compliant