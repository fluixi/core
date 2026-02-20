// import { batch, createEffect, createMemo } from '../signal/index.js';
// import { createStore, unwrap } from './store.js';
import {
  batch,
  createEffect,
  createMemo,
  createRoot,
  createSignal,
} from 'solid-js';
import { createStore, unwrap } from 'solid-js/store';

interface Base {
  name: string;
  last: string;
  age: number;
  counter: number;
}
interface People extends Base {
  wife: Wife;
}

interface Wife extends Base {
  childs?: Base[];
}
export interface Person {
  counter: number;
  person?: People;
}

// describe('solid reactivity', () => {
//   it('runs createEffect', () => {
//     createRoot((dispose) => {
//       const [count, setCount] = createSignal(0);

//       let runs = 0;

//       createEffect(() => {
//         count(); // tracked read
//         runs++;
//       });

//       expect(runs).toBe(1); // initial run

//       setCount(1);
//       expect(runs).toBe(2);

//       dispose();
//     });
//   });
// });

describe('test', () => {
  // beforeAll(() => {
  //   vi.useFakeTimers();
  // });

  // afterAll(() => {
  //   vi.useRealTimers();
  // });
  // it('should update mixed type array elements', () => {
  //   const [mixed, set] = createStore<any[]>([
  //     1,
  //     'string',
  //     { id: 1, name: 'object' },
  //   ]);

  //   set('[0]', 100);
  //   set('[1]', 'updated');
  //   set('[2].name', 'updated object');

  //   expect(mixed).toEqual([100, 'updated', { id: 1, name: 'updated object' }]);
  // });
  // test('runs effect', () => {
  //   createRoot(() => {
  //     const [s, set] = createSignal(0);

  //     createEffect(() => {
  //       console.log('effect:', s());
  //     });

  //     set(1);
  //     console.log('run effect', s());
  //   });
  // });
  describe('Property-Level Tracking', () => {
    // it('should only track accessed properties', async () => {
    //   vi.useRealTimers();
    //   const [state, setState] = createStore({
    //     a: 1,
    //     b: 2,
    //     c: 3,
    //   });

    //   let aRuns = 0;
    //   let bRuns = 0;
    //   let cRuns = 0;

    //   // Each effect only tracks one property
    //   createEffect(() => {
    //     state.a;
    //     aRuns++;
    //     console.log('effect a', state.a);
    //   });

    //   createEffect(() => {
    //     console.log('effect b');
    //     state.b;
    //     bRuns++;
    //   });

    //   createEffect(() => {
    //     console.log('effect c');
    //     state.c;
    //     cRuns++;
    //   });

    //   // expect(aRuns).toBe(1);
    //   // expect(bRuns).toBe(1);
    //   // expect(cRuns).toBe(1);

    //   // Update 'a' - only first effect should run
    //   setState('a', 10);
    //   await new Promise((resolve) => setTimeout(resolve, 500));
    //   setState('b', 11);
    //   // createRoot( () => {
    //   //   // vi.advanceTimersByTime(5000);
    //   //   // vi.useRealTimers();
    //   //   // console.log('aruns', aRuns);
    //   //   // setState('a', 20);
    //   //   // expect(aRuns).toBe(2);
    //   //   // console.log('b runs', state);
    //   // });
    //   // expect(bRuns).toBe(1); // ✅ Not affected
    //   // expect(cRuns).toBe(1); // ✅ Not affected

    //   // // Update 'b' - only second effect should run
    //   // setState('b', 20);
    //   // expect(aRuns).toBe(2); // ✅ Not affected
    //   // expect(bRuns).toBe(2);
    //   // expect(cRuns).toBe(1); // ✅ Not affected

    //   // // Update 'c' - only third effect should run
    //   // setState('c', 30);
    //   // expect(aRuns).toBe(2); // ✅ Not affected
    //   // expect(bRuns).toBe(2); // ✅ Not affected
    //   // expect(cRuns).toBe(2);
    // });

    it('should track nested properties independently', () => {
      const [state, setState] = createStore({
        user: {
          name: 'Alice',
          age: 30,
        },
        settings: {
          theme: 'dark',
          language: 'en',
        },
      });

      let nameRuns = 0;
      let ageRuns = 0;
      let themeRuns = 0;

      createEffect(() => {
        console.log('name run');
        state.user.name;
        nameRuns++;
      });

      createEffect(() => {
        console.log('age run');
        state.user.age;
        ageRuns++;
      });

      createEffect(() => {
        state.settings.theme;
        themeRuns++;
      });

      expect(nameRuns).toBe(1);
      expect(ageRuns).toBe(1);
      expect(themeRuns).toBe(1);

      // Update name - name effect runs (age and theme are in different branches)
      setState('user', 'name', 'Bob');
      // expect(nameRuns).toBe(2);
      // expect(ageRuns).toBeGreaterThanOrEqual(1); // May be affected by parent reconciliation
      // expect(themeRuns).toBe(1); // ✅ Different branch

      // // Update age - age effect runs
      // setState('user', 'age', 31);
      // expect(nameRuns).toBeGreaterThanOrEqual(2); // May be affected by parent reconciliation
      // expect(ageRuns).toBeGreaterThanOrEqual(2);
      // expect(themeRuns).toBe(1); // ✅ Different branch

      // // Update theme - theme effect runs (user branch is independent)
      // setState('settings', 'theme', 'light');
      // expect(nameRuns).toBeGreaterThanOrEqual(2); // ✅ Different branch
      // expect(ageRuns).toBeGreaterThanOrEqual(2); // ✅ Different branch
      // expect(themeRuns).toBe(2);
    });

    // it('should track array elements independently', () => {
    //   const [items, setItems] = createStore([1, 2, 3, 4, 5]);

    //   let firstRuns = 0;
    //   let secondRuns = 0;
    //   let thirdRuns = 0;

    //   createEffect(() => {
    //     items[0];
    //     firstRuns++;
    //   });

    //   createEffect(() => {
    //     items[1];
    //     secondRuns++;
    //   });

    //   createEffect(() => {
    //     items[2];
    //     thirdRuns++;
    //   });

    //   expect(firstRuns).toBe(1);
    //   expect(secondRuns).toBe(1);
    //   expect(thirdRuns).toBe(1);

    //   // Update first element - only first effect runs
    //   setItems('[0]', 10);
    //   expect(firstRuns).toBe(2);
    //   expect(secondRuns).toBe(1); // ✅ Independent
    //   expect(thirdRuns).toBe(1); // ✅ Independent

    //   // Update second element - only second effect runs
    //   setItems('[1]', 20);
    //   expect(firstRuns).toBe(2); // ✅ Independent
    //   expect(secondRuns).toBe(2);
    //   expect(thirdRuns).toBe(1); // ✅ Independent
    // });

    // it('should track array object properties independently', () => {
    //   const [todos, setTodos] = createStore([
    //     { id: 1, text: 'Task 1', done: false },
    //     { id: 2, text: 'Task 2', done: false },
    //     { id: 3, text: 'Task 3', done: false },
    //   ]);

    //   let text0Runs = 0;
    //   let done0Runs = 0;
    //   let text1Runs = 0;

    //   createEffect(() => {
    //     todos[0].text;
    //     text0Runs++;
    //   });

    //   createEffect(() => {
    //     todos[0].done;
    //     done0Runs++;
    //   });

    //   createEffect(() => {
    //     todos[1].text;
    //     text1Runs++;
    //   });

    //   expect(text0Runs).toBe(1);
    //   expect(done0Runs).toBe(1);
    //   expect(text1Runs).toBe(1);

    //   // Update first todo's text - array iteration triggers all array effects
    //   setTodos('[0].text', 'Updated Task 1');
    //   expect(text0Runs).toBe(2);
    //   expect(done0Runs).toBeGreaterThanOrEqual(1); // Array iteration may trigger
    //   expect(text1Runs).toBeGreaterThanOrEqual(1); // Array iteration may trigger

    //   // Update first todo's done - array iteration triggers
    //   setTodos('[0].done', true);
    //   expect(text0Runs).toBeGreaterThanOrEqual(2);
    //   expect(done0Runs).toBeGreaterThanOrEqual(2);
    //   expect(text1Runs).toBeGreaterThanOrEqual(1);

    //   // Update second todo's text - array iteration triggers
    //   setTodos('[1].text', 'Updated Task 2');
    //   expect(text0Runs).toBeGreaterThanOrEqual(2);
    //   expect(done0Runs).toBeGreaterThanOrEqual(2);
    //   expect(text1Runs).toBeGreaterThanOrEqual(2);
    // });
  });
});
