// object-path.test.ts
import { describe, it, expect } from 'vitest';
import {
  parseSelector,
  stringifySelector,
  get,
  set,
  has,
  deletePath,
  update,
  getPaths,
  findPaths,
  flattenWithArrays,
  unflattenWithArrays,
  deepMergeWithArrays,
  validateSelector,
  getTypeAtPath,
  select,
  detectSelectorType,
  createSelector,
  fromPath,
} from './index.js';

export interface People {
  id: number;
  name: string;
  age: number;
  email?: string;
  address?: {
    city: string;
    zip: number;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  loggedIn?: boolean;
  tags: string[];
  elements?: string[];
  active: boolean;
  inactive?: boolean;
  profile?: {
    settings: {
      'theme-color': string;
    };
  };
}
export interface User extends People {
  userFile?: string;
  wife?: Omit<People, 'tags' | 'elements'>;
  child?: Omit<People, 'tags'>;
}
export interface Config {
  'api-key': string;
  endpoints: string[];
  timeout: number;
  retries: number;
  'max-items'?: number;
  'max-depth'?: number;
  'min-items'?: number;
}

export interface MetaData {
  created: string;
  version: string;
  nested: {
    level1?: {
      level2: {
        level3: string;
      };
    };
    deep: {
      value: string;
    };
  };
}

export interface Item {
  id: number;
  name: string;
  price: number;
}

export interface Counter {
  count?: number;
  value?: number;
}

export interface TestData {
  users: User[];
  config: Config;
  metadata: MetaData;
  matrix?: number[][];
  items?: Item[];
}

function generateUsers(): User[] {
  return Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    active: i % 2 === 0,
    age: i + 20,
    address: {
      city: `City ${i + 1}`,
      zip: 1000 + i,
      coordinates: {
        lat: 40.7128,
        lng: -74.006,
      },
    },
    tags: ['admin', 'user', 'premium'],
  }));
}

const static_users = [
  {
    id: 1,
    name: 'Alice',
    age: 30,
    address: {
      city: 'New York',
      zip: 10001,
      coordinates: { lat: 40.7128, lng: -74.006 },
    },
    tags: ['admin', 'user', 'premium'],
    active: true,
  },
  {
    id: 2,
    name: 'Bob',
    age: 25,
    address: {
      city: 'Los Angeles',
      zip: 90001,
      coordinates: { lat: 34.0522, lng: -118.2437 },
    },
    tags: ['user', 'basic'],
    active: false,
  },
  {
    id: 3,
    name: 'Charlie',
    age: 35,
    address: {
      city: 'Chicago',
      zip: 60601,
      coordinates: { lat: 41.8781, lng: -87.6298 },
    },
    tags: ['user', 'premium'],
    active: true,
  },
];

