# Array Index Notation Path Guide

Visual guide for understanding how path notation works with the diff utilities.

## Path Format

Paths use dot notation for objects and bracket notation for arrays:

```
object.property           → Object property access
array[index]              → Array element access
object.array[index].prop  → Mixed access
```

## Visual Examples

### Example 1: Simple Object

```typescript
const object = {
  name: 'John',
  age: 30,
  active: true
}
```

**Paths:**
```
name                → 'John'
age                 → 30
active              → true
```

---

### Example 2: Nested Object

```typescript
const object = {
  user: {
    profile: {
      firstName: 'John',
      lastName: 'Doe'
    }
  }
}
```

**Paths:**
```
user                           → { profile: {...} }
user.profile                   → { firstName: ..., lastName: ... }
user.profile.firstName         → 'John'
user.profile.lastName          → 'Doe'
```

---

### Example 3: Array with Primitives

```typescript
const object = {
  tags: ['admin', 'user', 'moderator']
}
```

**Paths:**
```
tags                → ['admin', 'user', 'moderator']
tags[0]             → 'admin'
tags[1]             → 'user'
tags[2]             → 'moderator'
```

---

### Example 4: Array with Objects

```typescript
const object = {
  users: [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ]
}
```

**Paths:**
```
users               → [{ id: 1, ... }, { id: 2, ... }]
users[0]            → { id: 1, name: 'Alice' }
users[0].id         → 1
users[0].name       → 'Alice'
users[1]            → { id: 2, name: 'Bob' }
users[1].id         → 2
users[1].name       → 'Bob'
```

---

### Example 5: Nested Arrays

```typescript
const object = {
  matrix: [
    [1, 2, 3],
    [4, 5, 6]
  ]
}
```

**Paths:**
```
matrix              → [[1, 2, 3], [4, 5, 6]]
matrix[0]           → [1, 2, 3]
matrix[0][0]        → 1
matrix[0][1]        → 2
matrix[0][2]        → 3
matrix[1]           → [4, 5, 6]
matrix[1][0]        → 4
matrix[1][1]        → 5
matrix[1][2]        → 6
```

---

### Example 6: Complex Nested Structure

```typescript
const object = {
  company: {
    departments: [
      {
        name: 'Engineering',
        teams: [
          {
            name: 'Frontend',
            members: [
              { id: 1, name: 'Alice', skills: ['React', 'TypeScript'] },
              { id: 2, name: 'Bob', skills: ['Vue', 'JavaScript'] }
            ]
          },
          {
            name: 'Backend',
            members: [
              { id: 3, name: 'Charlie', skills: ['Node.js', 'Python'] }
            ]
          }
        ]
      },
      {
        name: 'Marketing',
        teams: [
          {
            name: 'Content',
            members: [
              { id: 4, name: 'Diana', skills: ['Writing', 'SEO'] }
            ]
          }
        ]
      }
    ]
  }
}
```

**Path Examples:**
```
company
company.departments
company.departments[0]
company.departments[0].name                           → 'Engineering'
company.departments[0].teams
company.departments[0].teams[0]
company.departments[0].teams[0].name                  → 'Frontend'
company.departments[0].teams[0].members
company.departments[0].teams[0].members[0]
company.departments[0].teams[0].members[0].id         → 1
company.departments[0].teams[0].members[0].name       → 'Alice'
company.departments[0].teams[0].members[0].skills
company.departments[0].teams[0].members[0].skills[0]  → 'React'
company.departments[0].teams[0].members[0].skills[1]  → 'TypeScript'
company.departments[0].teams[0].members[1].name       → 'Bob'
company.departments[0].teams[1].name                  → 'Backend'
company.departments[1].name                           → 'Marketing'
company.departments[1].teams[0].members[0].name       → 'Diana'
```

---

## Diff Path Examples

### Change Detection

```typescript
const old = {
  users: [
    { id: 1, name: 'Alice', age: 25, active: true },
    { id: 2, name: 'Bob', age: 30, active: true }
  ]
};

const new = {
  users: [
    { id: 1, name: 'Alicia', age: 26, active: true },
    { id: 2, name: 'Bob', age: 30, active: false }
  ]
};

getChangedPaths(old, new);
// Returns: ['users[0].name', 'users[0].age', 'users[1].active']
```

**Visual Representation:**
```
users
  [0]
    ✓ id: 1
    ✗ name: 'Alice' → 'Alicia'      // PATH: users[0].name
    ✗ age: 25 → 26                  // PATH: users[0].age
    ✓ active: true
  [1]
    ✓ id: 2
    ✓ name: 'Bob'
    ✓ age: 30
    ✗ active: true → false          // PATH: users[1].active
```

---

### Array Element Addition

