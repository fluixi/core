import { describe, expect, it } from 'vitest';
import {
  omitPath,
  pickPath,
  omitBy,
  pickBy,
  omitNil,
  createOmitter,
  deepOmit,
  deepOmitBy,
} from './omit.js';

describe('Object Property Manipulation Utilities', () => {
  describe('omit', () => {
    it('should remove specified properties from an object', () => {
      const user = {
        id: 1,
        name: 'Alice',
        password: 'secret',
        email: 'alice@example.com',
      };
      const result = omitPath(user, ['password', 'email']);

      expect(result).toEqual({ id: 1, name: 'Alice' });
      expect(result).not.toBe(user); // Should create a new object
      expect('password' in result).toBe(false);
      expect('email' in result).toBe(false);
    });

    it('should handle empty arrays', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omitPath(obj, []);

      expect(result).toEqual(obj);
      expect(result).not.toBe(obj); // Should still create a new object
    });

    it('should handle non-object values', () => {
      expect(omitPath(null, ['a'] as any)).toEqual({});
      expect(omitPath(undefined, ['a'] as any)).toEqual({});
      expect(omitPath(42 as any, ['toString'])).toEqual({});
    });
  });

  describe('pick', () => {
    it('should select specified properties from an object', () => {
      const user = {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        role: 'admin',
      };
      const result = pickPath(user, ['id', 'name']);

      expect(result).toEqual({ id: 1, name: 'Alice' });
      expect(result).not.toBe(user);
      expect('email' in result).toBe(false);
      expect('role' in result).toBe(false);
    });

    it('should handle keys that do not exist', () => {
      const obj = { a: 1, b: 2 };
      const result = pickPath(obj, ['a', 'c' as any]);

      expect(result).toEqual({ a: 1 });
    });

    it('should handle non-object values', () => {
      expect(pickPath(null, ['a'] as any)).toEqual({});
      expect(pickPath(undefined, ['a'] as any)).toEqual({});
      expect(pickPath(42 as any, ['toString'])).toEqual({});
    });
  });

  describe('omitBy', () => {
    it('should remove properties matching a predicate', () => {
      const data = { a: 1, b: 'string', c: null, d: undefined, e: 0 };
      const result = omitBy(data, (value) => value == null);

      expect(result).toEqual({ a: 1, b: 'string', e: 0 });
    });

    it('should receive key and object in predicate', () => {
      const data = { a: 1, b: 2, c: 3 };
      const result = omitBy(data, (value, key, obj) => {
        expect(obj).toBe(data);
        return key === 'b';
      });

      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe('pickBy', () => {
    it('should select properties matching a predicate', () => {
      const data = { a: 1, b: 2, c: 'string', d: true };
      const result = pickBy(data, (value) => typeof value === 'number');

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should receive key and object in predicate', () => {
      const data = { a: 1, b: 2, c: 3 };
      const result = pickBy(data, (value, key, obj) => {
        expect(obj).toBe(data);
        return key !== 'b';
      });

      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe('omitNil', () => {
    it('should remove null and undefined values', () => {
      const data = {
        a: 1,
        b: 'string',
        c: null,
        d: undefined,
        e: false,
        f: 0,
        g: '',
      };

      const result = omitNil(data);

      expect(result).toEqual({
        a: 1,
        b: 'string',
        e: false,
        f: 0,
        g: '',
      });

      expect('c' in result).toBe(false);
      expect('d' in result).toBe(false);
    });
  });

  describe('createOmitter', () => {
    it('should create a reusable omitter function', () => {
      const removeSensitiveData = createOmitter([
        'password',
        'ssn',
        'creditCard',
      ]);

      const user1 = {
        id: 1,
        name: 'Alice',
        password: 'secret',
        ssn: '123-45-6789',
      };
      const user2 = {
        id: 2,
        name: 'Bob',
        password: 'p@ssword',
        creditCard: '4111-1111-1111-1111',
      };

      expect(removeSensitiveData(user1)).toEqual({ id: 1, name: 'Alice' });
      expect(removeSensitiveData(user2)).toEqual({ id: 2, name: 'Bob' });
    });
  });

  describe('deepOmit', () => {
    it('should recursively omit properties at any level', () => {
      const user = {
        id: 1,
        name: 'Alice',
        password: 'secret',
        profile: {
          email: 'alice@example.com',
          password: 'another-secret',
          settings: {
            theme: 'dark',
            token: 'abc123',
            password: 'yet-another-secret',
          },
        },
        history: [
          { action: 'login', password: 'old-password' },
          { action: 'update', password: 'new-password' },
        ],
      };

      const result = deepOmit(user, ['password', 'token']);

      expect(result.password).toBeUndefined();
      expect(result.profile.password).toBeUndefined();
      expect(result.profile.settings.password).toBeUndefined();
      expect(result.profile.settings.token).toBeUndefined();
      expect(result.history[0].password).toBeUndefined();
      expect(result.history[1].password).toBeUndefined();

      expect(result.id).toBe(1);
      expect(result.name).toBe('Alice');
      expect(result.profile.email).toBe('alice@example.com');
      expect(result.profile.settings.theme).toBe('dark');
    });

    it('should handle non-object values', () => {
      expect(deepOmit(null, ['a'])).toBeNull();
      expect(deepOmit(undefined, ['a'])).toBeUndefined();
      expect(deepOmit(42, ['a'])).toBe(42);
      expect(deepOmit('string', ['a'])).toBe('string');
    });
  });

  describe('deepOmitBy', () => {
    it('should recursively omit properties matching a predicate', () => {
      const data = {
        id: 1,
        private: true,
        name: 'Alice',
        settings: {
          theme: 'dark',
          private: true,
          token: 'abc123',
        },
        posts: [
          { id: 101, content: 'Hello', private: true },
          { id: 102, content: 'World', private: false },
        ],
      };

      const result = deepOmitBy(
        data,
        (value, key) => key === 'private' || key === 'token'
      );

      expect(result.private).toBeUndefined();
      expect(result.settings.private).toBeUndefined();
      expect(result.settings.token).toBeUndefined();
      expect(result.posts[0].private).toBeUndefined();
      expect(result.posts[1].private).toBeUndefined();

      expect(result.id).toBe(1);
      expect(result.name).toBe('Alice');
      expect(result.posts[0].content).toBe('Hello');
    });
  });

  describe('omit', () => {
    it('should omit a property at a specific path', () => {
      const user = {
        id: 1,
        name: 'Alice',
        profile: {
          email: 'alice@example.com',
          password: 'secret',
        },
      };

      const result = omitPath(user, 'profile.password');

      expect(result).toEqual({
        id: 1,
        name: 'Alice',
        profile: {
          email: 'alice@example.com',
        },
      });
    });

    it('should handle array paths with wildcards', () => {
      const data = {
        users: [
          { id: 1, name: 'Alice', password: 'secret1' },
          { id: 2, name: 'Bob', password: 'secret2' },
        ],
      };

      const result = omitPath(data, 'users[*].password');

      expect(result.users[0].password).toBeUndefined();
      expect(result.users[1].password).toBeUndefined();
      expect(result.users[0].id).toBe(1);
      expect(result.users[0].name).toBe('Alice');
    });

    it('should handle multiple paths', () => {
      const user = {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        profile: {
          password: 'secret',
          token: 'abc123',
        },
      };

      const result = omitPath(user, [
        'email',
        'profile.password',
        'profile.token',
      ]);

      expect(result).toEqual({
        id: 1,
        name: 'Alice',
        profile: {},
      });
    });

    it('should support transformation function', () => {
      const user = {
        id: 1,
        name: 'alice smith',
        email: 'alice@example.com',
        role: 'user',
      };

      const result = omitPath(user, ['name', 'email'], (value, path) => {
        if (path === 'name') {
          return value.toUpperCase(); // Transform
        }
        if (path === 'email') {
          return true; // Remove
        }
        return false; // Keep as is
      });

      expect(result).toEqual({
        id: 1,
        name: 'ALICE SMITH',
        role: 'user',
      });
      expect(result.email).toBeUndefined();
    });
  });

  describe('pick', () => {
    it('should pick a property at a specific path', () => {
      const user = {
        id: 1,
        name: 'Alice',
        profile: {
          email: 'alice@example.com',
          password: 'secret',
        },
        posts: [
          { id: 101, title: 'Hello' },
          { id: 102, title: 'World' },
        ],
      };

      const result = pickPath(user, 'profile.email');

      expect(result).toEqual({
        profile: {
          email: 'alice@example.com',
        },
      });
    });

    it('should handle array paths with wildcards', () => {
      const data = {
        users: [
          { id: 1, name: 'Alice', email: 'alice@example.com' },
          { id: 2, name: 'Bob', email: 'bob@example.com' },
        ],
      };

      const result = pickPath(data, 'users[*].name');

      expect(result).toEqual({
        users: [{ name: 'Alice' }, { name: 'Bob' }],
      });
    });

    it('should handle multiple paths', () => {
      const user = {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        profile: {
          age: 30,
          location: 'New York',
        },
      };

      const result = pickPath(user, ['id', 'name', 'profile.location']);

      expect(result).toEqual({
        id: 1,
        name: 'Alice',
        profile: {
          location: 'New York',
        },
      });
    });

    it('should support transformation function', () => {
      const user = {
        id: 1,
        name: 'alice smith',
        email: 'alice@example.com',
        profile: {
          age: 30,
        },
      };

      const result = pickPath(
        user,
        ['name', 'email', 'profile.age'],
        (value, path) => {
          if (typeof value === 'string') {
            return value.toUpperCase();
          }
          if (typeof value === 'number') {
            return value + 5;
          }
          return value;
        }
      );

      expect(result).toEqual({
        name: 'ALICE SMITH',
        email: 'ALICE@EXAMPLE.COM',
        profile: {
          age: 35,
        },
      });
    });
  });
});
