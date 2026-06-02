---
sidebar_position: 3
title: Quick Start
---

# Quick Start

This guide will walk you through building your first KettleJS application in just a few minutes.

## Your First KettleJS App

Let's build a simple todo application to learn the basics of KettleJS.

### Step 1: Create the Project

```bash
# Create a new KettleJS project
npx @fluixi/kettlejs new todo-app

# Navigate to the project
cd todo-app

# Install dependencies
npm install

# Start the dev server
npm run dev
```

### Step 2: Create the Todo Component

Create `src/components/TodoApp.ts`:

```typescript
import { html, createSignal, Component, For, Show } from '@fluixi/kettlejs';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export const TodoApp: Component = () => {
  const [todos, setTodos] = createSignal<Todo[]>([]);
  const [inputValue, setInputValue] = createSignal('');
  const [filter, setFilter] = createSignal<'all' | 'active' | 'completed'>('all');

  // Add a new todo
  const addTodo = () => {
    const text = inputValue().trim();
    if (!text) return;

    const newTodo: Todo = {
      id: Date.now(),
      text,
      completed: false
    };

    setTodos([...todos(), newTodo]);
    setInputValue('');
  };

  // Toggle todo completion
  const toggleTodo = (id: number) => {
    setTodos(
      todos().map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  // Delete a todo
  const deleteTodo = (id: number) => {
    setTodos(todos().filter(todo => todo.id !== id));
  };

  // Filtered todos based on current filter
  const filteredTodos = () => {
    const currentFilter = filter();
    const allTodos = todos();

    if (currentFilter === 'active') {
      return allTodos.filter(todo => !todo.completed);
    }
    if (currentFilter === 'completed') {
      return allTodos.filter(todo => todo.completed);
    }
    return allTodos;
  };

  // Handle enter key
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  return html`
    <div class="todo-app">
      <h1>KettleJS Todo App</h1>

      <!-- Input section -->
      <div class="input-section">
        <input
          type="text"
          placeholder="What needs to be done?"
          .value=${inputValue()}
          @input=${(e: Event) => setInputValue((e.target as HTMLInputElement).value)}
          @keypress=${handleKeyPress}
        />
        <button @click=${addTodo}>Add</button>
      </div>

      <!-- Filter buttons -->
      <div class="filters">
        <button
          class=${filter() === 'all' ? 'active' : ''}
          @click=${() => setFilter('all')}
        >
          All
        </button>
        <button
          class=${filter() === 'active' ? 'active' : ''}
          @click=${() => setFilter('active')}
        >
          Active
        </button>
        <button
          class=${filter() === 'completed' ? 'active' : ''}
          @click=${() => setFilter('completed')}
        >
          Completed
        </button>
      </div>

      <!-- Todo list -->
      ${Show({
        when: () => filteredTodos().length > 0,
        fallback: html`<p class="empty">No todos to display</p>`,
        children: html`
          <ul class="todo-list">
            ${For({
              each: filteredTodos,
              children: (todo) => html`
                <li class=${todo.completed ? 'completed' : ''}>
                  <input
                    type="checkbox"
                    .checked=${todo.completed}
                    @change=${() => toggleTodo(todo.id)}
                  />
                  <span class="todo-text">${todo.text}</span>
                  <button
                    class="delete-btn"
                    @click=${() => deleteTodo(todo.id)}
                  >
                    ×
                  </button>
                </li>
              `
            })}
          </ul>
        `
      })}

      <!-- Stats -->
      <div class="stats">
        <span>${todos().filter(t => !t.completed).length} items left</span>
      </div>
    </div>
  `;
};
```

### Step 3: Add Styles

Create `src/styles.css`:

```css
* {
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
  padding: 20px;
}

.todo-app {
  background: white;
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 100%;
}

h1 {
  margin: 0 0 30px;
  font-size: 32px;
  text-align: center;
  color: #333;
}

.input-section {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.input-section input {
  flex: 1;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 5px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
}

.input-section input:focus {
  border-color: #667eea;
}

.input-section button {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.input-section button:hover {
  background: #5568d3;
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  justify-content: center;
}

.filters button {
  padding: 8px 16px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
}

.filters button:hover {
  background: #e0e0e0;
}

.filters button.active {
  background: #667eea;
  color: white;
}

.todo-list {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
}

.todo-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  transition: background 0.2s;
}

.todo-list li:hover {
  background: #f9f9f9;
}

.todo-list li.completed .todo-text {
  text-decoration: line-through;
  opacity: 0.5;
}

.todo-list input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.todo-text {
  flex: 1;
  font-size: 16px;
}

.delete-btn {
  background: #ff4757;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.delete-btn:hover {
  background: #ee5a6f;
}

.empty {
  text-align: center;
  color: #999;
  padding: 40px;
  font-size: 18px;
}

.stats {
  text-align: center;
  color: #666;
  font-size: 14px;
  padding-top: 10px;
  border-top: 1px solid #e0e0e0;
}
```

### Step 4: Update the App Entry Point

Update `src/App.ts`:

```typescript
import { html, Component } from '@fluixi/kettlejs';
import { TodoApp } from './components/TodoApp';

export const App: Component = () => {
  return html`${TodoApp()}`;
};
```

### Step 5: Update index.html

Update `index.html` to include styles:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KettleJS Todo App</title>
  <link rel="stylesheet" href="/src/styles.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/index.ts"></script>
