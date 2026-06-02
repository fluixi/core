# Complete Example: JSX Runtime with Signals and Stores

This example demonstrates how to use the JSX runtime with signals and stores for building reactive applications.

## Setup

First, configure your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fluixi/jsx-runtime",
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

## Example 1: Counter with Signals

```tsx
import { render } from '@fluixi/jsx-runtime';
import { createSignal } from '@fluixi/reactive/signal';

function Counter() {
  const [count, setCount] = createSignal(0);
  const [step, setStep] = createSignal(1);

  const increment = () => setCount(count() + step());
  const decrement = () => setCount(count() - step());
  const reset = () => setCount(0);

  return (
    <div class="counter">
      <h2>Counter: {count()}</h2>
      
      <div class="controls">
        <button onClick={decrement}>-</button>
        <button onClick={reset}>Reset</button>
        <button onClick={increment}>+</button>
      </div>

      <div class="step-control">
        <label>
          Step:
          <input
            type="number"
            value={step()}
            onInput={(e) => setStep(Number(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
}

render(<Counter />, document.getElementById('app')!);
```

## Example 2: Todo List with Store

```tsx
import { render, For, Show } from '@fluixi/jsx-runtime';
import { createStore } from '@fluixi/reactive/store';
import { createSignal } from '@fluixi/reactive/signal';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
}

function TodoApp() {
  const [state, setState] = createStore<TodoState>({
    todos: [],
    filter: 'all',
  });

  const [newTodoText, setNewTodoText] = createSignal('');
  let nextId = 1;

  // Computed filtered todos
  const filteredTodos = () => {
    const todos = state.todos;
    const filter = state.filter;

    switch (filter) {
      case 'active':
        return todos.filter(t => !t.completed);
      case 'completed':
        return todos.filter(t => t.completed);
      default:
        return todos;
    }
  };

  const addTodo = () => {
    const text = newTodoText().trim();
    if (!text) return;

    setState('todos', (todos) => [
      ...todos,
      { id: nextId++, text, completed: false },
    ]);
    setNewTodoText('');
  };

  const toggleTodo = (id: number) => {
    setState('todos', (todo) => todo.id === id, 'completed', (c) => !c);
  };

  const removeTodo = (id: number) => {
    setState('todos', (todos) => todos.filter(t => t.id !== id));
  };

  const setFilter = (filter: 'all' | 'active' | 'completed') => {
    setState('filter', filter);
  };

  const activeCount = () => state.todos.filter(t => !t.completed).length;
  const completedCount = () => state.todos.filter(t => t.completed).length;

  return (
    <div class="todo-app">
      <h1>Todo List</h1>

      <div class="add-todo">
        <input
          type="text"
          placeholder="What needs to be done?"
          value={newTodoText()}
          onInput={(e) => setNewTodoText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
        />
        <button onClick={addTodo}>Add</button>
      </div>

      <div class="filters">
        <button
          class={state.filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All ({state.todos.length})
        </button>
        <button
          class={state.filter === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
        >
          Active ({activeCount()})
        </button>
        <button
          class={state.filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Completed ({completedCount()})
        </button>
      </div>

      <Show
        when={filteredTodos().length > 0}
        fallback={<p class="empty">No todos to show</p>}
      >
        <ul class="todo-list">
          <For each={filteredTodos()}>
            {(todo) => (
              <li class={todo.completed ? 'completed' : ''}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                />
                <span class="todo-text">{todo.text}</span>
                <button
                  class="remove"
                  onClick={() => removeTodo(todo.id)}
                >
                  ×
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}

render(<TodoApp />, document.getElementById('app')!);
```

## Example 3: Data Fetching with Suspense

```tsx
import { render, Show, Suspense, ErrorBoundary } from '@fluixi/jsx-runtime';
import { createSignal, createResource } from '@fluixi/reactive/signal';

interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`https://api.example.com/users/${id}`);
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
}

