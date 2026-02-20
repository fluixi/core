---
sidebar_position: 5
---
# Object Property Manipulation Utilities

The Object Property Manipulation module provides utilities for selectively including or excluding properties from JavaScript objects. These utilities help with creating cleaner objects, removing sensitive data, and transforming object structures.

## Basic Property Operations

### `omit(obj, keys)`

Omits specified properties from an object.

Creates a new object without the specified keys. This is a shallow operation - nested objects are copied by reference.

#### Parameters

- `obj: T` - The source object
- `keys: K[]` - The keys to omit

#### Returns

`Omit<T, K>` - A new object without the omitted keys

#### Examples

```ts
const user = { id: 1, name: 'Alice', password: 'secret' };
const safeUser = omit(user, ['password']);
// { id: 1, name: 'Alice' }

const config = { server: 'localhost', port: 8080, timeout: 5000, retries: 3 };
const essentialConfig = omit(config, ['timeout', 'retries']);
// { server: 'localhost', port: 8080 }
```

### `pick(obj, keys)`

Extracts a subset of properties from an object.

Creates a new object with only the specified keys. This is the opposite of `omit` - instead of saying what to exclude, you specify what to include.

#### Parameters

- `obj: T` - The source object
- `keys: K[]` - The keys to include in the result

#### Returns

`Pick<T, K>` - A new object with only the picked keys

#### Examples

```ts
const user = { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' };

const credentials = pick(user, ['name', 'email']);
// { name: 'Alice', email: 'alice@example.com' }
```

## Predicate-Based Operations

### `omitBy(obj, predicate)`

Omits keys from an object based on a predicate function.

Creates a new object excluding properties for which the predicate returns true. The predicate is called with each property's value, key, and the original object.

#### Parameters

- `obj: T` - The source object
- `predicate: (value, key, obj) => boolean` - Function to test each property

#### Returns

`Partial<T>` - A new object with filtered properties

#### Examples

```ts
const data = { a: 1, b: null, c: 3, d: undefined, e: 5 };

// Remove null and undefined values
const cleaned = omitBy(data, value => value == null);
// { a: 1, c: 3, e: 5 }

const user = { name: 'Alice', admin: true, lastLogin: Date.now() };

// Remove boolean properties
const withoutBooleans = omitBy(user, value => typeof value === 'boolean');
// { name: 'Alice', lastLogin: 1636271340081 }
```

### `pickBy(obj, predicate)`

Extracts properties from an object based on a predicate function.

Creates a new object with only the properties for which the predicate returns true. The predicate is called with each property's value, key, and the original object.

#### Parameters

- `obj: T` - The source object
- `predicate: (value, key, obj) => boolean` - Function to test each property

#### Returns

`Partial<T>` - A new object with only the properties that pass the predicate

#### Examples

```ts
const data = { a: 1, b: 2, c: 3, d: 4, e: 5 };

// Keep only even numbers
const evens = pickBy(data, value => value % 2 === 0);
// { b: 2, d: 4 }

const user = { name: 'Alice', age: 30, admin: true, banned: false };

// Keep only boolean properties
const flags = pickBy(user, value => typeof value === 'boolean');
// { admin: true, banned: false }
```

## Convenience Functions

### `omitNil(obj)`

Removes null and undefined values from an object.

Creates a new object excluding properties that have null or undefined values. This is a common use case for cleaning up objects before serialization or API requests.

#### Parameters

- `obj: T` - The source object

#### Returns

`Partial<T>` - A new object without null or undefined properties

#### Examples

```ts
const data = {
  name: 'Alice',
  age: 30,
  address: null,
  phone: undefined,
  email: 'alice@example.com'
};

const cleaned = omitNil(data);
// { name: 'Alice', age: 30, email: 'alice@example.com' }
```

### `createOmitter(keys)`

Creates a function that omits specific properties from objects.

Returns a reusable function that will omit the specified keys from any object passed to it. This is useful when you need to omit the same keys from multiple objects.

#### Parameters

- `keys: K[]` - The keys to omit from objects

#### Returns

A function that omits the specified keys from objects

#### Examples

```ts
const removeSensitiveData = createOmitter(['password', 'ssn', 'creditCard']);

const user1 = { id: 1, name: 'Alice', password: 'secret', ssn: '123-45-6789' };
const user2 = { id: 2, name: 'Bob', password: 'p@ssword', creditCard: '4111-1111-1111-1111' };

const safeUser1 = removeSensitiveData(user1);
// { id: 1, name: 'Alice' }

const safeUser2 = removeSensitiveData(user2);
// { id: 2, name: 'Bob' }
```

## Deep Operations

### `deepOmit(obj, keys)`

Deeply omits specified properties at any level of an object or array.

Recursively removes the specified keys from an object and all nested objects. Creates a new deep copy of the object with the keys removed at every level.

#### Parameters

- `obj: T` - The source object or array
- `keys: string[]` - Keys to omit at any level

#### Returns

A new deep copy with the keys omitted at every level

#### Examples

