# Fluixi Quick Start Guide

Get up and running with Fluixi in 5 minutes!

## 📦 Installation

### Option 1: Create New Project (Recommended)

```bash
# Using npx
npx fluixi new my-app

# Or install CLI globally
npm install -g fluixi
fluixi new my-app

# Navigate to project
cd my-app

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Option 2: Add to Existing Project

```bash
npm install fluixi @fluixi/reactive lit
```

## 🎯 Your First Component

### 1. Create `src/App.ts`

```typescript
import { createSignal, html, Component } from 'fluixi';

export const App: Component = () => {
  const [count, setCount] = createSignal(0);

  return html`
    <div class="app">
      <h1>Welcome to Fluixi! 🫖</h1>
      <div class="counter">
        <button @click=${() => setCount(count() - 1)}>-</button>
        <span class="count">${count()}</span>
        <button @click=${() => setCount(count() + 1)}>+</button>
      </div>
    </div>
  `;
};
```

### 2. Create `src/main.ts`

```typescript
import { render } from 'fluixi';
import { App } from './App';

const root = document.getElementById('app');
if (root) {
  render(App, root);
}
```

### 3. Create `index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fluixi App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

## 🚀 Core Concepts

### Signals (Reactive State)

```typescript
import { createSignal } from 'fluixi';

// Create a signal
const [count, setCount] = createSignal(0);

// Read value
console.log(count()); // 0

// Update value
setCount(5);
setCount(prev => prev + 1);
```

### Effects (Side Effects)

```typescript
import { createSignal, createEffect } from 'fluixi';

const [name, setName] = createSignal('Alice');

createEffect(() => {
  console.log(`Hello, ${name()}!`); // Runs when name changes
});

setName('Bob'); // Logs: "Hello, Bob!"
```

### Conditional Rendering

```typescript
import { Show, createSignal, html } from 'fluixi';

const MyComponent = () => {
  const [isVisible, setIsVisible] = createSignal(true);

  return html`
    <button @click=${() => setIsVisible(!isVisible())}>Toggle</button>
    
    ${Show({
      when: isVisible,
      fallback: html`<p>Hidden</p>`,
      children: html`<p>Visible</p>`
    })}
  `;
};
```

### Lists

```typescript
import { For, createSignal, html } from 'fluixi';

const TodoList = () => {
  const [todos, setTodos] = createSignal([
    { id: 1, text: 'Learn Fluixi' },
    { id: 2, text: 'Build something awesome' }
  ]);

  return html`
    <ul>
      ${For({
        each: todos,
        children: (todo) => html`<li>${todo.text}</li>`
      })}
    </ul>
  `;
};
```

## 🌐 Data Fetching

```typescript
import { createResource, Show, html } from 'fluixi';

const UserProfile = () => {
  const [user, { refetch }] = createResource(
    async () => {
      const response = await fetch('/api/user');
      return response.json();
    }
  );

  return html`
    ${Show({
      when: user.loading,
      fallback: Show({
        when: user,
        children: (u) => html`
          <div>
            <h2>${u.name}</h2>
            <button @click=${refetch}>Refresh</button>
          </div>
        `
      }),
      children: html`<p>Loading...</p>`
    })}
  `;
};
```

## 🛣️ Routing

```typescript
import { createRouter, Router, Link, useParams, html } from 'fluixi';

const Home = () => html`<h1>Home</h1>`;
const About = () => html`<h1>About</h1>`;
const User = () => {
  const params = useParams();
  return html`<h1>User ${params.id}</h1>`;
};

const App = () => {
  const routes = [
    { path: '/', component: Home },
    { path: '/about', component: About },
    { path: '/users/:id', component: User }
  ];

  const router = createRouter(routes);

  return Router({
    router,
    children: html`
      <nav>
        ${Link({ href: '/', children: 'Home' })}
        ${Link({ href: '/about', children: 'About' })}
      </nav>
      <main></main>
    `
  });
};
```

## 🎨 Styling

### Option 1: Global CSS

```css
/* src/styles/main.css */
.counter {
  display: flex;
  gap: 1rem;
  align-items: center;
}

button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
}
```

```typescript
import './styles/main.css';
```

### Option 2: Inline Styles

```typescript
return html`
  <div style="display: flex; gap: 1rem;">
    <button style="padding: 0.5rem;">Click me</button>
  </div>