function UserProfile() {
  const [userId, setUserId] = createSignal(1);

  const [user, { mutate, refetch }] = createResource(userId, fetchUser);

  return (
    <div class="user-profile">
      <h2>User Profile</h2>

      <div class="user-selector">
        <label>
          User ID:
          <input
            type="number"
            value={userId()}
            onInput={(e) => setUserId(Number(e.target.value))}
          />
        </label>
        <button onClick={refetch}>Refresh</button>
      </div>

      <ErrorBoundary
        fallback={(err, reset) => (
          <div class="error">
            <p>Error: {err.message}</p>
            <button onClick={reset}>Retry</button>
          </div>
        )}
      >
        <Suspense fallback={<div class="loading">Loading user...</div>}>
          <Show when={user()}>
            {(u) => (
              <div class="user-details">
                <h3>{u.name}</h3>
                <p>Email: {u.email}</p>
                <p>ID: {u.id}</p>
              </div>
            )}
          </Show>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

render(<UserProfile />, document.getElementById('app')!);
```

## Example 4: Form with Store and Validation

```tsx
import { render, Show } from '@fluixi/jsx-runtime';
import { createStore } from '@fluixi/reactive/store';
import { createMemo } from '@fluixi/reactive/signal';

interface FormData {
  name: string;
  email: string;
  age: number;
  terms: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  age?: string;
  terms?: string;
}

function RegistrationForm() {
  const [form, setForm] = createStore<FormData>({
    name: '',
    email: '',
    age: 0,
    terms: false,
  });

  const [submitted, setSubmitted] = createStore({ value: false });

  // Validation
  const errors = createMemo((): FormErrors => {
    const errs: FormErrors = {};

    if (!form.name.trim()) {
      errs.name = 'Name is required';
    } else if (form.name.length < 2) {
      errs.name = 'Name must be at least 2 characters';
    }

    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Invalid email format';
    }

    if (form.age < 18) {
      errs.age = 'Must be 18 or older';
    }

    if (!form.terms) {
      errs.terms = 'You must accept the terms';
    }

    return errs;
  });

  const isValid = createMemo(() => Object.keys(errors()).length === 0);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    
    if (!isValid()) return;

    console.log('Form submitted:', form);
    setSubmitted('value', true);
  };

  return (
    <div class="registration-form">
      <h2>Register</h2>

      <Show
        when={!submitted.value}
        fallback={
          <div class="success">
            <h3>Registration successful!</h3>
            <p>Welcome, {form.name}!</p>
          </div>
        }
      >
        <form onSubmit={handleSubmit}>
          <div class="form-group">
            <label>Name:</label>
            <input
              type="text"
              value={form.name}
              onInput={(e) => setForm('name', e.target.value)}
              class={errors().name ? 'error' : ''}
            />
            <Show when={errors().name}>
              <span class="error-message">{errors().name}</span>
            </Show>
          </div>

          <div class="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={form.email}
              onInput={(e) => setForm('email', e.target.value)}
              class={errors().email ? 'error' : ''}
            />
            <Show when={errors().email}>
              <span class="error-message">{errors().email}</span>
            </Show>
          </div>

          <div class="form-group">
            <label>Age:</label>
            <input
              type="number"
              value={form.age}
              onInput={(e) => setForm('age', Number(e.target.value))}
              class={errors().age ? 'error' : ''}
            />
            <Show when={errors().age}>
              <span class="error-message">{errors().age}</span>
            </Show>
          </div>

          <div class="form-group">
            <label>
              <input
                type="checkbox"
                checked={form.terms}
                onChange={(e) => setForm('terms', e.target.checked)}
              />
              I accept the terms and conditions
            </label>
            <Show when={errors().terms}>
              <span class="error-message">{errors().terms}</span>
            </Show>
          </div>

          <button type="submit" disabled={!isValid()}>
            Register
          </button>
        </form>
      </Show>
    </div>
  );
}

render(<RegistrationForm />, document.getElementById('app')!);
```

## Example 5: Combining Lit-HTML with JSX

```tsx
import { render } from '@fluixi/jsx-runtime';
import { html } from 'lit';
import { signal } from '@fluixi/dom/reactive';
import { createSignal } from '@fluixi/reactive/signal';

function MixedComponent() {
  const [count, setCount] = createSignal(0);
  const [name, setName] = createSignal('World');

  // Lit-HTML template with reactive signals
  const litTemplate = html`
    <div class="lit-section">
      <h3>Lit-HTML Section</h3>
      <p>Count from signal: ${signal(count)}</p>
      <p>Name: ${signal(name)}</p>
    </div>
  `;

  // Native JSX with reactive values
  return (
    <div class="mixed-component">
      <h2>Mixed JSX and Lit-HTML</h2>

      {/* Native JSX */}
      <div class="jsx-section">
        <h3>JSX Section</h3>
        <p>Count: {count()}</p>
        <p>Name: {name()}</p>
        
        <button onClick={() => setCount(count() + 1)}>
          Increment
        </button>
        <input
          value={name()}
          onInput={(e) => setName(e.target.value)}
        />
      </div>

      {/* Embed Lit-HTML template */}
      <div>{litTemplate}</div>

      {/* Can also use template helper */}
      <div>
        {html`
          <div class="inline-lit">
            <p>Inline count: ${signal(count)}</p>
          </div>
        `}
      </div>
    </div>
  );
}

render(<MixedComponent />, document.getElementById('app')!);
```

## Example 6: Complex Store with Nested Data

```tsx
import { render, For, Show } from '@fluixi/jsx-runtime';
import { createStore } from '@fluixi/reactive/store';

interface Comment {
  id: number;
  author: string;
  text: string;
  timestamp: Date;
}

interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  likes: number;
  comments: Comment[];
}

interface AppState {
  posts: Post[];
  selectedPostId: number | null;
}

