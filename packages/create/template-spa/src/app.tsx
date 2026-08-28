import { createSignal } from 'fluixi';

export function App() {
  const [count, setCount] = createSignal(0);
  return (
    <div class="app">
      <h1>Fluixi</h1>
      <button onClick={() => setCount(count() - 1)}>-</button>
      <span>{count()}</span>
      <button onClick={() => setCount(count() + 1)}>+</button>
    </div>
  );
}
