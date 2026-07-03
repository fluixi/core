import { createSignal, Show } from '@fluixi/core';


import type { Component } from '@fluixi/core';

type ResetProps = {
  count?: number
  onReset?: () => void
};

export const Reset: Component<ResetProps> = (props) => {
  return (
    <span class="reset" onClick={props.onReset}>
      reset {props.count}
    </span>
  );
};
/** A tiny reactive counter — fine-grained updates, no virtual DOM. */
export function Counter(props: { start?: number }) {
  const [count, setCount] = createSignal(props.start ?? 0);

  return (
    <div class="counter">
      <h1>Fluixi Counter</h1>
      <button class="dec" onClick={() => setCount(count() - 1)}>-</button>
      <span class="value">{count()}</span>
      <button class="inc" onClick={() => setCount(count() + 1)}>+</button>
      <Show when={count() > 0} fallback={null}>
        <Reset count={count()} onReset={() => setCount(0)} />
      </Show>
    </div>
  );
}
