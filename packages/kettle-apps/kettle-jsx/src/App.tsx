import { createSignal, createStore } from '@awc/reactive';
import './styles/main.css';
import { onMount } from '@awc/kettlejs';

export function App() {
  const [count, setCount] = createSignal(0);
  const [store, setStore] = createStore({ name: 'John' });

  function increment() {
    setCount(count() + 1);
    setStore('name', `Jane ${count()}`);
  }

  function decrement() {
    console.log('Decrementing count');
    setCount(count() - 1);
  }

  onMount(() => {
    console.log('component mounted');
  });
  return (
    <>
      <div class="app">
        <header>
          <h1>Welcome to KettleJS</h1>
          <p>A reactive framework powered by signals</p>
        </header>

        <main>
          <div class="counter">
            <h2>Counter Example</h2>
            <div class="controls">
              <button onClick={decrement}>-</button>
              <span class="count">{store.name}</span>
              <button onClick={increment}>+</button>
            </div>
            <p class="info">
              Click the buttons to see reactive updates in action!
            </p>
          </div>
        </main>

        <footer>
          <p>Built with KettleJS JSX</p>
        </footer>
      </div>
    </>
  );
}

export default App;
