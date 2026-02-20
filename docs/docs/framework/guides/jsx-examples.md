---
sidebar_position: 11
title: JSX Examples
---

# JSX/TSX Examples

Complete examples demonstrating JSX/TSX usage with KettleJS.

## Complete Todo App with JSX

```tsx
import { createSignal, createEffect } from '@awc/reactive';
import { For, Show } from '@awc/kettlejs';
import type { JSX } from '@awc/kettlejs/jsx-runtime';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

type Filter = 'all' | 'active' | 'completed';

const TodoApp = () => {
  const [todos, setTodos] = createSignal<Todo[]>([]);
  const [input, setInput] = createSignal('');
  const [filter, setFilter] = createSignal<Filter>('all');

  // Load from localStorage
  createEffect(() => {
    const stored = localStorage.getItem('todos');
    if (stored) {
      setTodos(JSON.parse(stored));
    }
  });

  // Save to localStorage
  createEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos()));
  });

  const addTodo = () => {
    const text = input().trim();
    if (!text) return;

    setTodos([
      ...todos(),
      {
        id: Date.now(),
        text,
        completed: false
      }
    ]);
    setInput('');
  };

  const toggleTodo = (id: number) => {
    setTodos(
      todos().map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: number) => {
    setTodos(todos().filter(todo => todo.id !== id));
  };

  const filteredTodos = () => {
    const f = filter();
    const t = todos();

    if (f === 'active') return t.filter(todo => !todo.completed);
    if (f === 'completed') return t.filter(todo => todo.completed);
    return t;
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  return (
    <div className="todo-app">
      <h1>KettleJS Todo App</h1>

      <div className="input-section">
        <input
          type="text"
          placeholder="What needs to be done?"
          value={input()}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          onKeyPress={handleKeyPress}
        />
        <button onClick={addTodo}>Add</button>
      </div>

      <div className="filters">
        <button
          className={filter() === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={filter() === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
        >
          Active
        </button>
        <button
          className={filter() === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
      </div>

      <Show
        when={filteredTodos().length > 0}
        fallback={<p className="empty">No todos to display</p>}
      >
        <ul className="todo-list">
          <For each={filteredTodos()}>
            {(todo) => (
              <li className={todo.completed ? 'completed' : ''}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                />
                <span className="todo-text">{todo.text}</span>
                <button
                  className="delete-btn"
                  onClick={() => deleteTodo(todo.id)}
                >
                  ×
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>

      <div className="stats">
        <span>{todos().filter(t => !t.completed).length} items left</span>
      </div>
    </div>
  );
};

export default TodoApp;
```

## User Dashboard with JSX

```tsx
import { createSignal, createEffect, createMemo } from '@awc/reactive';
import { Show, For } from '@awc/kettlejs';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface Post {
  id: number;
  userId: number;
  title: string;
  content: string;
}

// UserCard Component
const UserCard = (props: { user: User; onEdit: (user: User) => void }) => {
  return (
    <div className="user-card">
      <div className="user-avatar">
        {props.user.name.charAt(0).toUpperCase()}
      </div>
      <div className="user-info">
        <h3>{props.user.name}</h3>
        <p>{props.user.email}</p>
        <span className={`badge badge-${props.user.role}`}>
          {props.user.role}
        </span>
      </div>
      <button onClick={() => props.onEdit(props.user)}>Edit</button>
    </div>
  );
};

// PostCard Component
const PostCard = (props: { post: Post }) => {
  return (
    <article className="post-card">
      <h3>{props.post.title}</h3>
      <p>{props.post.content}</p>
    </article>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [users, setUsers] = createSignal<User[]>([]);
  const [posts, setPosts] = createSignal<Post[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [selectedUser, setSelectedUser] = createSignal<User | null>(null);

  // Fetch users and posts
  createEffect(async () => {
    try {
      const [usersRes, postsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/posts')
      ]);

      setUsers(await usersRes.json());
      setPosts(await postsRes.json());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  });

  // Filter posts by selected user
  const userPosts = createMemo(() => {
    const user = selectedUser();
    if (!user) return posts();
    return posts().filter(post => post.userId === user.id);
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
  };

  return (
    <div className="dashboard">
      <header>
        <h1>User Dashboard</h1>
      </header>

      <Show
        when={!loading()}
        fallback={<div className="loading">Loading...</div>}
      >
        <Show
          when={!error()}
          fallback={<div className="error">Error: {error()}</div>}
        >
          <div className="dashboard-content">
            <aside className="sidebar">
              <h2>Users</h2>
              <div className="user-list">
                <For each={users()}>
                  {(user) => (
                    <UserCard user={user} onEdit={handleEditUser} />
                  )}
                </For>
              </div>
            </aside>

            <main className="main-content">
              <Show
                when={selectedUser()}
                fallback={<p>Select a user to view their posts</p>}
              >
                {(user) => (
                  <>
                    <h2>{user.name}'s Posts</h2>
                    <Show
                      when={userPosts().length > 0}
                      fallback={<p>No posts yet</p>}
                    >
                      <div className="posts-grid">
                        <For each={userPosts()}>
                          {(post) => <PostCard post={post} />}
                        </For>
                      </div>
                    </Show>
                  </>
                )}
              </Show>
            </main>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default Dashboard;
```