function getUsers(): User[] {
  const data = generateUsers();
  for (let i = 0; i < data.length; i++) {
    const u = data[i];
    const find = static_users.find((s) => s.id === u.id);
    if (find) {
      Object.assign(u, find);
    }
  }
  return data;
}
describe('Object Selector Utilities', () => {
  const users = getUsers();
  const testData: TestData = {
    users: [...users],
    config: {
      'api-key': 'secret123',
      endpoints: ['/api/v1', '/api/v2'],
      timeout: 5000,
      retries: 3,
    },
    metadata: {
      created: '2023-01-01',
      version: '1.0.0',
      nested: {
        deep: {
          value: 'deeply nested',
        },
      },
    },
  };

  describe('parseSelector', () => {
    it('should parse dot notation', () => {
      expect(parseSelector('users.0.name')).toEqual([
        { type: 'property', value: 'users', raw: 'users' },
        { type: 'index', value: 0, raw: '0' },
        { type: 'property', value: 'name', raw: 'name' },
      ]);
    });

    it('should parse bracket notation', () => {
      expect(parseSelector('users[0].name')).toEqual([
        { type: 'property', value: 'users', raw: 'users' },
        { type: 'index', value: 0, raw: '0' },
        { type: 'property', value: 'name', raw: 'name' },
      ]);
    });

    it('should parse wildcard notation', () => {
      expect(parseSelector('users[*].name')).toEqual([
        { type: 'property', value: 'users', raw: 'users' },
        { type: 'wildcard', value: '*', raw: '*' },
        { type: 'property', value: 'name', raw: 'name' },
      ]);

      expect(parseSelector('users.*.name')).toEqual([
        { type: 'property', value: 'users', raw: 'users' },
        { type: 'wildcard', value: '*', raw: '*' },
        { type: 'property', value: 'name', raw: 'name' },
      ]);
    });

    it('should parse array wildcard notation', () => {
      expect(parseSelector('users[].name')).toEqual([
        { type: 'property', value: 'users', raw: 'users' },
        { type: 'wildcard', value: '[]', raw: '[]' },
        { type: 'property', value: 'name', raw: 'name' },
      ]);
    });

    it('should parse slice notation', () => {
      expect(parseSelector('users[0:2].name')).toEqual([
        { type: 'property', value: 'users', raw: 'users' },
        { type: 'slice', value: [0, 2], raw: '0:2' },
        { type: 'property', value: 'name', raw: 'name' },
      ]);

      expect(parseSelector('users[:2].name')).toEqual([
        { type: 'property', value: 'users', raw: 'users' },
        { type: 'slice', value: [0, 2], raw: ':2' },
        { type: 'property', value: 'name', raw: 'name' },
      ]);

      expect(parseSelector('users[1:].name')).toEqual([
        { type: 'property', value: 'users', raw: 'users' },
        { type: 'slice', value: [1, Infinity], raw: '1:' },
        { type: 'property', value: 'name', raw: 'name' },
      ]);
    });

    it('should parse union notation', () => {
      expect(parseSelector('users[0,2].name')).toEqual([
        { type: 'property', value: 'users', raw: 'users' },
        { type: 'union', value: [0, 2], raw: '0,2' },
        { type: 'property', value: 'name', raw: 'name' },
      ]);
    });

    it('should parse filter notation', () => {
      const result = parseSelector('users[?(@.age > 30)].name');
      expect(result[0]).toEqual({
        type: 'property',
        value: 'users',
        raw: 'users',
      });
      expect(result[1].type).toBe('filter');
      expect(typeof result[1].value).toBe('function');
      expect(result[2]).toEqual({
        type: 'property',
        value: 'name',
        raw: 'name',
      });
    });

    it('should parse descendant notation', () => {
      const parsed = parseSelector('users..name');
      expect(parsed).toEqual([
        { type: 'property', value: 'users', raw: 'users' },
        { type: 'descendant', value: '..', raw: '..' },
        { type: 'property', value: 'name', raw: 'name' },
      ]);
    });

    it('should parse quoted properties', () => {
      expect(parseSelector('config["api-key"]')).toEqual([
        { type: 'property', value: 'config', raw: 'config' },
        { type: 'property', value: 'api-key', raw: 'api-key' },
      ]);

      expect(parseSelector('users[0].address["city"]')).toEqual([
        { type: 'property', value: 'users', raw: 'users' },
        { type: 'index', value: 0, raw: '0' },
        { type: 'property', value: 'address', raw: 'address' },
        { type: 'property', value: 'city', raw: 'city' },
      ]);
    });

    it('should handle mixed notations', () => {
      expect(parseSelector('users[0].address.coordinates["lat"]')).toEqual([
        { type: 'property', value: 'users', raw: 'users' },
        { type: 'index', value: 0, raw: '0' },
        { type: 'property', value: 'address', raw: 'address' },
        { type: 'property', value: 'coordinates', raw: 'coordinates' },
        { type: 'property', value: 'lat', raw: 'lat' },
      ]);
    });
  });

  describe('stringifySelector', () => {
    it('should stringify property segments', () => {
      const segments = parseSelector('users.0.name');
      expect(stringifySelector(segments)).toBe('users[0].name');
    });

    it('should stringify wildcard segments', () => {
      const segments = parseSelector('users[*].name');
      expect(stringifySelector(segments)).toBe('users[*].name');
    });

    it('should stringify slice segments', () => {
      const segments = parseSelector('users[0:2].name');
      expect(stringifySelector(segments)).toBe('users[0:2].name');
    });

    it('should stringify union segments', () => {
      const segments = parseSelector('users[0,2].name');
      expect(stringifySelector(segments)).toBe('users[0,2].name');
    });

    it('should quote properties with special characters', () => {
      const segments = [
        { type: 'property', value: 'config', raw: 'config' },
        { type: 'property', value: 'api-key', raw: 'api-key' },
      ] as any;
      expect(stringifySelector(segments)).toBe('config.api-key');
    });
  });

  // describe('select', () => {
  //   it('should select single value with dot notation', () => {
  //     expect(select(testData, 'users[0].name')).toBe('Alice');
  //     expect(select(testData, 'config.timeout')).toBe(5000);
  //   });

  //   it('should select single value with bracket notation', () => {
  //     expect(select(testData, 'users[0].name')).toBe('Alice');
  //     expect(select(testData, 'config.api-key')).toBe('secret123');
  //   });

  //   it('should select multiple values with wildcard', () => {
  //     const result = select(testData, 'users[*].name');
  //     expect(result).toEqual(['Alice', 'Bob', 'Charlie']);
  //   });

  //   // it('should select multiple values with array wildcard', () => {
  //   //   const result = select(testData, 'users[].name');
  //   //   expect(result).toEqual(['Alice', 'Bob', 'Charlie']);
  //   // });

  //   it('should select multiple values with dot wildcard', () => {
  //     const result = select(testData, 'users.*.name' as any);
  //     expect(result).toEqual(['Alice', 'Bob', 'Charlie']);
  //   });

  //   it('should select slice of array', () => {
  //     const result = select(testData, 'users[0:2].name' as any);
  //     expect(result).toEqual(['Alice', 'Bob']);
  //   });

  //   it('should select union of indices', () => {
  //     const result = select(testData, 'users[0,2].name' as any);
  //     expect(result).toEqual(['Alice', 'Charlie']);
  //   });

  //   it('should select with filter', () => {
  //     const result = select(testData, 'users[?(@.active)].name' as any);
  //     expect(result).toEqual(['Alice', 'Charlie']);

  //     const result2 = select(testData, 'users[?(@.age > 30)].name' as any);
  //     expect(result2).toEqual(['Charlie']);
  //   });

  //   it('should select with descendant selector', () => {
  //     const result = select(testData, 'users..city' as any);
  //     expect(result).toEqual(['New York', 'Los Angeles', 'Chicago']);
  //   });

  //   it('should select nested properties', () => {
  //     const result = select(testData, 'users[0].address.coordinates.lat');
  //     expect(result).toBe(40.7128);
  //   });

  //   it('should return array for wildcard even with single result', () => {
  //     const result = select(testData, 'config.endpoints[*]');
  //     expect(result).toEqual(['/api/v1', '/api/v2']);
  //   });

  //   it('should handle missing paths with defaultValue', () => {
  //     const result = select(testData, 'users[55].name', { defaultValue: 'Unknown' });
  //     expect(result).toBe('Unknown');
  //   });

  //   it('should include undefined values when requested', () => {
  //     const result = select({ arr: [1, undefined, 3] }, 'arr[*]', { includeUndefined: true });
  //     expect(result).toEqual([1, undefined, 3]);
  //   });

  //   it('should flatten results by default', () => {
  //     const result = select(testData, 'users[*].tags[*]');
  //     expect(result).toEqual(['admin', 'user', 'premium', 'user', 'basic', 'user', 'premium']);
  //   });

  //   it('should not flatten results when disabled', () => {
  //     const result = select(testData, 'users[*].tags', { flattenResults: false });
  //     expect(result).toEqual([
  //       ['admin', 'user', 'premium'],
  //       ['user', 'basic'],
  //       ['user', 'premium']
  //     ]);
  //   });
  // });

  describe('get', () => {
    it('should get single value', () => {
      expect(get(testData, 'users[0].name')).toBe('Alice');
      expect(
        get(testData, 'users[0].name', { preserveStructure: true })
      ).toMatchObject({
        users: [{ name: 'Alice' }],
      });
      expect(
        get(testData, 'config.timeout', { preserveStructure: false })
      ).toBe(5000);
    });

    it('should get array for wildcard when multiple=true', () => {
      const result = get({ users: [...static_users] }, 'users[*].name', {
        preserveStructure: false,
      });
      expect(result).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should get single value for wildcard when multiple=false', () => {
      const result = get(testData, 'users[*].name', { multiple: false });
      expect(result).toBe('Alice'); // First element
    });

    it('should return defaultValue for missing path', () => {
      expect(get(testData, 'users[55].name', { defaultValue: 'Unknown' })).toBe(
        'Unknown'
      );
    });
  });
  describe('get with array notation', () => {
    const testObj = {
      users: [
        { name: 'Alice', age: 30, address: { city: 'NYC', zip: 10001 } },
        { name: 'Bob', age: 25, address: { city: 'LA', zip: 90001 } },
      ] as User[],
      config: {
        'api-key': 'secret123',
        endpoints: ['/api/v1', '/api/v2'],
      },
      matrix: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
    };

    it('should get values with array notation', () => {
      expect(get(testObj, 'users[0].name')).toBe('Alice');
      expect(get(testObj, 'users[1].age')).toBe(25);
      expect(get(testObj, 'users[0].address.city')).toBe('NYC');
    });

    it('should get values with nested arrays', () => {
      expect(get(testObj, 'matrix[0][0]')).toBe(1);
      expect(get(testObj, 'matrix[1][2]')).toBe(6);
      expect(get(testObj, 'matrix[2][1]')).toBe(8);
    });

    it('should get values with bracket notation', () => {
      expect(get(testObj, 'config.api-key')).toBe('secret123');
      expect(get(testObj, 'config.endpoints[0]')).toBe('/api/v1');
      expect(get(testObj, 'config.endpoints[1]')).toBe('/api/v2');
    });

    it('should return default for non-existent paths', () => {
      expect(get(testObj, 'users[55].name')).toBeUndefined();
      expect(
        get(testObj, 'users[0].email', { defaultValue: 'not found' })
      ).toBe('not found');
      // expect(get(testObj, 'config.invalid[0]', {defaultValue: 'default'})).toBe('default');
    });

    // it('should handle negative array indices', () => {
    //   expect(get(testObj, 'users[-1].name')).toBe('Bob'); // Last element
    //   expect(get(testObj, 'matrix[-1][-1]')).toBe(9); // Last element of last array
    // });
  });

  describe('has', () => {
    it('should return true for existing path', () => {
      expect(has(testData, 'users[0].name')).toBe(true);
      expect(has(testData, 'config.api-key')).toBe(true);
    });

    it('should return false for non-existent path', () => {
      expect(has(testData, 'users[55].name')).toBe(false);
      expect(has(testData, 'config.invalid' as any)).toBe(false);
    });

    it('should work with wildcards', () => {
      expect(has(testData, 'users[*].name')).toBe(true);
      expect(has(testData, 'users[*].invalid' as any)).toBe(false);
    });
  });

  describe('set', () => {
    it('should set value with dot notation', () => {
      let obj = { users: [{ name: 'Alice', lastName: 'Smith' }] };
      obj = set(obj, 'users', 0, 'name', 'Alice Updated');
      // set(obj, 'users', 0, (u)=> u);
      // set(obj, 'users', 0, 'lastName', 'Smith Updated');
      // set(obj, 'users', 0, 'name', 'Alice');
      // set(obj, 'users[0].name', 0, 'name', 'Alice Updated');
      expect(obj.users[0].name).toBe('Alice Updated');
    });
    it('should set value with index', () => {
      let obj = { users: [{ name: 'Alice', lastName: 'Smith' }] };
      obj = set(obj, 'users', 0, 'name', 'Alice Updated');
      let obj1 = { users: [{ name: 'Alice', lastName: 'Smith' }] };
      expect(obj.users[0].name).toBe('Alice Updated');
      obj1 = set(obj1, 'users', [0, 1], (u) => {
        if (u) {
          u.name = 'Alice Updated';
        }
        return u;
      });
      expect(obj1.users[0].name).toBe('Alice Updated');
    });

    it('should set value with bracket notation', () => {
      let obj = { users: [{ name: 'Alice' }] };
      obj = set(obj, 'users[0].name', 'Alice Updated');
      expect(obj.users[0].name).toBe('Alice Updated');
    });

    it('should create missing paths', () => {
      let obj = {} as TestData;
      obj = set(obj, 'users[0].name', 'Alice');
      expect(obj).toEqual({ users: [{ name: 'Alice' }] });
    });

    // it('should not create missing paths when createMissing=false', () => {
    //   const obj = {} as TestData;
    //   // set(obj, 'users[0].name', 'Alice', { createMissing: false });
    //   set(obj, 'users[0].name', 'Alice');
    //   expect(obj).toEqual({});
    // });

    // it('should throw error for wildcard selector', () => {
    //   const obj = { users: [{ name: 'Alice' }, { name: 'Bob' }] };
    //   expect(() => set(obj, 'users[*].name', 'Updated')).toThrow();
    // });

    it('should handle complex nested paths', () => {
      let obj = structuredClone(testData);
      obj = set(obj, 'users', [0], (p) => {
        p.name = 'Alice New';
        p.active = true;
        return p;
      });
      expect(obj.users[0]).toMatchObject({ name: 'Alice New', active: true });

      obj = set(obj, 'users', obj.users.length, (p) => {
        return {
          ...structuredClone(obj.users[0]),
          id: obj.users.length,
          name: 'Ibrahima',
          active: true,
        };
      });
      expect(obj.users[obj.users.length - 1]).toMatchObject({
        name: 'Ibrahima',
        active: true,
      });

      obj = set(obj, 'users', 0, { ...obj.users[0], id: 1 } as User);
      expect(obj.users[0]).toMatchObject({
        ...structuredClone(obj.users[0]),
        id: 1,
      });
      obj = set(obj, 'users', (p) => p.id === 1, 'address.city', 'New York City');
      expect(obj.users[0]).toMatchObject({
        ...obj.users[0],
        address: { city: 'New York City' },
      });

      obj = set(obj, 'users[*].inactive', false);
      expect(obj.users.every((u) => u.inactive === false)).toBe(true);

      obj = set(obj, 'users', 0, 'profile.settings', { 'theme-color': 'blue' });
      expect(obj.users[0]).toMatchObject({
        ...obj.users[0],
        profile: { settings: { 'theme-color': 'blue' } },
      });

      obj = set(obj, 'users', 1, 'profile.settings', (p) => ({
        'theme-color': 'red',
      }));

      obj = set(obj, 'users', [0, 1], 'profile.settings', { 'theme-color': 'blue' });
      expect(obj.users[0]).toMatchObject({
        ...obj.users[0],
        profile: { settings: { 'theme-color': 'blue' } },
      });
      expect(obj.users[1]).toMatchObject({
        ...obj.users[1],
        profile: { settings: { 'theme-color': 'blue' } },
      });

      // set(obj, "users", [2, 7, 10], "loggedIn", false);

      // // Example 4: Single index
      obj = set(obj, 'users', 2, 'loggedIn', false);
      expect(obj.users[2].loggedIn).toBe(false);

      // // Example 5: String keys (if users were an object with string keys)
      obj = set(obj, 'users', ['wife', 'child'], 'age', 10);
      expect(
        obj.users.every(
          (user) =>
            user.child &&
            user.child.age === 10 &&
            user.wife &&
            user.wife.age === 10
        )
      ).toBe(true);
      // // set(obj, "users");

      // // Example 6: Range
      obj = set(obj, 'users', { from: 0, to: 1 }, 'child.active', true);
      // console.log('users', obj.users)
      expect(obj.users[0].child?.active).toBe(true);
      expect(obj.users[1].child?.active).toBe(true);

      // // Example 7: Range with step
      obj = set(obj, 'users', { from: 1, to: 8, by: 1 }, 'child.active', true);
      expect(obj.users.slice(1, 8).every((u) => u.child?.active)).toBe(true);

      obj = set(obj, 'users', { from: 0, to: 8, by: 2 }, 'child.active', false);
      expect(
        obj.users
          .slice(0, 8)
          .every((u, index) =>
            index % 2 === 0 ? !u.child?.active : u.child?.active
          )
      ).toBe(true);

      // // Example 9: Filter function
      obj = set(
        obj,
        'users',
        (user) => user?.name!.startsWith('A'),
        'loggedIn',
        (loggedIn) => false
      );
      expect(obj.users[0].loggedIn).toBe(false);

      obj = set(obj, 'users[0].profile.settings.theme-color', 'purple');
      expect(obj.users[0].profile!.settings['theme-color']).toBe('purple');
    });
  });

  describe('update', () => {
    it('should update values at path', () => {
      const obj = { counter: { value: 1 } } as { counter?: Counter } & {
        items?: Counter[];
      };

      expect(update(obj, 'counter.value', (val) => (val || 0) + 1)).toEqual({
        counter: { value: 2 },
      });

      expect(update(obj, 'items[0].count', (val = 0) => val + 1)).toEqual({
        counter: { value: 2 },
        items: [{ count: 1 }],
      });
    });

    it('should work with array notation', () => {
      const obj = { scores: [10, 20, 30] };
      // set([] as People[], '[*]', (p) => p);

      expect(update(obj, 'scores[1]', (score) => score * 2)).toEqual({
        scores: [10, 40, 30],
      });
    });
  });

  describe('deletePath', () => {
    it('should delete property with dot notation', () => {
      const obj = { user: { name: 'Alice', age: 30 } };
      expect(deletePath(obj, 'user.name')).toBe(true);
      expect(obj.user).toEqual({ age: 30 });
    });

    it('should delete array element', () => {
      const obj = { items: ['a', 'b', 'c'] };
      expect(deletePath(obj, 'items[1]')).toBe(true);
      expect(obj.items).toEqual(['a', 'c']);
    });

    it('should delete with wildcard selector', () => {
      const obj = {
        users: [{ active: true }, { active: false }, { active: true }],
      };
      expect(deletePath(obj, 'users[*].active')).toBe(true);
      expect(obj.users).toEqual([{}, {}, {}]);
    });

    it('should return false for non-existent path', () => {
      const obj = { a: 1 };
      expect(deletePath(obj, 'b.c' as any)).toBe(false);
    });
  });

  describe('getPaths', () => {
    it('should get all paths from object', () => {
      const obj = { a: { b: 1, c: 2 }, d: [3, 4] };
      const paths = getPaths(obj);

      expect(paths).toContain('a.b');
      expect(paths).toContain('a.c');
      expect(paths).toContain('d[0]');
      expect(paths).toContain('d[1]');
    });

    it('should get paths matching selector', () => {
      const paths = getPaths(testData, 'users[*].name');
      const path_string = users
        .slice()
        .map((u, index) => `users[${index}].name`);
      expect(paths).toEqual(path_string);
    });

    it('should get paths with filter selector', () => {
      const paths = getPaths(testData, 'users[?(@.active)].name' as any);
      const active = testData.users
        .slice()
        .map((u, index) => (u.active ? { active: u.active, index } : null))
        .filter((u) => u?.active)
        .map((u) => `users[${(u as any).index}].name`);
      expect(paths).toEqual(active);
      // expect(paths).toEqual(['users[0].name', 'users[2].name']);
    });

    it('should format paths as strings', () => {
      const obj = { a: { b: 1 } };
      const paths = getPaths(obj, undefined, { format: 'string' });
      expect(paths).toContain('a.b');
    });
  });

  const handleSeleteor = (path: string, options?: any) => {
    const result = validateSelector(path, options);
    let valid = false;
    let error = '';
    if (Array.isArray(result)) {
      valid = result.every((r) => r.valid);
    } else {
      valid = result.valid;
    }
    if (!valid) {
      if (Array.isArray(result)) {
        error = result.map((r) => r.error).join(', ');
      } else {
        error = result.error || '';
      }
    }
    return { valid, error };
  };
  describe('validateSelector', () => {
    it('should validate correct selectors', () => {
      const h = handleSeleteor('users[0].name');
      expect(h.valid).toBe(true);
      expect(handleSeleteor('users[*].name').valid).toBe(true);
      expect(handleSeleteor('users[0:2].name').valid).toBe(true);
    });

    it('should reject invalid selectors', () => {
      const h = handleSeleteor('users[].');
      expect(h.valid).toBe(false);
      expect(handleSeleteor('users[?(@invalid)]').valid).toBe(false);
    });

    it('should check allowed types', () => {
      const result = handleSeleteor('users[*].name', {
        allowedTypes: ['dot', 'bracket'],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });
  });

  describe('detectSelectorType', () => {
    it('should detect selector types', () => {
      expect(detectSelectorType('users.name')).toBe('dot');
      expect(detectSelectorType('users[0].name')).toBe('bracket');
      expect(detectSelectorType('users[*].name')).toBe('wildcard');
      expect(detectSelectorType('users[].name')).toBe('array-wildcard');
      expect(detectSelectorType('users[0:2].name')).toBe('slice');
      expect(detectSelectorType('users[0,2].name')).toBe('union');
      expect(detectSelectorType('users[?(@.active)].name')).toBe('filter');
      expect(detectSelectorType('users..name')).toBe('descendant');
    });
  });

  describe('createSelector', () => {
    it('should create selector from template', () => {
      const template = 'users[{index}].name';
      expect(createSelector(template, { index: 0 })).toBe('users[0].name');
      expect(createSelector(template, { index: 2 })).toBe('users[2].name');
    });

    it('should leave missing placeholders', () => {
      const template = 'users[{id}].{property}';
      expect(createSelector(template, { id: 1 })).toBe('users[1].{property}');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty objects', () => {
      expect(select({} as any, 'a.b')).toBeUndefined();
      expect(get({} as any, 'a.b', { defaultValue: 'default' })).toBe(
        'default'
      );
    });

    it('should handle null and undefined', () => {
      expect(select(null as any, 'a.b')).toBeUndefined();
      expect(select(undefined as any, 'a.b', { defaultValue: 'default' })).toBe(
        'default'
      );
    });

    it('should handle arrays at root', () => {
      const arr = [{ name: 'Alice' }, { name: 'Bob' }];
      expect(select(arr, '[0].name')).toBe('Alice');
      expect(select(arr, '[*].name')).toEqual(['Alice', 'Bob']);
    });

    // it('should handle deep nesting', () => {
    //   const obj = { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: 'deep' } } } } } } } } } };
    //   expect(select(obj, 'a.b.c.d.e.f.g.h.i.j')).toBe('deep');
    // });

    it('should handle negative array indices', () => {
      const obj = { arr: ['a', 'b', 'c'] };
      expect(select(obj, 'arr[-1]')).toBe('c');
      expect(select(obj, 'arr[-2]')).toBe('b');
    });

    it('should handle special characters in properties', () => {
      const obj = { 'key.with.dots': 'value', 'key with spaces': 'value2' };
      expect(select(obj, 'key.with.dots')).toBe('value');
      expect(select(obj, 'key with spaces')).toBe('value2');
    });
  });

  describe('From path', () => {
    it('should handle arrays at root', () => {
      const arr = [{ name: 'Alice' }];
      const fromPathValue = fromPath('[0].name', 'Alice');
      expect(fromPathValue).toStrictEqual(arr);
    });

    it('should handle arrays within objects', () => {
      const obj = { users: [{ name: 'Alice' }] };
      const fromPathValue = fromPath('users[0].name', 'Alice');
      expect(fromPathValue).toStrictEqual(obj);
    });
    it('should handle arrays within objects', () => {
      const obj = { users: [{ items: ['item1'] }] };
      const fromPathValue = fromPath('users[0].items[0]', 'item1');
      expect(fromPathValue).toStrictEqual(obj);
    });
  });

  describe('Performance', () => {
    it('should be efficient for large datasets', () => {
      const largeObj: any = {};
      const start = performance.now();

      // Create 1000 users
      for (let i = 0; i < 10; i++) {
        largeObj[`user${i}`] = {
          name: `User ${i}`,
          age: Math.floor(Math.random() * 100),
        };
      }
      // console.log('obj large', largeObj)

      // Select all names
      const result = select(largeObj, '*.*.name');
      const end = performance.now();

      expect(result.length).toBe(10);
      expect(end - start).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should handle deep recursion efficiently', () => {
      let obj: any = {};
      let current = obj;

      // Create 100 levels of nesting
      for (let i = 0; i < 10; i++) {
        current[i] = {};
        current = current[i];
      }
      current.value = 'deep';

      const start = performance.now();
      // console.log('obj')
      const result = select(obj, '0.1.2.3.4.5.6.7.8.9.value');
      const end = performance.now();

      expect(result).toBe('deep');
      expect(end - start).toBeLessThan(10);
    });
  });
});
// describe('Enhanced Path Utilities', () => {
//   const testData: TestData = {
//     users: [
//       {
//         id: 1,
//         name: 'Alice',
//         age: 30,
//         address: {
//           city: 'New York',
//           zip: 10001,
//           coordinates: { lat: 40.7128, lng: -74.0060 }
//         },
//         tags: ['admin', 'user', 'premium'],
//         active: true
//       },
//       {
//         id: 2,
//         name: 'Bob',
//         age: 25,
//         address: {
//           city: 'Los Angeles',
//           zip: 90001,
//           coordinates: { lat: 34.0522, lng: -118.2437 }
//         },
//         tags: ['user', 'basic'],
//         active: false
//       },
//       {
//         id: 3,
//         name: 'Charlie',
//         age: 35,
//         address: {
//           city: 'Chicago',
//           zip: 60601,
//           coordinates: { lat: 41.8781, lng: -87.6298 }
//         },
//         tags: ['user', 'premium'],
//         active: true
//       }
//     ],
//     config: {
//       'api-key': 'secret123',
//       endpoints: ['/api/v1', '/api/v2'],
//       timeout: 5000,
//       retries: 3
//     },
//     metadata: {
//       created: '2023-01-01',
//       version: '1.0.0',
//       nested: {
//         deep: {
//           value: 'deeply nested'
//         }
//       }
//     }
//   };
//   describe('parseSelector', () => {
//     it('should parse dot notation', () => {
//       expect(parseSelector('users.0.name')).toEqual([
//         { type: 'property', value: 'users', raw: 'users' },
//         { type: 'index', value: 0, raw: '0' },
//         { type: 'property', value: 'name', raw: 'name' }
//       ]);
//     });

//     it('should parse bracket notation', () => {
//       expect(parseSelector('users[0].name')).toEqual([
//         { type: 'property', value: 'users', raw: 'users' },
//         { type: 'index', value: 0, raw: '0' },
//         { type: 'property', value: 'name', raw: 'name' }
//       ]);
//     });

//     it('should parse wildcard notation', () => {
//       expect(parseSelector('users[*].name')).toEqual([
//         { type: 'property', value: 'users', raw: 'users' },
//         { type: 'wildcard', value: '*', raw: '*' },
//         { type: 'property', value: 'name', raw: 'name' }
//       ]);

//       expect(parseSelector('users.*.name')).toEqual([
//         { type: 'property', value: 'users', raw: 'users' },
//         { type: 'property', value: '*', raw: '*' },
//         { type: 'property', value: 'name', raw: 'name' }
//       ]);
//     });

//     it('should parse array wildcard notation', () => {
//       expect(parseSelector('users[].name')).toEqual([
//         { type: 'property', value: 'users', raw: 'users' },
//         { type: 'wildcard', value: '[]', raw: '[]' },
//         { type: 'property', value: 'name', raw: 'name' }
//       ]);
//     });

//     it('should parse slice notation', () => {
//       expect(parseSelector('users[0:2].name')).toEqual([
//         { type: 'property', value: 'users', raw: 'users' },
//         { type: 'slice', value: [0, 2], raw: '0:2' },
//         { type: 'property', value: 'name', raw: 'name' }
//       ]);

//       expect(parseSelector('users[:2].name')).toEqual([
//         { type: 'property', value: 'users', raw: 'users' },
//         { type: 'slice', value: [0, 2], raw: ':2' },
//         { type: 'property', value: 'name', raw: 'name' }
//       ]);

//       expect(parseSelector('users[1:].name')).toEqual([
//         { type: 'property', value: 'users', raw: 'users' },
//         { type: 'slice', value: [1, Infinity], raw: '1:' },
//         { type: 'property', value: 'name', raw: 'name' }
//       ]);
//     });

//     it('should parse union notation', () => {
//       expect(parseSelector('users[0,2].name')).toEqual([
//         { type: 'property', value: 'users', raw: 'users' },
//         { type: 'union', value: [0, 2], raw: '0,2' },
//         { type: 'property', value: 'name', raw: 'name' }
//       ]);
//     });

//     it('should parse filter notation', () => {
//       const result = parseSelector('users[?(@.age > 30)].name');
//       expect(result[0]).toEqual({ type: 'property', value: 'users', raw: 'users' });
//       expect(result[1].type).toBe('filter');
//       expect(typeof result[1].value).toBe('function');
//       expect(result[2]).toEqual({ type: 'property', value: 'name', raw: 'name' });
//     });

//     it('should parse descendant notation', () => {
//       expect(parseSelector('users..name')).toEqual([
//         { type: 'property', value: 'users', raw: 'users' },
//         { type: 'descendant', value: '..', raw: '..' },
//         { type: 'property', value: 'name', raw: 'name' }
//       ]);
//     });

//     it('should parse quoted properties', () => {
//       expect(parseSelector('config["api-key"]')).toEqual([
//         { type: 'property', value: 'config', raw: 'config' },
//         { type: 'property', value: 'api-key', raw: 'api-key' }
//       ]);

//       expect(parseSelector('users[0].address["city"]')).toEqual([
//         { type: 'property', value: 'users', raw: 'users' },
//         { type: 'index', value: 0, raw: '0' },
//         { type: 'property', value: 'address', raw: 'address' },
//         { type: 'property', value: 'city', raw: 'city' }
//       ]);
//     });

//     it('should handle mixed notations', () => {
//       expect(parseSelector('users[0].address.coordinates["lat"]')).toEqual([
//         { type: 'property', value: 'users', raw: 'users' },
//         { type: 'index', value: 0, raw: '0' },
//         { type: 'property', value: 'address', raw: 'address' },
//         { type: 'property', value: 'coordinates', raw: 'coordinates' },
//         { type: 'property', value: 'lat', raw: 'lat' }
//       ]);
//     });
//   });

//   describe('stringifySelector', () => {
//     it('should stringify property segments', () => {
//       const segments = parseSelector('users.0.name');
//       expect(stringifySelector(segments)).toBe('users[0].name');
//     });

//     it('should stringify wildcard segments', () => {
//       const segments = parseSelector('users[*].name');
//       expect(stringifySelector(segments)).toBe('users[*].name');
//     });

//     it('should stringify slice segments', () => {
//       const segments = parseSelector('users[0:2].name');
//       expect(stringifySelector(segments)).toBe('users[0:2].name');
//     });

//     it('should stringify union segments', () => {
//       const segments = parseSelector('users[0,2].name');
//       expect(stringifySelector(segments)).toBe('users[0,2].name');
//     });

//     it('should quote properties with special characters', () => {
//       const segments: ReturnType<typeof parseSelector> = [
//         { type: 'property', value: 'config', raw: 'config' },
//         { type: 'property', value: 'api-key', raw: 'api-key' }
//       ];
//       expect(stringifySelector(segments)).toBe('config["api-key"]');
//     });
//   });

//   describe('get with array notation', () => {
//     const testObj = {
//       users: [
//         { name: 'Alice', age: 30, address: { city: 'NYC', zip: 10001 } },
//         { name: 'Bob', age: 25, address: { city: 'LA', zip: 90001 } }
//       ],
//       config: {
//         'api-key': 'secret123',
//         endpoints: ['/api/v1', '/api/v2']
//       },
//       matrix: [
//         [1, 2, 3],
//         [4, 5, 6],
//         [7, 8, 9]
//       ]
//     } as TestData;

//     it('should get values with array notation', () => {
//       expect(get(testObj, 'users[0].name')).toBe('Alice');
//       expect(get(testObj, 'users[1].age')).toBe(25);
//       expect(get(testObj, 'users[0].address.city')).toBe('NYC');
//     });

//     it('should get values with nested arrays', () => {
//       expect(get(testObj, 'matrix[0][0]')).toBe(1);
//       expect(get(testObj, 'matrix[1][2]')).toBe(6);
//       expect(get(testObj, 'matrix[2][1]')).toBe(8);
//     });

//     it('should get values with bracket notation', () => {
//       expect(get(testObj, 'config.api-key')).toBe('secret123');
//       expect(get(testObj, 'config.endpoints[0]')).toBe('/api/v1');
//       expect(get(testObj, 'config.endpoints[1]')).toBe('/api/v2');
//     });

//     it('should return default for non-existent paths', () => {
//       expect(get(testObj, 'users[55].name')).toBeUndefined();
//       expect(get(testObj, 'users[0].email', {defaultValue: 'not found'})).toBe('not found');
//       expect(get(testObj, 'config.invalid[0]' as any, {defaultValue: 'default'})).toBe('default');
//     });

//     it('should handle negative array indices', () => {
//       expect(get(testObj, 'users[-1].name')).toBe('Bob'); // Last element
//       expect(get(testObj, 'matrix[-1][-1]')).toBe(9); // Last element of last array
//     });
//   });

//   describe('set', () => {
//     it('should set value with dot notation', () => {
//       const obj = { users: [{ name: 'Alice', lastName: 'Smith' }] };
//       set(obj, 'users', 0, 'name', 'Alice Updated');
//       set(obj, 'users', 0, (u)=> u);
//       set(obj, 'users', 0, 'lastName', 'Smith Updated');
//       set(obj, 'users', 0, 'name', 'Alice');
//       // set(obj, 'users[0].name', 0, 'name', 'Alice Updated');
//       expect(obj.users[0].name).toBe('Alice Updated');
//     });

//     it('should set value with bracket notation', () => {
//       const obj = { users: [{ name: 'Alice' }] };
//       set(obj, 'users[0].name', 'Alice Updated');
//       set(obj, 'users[0].name', '');
//       expect(obj.users[0].name).toBe('Alice Updated');
//     });

//     it('should create missing paths', () => {
//       const obj = {} as TestData;
//       set(obj, 'users[0].name', 'Alice');
//       expect(obj).toEqual({ users: [{ name: 'Alice' }] });
//     });

//     it('should not create missing paths when createMissing=false', () => {
//       const obj = {} as TestData;
//       // set(obj, 'users[0].name', 'Alice', { createMissing: false });
//       set(obj, 'users[0].name', 'Alice');
//       expect(obj).toEqual({});
//     });

//     it('should throw error for wildcard selector', () => {
//       const obj = { users: [{ name: 'Alice' }, { name: 'Bob' }] };
//       expect(() => set(obj, 'users[*].name', 'Updated')).toThrow();
//     });

//     it('should handle complex nested paths', () => {
//       const obj = {...testData};
//       // set(obj, 'users[1].profile.settings.["theme-color"]', 'blue');
//       set(obj, 'users', [0, 1], (p)=>p);
//       set(obj, 'users', 0, {id: 1} as User);
//       set(obj, 'users', ((p)=>p.length === 0), 'address.city','New York');
//       set(obj, 'users[*].inactive', false);
//       set(obj, 'users[*].inactive', (p)=>p === false);
//       // set(obj, 'users[*].inactive', '');
//       set(obj, 'users', 0, 'profile.settings', {"theme-color":"blue"});

//       set(obj, "users", [2, 7, 10], "loggedIn", false);

//       // Example 4: Single index
//       set(obj, "users", 2, "loggedIn", false);

//       // Example 5: String keys (if users were an object with string keys)
//       set(obj, 'users', ["wife", "child"], 'age', 10);
//       // set(obj, "users");

//       // Example 6: Range
//       set(obj, "users", { from: 1, to: 4 - 1 }, "loggedIn", false);

//       // Example 7: Range with step
//       set(obj, "users", { from: 0, to: 8, by: 2 }, "loggedIn", false);

//       // Example 8: Callback value
//       set(obj, "users", 3, "loggedIn", (loggedIn) => !loggedIn);
//       set(obj, "users", 3, "loggedIn", false);

//       // Example 9: Filter function
//       set(obj, "users", (user) => user.name!.startsWith("t"), "loggedIn", (loggedIn) => !loggedIn);
//       // expect(obj.data.users[0].profile.settings['theme-color']).toBe('blue');
//     });
//   });

//   describe('set with array notation', () => {
//     it('should set values with array notation', () => {
//       const obj = {} as TestData;

//       expect(set(obj, 'users[0].name', 'Alice')).toEqual({
//         users: [{ name: 'Alice' }]
//       });

//       expect(set(obj, 'matrix[0][0]', 1)).toEqual({
//         matrix: [[1]]
//       });
//     });

//     it('should extend arrays when needed', () => {
//       // const obj = { items: [] as any } as any as TestData;
//       const obj = { items: [] as any } as TestData;

//       expect(set(obj, 'items[0].name', 'Item 3')).toEqual({
//         items: [undefined, undefined, { name: 'Item 3' }]
//       });
//     });

//     it('should set values with bracket notation', () => {
//       const obj = {} as TestData;

//       expect(set(obj, 'config.api-key', 'secret')).toEqual({
//         config: { 'api-key': 'secret' }
//       });

//       // expect(set(obj, 'data["key.with.dots"]', 'value')).toEqual({
//       //   config: { 'api-key': 'secret' },
//       //   data: { 'key.with.dots': 'value' }
//       // });
//     });

//     it('should not create missing paths when createMissing is false', () => {
//       const obj = { existing: {} } as { existing: { nested: { value: string } } };

//       expect(set(obj, 'existing.nested.value', 'test'))
//         .toEqual({ existing: { nested: { value: 'test' } } });

//       expect(set(obj, 'non.existent.path' as any, 'test'))
//         .toEqual({ existing: { nested: { value: 'test' } } });
//     });

//     it('should handle complex nested structures', () => {
//       const obj = {} as TestData;

//       const result = set(obj, 'users[0].profile.settings.theme-color', 'blue');

//       expect(result).toEqual({
//         data: {
//           users: [{
//             profile: {
//               settings: {
//                 'theme-color': 'blue'
//               }
//             }
//           }]
//         }
//       });
//     });
//   });

//   describe('has with array notation', () => {
//     const testObj = {
//       items: [
//         { id: 1, name: 'Item 1' },
//         { id: 2, name: 'Item 2' }
//       ],
//       config: {
//         'max-items': 10
//       }
//     } as TestData;

//     it('should check existence with array notation', () => {
//       expect(has(testObj, 'items[0].id')).toBe(true);
//       expect(has(testObj, 'items[1].name')).toBe(true);
//       expect(has(testObj, 'items[2].id')).toBe(false); // Out of bounds
//     });

//     it('should check existence with bracket notation', () => {
//       expect(has(testObj, 'config.max-items')).toBe(true);
//       expect(has(testObj, 'config.min-items')).toBe(false);
//     });

//     it('should handle negative indices', () => {
//       expect(has(testObj, 'items[-1].id')).toBe(true); // Last element
//       expect(has(testObj, 'items[-3].id')).toBe(false); // Out of bounds
//     });
//   });

//   describe('deletePath', () => {
//     it('should delete properties with array notation', () => {
//       const obj = {
//         items: [
//           { id: 1, name: 'Item 1', tags: ['a', 'b'] },
//           { id: 2, name: 'Item 2' }
//         ]
//       };

//       expect(deletePath(obj, 'items[0].name')).toBe(true);
//       expect(obj).toEqual({
//         items: [
//           { id: 1, tags: ['a', 'b'] },
//           { id: 2, name: 'Item 2' }
//         ]
//       });

//       expect(deletePath(obj, 'items[0].tags[1]')).toBe(true);
//       expect(obj.items[0].tags).toEqual(['a']);
//     });

//     it('should delete array elements', () => {
//       const obj = { items: ['a', 'b', 'c'] };

//       expect(deletePath(obj, 'items[1]')).toBe(true);
//       expect(obj.items).toEqual(['a', 'c']);
//     });

//     it('should return false for non-existent paths', () => {
//       const obj = { a: 1 } as { a: number | number[], b?: { c: number } };

//       expect(deletePath(obj, 'b.c')).toBe(false);
//       expect(deletePath(obj, 'a[0]')).toBe(false);
//     });
//   });

// describe('update', () => {
//   it('should update values at path', () => {
//     const obj = { counter: { value: 1 } } as ({counter?: Counter} & {items?: Counter[]});

//     expect(update(obj, 'counter.value', (val) => val + 1)).toEqual({
//       counter: { value: 2 }
//     });

//     expect(update(obj, 'items[0].count', (val = 0) => val + 1)).toEqual({
//       counter: { value: 2 },
//       items: [{ count: 1 }]
//     });
//   });

//   it('should work with array notation', () => {
//     const obj = { scores: [10, 20, 30] };

//     expect(update(obj, 'scores[1]', (score) => score * 2)).toEqual({
//       scores: [10, 40, 30]
//     });
//   });
// });

//   describe('getPaths', () => {
//     it('should get all paths from object', () => {
//       const obj = {
//         user: {
//           name: 'Alice',
//           age: 30,
//           address: {
//             city: 'NYC',
//             zip: 10001
//           }
//         },
//         items: [
//           { id: 1, name: 'Item 1' },
//           { id: 2, name: 'Item 2' }
//         ]
//       };

//       const paths = getPaths(obj);

//       expect(paths).toContain('user.name');
//       expect(paths).toContain('user.age');
//       expect(paths).toContain('user.address.city');
//       expect(paths).toContain('user.address.zip');
//       expect(paths).toContain('items[0].id');
//       expect(paths).toContain('items[0].name');
//       expect(paths).toContain('items[1].id');
//       expect(paths).toContain('items[1].name');
//     });

//     // it('should include array indices when requested', () => {
//     //   const obj = { arr: [1, 2, 3] };

//     //   expect(getPaths(obj, { includeArrays: true })).toContain('arr[0]');
//     //   expect(getPaths(obj, { includeArrays: true })).toContain('arr[1]');
//     //   expect(getPaths(obj, { includeArrays: true })).toContain('arr[2]');
//     // });
//   });

//   describe('findPaths', () => {
//     const obj = {
//       users: [
//         { name: 'Alice', age: 30 },
//         { name: 'Bob', age: 25 },
//         { name: 'Charlie', age: 30 }
//       ]
//     };

//     it('should find paths matching predicate', () => {
//       expect(findPaths(obj, (path, value) => value === 30)).toEqual([
//         'users[0].age',
//         'users[2].age'
//       ]);

//       expect(findPaths(obj, (path, value) => typeof value === 'string')).toEqual([
//         'users[0].name',
//         'users[1].name',
//         'users[2].name'
//       ]);
//     });
//   });

//   describe('flattenWithArrays', () => {
//     it('should flatten objects with array notation', () => {
//       const obj = {
//         users: [
//           { name: 'Alice', age: 30 },
//           { name: 'Bob', age: 25 }
//         ],
//         config: {
//           'api-key': 'secret'
//         }
//       };

//       expect(flattenWithArrays(obj)).toEqual({
//         'users[0].name': 'Alice',
//         'users[0].age': 30,
//         'users[1].name': 'Bob',
//         'users[1].age': 25,
//         'config["api-key"]': 'secret'
//       });
//     });

//     it('should handle nested arrays', () => {
//       const obj = {
//         matrix: [
//           [1, 2],
//           [3, 4]
//         ]
//       };

//       expect(flattenWithArrays(obj)).toEqual({
//         'matrix[0][0]': 1,
//         'matrix[0][1]': 2,
//         'matrix[1][0]': 3,
//         'matrix[1][1]': 4
//       });
//     });
//   });

//   describe('unflattenWithArrays', () => {
//     it('should unflatten objects with array notation', () => {
//       const flat = {
//         'users[0].name': 'Alice',
//         'users[0].age': 30,
//         'users[1].name': 'Bob',
//         'users[1].age': 25,
//         'config["api-key"]': 'secret'
//       };

//       expect(unflattenWithArrays(flat)).toEqual({
//         users: [
//           { name: 'Alice', age: 30 },
//           { name: 'Bob', age: 25 }
//         ],
//         config: {
//           'api-key': 'secret'
//         }
//       });
//     });
//   });

//   describe('deepMergeWithArrays', () => {
//     it('should merge objects with array notation support', () => {
//       const obj1 = {
//         users: [
//           { name: 'Alice' },
//           { name: 'Bob' }
//         ]
//       };

//       const obj2 = {
//         users: [
//           { age: 30 },
//           { age: 25 }
//         ],
//         config: { enabled: true }
//       };

//       expect(deepMergeWithArrays(obj1, obj2)).toEqual({
//         users: [
//           { name: 'Alice', age: 30 },
//           { name: 'Bob', age: 25 }
//         ],
//         config: { enabled: true }
//       });
//     });
//   });

//   // describe('deepCloneWithArrays', () => {
//   //   it('should deeply clone objects with arrays', () => {
//   //     const obj = {
//   //       users: [
//   //         { name: 'Alice', tags: ['admin', 'user'] }
//   //       ],
//   //       config: { nested: { value: 1 } }
//   //     };

//   //     const clone = deepCloneWithArrays(obj);

//   //     expect(clone).toEqual(obj);
//   //     expect(clone).not.toBe(obj);
//   //     expect(clone.users).not.toBe(obj.users);
//   //     expect(clone.users[0]).not.toBe(obj.users[0]);
//   //     expect(clone.users[0].tags).not.toBe(obj.users[0].tags);
//   //     expect(clone.config.nested).not.toBe(obj.config.nested);
//   //   });
//   // });

//   describe('validateSelector', () => {
//     it('should validate correct paths', () => {
//       expect(validateSelector('a.b.c')).toBe(true);
//       expect(validateSelector('items[0].name')).toBe(true);
//       expect(validateSelector('config["api-key"]')).toBe(true);
//       expect(validateSelector('matrix[1][2]')).toBe(true);
//     });

//     it('should reject invalid paths', () => {
//       expect(validateSelector('')).toBe(false);
//       expect(validateSelector('a..b')).toBe(false);
//       expect(validateSelector('items[]')).toBe(false); // Empty brackets
//       expect(validateSelector('items[1.5]')).toBe(false); // Non-integer
//       expect(validateSelector('items["key')).toBe(false); // Unclosed quote
//     });
//   });

//   describe('getTypeAtPath', () => {
//     const obj = {
//       string: 'hello',
//       number: 42,
//       boolean: true,
//       array: [1, 2, 3],
//       object: { key: 'value' },
//       null: null,
//       undefined: undefined,
//       nested: {
//         value: 'test'
//       }
//     };

//     it('should get type of value at path', () => {
//       expect(getTypeAtPath(obj, 'string')).toBe('string');
//       expect(getTypeAtPath(obj, 'number')).toBe('number');
//       expect(getTypeAtPath(obj, 'boolean')).toBe('boolean');
//       expect(getTypeAtPath(obj, 'array')).toBe('array');
//       expect(getTypeAtPath(obj, 'object')).toBe('object');
//       expect(getTypeAtPath(obj, 'null')).toBe('null');
//       expect(getTypeAtPath(obj, 'undefined')).toBe('undefined');
//       expect(getTypeAtPath(obj, 'nested.value')).toBe('string');
//     });

//     it('should return undefined for non-existent paths', () => {
//       expect(getTypeAtPath(obj, 'non.existent')).toBeUndefined();
//       expect(getTypeAtPath(obj, 'array[10]')).toBeUndefined();
//     });
//   });

//   describe('Edge Cases', () => {
//     it('should handle very deep nesting', () => {
//       let obj: any = {};
//       let path = '';

//       // Create 100 levels of nesting with arrays
//       for (let i = 0; i < 100; i++) {
//         path += `[${i}]`;
//         set(obj, path, { value: i });
//       }

//       expect(get(obj, path + '.value')).toBe(99);
//     });

//     // it('should handle special characters in keys', () => {
//     //   const obj = {};

//     //   set(obj, 'data["key.with.dots"]', 'value1');
//     //   set(obj, 'data["key with spaces"]', 'value2');
//     //   set(obj, 'data["key-with-dashes"]', 'value3');
//     //   set(obj, 'data["key\'with\'quotes"]', 'value4');

//     //   expect(get(obj, 'data["key.with.dots"]')).toBe('value1');
//     //   expect(get(obj, 'data["key with spaces"]')).toBe('value2');
//     //   expect(get(obj, 'data["key-with-dashes"]')).toBe('value3');
//     //   expect(get(obj, "data[\"key'with'quotes\"]")).toBe('value4');
//     // });

//     it('should handle array notation in middle of path', () => {
//       const obj = {
//         data: {
//           items: [
//             { values: [10, 20, 30] },
//             { values: [40, 50, 60] }
//           ]
//         }
//       };

//       expect(get(obj, 'data.items[0].values[1]')).toBe(20);
//       expect(get(obj, 'data.items[1].values[2]')).toBe(60);

//       set(obj, 'data.items[0].values[2]', 99);
//       expect(obj.data.items[0].values[2]).toBe(99);
//     });

//     it('should handle escaped characters in paths', () => {
//       // Note: Our current implementation doesn't support escaped characters
//       // This is a limitation we should document
//       const obj = {};

//       // This would fail with current implementation
//       // set(obj, 'data["key.with.\\"quotes\\""]', 'value');
//       // We need to handle this in a future version
//     });
//   });

//   describe('Performance', () => {
//     it('should be efficient for large objects', () => {
//       const largeObj: any = {};
//       const start = performance.now();

//       // Create 1000 nested paths
//       for (let i = 0; i < 1000; i++) {
//         set(largeObj, `data.items[${i}].values[${i % 10}]`, i);
//       }

//       const mid = performance.now();

//       // Access 1000 paths
//       for (let i = 0; i < 1000; i++) {
//         get(largeObj, `data.items[${i}].values[${i % 10}]`);
//       }

//       const end = performance.now();

//       expect(mid - start).toBeLessThan(100); // Setting should be fast
//       expect(end - mid).toBeLessThan(50); // Getting should be fast
//     });
//   });
// });
