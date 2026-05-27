/** @jsx h */
import { h, Fragment } from '@awc/kettlejs/jsx-runtime';
import { createSignal } from '@awc/reactive/signal';
import './counter.css';

export interface CounterProps {
  initialCount?: number;
}

export function Counter({ initialCount = 0 }: CounterProps) {
  const [count, setCount] = createSignal(initialCount);

  const increment = () => setCount(count() + 1);
  const decrement = () => setCount(count() - 1);
  const reset = () => setCount(initialCount);

  return (
    <div class="counter">
      <h2>Counter Component</h2>
      <div class="counter">
        <button onClick={decrement}>-</button>
        <span class="count">{count()}</span>
        <button onClick={increment}>+</button>
      </div>
      <button onClick={reset}>Reset</button>
    </div>
  );
}

export default Counter;