`;
```

### Option 3: Style Objects

```typescript
const buttonStyle = {
  padding: '0.5rem 1rem',
  background: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '4px'
};

return html`
  <button style=${Object.entries(buttonStyle).map(([k, v]) => `${k}: ${v}`).join('; ')}>
    Click me
  </button>
`;
```

## 🛠️ CLI Commands

### Generate Components

```bash
# Interactive
fluixi generate component

# With options
fluixi g c Button --type with-state
fluixi g c UserCard --type with-resource
fluixi g c Dashboard --type full
```

### Component Types

- `basic` - Simple component
- `with-state` - With reactive state
- `with-resource` - With data fetching
- `with-router` - With routing
- `full` - All features

## 📁 Recommended Project Structure

```
my-app/
├── src/
│   ├── components/          # Reusable components
│   │   ├── Button/
│   │   │   ├── Button.ts
│   │   │   ├── Button.css
│   │   │   └── Button.spec.ts
│   │   └── Card/
│   │       └── Card.ts
│   ├── pages/               # Page components
│   │   ├── Home.ts
│   │   ├── About.ts
│   │   └── UserDetail.ts
│   ├── contexts/            # Context definitions
│   │   ├── AuthContext.ts
│   │   └── ThemeContext.ts
│   ├── services/            # API services
│   │   └── api.ts
│   ├── utils/               # Utility functions
│   │   └── helpers.ts
│   ├── styles/              # Global styles
│   │   └── main.css
│   ├── App.ts               # Root component
│   └── main.ts              # Entry point
├── public/                  # Static assets
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🎓 Common Patterns

### Form Handling

```typescript
const ContactForm = () => {
  const [name, setName] = createSignal('');
  const [email, setEmail] = createSignal('');

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    console.log({ name: name(), email: email() });
  };

  return html`
    <form @submit=${handleSubmit}>
      <input
        type="text"
        .value=${name()}
        @input=${(e: Event) => setName((e.target as HTMLInputElement).value)}
        placeholder="Name"
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

### Context (State Sharing)

```typescript
import { createContext, useContext, Provider } from 'fluixi';

const ThemeContext = createContext({ dark: false });

const ThemedButton = () => {
  const theme = useContext(ThemeContext);
  return html`<button class=${theme.dark ? 'dark' : 'light'}>Click</button>`;
};

const App = () => {
  return Provider({
    context: ThemeContext,
    value: { dark: true },
    children: html`<div>${ThemedButton()}</div>`
  });
};
```

### Computed Values

```typescript
import { createSignal, createMemo } from 'fluixi';

const ShoppingCart = () => {
  const [items, setItems] = createSignal([
    { price: 10, quantity: 2 },
    { price: 20, quantity: 1 }
  ]);

  // Computed value - only recalculates when items change
  const total = createMemo(() =>
    items().reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  return html`<p>Total: $${total()}</p>`;
};
```

## 🐛 Debugging Tips

### 1. Check Signal Values

```typescript
const [count, setCount] = createSignal(0);
console.log('Current count:', count());
```

### 2. Debug Effects

```typescript
createEffect(() => {
  console.log('Effect running, count:', count());
});
```

### 3. Name Your Signals

```typescript
const [count, setCount] = createSignal(0, { name: 'counter' });
```

## 📚 Next Steps

1. **Read the full documentation**: Check out `README.md` and `docs/API.md`
2. **Explore examples**: See `docs/EXAMPLES.md` for real-world patterns
3. **Build something**: Start with a simple app and expand
4. **Join the community**: Share your projects and get help

## 🔗 Resources

- [Full Documentation](./README.md)
- [API Reference](./docs/API.md)
- [Examples](./docs/EXAMPLES.md)
- [GitHub](https://github.com/your-org/fluixi)

## 💡 Tips

- ✅ Always call signals as functions: `count()` not `count`
- ✅ Use `createMemo` for expensive computations
- ✅ Clean up effects in `onMount` return function
- ✅ Use `batch()` for multiple related updates
- ✅ Use `Show` instead of ternary for conditionals
- ✅ Use `For` for lists instead of `.map()`

## 🎉 You're Ready!

You now know the basics of Fluixi. Start building and have fun! 🫖

---

Need help? Check the documentation or open an issue on GitHub.