## Form with Validation

```tsx
import { createSignal, createMemo } from '@awc/reactive';
import { Show } from '@awc/kettlejs';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const RegistrationForm = () => {
  const [formData, setFormData] = createSignal<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [touched, setTouched] = createSignal<Set<keyof FormData>>(new Set());
  const [submitting, setSubmitting] = createSignal(false);
  const [submitted, setSubmitted] = createSignal(false);

  const errors = createMemo((): FormErrors => {
    const data = formData();
    const errs: FormErrors = {};

    if (!data.name.trim()) {
      errs.name = 'Name is required';
    } else if (data.name.length < 2) {
      errs.name = 'Name must be at least 2 characters';
    }

    if (!data.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errs.email = 'Invalid email format';
    }

    if (!data.password) {
      errs.password = 'Password is required';
    } else if (data.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }

    if (data.password !== data.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    return errs;
  });

  const isValid = createMemo(() => {
    return Object.keys(errors()).length === 0;
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData({ ...formData(), [field]: value });
  };

  const markTouched = (field: keyof FormData) => {
    const newTouched = new Set(touched());
    newTouched.add(field);
    setTouched(newTouched);
  };

  const showError = (field: keyof FormData) => {
    return touched().has(field) && errors()[field];
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched(new Set(['name', 'email', 'password', 'confirmPassword']));

    if (!isValid()) return;

    setSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Form submitted:', formData());
      setSubmitted(true);
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="registration-form">
      <Show
        when={!submitted()}
        fallback={
          <div className="success-message">
            <h2>Registration Successful!</h2>
            <p>Welcome, {formData().name}!</p>
          </div>
        }
      >
        <form onSubmit={handleSubmit}>
          <h2>Register</h2>

          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={formData().name}
              onInput={(e) => updateField('name', (e.target as HTMLInputElement).value)}
              onBlur={() => markTouched('name')}
              className={showError('name') ? 'error' : ''}
            />
            <Show when={showError('name')}>
              <span className="error-message">{errors().name}</span>
            </Show>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={formData().email}
              onInput={(e) => updateField('email', (e.target as HTMLInputElement).value)}
              onBlur={() => markTouched('email')}
              className={showError('email') ? 'error' : ''}
            />
            <Show when={showError('email')}>
              <span className="error-message">{errors().email}</span>
            </Show>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={formData().password}
              onInput={(e) => updateField('password', (e.target as HTMLInputElement).value)}
              onBlur={() => markTouched('password')}
              className={showError('password') ? 'error' : ''}
            />
            <Show when={showError('password')}>
              <span className="error-message">{errors().password}</span>
            </Show>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={formData().confirmPassword}
              onInput={(e) => updateField('confirmPassword', (e.target as HTMLInputElement).value)}
              onBlur={() => markTouched('confirmPassword')}
              className={showError('confirmPassword') ? 'error' : ''}
            />
            <Show when={showError('confirmPassword')}>
              <span className="error-message">{errors().confirmPassword}</span>
            </Show>
          </div>

          <button
            type="submit"
            disabled={submitting() || !isValid()}
          >
            {submitting() ? 'Submitting...' : 'Register'}
          </button>
        </form>
      </Show>
    </div>
  );
};

export default RegistrationForm;
```

