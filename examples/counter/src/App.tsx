import { createSignal } from '@fluixi/kettlejs';

/** A tiny reactive counter — fine-grained updates, no virtual DOM. */
export function Counter(props: { start?: number }) {
  const [count, setCount] = createSignal(props.start ?? 0);

  return (
    <div class="counter">
      <h1>Fluixi Counter</h1>
      <button class="dec" onClick={() => setCount(count() - 1)}>-</button>
      <span class="value">{count()}</span>
      <button class="inc" onClick={() => setCount(count() + 1)}>+</button>
    </div>
  );
}