```typescript
const old = {
  items: [
    { id: 1, value: 'A' },
    { id: 2, value: 'B' }
  ]
};

const new = {
  items: [
    { id: 1, value: 'A' },
    { id: 2, value: 'B' },
    { id: 3, value: 'C' }    // Added
  ]
};

getChangedPaths(old, new);
// Returns: ['items[2]']

diffObjectDetailed(old, new).added;
// Returns: ['items[2]']
```

**Visual:**
```
items
  [0] ✓ { id: 1, value: 'A' }
  [1] ✓ { id: 2, value: 'B' }
  [2] + { id: 3, value: 'C' }      // PATH: items[2]
```

---

### Array Element Deletion

```typescript
const old = {
  items: ['A', 'B', 'C']
};

const new = {
  items: ['A', 'B']
};

getChangedPaths(old, new);
// Returns: ['items[2]']

diffObjectDetailed(old, new, { includeDeleted: true }).deleted;
// Returns: ['items[2]']
```

**Visual:**
```
items
  [0] ✓ 'A'
  [1] ✓ 'B'
  [2] - 'C' (deleted)              // PATH: items[2]
```

---

### Nested Array Changes

```typescript
const old = {
  data: {
    records: [
      { id: 1, tags: ['important', 'urgent'] },
      { id: 2, tags: ['normal'] }
    ]
  }
};

const new = {
  data: {
    records: [
      { id: 1, tags: ['important', 'not-urgent'] },
      { id: 2, tags: ['high-priority'] }
    ]
  }
};

getChangedPaths(old, new);
// Returns: ['data.records[0].tags[1]', 'data.records[1].tags[0]']
```

**Visual:**
```
data
  records
    [0]
      ✓ id: 1
      tags
        [0] ✓ 'important'
        [1] ✗ 'urgent' → 'not-urgent'          // PATH: data.records[0].tags[1]
    [1]
      ✓ id: 2
      tags
        [0] ✗ 'normal' → 'high-priority'       // PATH: data.records[1].tags[0]
```

---

## Path Reading Guide

### Pattern Recognition

| Path Pattern | Meaning | Example |
|--------------|---------|---------|
| `prop` | Root property | `name`, `age` |
| `obj.prop` | Nested property | `user.name` |
| `arr[n]` | Array element | `items[0]` |
| `obj.arr[n]` | Array in object | `user.tags[0]` |
| `arr[n].prop` | Property in array element | `users[0].name` |
| `arr[n][m]` | Nested array element | `matrix[0][1]` |
| `obj.arr[n].prop` | Complex nesting | `user.addresses[0].city` |

### Reading Complex Paths

Path: `company.departments[0].teams[1].members[2].skills[0]`

**Step by step:**
1. `company` - Access company object
2. `.departments` - Access departments property
3. `[0]` - First department (index 0)
4. `.teams` - Access teams property
5. `[1]` - Second team (index 1)
6. `.members` - Access members property
7. `[2]` - Third member (index 2)
8. `.skills` - Access skills property
9. `[0]` - First skill (index 0)

**In code:**
```typescript
const value = company.departments[0].teams[1].members[2].skills[0];
```

---

## Practical Usage

### Logging Changes

```typescript
const paths = getChangedPaths(oldState, newState);

paths.forEach(path => {
  console.log(`Changed: ${path}`);
});

// Output:
// Changed: user.profile.email
// Changed: settings.notifications[0].enabled
// Changed: items[2].status
// Changed: metadata.lastUpdated
```

### Selective Updates

```typescript
const changedPaths = getChangedPaths(oldData, newData);

// Only update specific fields
if (changedPaths.some(p => p.startsWith('user.'))) {
  updateUserProfile();
}

if (changedPaths.some(p => p.includes('[') && p.includes('].status'))) {
  updateItemStatuses();
}
```

### Form Validation

```typescript
const changes = getChangedPaths(initialForm, currentForm);

// Validate only changed fields
const fieldsToValidate = changes.map(path => {
  // Extract field name from path
  return path.split('.').pop()?.replace(/\[\d+\]/, '');
});

validateFields(fieldsToValidate);
```

---

## Tips

1. **Array indices are 0-based**: `[0]` is the first element
2. **Paths are strings**: You can use them for logging, filtering, etc.
3. **Consistent format**: Always `object.property` and `array[index]`
4. **Nested arrays**: Multiple brackets like `[0][1][2]` for 3D arrays
5. **No trailing separators**: Paths end at the value, no `.` or `[`

---

## Common Patterns

### Find all array changes
```typescript
const arrayChanges = paths.filter(p => p.includes('['));
```

### Group by root property
```typescript
const grouped = paths.reduce((acc, path) => {
  const root = path.split('.')[0].split('[')[0];
  acc[root] = acc[root] || [];
  acc[root].push(path);
  return acc;
}, {});
```

### Check specific path pattern
```typescript
const hasUserChanges = paths.some(p => p.startsWith('user.'));
const hasItemStatusChanges = paths.some(p => /items\[\d+\]\.status/.test(p));
```
