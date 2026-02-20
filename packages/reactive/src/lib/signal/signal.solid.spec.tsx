import { createEffect, createMemo, createSignal } from 'solid-js';

describe('solid signal', () => {
  // it('should support cleanup functions', () => {
  //   const [count, setCount] = createSignal(0);
  //   let cleanups = 0;
  //   createEffect(() => {
  //     count();
  //     console.log('effect');
  //     return () => {
  //       cleanups++;
  //     };
  //   });
  //   setCount(1);
  //   setCount(2);
  //   expect(cleanups).toBeGreaterThan(0);
  // });
  it('should cache computed values', () => {
    const [count, setCount] = createSignal(2);
    let computations = 0;
    const doubled = createMemo(() => {
      computations++;
      console.log('memo', computations);
      return count() * 2;
    });
    expect(computations).toBe(1);
    doubled();
    doubled();
    doubled();
    expect(computations).toBe(1); // Should not recompute
  });
});
