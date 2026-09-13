import { batch, createEffect, createMemo, observeReactiveNodes } from '@fluixi/reactive/signal';
import { createStore, unwrap } from './store.js';

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
describe('store basics', () => {
  it('createStore and createEffect', () => {
    const [person, set] = createStore({ counter: 1 } as Person);
    // const [person, set] = createStore(1);
    // person.counter = 2;
    // console.log('getter', get)
    // let person = get();
    // const double = createMemo<number>(() => person.counter * 2);
    // const isEven = createMemo<number>(() => (person.counter % 2 ? 1 : 0));
    // const isEven = createDerivedTrigger<boolean>(
    //   () => person.counter % 2 === 0
    // );
    // createStoreEffect(get(), (p)=>p.counter, (e)=>{
    //     console.log(`Count store: ${e}, IsEven: ${isEven()}`);
    //     console.log('person', get().counter)

    // })
    // get.toObservable().subscribe((p) => {
    //   console.log('person update', p);
    //   console.log(
    //     `Count store: ${
    //       get().counter
    //     }, IsEven: ${isEven()} IsDouble: ${double()}`
    //   );
    // });
    createEffect(
      // get(),
      // (p) => p.counter,
      () => {
        // console.log(`IsEven: ${isEven()}`);
        console.log(`Count stored`, person.person?.name);
        // person = get();
        // console.log('person counter', person);
      }
    );
    // set('person', ['name'], 'Ibrahima');
    set('counter', (v) => v * 8);
    expect(person!.counter).toBe(8);
    set('person.name', 'Ibrahima');
    expect(person).toMatchObject({
      person: { name: 'Ibrahima' },
      counter: 8,
    });
    set('person.last', 'touré');
    // batch(() => {});
    // set([['counter', (c) => c.counter || 1]]);
    // console.log('person', person);
    expect(person).toMatchObject({
      person: { name: 'Ibrahima', last: 'touré' },
      counter: 8,
    });
    set('person.wife.counter', 4);
    expect(person).toMatchObject({
      person: { name: 'Ibrahima', last: 'touré', wife: { counter: 4 } },
      counter: 8,
    });
    set('person.last', 'touré ba');
    // console.log(person)
    expect(person).toMatchObject({
      person: { name: 'Ibrahima', last: 'touré ba', wife: { counter: 4 } },
      counter: 8,
    });
    set('person.wife.counter', (v) => v + 2);
    expect(person).toMatchObject({
      person: { name: 'Ibrahima', last: 'touré ba', wife: { counter: 6 } },
      counter: 8,
    });
    set('counter', (v) => v + 2);
    expect(person).toMatchObject({
      person: { name: 'Ibrahima', last: 'touré ba', wife: { counter: 6 } },
      counter: 10,
    });
    set('counter', (v) => v + 2);
    expect(person).toMatchObject({
      person: { name: 'Ibrahima', last: 'touré ba', wife: { counter: 6 } },
      counter: 12,
    });
    set((state) => ({ ...state, counter: state.counter + 1 }));
    // console.log('person update lats', person);
    expect(person).toMatchObject({
      person: { name: 'Ibrahima', last: 'touré ba', wife: { counter: 6 } },
      counter: 13,
    });
    set((state) => ({ ...state, counter: state.counter + 1 }));
    expect(person).toMatchObject({
      person: { name: 'Ibrahima', last: 'touré ba', wife: { counter: 6 } },
      counter: 14,
    });
    // set('person.wife.childs', [] as Base[]);
    // set.push('person.wife.childs', [{ name: 'Ibrahima', age: 28 } as Base]);
    // set.push('person.wife.childs', [{ name: 'Alioune', age: 33 } as Base]);
    // const p = set.insert('person.wife.childs', 0, {
    //   name: 'Bineta',
    //   age: 18,
    // } as Base);
    // console.log('person last', person.person.wife.childs);
  });
  // it('createStore and createEffect for store array', () => {
  //   const [person, set] = createStore([{ counter: 1 }] as Person[]);
  //   // const [person, set] = createStore(1);
  //   // person.counter = 2;
  //   // console.log('getter', get)
  //   // let person = get();
  //   // const double = createMemo<number>(() => person.counter * 2);
  //   // const isEven = createMemo<number>(() => (person.counter % 2 ? 1 : 0));
  //   // const isEven = createDerivedTrigger<boolean>(
  //   //   () => person.counter % 2 === 0
  //   // );
  //   // createStoreEffect(get(), (p)=>p.counter, (e)=>{
  //   //     console.log(`Count store: ${e}, IsEven: ${isEven()}`);
  //   //     console.log('person', get().counter)

  //   // })
  //   // get.toObservable().subscribe((p) => {
  //   //   console.log('person update', p);
  //   //   console.log(
  //   //     `Count store: ${
  //   //       get().counter
  //   //     }, IsEven: ${isEven()} IsDouble: ${double()}`
  //   //   );
  //   // });
  //   createEffect(
  //     // get(),
  //     // (p) => p.counter,
  //     () => {
  //       // console.log(`IsEven: ${isEven()}`);
  //       // console.log(`Count store: ${person.counter}`);
  //       // person = get();
  //       // console.log('person', person);
  //     }
  //   );
  //   // const t = [{ counter: 0 }] as Person[];
  //   // console.log(parseSelector('[0]'));
  //   // type S = SelectorFor<Person[]>;
  //   // type e = IValueOfKey<Person, 'person.wife'>;
  //   set('[*].counter', (v) => {
  //     return v * 8;
  //   });
  //   expect(person[0].counter).toBe(8);
  //   set('[0].person', ['name'], 'Ibrahima');
  //   console.log('person', person);
  //   expect(person[0].person!.name).toBe('Ibrahima');
  // });
});

