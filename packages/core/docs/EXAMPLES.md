# Fluixi Examples

A comprehensive collection of examples demonstrating Fluixi features and patterns.

## Table of Contents

- [Basic Examples](#basic-examples)
- [State Management](#state-management)
- [Control Flow](#control-flow)
- [Data Fetching](#data-fetching)
- [Routing](#routing)
- [Context & State Sharing](#context--state-sharing)
- [Real-World Examples](#real-world-examples)

---

## Basic Examples

### Hello World

```typescript
import { render, html } from '@fluixi/core';

const App = () => html`<h1>Hello, Fluixi!</h1>`;

render(App, document.getElementById('app')!);
```

### Counter

```typescript
import { createSignal, html, render } from '@fluixi/core';

const Counter = () => {
  const [count, setCount] = createSignal(0);

  return html`
    <div>
      <h2>Count: ${count()}</h2>
      <button @click=${() => setCount(count() + 1)}>+</button>
      <button @click=${() => setCount(count() - 1)}>-</button>
      <button @click=${() => setCount(0)}>Reset</button>
    </div>
  `;
};

render(Counter, document.getElementById('app')!);
```

### Input Binding

```typescript
import { createSignal, html } from '@fluixi/core';

const TextInput = () => {
  const [text, setText] = createSignal('');

  return html`
    <div>
      <input
        type="text"
        .value=${text()}
        @input=${(e: Event) => setText((e.target as HTMLInputElement).value)}
        placeholder="Type something..."
      />
      <p>You typed: ${text()}</p>
    </div>
  `;
};
```

---

## State Management

### Multiple State Values

```typescript
import { createSignal, html } from '@fluixi/core';

const UserForm = () => {
  const [firstName, setFirstName] = createSignal('');
  const [lastName, setLastName] = createSignal('');
  const [email, setEmail] = createSignal('');

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    console.log({
      firstName: firstName(),
      lastName: lastName(),
      email: email()
    });
  };

  return html`
    <form @submit=${handleSubmit}>
      <input
        type="text"
        .value=${firstName()}
        @input=${(e: Event) => setFirstName((e.target as HTMLInputElement).value)}
        placeholder="First Name"
      />
      <input
        type="text"
        .value=${lastName()}
        @input=${(e: Event) => setLastName((e.target as HTMLInputElement).value)}
        placeholder="Last Name"
      />
      <input
        type="email"
        .value=${email()}
        @input=${(e: Event) => setEmail((e.target as HTMLInputElement).value)}
        placeholder="Email"
      />
      <button type="submit">Submit</button>
    </form>
  `;
};
```

### Computed Values

```typescript
import { createSignal, createMemo, html } from '@fluixi/core';

const ShoppingCart = () => {
  const [items, setItems] = createSignal([
    { id: 1, name: 'Product 1', price: 10, quantity: 2 },
    { id: 2, name: 'Product 2', price: 20, quantity: 1 }
  ]);

  const total = createMemo(() =>
    items().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  const itemCount = createMemo(() =>
    items().reduce((sum, item) => sum + item.quantity, 0)
  );

  return html`
    <div>
      <h2>Shopping Cart</h2>
      <p>Items: ${itemCount()}</p>
      <p>Total: $${total()}</p>
    </div>
  `;
};
```

### Effects for Side Effects

```typescript
import { createSignal, createEffect, html } from '@fluixi/core';

const AutoSave = () => {
  const [content, setContent] = createSignal('');
  const [lastSaved, setLastSaved] = createSignal<Date | null>(null);

  createEffect(() => {
    const text = content();
    if (text) {
      // Debounce logic would go here
      localStorage.setItem('draft', text);
      setLastSaved(new Date());
    }
  });

  return html`
    <div>
      <textarea
        .value=${content()}
        @input=${(e: Event) => setContent((e.target as HTMLTextAreaElement).value)}
        rows="10"
        cols="50"
      ></textarea>
      ${lastSaved() ? html`<p>Last saved: ${lastSaved()!.toLocaleTimeString()}</p>` : ''}
    </div>
  `;
};
```

---

## Control Flow

### Conditional Rendering with Show

```typescript
import { Show, createSignal, html } from '@fluixi/core';

const LoginStatus = () => {
  const [user, setUser] = createSignal<{ name: string } | null>(null);

  const login = () => setUser({ name: 'John Doe' });
  const logout = () => setUser(null);

  return html`
    <div>
      ${Show({
        when: user,
        fallback: html`
          <button @click=${login}>Login</button>
        `,
        children: (u) => html`
          <div>
            <p>Welcome, ${u.name}!</p>
            <button @click=${logout}>Logout</button>
          </div>
        `
      })}
    </div>
  `;
};
```

### Lists with For

```typescript
import { For, createSignal, html } from '@fluixi/core';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const TodoList = () => {
  const [todos, setTodos] = createSignal<Todo[]>([
    { id: 1, text: 'Learn Fluixi', done: false },
    { id: 2, text: 'Build an app', done: false }
  ]);
  const [inputText, setInputText] = createSignal('');

  const addTodo = () => {
    if (inputText().trim()) {
      setTodos([
        ...todos(),
        { id: Date.now(), text: inputText(), done: false }
      ]);
      setInputText('');
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(todos().map(todo =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    ));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos().filter(todo => todo.id !== id));
  };

  return html`
    <div>
      <h2>Todo List</h2>
      <div>
        <input
          type="text"
          .value=${inputText()}
          @input=${(e: Event) => setInputText((e.target as HTMLInputElement).value)}
          @keypress=${(e: KeyboardEvent) => e.key === 'Enter' && addTodo()}
          placeholder="Add a todo..."
        />
        <button @click=${addTodo}>Add</button>
      </div>
      <ul>
        ${For({
          each: todos,
          children: (todo) => html`
            <li style=${todo.done ? 'text-decoration: line-through' : ''}>
              <input
                type="checkbox"
                .checked=${todo.done}
                @change=${() => toggleTodo(todo.id)}
              />
              <span>${todo.text}</span>
              <button @click=${() => deleteTodo(todo.id)}>Delete</button>
            </li>
          `
        })}
      </ul>
    </div>
  `;
};
```

### Switch/Match Pattern

```typescript
import { Switch, Match, createSignal, html } from '@fluixi/core';

type Status = 'idle' | 'loading' | 'success' | 'error';

const StatusDisplay = () => {
  const [status, setStatus] = createSignal<Status>('idle');

  return html`
    <div>
      <div>
        <button @click=${() => setStatus('idle')}>Idle</button>
        <button @click=${() => setStatus('loading')}>Loading</button>
        <button @click=${() => setStatus('success')}>Success</button>
        <button @click=${() => setStatus('error')}>Error</button>
      </div>

      ${Switch({
        children: [
          Match({
            when: () => status() === 'idle',
            children: html`<p>Ready to start</p>`
          }),
          Match({
            when: () => status() === 'loading',
            children: html`<p>Loading...</p>`
          }),
          Match({
            when: () => status() === 'success',
            children: html`<p style="color: green">Success!</p>`
          }),
          Match({
            when: () => status() === 'error',
            children: html`<p style="color: red">Error occurred</p>`
          })
        ]
      })}
    </div>
  `;
};
```

### Modal with Portal

```typescript
import { Portal, Show, createSignal, html } from '@fluixi/core';

const ModalExample = () => {
  const [isOpen, setIsOpen] = createSignal(false);

  return html`
    <div>
      <button @click=${() => setIsOpen(true)}>Open Modal</button>

      ${Show({
        when: isOpen,
        children: Portal({
          children: html`
            <div
              style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;"
              @click=${() => setIsOpen(false)}
            >
              <div
                style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px;"
                @click=${(e: Event) => e.stopPropagation()}
              >
                <h2>Modal Title</h2>
                <p>This is a modal dialog rendered via Portal.</p>
                <button @click=${() => setIsOpen(false)}>Close</button>
              </div>
            </div>
          `
        })
      })}
    </div>
  `;
};
```

---

## Data Fetching

### Basic Resource

```typescript
import { createResource, Show, html } from '@fluixi/core';

interface Post {
  id: number;
  title: string;
  body: string;
}

const fetchPost = async (id: number): Promise<Post> => {
  const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
  return response.json();
};

const PostViewer = () => {
  const [postId, setPostId] = createSignal(1);
  const [post, { refetch }] = createResource(() => postId(), fetchPost);

  return html`
    <div>
      <h2>Post Viewer</h2>
      <input
        type="number"
        .value=${String(postId())}
        @input=${(e: Event) => setPostId(Number((e.target as HTMLInputElement).value))}
      />
      <button @click=${refetch}>Refresh</button>

      ${Show({
        when: post.loading,
        fallback: Show({
          when: post.error,
          fallback: Show({
            when: post,
            children: (p) => html`
              <article>
                <h3>${p.title}</h3>
                <p>${p.body}</p>
              </article>
            `
          }),
          children: html`<p>Error: ${post.error?.message}</p>`
        }),
        children: html`<p>Loading post...</p>`
      })}
    </div>
  `;
};
```

### Lazy Resource

```typescript
import { createLazyResource, Show, createSignal, html } from '@fluixi/core';

const LazyDataLoader = () => {
  const [data, { fetch: loadData }] = createLazyResource(
    async () => {
      const response = await fetch('https://api.example.com/data');
      return response.json();
    }
  );

  return html`
    <div>
      <button @click=${loadData} ?disabled=${data.loading}>
        Load Data
      </button>

      ${Show({
        when: data.loading,
        children: html`<p>Loading...</p>`
      })}

      ${Show({
        when: data,
        children: (d) => html`<pre>${JSON.stringify(d, null, 2)}</pre>`
      })}
    </div>
  `;
};
```

### Multiple Resources

```typescript
import { createResources, Show, For, html } from '@fluixi/core';

const DashboardData = () => {
  const [resources, { refetchAll }] = createResources([
    [
      () => true,
      async () => {
        const response = await fetch('https://api.example.com/users');
        return response.json();
      }
    ],
    [
      () => true,
      async () => {
        const response = await fetch('https://api.example.com/posts');
        return response.json();
      }
    ]
  ]);

  const [users, posts] = resources;

  return html`
    <div>
      <h2>Dashboard</h2>
      <button @click=${refetchAll}>Refresh All</button>

      <section>
        <h3>Users</h3>
        ${Show({
          when: !users.loading && users(),
          fallback: html`<p>Loading users...</p>`,
          children: (data) => html`<p>Loaded ${data.length} users</p>`
        })}
      </section>

      <section>
        <h3>Posts</h3>
        ${Show({
          when: !posts.loading && posts(),
          fallback: html`<p>Loading posts...</p>`,
          children: (data) => html`<p>Loaded ${data.length} posts</p>`
        })}
      </section>
    </div>
  `;
};
```

---

## Routing

### Basic Router Setup

```typescript
import { createRouter, Router, Link, html } from '@fluixi/core';

const Home = () => html`
  <div>
    <h1>Home Page</h1>
    <p>Welcome to Fluixi!</p>
  </div>
`;

const About = () => html`
  <div>
    <h1>About Page</h1>
    <p>This is the about page.</p>
  </div>
`;

const Contact = () => html`
  <div>
    <h1>Contact Page</h1>
    <p>Get in touch with us.</p>
  </div>
`;

const App = () => {
  const routes = [
    { path: '/', component: Home },
    { path: '/about', component: About },
    { path: '/contact', component: Contact }
  ];

  const router = createRouter(routes);

  return Router({
    router,
    children: html`
      <div>
        <nav>
          ${Link({ href: '/', children: 'Home' })}
          ${Link({ href: '/about', children: 'About' })}
          ${Link({ href: '/contact', children: 'Contact' })}
        </nav>
        <main></main>
      </div>
    `
  });
};
```

### Route Parameters

```typescript
import { useParams, useNavigate, html } from '@fluixi/core';

const UserProfile = () => {
  const params = useParams();
  const navigate = useNavigate();

  return html`
    <div>
      <h1>User Profile</h1>
      <p>User ID: ${params.id}</p>
      <button @click=${() => navigate('/')}>Go Home</button>
    </div>
  `;
};

// Route definition:
// { path: '/users/:id', component: UserProfile }
```

### Query Parameters

```typescript
import { useQuery, useNavigate, html } from '@fluixi/core';

const SearchResults = () => {
  const query = useQuery();
  const navigate = useNavigate();

  const updateSearch = (term: string) => {
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  return html`
    <div>
      <h1>Search Results</h1>
      <p>Searching for: ${query.q || 'nothing'}</p>
      <input
        type="text"
        .value=${query.q || ''}
        @input=${(e: Event) => updateSearch((e.target as HTMLInputElement).value)}
      />
    </div>
  `;
};
```

---

## Context & State Sharing

### Theme Context

```typescript
import { createContext, useContext, Provider, createSignal, html } from '@fluixi/core';

interface Theme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
}

const ThemeContext = createContext<Theme>({
  primaryColor: '#007bff',
  secondaryColor: '#6c757d',
  backgroundColor: '#ffffff'
});

const ThemedButton = () => {
  const theme = useContext(ThemeContext);

  return html`
    <button
      style="
        background: ${theme.primaryColor};
        color: white;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
      "
    >
      Themed Button
    </button>
  `;
};

const App = () => {
  const [isDark, setIsDark] = createSignal(false);

  const theme = () => isDark() ? {
    primaryColor: '#0d6efd',
    secondaryColor: '#adb5bd',
    backgroundColor: '#212529'
  } : {
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    backgroundColor: '#ffffff'
  };

  return html`
    <div style="background: ${theme().backgroundColor}; min-height: 100vh; padding: 2rem;">
      <button @click=${() => setIsDark(!isDark())}>
        Toggle Theme
      </button>
      
      ${Provider({
        context: ThemeContext,
        value: theme(),
        children: html`
          <div>
            ${ThemedButton()}
          </div>
        `
      })}
    </div>
  `;
};
```

### Auth Context

```typescript
import { createContextWithProvider, useContext, createSignal, html } from '@fluixi/core';

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: () => User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const [AuthContext, AuthProvider] = createContextWithProvider<AuthContextValue | null>(
  null,
  'AuthContext'
);

const AuthProviderComponent = (props: { children: any }) => {
  const [user, setUser] = createSignal<User | null>(null);

  const login = async (email: string, password: string) => {
    // Simulate API call
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const userData = await response.json();
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  const isAuthenticated = () => user() !== null;

  const value: AuthContextValue = {
    user,
    login,
    logout,
    isAuthenticated
  };

  return AuthProvider(value, props.children);
};

const LoginButton = () => {
  const auth = useContext(AuthContext);

  if (!auth) return html`<div>No auth context</div>`;

  return html`
    ${auth.isAuthenticated()
      ? html`
          <div>
            <span>Welcome, ${auth.user()!.name}</span>
            <button @click=${auth.logout}>Logout</button>
          </div>
        `
      : html`
          <button @click=${() => auth.login('user@example.com', 'password')}>
            Login
          </button>
        `
    }
  `;
};
```

---

## Real-World Examples

### Form with Validation

```typescript
import { createSignal, createMemo, html } from '@fluixi/core';

const RegistrationForm = () => {
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [confirmPassword, setConfirmPassword] = createSignal('');
  const [errors, setErrors] = createSignal<string[]>([]);

  const isEmailValid = createMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email());
  });

  const isPasswordValid = createMemo(() => password().length >= 8);

  const doPasswordsMatch = createMemo(() => 
    password() === confirmPassword() && password().length > 0
  );

  const isFormValid = createMemo(() =>
    isEmailValid() && isPasswordValid() && doPasswordsMatch()
  );

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    
    const newErrors: string[] = [];
    if (!isEmailValid()) newErrors.push('Invalid email address');
    if (!isPasswordValid()) newErrors.push('Password must be at least 8 characters');
    if (!doPasswordsMatch()) newErrors.push('Passwords do not match');

    setErrors(newErrors);

    if (newErrors.length === 0) {
      console.log('Form submitted:', { email: email(), password: password() });
    }
  };

  return html`
    <form @submit=${handleSubmit}>
      <div>
        <label>Email</label>
        <input
          type="email"
          .value=${email()}
          @input=${(e: Event) => setEmail((e.target as HTMLInputElement).value)}
          style=${!isEmailValid() && email() ? 'border-color: red' : ''}
        />
      </div>

      <div>
        <label>Password</label>
        <input
          type="password"
          .value=${password()}
          @input=${(e: Event) => setPassword((e.target as HTMLInputElement).value)}
          style=${!isPasswordValid() && password() ? 'border-color: red' : ''}
        />
      </div>

      <div>
        <label>Confirm Password</label>
        <input
          type="password"
          .value=${confirmPassword()}
          @input=${(e: Event) => setConfirmPassword((e.target as HTMLInputElement).value)}
          style=${!doPasswordsMatch() && confirmPassword() ? 'border-color: red' : ''}
        />
      </div>

      ${errors().length > 0 ? html`
        <ul style="color: red;">
          ${errors().map(error => html`<li>${error}</li>`)}
        </ul>
      ` : ''}

      <button type="submit" ?disabled=${!isFormValid()}>
        Register
      </button>
    </form>
  `;
};
```

### Infinite Scroll List

```typescript
import { createSignal, createEffect, For, onMount, html } from '@fluixi/core';

interface Item {
  id: number;
  title: string;
}

const InfiniteScrollList = () => {
  const [items, setItems] = createSignal<Item[]>([]);
  const [page, setPage] = createSignal(1);
  const [loading, setLoading] = createSignal(false);
  const [hasMore, setHasMore] = createSignal(true);

  const loadMore = async () => {
    if (loading() || !hasMore()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/items?page=${page()}`);
      const newItems = await response.json();
      
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems([...items(), ...newItems]);
        setPage(page() + 1);
      }
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  };

  let listRef: HTMLDivElement;

  onMount(() => {
    loadMore();

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    const sentinel = listRef.querySelector('.sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  });

  return html`
    <div ref=${(el: HTMLDivElement) => listRef = el}>
      ${For({
        each: items,
        children: (item) => html`
          <div class="item">
            <h3>${item.title}</h3>
          </div>
        `
      })}
      
      ${loading() ? html`<p>Loading more...</p>` : ''}
      ${hasMore() ? html`<div class="sentinel"></div>` : html`<p>No more items</p>`}
    </div>
  `;
};
```

### Debounced Search

```typescript
import { createSignal, createEffect, createResource, Show, For, html } from '@fluixi/core';

interface SearchResult {
  id: number;
  title: string;
  description: string;
}

const DebouncedSearch = () => {
  const [searchTerm, setSearchTerm] = createSignal('');
  const [debouncedTerm, setDebouncedTerm] = createSignal('');

  // Debounce search term
  createEffect(() => {
    const term = searchTerm();
    const timeoutId = setTimeout(() => {
      setDebouncedTerm(term);
    }, 300);

    return () => clearTimeout(timeoutId);
  });

  const [results, { refetch }] = createResource(
    () => debouncedTerm(),
    async (term) => {
      if (!term) return [];
      
      const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
      return response.json();
    },
    { initialValue: [] }
  );

  return html`
    <div>
      <input
        type="text"
        .value=${searchTerm()}
        @input=${(e: Event) => setSearchTerm((e.target as HTMLInputElement).value)}
        placeholder="Search..."
      />

      ${Show({
        when: results.loading,
        children: html`<p>Searching...</p>`
      })}

      ${Show({
        when: () => results() && results()!.length > 0,
        fallback: debouncedTerm() ? html`<p>No results found</p>` : html``,
        children: html`
          <ul>
            ${For({
              each: results,
              children: (result: SearchResult) => html`
                <li>
                  <h3>${result.title}</h3>
                  <p>${result.description}</p>
                </li>
              `
            })}
          </ul>
        `
      })}
    </div>
  `;
};
```

---

For more examples and patterns, check out the [official documentation](https://github.com/your-org/fluixi).