```ts
const user = {
  id: 1,
  name: 'Alice',
  meta: {
    password: 'secret',
    tokens: {
      refresh: 'abc',
      password: '123'
    }
  }
};

const safeUser = deepOmit(user, ['password']);
// {
//   id: 1,
//   name: 'Alice',
//   meta: {
//     tokens: {
//       refresh: 'abc'
//     }
//   }
// }
```

### `deepOmitBy(obj, predicate)`

Deeply omits properties matching a predicate at all levels of an object.

Recursively traverses an object and omits properties for which the predicate returns true. This applies at every level of the object, not just the top level.

#### Parameters

- `obj: T` - The source object
- `predicate: (value, key, parent) => boolean` - Function to test each property

#### Returns

A new object with properties omitted at all levels

#### Examples

```ts
const data = {
  id: 1,
  name: 'Alice',
  password: 'secret',
  profile: {
    email: 'alice@example.com',
    password: 'another-secret',
    settings: {
      token: 'abc123',
      theme: 'dark'
    }
  },
  posts: [
    { id: 101, private: true, content: 'Hello' },
    { id: 102, private: false, content: 'World' }
  ]
};

// Omit all sensitive fields
const sanitized = deepOmitBy(data, (value, key) =>
  ['password', 'token', 'private'].includes(key)
);
// Result: Object with password, token and private fields removed at all levels
```

## Path-Based Operations

### `omitPath(obj, paths, transform?)`

Omits properties from an object based on path selectors with optional transformation.

Creates a new object excluding properties at the specified path(s). Supports advanced path selectors including property paths, array indices, wildcards, and filters. Optionally accepts a transformation function for more granular control.

#### Parameters

- `obj: T` - The source object
- `paths: string | string[]` - Path selector or array of path selectors to the properties to omit
- `transform?: (value, path, obj) => any | boolean` - Optional function to control or transform properties

#### Returns

A new object with properties omitted or transformed

#### Examples

```ts
const user = {
  id: 1,
  name: 'Alice',
  profile: {
    email: 'alice@example.com',
    password: 'secret',
    settings: {
      theme: 'dark',
      notifications: true
    }
  }
};

// Omit nested property
const safeUser = omitPath(user, 'profile.password');
// Result: user object without the password field

// Omit multiple paths
const publicUser = omitPath(user, ['profile.password', 'profile.email']);
// Result: user object without password and email fields

// Omit with wildcard
const data = {
  users: [
    { id: 1, name: 'Alice', password: 'secret1' },
    { id: 2, name: 'Bob', password: 'secret2' }
  ]
};
const safeData = omitPath(data, 'users[*].password');
// Result: data with password removed from all users

// With transformation function
const transformedUser = omitPath(user, 'profile.email', (value, path) => {
  // Return true to omit the property
  // Return false to keep the property intact
  // Return a value to transform the property
  if (path === 'profile.email') {
    return value.split('@')[0] + '@example.org'; // Transform email
  }
  return false; // Keep other properties
});
```

### `pickPath(obj, paths, transform?)`

Picks properties from an object based on path selectors with optional transformation.

Creates a new object with only the properties at the specified path(s). Supports advanced path selectors including property paths, array indices, wildcards, and filters. Optionally accepts a transformation function for more granular control.

#### Parameters

- `obj: T` - The source object
- `paths: string | string[]` - Path selector or array of path selectors to the properties to pick
- `transform?: (value, path, parent) => any` - Optional function to transform picked properties

#### Returns

A new object with only the properties at the specified path(s)

#### Examples

```ts
const user = {
  id: 1,
  name: 'Alice',
  profile: {
    email: 'alice@example.com',
    settings: {
      theme: 'dark',
      notifications: true
    }
  },
  posts: [
    { id: 101, title: 'Hello', content: 'World' },
    { id: 102, title: 'Foo', content: 'Bar' }
  ]
};

// Pick nested property
const userEmail = pickPath(user, 'profile.email');
// Result: { profile: { email: 'alice@example.com' } }

// Pick multiple paths
const basicInfo = pickPath(user, ['id', 'name', 'profile.email']);
// Result: { id: 1, name: 'Alice', profile: { email: 'alice@example.com' } }

// Pick with wildcard
const postTitles = pickPath(user, 'posts[*].title');
// Result: { posts: [{ title: 'Hello' }, { title: 'Foo' }] }

// With transformation function
const transformed = pickPath(user, ['name', 'profile.email'], (value, path) => {
  if (path === 'name') {
    return value.toUpperCase();
  }
  if (path === 'profile.email') {
    return value.split('@')[0] + '@example.org';
  }
  return value;
});
```

## Use Cases

- **Data Sanitization**: Remove sensitive fields before sending to client or logging
- **API Response Shaping**: Create views of data with only needed fields
- **Form Handling**: Remove empty fields before submission
- **State Management**: Create derived state by including or excluding properties
- **Configuration Processing**: Extract or remove specific configuration sections
- **Security**: Ensure sensitive data doesn't leak between system boundaries