describe('store with arrays - comprehensive tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  describe('basic array operations', () => {
    it('should create a store with an array', () => {
      const [items] = createStore([1, 2, 3, 4, 5]);
      expect(unwrap(items)).toEqual([1, 2, 3, 4, 5]);
      expect(items.length).toBe(5);
    });

    it('should update array element by index', () => {
      const [items, set] = createStore([1, 2, 3, 4, 5]);
      set('[0]', 10);
      expect(items[0]).toBe(10);
      expect(unwrap(items)).toEqual([10, 2, 3, 4, 5]);
    });

    it('should update multiple array elements', () => {
      const [items, set] = createStore([1, 2, 3, 4, 5]);
      set('[1]', 20);
      set('[3]', 40);
      expect(unwrap(items)).toEqual([1, 20, 3, 40, 5]);
    });

    it('should use function updater for array elements', () => {
      const [items, set] = createStore([1, 2, 3, 4, 5]);
      set('[2]', (v) => v * 10);
      expect(items[2]).toBe(30);
      expect(unwrap(items)).toEqual([1, 2, 30, 4, 5]);
    });

    it('should update all array elements with wildcard selector', () => {
      const [items, set] = createStore([1, 2, 3, 4, 5]);
      set('[*]', (v) => v * 2);
      expect(unwrap(items)).toEqual([2, 4, 6, 8, 10]);
    });
  });

  describe('array of objects', () => {
    interface Todo {
      id: number;
      text: string;
      completed: boolean;
    }

    it('should create store with array of objects', () => {
      const [todos] = createStore<Todo[]>([
        { id: 1, text: 'Learn signals', completed: true },
        { id: 2, text: 'Build app', completed: false },
        { id: 3, text: 'Deploy', completed: false },
      ]);

      expect(todos.length).toBe(3);
      expect(todos[0].text).toBe('Learn signals');
    });

    it('should update property of object in array', () => {
      const [todos, set] = createStore<Todo[]>([
        { id: 1, text: 'Learn signals', completed: false },
        { id: 2, text: 'Build app', completed: false },
      ]);

      set('[0].completed', true);
      expect(todos[0].completed).toBe(true);
      expect(todos[1].completed).toBe(false);
    });

    it('should update multiple properties of object in array', () => {
      const [todos, set] = createStore<Todo[]>([
        { id: 1, text: 'Learn signals', completed: false },
      ]);

      set('[0].text', 'Master signals');
      set('[0].completed', true);

      expect(todos[0].text).toBe('Master signals');
      expect(todos[0].completed).toBe(true);
    });

    it('should use function updater for nested properties', () => {
      const [todos, set] = createStore<Todo[]>([
        { id: 1, text: 'Item 1', completed: false },
        { id: 2, text: 'Item 2', completed: false },
      ]);

      set('[0].id', (v) => v + 100);
      expect(todos[0].id).toBe(101);
    });

    it('should update all objects in array with wildcard', () => {
      const [todos, set] = createStore<Todo[]>([
        { id: 1, text: 'Item 1', completed: false },
        { id: 2, text: 'Item 2', completed: false },
        { id: 3, text: 'Item 3', completed: false },
      ]);

      set('[*].completed', true);

      expect(todos[0].completed).toBe(true);
      expect(todos[1].completed).toBe(true);
      expect(todos[2].completed).toBe(true);
    });
  });

  describe('nested arrays', () => {
    it('should handle array of arrays', () => {
      const [matrix] = createStore([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ]);

      expect(matrix[0][0]).toBe(1);
      expect(matrix[1][1]).toBe(5);
      expect(matrix[2][2]).toBe(9);
    });

    it('should update nested array element', () => {
      const [matrix, set] = createStore([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ]);

      set('[0][1]', 20);
      expect(matrix[0][1]).toBe(20);
      expect(unwrap(matrix)[0]).toEqual([1, 20, 3]);
    });

    it('should update all elements in nested array', () => {
      const [matrix, set] = createStore([
        [1, 2, 3],
        [4, 5, 6],
      ]);

      set('[0][*]', (v) => v * 10);
      expect(unwrap(matrix)[0]).toEqual([10, 20, 30]);
      expect(unwrap(matrix)[1]).toEqual([4, 5, 6]);
    });
  });

  describe('complex nested structures', () => {
    interface User {
      id: number;
      name: string;
      tags: string[];
      metadata?: {
        preferences: string[];
      };
    }

    it('should handle arrays within objects within arrays', () => {
      const [users] = createStore<User[]>([
        { id: 1, name: 'Alice', tags: ['admin', 'user'] },
        { id: 2, name: 'Bob', tags: ['user'] },
      ]);

      expect(unwrap(users)[0].tags).toEqual(['admin', 'user']);
      expect(unwrap(users)[1].tags).toEqual(['user']);
    });

    it('should update nested array within object', () => {
      const [users, set] = createStore<User[]>([
        { id: 1, name: 'Alice', tags: ['admin', 'user'] },
        { id: 2, name: 'Bob', tags: ['user'] },
      ]);

      set('[0].tags[0]', 'superadmin');
      expect(users[0].tags[0]).toBe('superadmin');
      expect(unwrap(users)[0].tags).toEqual(['superadmin', 'user']);
    });

    it('should create deeply nested structure on the fly', () => {
      const [users, set] = createStore<User[]>([
        { id: 1, name: 'Alice', tags: [] },
      ]);

      set('[0].metadata.preferences[0]', 'dark-mode');
      expect(users[0].metadata?.preferences[0]).toBe('dark-mode');
    });
  });

  describe('reactivity with arrays', () => {
    it('should trigger effects when array element changes', () => {
      const [items, set] = createStore([1, 2, 3, 4, 5]);
      let effectCount = 0;
      let lastValue = 0;

      createEffect(() => {
        lastValue = items[0];
        effectCount++;
      });

      expect(effectCount).toBeGreaterThan(0);
      // const initialCount = effectCount;

      set('[0]', 10);

      // expect(effectCount).toBe(initialCount + 1);
      expect(lastValue).toBe(10);
    });

    it('should trigger effects when nested property changes', () => {
      interface Item {
        id: number;
        value: number;
      }

      const [items, set] = createStore<Item[]>([
        { id: 1, value: 10 },
        { id: 2, value: 20 },
      ]);

      let effectCount = 0;
      let lastValue = 0;

      createEffect(() => {
        lastValue = items[0].value;
        console.log('effect runned', lastValue);
        effectCount++;
      });

      const initialCount = effectCount;

      set('[0].value', (v) => v * 2);
      // console.log('after triggered', initialCount);

      expect(effectCount).toBe(initialCount + 1);
      expect(lastValue).toBe(20);
    });

    it('should work with createMemo on array elements', () => {
      const [items, set] = createStore([1, 2, 3, 4, 5]);
      // const sum = createStoreMemo()
      const sum = createMemo(() => {
        return items.reduce((acc, val) => acc + val, 0);
      });

      expect(sum()).toBe(15);
      set('[0]', 10);
      const s = sum();
      expect(s).toBe(24); // 10 + 2 + 3 + 4 + 5
      // setTimeout(() => {
      // }, 0);
      // vi.advanceTimersByTime(10);
    });
  });

  describe('batch operations with arrays', () => {
    it('should batch multiple array updates', () => {
      const [items, set] = createStore([1, 2, 3, 4, 5]);
      let effectCount = 0;

      createEffect(() => {
        // Access items to establish dependency
        items.forEach(() => {});
        effectCount++;
      });

      const initialCount = effectCount;

      batch(() => {
        set('[0]', 10);
        set('[1]', 20);
        set('[2]', 30);
      });
      // console.log('after batch end', effectCount);

      // vi.advanceTimersByTime(10);
      // Effect should run once after batch
      expect(effectCount).toBe(initialCount + 1);
      expect(unwrap(items)).toEqual([10, 20, 30, 4, 5]);
    });
  });

  describe('array methods and operations', () => {
    it('should handle array with mixed types', () => {
      const [mixed] = createStore<any[]>([
        1,
        'string',
        { id: 1, name: 'object' },
        [1, 2, 3],
        true,
      ]);

      expect(mixed[0]).toBe(1);
      expect(mixed[1]).toBe('string');
      expect(mixed[2].name).toBe('object');
      expect(unwrap(mixed)[3]).toEqual([1, 2, 3]);
      expect(mixed[4]).toBe(true);
    });

    it('should update mixed type array elements', () => {
      const [mixed, set] = createStore<any[]>([
        1,
        'string',
        { id: 1, name: 'object' },
      ]);

      set('[0]', 100);
      set('[1]', 'updated');
      set('[2].name', 'updated object');

      expect(unwrap(mixed)).toEqual([
        100,
        'updated',
        { id: 1, name: 'updated object' },
      ]);
    });
  });

  describe('edge cases with arrays', () => {
    it('should handle empty array', () => {
      const [items] = createStore<number[]>([]);
      expect(unwrap(items)).toEqual([]);
      expect(items.length).toBe(0);
    });

    it('should handle single element array', () => {
      const [items, set] = createStore([42]);
      expect(items.length).toBe(1);
      expect(items[0]).toBe(42);

      set('[0]', 100);
      expect(items[0]).toBe(100);
    });

    it('should handle array with undefined values', () => {
      const [items, set] = createStore<(number | undefined)[]>([
        1,
        undefined,
        3,
      ]);

      expect(items[1]).toBeUndefined();

      set('[1]', 2);
      expect(items[1]).toBe(2);
    });

    it('should handle array with null values', () => {
      const [items, set] = createStore<(number | null)[]>([1, null, 3]);

      expect(items[1]).toBeNull();

      set('[1]', 2);
      expect(items[1]).toBe(2);
    });
  });

  describe('array performance patterns', () => {
    it('should efficiently update large arrays with wildcard', () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => i);
      const [items, set] = createStore(largeArray);

      set('[*]', (v) => v * 2);

      expect(items[0]).toBe(0);
      expect(items[50]).toBe(100);
      expect(items[99]).toBe(198);
    });

    it('should handle array of many objects', () => {
      interface Item {
        id: number;
        active: boolean;
      }

      const manyItems: Item[] = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        active: false,
      }));

      const [items, set] = createStore(manyItems);

      set('[*].active', true);

      expect(items.every((item) => item.active)).toBe(true);
    });
  });
});