</body>
</html>
```

### Step 6: Run Your App

```bash
npm run dev
```

Open `http://localhost:5173` in your browser. You should see a fully functional todo app!

## Key Concepts Demonstrated

### 1. Signals
```typescript
const [todos, setTodos] = createSignal<Todo[]>([]);
```
Signals create reactive state that automatically updates the UI when changed.

### 2. Derived State
```typescript
const filteredTodos = () => {
  const currentFilter = filter();
  const allTodos = todos();
  // ... filtering logic
};
```
Functions that read signals become automatically reactive.

### 3. Control Flow - Show
```typescript
${Show({
  when: () => filteredTodos().length > 0,
  fallback: html`<p>No todos</p>`,
  children: html`<ul>...</ul>`
})}
```
Conditional rendering with `Show` component.

### 4. Control Flow - For
```typescript
${For({
  each: filteredTodos,
  children: (todo) => html`<li>...</li>`
})}
```
Efficiently render lists with automatic reconciliation.

### 5. Event Handling
```typescript
<button @click=${() => toggleTodo(todo.id)}>
```
Use lit-html's event binding syntax with `@` prefix.

### 6. Two-Way Binding
```typescript
<input
  .value=${inputValue()}
  @input=${(e: Event) => setInputValue((e.target as HTMLInputElement).value)}
/>
```
Bind input values to signals for reactive forms.

## What's Next?

Now that you've built your first KettleJS app, you can:

### Add More Features

**Local Storage Persistence:**
```typescript
import { createEffect } from '@fluixi/kettlejs';

// Load from localStorage on mount
const [todos, setTodos] = createSignal<Todo[]>(
  JSON.parse(localStorage.getItem('todos') || '[]')
);

// Save to localStorage on change
createEffect(() => {
  localStorage.setItem('todos', JSON.stringify(todos()));
});
```

**Clear Completed:**
```typescript
const clearCompleted = () => {
  setTodos(todos().filter(todo => !todo.completed));
};

// In template:
<button @click=${clearCompleted}>Clear Completed</button>
```

**Edit Todos:**
```typescript
const [editingId, setEditingId] = createSignal<number | null>(null);

const startEdit = (id: number) => setEditingId(id);
const saveEdit = (id: number, newText: string) => {
  setTodos(
    todos().map(todo =>
      todo.id === id ? { ...todo, text: newText } : todo
    )
  );
  setEditingId(null);
};
```

### Learn More Concepts

- [Signals Deep Dive](../core-concepts/signals.md) - Master reactive primitives
- [Effects](../core-concepts/effects.md) - Side effects and lifecycle
- [Memos](../core-concepts/memos.md) - Computed values and optimization
- [Components](../components/functional-components.md) - Component patterns

### Explore Advanced Features

- [Router](../guides/routing.md) - Add multi-page navigation
- [Resources](../guides/resources.md) - Async data fetching
- [Context](../guides/context.md) - Global state management
- [SSR](../guides/ssr.md) - Server-side rendering

### Build Something Real

Try building:
- A weather app using the OpenWeather API
- A blog with routing and markdown support
- A dashboard with charts and real-time data
- An e-commerce product catalog

## Common Patterns

### Form Handling

```typescript
const ContactForm: Component = () => {
  const [formData, setFormData] = createSignal({
    name: '',
    email: '',
    message: ''
  });

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData(), [field]: value });
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    console.log('Form submitted:', formData());
    // Handle form submission
  };

  return html`
    <form @submit=${handleSubmit}>
      <input
        type="text"
        placeholder="Name"
        .value=${formData().name}
        @input=${(e: Event) => updateField('name', (e.target as HTMLInputElement).value)}
      />
      <input
        type="email"
        placeholder="Email"
        .value=${formData().email}
        @input=${(e: Event) => updateField('email', (e.target as HTMLInputElement).value)}
      />
      <textarea
        placeholder="Message"
        .value=${formData().message}
        @input=${(e: Event) => updateField('message', (e.target as HTMLInputElement).value)}
      ></textarea>
      <button type="submit">Submit</button>
    </form>
  `;
};
```

### Async Operations

```typescript
const UserProfile: Component = () => {
  const [loading, setLoading] = createSignal(false);
  const [user, setUser] = createSignal<User | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const loadUser = async (userId: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      setUser(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return html`
    ${Show({
      when: loading,
      fallback: Show({
        when: error,
        fallback: Show({
          when: user,
          children: (u) => html`<div>${u.name}</div>`
        }),
        children: html`<div>Error: ${error()}</div>`
      }),
      children: html`<div>Loading...</div>`
    })}
  `;
};
```

## Tips for Success

1. **Keep Components Small** - Break down complex UIs into smaller, reusable components
2. **Use Signals Wisely** - Don't create signals for values that never change
3. **Leverage Control Flow** - Use `Show`, `For`, etc. instead of manual conditional rendering
4. **Think Reactive** - Let the framework handle updates, don't mutate DOM directly
5. **Type Everything** - Use TypeScript for better DX and fewer bugs

## Getting Help

If you get stuck:

- Check the [API Reference](../api-reference/core.md)
- Browse [Examples](../guides/examples.md)
- Ask on [Discord](https://discord.gg/kettlejs)
- Search [GitHub Issues](https://github.com/adafri/kettlejs/issues)

Happy coding! 🫖