function BlogApp() {
  const [state, setState] = createStore<AppState>({
    posts: [
      {
        id: 1,
        title: 'First Post',
        content: 'This is the first post content',
        author: 'Alice',
        likes: 5,
        comments: [],
      },
    ],
    selectedPostId: null,
  });

  const selectedPost = () =>
    state.posts.find((p) => p.id === state.selectedPostId);

  const addPost = (title: string, content: string, author: string) => {
    const newPost: Post = {
      id: Date.now(),
      title,
      content,
      author,
      likes: 0,
      comments: [],
    };
    setState('posts', (posts) => [...posts, newPost]);
  };

  const likePost = (postId: number) => {
    setState('posts', (p) => p.id === postId, 'likes', (l) => l + 1);
  };

  const addComment = (postId: number, author: string, text: string) => {
    const comment: Comment = {
      id: Date.now(),
      author,
      text,
      timestamp: new Date(),
    };

    setState(
      'posts',
      (p) => p.id === postId,
      'comments',
      (comments) => [...comments, comment]
    );
  };

  const selectPost = (postId: number) => {
    setState('selectedPostId', postId);
  };

  return (
    <div class="blog-app">
      <h1>Blog Posts</h1>

      <div class="layout">
        <div class="post-list">
          <h2>All Posts</h2>
          <For each={state.posts}>
            {(post) => (
              <div
                class={`post-card ${
                  state.selectedPostId === post.id ? 'selected' : ''
                }`}
                onClick={() => selectPost(post.id)}
              >
                <h3>{post.title}</h3>
                <p class="author">By {post.author}</p>
                <div class="stats">
                  <span>❤️ {post.likes}</span>
                  <span>💬 {post.comments.length}</span>
                </div>
              </div>
            )}
          </For>
        </div>

        <div class="post-detail">
          <Show
            when={selectedPost()}
            fallback={<p>Select a post to view details</p>}
          >
            {(post) => (
              <div>
                <h2>{post.title}</h2>
                <p class="author">By {post.author}</p>
                <div class="content">{post.content}</div>

                <button onClick={() => likePost(post.id)}>
                  ❤️ Like ({post.likes})
                </button>

                <div class="comments">
                  <h3>Comments ({post.comments.length})</h3>

                  <Show
                    when={post.comments.length > 0}
                    fallback={<p>No comments yet</p>}
                  >
                    <For each={post.comments}>
                      {(comment) => (
                        <div class="comment">
                          <strong>{comment.author}</strong>
                          <p>{comment.text}</p>
                          <small>
                            {comment.timestamp.toLocaleString()}
                          </small>
                        </div>
                      )}
                    </For>
                  </Show>

                  <div class="add-comment">
                    <input
                      type="text"
                      placeholder="Your name"
                      id={`author-${post.id}`}
                    />
                    <textarea
                      placeholder="Your comment"
                      id={`text-${post.id}`}
                    />
                    <button
                      onClick={() => {
                        const authorInput = document.getElementById(
                          `author-${post.id}`
                        ) as HTMLInputElement;
                        const textInput = document.getElementById(
                          `text-${post.id}`
                        ) as HTMLTextAreaElement;

                        if (authorInput.value && textInput.value) {
                          addComment(
                            post.id,
                            authorInput.value,
                            textInput.value
                          );
                          authorInput.value = '';
                          textInput.value = '';
                        }
                      }}
                    >
                      Add Comment
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Show>
        </div>
      </div>
    </div>
  );
}

render(<BlogApp />, document.getElementById('app')!);
```

## Example 7: Portal and Modal

```tsx
import { render, Show, Portal } from '@fluixi/jsx-runtime';
import { createSignal } from '@fluixi/reactive/signal';

function ModalExample() {
  const [isOpen, setIsOpen] = createSignal(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <div class="app">
      <h1>Portal Example</h1>
      <button onClick={openModal}>Open Modal</button>

      <Show when={isOpen()}>
        <Portal mount={document.body}>
          <div class="modal-backdrop" onClick={closeModal}>
            <div
              class="modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div class="modal-header">
                <h2>Modal Title</h2>
                <button onClick={closeModal}>×</button>
              </div>
              <div class="modal-body">
                <p>This is modal content rendered via Portal!</p>
                <p>It's rendered outside the component tree.</p>
              </div>
              <div class="modal-footer">
                <button onClick={closeModal}>Close</button>
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  );
}

render(<ModalExample />, document.getElementById('app')!);
```

## Running the Examples

1. Install dependencies:
```bash
pnpm install
```

2. Build the packages:
```bash
pnpm nx build dom
pnpm nx build jsx-runtime
```

3. Create an HTML file:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>JSX Runtime Examples</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./dist/app.js"></script>
</body>
</html>
```

4. Bundle and run your code with your favorite bundler (Vite, Webpack, esbuild, etc.)

## Key Takeaways

1. **Signals are functions**: Always call them with `signal()` to get the value
2. **Stores are proxies**: Access properties directly `store.property`
3. **Fine-grained updates**: Only the changed parts of the DOM are updated
4. **Use control flow components**: Show, For, Switch instead of ternaries and maps
5. **Mix JSX and Lit-HTML**: Use whichever is more convenient for your use case
6. **Type safety**: Full TypeScript support with proper JSX typing