## Data Table with Sorting and Filtering

```tsx
import { createSignal, createMemo } from '@awc/reactive';
import { For, Show } from '@awc/kettlejs';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

type SortKey = 'name' | 'email' | 'role' | 'status';
type SortDirection = 'asc' | 'desc';

const DataTable = () => {
  const [users, setUsers] = createSignal<User[]>([
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'active' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'User', status: 'active' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'User', status: 'inactive' },
    { id: 4, name: 'Diana Prince', email: 'diana@example.com', role: 'Manager', status: 'active' },
  ]);

  const [searchTerm, setSearchTerm] = createSignal('');
  const [sortKey, setSortKey] = createSignal<SortKey>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [filterStatus, setFilterStatus] = createSignal<'all' | 'active' | 'inactive'>('all');

  const filteredAndSorted = createMemo(() => {
    let result = users();

    // Filter by search term
    const search = searchTerm().toLowerCase();
    if (search) {
      result = result.filter(user =>
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.role.toLowerCase().includes(search)
      );
    }

    // Filter by status
    const status = filterStatus();
    if (status !== 'all') {
      result = result.filter(user => user.status === status);
    }

    // Sort
    const key = sortKey();
    const dir = sortDirection();
    result = [...result].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return dir === 'asc' ? comparison : -comparison;
    });

    return result;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey() === key) {
      setSortDirection(sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (key: SortKey) => {
    if (sortKey() !== key) return '↕️';
    return sortDirection() === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="data-table">
      <div className="table-controls">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm()}
          onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
          className="search-input"
        />

        <div className="filter-buttons">
          <button
            className={filterStatus() === 'all' ? 'active' : ''}
            onClick={() => setFilterStatus('all')}
          >
            All
          </button>
          <button
            className={filterStatus() === 'active' ? 'active' : ''}
            onClick={() => setFilterStatus('active')}
          >
            Active
          </button>
          <button
            className={filterStatus() === 'inactive' ? 'active' : ''}
            onClick={() => setFilterStatus('inactive')}
          >
            Inactive
          </button>
        </div>
      </div>

      <Show
        when={filteredAndSorted().length > 0}
        fallback={<p className="no-results">No users found</p>}
      >
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('name')}>
                Name {getSortIcon('name')}
              </th>
              <th onClick={() => handleSort('email')}>
                Email {getSortIcon('email')}
              </th>
              <th onClick={() => handleSort('role')}>
                Role {getSortIcon('role')}
              </th>
              <th onClick={() => handleSort('status')}>
                Status {getSortIcon('status')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <For each={filteredAndSorted()}>
              {(user) => (
                <tr>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <span className={`status-badge status-${user.status}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-sm">Edit</button>
                    <button className="btn-sm btn-danger">Delete</button>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>

      <div className="table-footer">
        <span>Showing {filteredAndSorted().length} of {users().length} users</span>
      </div>
    </div>
  );
};

export default DataTable;
```

## Modal Dialog Component

```tsx
import { createSignal } from '@awc/reactive';
import { Show, Portal } from '@awc/kettlejs';
import type { JSX } from '@awc/kettlejs/jsx-runtime';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: JSX.Element;
}

const Modal = (props: ModalProps) => {
  return (
    <Show when={props.isOpen}>
      <Portal>
        <div className="modal-overlay" onClick={props.onClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{props.title}</h2>
              <button className="close-btn" onClick={props.onClose}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {props.children}
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
};

// Usage Example
const ModalExample = () => {
  const [isOpen, setIsOpen] = createSignal(false);

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>
        Open Modal
      </button>

      <Modal
        isOpen={isOpen()}
        onClose={() => setIsOpen(false)}
        title="Example Modal"
      >
        <div>
          <p>This is modal content</p>
          <button onClick={() => setIsOpen(false)}>
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ModalExample;
```

## See Also

- [JSX/TSX Guide](./jsx-tsx-guide.md)
- [Components Overview](../components/overview.md)
- [Core Concepts](../core-concepts/signals.md)
- [Migration from React](./migration.md#from-react)