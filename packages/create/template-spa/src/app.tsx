
export function App() {
  const count = $signal(0);
  return (
    <div class="app">
      <h1>Fluixi</h1>
      <button onClick={() => count.set(count() - 1)}>-</button>
      <span>{count()}</span>
      <button onClick={() => count.set(count() + 1)}>+</button>
    </div>
  );
}
