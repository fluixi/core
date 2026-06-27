// Real Fluixi JSX, compiled in-browser. The { name } on createSignal/createMemo/createStore is
// just the graph label (the core ignores it) — drop it and nodes get positional names instead.
export interface Example {
  name: string;
  code: string;
}

export const examples: Example[] = [
  {
    name: 'Counter',
    code: `function App() {
  const [count, setCount] = createSignal(0, { name: 'count' });
  const double = createMemo(() => count() * 2, { name: 'double' });

  return (
    <div class="card">
      <h3>Counter</h3>
      <div class="row">
        <button onClick={() => setCount(count() - 1)}>−</button>
        <span class="num">{count()}</span>
        <button onClick={() => setCount(count() + 1)}>+</button>
      </div>
      <p class="muted">double = {double()}</p>
    </div>
  );
}`,
  },
  {
    name: 'Temperature',
    code: `function App() {
  const [celsius, setC] = createSignal(21, { name: 'celsius' });
  const fahrenheit = createMemo(() => celsius() * 9 / 5 + 32, { name: 'fahrenheit' });
  const note = createMemo(() => celsius() > 30 ? 'hot' : celsius() < 10 ? 'cold' : 'mild', { name: 'note' });

  return (
    <div class="card">
      <h3>Temperature</h3>
      <div class="row">
        <button onClick={() => setC(c => c - 1)}>−</button>
        <span class="num">{celsius()}°C</span>
        <button onClick={() => setC(c => c + 1)}>+</button>
      </div>
      <p>{fahrenheit()}°F · <span class="muted">{note()}</span></p>
    </div>
  );
}`,
  },
  {
    name: 'Store (cart)',
    code: `function App() {
  const [cart, setCart] = createStore({ items: 0, total: 0 }, { name: 'cart' });
  const summary = createMemo(() => cart.items + ' item(s) · $' + cart.total, { name: 'summary' });

  const add = () => setCart(c => ({ items: c.items + 1, total: c.total + 12 }));
  const clear = () => setCart({ items: 0, total: 0 });

  return (
    <div class="card">
      <h3>Cart store</h3>
      <p class="num">{summary()}</p>
      <div class="row">
        <button onClick={add}>Add $12</button>
        <button onClick={clear}>Clear</button>
      </div>
    </div>
  );
}`,
  },
  {
    name: 'Async resource',
    code: `function App() {
  const [id, setId] = createSignal(1, { name: 'userId' });

  // a resource re-fetches whenever its source signal changes
  const [user] = createResource(id, async (uid) => {
    await new Promise(r => setTimeout(r, 600));
    return { id: uid, name: 'User #' + uid };
  }, { name: 'user' });

  return (
    <div class="card">
      <h3>Async resource</h3>
      <div class="row">
        <button onClick={() => setId(n => n + 1)}>Load next user</button>
      </div>
      <p class="num">{user.loading ? 'loading…' : user().name}</p>
    </div>
  );
}`,
  },
  {
    name: 'Effect log',
    code: `function App() {
  const [n, setN] = createSignal(1, { name: 'n' });
  const squared = createMemo(() => n() * n(), { name: 'squared' });
  const [log, setLog] = createSignal('', { name: 'log' });

  createEffect(() => {
    setLog(n() + '² = ' + squared());
  }, { name: 'sync-log' });

  return (
    <div class="card">
      <h3>Effect</h3>
      <div class="row">
        <button onClick={() => setN(v => v - 1)}>−</button>
        <span class="num">{n()}</span>
        <button onClick={() => setN(v => v + 1)}>+</button>
      </div>
      <p class="muted">{log()}</p>
    </div>
  );
}`,
  },
];