describe('a store under a watcher', () => {
  it('lets go of the nodes of what a write replaced, and keeps what moved', () => {
    const disposed: unknown[] = [];
    const seen = new Map<unknown, string | undefined>();
    const stop = observeReactiveNodes({
      created: (r) => seen.set(r.handle, r.name),
      disposed: (n) => disposed.push(n),
    });
    try {
      const first = { name: 'Bolt', qty: 2 };
      const [cart, setCart] = createStore({ items: [first] }, { name: 'cart' });
      // Reading is what makes the nodes.
      expect(cart.items.length).toBe(1);
      expect(cart.items[0]!.qty).toBe(2);

      const nodeFor = (label: string) => [...seen].find(([, name]) => name === label)?.[0];
      const oldArray = nodeFor('cart.items[length]');
      const itemQty = nodeFor('cart.items[0].qty');
      expect(oldArray).toBeDefined();
      expect(itemQty).toBeDefined();

      setCart('items', [first, { name: 'Widget', qty: 1 }]);

      // The array it replaced is gone; the item it still holds is not.
      expect(disposed).toContain(oldArray);
      expect(disposed).not.toContain(itemQty);
    } finally {
      stop();
    }
  });

  it('keeps one node per key when a write spreads the store back into itself', () => {
    const live = new Map<unknown, string | undefined>();
    const stop = observeReactiveNodes({
      created: (r) => live.set(r.handle, r.name),
      disposed: (n) => live.delete(n),
    });
    try {
      const [cart, setCart] = createStore(
        { items: [{ name: 'Bolt', qty: 2 }] },
        { name: 'cart' },
      );
      const total = createMemo(() => cart.items.reduce((sum, i) => sum + i.qty, 0), undefined, {
        name: 'total',
      });
      expect(total()).toBe(2);

      // `[...cart.items]` hands back the store's own proxies; storing those would track each
      // object a second time, through a proxy of a proxy.
      setCart({ items: [...cart.items, { name: 'Widget', qty: 1 }] });
      expect(total()).toBe(3);
      cart.items.map((i) => i.name);

      const names = [...live.values()];
      expect(names.filter((n) => n === undefined)).toEqual([]);
      expect(new Set(names).size).toBe(names.length);
    } finally {
      stop();
    }
  });

  it('keeps an item\'s signals attached to it when the list around it is replaced', () => {
    const parents = new Map<unknown, unknown>();
    const names = new Map<unknown, string | undefined>();
    const stop = observeReactiveNodes({
      created: (r) => {
        names.set(r.handle, r.name);
        parents.set(r.handle, r.origin);
      },
      moved: (node, origin, name) => {
        parents.set(node, origin);
        if (name) names.set(node, name);
      },
    });
    try {
      const first = { name: 'Bolt', qty: 2 };
      const [cart, setCart] = createStore({ items: [first] }, { name: 'cart' });
      expect(cart.items[0]!.name).toBe('Bolt');

      const nameNode = [...names].find(([, label]) => label === 'cart.items[0].name')![0];
      const before = parents.get(nameNode);

      setCart({ items: [{ name: 'Widget', qty: 1 }, ...cart.items] });
      // Reading is what re-attaches it: the item is at a new index now.
      expect(cart.items[1]!.name).toBe('Bolt');

      expect(parents.get(nameNode)).not.toBe(before);
      expect(names.get(nameNode)).toBe('cart.items[1].name');
    } finally {
      stop();
    }
  });

  it('names a key signal for the object it belongs to', () => {
    const names: (string | undefined)[] = [];
    const stop = observeReactiveNodes({ created: (r) => names.push(r.name) });
    try {
      const [cart] = createStore({ items: [{ qty: 2 }] }, { name: 'cart' });
      void cart.items[0]!.qty;
      expect(names).toContain('cart.items');
      expect(names).toContain('cart.items[0]');
      expect(names).toContain('cart.items[0].qty');
    } finally {
      stop();
    }
  });
});
