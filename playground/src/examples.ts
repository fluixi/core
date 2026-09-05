// Starting projects. Each is a set of files that import each other and the framework the same
// way an application does — the point being that nothing here is playground-specific syntax.
import type { Project } from './project';

export const examples: Project[] = [
  {
    name: 'Counter',
    entry: 'main.tsx',
    files: [
      {
        path: 'main.tsx',
        code: `import Counter from './Counter';

export default function App() {
  return (
    <div class="card">
      <h3>Counter</h3>
      <Counter start={0} step={1} />
      <Counter start={100} step={-5} />
    </div>
  );
}
`,
      },
      {
        path: 'Counter.tsx',
        code: `import { createSignal, createMemo } from '@fluixi/core';

export default function Counter(props: { start: number; step: number }) {
  const [count, setCount] = createSignal(props.start, { name: 'count' });
  const double = createMemo(() => count() * 2, { name: 'double' });

  return (
    <div class="row">
      <button onClick={() => setCount(count() - props.step)}>−</button>
      <span class="num">{count()}</span>
      <button onClick={() => setCount(count() + props.step)}>+</button>
      <small>double: {double()}</small>
    </div>
  );
}
`,
      },
    ],
  },
  {
    name: 'Todo list',
    entry: 'main.tsx',
    files: [
      {
        path: 'main.tsx',
        code: `import { createSignal, createMemo } from '@fluixi/core';
import { TodoItem } from './TodoItem';
import { remaining } from './stats';

export default function App() {
  const [todos, setTodos] = createSignal(
    [
      { id: 1, text: 'Read the compiler docs', done: true },
      { id: 2, text: 'Write a component', done: false },
    ],
    { name: 'todos' },
  );
  const [draft, setDraft] = createSignal('', { name: 'draft' });
  const left = createMemo(() => remaining(todos()), { name: 'left' });

  const add = () => {
    const text = draft().trim();
    if (!text) return;
    setTodos([...todos(), { id: Date.now(), text, done: false }]);
    setDraft('');
  };

  const toggle = (id: number) =>
    setTodos(todos().map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <div class="card">
      <h3>Todo · {left()} left</h3>
      <div class="row">
        <input
          value={draft()}
          onInput={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="What needs doing?"
        />
        <button onClick={add}>Add</button>
      </div>
      <ul class="list">
        {todos().map((todo) => (
          <TodoItem todo={todo} onToggle={toggle} />
        ))}
      </ul>
    </div>
  );
}
`,
      },
      {
        path: 'TodoItem.tsx',
        code: `export function TodoItem(props: {
  todo: { id: number; text: string; done: boolean };
  onToggle: (id: number) => void;
}) {
  return (
    <li class={props.todo.done ? 'done' : ''}>
      <label>
        <input type="checkbox" checked={props.todo.done} onChange={() => props.onToggle(props.todo.id)} />
        {props.todo.text}
      </label>
    </li>
  );
}
`,
      },
      {
        path: 'stats.ts',
        code: `export function remaining(todos: { done: boolean }[]): number {
  return todos.filter((t) => !t.done).length;
}
`,
      },
    ],
  },
  {
    name: 'Store',
    entry: 'main.tsx',
    files: [
      {
        path: 'main.tsx',
        code: `import { createEffect } from '@fluixi/core';
import { cart, addItem, total } from './cart';

export default function App() {
  createEffect(() => console.log('total is', total()), { name: 'log' });

  return (
    <div class="card">
      <h3>Cart · {total()}</h3>
      <ul class="list">
        {cart.items.map((item) => (
          <li>
            {item.name} × {item.qty}
          </li>
        ))}
      </ul>
      <button onClick={() => addItem({ name: 'Widget', qty: 1, price: 9 })}>Add widget</button>
    </div>
  );
}
`,
      },
      {
        path: 'cart.ts',
        code: `import { createStore, createMemo } from '@fluixi/core';

interface Item { name: string; qty: number; price: number }

export const [cart, setCart] = createStore(
  { items: [{ name: 'Bolt', qty: 2, price: 3 }] as Item[] },
  { name: 'cart' },
);

export function addItem(item: Item) {
  setCart({ items: [...cart.items, item] });
}

export const total = createMemo(
  () => cart.items.reduce((sum, i) => sum + i.qty * i.price, 0),
  { name: 'total' },
);
`,
      },
    ],
  },
  {
    name: 'Mount by hand',
    entry: 'main.ts',
    files: [
      {
        path: 'main.ts',
        code: `// An entry can mount itself instead of exporting a component. Export mount(element)
// and the playground hands you the preview node — return a function to clean up.
import { render, createSignal } from '@fluixi/core';
import { Clock } from './Clock';

export function mount(el: HTMLElement) {
  const [now, setNow] = createSignal(new Date().toLocaleTimeString(), { name: 'now' });
  const timer = setInterval(() => setNow(new Date().toLocaleTimeString()), 1000);

  const dispose = render(() => Clock({ now }), el);
  return () => {
    clearInterval(timer);
    dispose();
  };
}
`,
      },
      {
        path: 'Clock.tsx',
        code: `export function Clock(props: { now: () => string }) {
  return (
    <div class="card">
      <h3>Clock</h3>
      <span class="num">{props.now()}</span>
    </div>
  );
}
`,
      },
    ],
  },
];
